(function () {
  var d = PVZ.state.newGame();
  d.totals.days = 6;
  d.totals.earned = 15400;
  d.rating = 4.5;
  d.money = 6200;
  d.owned = ['decor_plant', 'decor_cat', 'decor_lamp'];
  d.day = 7;
  PVZ.game.trans = null;
  var s = PVZ.scenes.shop({ from: 'report' });
  PVZ.game.setScene(s);
  s.shopUI.tab = 'decor';
  return 'shop ok';
})()
