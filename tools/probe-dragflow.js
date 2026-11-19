(async function () {
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = {};
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  var st = s.debug.st;
  st.view = 'warehouse';
  await wait(350); // даём кадру построить горячие точки

  // 1) тап по коробке на полу склада открывает стеллаж
  PVZ.input.dispatch('tap', 382, 588);
  out.afterTapView = st.view;
  out.afterTapRack = st.rack;
  await wait(120);

  // 2) настоящее перетаскивание через input.dispatch
  st.view = 'rack';
  var list = st.orders.filter(function (o) { return o.state === 'new'; });
  var order = list[0];
  var free = PVZ.sys.freeCells(st.orders, order.size)[0];
  st.rack = free.rack;
  await wait(120);
  var tw = 70, gap = 8, th = 58;
  var total = list.length * (tw + gap) - gap;
  var tx = 640 - total / 2 + 0 * (tw + gap) + tw / 2;
  var ty = 552 + th / 2;
  var gx = 350, gy = 174, gw = 700, gh = 348;
  var cx = gx + free.col * (gw / 3) + (gw / 3) / 2;
  var cy = gy + free.row * (gh / 3) + (gh / 3) / 2;

  PVZ.input.dispatch('down', tx, ty);
  out.dragStarted = !!(st.drag && st.drag.active);
  PVZ.input.dispatch('move', cx, cy);
  PVZ.input.dispatch('up', cx, cy);
  out.orderState = order.state;
  out.orderCell = order.cell;
  out.expected = free.id;
  out.received = st.stats.received;
  out.dragCleared = !st.drag;

  // 3) крупную коробку нельзя поставить на верхнюю полку
  var big = st.orders.filter(function (o) { return o.state === 'new' && o.size === 'L'; })[0];
  if (!big) {
    big = PVZ.sys.generateSupply(1, 1)[0];
    big.size = 'L';
    big.state = 'new';
    big.cell = null;
    st.orders.push(big);
  }
  var topFree = PVZ.sys.freeCells(st.orders, 'S').filter(function (c) { return c.row === 0; })[0];
  if (topFree) {
    st.rack = topFree.rack;
    await wait(120);
    var all = st.orders.filter(function (o) { return o.state === 'new'; });
    var idxL = all.indexOf(big);
    var t0 = all.length * (tw + gap) - gap;
    var lx = 640 - t0 / 2 + idxL * (tw + gap) + tw / 2;
    var lcx = gx + topFree.col * (gw / 3) + (gw / 3) / 2;
    var lcy = gy + topFree.row * (gh / 3) + (gh / 3) / 2;
    PVZ.input.dispatch('down', lx, ty);
    PVZ.input.dispatch('move', lcx, lcy);
    PVZ.input.dispatch('up', lcx, lcy);
    out.bigRejected = big.state === 'new' && big.cell === null;
    out.bigMsg = st.msg;
  }

  // 4) свободная нижняя полка для крупной — принимается
  var bottomFree = PVZ.sys.freeCells(st.orders, 'L')[0];
  if (bottomFree) {
    st.rack = bottomFree.rack;
    await wait(120);
    var all2 = st.orders.filter(function (o) { return o.state === 'new'; });
    var i2 = all2.indexOf(big);
    var t2 = all2.length * (tw + gap) - gap;
    var bx = 640 - t2 / 2 + i2 * (tw + gap) + tw / 2;
    var bcx = gx + bottomFree.col * (gw / 3) + (gw / 3) / 2;
    var bcy = gy + bottomFree.row * (gh / 3) + (gh / 3) / 2;
    PVZ.input.dispatch('down', bx, ty);
    PVZ.input.dispatch('move', bcx, bcy);
    PVZ.input.dispatch('up', bcx, bcy);
    out.bigAccepted = big.state === 'stored' && big.cell === bottomFree.id;
  }
  return out;
})()
