// Extract QA frames from a rendered mp4 (uses Remotion's bundled ffmpeg).
// Usage: node scripts/qa-frames.mjs out/draft1.mp4 out/qa/v1 [frame ...]
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const [src, outDir, ...rest] = process.argv.slice(2);
const DEFAULT = [60, 105, 188, 208, 268, 335, 380, 430, 470, 510, 545, 580, 612, 660, 739, 819, 877, 922, 970, 1019, 1050, 1099, 1172, 1257, 1309, 1328, 1340, 1419];
const frames = rest.length ? rest.map(Number) : DEFAULT;
fs.mkdirSync(outDir, { recursive: true });
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
for (const f of frames) {
  const out = path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`);
  execFileSync(npx, ['remotion', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', (f / 30 + 0.001).toFixed(4), '-i', src, '-frames:v', '1', '-q:v', '3', out], { stdio: 'inherit', shell: process.platform === 'win32' });
}
console.log(`extracted ${frames.length} frames → ${outDir}`);
