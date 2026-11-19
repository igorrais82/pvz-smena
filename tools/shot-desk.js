/* Кадр: рабочий стол и очередь из покупателей */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.money = 9000;
  ['decor_plant', 'decor_cat', 'decor_lamp', 'decor_poster', 'decor_neon', 'decor_clock', 'scanner_pro', 'coffee'].forEach(id => PVZ.state.buy(id));
  st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60 + 25; st.doorOpen = true; st.lightsOn = true;
  st.customer = null; st.queue.length = 0; st.nextT = 0;
  st.orders.forEach(o => { if (o.state === 'stored') o.days = 2; });
  s.debug.spawn('pickup');
  s.debug.spawn('question');
  s.debug.spawn('return');
  s.debug.step();
  await sleep(4200);
  return { queue: st.queue.length, arrived: st.customer && st.customer.arrived };
})()
