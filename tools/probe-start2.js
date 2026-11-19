/* Обычный вход: меню → «Начать смену» → утро */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    ok(!!g.scene && g.scene.isMenu, 'стартуем в меню');
    tap(640, 400);
    await sleep(1600);
    ok(!!g.scene && g.scene.isShift, 'сцена смены открылась');
    const st = g.scene && g.scene.debug.st;
    ok(st && st.phase === 'morning', 'фаза утро');
    ok(st && st.objectives.length === 5, '5 утренних задач (включая установку приложений)');
    ok(st && st.orders.filter(o => o.state === 'stored').length > 0, 'склад заполнен: ' + (st ? st.orders.filter(o => o.state === 'stored').length : 0));
    ok(st && st.shiftOpen === false, 'смена ещё не открыта');
    ok(PVZ.state.data && PVZ.state.data.owned.length === 0, 'покупок пока нет');
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
