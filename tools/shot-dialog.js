/* Подготовка кадра: диалог выдачи с эффектами выбора + купленный декор */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.money = 20000;
  ['scanner_pro', 'coffee', 'music', 'uniform', 'courses', 'ad', 'terminal_pro', 'premium',
    'decor_plant', 'decor_cat', 'decor_lamp', 'decor_poster', 'decor_rug', 'decor_sofa',
    'decor_aquarium', 'decor_neon', 'decor_shelf', 'decor_clock'].forEach(id => PVZ.state.buy(id));
  st.phase = 'day'; st.shiftOpen = true; st.clock = 13 * 60; st.doorOpen = true; st.lightsOn = true;
  st.customer = null; st.queue.length = 0; st.nextT = 0;
  s.debug.spawn('pickup');
  s.debug.step();
  await sleep(2200);
  const c = st.customer;
  const order = st.orders.find(o => o.id === c.orderIds[0]);
  c.codeScanned = true;
  c.wantsFitting = false;
  st.held = { id: order.id, code: order.code, item: order.item, kind: order.kind, scanned: true, onTable: true, unpacked: true, placeT: 1 };
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(500);
  return { served: st.stats.served, dlg: !!st.dlg, choices: st.dlg ? st.dlg.choices.length : 0 };
})()
