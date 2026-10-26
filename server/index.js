import express from 'express';
import multer from 'multer';
import { extname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { db, all, get, run, j, UPLOAD_DIR } from './db.js';
import { seed } from './seed.js';
import { computeBill, scoreWalker, fitsSchedule, petNeeds, routesFor, findRoute, pathLength, haversine, CONDITIONS, EXTRAS, OWNER_FEE, WALKER_FEE, ROUTES } from './domain.js';
import * as ai from './ai.js';
import { hashPassword, verifyPassword, DEMO_PASSWORD } from './auth.js';
import { startSimulator } from './simulator.js';

if (!get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'") || !get('SELECT id FROM users LIMIT 1')) {
  console.log('[db] empty database, seeding demo data…', seed());
}
// Repair timeline rows written while sysUpdate had kind/text swapped.
run("UPDATE walk_updates SET kind = text, text = kind WHERE text IN ('system','alert') AND kind NOT IN ('note','photo','alert','system')");
// Accounts created before passwords existed get the demo password.
run('UPDATE users SET password_hash = ? WHERE password_hash IS NULL', hashPassword(DEMO_PASSWORD));

const app = express();
// The shared ngrok gateway forwards https://<domain>/walk/… here; strip the prefix so every route also works at the root.
app.use((req, _res, next) => {
  if (/^\/walk(?=[/?]|$)/.test(req.url)) req.url = '/' + req.url.slice(5).replace(/^\//, '');
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_, f, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(f.originalname) || '.jpg'}`) }),
  limits: { fileSize: 8 * 1024 * 1024 },
});
const api = express.Router();
app.use('/api', api);

// ---------- helpers ----------
const sqlNow = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const profileOf = (id) => get('SELECT * FROM walker_profiles WHERE user_id = ?', id);
function walkerStats(id) {
  const c = get("SELECT COUNT(*) n, AVG(on_time) ot FROM bookings WHERE walker_id = ? AND status IN ('completed','settled')", id);
  const r = get('SELECT COUNT(*) n, AVG(stars) s, AVG(safety) sa, AVG(punctual) pu, AVG(updates) up, AVG(care) ca FROM reviews WHERE walker_id = ?', id);
  const inc = (type) => get("SELECT COUNT(*) n FROM incidents WHERE walker_id = ? AND type = ? AND status = 'confirmed'", id, type).n;
  return {
    completed: c.n, onTime: c.ot == null ? 100 : Math.round(c.ot * 100),
    reviews: r.n, avgStars: r.s ? Math.round(r.s * 10) / 10 : null,
    breakdown: { safety: r.sa, punctual: r.pu, updates: r.up, care: r.ca },
    noShow: inc('no_show'), lateCancel: inc('late_cancel'),
  };
}
const walkerCard = (u) => ({ ...u, profile: profileOf(u.id), stats: walkerStats(u.id) });
function bookingFull(id) {
  const b = get('SELECT * FROM bookings WHERE id = ?', id);
  if (!b) return null;
  b.pet = get('SELECT * FROM pets WHERE id = ?', b.pet_id);
  b.owner = get('SELECT id,name,avatar,phone,district FROM users WHERE id = ?', b.owner_id);
  b.walker = b.walker_id ? get('SELECT id,name,avatar,phone FROM users WHERE id = ?', b.walker_id) : null;
  b.route = findRoute(b.route_id);
  b.review = get('SELECT * FROM reviews WHERE booking_id = ?', id) || null;
  return b;
}
const bookingList = (where, ...params) => all(`SELECT b.*, p.name pet_name, p.breed pet_breed, o.name owner_name, o.avatar owner_avatar, w.name walker_name, w.avatar walker_avatar
  FROM bookings b JOIN pets p ON p.id = b.pet_id JOIN users o ON o.id = b.owner_id LEFT JOIN users w ON w.id = b.walker_id WHERE ${where}`, ...params);

// ---------- meta ----------
api.get('/meta', async (_, res) => res.json({
  conditions: CONDITIONS, extras: EXTRAS, fees: { owner: OWNER_FEE, walker: WALKER_FEE },
  districts: Object.keys(ROUTES), ai: await ai.aiStatus(),
}));
api.post('/admin/reset', (_, res) => res.json(seed()));
api.get('/config', (req, res) => {
  // ?as=A / ?as=B picks a tester on any port (one public URL for both); otherwise the port decides.
  const entry = Object.values(ENTRIES).find((e) => e.key === String(req.query.as || '').toUpperCase()) || ENTRIES[req.socket.localPort];
  const user = entry && get('SELECT id FROM users WHERE name = ?', entry.user);
  res.json(entry ? { entry: entry.label, defaultUserId: user?.id || null } : { entry: null, defaultUserId: null });
});

// ---------- users ----------
// role 'both' = 飼主兼遛狗者；查詢某個角色時一併包含兼任者。
const ROLE_IN = { owner: "('owner','both')", walker: "('walker','both')" };
api.get('/users', (req, res) => {
  const rows = ROLE_IN[req.query.role] ? all(`SELECT * FROM users WHERE role IN ${ROLE_IN[req.query.role]} ORDER BY id`) : all('SELECT * FROM users ORDER BY id');
  res.json(rows);
});
api.get('/users/:id', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json(u.role !== 'owner' ? walkerCard(u) : u);
});
/** Default profile for anyone who starts walking dogs (sign-up or activating the role later). */
function ensureWalkerProfile(u) {
  if (profileOf(u.id)) return;
  run(`INSERT INTO walker_profiles (user_id,gender,age,years,transport,mode,days,start_time,end_time,base_rates,rates,skills,verified,pending,qualification,areas,available)
       VALUES (?,'其他',NULL,0,?,'both',?,'18:00','21:00',?,?,'[]','[]',?,'新手遛狗者',?,1)`,
    u.id, j(['步行']), j([0, 6]), j({ 30: 300, 60: 520, 90: 700 }), j({ large: 100, reactive: 100, senior: 100, extraPet: 100 }), j(['身分驗證']), j([u.district || '大安區']));
}
/** 開通第二個身分：飼主 → 也能接單，或遛狗者 → 也能發任務。 */
api.post('/users/:id/roles', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (u.role !== req.body.add) run("UPDATE users SET role = 'both' WHERE id = ?", u.id);
  if (req.body.add === 'walker') ensureWalkerProfile(u);
  res.json(get('SELECT * FROM users WHERE id = ?', u.id));
});

// ---------- self-registration / login ----------
api.post('/auth/register', (req, res) => {
  const b = req.body;
  const email = String(b.email || '').trim().toLowerCase();
  if (!b.name?.trim() || !email || String(b.password || '').length < 6) return res.status(400).json({ error: '請填寫名稱、Email，密碼至少 6 碼。' });
  if (!['owner', 'walker', 'both'].includes(b.role)) return res.status(400).json({ error: '請選擇身分。' });
  if (db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email)) return res.status(409).json({ error: '這個 Email 已經註冊過了，請直接登入。' });
  const r = run('INSERT INTO users (role,name,avatar,email,phone,district,bio,password_hash) VALUES (?,?,?,?,?,?,?,?)',
    b.role, b.name.trim(), b.avatar || '🙂', email, b.phone || '', b.district || '大安區', b.bio || '', hashPassword(b.password));
  const u = get('SELECT * FROM users WHERE id = ?', r.lastInsertRowid);
  if (b.role !== 'owner') ensureWalkerProfile(u);
  res.json(u);
});
api.post('/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const row = db.prepare('SELECT id, password_hash FROM users WHERE lower(email) = ?').get(email);
  if (!row || !verifyPassword(String(req.body.password || ''), row.password_hash)) return res.status(401).json({ error: 'Email 或密碼不正確。' });
  res.json(get('SELECT * FROM users WHERE id = ?', row.id));
});
api.put('/users/:id', (req, res) => {
  const b = req.body;
  run('UPDATE users SET name=?, email=?, phone=?, district=?, bio=?, experience=? WHERE id=?', b.name, b.email, b.phone, b.district, b.bio, b.experience, req.params.id);
  if (b.profile) {
    const p = b.profile;
    run(`UPDATE walker_profiles SET gender=?, age=?, years=?, transport=?, mode=?, days=?, start_time=?, end_time=?, base_rates=?, rates=?, skills=?, qualification=?, areas=?, available=? WHERE user_id=?`,
      p.gender, p.age, p.years, j(p.transport), p.mode, j(p.days), p.start_time, p.end_time, j(p.base_rates), j(p.rates), j(p.skills), p.qualification, j(p.areas), p.available ? 1 : 0, req.params.id);
  }
  res.json(get('SELECT * FROM users WHERE id = ?', req.params.id));
});
api.post('/walkers/:id/availability', (req, res) => {
  run('UPDATE walker_profiles SET available = ? WHERE user_id = ?', req.body.available ? 1 : 0, req.params.id);
  res.json(profileOf(req.params.id));
});

// ---------- pets ----------
const PET_COLS = ['name', 'type', 'breed', 'birth', 'sex', 'neuter', 'weight', 'chip_last4', 'vaccine', 'energy', 'social', 'leash', 'intro', 'medical', 'emergency', 'clinic'];
api.get('/owners/:id/pets', (req, res) => res.json(all('SELECT * FROM pets WHERE owner_id = ? ORDER BY id', req.params.id)));
api.post('/pets', (req, res) => {
  const b = req.body;
  const r = run(`INSERT INTO pets (owner_id, ${PET_COLS.join(',')}) VALUES (?, ${PET_COLS.map(() => '?').join(',')})`, b.owner_id, ...PET_COLS.map((c) => b[c] ?? null));
  res.json(get('SELECT * FROM pets WHERE id = ?', r.lastInsertRowid));
});
api.put('/pets/:id', (req, res) => {
  run(`UPDATE pets SET ${PET_COLS.map((c) => `${c}=?`).join(',')} WHERE id = ?`, ...PET_COLS.map((c) => req.body[c] ?? null), req.params.id);
  res.json(get('SELECT * FROM pets WHERE id = ?', req.params.id));
});
api.delete('/pets/:id', (req, res) => {
  const used = get('SELECT COUNT(*) n FROM bookings WHERE pet_id = ?', req.params.id).n;
  if (used) return res.status(409).json({ error: '這隻毛孩已有預約紀錄，無法刪除。' });
  run('DELETE FROM pets WHERE id = ?', req.params.id);
  res.json({ ok: true });
});
api.post('/pets/:id/photo', upload.single('photo'), (req, res) => {
  const url = `/uploads/${req.file.filename}`;
  run('UPDATE pets SET photo_url = ? WHERE id = ?', url, req.params.id);
  res.json({ photo_url: url });
});

// ---------- matching ----------
api.get('/walkers', (req, res) => {
  const q = req.query;
  const pet = q.petId ? get('SELECT * FROM pets WHERE id = ?', q.petId) : null;
  let rows = all(`SELECT * FROM users WHERE role IN ${ROLE_IN.walker} AND id != ?`, Number(q.excludeId) || 0).map(walkerCard);
  if (q.gender) rows = rows.filter((w) => w.profile.gender === q.gender);
  if (q.transport) rows = rows.filter((w) => (w.profile.transport || []).includes(q.transport));
  if (q.skill) rows = rows.filter((w) => (w.profile.skills || []).includes(q.skill));
  if (q.minYears) rows = rows.filter((w) => w.profile.years >= Number(q.minYears));
  if (q.mode) rows = rows.filter((w) => w.profile.mode === 'both' || w.profile.mode === q.mode);
  if (q.noIncidents === '1') rows = rows.filter((w) => !w.stats.noShow);
  const ranked = rows.map((w) => ({ ...w, match: scoreWalker({ walker: w, profile: w.profile, stats: w.stats, pet, startAt: q.startAt, duration: Number(q.duration || 60), district: q.district, mode: q.mode }) }));
  if (q.onlyAvailable === '1') { const ok = ranked.filter((w) => w.match.fits && w.profile.available); return res.json(ok.sort((a, b) => b.match.score - a.match.score)); }
  res.json(ranked.sort((a, b) => b.match.score - a.match.score));
});
api.get('/walkers/:id/trust', (req, res) => {
  const id = req.params.id;
  res.json({
    stats: walkerStats(id),
    reviews: all('SELECT r.*, u.name owner_name, p.name pet_name FROM reviews r JOIN users u ON u.id = r.owner_id LEFT JOIN bookings b ON b.id = r.booking_id LEFT JOIN pets p ON p.id = b.pet_id WHERE r.walker_id = ? ORDER BY r.at DESC LIMIT 6', id),
    incidents: all('SELECT * FROM incidents WHERE walker_id = ? ORDER BY at DESC', id),
  });
});
api.post('/ai/match-reason', async (req, res) => {
  const pet = get('SELECT * FROM pets WHERE id = ?', req.body.petId);
  const w = walkerCard(get('SELECT * FROM users WHERE id = ?', req.body.walkerId));
  const match = scoreWalker({ walker: w, profile: w.profile, stats: w.stats, pet, startAt: req.body.startAt, duration: req.body.duration || 60, district: req.body.district, mode: req.body.mode });
  res.json(await ai.matchReason(pet, w, w.profile, match));
});
api.post('/ai/interview', async (req, res) => res.json(await ai.interviewQuestions(get('SELECT * FROM pets WHERE id = ?', req.body.petId))));

// ---------- routes / quote ----------
api.get('/routes', (req, res) => res.json(routesFor(req.query.district)));
api.post('/quote', (req, res) => {
  const b = req.body;
  const profile = b.walkerId ? profileOf(b.walkerId) : null;
  const pet = b.petId ? get('SELECT * FROM pets WHERE id = ?', b.petId) : null;
  res.json({
    bill: computeBill(profile, b),
    fits: profile ? fitsSchedule(profile, b.startAt, b.duration) : true,
    modeOk: !profile || profile.mode === 'both' || profile.mode === b.mode,
    suggested: petNeeds(pet),
    profile,
  });
});

// ---------- bookings ----------
api.get('/bookings', (req, res) => {
  const q = req.query;
  if (q.open === '1') return res.json(bookingList("b.status = 'open' AND b.owner_id != ? ORDER BY b.start_at", Number(q.excludeOwner) || 0));
  if (q.ownerId) return res.json(bookingList('b.owner_id = ? ORDER BY b.start_at DESC', q.ownerId));
  if (q.walkerId) return res.json(bookingList('b.walker_id = ? ORDER BY b.start_at DESC', q.walkerId));
  res.json(bookingList('1=1 ORDER BY b.start_at DESC LIMIT 100'));
});
api.get('/bookings/:id', (req, res) => {
  const b = bookingFull(req.params.id);
  if (!b) return res.status(404).json({ error: 'not found' });
  res.json(b);
});
api.get('/bookings/:id/live', (req, res) => {
  const b = get('SELECT id, status, progress, off_route, started_at, ended_at, duration FROM bookings WHERE id = ?', req.params.id);
  const gps = all('SELECT lat, lng, off_route, at FROM gps_points WHERE booking_id = ? ORDER BY id', req.params.id);
  const updates = all('SELECT * FROM walk_updates WHERE booking_id = ? ORDER BY id DESC', req.params.id);
  const distance = gps.slice(1).reduce((s, p, i) => s + haversine([gps[i].lat, gps[i].lng], [p.lat, p.lng]), 0);
  res.json({ ...b, gps, updates, distance });
});
api.post('/bookings', (req, res) => {
  const b = req.body;
  const profile = b.walker_id ? profileOf(b.walker_id) : null;
  const bill = computeBill(profile, b);
  const r = run(`INSERT INTO bookings (owner_id, walker_id, pet_id, start_at, duration, mode, extras, conditions, address, district, route_id, photo_interval, notes, bill, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, b.owner_id, b.walker_id || null, b.pet_id, b.start_at, b.duration, b.mode, j(b.extras), j(b.conditions), b.address, b.district, b.route_id,
    b.photo_interval ?? 15, b.notes || '', j(bill), b.walker_id ? 'requested' : 'open');
  res.json(bookingFull(r.lastInsertRowid));
});
const setStatus = (id, status, extra = '') => run(`UPDATE bookings SET status = ? ${extra} WHERE id = ?`, status, id);
const sysUpdate = (id, text, kind = 'system', flag = 0) => run('INSERT INTO walk_updates (booking_id, kind, text, ai_flag) VALUES (?,?,?,?)', id, kind, text, flag);
api.post('/bookings/:id/accept', (req, res) => {
  const b = get('SELECT * FROM bookings WHERE id = ?', req.params.id);
  if (b.status === 'open') {
    const bill = computeBill(profileOf(req.body.walkerId), b);
    run("UPDATE bookings SET walker_id = ?, bill = ?, status = 'accepted' WHERE id = ?", req.body.walkerId, j(bill), b.id);
  } else setStatus(b.id, 'accepted');
  res.json(bookingFull(b.id));
});
api.post('/bookings/:id/decline', (req, res) => { setStatus(req.params.id, 'declined'); res.json(bookingFull(req.params.id)); });
api.post('/bookings/:id/cancel', (req, res) => { setStatus(req.params.id, 'cancelled'); res.json(bookingFull(req.params.id)); });
api.post('/bookings/:id/start', (req, res) => {
  const b = bookingFull(req.params.id);
  const [lat, lng] = b.route.path[0];
  run("UPDATE bookings SET status = 'in_progress', progress = 0, off_route = 0, started_at = ? WHERE id = ?", sqlNow(), b.id);
  run('DELETE FROM gps_points WHERE booking_id = ?', b.id);
  run('INSERT INTO gps_points (booking_id, lat, lng) VALUES (?,?,?)', b.id, lat, lng);
  const late = new Date() - new Date(b.start_at) > 15 * 60000 && new Date(b.start_at) < new Date();
  run('UPDATE bookings SET on_time = ? WHERE id = ?', late ? 0 : 1, b.id);
  sysUpdate(b.id, `${b.walker.name} 已在交接點接到 ${b.pet.name}，散步開始。`);
  res.json(bookingFull(b.id));
});
api.post('/bookings/:id/finish', (req, res) => {
  const b = bookingFull(req.params.id);
  run("UPDATE bookings SET status = 'completed', progress = 1, off_route = 0, ended_at = ? WHERE id = ?", sqlNow(), b.id);
  sysUpdate(b.id, `散步結束，${b.pet.name} 已安全交還。`);
  res.json(bookingFull(b.id));
});
api.post('/bookings/:id/simulate', (req, res) => {
  const b = bookingFull(req.params.id);
  run('UPDATE bookings SET off_route = ? WHERE id = ?', req.body.offRoute ? 1 : 0, b.id);
  if (req.body.offRoute) sysUpdate(b.id, 'GPS 顯示偏離預定路線約 150 公尺，請聯繫遛狗者確認現況（定位可能有誤差）。', 'alert', 1);
  else sysUpdate(b.id, 'GPS 已回到預定路線。');
  res.json({ ok: true });
});
api.post('/bookings/:id/updates', upload.single('photo'), async (req, res) => {
  const b = bookingFull(req.params.id);
  const isAlert = req.body.alert === '1';
  let label = null, flag = isAlert ? 1 : 0, photoUrl = null, aiNote = null;
  if (req.file) {
    photoUrl = `/uploads/${req.file.filename}`;
    const result = await ai.analyzePhoto(join(UPLOAD_DIR, req.file.filename), b.pet);
    if (result) { label = result.label; aiNote = result.note; if (result.concern) flag = 1; }
  }
  const text = [req.body.text, aiNote ? `🤖 AI：${aiNote}` : null].filter(Boolean).join('\n');
  run('INSERT INTO walk_updates (booking_id, kind, text, photo_url, ai_label, ai_flag) VALUES (?,?,?,?,?,?)', b.id, isAlert ? 'alert' : req.file ? 'photo' : 'note', text, photoUrl, label, flag);
  res.json({ ok: true, label, flag });
});
api.post('/bookings/:id/report', async (req, res) => {
  const b = bookingFull(req.params.id);
  const gps = all('SELECT lat, lng FROM gps_points WHERE booking_id = ? ORDER BY id', b.id);
  const distanceM = gps.length > 1 ? gps.slice(1).reduce((s, p, i) => s + haversine([gps[i].lat, gps[i].lng], [p.lat, p.lng]), 0) : pathLength(b.route.path);
  const minutes = b.started_at && b.ended_at ? Math.max(1, Math.round((new Date(b.ended_at + 'Z') - new Date(b.started_at + 'Z')) / 60000)) : b.duration;
  const updates = all('SELECT * FROM walk_updates WHERE booking_id = ? ORDER BY id', b.id);
  const report = await ai.careReport({ pet: b.pet, walker: b.walker, booking: b, updates, distanceM, minutes });
  run('UPDATE bookings SET ai_report = ? WHERE id = ?', report.text, b.id);
  res.json(report);
});
api.post('/bookings/:id/review', (req, res) => {
  const b = get('SELECT * FROM bookings WHERE id = ?', req.params.id);
  const r = req.body;
  run('DELETE FROM reviews WHERE booking_id = ?', b.id);
  run('INSERT INTO reviews (booking_id, owner_id, walker_id, stars, safety, punctual, updates, care, text) VALUES (?,?,?,?,?,?,?,?,?)',
    b.id, b.owner_id, b.walker_id, r.stars, r.safety, r.punctual, r.updates, r.care, r.text || '');
  run("UPDATE bookings SET status = 'settled', settled_at = ? WHERE id = ?", sqlNow(), b.id);
  res.json(bookingFull(b.id));
});

// ---------- incidents / messages / earnings ----------
api.post('/incidents', (req, res) => {
  const b = req.body;
  run('INSERT INTO incidents (walker_id, booking_id, reporter_id, type, description) VALUES (?,?,?,?,?)', b.walker_id, b.booking_id, b.reporter_id, b.type, b.description);
  res.json({ ok: true });
});
api.get('/messages', (req, res) => res.json(all('SELECT * FROM messages WHERE owner_id = ? AND walker_id = ? ORDER BY id', req.query.ownerId, req.query.walkerId)));
api.get('/threads', (req, res) => {
  const { userId, role } = req.query;
  const col = role === 'owner' ? 'owner_id' : 'walker_id';
  const other = role === 'owner' ? 'walker_id' : 'owner_id';
  res.json(all(`SELECT t.other_id, u.name, u.avatar, t.last_id, m.text last_text
    FROM (SELECT ${other} other_id, MAX(id) last_id FROM messages WHERE ${col} = ? GROUP BY ${other}) t
    JOIN messages m ON m.id = t.last_id JOIN users u ON u.id = t.other_id ORDER BY t.last_id DESC`, userId));
});
api.post('/messages', (req, res) => {
  const b = req.body;
  run('INSERT INTO messages (owner_id, walker_id, sender_id, text) VALUES (?,?,?,?)', b.owner_id, b.walker_id, b.sender_id, b.text);
  res.json({ ok: true });
});
api.get('/walkers/:id/earnings', (req, res) => {
  const rows = bookingList("b.walker_id = ? AND b.status IN ('settled','completed') ORDER BY b.start_at DESC", req.params.id);
  const month = new Date().toISOString().slice(0, 7);
  const sum = (list, k) => list.reduce((s, b) => s + (b.bill?.[k] || 0), 0);
  const thisMonth = rows.filter((b) => b.status === 'settled' && b.start_at.slice(0, 7) === month);
  res.json({
    rows: rows.slice(0, 20),
    month: { gross: sum(thisMonth, 'subtotal'), fee: sum(thisMonth, 'walkerFee'), net: sum(thisMonth, 'net'), count: thisMonth.length },
    pending: sum(rows.filter((b) => b.status === 'completed'), 'net'),
    total: sum(rows.filter((b) => b.status === 'settled'), 'net'),
  });
});

// Production build: serve the SPA from /dist.
const dist = join(import.meta.dirname, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/uploads).*/, (_, res) => res.sendFile(join(dist, 'index.html')));
}

const PORT = Number(process.env.API_PORT || 4100);
// Per-person entry points for sharing: one public URL per tester, same process & DB.
// Each tester can be owner and walker at once (role 'both') and switch freely.
const ENTRIES = {
  [Number(process.env.ENTRY_A_PORT || 4101)]: { key: 'A', label: '體驗者 A', user: '小晴' },
  [Number(process.env.ENTRY_B_PORT || 4102)]: { key: 'B', label: '體驗者 B', user: '林以安' },
};
for (const [port, e] of Object.entries(ENTRIES)) {
  app.listen(Number(port), () => console.log(`[api] ${e.label}（${e.user}）entry on http://localhost:${port}`));
}
app.listen(PORT, () => {
  console.log(`[api] Walk 我可遛 API on http://localhost:${PORT}`);
  ai.aiStatus().then((s) => console.log(`[ai] Ollama ${s.ok ? 'ready' : 'unavailable (fallback text)'} · model ${s.model}`));
});
startSimulator();
