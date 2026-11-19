/* Проверка QoL-улучшения «Автоматизация выдачи»: код, лента и браслет.
   node tools/cdp.js "file:///.../game/index.html?dev=day" shots/probe-automation.png \
     --evalfile=tools/probe-automation.js */
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};

  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.money = 99999;
  // 3 уровня автоматизации
  out.bought = PVZ.state.buy('automation');
  out.up1 = PVZ.state.upgrade('automation');
  out.up2 = PVZ.state.upgrade('automation');
  out.level = PVZ.state.level('automation');
  out.mods = (({ autoCarry, autoScan, autoCode }) => ({ autoCarry, autoScan, autoCode }))(PVZ.state.mods());

  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 5, phase: 'day' }));
  const s = PVZ.game.scene;
  const st = s.debug.st;
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.clock = 13 * 60;
  st.queue.length = 0;
  st.customer = null;

  s.debug.spawn('pickup');
  await wait(120);
  s.debug.step();
  await wait(200);
  out.customer = st.customer && {
    code: st.customer.code,
    codeScanned: !!st.customer.codeScanned,
    masked: !(st.customer.dictated || st.customer.codeScanned)
  };

  // берём заказ из ячейки (как после терминала)
  const order = st.orders.find((o) => o.customer === st.customer.id);
  out.orderCell = order && order.cell;
  s.debug.take(order.id);
  await wait(150);
  out.held = st.held && {
    code: st.held.code,
    onTable: !!st.held.onTable,
    scanned: !!st.held.scanned
  };

  out.err = PVZ.game.lastError || null;
  return out;
})()
