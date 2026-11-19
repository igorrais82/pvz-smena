(async function () {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  PVZ.state.newGame();
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.menu());
  await wait(350);
  PVZ.input.dispatch('tap', 640, 461); // «Как играть»
  await wait(300);
  return 'help ok';
})()
