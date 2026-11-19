/* Отчёт → магазин → следующий день; меню → магазин → назад */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    const s1 = g.scene, st = s1.debug.st;
    const day1 = st.day;
    st.phase = 'day'; st.shiftOpen = true; st.stats.served = 10; st.stats.revenue = 600;
    PVZ.state.data.money = 1000;
    s1.debug.finish();
    await sleep(1400);
    ok(!!(g.scene && !g.scene.isShift), 'отчёт открыт');
    tap(640, 625);
    await sleep(1400);
    ok(!!g.scene && !!g.scene.shopUI, 'магазин открыт из отчёта');
    tap(930, 669);
    await sleep(1600);
    ok(!!g.scene && g.scene.isShift, 'следующий день начался');
    ok(g.scene && g.scene.debug.st.day === day1 + 1, 'день ' + (g.scene ? g.scene.debug.st.day : '?') + ' (ожидался ' + (day1 + 1) + ')');
    ok(g.scene && g.scene.debug.st.phase === 'morning', 'фаза утро');

    // меню → магазин → назад
    g.scene.debug.st.phase = 'morning';
    PVZ.game.goto(PVZ.scenes.menu());
    await sleep(1200);
    const menu = g.scene;
    ok(!!menu && menu.isMenu, 'меню открыто');
    tap(640, 461); // кнопка «Магазин и декор» (есть, т.к. totals.days>0)
    await sleep(1200);
    ok(!!g.scene && g.scene.shopUI, 'магазин из меню');
    tap(305, 669);
    await sleep(1200);
    ok(!!g.scene && g.scene.isMenu, 'назад в меню');
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
