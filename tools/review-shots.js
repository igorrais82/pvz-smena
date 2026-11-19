/* Прогон для ревью: запускает игру в headless Chrome, играет смену и делает серию скриншотов.
   node tools/review-shots.js */
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

const OUT = path.join(__dirname, '..', 'shots', 'review');
const URL = 'file:///C:/Projects/PVZ/game/index.html?dev=day';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvz-review-'));
  const padding = path.join(profile, 'padding');
  fs.mkdirSync(padding, { recursive: true });
  const proc = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-crashpad', '--disable-breakpad',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--window-size=1280,720', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, URL
  ], { stdio: 'ignore' });

  let port = 0;
  for (let i = 0; i < 150 && !port; i++) {
    await sleep(120);
    try {
      const txt = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8');
      port = parseInt(txt.split(/\r?\n/)[0], 10);
    } catch (e) { /* not yet */ }
  }
  if (!port) { proc.kill(); throw new Error('DevTools port not found'); }

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(120);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch (e) { /* not yet */ }
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
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('[EXCEPTION] ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const parts = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || a.type));
      logs.push('[' + msg.params.type + '] ' + parts.join(' '));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  await send('Runtime.enable');
  await send('Page.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('eval: ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    }
    return r.result && r.result.value;
  };
  const shot = async (name) => {
    fs.mkdirSync(OUT, { recursive: true });
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  };
  const tap = (x, y) => evaluate(`PVZ.input.dispatch('tap', ${x}, ${y})`);

  const report = {};
  try {
    await evaluate(`localStorage.clear(); PVZ.state.data = PVZ.state.fresh();
      PVZ.apps.CORE.forEach(function (id) { if (!PVZ.state.hasApp(id)) PVZ.state.installApp(id); });
      PVZ.state.data.tutorialSeen = true;
      PVZ.game.trans = null;
      PVZ.game.setScene(PVZ.scenes.shift({ day: 1, phase: 'morning' })); 'ok'`);
    await sleep(900);
    await shot('01-morning');

    // интро-подсказки утра: задачи смены, игрок видит склад
    report.morningObjectives = await evaluate(`(PVZ.game.scene.debug.st.objectives||[]).map(o=>o.text+':'+o.done)`);

    // открыть смену в терминале (как это делает игрок)
    await evaluate(`PVZ.game.scene.debug.terminal()`);
    await sleep(500);
    report.terminalMode = await evaluate(`PVZ.game.scene.debug.st.terminal && PVZ.game.scene.debug.st.terminal.mode`);
    await shot('02-terminal');

    // приёмка: перетаскиваем коробку из лотка в свободную ячейку
    report.tutorial = await evaluate(`(() => {
      const s = PVZ.game.scene, st = s.debug.st;
      st.terminal = null;
      s.debug.view('warehouse');
      return { orders: st.orders.length, supply: st.orders.filter(o=>o.state==='new').length,
               view: st.view, objectives: st.objectives.map(o=>o.text+':'+o.done) };
    })()`);
    await sleep(500);
    await shot('03-warehouse');

    // закрываем утренние задачи напрямую, чтобы дойти до обслуживания клиента
    await evaluate(`(() => {
      const s = PVZ.game.scene, st = s.debug.st;
      st.objectives.forEach(o => o.done = true);
      s.debug.startPhase('day');
      s.debug.view('counter');
      return st.phase;
    })()`);
    await sleep(1200);
    await shot('04-day-counter');

    // ждём покупателя
    report.customer = await evaluate(`(async () => {
      const s = PVZ.game.scene, st = s.debug.st;
      const t0 = Date.now();
      while (Date.now() - t0 < 20000 && !st.customer) await new Promise(r => setTimeout(r, 200));
      if (!st.customer) return null;
      return { mood: st.customer.moodLabel, phone: st.customer.phoneLabel, parcels: st.customer.parcels,
               queue: st.queue.length, patience: Math.round((st.customer.patience/ st.customer.maxPatience||0)*100) };
    })()`);
    await shot('05-customer');

    // кликаем по покупателю — открывается обслуживание
    await evaluate(`(() => {
      const L = PVZ.art.LAYOUT.counter.customer;
      PVZ.input.dispatch('tap', L.x + L.w/2, L.y + L.h/2);
      return 'tap';
    })()`);
    await sleep(600);
    report.afterCustomerTap = await evaluate(`(() => {
      const st = PVZ.game.scene.debug.st;
      return { dlg: !!st.dlg, dlgText: st.dlg && st.dlg.text, terminal: st.terminal && st.terminal.mode,
               phone: !!st.phone, held: st.held && st.held.code };
    })()`);
    await shot('06-service');

    // скрин диалога/терминала, затем закрываем клиента
    report.served = await evaluate(`(async () => {
      const s = PVZ.game.scene, st = s.debug.st;
      const steps = [];
      for (let i = 0; i < 40; i++) {
        if (st.phone) {
          st.phone = null;
          steps.push('phone-closed');
        } else if (st.dlg && st.dlg.choices && st.dlg.choices.length) {
          const label = st.dlg.choices[0].label;
          PVZ.input.dispatch('tap', st.dlg.choiceRects[0].x + 100, st.dlg.choiceRects[0].y + 20);
          steps.push('choice:' + label);
        } else if (st.qte) {
          if (st.qte.type === 'timing' || st.qte.type === 'scan') {
            st.qte.pos = st.qte.zone; st.qte.onTap(0, 0);
          } else { st.qte = null; }
          steps.push('qte');
        } else if (st.terminal) {
          st.terminal = null;
          steps.push('terminal-closed');
        } else if (st.customer) {
          const L = PVZ.art.LAYOUT.counter.customer;
          PVZ.input.dispatch('tap', L.x + L.w/2, L.y + L.h/2);
          steps.push('tap-customer');
        } else break;
        await new Promise(r => setTimeout(r, 350));
      }
      return { steps: steps.slice(0, 12), served: st.stats.served, money: PVZ.state.data.money,
               rating: PVZ.state.data.rating.toFixed(2), customer: !!st.customer };
    })()`);
    await shot('07-after-served');

    // магазин: покупаем улучшение
    report.shop = await evaluate(`(async () => {
      PVZ.state.data.money = 6000;
      PVZ.game.setScene(PVZ.scenes.shop({ from: 'review' }));
      await new Promise(r => setTimeout(r, 400));
      const before = PVZ.state.data.owned.length;
      const item = PVZ.sys.SHOP[0];
      PVZ.state.buy(item.id);
      return { before, after: PVZ.state.data.owned.length, bought: item.name, money: PVZ.state.data.money };
    })()`);
    await sleep(500);
    await shot('08-shop');

    // ноутбук с приложениями
    report.apps = await evaluate(`(async () => {
      PVZ.game.setScene(PVZ.scenes.shift({ day: 3, phase: 'day' }));
      await new Promise(r => setTimeout(r, 300));
      PVZ.game.scene.debug.laptop();
      await new Promise(r => setTimeout(r, 400));
      const st = PVZ.game.scene.debug.st;
      return { laptop: !!st.laptop, apps: PVZ.state.data.apps };
    })()`);
    await sleep(500);
    await shot('09-laptop');

    // отчёт дня
    report.report = await evaluate(`(async () => {
      PVZ.game.setScene(PVZ.scenes.report({ day: 3, served: 12, plan: 12, complaints: 1, returns: 2,
        received: 7, earned: 3480, rating: 4.4, money: 8640, bonus: 300, final: false, carry: [] }));
      await new Promise(r => setTimeout(r, 400));
      return { ok: true };
    })()`);
    await sleep(500);
    await shot('10-report');

    report.lastError = await evaluate(`PVZ.game.lastError || null`);
  } catch (e) {
    report.error = String(e && e.stack || e);
  }

  console.log(JSON.stringify(report, null, 1));
  if (logs.length) console.log(logs.join('\n'));
  ws.close();
  proc.kill();
  setTimeout(() => process.exit(0), 300);
}

main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
