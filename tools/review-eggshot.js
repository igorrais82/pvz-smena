(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  PVZ.sys.EGG_CHANCE = 1;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;
  s.debug.spawn();
  await wait(200);
  s.debug.step();
  const t0 = Date.now();
  while (Date.now() - t0 < 9000 && !(st.customer && st.customer.arrived)) await wait(120);
  const L = PVZ.art.LAYOUT.counter.customer;
  PVZ.input.dispatch('tap', L.x + L.w / 2, L.y + L.h / 2);
  await wait(2600);
  return { egg: st.customer && st.customer.eggId, dialog: !!st.dlg };
})()
