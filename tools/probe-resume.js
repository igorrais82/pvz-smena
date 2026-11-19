/* Сохранение смены и продолжение из меню */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game, s = g.scene, st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 13 * 60; st.doorOpen = true;
    const ordersBefore = st.orders.length;
    const dayBefore = st.day;
    g.persist();
    const raw = JSON.parse(localStorage.getItem(PVZ.state.SAVE_KEY));
    ok(!!raw.shift && raw.shift.orders.length === ordersBefore, 'смена сохранена: ' + (raw.shift ? raw.shift.orders.length : 0));
    PVZ.state.data = null;
    PVZ.state.load();
    g.setScene(PVZ.scenes.menu());
    await sleep(500);
    tap(640, 401); // «Продолжить смену»
    await sleep(1400);
    ok(!!g.scene && g.scene.isShift, 'вернулись в смену');
    ok(g.scene && g.scene.debug.st.day === dayBefore, 'день восстановлен');
    ok(g.scene && g.scene.debug.st.orders.length === ordersBefore, 'заказы восстановлены: ' + (g.scene ? g.scene.debug.st.orders.length : '?'));
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
