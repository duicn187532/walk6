// Opens ONE ngrok tunnel to the server and prints the two tester links (?as=A / ?as=B).
// Optional settings in .env.ngrok (see .env.ngrok.example):
//   NGROK_AUTHTOKEN  use a different ngrok account → its own free domain, separate from other projects
//   NGROK_DOMAIN     a domain you reserved (paid plan or the other account's dev domain)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const env = { ...process.env };
if (existsSync('.env.ngrok')) {
  for (const raw of readFileSync('.env.ngrok', 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2]) env[m[1]] = m[2];
  }
}
const port = env.API_PORT || '4100';
const args = ['http', port, '--log', 'stdout', '--log-format', 'logfmt'];
if (env.NGROK_AUTHTOKEN) args.push('--authtoken', env.NGROK_AUTHTOKEN);
if (env.NGROK_DOMAIN) args.push('--url', env.NGROK_DOMAIN.replace(/^https?:\/\//, ''));

console.log(`[tunnel] 啟動 ngrok → http://localhost:${port}${env.NGROK_AUTHTOKEN ? '（使用 .env.ngrok 的帳號）' : ''}`);
const child = spawn('ngrok', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });

let printed = false;
const onLine = (line) => {
  const url = line.match(/url=(https:\/\/\S+)/)?.[1];
  if (url && !printed) {
    printed = true;
    const links = [
      `體驗者 A（小晴，飼主兼遛狗者）  ${url}/owner?as=A`,
      `體驗者 B（林以安，遛狗者兼飼主）${url}/walker?as=B`,
    ];
    writeFileSync('share-links.txt', links.join('\n') + '\n');
    console.log('\n================ 分享這兩個連結 ================');
    links.forEach((l) => console.log('  ' + l));
    console.log('==============================================');
    console.log('（已存到 share-links.txt。關掉這個視窗就會停止對外分享。）\n');
  }
  if (/ERR_NGROK_334|already online/.test(line)) {
    console.error(`
[tunnel] 這個 ngrok 帳號的免費網域已被其他專案（例如彤靈）使用中，免費方案每個帳號只有一個網域。
  任選一個方法讓 Walk 我可遛 擁有自己的端點：
  1. 推薦：再註冊一個免費 ngrok 帳號，把它的 authtoken 填進 .env.ngrok 的 NGROK_AUTHTOKEN
  2. 付費方案：在 ngrok 後台多保留一個網域，填進 .env.ngrok 的 NGROK_DOMAIN
  3. 暫時：先關掉彤靈的 ngrok，再重新執行 start-walk.bat
`);
  } else if (/lvl=(eror|crit)/.test(line) && !/session closing|terminating/.test(line)) {
    console.error('[tunnel] ' + line);
  }
};
const pipe = (s) => { let buf = ''; s.on('data', (d) => { buf += d; const parts = buf.split('\n'); buf = parts.pop(); parts.forEach(onLine); }); };
pipe(child.stdout); pipe(child.stderr);
child.on('exit', (code) => process.exit(code ?? 0));
