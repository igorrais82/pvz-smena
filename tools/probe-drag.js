(function () {
  PVZ.state.newGame();
  var s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  var st = s.debug.st;
  st.view = 'rack';
  st.rack = 'A';
  var list = st.orders.filter(function (o) { return o.state === 'new'; });
  var order = list[0];
  var occupiedA = st.orders.filter(function (o) { return o.cell && o.cell.charAt(0) === 'A'; })
    .map(function (o) { return o.cell + ':' + o.state + ':' + o.size; });
  return {
    supply: list.length,
    orderSize: order.size,
    orderState: order.state,
    orderCell: order.cell,
    occupiedA: occupiedA,
    rows: PVZ.sys.ROWS,
    states: Object.keys(PVZ.sys.CELL_STATES),
    allowsL33: PVZ.sys.cellAllowsSize('A-3-3', order.size),
    freeCells: PVZ.sys.freeCells(st.orders, order.size).map(function (c) { return c.id; }).slice(0, 6)
  };
})()
