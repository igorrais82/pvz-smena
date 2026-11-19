/* Утро: свет → смена в терминале → приёмка поставки → дверь → день */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game, s = g.scene, st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
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
    // обязательные приложения уже установлены (иначе смену не открыть)
    s.debug.installCore();
    s.debug.view('hall');
    await sleep(300);
    const ls = PVZ.art.LAYOUT.hall.light;
    tap(ls.x + 20, ls.y + 20);
    await sleep(200);
    ok(st.lightsOn, 'свет включён');
    const door = PVZ.art.LAYOUT.hall.door;
    tap(door.x + door.w / 2, door.y + door.h / 2);
    await sleep(200);
    ok(st.doorOpen, 'дверь открыта');

    s.debug.view('counter');
    await sleep(200);
    const lap = PVZ.art.LAYOUT.counter.laptop;
    tap(lap.x + lap.w / 2, lap.y + lap.h / 2);
    await sleep(250);
    ok(!!st.laptop, 'ноутбук открыт');
    tap(214 + 2 * 164 + 76, 252 + 68); // ярлык «Терминал» (App Market, Телефон, Терминал)
    await sleep(300);
    ok(!!st.terminal && st.terminal.mode === 'shift', 'терминал: открытие смены');
    tap(370, 528);
    await sleep(300);
    ok(st.shiftOpen, 'смена открыта');

    s.debug.view('warehouse');
    await sleep(250);
    let guard = 0;
    while (st.orders.some(o => o.state === 'new' || o.state === 'placing') && guard++ < 30) {
      if (st.placing) {
        const cell = cellRects().find(r => r.id === st.placing.cell);
        if (cell) tap(cell.x + cell.w / 2, cell.y + cell.h / 2);
      } else {
        tap(382, 596);
      }
      await sleep(180);
    }
    ok(st.stats.received > 0, 'поставка принята: ' + st.stats.received);
    await sleep(300);
    ok(st.phase === 'day', 'фаза сменилась на день');
    ok(st.objectives.length === 0, 'утренние задачи закрыты');
    log.push('план дня: ' + st.plan + ', денег: ' + PVZ.state.data.money);
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
