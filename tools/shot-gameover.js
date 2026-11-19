(function () {
  var d = PVZ.state.newGame();
  d.totals.days = 4;
  d.totals.served = 41;
  d.totals.earned = 7300;
  d.totals.complaints = 9;
  d.rating = 2.94;
  d.money = 540;
  d.over = true;
  d.finale = {
    kind: 'fail', reason: 'Рейтинг упал до 2.94 из 5,00', day: 5,
    rating: 2.94, days: 4, earned: 7300, served: 41, complaints: 9, money: 540
  };
  PVZ.state.save();
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.gameover(d.finale));
  return 'gameover ok';
})()
