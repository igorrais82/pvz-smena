(function () {
  var d = PVZ.state.newGame();
  d.day = 10;
  d.totals.days = 10;
  d.totals.earned = 25800;
  d.rating = 4.35;
  d.money = 9100;
  d.won = true;
  d.finale = { kind: 'win', day: 10, rating: 4.35, days: 10, earned: 25800, served: 147, complaints: 5, money: 9100 };
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.report({
    day: 10, served: 19, plan: 20, complaints: 1, returns: 3, received: 9,
    earned: 4260, bonus: 0, rating: 4.35, money: 9100, missed: 0,
    planPenalty: -0.06, tips: 240, final: true, carry: []
  }));
  return 'report ok';
})()
