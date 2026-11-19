(function () {
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 3, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  s.debug.st.clock = 12 * 60;
  s.debug.spawn('pickup');
  s.debug.spawn('question');
  s.debug.spawn('return');
  s.debug.step();
  var c = s.debug.st.customer;
  c.arrived = true;
  c.patience = 0.86;
  c.bubble = 'Здравствуйте! Вот мой код получения.';
  c.bubbleAlpha = 1;
  s.debug.st.stats.revenue = 1240;
  s.debug.st.stats.served = 3;
  return 'counter ok';
})()
