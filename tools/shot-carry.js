/* Кадр стойки: коробка в руках по дороге со склада */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  if (!s || !s.debug) return 'no shift scene';
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 14 * 60; st.tut = null; st.customer = null; st.queue.length = 0;
  st.view = 'counter'; st.scannerHeld = true;
  const o = st.orders.find((x) => x.state === 'stored');
  st.held = {
    id: o.id, code: o.code, item: o.item, kind: o.kind,
    scanned: false, onTable: false, unpacked: false, placeT: 0
  };
  await sleep(900);
  return { item: st.held.item, onTable: st.held.onTable };
})()
