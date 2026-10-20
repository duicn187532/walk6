// Business rules shared by API, seed and simulator. Ported from the V3 mockup and moved server-side.

export const DEFAULT_BASE = { 30: 300, 60: 520, 90: 700 };
export const EXTRAS = { photo: { name: '定時照片回報', price: 50 }, care: { name: '餵食／擦腳等居家照護', price: 80 } };
export const CONDITIONS = [
  { id: 'large', name: '大型犬／高體重照護', help: '體型較大，需具備對應牽控能力' },
  { id: 'reactive', name: '敏感／易緊張／需隔離互動', help: '需額外觀察、路線規劃與應變能力' },
  { id: 'senior', name: '高齡／特殊健康注意', help: '須經飼主提供明確照護指示' },
  { id: 'extraPet', name: '同次額外照護一隻寵物', help: '每隻寵物都需建立檔案' },
];
export const OWNER_FEE = 0.05;   // 飼主服務費
export const WALKER_FEE = 0.10;  // 遛狗者平台抽成

export function computeBill(profile, { mode = 'paid', duration = 60, extras = {}, conditions = {} }) {
  if (mode === 'free') {
    return { mode, base: 0, extras: 0, conditions: 0, subtotal: 0, ownerFee: 0, walkerFee: 0, total: 0, net: 0, lines: [] };
  }
  const baseRates = profile?.base_rates || DEFAULT_BASE;
  const rates = profile?.rates || {};
  const lines = [];
  const base = Number(baseRates[duration] ?? DEFAULT_BASE[duration] ?? 0);
  lines.push({ label: `基本散步 ${duration} 分鐘`, amount: base });
  let ex = 0;
  for (const [k, def] of Object.entries(EXTRAS)) if (extras[k]) { ex += def.price; lines.push({ label: def.name, amount: def.price }); }
  let cond = 0;
  for (const c of CONDITIONS) if (conditions[c.id]) { const a = Number(rates[c.id] || 0); cond += a; lines.push({ label: c.name, amount: a }); }
  const subtotal = base + ex + cond;
  const ownerFee = Math.round(subtotal * OWNER_FEE);
  const walkerFee = Math.round(subtotal * WALKER_FEE);
  return { mode, base, extras: ex, conditions: cond, subtotal, ownerFee, walkerFee, total: subtotal + ownerFee, net: subtotal - walkerFee, lines };
}

const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };

/** Is `startAt` (ISO local) inside the walker's weekly availability? */
export function fitsSchedule(profile, startAt, duration) {
  if (!profile || !startAt) return true;
  const d = new Date(startAt);
  if (Number.isNaN(+d)) return true;
  if (!(profile.days || []).includes(d.getDay())) return false;
  const t = d.getHours() * 60 + d.getMinutes();
  return t >= toMin(profile.start_time) && t + Number(duration) <= toMin(profile.end_time);
}

export function petAgeYears(pet) {
  if (!pet?.birth) return null;
  const b = new Date(pet.birth + '-01');
  if (Number.isNaN(+b)) return null;
  return (Date.now() - b) / (365.25 * 864e5);
}

/** Which special-care conditions a pet implies (used for auto-check + matching). */
export function petNeeds(pet) {
  if (!pet) return {};
  const age = petAgeYears(pet);
  return {
    large: Number(pet.weight) >= 20,
    reactive: ['容易緊張', '需保持距離'].includes(pet.social),
    senior: (age ?? 0) >= 8 || /膝|關節|心臟|術後/.test(pet.medical || ''),
  };
}
const NEED_SKILL = { large: '大型犬照護', reactive: '敏感犬照護', senior: '高齡犬照護' };

/**
 * Match score 55–99 with a factor breakdown. Inputs are already-aggregated stats from the DB,
 * so every number shown in the UI traces back to real rows (reviews, bookings, incidents).
 */
export function scoreWalker({ walker, profile, stats, pet, startAt, duration, district, mode }) {
  const needs = petNeeds(pet);
  const skills = profile.skills || [];
  const reasons = [];
  // 1. 照護需求匹配
  let care = 80;
  for (const [need, on] of Object.entries(needs)) {
    if (!on) continue;
    if (skills.includes(NEED_SKILL[need])) { care += 7; reasons.push(`具備${NEED_SKILL[need]}經驗`); }
    else { care -= 9; reasons.push(`缺少${NEED_SKILL[need]}經驗`); }
  }
  care += Math.min(profile.years || 0, 5) * 2;
  // 2. 時段與模式
  let time = 92;
  const fits = fitsSchedule(profile, startAt, duration);
  if (startAt && !fits) { time -= 30; reasons.push('此時段不在可服務時間'); }
  const modeOk = !mode || profile.mode === 'both' || profile.mode === mode;
  if (!modeOk) { time -= 25; reasons.push(mode === 'free' ? '不接受免費互助任務' : '僅接受免費互助任務'); }
  if (!profile.available) { time -= 20; reasons.push('目前暫停接單'); }
  // 3. 歷史評價與可靠度
  let rep = 50 + (stats.avgStars ? (stats.avgStars - 3) * 22 : 10) + (stats.onTime - 85) * 0.6;
  rep -= stats.noShow * 12 + Math.max(0, stats.lateCancel - 1) * 3;
  if (stats.noShow) reasons.push(`曾有 ${stats.noShow} 次確認放鳥紀錄`);
  // 4. 地區
  const areas = profile.areas || [];
  let area = district && areas.includes(district) ? 98 : district ? 70 : 85;
  if (district && areas.includes(district)) reasons.push(`常駐${district}`);

  const clamp = (v) => Math.round(Math.max(30, Math.min(99, v)));
  const factors = { care: clamp(care), time: clamp(time), reputation: clamp(rep), area: clamp(area) };
  const score = Math.round(Math.max(55, Math.min(99, factors.care * 0.35 + factors.time * 0.2 + factors.reputation * 0.3 + factors.area * 0.15)));
  return { score, factors, reasons, fits, modeOk };
}

// ---- Walking routes around each 交接點 (approximate real Taipei streets) ----
const loop = (pts) => [...pts, pts[0]];
export const ROUTES = {
  大安區: {
    center: [25.0325, 121.5395],
    routes: [
      { id: 'daan-1', name: '大安森林公園環線', icon: '🌳', note: '寬敞步道、草地多，適合活潑犬', path: loop([[25.0336, 121.5332], [25.0336, 121.5374], [25.0300, 121.5376], [25.0266, 121.5374], [25.0266, 121.5332], [25.0300, 121.5331]]) },
      { id: 'daan-2', name: '仁愛路林蔭慢走', icon: '🍃', note: '安全島林蔭步道，遮陽佳', path: loop([[25.0378, 121.5402], [25.0379, 121.5450], [25.0379, 121.5492], [25.0333, 121.5490], [25.0331, 121.5402]]) },
      { id: 'daan-3', name: '安靜住宅區小巷', icon: '🏡', note: '車少人少，適合敏感犬', path: loop([[25.0302, 121.5400], [25.0303, 121.5440], [25.0272, 121.5441], [25.0271, 121.5400]]) },
    ],
  },
  信義區: {
    center: [25.0360, 121.5655],
    routes: [
      { id: 'xinyi-1', name: '市府廣場綠帶', icon: '🌳', note: '腹地大，假日人多', path: loop([[25.0378, 121.5622], [25.0378, 121.5682], [25.0342, 121.5683], [25.0341, 121.5622]]) },
      { id: 'xinyi-2', name: '四四南村慢行', icon: '🍃', note: '平坦好走，有休息座椅', path: loop([[25.0322, 121.5600], [25.0322, 121.5640], [25.0298, 121.5641], [25.0297, 121.5600]]) },
      { id: 'xinyi-3', name: '象山步道入口環線', icon: '⛰️', note: '有坡度，適合體力好的狗狗', path: loop([[25.0300, 121.5680], [25.0300, 121.5720], [25.0272, 121.5722], [25.0270, 121.5680]]) },
    ],
  },
  中山區: {
    center: [25.0700, 121.5330],
    routes: [
      { id: 'zs-1', name: '新生公園環線', icon: '🌳', note: '綠地大、有寵物區', path: loop([[25.0722, 121.5310], [25.0722, 121.5372], [25.0680, 121.5373], [25.0680, 121.5310]]) },
      { id: 'zs-2', name: '花博園區周邊', icon: '🌸', note: '步道寬，晚間照明好', path: loop([[25.0718, 121.5222], [25.0718, 121.5270], [25.0688, 121.5272], [25.0688, 121.5222]]) },
      { id: 'zs-3', name: '中山北路林蔭', icon: '🍃', note: '老樹遮蔭，平坦', path: loop([[25.0640, 121.5220], [25.0640, 121.5250], [25.0590, 121.5251], [25.0590, 121.5220]]) },
    ],
  },
};
export function routesFor(district) {
  return ROUTES[district] || ROUTES['大安區'];
}
export function findRoute(routeId) {
  for (const d of Object.values(ROUTES)) for (const r of d.routes) if (r.id === routeId) return r;
  return ROUTES['大安區'].routes[0];
}
export function haversine([a, b], [c, d]) {
  const R = 6371000, rad = Math.PI / 180;
  const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const pathLength = (p) => p.slice(1).reduce((s, pt, i) => s + haversine(p[i], pt), 0);

/** Point at fraction t (0–1) along the path. */
export function pointAt(path, t) {
  const total = pathLength(path);
  let target = total * Math.max(0, Math.min(1, t));
  for (let i = 1; i < path.length; i++) {
    const seg = haversine(path[i - 1], path[i]);
    if (target <= seg) {
      const f = seg ? target / seg : 0;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
    }
    target -= seg;
  }
  return path[path.length - 1];
}
