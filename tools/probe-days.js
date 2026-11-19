/* Два дня подряд: отчёт → следующий день, перенос остатков склада */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    const s1 = g.scene;
    const st1 = s1.debug.st;
    st1.phase = 'day'; st1.shiftOpen = true;
    st1.stats.served = 5; st1.stats.revenue = 300; st1.stats.received = 6;
    const before = st1.orders.filter(o => o.state === 'stored').length;
    log.push('день 1: на складе ' + before + ' заказов, план ' + st1.plan);
    // имитируем выдачу нескольких заказов
    st1.orders.filter(o => o.state === 'stored').slice(0, 3).forEach(o => { o.state = 'issued'; });
    const leftovers = st1.orders.filter(o => o.state === 'stored').length;
    s1.debug.finish();
    await sleep(1200);
    ok(!!g.scene, 'отчёт открылся');
    tap(640, 622);          // Следующий день
    await sleep(1400);
    const s2 = g.scene;
    ok(s2 && s2.isShift, 'перешли на день 2');
    if (s2 && s2.isShift) {
      const st2 = s2.debug.st;
      ok(st2.day === 2, 'день = ' + st2.day);
      const carried = st2.orders.filter(o => o.state !== 'new');
      ok(carried.length === leftovers, 'перенесено остатков: ' + carried.length + ' (ожидалось ' + leftovers + ')');
      ok(st2.orders.filter(o => o.state === 'stored').every(o => !!o.cell), 'у перенесённых заказов есть ячейки');
      log.push('день 2: всего ' + st2.orders.length + ' заказов, план ' + st2.plan + ', фаза ' + st2.phase);
      ok(st2.phase === 'morning', 'день 2 начинается с утра');
    }
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
