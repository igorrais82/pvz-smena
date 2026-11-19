/* Мини-отладчик на Chrome DevTools Protocol: ошибки консоли + скриншот + eval.
   node tools/cdp.js <url> <out.png> [--wait=2500] [--eval="js"] [--size=1280x720] */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('Chrome/Edge not found');
}

const args = process.argv.slice(2);
const url = args[0];
const outPng = args[1];
const opt = {};
for (const a of args.slice(2)) {
  const m = a.match(/^--([a-z-]+)=?(.*)$/i);
  if (m) opt[m[1].toLowerCase()] = m[2];
}
const waitMs = parseInt(opt.wait || '2600', 10);
const size = (opt.size || '1280x720').split('x').map(Number);

async function main() {
  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-cdp-'));
  const singleProcess = process.env.PVZ_CDP_SINGLE === '1' ? ['--single-process'] : [];
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    ...singleProcess,
    `--window-size=${size[0]},${size[1]}`,
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    url
  ], { stdio: 'ignore' });

  // Chrome сам выбирает свободный порт и пишет его в DevToolsActivePort
  let port = 0;
  for (let i = 0; i < 120 && !port; i++) {
    await new Promise(r => setTimeout(r, 120));
    try {
      const txt = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8');
      port = parseInt(txt.split(/\r?\n/)[0], 10);
    } catch (e) { /* ещё не поднялся */ }
  }
  if (!port) { proc.kill(); throw new Error('DevTools port not found'); }

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await new Promise(r => setTimeout(r, 120));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) { /* ещё не поднялся */ }
  }
  if (!target) { proc.kill(); throw new Error('CDP target not found'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('[EXCEPTION] ' + (d.exception && (d.exception.description || d.exception.value) || d.text) +
        ' @ ' + (d.url || '') + ':' + (d.lineNumber + 1) + ':' + (d.columnNumber + 1));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const parts = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || a.type));
      logs.push('[' + msg.params.type + '] ' + parts.join(' '));
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      logs.push('[log-' + e.level + '] ' + e.text + (e.url ? ' @ ' + e.url : ''));
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  if (opt.evalfile) {
    opt.eval = fs.readFileSync(opt.evalfile, 'utf8');
  }
  if (opt.eval) {
    await new Promise(r => setTimeout(r, 800));
    const r = await send('Runtime.evaluate', { expression: opt.eval, awaitPromise: true, returnByValue: true });
    logs.push('[eval] ' + JSON.stringify(r.result && r.result.value, null, 1));
    if (r.exceptionDetails) logs.push('[eval-error] ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
  }

  await new Promise(r => setTimeout(r, waitMs));

  if (outPng) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    fs.writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
  }

  const title = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
  console.log('TITLE:', title.result && title.result.value);
  if (logs.length) console.log(logs.join('\n'));
  else console.log('(no console output / errors)');

  ws.close();
  proc.kill();
  setTimeout(() => process.exit(0), 200);
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
