(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.menu());
  await wait(600);
  PVZ.input.dispatch('tap', 640, 461); // «Как играть»
  await wait(700);
  return { scene: PVZ.game.scene && PVZ.game.scene.isMenu };
})()
