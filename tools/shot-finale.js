(function () {
  var d = PVZ.state.newGame();
  d.totals.days = 10;
  d.totals.served = 148;
  d.totals.earned = 28400;
  d.totals.complaints = 6;
  d.rating = 4.62;
  d.money = 9120;
  d.won = true;
  PVZ.state.save();
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.finale());
  return 'finale ok';
})()
