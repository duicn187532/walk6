// Seeds the SQLite DB with a believable demo world. Run `npm run seed` to reset at any time.
import { db, SCHEMA, run, j } from './db.js';
import { computeBill, findRoute, pointAt, DEFAULT_BASE } from './domain.js';
import { fileURLToPath } from 'node:url';
import { hashPassword, DEMO_PASSWORD } from './auth.js';

// Deterministic RNG so every reset looks the same.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261020);
const pick = (a) => a[Math.floor(rand() * a.length)];

const pad = (n) => String(n).padStart(2, '0');
/** Local ISO 'YYYY-MM-DDTHH:mm' offset by days from today at hh:mm */
export function localAt(daysFromToday, hh, mm = 0) {
  const d = new Date(); d.setDate(d.getDate() + daysFromToday); d.setHours(hh, mm, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const sqlNow = (minsAgo = 0) => new Date(Date.now() - minsAgo * 60000).toISOString().replace('T', ' ').slice(0, 19);

const OWNERS = [
  { name: '小晴', avatar: '👩🏻', email: 'qing@example.com', phone: '0912-000-111', district: '大安區', bio: '上班族，平日晚上與週末會帶毛孩去大安森林公園。', experience: '養狗 6 年，家裡有三隻狗狗。' },
  { name: '阿哲', avatar: '🧔🏻', email: 'jer@example.com', phone: '0912-000-222', district: '信義區', bio: '工程師，常加班需要平日傍晚的幫手。', experience: '第一次養大型犬。' },
  { name: '美玲', avatar: '👩🏻‍🦳', email: 'mei@example.com', phone: '0912-000-333', district: '中山區', bio: '退休教師，膝蓋不好想找人幫忙早上散步。', experience: '養狗 15 年。' },
  { name: '志明', avatar: '👨🏻', email: 'ming@example.com', phone: '0912-000-444', district: '大安區', bio: '家裡有一隻 11 歲的老狗。', experience: '阿福是從收容所領養的。' },
  { name: '佳穎', avatar: '👩🏻‍💼', email: 'ying@example.com', phone: '0912-000-555', district: '信義區', bio: '常出差，想找固定可信任的遛狗夥伴。', experience: '養法鬥 3 年。' },
  { name: '宗翰', avatar: '👨🏻‍🔧', email: 'han@example.com', phone: '0912-000-666', district: '中山區', bio: '輪班工作，家有一隻精力旺盛的德牧。', experience: '受過基礎服從訓練。' },
];

const WALKERS = [
  { name: '林以安', avatar: '👩🏻‍🦱', district: '大安區', bio: '細心回報、活潑犬經驗豐富。每次散步都會拍照並記錄喝水與如廁狀況。', experience: '曾在寵物旅館工作 2 年。',
    p: { gender: '女', age: 27, years: 4, transport: ['步行', '大眾運輸'], mode: 'both', days: [1, 2, 3, 4, 5, 6], start_time: '08:00', end_time: '21:00', base: { 30: 300, 60: 520, 90: 700 }, rates: { large: 100, reactive: 120, senior: 100, extraPet: 150 }, skills: ['大型犬照護', '高齡犬照護', '定時照片回報'], verified: ['身分', '手機', '良民證'], pending: ['寵物急救課程'], qualification: '大型犬／高齡犬', areas: ['大安區', '中正區'] }, q: 0.95, noShow: 0, lateCancel: 1 },
  { name: '陳子晴', avatar: '👨🏻', district: '大安區', bio: '安靜路線、耐心溝通，擅長緊張或怕生的狗狗。', experience: '志工協助收容所社會化訓練。',
    p: { gender: '男', age: 32, years: 2, transport: ['機車', '大眾運輸'], mode: 'paid', days: [0, 1, 2, 3, 4, 5, 6], start_time: '10:00', end_time: '22:00', base: { 30: 320, 60: 550, 90: 760 }, rates: { large: 120, reactive: 100, senior: 150, extraPet: 100 }, skills: ['敏感犬照護', '安靜路線規劃'], verified: ['身分', '手機'], pending: ['急救證明'], qualification: '敏感犬／慢走路線', areas: ['大安區', '信義區'] }, q: 0.9, noShow: 0, lateCancel: 2 },
  { name: '周奕辰', avatar: '🧑🏻', district: '大安區', bio: '大學生，時間彈性，常態散步沒問題。', experience: '家裡養過兩隻米克斯。',
    p: { gender: '男', age: 24, years: 1, transport: ['自行車', '步行'], mode: 'both', days: [1, 2, 3, 4, 5], start_time: '13:00', end_time: '20:00', base: { 30: 250, 60: 450, 90: 620 }, rates: { large: 100, reactive: 180, senior: 120, extraPet: 120 }, skills: ['定時照片回報'], verified: ['身分'], pending: ['手機補認證'], qualification: '一般散步／彈性時段', areas: ['大安區', '中正區', '信義區'] }, q: 0.72, noShow: 1, lateCancel: 3 },
  { name: '王柏翰', avatar: '👨🏻‍🦰', district: '信義區', bio: '前警犬隊志工，擅長大型工作犬與牽控。', experience: '協助德牧、馬犬訓練 6 年。',
    p: { gender: '男', age: 29, years: 6, transport: ['機車'], mode: 'paid', days: [0, 2, 4, 5, 6], start_time: '06:00', end_time: '19:00', base: { 30: 350, 60: 600, 90: 820 }, rates: { large: 80, reactive: 100, senior: 120, extraPet: 150 }, skills: ['大型犬照護', '敏感犬照護', '行為矯正基礎'], verified: ['身分', '手機', '良民證', '訓犬師證照'], pending: [], qualification: '大型工作犬', areas: ['信義區', '大安區'] }, q: 0.97, noShow: 0, lateCancel: 0 },
  { name: '李思妤', avatar: '👩🏻‍🎓', district: '中山區', bio: '獸醫系學生，喜歡狗狗，也接社區互助免費散步。', experience: '動物醫院實習中。',
    p: { gender: '女', age: 22, years: 1, transport: ['大眾運輸', '步行'], mode: 'both', days: [0, 3, 5, 6], start_time: '07:00', end_time: '18:00', base: { 30: 260, 60: 460, 90: 640 }, rates: { large: 120, reactive: 120, senior: 60, extraPet: 100 }, skills: ['高齡犬照護', '定時照片回報'], verified: ['身分', '手機'], pending: ['在學證明'], qualification: '高齡犬／基礎醫療觀察', areas: ['中山區', '大同區'] }, q: 0.88, noShow: 0, lateCancel: 0 },
  { name: '張雅雯', avatar: '👩🏻‍⚕️', district: '中山區', bio: '動物醫院技術員，可協助餵藥與術後觀察。', experience: '寵物照護 8 年。',
    p: { gender: '女', age: 35, years: 8, transport: ['機車'], mode: 'paid', days: [1, 2, 3, 4, 5], start_time: '07:00', end_time: '20:00', base: { 30: 380, 60: 650, 90: 880 }, rates: { large: 120, reactive: 120, senior: 80, extraPet: 150 }, skills: ['高齡犬照護', '大型犬照護', '餵藥協助'], verified: ['身分', '手機', '良民證', '動物醫院在職證明'], pending: [], qualification: '高齡犬／術後照護', areas: ['中山區', '大安區'] }, q: 0.96, noShow: 0, lateCancel: 1 },
  { name: '吳承恩', avatar: '👴🏻', district: '信義區', bio: '退休公務員，每天都會去象山走走，社區免費互助。', experience: '自己養柴犬 10 年。',
    p: { gender: '男', age: 63, years: 5, transport: ['步行'], mode: 'free', days: [0, 1, 2, 3, 4, 5, 6], start_time: '06:00', end_time: '10:00', base: DEFAULT_BASE, rates: { large: 0, reactive: 0, senior: 0, extraPet: 0 }, skills: ['高齡犬照護'], verified: ['身分', '手機'], pending: [], qualification: '社區互助／晨間散步', areas: ['信義區'] }, q: 0.9, noShow: 0, lateCancel: 0 },
  { name: '黃品蓁', avatar: '👩🏻‍🎨', district: '大安區', bio: '自由接案設計師，白天時間彈性，擅長小型犬與敏感犬。', experience: '養過兩隻吉娃娃。',
    p: { gender: '女', age: 26, years: 3, transport: ['步行', '自行車'], mode: 'both', days: [1, 2, 3, 4, 5], start_time: '09:00', end_time: '17:00', base: { 30: 300, 60: 500, 90: 680 }, rates: { large: 150, reactive: 90, senior: 100, extraPet: 120 }, skills: ['敏感犬照護', '定時照片回報'], verified: ['身分', '手機'], pending: ['良民證'], qualification: '小型犬／敏感犬', areas: ['大安區', '信義區'] }, q: 0.92, noShow: 0, lateCancel: 0 },
  // 兼任：飼主 小晴 下班後也接單（asOwner = OWNERS 的索引，不另建帳號）
  { asOwner: 0, bio: '自己養了三隻狗，下班後與週末也幫鄰居遛狗，熟悉大安森林公園。',
    p: { gender: '女', age: 31, years: 6, transport: ['步行'], mode: 'both', days: [0, 1, 2, 3, 4, 5, 6], start_time: '18:30', end_time: '22:00', base: { 30: 280, 60: 480, 90: 650 }, rates: { large: 80, reactive: 100, senior: 100, extraPet: 100 }, skills: ['大型犬照護', '敏感犬照護', '定時照片回報'], verified: ['身分', '手機'], pending: ['良民證'], qualification: '多犬家庭／下班後時段', areas: ['大安區'] }, q: 0.94, noShow: 0, lateCancel: 0 },
];
// 兼任：遛狗者 林以安 也是飼主（WALKERS 索引 0）
const DUAL_OWNER_WALKERS = [0];

// owner index → pets
const PETS = [
  [0, { name: '奶茶 Mochi', breed: '黃金獵犬', birth: '2024-06', sex: '母', neuter: '已結紮', weight: 25.5, chip_last4: '1234', vaccine: '已依建議接種', energy: '活潑好動', social: '需保持距離', leash: '胸背帶／雙重牽繩', intro: '很愛散步和嗅聞，看到其他大型犬容易興奮，請保持安全距離。', medical: '對雞肉過敏，天熱時需多喝水、注意休息。', emergency: '備援聯絡人：媽媽 0912-111-000', clinic: '毛孩動物醫院（大安）' }],
  [0, { name: 'Lucky', breed: '柴犬', birth: '2021-11', sex: '公', neuter: '已結紮', weight: 11, chip_last4: '8721', vaccine: '接種待確認', energy: '一般', social: '容易緊張', leash: '一般牽繩', intro: '怕吵，適合安靜的路線和慢步行走。', medical: '膝蓋偶有不適，避免長時間奔跑。', emergency: '家人可協助', clinic: '' }],
  [0, { name: '布丁 Pudding', breed: '柯基', birth: '2022-03', sex: '公', neuter: '已結紮', weight: 12.5, chip_last4: '5566', vaccine: '已依建議接種', energy: '活潑好動', social: '可友善互動', leash: '胸背帶', intro: '短腿但體力超好，喜歡跟人撒嬌，看到松鼠會暴衝。', medical: '腰椎要注意，請避免讓他跳上跳下或爬太多樓梯。', emergency: '備援聯絡人：媽媽 0912-111-000', clinic: '毛孩動物醫院（大安）' }],
  [1, { name: '黑糖', breed: '拉布拉多', birth: '2023-01', sex: '公', neuter: '未結紮', weight: 30, chip_last4: '2201', vaccine: '已依建議接種', energy: '活潑好動', social: '可友善互動', leash: '胸背帶', intro: '貪吃，路上看到食物會想撿，請特別注意。', medical: '', emergency: '', clinic: '信義動物醫院' }],
  [2, { name: '豆豆', breed: '玩具貴賓', birth: '2017-05', sex: '母', neuter: '已結紮', weight: 4.2, chip_last4: '3390', vaccine: '已依建議接種', energy: '溫和慢步', social: '可友善互動', leash: '一般牽繩', intro: '走路慢，喜歡被抱。', medical: '輕微心雜音，避免劇烈運動與高溫時段。', emergency: '女兒 0933-000-111', clinic: '中山動物醫院' }],
  [3, { name: '阿福', breed: '米克斯', birth: '2015-02', sex: '公', neuter: '已結紮', weight: 18, chip_last4: '7788', vaccine: '已依建議接種', energy: '溫和慢步', social: '需保持距離', leash: '胸背帶', intro: '從收容所領養的老狗，個性穩定但不喜歡被陌生狗靠近。', medical: '後腿關節退化，每天早上需吃關節保健品。', emergency: '', clinic: '大安動物醫院' }],
  [4, { name: '可可', breed: '法國鬥牛犬', birth: '2022-09', sex: '母', neuter: '已結紮', weight: 10, chip_last4: '4411', vaccine: '已依建議接種', energy: '一般', social: '可友善互動', leash: '胸背帶', intro: '短吻犬怕熱，喜歡慢慢走。', medical: '短吻犬，氣溫 28 度以上請縮短散步時間。', emergency: '', clinic: '' }],
  [5, { name: 'Max', breed: '德國牧羊犬', birth: '2021-07', sex: '公', neuter: '未結紮', weight: 34, chip_last4: '9001', vaccine: '已依建議接種', energy: '活潑好動', social: '容易緊張', leash: 'P 繩／雙重牽繩', intro: '聰明、服從性高，但對機車聲音會有反應。', medical: '', emergency: '', clinic: '中山動物醫院' }],
  [3, { name: '小米', breed: '臘腸犬', birth: '2020-12', sex: '母', neuter: '已結紮', weight: 6, chip_last4: '1199', vaccine: '已依建議接種', energy: '一般', social: '可友善互動', leash: '胸背帶', intro: '很愛叫，但沒有攻擊性。', medical: '腰椎需注意。', emergency: '', clinic: '' }],
  ['w0', { name: '阿德 Ranger', breed: '德國牧羊犬', birth: '2022-05', sex: '公', neuter: '已結紮', weight: 32, chip_last4: '3141', vaccine: '已依建議接種', energy: '活潑好動', social: '可友善互動', leash: '胸背帶／雙重牽繩', intro: '以安自己的狗，服從性高、愛玩球，出門會很興奮。', medical: '髖關節需注意，避免長時間跳躍。', emergency: '以安的室友 0933-222-111', clinic: '毛孩動物醫院（大安）' }],
  [1, { name: '雪球', breed: '薩摩耶', birth: '2023-12', sex: '母', neuter: '未結紮', weight: 19, chip_last4: '6060', vaccine: '已依建議接種', energy: '活潑好動', social: '可友善互動', leash: '胸背帶', intro: '超親人，看到誰都想打招呼。', medical: '怕熱。', emergency: '', clinic: '' }],
];

const GOOD = ['提前確認散步路線，照片回報很完整，毛孩回來也很開心。', '耐心詢問飲食禁忌，準時抵達交接地點。', '會保持與陌生犬隻的距離，互動方式讓人安心。', '很有耐心，會按狗狗步調調整。', '回報非常即時，連喝水次數都有記錄！', '狗狗回家後睡得很香，下次還會再約。', '交接時說明很清楚，讓第一次使用的我很放心。'];
const MID = ['照護還可以，但時間確認需要更積極。', '照片比約定的少一些，其他都不錯。', '遲到了 10 分鐘，但有事先通知。'];

export function seed() {
  db.exec(`DROP TABLE IF EXISTS gps_points; DROP TABLE IF EXISTS walk_updates; DROP TABLE IF EXISTS reviews; DROP TABLE IF EXISTS incidents;
           DROP TABLE IF EXISTS messages; DROP TABLE IF EXISTS bookings; DROP TABLE IF EXISTS pets; DROP TABLE IF EXISTS walker_profiles; DROP TABLE IF EXISTS users;`);
  db.exec(SCHEMA);
  db.exec('BEGIN');
  const userIns = db.prepare('INSERT INTO users (role,name,avatar,email,phone,district,bio,experience) VALUES (?,?,?,?,?,?,?,?)');
  const ownerIds = OWNERS.map((o) => Number(userIns.run('owner', o.name, o.avatar, o.email, o.phone, o.district, o.bio, o.experience).lastInsertRowid));
  const walkerIds = WALKERS.map((w, i) => {
    let id;
    if (w.asOwner != null) {
      id = ownerIds[w.asOwner];
      run("UPDATE users SET role = 'both', bio = ? WHERE id = ?", w.bio, id);
    } else {
      id = Number(userIns.run(DUAL_OWNER_WALKERS.includes(i) ? 'both' : 'walker', w.name, w.avatar, `walker${i + 1}@example.com`, `0922-100-${pad(i + 10)}0`, w.district, w.bio, w.experience).lastInsertRowid);
    }
    const p = w.p;
    run(`INSERT INTO walker_profiles (user_id,gender,age,years,transport,mode,days,start_time,end_time,base_rates,rates,skills,verified,pending,qualification,areas,available)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`, id, p.gender, p.age, p.years, j(p.transport), p.mode, j(p.days), p.start_time, p.end_time, j(p.base), j(p.rates), j(p.skills), j(p.verified), j(p.pending), p.qualification, j(p.areas));
    return id;
  });
  const petIns = db.prepare(`INSERT INTO pets (owner_id,name,type,breed,birth,sex,neuter,weight,chip_last4,vaccine,energy,social,leash,intro,medical,emergency,clinic) VALUES (?,?,'犬',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const ownerOf = (oi) => (typeof oi === 'string' ? walkerIds[Number(oi.slice(1))] : ownerIds[oi]);
  const petIds = PETS.map(([oi, p]) => Number(petIns.run(ownerOf(oi), p.name, p.breed, p.birth, p.sex, p.neuter, p.weight, p.chip_last4, p.vaccine, p.energy, p.social, p.leash, p.intro, p.medical, p.emergency, p.clinic).lastInsertRowid));
  const petOwner = PETS.map(([oi]) => ownerOf(oi));
  const petIdx = (name) => PETS.findIndex(([, p]) => p.name === name);
  const profileOf = (wi) => ({ base_rates: WALKERS[wi].p.base, rates: WALKERS[wi].p.rates });

  const bookIns = db.prepare(`INSERT INTO bookings (owner_id,walker_id,pet_id,start_at,duration,mode,extras,conditions,address,district,route_id,photo_interval,notes,bill,status,progress,on_time,started_at,ended_at,settled_at,ai_report,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const book = (o) => {
    const extras = o.extras || { photo: true, care: false };
    const conditions = o.conditions || {};
    const mode = o.mode || 'paid';
    const bill = computeBill(o.walker != null ? profileOf(o.walker) : null, { mode, duration: o.duration, extras, conditions });
    return Number(bookIns.run(petOwner[o.pet], o.walker != null ? walkerIds[o.walker] : null, petIds[o.pet], o.start, o.duration, mode, j(extras), j(conditions),
      o.address || '臺北市大安區信義路三段（示範交接點）', o.district || '大安區', o.route || 'daan-1', o.interval ?? 15, o.notes || '', j(bill), o.status,
      o.progress ?? 0, o.onTime ?? null, o.started || null, o.ended || null, o.settled || null, o.report || null, o.created || sqlNow(60 * 24 * 3)).lastInsertRowid);
  };
  const revIns = db.prepare('INSERT INTO reviews (booking_id,owner_id,walker_id,stars,safety,punctual,updates,care,text,at) VALUES (?,?,?,?,?,?,?,?,?,?)');

  // ---- ~60 historical, settled walks so reputation stats come from real rows ----
  const districtRoute = { 大安區: 'daan-1', 信義區: 'xinyi-1', 中山區: 'zs-1', 中正區: 'daan-2' };
  const counts = [22, 14, 9, 12, 6, 15, 7, 8, 5];
  WALKERS.forEach((w, wi) => {
    for (let k = 0; k < counts[wi]; k++) {
      let pet = Math.floor(rand() * PETS.length);
      while (petOwner[pet] === walkerIds[wi]) pet = (pet + 1) % PETS.length; // 不會遛自己的狗
      const daysAgo = 3 + Math.floor(rand() * 150);
      const district = pick(w.p.areas);
      const onTime = rand() < w.q + 0.03 ? 1 : 0;
      const dur = pick([30, 60, 60, 90]);
      const start = localAt(-daysAgo, pick([8, 9, 10, 16, 17, 18]));
      const id = book({ pet, walker: wi, start, duration: dur, mode: w.p.mode === 'free' ? 'free' : 'paid', district, route: districtRoute[district] || 'daan-1', status: 'settled', progress: 1, onTime, started: start.replace('T', ' ') + ':00', ended: start.replace('T', ' ') + ':00', settled: start.replace('T', ' ') + ':00', created: start.replace('T', ' ') + ':00' });
      if (rand() < 0.9) {
        const good = rand() < w.q;
        const stars = good ? (rand() < 0.75 ? 5 : 4.5) : pick([3.5, 4, 4]);
        const sub = () => Math.max(3, Math.min(5, Math.round(stars + (rand() - 0.5))));
        revIns.run(id, petOwner[pet], walkerIds[wi], stars, sub(), onTime ? 5 : 3, sub(), sub(), good ? pick(GOOD) : pick(MID), start.replace('T', ' ') + ':00');
      }
    }
    const incIns = db.prepare("INSERT INTO incidents (walker_id,type,description,status,at) VALUES (?,?,?,'confirmed',?)");
    for (let k = 0; k < w.noShow; k++) incIns.run(walkerIds[wi], 'no_show', '未依約到場，飼主臨時找其他人協助。', sqlNow(60 * 24 * 120));
    for (let k = 0; k < w.lateCancel; k++) incIns.run(walkerIds[wi], 'late_cancel', '服務前 2 小時內取消（已確認，非放鳥）。', sqlNow(60 * 24 * (30 + k * 40)));
  });

  // ---- Live demo scenario for 小晴 (owner 0) and 林以安 (walker 0) ----
  // A) 明天：奶茶 × 林以安，已接受
  book({ pet: 0, walker: 0, start: localAt(1, 16), duration: 60, district: '大安區', route: 'daan-1', status: 'accepted', conditions: { large: true, reactive: true }, notes: '請避開其他大型犬，天熱多補水。' });
  // B) 進行中：Lucky × 陳子晴（GPS 模擬器會持續推進）
  const live = book({ pet: 1, walker: 1, start: localAt(0, new Date().getHours(), 0), duration: 60, district: '大安區', route: 'daan-3', status: 'in_progress', progress: 0.22, conditions: { reactive: true }, started: sqlNow(13), notes: '走慢一點，膝蓋要注意。', interval: 10 });
  const livePath = findRoute('daan-3').path;
  const gpsIns = db.prepare('INSERT INTO gps_points (booking_id,lat,lng,at) VALUES (?,?,?,?)');
  for (let k = 0; k <= 22; k += 2) { const [lat, lng] = pointAt(livePath, k / 100); gpsIns.run(live, lat, lng, sqlNow(13 - k * 0.5)); }
  const updIns = db.prepare('INSERT INTO walk_updates (booking_id,kind,text,ai_label,ai_flag,at) VALUES (?,?,?,?,?,?)');
  updIns.run(live, 'system', '陳子晴 已在交接點接到 Lucky，散步開始。', null, 0, sqlNow(13));
  updIns.run(live, 'note', 'Lucky 一開始有點緊張，我們先在巷口停下來讓他聞一聞，現在放鬆多了。', null, 0, sqlNow(8));
  updIns.run(live, 'note', '已喝水一次、尿尿一次，步伐穩定，膝蓋看起來沒問題。', null, 0, sqlNow(3));
  // C) 昨天完成、待評價結單：布丁 × 林以安
  const done = book({ pet: 2, walker: 0, start: localAt(-1, 17), duration: 60, district: '大安區', route: 'daan-1', status: 'completed', progress: 1, onTime: 1, started: sqlNow(60 * 20), ended: sqlNow(60 * 19), notes: '避免跳上跳下。' });
  const donePath = findRoute('daan-1').path;
  for (let k = 0; k <= 100; k += 5) { const [lat, lng] = pointAt(donePath, k / 100); gpsIns.run(done, lat, lng, sqlNow(60 * 20 - k * 0.6)); }
  updIns.run(done, 'system', '林以安 已在交接點接到 布丁，散步開始。', null, 0, sqlNow(60 * 20));
  updIns.run(done, 'note', '布丁精神很好！在草地上追了一下松鼠，有牽好沒有暴衝。', null, 0, sqlNow(60 * 20 - 15));
  updIns.run(done, 'note', '喝水兩次、便便一次（已清理）。過馬路時有抱起來避免跳階梯。', '水分補充正常', 0, sqlNow(60 * 20 - 35));
  updIns.run(done, 'system', '散步結束，布丁已安全交還。', null, 0, sqlNow(60 * 19));
  // D) 給林以安的新邀請：阿福（志明）
  book({ pet: 5, walker: 0, start: localAt(2, 10), duration: 90, district: '大安區', route: 'daan-3', status: 'requested', conditions: { senior: true, reactive: true }, notes: '阿福走得慢，請讓他自己決定速度，回程可以搭計程車。', created: sqlNow(40) });
  // D2) 兼任情境：林以安（以飼主身分）邀請 小晴（以遛狗者身分）遛 阿德
  book({ pet: petIdx('阿德 Ranger'), walker: 8, start: localAt(2, 19), duration: 60, district: '大安區', route: 'daan-1', status: 'requested', conditions: { large: true }, notes: '我那天要上夜班，麻煩幫我遛阿德，他很愛玩球！', created: sqlNow(25) });
  // E) 林以安本週另一個已確認行程：小米
  book({ pet: petIdx('小米'), walker: 0, start: localAt(3, 18, 30), duration: 30, district: '大安區', route: 'daan-2', status: 'accepted', notes: '' });
  // F) 公開任務（任何遛狗者都能接）
  book({ pet: 4, walker: null, start: localAt(2, 8), duration: 30, mode: 'free', district: '中山區', address: '臺北市中山區新生北路（示範交接點）', route: 'zs-1', status: 'open', conditions: { senior: true }, notes: '社區互助，早上散步 30 分鐘就好。' });
  book({ pet: 3, walker: null, start: localAt(1, 18), duration: 60, district: '信義區', address: '臺北市信義區松高路（示範交接點）', route: 'xinyi-1', status: 'open', conditions: { large: true }, notes: '黑糖很貪吃，路上請注意。' });
  book({ pet: 6, walker: null, start: localAt(4, 9), duration: 30, district: '大安區', address: '臺北市大安區敦化南路（示範交接點）', route: 'daan-2', status: 'open', notes: '短吻犬怕熱，請走陰涼路線。' });
  // G) Max 的德牧任務給王柏翰（他的待確認邀請）
  book({ pet: 7, walker: 3, start: localAt(1, 7), duration: 90, district: '中山區', address: '臺北市中山區民權東路（示範交接點）', route: 'zs-2', status: 'requested', conditions: { large: true, reactive: true } });

  // ---- Interview chat between 小晴 and 林以安 / 陳子晴 ----
  const msg = db.prepare('INSERT INTO messages (owner_id,walker_id,sender_id,text,at) VALUES (?,?,?,?,?)');
  msg.run(ownerIds[0], walkerIds[0], walkerIds[0], '您好！我看過奶茶的檔案了，請問她平常散步時遇到其他大型犬，會需要繞路嗎？', sqlNow(60 * 26));
  msg.run(ownerIds[0], walkerIds[0], ownerIds[0], '對，最好保持 5 公尺以上，她會很興奮。', sqlNow(60 * 25.5));
  msg.run(ownerIds[0], walkerIds[0], walkerIds[0], '了解！我會用雙重牽繩並避開大草坪中央，有狀況會先拍照跟您回報 🙂', sqlNow(60 * 25));
  msg.run(ownerIds[0], walkerIds[1], walkerIds[1], 'Lucky 今天的狀況我會每 10 分鐘回報一次，有任何需要都可以直接傳訊息給我。', sqlNow(20));

  // 示範帳號都能用 email + 預設密碼登入
  run('UPDATE users SET password_hash = ?', hashPassword(DEMO_PASSWORD));

  db.exec('COMMIT');
  return { owners: ownerIds.length, walkers: walkerIds.length, pets: petIds.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Seeded:', seed());
}
