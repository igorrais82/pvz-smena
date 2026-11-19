(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 5, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;
  const info = { orders: st.orders.length, supply: st.orders.filter(o => o.state === 'new').length,
    stored: st.orders.filter(o => o.state === 'stored').length, plan: st.plan, error: null };
  await wait(1500);
  info.clock1 = Math.round(st.clock);
  info.phase = st.phase;
  info.queue = st.queue.length;
  info.customer = !!st.customer;
  s.debug.spawn('pickup');
  info.kindAfterSpawn = st.queue.length ? st.queue[0].kind : null;
  await wait(1200);
  info.clock2 = Math.round(st.clock);
  info.queue2 = st.queue.length;
  info.customer2 = !!st.customer;
  info.lastError = PVZ.game.lastError || null;
  return info;
})()
