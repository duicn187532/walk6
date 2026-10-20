// Thin Ollama wrapper. Every function has a template fallback so the app works without a model.
import { readFileSync } from 'node:fs';

const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:4b';
const SYSTEM = '你是「Walk 我可遛」遛狗媒合平台的 AI 助理。一律使用台灣繁體中文回答，語氣溫暖、具體、簡潔，不要使用 Markdown 標題。';

let status = { ok: null, model: MODEL, checkedAt: 0 };
export async function aiStatus() {
  if (Date.now() - status.checkedAt < 30000 && status.ok !== null) return status;
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    const tags = await r.json();
    status = { ok: (tags.models || []).some((m) => m.name === MODEL), model: MODEL, checkedAt: Date.now() };
  } catch { status = { ok: false, model: MODEL, checkedAt: Date.now() }; }
  return status;
}

async function chat(prompt, { images, json = false, timeout = 60000 } = {}) {
  if (!(await aiStatus()).ok) return null;
  try {
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeout),
      body: JSON.stringify({
        model: MODEL, stream: false, think: false, ...(json ? { format: 'json' } : {}),
        options: { temperature: 0.6 },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt, ...(images ? { images } : {}) }],
      }),
    });
    const data = await r.json();
    return data?.message?.content?.trim() || null;
  } catch (e) {
    console.warn('[ai] ollama call failed:', e.message);
    return null;
  }
}

const petLine = (p) => `${p.name}（${p.breed}，${p.weight}kg，個性：${p.energy}／${p.social}，介紹：${p.intro || '無'}，醫療注意：${p.medical || '無'}）`;

const cache = new Map();
export async function matchReason(pet, walker, profile, match) {
  const key = `${pet.id}:${walker.id}:${match.score}`;
  if (cache.has(key)) return cache.get(key);
  const text = await chat(
    `請用 2 句話（共 70 字內）向飼主說明為什麼推薦這位遛狗者，要提到具體的匹配點，若有風險也要溫和提醒。\n` +
    `毛孩：${petLine(pet)}\n遛狗者：${walker.name}，${profile.years} 年經驗，專長：${(profile.skills || []).join('、')}，資格：${profile.qualification}，自介：${walker.bio}\n` +
    `系統計算：適配 ${match.score}%，因素：${match.reasons.join('；') || '無特殊'}`, { timeout: 30000 });
  const result = { text: text || fallbackReason(pet, walker, profile, match), ai: !!text };
  cache.set(key, result);
  return result;
}
function fallbackReason(pet, walker, profile, match) {
  const good = match.reasons.filter((r) => !/缺少|不在|不接受|暫停|放鳥/.test(r));
  const bad = match.reasons.filter((r) => /缺少|不在|不接受|暫停|放鳥/.test(r));
  return `${walker.name}${good.length ? good.join('、') : `有 ${profile.years} 年照護經驗`}，與${pet.name}的需求相符。${bad.length ? `提醒：${bad.join('、')}，建議先面談確認。` : '建議先聊聊交接細節再預約。'}`;
}

export async function interviewQuestions(pet) {
  const text = await chat(`飼主即將與遛狗者面談。請根據這隻毛孩的檔案，列出 3 個飼主最該問遛狗者的問題，每題一行、以「・」開頭、每題 30 字內，不要其他說明。\n毛孩：${petLine(pet)}`, { timeout: 30000 });
  if (text) return { ai: true, questions: text.split('\n').map((s) => s.replace(/^[・\-\d.\s*]+/, '').trim()).filter(Boolean).slice(0, 3) };
  const q = ['如果遇到其他狗狗靠近，你會怎麼處理？', '散步中多久回報一次照片與狀況？', '發生緊急狀況時的處理流程是什麼？'];
  if (pet.medical) q[2] = `${pet.name}有「${pet.medical.slice(0, 14)}」，你有類似照護經驗嗎？`;
  return { ai: false, questions: q };
}

/** Look at a walk photo and flag anything the owner should see. */
export async function analyzePhoto(filePath, pet) {
  let b64;
  try { b64 = readFileSync(filePath).toString('base64'); } catch { return null; }
  const text = await chat(
    `這是遛狗者在散步中回傳的照片，毛孩是${pet.breed}「${pet.name}」。請判斷照片中狗狗的狀態，回傳 JSON：` +
    `{"label":"10 字內的狀態標籤，例如：精神良好、正在喝水","concern":true 或 false（只有在看到受傷、喘不過氣、逃脫、看不到狗、危險環境時才是 true）,"note":"給飼主的一句話說明，25 字內"}`,
    { images: [b64], json: true, timeout: 60000 });
  if (!text) return null;
  try { const o = JSON.parse(text); return { label: String(o.label || '').slice(0, 20), concern: !!o.concern, note: String(o.note || '').slice(0, 60) }; }
  catch { return null; }
}

export async function careReport({ pet, walker, booking, updates, distanceM, minutes }) {
  const log = updates.map((u) => `- ${u.at.slice(11, 16)} ${u.text || ''}${u.ai_label ? `（照片：${u.ai_label}）` : ''}`).join('\n');
  const text = await chat(
    `請根據以下散步紀錄，為飼主撰寫一份照護報告，約 120–160 字，分成「今天的散步」「身體與情緒」「下次建議」三小段，每段開頭用【】標示。不要捏造紀錄中沒有的事件。\n` +
    `毛孩：${petLine(pet)}\n遛狗者：${walker.name}\n時間：${minutes} 分鐘，距離約 ${(distanceM / 1000).toFixed(2)} 公里\n飼主備註：${booking.notes || '無'}\n紀錄：\n${log || '（無）'}`,
    { timeout: 90000 });
  if (text) return { text, ai: true };
  return {
    ai: false,
    text: `【今天的散步】${walker.name}陪${pet.name}散步約 ${minutes} 分鐘，走了 ${(distanceM / 1000).toFixed(2)} 公里，共回報 ${updates.filter((u) => u.kind !== 'system').length} 次現況。\n` +
      `【身體與情緒】${updates.filter((u) => u.kind === 'note').map((u) => u.text).slice(-1)[0] || '過程平穩，無異常回報。'}\n` +
      `【下次建議】${pet.medical ? `持續留意：${pet.medical}` : '維持目前的散步節奏即可。'}`,
  };
}
