/* Кадр для RuStore: магазин с покупками.
   node tools/cdp.js "file:///.../game/index.html?dev=day&clean=1" shots/store-shop.png \
     --evalfile=tools/store-shop.js */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 80; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await sleep(100);
  }
  PVZ.state.data.money = 6800;
  PVZ.state.buy('scanner_pro');
  PVZ.state.upgrade('scanner_pro');
  PVZ.state.buy('coffee');
  PVZ.state.buy('decor_cat');
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shop({ from: 'store' }));
  await sleep(900);
  return { ok: true, money: PVZ.state.data.money };
})()
