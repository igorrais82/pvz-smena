/* Подготовка кадра: магазин внутри ноутбука (с деньгами) */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 17 * 60; st.doorOpen = true; st.lightsOn = true;
  PVZ.state.data.money = 4200;
  PVZ.state.buy('decor_plant'); PVZ.state.buy('coffee');
  st.customer = null; st.queue.length = 0;
  s.debug.laptop();
  st.laptop.mode = 'shop';
  st.laptop.shop.tab = 'decor';
  st.laptop.shop.page = 0;
  await sleep(700);
  return { mode: st.laptop.mode, tab: st.laptop.shop.tab, money: PVZ.state.data.money };
})()
