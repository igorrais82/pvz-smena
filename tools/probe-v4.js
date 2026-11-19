(async function () {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = { errors: [], events: 0, dialogs: 0 };
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 8, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  var st = s.debug.st;
  st.clock = 12 * 60;
  await wait(300);

  // все мини-игры рисуются без ошибок
  var types = ['timing', 'scan', 'rapid', 'wipe', 'trace', 'hold', 'cashier', 'count', 'sort', 'swipe'];
  for (var i = 0; i < types.length; i++) {
    st.qte = new PVZ.sys.QTE({ type: types[i], title: 'test ' + types[i], code: '4821' });
    await wait(140);
    st.qte = null;
  }

  // случайные события: диалоги закрываем выбором, QTE снимаем
  for (var k = 0; k < 14; k++) {
    s.debug.event();
    out.events++;
    await wait(120);
    if (st.dlg) {
      out.dialogs++;
      PVZ.input.dispatch('tap', 640, 395);
      await wait(80);
    }
    if (st.qte) { st.qte = null; }
    if (st.terminal) { st.terminal = null; }
    if (st.phone) { st.phone = null; }
  }

  // клиенты и смена фазы
  for (var q = 0; q < 6; q++) { s.debug.spawn(); }
  await wait(250);
  s.debug.startPhase('evening');
  await wait(250);
  out.lastError = PVZ.game.lastError || null;
  out.view = st.view;
  out.rating = PVZ.state.data.rating;
  out.queue = st.queue.length;
  return out;
})()
