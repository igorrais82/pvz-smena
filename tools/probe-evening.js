/* Прогон вечера: закрытие двери → возвраты → касса → закрытие смены → отчёт */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const key = (k) => PVZ.input.dispatch('key', 0, 0, k);
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    // подготовим возвраты
    st.orders.slice(0, 2).forEach(o => { o.state = 'return'; });
    st.stats.served = 9; st.stats.revenue = 405; st.plan = 10;
    st.shiftOpen = true;

    s.debug.view('hall');
    await sleep(200);
    tap(600, 300);              // дверь
    await sleep(200);
    ok(!st.doorOpen, 'дверь закрыта');
    ok(st.objectives.find(o => o.id === 'closeDoor').done, 'цель «закрыть дверь» выполнена');

    // уборка мусора
    for (const d of st.dust) { tap(d.x, d.y); await sleep(160); }
    ok(st.objectives.find(o => o.id === 'clean').done, 'мусор убран');

    s.debug.view('warehouse');
    await sleep(200);
    tap(1025, 619);             // зона возвратов
    await sleep(200);
    ok(st.objectives.find(o => o.id === 'returns').done, 'возвраты сданы');

    s.debug.view('counter');
    await sleep(200);
    tap(625, 670);              // касса
    await sleep(200);
    ok(st.objectives.find(o => o.id === 'cash').done, 'касса сверена');

    tap(762, 504);              // терминал
    await sleep(250);
    ok(st.terminal && st.terminal.mode === 'shift', 'терминал в режиме закрытия: ' + (st.terminal && st.terminal.mode));
    tap(370, 528);              // Закрыть смену
    await sleep(900);
    ok(!!g.scene && !!g.scene.onTap, 'отчёт открыт: ' + (g.scene && g.scene.onTap ? 'да' : 'нет'));
    ok(PVZ.state.data.totals.days > 0, 'смен закрыто: ' + PVZ.state.data.totals.days);
    log.push('деньги=' + PVZ.state.data.money + ' рейтинг=' + PVZ.state.data.rating.toFixed(2));
    return { ok: PVZ.state.data.totals.days > 0, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
