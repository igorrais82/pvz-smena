/* Сквозной прогон: утро → приёмка → телефон с штрихкодом → сканер → QTE → выдача */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (cond, text) => { log.push((cond ? 'OK  ' : 'FAIL') + ' ' + text); return cond; };
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
    log.push('фаза=' + st.phase + ' заказов=' + st.orders.length + ' поставка=' + st.orders.filter(o => o.state === 'new').length);

    // --- утро ---
    s.debug.view('hall');
    await sleep(200);
    tap(PVZ.art.LAYOUT.hall.light.x + 10, PVZ.art.LAYOUT.hall.light.y + 10);
    await sleep(150);
    ok(st.lightsOn, 'свет включён');
    tap(600, 300);
    await sleep(150);
    ok(st.doorOpen, 'дверь открыта');

    s.debug.view('counter');
    await sleep(200);
    tap(762, 504);
    await sleep(200);
    ok(!!st.terminal && st.terminal.mode === 'shift', 'терминал: режим смены');
    tap(370, 528);
    await sleep(200);
    ok(st.shiftOpen, 'смена открыта');

    // --- приёмка ---
    s.debug.view('warehouse');
    await sleep(200);
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
    ok(st.stats.received > 0, 'принята поставка: ' + st.stats.received);

    // --- покупатель ---
    s.debug.view('counter');
    st.phase = 'day'; st.clock = 12 * 60; st.shiftOpen = true;
    s.debug.spawn('pickup');
    await sleep(120);
    s.debug.step();
    await sleep(220);
    const c = st.customer;
    ok(!!c && c.kind === 'pickup', 'покупатель у стойки');
    ok(!c.codeScanned, 'код ещё не считан');
    ok(st.orders.find(o => o.id === c.orderId), 'у покупателя есть заказ');

    // телефон
    tap(620, 300);
    await sleep(250);
    ok(!!st.phone, 'открылся телефон с фото штрихкода');
    ok(!st.scannerHeld, 'сканер пока на столе');
    tap(640, 440);            // «Сканировать» без сканера
    await sleep(200);
    ok(!st.qte && !!st.phone, 'без сканера QTE не запускается');
    tap(640, 546);            // закрыть телефон
    await sleep(200);
    ok(!st.phone, 'телефон закрыт');

    // берём сканер
    tap(616, 558);
    await sleep(200);
    ok(st.scannerHeld, 'сканер взят со стола');

    // снова телефон и скан
    tap(620, 300);
    await sleep(250);
    ok(!!st.phone, 'телефон открыт повторно');
    tap(640, 440);
    await sleep(250);
    ok(!!st.qte && st.qte.type === 'scan', 'запустилось QTE сканирования');
    if (st.qte) { st.qte.pos = st.qte.zone; st.qte.onTap(0, 0); }
    await sleep(300);
    ok(c.codeScanned, 'код покупателя считан');
    ok(!!st.terminal && st.terminal.mode === 'found', 'терминал показал карточку заказа');
    ok(!st.phone, 'телефон закрыт после скана');

    // ячейка из терминала
    const order = st.orders.find(o => o.id === c.orderId);
    tap(340, 528);            // «Взять на складе»
    await sleep(200);
    ok(!st.terminal && st.targetCell === order.cell, 'терминал выдал ячейку ' + order.cell);

    // склад
    s.debug.view('warehouse');
    st.rack = order.cell.charAt(0);
    s.debug.view('rack');
    await sleep(250);
    const cell2 = cellRects().find(r => r.id === order.cell);
    tap(cell2.x + cell2.w / 2, cell2.y + cell2.h / 2);
    await sleep(200);
    ok(!!st.held && st.held.code === order.code, 'посылка в руках');

    // скан посылки и выдача
    tap(616, 558);
    await sleep(200);
    ok(st.held && st.held.scanned, 'штрихкод посылки считан');
    tap(620, 300);
    await sleep(220);
    ok(!!st.dlg, 'диалог выдачи открыт');
    if (st.dlg) { const r = st.dlg.choiceRects[0]; tap(r.x + r.w / 2, r.y + r.h / 2); }
    await sleep(250);
    ok(order.state === 'issued' || order.state === 'fitting', 'заказ выдан: ' + order.state);
    log.push('выручка=' + st.stats.revenue + ' рейтинг=' + PVZ.state.data.rating.toFixed(2));
    return { ok: st.stats.served >= 1, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
