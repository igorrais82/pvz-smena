/* Проверка реального звучания тем в браузере: OfflineAudioContext рендерит
   утро, день, вечер, мафию и ночной эфир и считает пик/RMS.
   Запуск: node tools/probe-audio.js
   Нужен Chrome/Edge; на Windows вне песочницы. */
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

const RENDER_EXPR = `(async () => {
  const ids = ['morning', 'day', 'evening', 'mafia', 'night', 'lofi', 'jazz', 'chip', 'classic', 'menu'];
  const M = PVZ.music;
  const out = {};
  for (const id of ids) {
    const th = M.THEMES[id];
    const bars = id === 'mafia' ? 4 : 6;
    const tension = id === 'mafia' ? 0.8 : 0.25;
    const bpm = th.bpm + tension * (th.tempoLift || 0);
    const barDur = 16 * (60 / bpm / 4);
    const len = Math.ceil(44100 * (barDur * bars + 1));
    const off = new OfflineAudioContext(2, len, 44100);
    const bus = off.createGain();
    bus.gain.value = 1;
    bus.connect(off.destination);
    const slots = [];
    for (let i = 0; i < 2; i++) {
      const g = off.createGain();
      g.gain.value = i === 0 ? 1 : 0.0001;
      g.connect(bus);
      slots.push({ gain: g, send: null, theme: '' });
    }
    const nb = off.createBuffer(1, 44100 * 4, 44100);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const old = {
      ctx: M.ctx, bus: M.bus, slots: M.slots, active: M.active,
      themeId: M.themeId, bar: M.bar, tension: M.tension, noiseBuf: M.noiseBuf
    };
    M.ctx = off; M.bus = bus; M.slots = slots; M.active = 0;
    M.themeId = id; M.bar = 0; M.tension = tension; M.noiseBuf = nb;
    for (let b = 0; b < bars; b++) M.playBar(th, b, 0.05 + b * barDur);
    const rendered = await off.startRendering();
    const d0 = rendered.getChannelData(0);
    const d1 = rendered.getChannelData(1);
    let peak = 0, sum = 0, audible = 0, clipped = 0;
    for (let i = 0; i < d0.length; i++) {
      const a = Math.abs(d0[i]), b = Math.abs(d1[i]);
      const v = a > b ? a : b;
      if (v > peak) peak = v;
      if (v > 0.999) clipped++;
      sum += d0[i] * d0[i] + d1[i] * d1[i];
      if (v > 0.001) audible++;
    }
    out[id] = {
      peak: +peak.toFixed(3),
      rms: +Math.sqrt(sum / (d0.length * 2)).toFixed(4),
      audible: +(audible / d0.length).toFixed(3),
      clipped: clipped,
      seconds: +barDur * bars
    };
    M.ctx = old.ctx; M.bus = old.bus; M.slots = old.slots; M.active = old.active;
    M.themeId = old.themeId; M.bar = old.bar; M.tension = old.tension; M.noiseBuf = old.noiseBuf;
  }
  return out;
})()`;

async function main() {
  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-audio-'));
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--disable-crash-reporter',
    ...(process.env.PVZ_CDP_SINGLE === '1' ? ['--single-process'] : []),
    '--window-size=1280,720', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'file:///' + path.join(__dirname, '..', 'game', 'index.html').replace(/\\/g, '/')
  ];
  const proc = spawn(chrome, args, { stdio: 'ignore' });
  let port = 0;
  for (let i = 0; i < 120 && !port; i++) {
    await new Promise((r) => setTimeout(r, 120));
    try {
      port = parseInt(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 10);
    } catch (e) { /* ещё поднимается */ }
  }
  if (!port) { proc.kill(); throw new Error('DevTools port not found'); }
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await new Promise((r) => setTimeout(r, 120));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) { /* ещё поднимается */ }
  }
  if (!target) { proc.kill(); throw new Error('CDP target not found'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('[EXCEPTION] ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      logs.push('[console.error] ' + msg.params.args.map((a) => a.value || a.description).join(' '));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  await send('Runtime.enable');
  await new Promise((r) => setTimeout(r, 1200));
  const res = await send('Runtime.evaluate', { expression: RENDER_EXPR, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception && res.exceptionDetails.exception.description || res.exceptionDetails.text);
  }
  const metrics = res.result && res.result.value;
  console.log(JSON.stringify(metrics, null, 2));
  const problems = [];
  Object.keys(metrics || {}).forEach((k) => {
    const m = metrics[k];
    if (m.peak > 0.99) problems.push(k + ': клиппинг (пик ' + m.peak + ')');
    if (m.peak < 0.02) problems.push(k + ': слишком тихо (пик ' + m.peak + ')');
    if (m.audible < 0.5) problems.push(k + ': много тишины (' + m.audible + ')');
  });
  if (logs.length) console.log(logs.join('\n'));
  ws.close();
  proc.kill();
  if (problems.length) {
    console.error('ПРОБЛЕМЫ:\n' + problems.join('\n'));
    setTimeout(() => process.exit(1), 200);
  } else {
    console.log('ЗВУК ОК: клиппинга нет, все темы звучат');
    setTimeout(() => process.exit(0), 200);
  }
}
main().catch((e) => { console.error('FAIL ' + e.message); process.exit(1); });
