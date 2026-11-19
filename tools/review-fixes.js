/* Проверка исправлений: скриншоты справки, гостя-пасхалки, коллекции секретов,
   терминала, вечера, сцены мафии и телефона. node tools/review-fixes.js */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));
const OUT = path.join(__dirname, '..', 'shots', 'review2');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-fix-'));
  fs.mkdirSync(path.join(profile, 'pad'), { recursive: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-crashpad', '--disable-breakpad',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,720', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'file:///C:/Projects/PVZ/game/index.html'
  ], { stdio: 'ignore' });

  let port = 0;
  for (let i = 0; i < 150 && !port; i++) {
    await sleep(120);
    try {
      port = parseInt(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 10);
    } catch (e) { /* not yet */ }
  }
  if (!port) { proc.kill(); throw new Error('no devtools port'); }

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(120);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) { /* not yet */ }
  }
  if (!target) { proc.kill(); throw new Error('no target'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      logs.push('[EXCEPTION] ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      logs.push('[console.error] ' + m.params.args.map((a) => a.value || a.description).join(' '));
    }
  });
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  await send('Runtime.enable');
  await send('Page.enable');

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result && r.result.value;
  };
  const shot = async (name) => {
    fs.mkdirSync(OUT, { recursive: true });
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  };

  const out = {};
  try {
    // --- справка (страницы)
    await ev(`PVZ.state.newGame(); PVZ.game.trans = null; PVZ.game.setScene(PVZ.scenes.menu()); 'ok'`);
    await sleep(500);
    await ev(`PVZ.input.dispatch('tap', 640, 461); 'help'`);
    await sleep(400);
    await shot('help-1');
    await ev(`PVZ.input.dispatch('tap', 1000, 660); 'next'`);
    await sleep(300);
    await shot('help-2');
    await ev(`PVZ.input.dispatch('tap', 1000, 660); 'next'`);
    await sleep(300);
    await shot('help-3');
    out.helpOk = await ev(`true`);

    // --- гость-пасхалка
    await ev(`(() => {
      PVZ.state.newGame();
      PVZ.state.data.apps = ['appstore','phone','terminal','market','reviews'];
      PVZ.state.data.tutorialSeen = true;
      PVZ.game.trans = null;
      PVZ.game.setScene(PVZ.scenes.shift({ day: 3, phase: 'day' }));
      const s = PVZ.game.scene, st = s.debug.st;
      PVZ.sys.EGG_CHANCE = 1;
      st.queue.length = 0; st.customer = null; st.nextT = 0;
      s.debug.spawn();
      s.debug.step();
      return st.queue.map(c => c.kind + ':' + (c.eggId || ''));
    })()`).then((v) => { out.spawned = v; });
    await sleep(1600);
    await ev(`(() => {
      const st = PVZ.game.scene.debug.st;
      const L = PVZ.art.LAYOUT.counter.customer;
      PVZ.input.dispatch('tap', L.x + L.w / 2, L.y + L.h / 2);
      return st.dlg ? st.dlg.name + ' / ' + st.dlg.role : 'no dialog';
    })()`).then((v) => { out.guestDialog = v; });
    await sleep(600);
    await shot('guest-dialog');
    out.guestResult = await ev(`(async () => {
      const st = PVZ.game.scene.debug.st;
      if (!st.dlg) return { error: 'no dialog' };
      const before = PVZ.state.data.money;
      const r = st.dlg.choiceRects[0];
      PVZ.input.dispatch('tap', r.x + 50, r.y + 22);
      await new Promise(res => setTimeout(res, 800));
      return { eggs: PVZ.state.data.eggs, money: PVZ.state.data.money - before,
               apps: PVZ.state.data.apps.filter(a => a === 'secrets') };
    })()`);
    // --- коллекция секретов в ноутбуке
    await ev(`(() => {
      const s = PVZ.game.scene, st = s.debug.st;
      st.customer = null; st.dlg = null; st.qte = null;
      s.debug.openApp('secrets');
      return st.laptop && st.laptop.mode;
    })()`).then((v) => { out.secretsMode = v; });
    await sleep(600);
    await shot('secrets');
    await ev(`PVZ.game.setScene(PVZ.scenes.shift({ day: 2, phase: 'morning' })); 'm'`);
    await sleep(700);
    await ev(`PVZ.game.scene.debug.terminal(); 't'`);
    await sleep(500);
    await shot('terminal-morning');
    out.terminalRows = await ev(`PVZ.game.scene.debug.st.terminal ? PVZ.game.scene.debug.st.terminal.mode : null`);

    // --- вечер
    await ev(`(() => {
      PVZ.game.setScene(PVZ.scenes.shift({ day: 3, phase: 'evening' }));
      PVZ.game.scene.debug.st.clock = 20 * 60 + 10;
      PVZ.game.scene.debug.view('hall');
      return 'evening';
    })()`);
    await sleep(800);
    await shot('evening');

    // --- телефон (иконки служб)
    await ev(`(() => {
      PVZ.game.setScene(PVZ.scenes.shift({ day: 2, phase: 'day' }));
      PVZ.game.scene.debug.openApp('phone');
      return 'phone';
    })()`);
    await sleep(900);
    await shot('phone');

    // --- мафия
    out.mafiaDemand = await ev(`({ d1: PVZ.sys.mafiaDemand(1), d5: PVZ.sys.mafiaDemand(5), d10: PVZ.sys.mafiaDemand(10),
      total: [1,2,3,4,5,6,7,8,9,10].reduce((s, d) => s + PVZ.sys.mafiaDemand(d), 0) })`);
    await ev(`PVZ.game.setScene(PVZ.scenes.mafia({ result: {
      day: 5, demand: 870, paid: 870, short: false, moneyBefore: 3000, moneyAfter: 2130,
      debtBefore: 6500, debtAfter: 5630, visits: 5, rage: false, taken: []
    }, report: null })); 'mafia'`);
    await sleep(2400);
    await shot('mafia');
    await ev(`PVZ.input.dispatch('tap', 640, 300); 'advance'`);
    await sleep(600);
    await ev(`PVZ.input.dispatch('tap', 640, 300); 'advance2'`);
    await sleep(600);
    await ev(`PVZ.input.dispatch('tap', 640, 300); 'advance3'`);
    await sleep(600);
    await shot('mafia-final');

    // --- отчёт со свободой и секретами
    await ev(`PVZ.game.setScene(PVZ.scenes.report({ day: 10, served: 20, plan: 20, complaints: 0, returns: 1,
      received: 8, earned: 1680, rating: 4.7, money: 2100, bonus: 300, final: true, carry: [],
      freed: true, eggs: 5, debt: 0 })); 'report'`);
    await sleep(800);
    await shot('report-freed');

    out.lastError = await ev(`PVZ.game.lastError || null`);
  } catch (e) {
    out.error = String(e && e.stack || e);
  }

  console.log(JSON.stringify(out, null, 1));
  if (logs.length) console.log(logs.slice(0, 10).join('\n'));
  ws.close();
  proc.kill();
  setTimeout(() => process.exit(0), 300);
}

main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
