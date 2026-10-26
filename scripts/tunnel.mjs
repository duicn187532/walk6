// Shares Walk 我可遛 through the shared ngrok gateway (../shared-ngrok), which also serves 彤靈:
//   https://<ngrok 網域>/walk/…  → this server (4100)    https://<ngrok 網域>/… → 彤靈
// Starts the gateway in its own window if it isn't running, then prints the two tester links (?as=A / ?as=B).
// Optional in .env.ngrok: SHARED_NGROK_DIR (gateway folder), NGROK_AUTHTOKEN / NGROK_DOMAIN (passed to the gateway).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = { ...process.env };
if (existsSync('.env.ngrok')) {
  for (const raw of readFileSync('.env.ngrok', 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2]) env[m[1]] = m[2];
  }
}
const dir = resolve(env.SHARED_NGROK_DIR || '../shared-ngrok');
const status = () => fetch('http://127.0.0.1:8090/__gateway', { signal: AbortSignal.timeout(2000) }).then((r) => r.json()).catch(() => null);

let gw = await status();
if (!gw) {
  if (!existsSync(resolve(dir, 'start.cmd'))) {
    console.error(`[tunnel] 找不到共用 ngrok 閘道：${dir}\\start.cmd（可在 .env.ngrok 設定 SHARED_NGROK_DIR）`);
    process.exit(1);
  }
  console.log('[tunnel] 啟動共用 ngrok 閘道（新視窗「Shared ngrok Gateway」）…');
  spawn('cmd.exe', ['/c', 'start', '""', resolve(dir, 'start.cmd')], { env, detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
}
for (let i = 0; i < 30 && !gw?.url; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  gw = await status();
}
if (!gw?.url) {
  console.error('[tunnel] 共用 ngrok 尚未取得公開網址，請查看「Shared ngrok Gateway」視窗。');
  process.exit(1);
}
const links = [
  `體驗者 A（小晴，飼主兼遛狗者）  ${gw.url}/walk/owner?as=A`,
  `體驗者 B（林以安，遛狗者兼飼主）${gw.url}/walk/walker?as=B`,
];
writeFileSync('share-links.txt', links.join('\n') + '\n');
console.log('\n================ 分享這兩個連結 ================');
links.forEach((l) => console.log('  ' + l));
console.log('==============================================');
console.log('（已存到 share-links.txt。ngrok 與彤靈共用，關掉「Shared ngrok Gateway」視窗才會停止對外分享。）\n');
