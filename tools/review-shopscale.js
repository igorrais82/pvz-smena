(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.money = 6400;
  PVZ.state.data.owned = ['coffee', 'decor_plant', 'scanner_pro'];
  PVZ.state.data.levels = { coffee: 2, decor_plant: 1, scanner_pro: 1 };
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shop({ from: 'review' }));
  await wait(900);
  return { scale: PVZ.art.textScale, money: PVZ.state.data.money };
})()
