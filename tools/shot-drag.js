(function () {
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  var st = s.debug.st;
  st.objectives.forEach(function (o) { if (o.id !== 'receive') o.done = true; });
  var list = st.orders.filter(function (o) { return o.state === 'new'; });
  var order = list[0];
  // свободная ячейка под размер коробки
  var free = PVZ.sys.freeCells(st.orders, order.size);
  var cell = free[0];
  st.rack = cell.rack;
  st.view = 'rack';
  var gx = 350, gy = 174, gw = 700, gh = 348;
  var cw = gw / 3, ch = gh / 3;
  var cx = gx + cell.col * cw + cw / 2;
  var cy = gy + cell.row * ch + ch / 2;
  var w = 70, gap = 8;
  var tw = list.length * (w + gap) - gap;
  var tx = 640 - tw / 2 + 1 * (w + gap) + w / 2;
  st.drag = { order: order, mode: 'new', x: cx, y: cy, sx: tx, sy: 580, active: true, moved: 40 };
  return 'drag to ' + cell.id + ' size ' + order.size;
})()
