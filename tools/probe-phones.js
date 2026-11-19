/* Особые телефоны: без телефона, часы, разбитый экран, бумажка */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  async function arrive(kind) {
    st.customer = null; st.queue.length = 0; st.nextT = 0; st.qte = null; st.dlg = null; st.terminal = null; st.phone = null;
    s.debug.spawn(kind);
    s.debug.step();
    const t0 = Date.now();
    while (Date.now() - t0 < 5000) { if (st.customer && st.customer.arrived) return st.customer; await sleep(80); }
    return st.customer;
  }
  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true; st.lightsOn = true;

    // без телефона
    let c = await arrive('pickup');
    c.phone = 'none'; c.phoneLabel = 'без телефона';
    tap(620, 300);
    await sleep(250);
    ok(!!st.dlg && /забыл|часах/.test(st.dlg.text), 'диалог «нет телефона»');
    tap(st.dlg.choiceRects[0].x + st.dlg.choiceRects[0].w / 2, st.dlg.choiceRects[0].y + 23);
    await sleep(300);
    ok(c.dictated && !!st.terminal && st.terminal.mode === 'found', 'код записан, терминал открыт');
    st.terminal = null; st.customer = null; st.nextT = 0;

    // разбитый экран
    c = await arrive('pickup');
    c.phone = 'cracked'; c.phoneLabel = 'с трещиной';
    tap(620, 300);
    await sleep(250);
    ok(!!st.phone, 'открыт телефон с трещиной');
    tap(504 + 136, 412 + 29);
    await sleep(200);
    ok(!st.qte, 'скан разбитого телефона не запускается');
    tap(504 + 136, 478 + 22);
    await sleep(250);
    ok(!!st.dlg, 'предложено продиктовать код');
    tap(st.dlg.choiceRects[0].x + st.dlg.choiceRects[0].w / 2, st.dlg.choiceRects[0].y + 23);
    await sleep(300);
    ok(c.dictated && !!st.terminal, 'код продиктован, терминал открыт');
    st.terminal = null; st.customer = null; st.nextT = 0;

    // бумажка с кодом
    c = await arrive('pickup');
    c.phone = 'paper'; c.phoneLabel = 'бумажка';
    st.scannerHeld = true;
    tap(620, 300);
    await sleep(250);
    ok(!!st.phone, 'открыта бумажка с кодом');
    tap(504 + 136, 412 + 29);
    await sleep(250);
    ok(!!st.qte && st.qte.type === 'scan' && st.qte.hard, 'скан бумажки запускается');
    st.qte.pos = st.qte.zone; st.qte.onTap(0, 0);
    await sleep(350);
    ok(c.codeScanned && !!st.terminal, 'код с бумажки считан');
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
