/* Полный старт «с нуля»: меню → новая смена → утро → день → пауза → меню → продолжить */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    localStorage.removeItem('pvz_smena_save_v2');
    PVZ.state.data = PVZ.state.fresh();
    g.setScene(PVZ.scenes.menu());
    await sleep(200);
    ok(!!g.scene && g.scene.isMenu, 'меню загружено');

    // «Начать смену» — первая кнопка
    tap(640, 429);
    await sleep(1300);
    ok(g.scene && g.scene.isShift, 'смена началась');
    const st = g.scene && g.scene.debug && g.scene.debug.st;
    ok(st && st.phase === 'morning', 'фаза утро');
    ok(st && st.orders.length > 0, 'заказы есть: ' + (st ? st.orders.length : 0));
    ok(st && st.objectives.length === 5, 'цели утра: ' + (st ? st.objectives.length : 0));

    if (st) {
      // пробуем нажать всё подряд в зале и на складе — игра не должна падать
      g.scene.debug.view('hall');
      await sleep(200);
      for (const p of [[600, 300], [495, 330], [150, 300], [1180, 300]]) { tap(p[0], p[1]); await sleep(120); }
      g.scene.debug.view('warehouse');
      await sleep(200);
      for (const p of [[260, 300], [560, 300], [860, 300], [1140, 300], [382, 596], [1025, 620]]) { tap(p[0], p[1]); await sleep(120); }
      g.scene.debug.view('counter');
      await sleep(200);
      for (const p of [[150, 350], [1200, 350], [616, 558], [762, 504]]) { tap(p[0], p[1]); await sleep(120); }
      if (st.terminal) g.scene.closeTerminal();
      ok(true, 'случайные нажатия не сломали игру');
    }

    // пауза и возврат в меню
    g.togglePause();
    await sleep(150);
    ok(g.paused, 'пауза включилась');
    ok(!!PVZ.state.data.shift, 'смена сохранена в паузе');
    tap(640, 449);            // «Сохранить и в меню»
    await sleep(600);
    ok(g.scene && g.scene.isMenu, 'вернулись в меню');
    ok(PVZ.state.data.shift && PVZ.state.data.shift.orders.length > 0, 'сохранение содержит заказы');

    // продолжить
    tap(640, 431);
    await sleep(1300);
    ok(g.scene && g.scene.isShift, 'продолжили смену');
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
