// Tile QA frames into 4×2 labelled contact sheets via puppeteer (Remotion's ffmpeg lacks xstack).
// Usage: node scripts/contact-sheet.mjs out/qa/v1
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const dir = path.resolve(process.argv[2]);
const files = fs.readdirSync(dir).filter((f) => /^f\d+\.jpg$/.test(f)).sort();
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 720 });
for (let s = 0; s < files.length; s += 8) {
  const group = files.slice(s, s + 8);
  const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(4,480px);gap:0">${group
    .map((f) => `<div style="position:relative;width:480px;height:270px"><img src="${pathToFileURL(path.join(dir, f))}" style="width:480px;height:270px;display:block"><b style="position:absolute;left:6px;top:4px;font:700 22px sans-serif;color:#d00;background:#fffc;padding:0 6px">${f.slice(1, 5)}</b></div>`)
    .join('')}</body>`;
  const tmp = path.join(dir, '_sheet.html');
  fs.writeFileSync(tmp, html);
  await page.setViewport({ width: 1920, height: 270 * Math.ceil(group.length / 4) });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  const out = path.join(dir, `sheet${s / 8 + 1}.jpg`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
  console.log(out);
}
await browser.close();
