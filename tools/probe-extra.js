/* Прогон: примерочная, возврат, вопрос, сохранение/продолжение */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const choose = async (i) => {
    if (!st.dlg) return false;
    const r = st.dlg.choiceRects[i];
    tap(r.x + r.w / 2, r.y + r.h / 2);
    await sleep(160);
    return true;
  };
  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true;
    st.customer = null; st.queue.length = 0;

    // --- готовим заказ-одежду и покупателя ---
    const clothes = PVZ.sys.CATALOG.find(c => c.kind === 'clothes');
    const order = PVZ.sys.makeOrder({ item: clothes, day: st.day });
    order.code = PVZ.sys.newCode(st.orders);
    order.cell = PVZ.sys.assignCell(st.orders, order.size);
    order.state = 'stored';
    st.orders.push(order);

    s.debug.spawn('pickup');
    const c = st.queue[0];
    c.orderId = order.id; c.code = order.code; c.item = order.item; c.wantsFitting = true;
    order.customer = c.id;
    await sleep(120);
    s.debug.step();
    await sleep(150);
    ok(st.customer === c, 'покупатель у стойки');

    // кладём посылку в руки (как после скана)
    st.held = { id: order.id, code: order.code, item: order.item, scanned: true };
    tap(620, 300);
    await sleep(150);
    ok(!!st.dlg, 'диалог выдачи открыт');
    await choose(1);          // «Сначала предложить примерить»
    await sleep(200);
    ok(order.state === 'fitting', 'заказ ушёл в примерочную: ' + order.state);
    ok(st.fitting.length === 1, 'клиент в примерочной');
    ok(!st.customer, 'стойка свободна');

    // ускоряем примерку
    st.fitting[0].t = 0.001;
    await sleep(350);
    ok(st.fitting.length === 0, 'примерка завершена');
    ok(st.queue.length >= 1 && st.queue[0].kind === 'fitting-back', 'клиент вернулся из примерочной');
    await sleep(220);
    if (!st.customer && st.queue.length) { s.debug.step(); await sleep(150); }
    ok(!!st.customer, 'вернувшийся клиент у стойки');
    tap(620, 300);
    await sleep(180);
    ok(!!st.dlg, 'диалог после примерки');
    await choose(0);
    await sleep(200);
    ok(order.state === 'issued' || order.state === 'return', 'примерка закрыта: ' + order.state);

    // --- возврат ---
    st.customer = null; st.queue.length = 0;
    s.debug.spawn('return');
    await sleep(100);
    s.debug.step();
    await sleep(150);
    ok(st.customer && st.customer.kind === 'return', 'пришёл клиент на возврат');
    const before = st.stats.returns;
    tap(620, 300);
    await sleep(150);
    await choose(0);          // принять возврат
    await sleep(200);
    ok(st.stats.returns === before + 1, 'возврат оформлен');

    // --- вопрос ---
    st.customer = null; st.queue.length = 0;
    s.debug.spawn('question');
    await sleep(100);
    s.debug.step();
    await sleep(150);
    ok(st.customer && st.customer.kind === 'question', 'пришёл клиент с вопросом');
    tap(620, 300);
    await sleep(150);
    ok(!!st.dlg, 'диалог вопроса открыт');
    // ищем правильный ответ
    let correct = 0;
    if (st.dlg) {
      for (let i = 0; i < st.dlg.choices.length; i++) {
        if (/код получения|15 дней|14 дней|Слева от входа|Оформим возврат|Оформим/.test(st.dlg.choices[i].label)) { correct = i; break; }
      }
    }
    await choose(correct);
    await sleep(180);
    ok(!st.customer || st.customer.kind !== 'question', 'вопрос обработан');

    // --- сохранение и продолжение ---
    const dayBefore = st.day;
    g.persist();
    const saved = JSON.parse(localStorage.getItem('pvz_smena_save_v2') || '{}');
    ok(!!saved.shift && saved.shift.orders.length > 0, 'смена сохранена (заказов ' + (saved.shift ? saved.shift.orders.length : 0) + ')');
    const menu = PVZ.scenes.menu();
    menu.enter();
    g.setScene(menu);
    await sleep(200);
    // нажимаем «Продолжить смену»
    tap(640, 431);
    await sleep(1200);
    ok(g.scene && g.scene.isShift, 'вернулись в смену после «Продолжить»');
    ok(g.scene.isShift && g.scene.debug.st.orders.length > 0, 'заказы восстановлены: ' + (g.scene.isShift ? g.scene.debug.st.orders.length : 0));
    ok(g.scene.isShift && g.scene.debug.st.day === dayBefore, 'день сохранился');

    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
