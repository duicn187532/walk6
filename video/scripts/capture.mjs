// Walk 我可遛 — capture three-piece kit for the promo (adapted from skill assets/scripts/capture-template.mjs):
//   1. full-page 2x screenshots   2. per-element cutouts (2x, hero card 4x)   3. src/walk/layout.json
// Usage: node scripts/capture.mjs [pageName ...]   (app must be running on BASE; data is the fictional seed)
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:4100';
const OUT = path.join(HERE, '../public/textures/live');
const LAYOUT = path.join(HERE, '../src/walk/layout.json');
const LIVE_ID = process.env.LIVE_ID || '100';
const REPORT_ID = process.env.REPORT_ID || '101';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(LAYOUT), { recursive: true });

const only = process.argv.slice(2);
const layout = fs.existsSync(LAYOUT) ? JSON.parse(fs.readFileSync(LAYOUT, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, args: ['--font-render-hinting=none'] });

async function open(url, scale = 2) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale });
  await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);
  return page;
}
const box = (page, sel, all = false) =>
  page.evaluate((sel, all) => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
    return all ? [...document.querySelectorAll(sel)].map(r) : (document.querySelector(sel) ? r(document.querySelector(sel)) : null);
  }, sel, all);
async function cut(page, sel, file, { transparent = false, index = 0 } = {}) {
  const els = await page.$$(sel);
  const el = els[index];
  if (!el) { console.warn('  ! missing', sel); return; }
  await el.screenshot({ path: path.join(OUT, file), omitBackground: transparent });
}
async function full(page, name) {
  const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });
  return pageH;
}
// Freeze motion so the texture is a clean "settled" state (no toast, no transitions, no caret).
const calm = (page) => page.addStyleTag({ content: '*{transition:none!important;animation:none!important} .toast{display:none!important}' });

const PAGES = {
  async match() {
    const page = await open('/owner/match?as=A');
    // wait for the AI recommendation text to land (local Ollama)
    await page.waitForFunction(() => { const r = document.querySelector('.reason'); return r && !/正在閱讀/.test(r.innerText); }, { timeout: 90000 });
    await calm(page); await sleep(400);
    const pageH = await full(page, 'match');
    layout.match = {
      pageH,
      filters: await box(page, '.content > .card'),
      items: await box(page, 'button.item', true),
      panel: await box(page, '.grid.split > .card'),
      reason: await box(page, '.reason'),
      meters: await box(page, '.meter', true),
      trustStats: await box(page, '.trust-stats'),
      reasonText: await page.$eval('.reason', (e) => e.innerText),
    };
    await cut(page, 'button.item', 'match-item1.png');
    await cut(page, '.grid.split > .card', 'match-panel.png');
    await page.close();
    // 4x hero card for the push-in close-up (Q2)
    const hi = await open('/owner/match?as=A', 4);
    await hi.waitForFunction(() => document.querySelectorAll('button.item').length > 0, { timeout: 60000 });
    await calm(hi); await sleep(300);
    await cut(hi, 'button.item', 'match-item1-hires.png');
    await hi.close();
  },
  async book() {
    const page = await open('/owner/book?walker=12&pet=1&as=A');
    await sleep(2500); // OSM tiles
    await calm(page);
    const pageH = await full(page, 'book');
    layout.book = {
      pageH,
      formCard: await box(page, '.grid.split > .stack > .card'),
      fitNotice: await box(page, '.grid.split .notice'),
      walkerSelect: await box(page, '.form-grid label:nth-child(2) select'),
      options: await box(page, '.option', true),
      mapCard: await box(page, '.grid.split > .stack:last-child > .card'),
      mapBox: await box(page, '.map-box'),
      routes: await box(page, '.route-opt', true),
      priceBox: await box(page, '.price-box'),
      submit: await box(page, '.price-box ~ button'),
    };
    await cut(page, '.price-box', 'book-price.png');
    await cut(page, '.map-box', 'book-map.png');
    await page.close();
  },
  async live() {
    const page = await open(`/owner/live/${LIVE_ID}?as=A`);
    await sleep(2500);
    await calm(page);
    // Hide the real trail + moving marker and the "progress 100%" row: the film draws its own trail.
    await page.addStyleTag({ content: `.leaflet-overlay-pane path[stroke="#d1a94a"], .leaflet-overlay-pane path[stroke="#c77e73"], .map-emoji.live, .map-emoji.alert { opacity: 0 !important }
      .card .row.mt:has(+ .progress), .progress, .grid.split > .card .notice { visibility: hidden !important }` });
    await sleep(300);
    const route = await page.evaluate(() => {
      const p = [...document.querySelectorAll('.leaflet-overlay-pane path')].find((e) => e.getAttribute('stroke') === '#658ba3');
      const L = p.getTotalLength(); const m = p.getScreenCTM(); const pts = [];
      for (let i = 0; i <= 160; i++) { const q = p.getPointAtLength((L * i) / 160); pts.push([+(m.a * q.x + m.c * q.y + m.e).toFixed(1), +(m.b * q.x + m.d * q.y + m.f + scrollY).toFixed(1)]); }
      return pts;
    });
    const pageH = await full(page, 'live');
    layout.live = {
      pageH, route,
      mapCard: await box(page, '.grid.split > .card'),
      mapBox: await box(page, '.map-box'),
      timelineCard: await box(page, '.grid.split > .stack > .card:last-child'),
      rows: await box(page, '.tl', true),
      petCard: await box(page, '.grid.split > .stack > .card'),
      notice: await box(page, '.grid.split > .card .notice'),
    };
    await cut(page, '.map-box', 'live-map.png');
    await cut(page, '.tl', 'live-row-alert.png', { index: 1 });
    await page.close();
  },
  async report() {
    const page = await open(`/owner/report/${REPORT_ID}?as=A`);
    await page.waitForSelector('.report-text', { timeout: 90000 });
    await sleep(2500);
    await calm(page);
    const pageH = await full(page, 'report');
    // one block per rendered line of the AI report (Range client rects) → typewriter reveal targets
    const lines = await page.evaluate(() => {
      const el = document.querySelector('.report-text'); const out = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const r = document.createRange(); r.selectNodeContents(n);
        for (const b of r.getClientRects()) if (b.width > 4) out.push({ x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) });
      }
      // merge rects on the same line
      const merged = [];
      for (const b of out) { const m = merged.find((x) => Math.abs(x.y - b.y) < 4); if (m) { const r = Math.max(m.x + m.w, b.x + b.w); m.x = Math.min(m.x, b.x); m.w = r - m.x; } else merged.push({ ...b }); }
      return merged.sort((a, b) => a.y - b.y);
    });
    layout.report = {
      pageH, lines,
      heroCard: await box(page, '.grid.split > .stack:first-child > .card'),
      reportCard: await box(page, '.grid.split > .stack:first-child > .card:nth-child(2)'),
      reportText: await box(page, '.report-text'),
      leftRail: await box(page, '.grid.split > .stack:first-child'),
      rightRail: await box(page, '.grid.split > .stack:last-child'),
      reviewCard: await box(page, '.grid.split > .stack:last-child > .card'),
      priceBox: await box(page, '.price-box'),
    };
    await cut(page, '.grid.split > .stack:first-child > .card:nth-child(2)', 'report-card.png');
    await page.close();
  },
};

for (const [name, fn] of Object.entries(PAGES)) {
  if (only.length && !only.includes(name)) continue;
  console.log('capturing', name);
  await fn();
}
fs.writeFileSync(LAYOUT, JSON.stringify(layout, null, 1));
await browser.close();
console.log('done →', LAYOUT);
