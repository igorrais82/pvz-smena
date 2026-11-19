/* Кадр: магазин после смены с деньгами и покупками */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.stats.served = 10; st.stats.revenue = 1400;
  PVZ.state.data.money = 5600;
  PVZ.state.buy('coffee');
  PVZ.state.buy('decor_plant');
  PVZ.state.data.day = 4;
  s.debug.finish();
  await sleep(1400);
  PVZ.input.dispatch('tap', 640, 625);
  await sleep(1300);
  return { scene: PVZ.game.scene && PVZ.game.scene.isShop };
})()
