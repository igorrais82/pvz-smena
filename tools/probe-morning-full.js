(async function () {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = {};
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  var st = s.debug.st;
  st.objectives.forEach(function (o) { if (o.id !== 'receive') { o.done = true; o.progress = null; } });
  st.lightsOn = true;
  st.doorOpen = true;
  st.shiftOpen = true;
  st.view = 'rack';
  st.rack = 'A';
  await wait(250);

  var gx = 350, gy = 174, gw = 700, gh = 348;
  var placed = 0;
  for (var guard = 0; guard < 20; guard++) {
    var list = st.orders.filter(function (o) { return o.state === 'new'; });
    if (!list.length) break;
    var order = list[0];
    var free = PVZ.sys.freeCells(st.orders, order.size)[0];
    if (!free) break;
    st.rack = free.rack;
    await wait(90);
    var tw = 70, gap = 8, th = 58;
    var total = list.length * (tw + gap) - gap;
    var idx = list.indexOf(order);
    var tx = 640 - total / 2 + idx * (tw + gap) + tw / 2;
    var ty = 552 + th / 2;
    var cx = gx + free.col * (gw / 3) + (gw / 3) / 2;
    var cy = gy + free.row * (gh / 3) + (gh / 3) / 2;
    PVZ.input.dispatch('down', tx, ty);
    PVZ.input.dispatch('move', cx, cy);
    PVZ.input.dispatch('up', cx, cy);
    placed++;
  }
  await wait(250);
  out.placed = placed;
  out.received = st.stats.received;
  out.phase = st.phase;
  out.receiveDone = (st.objectives.find(function (o) { return o.id === 'receive'; }) || {}).done;

  // предупреждение о низком рейтинге
  PVZ.state.data.rating = 3.4;
  await wait(300);
  out.warnMsg = st.msg;
  out.hudLow = PVZ.state.data.rating < PVZ.balance.ratingWarn;
  return out;
})()
