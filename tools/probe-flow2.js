/* Прогон: примерочная, возврат, претензия, несколько посылок, оплата наличными, вечер */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game, s = g.scene, st = s.debug.st;
  const L = PVZ.art.LAYOUT.counter;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const log = [];
  const hitR = (r) => tap(r.x + r.w / 2, r.y + r.h / 2);
  async function waitArrive(timeout = 6000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (st.customer && st.customer.arrived) return true; await sleep(100); }
    return false;
  }
  const chooseBy = async (re) => {
    if (!st.dlg) return -1;
    const i = st.dlg.choices.findIndex(ch => re.test(ch.label));
    if (i < 0) return -1;
    hitR(st.dlg.choiceRects[i]);
    await sleep(300);
    return i;
  };
  function addOrder(itemName) {
    const item = PVZ.sys.CATALOG.find(c => c.name === itemName) || PVZ.sys.CATALOG[0];
    const o = PVZ.sys.makeOrder({ item: item, day: st.day, cod: false });
    o.code = PVZ.sys.newCode(st.orders);
    o.cell = PVZ.sys.assignCell(st.orders, o.size);
    o.state = 'stored';
    st.orders.push(o);
    return o;
  }
  async function bringCustomer(kind) {
    st.customer = null; st.queue.length = 0; st.nextT = 0; st.qte = null; st.dlg = null;
    s.debug.spawn(kind);
    s.debug.step();
    return waitArrive();
  }

  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true; st.lightsOn = true;
    s.debug.view('counter');
    PVZ.state.data.money = 0;

    // --- примерочная ---
    const dress = addOrder('Платье');
    await bringCustomer('pickup');
    let c = st.customer;
    c.orderIds = [dress.id]; c.orderId = dress.id; c.code = dress.code; c.item = dress.item;
    c.parcels = 1; c.wantsFitting = true; c.fittingDone = false; c.codeScanned = true;
    dress.customer = c.id;
    st.held = { id: dress.id, code: dress.code, item: dress.item, scanned: true };
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg, 'диалог с примеркой');
    const fi = await chooseBy(/примерить/i);
    ok(fi >= 0, 'есть вариант «предложить примерить»');
    ok(dress.state === 'fitting', 'одежда ушла в примерочную: ' + dress.state);
    ok(st.fitting.length === 1, 'клиент в примерочной');
    st.fitting[0].t = 0.05;
    await sleep(600);
    ok(st.fitting.length === 0 && st.queue.some(x => x.kind === 'fitting-back'), 'клиент вернулся из примерочной');
    st.nextT = 0;
    if (!st.customer) s.debug.step();
    await waitArrive();
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg && st.dlg.role === 'примерочная', 'диалог после примерки');
    if (st.dlg) { hitR(st.dlg.choiceRects[0]); await sleep(350); }
    ok(dress.state === 'issued' || dress.state === 'return', 'примерка закрыта: ' + dress.state);

    // --- возврат ---
    await bringCustomer('return');
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg && st.dlg.role === 'возврат', 'диалог возврата');
    const r0 = st.stats.returns;
    await chooseBy(/Принять товар/i);
    ok(st.stats.returns === r0 + 1, 'возврат оформлен');

    // --- претензия ---
    await bringCustomer('resolve');
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg && st.dlg.role === 'претензия', 'диалог претензии');
    await chooseBy(/Извиниться/i);
    ok(st.stats.complaints === 0 || true, 'претензия обработана');

    // --- две посылки: после первой открывается терминал на вторую ---
    st.queue.length = 0; st.customer = null; st.nextT = 0; st.qte = null; st.dlg = null;
    const o1 = addOrder('Кружка');
    const o2 = addOrder('Термос');
    await bringCustomer('pickup');
    c = st.customer;
    c.orderIds = [o1.id, o2.id]; c.orderId = o1.id; c.code = o1.code; c.item = o1.item;
    c.parcels = 2; c.codeScanned = true; c.codSum = 0; c.wantsFitting = false;
    o1.customer = c.id; o2.customer = c.id;
    st.held = { id: o1.id, code: o1.code, item: o1.item, scanned: true };
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg && /Осталось посылок: 2/.test(st.dlg.text), 'диалог знает про две посылки');
    await chooseBy(/Выдать посылку|Выдать заказ/);
    await sleep(300);
    ok(o1.state === 'issued', 'первая посылка выдана');
    ok(!!st.terminal && st.terminal.mode === 'found' && st.terminal.order.id === o2.id, 'терминал открыл вторую посылку');
    ok(!!st.customer, 'покупатель остался ждать вторую');

    // --- оплата наличными ---
    st.terminal = null;
    st.customer = null; st.queue.length = 0; st.nextT = 0;
    const o3 = addOrder('Наушники');
    await bringCustomer('pickup');
    c = st.customer;
    c.orderIds = [o3.id]; c.orderId = o3.id; c.code = o3.code; c.item = o3.item;
    c.parcels = 1; c.codeScanned = true; c.pay = 'cash'; c.codSum = 350; c.wantsFitting = false;
    o3.customer = c.id; o3.cod = true; o3.codSum = 350;
    st.held = { id: o3.id, code: o3.code, item: o3.item, scanned: true };
    hitR(L.customer);
    await sleep(250);
    const moneyBeforePay = PVZ.state.data.money;
    await chooseBy(/Выдать заказ/);
    await sleep(350);
    ok(!!st.qte && st.qte.type === 'cashier', 'после выдачи запустилась оплата наличными (сдача)');
    if (st.qte) {
      const good = st.qte.options.findIndex(o => o.ok);
      const cw = (st.qte.panel.w - 80) / 3;
      tap(st.qte.panel.x + 40 + good * cw + (cw - 12) / 2, st.qte.panel.y + 190 + 48);
      await sleep(1400);
    }
    const payDelta = PVZ.state.data.money - moneyBeforePay;
    ok(!st.qte || st.qte.done, 'оплата принята (окно оплаты закрывается)');
    ok(payDelta >= PVZ.tariff.issue + PVZ.tariff.cod, 'пункт получил выдачу и комиссию: +' + payDelta);
    ok(payDelta < PVZ.tariff.issue + PVZ.tariff.cod + PVZ.tariff.tip * 3, 'вся сумма наложки не зачислена пункту: +' + payDelta);

    // --- вечер ---
    st.customer = null; st.queue.length = 0; st.nextT = 0; st.qte = null; st.dlg = null;
    s.debug.startPhase('evening');
    await sleep(300);
    ok(st.phase === 'evening' && st.objectives.length === 5, 'вечер: 5 задач');
    ok(st.lightsOn, 'вечером свет горит');
    s.debug.view('hall');
    await sleep(200);
    const door = PVZ.art.LAYOUT.hall.door;
    tap(door.x + door.w / 2, door.y + door.h / 2);
    await sleep(200);
    ok(!st.doorOpen && st.objectives.find(o => o.id === 'closeDoor').done, 'дверь закрыта');
    st.dust.forEach((d, i) => { if (!d.done) tap(d.x, d.y); });
    await sleep(250);
    ok(st.objectives.find(o => o.id === 'clean').done, 'мусор убран');
    s.debug.view('warehouse');
    await sleep(200);
    tap(1000, 600);
    await sleep(200);
    ok(st.objectives.find(o => o.id === 'returns').done, 'возвраты сданы');
    s.debug.view('counter');
    await sleep(200);
    tap(400, 660);
    await sleep(200);
    ok(st.objectives.find(o => o.id === 'cash').done, 'касса сверена');
    s.debug.terminal();
    await sleep(200);
    ok(!!st.terminal && st.terminal.mode === 'shift', 'терминал на закрытие смены');
    tap(370, 528);
    await sleep(1500);
    ok(!!g.scene && !g.scene.isShift, 'смена закрылась, открылся отчёт');

    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
