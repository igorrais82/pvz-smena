/* Живой диалог выдачи (настоящие варианты игры) */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  if (!s || !s.debug) return 'no shift scene';
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 14 * 60; st.doorOpen = true; st.lightsOn = true;
  st.tut = null; st.customer = null; st.queue.length = 0; st.scannerHeld = true;
  s.debug.spawn('pickup');
  s.debug.step();
  const c = st.customer;
  if (!c) return 'no customer';
  c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
  c.moving = false; c.arrived = true; c.arrivedT = 1; c.codeScanned = true;
  const o = st.orders.find((x) => x.id === c.orderIds[0]);
  st.held = {
    id: o.id, code: o.code, item: o.item, kind: o.kind,
    scanned: true, onTable: true, unpacked: true, placeT: 1
  };
  await sleep(400);
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(1600);
  return {
    dlg: !!st.dlg,
    name: st.dlg && st.dlg.name,
    item: o.item,
    labels: st.dlg && st.dlg.choices.map((ch) => ch.label)
  };
})()
