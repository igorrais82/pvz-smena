/* Диагностика приёмки поставки */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const s = PVZ.game.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const cellRects = () => {
    const out = [];
    const gx = 350, gy = 196, gw = 700, gh = 434;
    const cw = gw / PVZ.sys.COLS, ch = gh / PVZ.sys.ROWS;
    for (let r = 0; r < PVZ.sys.ROWS; r++) for (let c = 0; c < PVZ.sys.COLS; c++) {
      out.push({ id: PVZ.sys.cellId(st.rack, r, c), x: gx + c * cw + 8, y: gy + r * ch + 7, w: cw - 16, h: ch - 14 });
    }
    return out;
  };
  try {
    st.shiftOpen = true;
    s.debug.view('warehouse');
    await sleep(200);
    for (let i = 0; i < 10; i++) {
      if (!st.placing) {
        const o = st.orders.find(x => x.state === 'new');
        if (!o) break;
        log.push('#' + i + ' принять ' + o.code + ' freeCells=' + PVZ.sys.freeCells(st.orders, o.size).length);
        tap(382, 596);
        await sleep(200);
        log.push('   → placing=' + (st.placing && st.placing.code + '@' + st.placing.cell) + ' view=' + st.view + ' msg=' + st.msg);
      } else {
        const cell = cellRects().find(r => r.id === st.placing.cell);
        log.push('#' + i + ' положить в ' + st.placing.cell + ' rect=' + (cell && Math.round(cell.x + cell.w / 2) + ',' + Math.round(cell.y + cell.h / 2)));
        if (cell) tap(cell.x + cell.w / 2, cell.y + cell.h / 2);
        await sleep(200);
        log.push('   → placing=' + (!!st.placing) + ' view=' + st.view + ' msg=' + st.msg);
      }
    }
    log.push('итог: received=' + st.stats.received + ' new=' + st.orders.filter(o => o.state === 'new').length + ' stored=' + st.orders.filter(o => o.state === 'stored').length);
    return { log };
  } catch (e) {
    return { error: String(e && e.stack || e), log };
  }
})()
