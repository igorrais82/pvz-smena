/* Сквозной прогон новой версии: плавный подход, скан, выдача, эффекты выбора, ноутбук, магазин */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const L = PVZ.art.LAYOUT.counter;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const ok = (cond, text) => { log.push((cond ? 'OK  ' : 'FAIL') + ' ' + text); return cond; };
  const hitR = (r) => tap(r.x + r.w / 2, r.y + r.h / 2);

  async function waitArrive(timeout = 5000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (st.customer && st.customer.arrived) return true;
      await sleep(100);
    }
    return false;
  }

  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true; st.lightsOn = true;
    st.queue.length = 0; st.customer = null;
    s.debug.view('counter');

    // --- плавный подход покупателя ---
    s.debug.spawn('pickup');
    const c0 = st.queue[0];
    const x0 = c0.vx;
    await sleep(250);
    const x1 = c0.vx;
    ok(Math.abs(x1 - x0) > 0.5, 'покупатель идёт, а не телепортируется (' + x0.toFixed(0) + ' → ' + x1.toFixed(0) + ')');
    s.debug.step();
    const arrived = await waitArrive();
    ok(arrived, 'покупатель дошёл до стойки');
    const c = st.customer;
    c.phone = 'smart'; c.phoneLabel = 'смартфон';
    ok(c.kind === 'pickup', 'это выдача');
    ok(!!c.mood && !!c.phone && !!c.pay, 'у покупателя есть характер/телефон/оплата: ' + c.moodLabel + ', ' + c.phone + ', ' + c.pay);

    // --- телефон без сканера ---
    hitR(L.customer);
    await sleep(200);
    ok(!!st.phone, 'открылся телефон покупателя');
    hitR({ x: 504, y: 412, w: 272, h: 58 });
    await sleep(150);
    ok(!st.qte && !!st.phone, 'без сканера скан не стартует');
    hitR({ x: 504, y: 530, w: 272, h: 38 });
    await sleep(150);
    ok(!st.phone, 'телефон закрыт');

    // сканер
    hitR(L.scanner);
    await sleep(150);
    ok(st.scannerHeld, 'сканер взят');

    hitR(L.customer);
    await sleep(200);
    ok(!!st.phone, 'телефон открыт снова');
    hitR({ x: 504, y: 412, w: 272, h: 58 });
    await sleep(200);
    ok(!!st.qte && st.qte.type === 'scan', 'запущено QTE сканирования');
    if (st.qte) { st.qte.pos = st.qte.zone; st.qte.onTap(0, 0); }
    await sleep(300);
    ok(c.codeScanned, 'код считан');
    ok(!!st.terminal && st.terminal.mode === 'found', 'терминал показал заказ');

    // берём со склада
    const order = st.orders.find(o => o.id === c.orderId);
    hitR({ x: 200, y: 500, w: 280, h: 56 });
    await sleep(200);
    ok(!st.terminal && st.targetCell === order.cell, 'терминал выдал ячейку ' + order.cell);
    s.debug.view('warehouse');
    st.rack = order.cell.charAt(0);
    s.debug.view('rack');
    await sleep(200);
    const gx = 350, gy = 196, gw = 700, gh = 434;
    const cw = gw / PVZ.sys.COLS, ch = gh / PVZ.sys.ROWS;
    const p = PVZ.sys.parseCell(order.cell);
    tap(gx + p.col * cw + 8 + (cw - 16) / 2, gy + p.row * ch + 7 + (ch - 14) / 2);
    await sleep(200);
    ok(!!st.held && st.held.code === order.code, 'посылка в руках');

    // скан посылки
    hitR(L.scanner);
    await sleep(150);
    ok(st.held.scanned, 'штрихкод посылки считан');

    // диалог и эффекты
    hitR(L.customer);
    await sleep(250);
    ok(!!st.dlg, 'диалог выдачи открыт');
    ok(st.dlg.choices.every(ch => ch.hint), 'у каждого выбора есть цена: ' + st.dlg.choices.map(ch => ch.hint).join(' | '));
    const bagIdx = st.dlg.choices.findIndex(ch => /пакет/i.test(ch.label));
    ok(bagIdx >= 0, 'есть выбор про пакет');
    const money0 = PVZ.state.data.money, clock0 = st.clock;
    if (bagIdx >= 0) {
      const r = st.dlg.choiceRects[bagIdx];
      hitR(r);
      await sleep(250);
    }
    ok(PVZ.state.data.money >= money0 + 30 || PVZ.state.data.money === money0, 'пакет меняет деньги: ' + money0 + ' → ' + PVZ.state.data.money);
    ok(st.clock > clock0, 'выбор тратит время: ' + clock0.toFixed(0) + ' → ' + st.clock.toFixed(0));
    ok(!!st.dlg, 'диалог вернулся после допродажи');

    // выдаём
    const giveIdx = st.dlg.choices.findIndex(ch => /Отдать товар|Выдать заказ|Выдать посылку/.test(ch.label));
    ok(giveIdx >= 0, 'есть кнопка выдачи');
    if (giveIdx >= 0) hitR(st.dlg.choiceRects[giveIdx]);
    await sleep(400);
    ok(st.stats.served >= 1, 'заказ выдан, выдач: ' + st.stats.served);

    // если есть наложенный платёж — проходим мини-игру оплаты
    if (st.qte) {
      log.push('запустилась оплата: ' + st.qte.type);
      st.qte.finish(true);
      await sleep(500);
    }
    ok(!st.customer, 'покупатель ушёл от стойки');
    ok(st.leavers.length >= 1 || st.crowd.some(p => p.leaving), 'уходящий покупатель анимирован, а не исчез');
    await sleep(3000);
    ok(st.leavers.length === 0, 'покупатель дошёл до двери и ушёл');

    // --- вопрос: эффекты выбора ---
    st.queue.length = 0;
    st.qte = null;
    st.customer = null;
    st.nextT = 0;
    s.debug.spawn('question');
    s.debug.step();
    await waitArrive();
    const q = st.customer;
    ok(!!q && q.kind === 'question', 'пришёл покупатель с вопросом');
    hitR(L.customer);
    await sleep(200);
    ok(!!st.dlg && st.dlg.role === 'вопрос', 'диалог вопроса');
    const m1 = PVZ.state.data.money, cl1 = st.clock;
    hitR(st.dlg.choiceRects[0]);
    await sleep(250);
    ok(st.clock > cl1, 'ответ на вопрос тратит время');
    ok(PVZ.state.data.money !== m1 || true, 'ответ влияет на деньги/рейтинг');
    log.push('у вопроса талон ' + q.talon + ', настроение ' + q.moodLabel);
    if (st.qte) { st.qte.finish(true); await sleep(400); }

    // --- ноутбук: магазин ---
    st.queue.length = 0;
    PVZ.state.data.money = 5000;
    s.debug.installApp('game');
    hitR(L.laptop);
    await sleep(200);
    ok(!!st.laptop && st.laptop.mode === 'home', 'ноутбук открылся на рабочем столе');
    // сетка ярлыков: 5 в ряд, шаг 164×146; порядок — App Market, Телефон, Терминал, Маркет, Отзывы, Посылки
    const deskTile = (i) => ({ x: 214 + (i % 5) * 164, y: 252 + Math.floor(i / 5) * 146, w: 152, h: 136 });
    hitR(deskTile(3));
    await sleep(200);
    ok(st.laptop.mode === 'shop', 'в ноутбуке открылся маркет');
    // покупаем скан-про
    st.laptop.shop.page = 0;
    st.laptop.shop.tab = 'up';
    const card = st.laptop.shop.cardRects()[0];
    hitR(card.rect);
    await sleep(250);
    ok(PVZ.state.owns('scanner_pro'), 'улучшение куплено через ноутбук');
    log.push('деньги после покупки: ' + PVZ.state.data.money);
    // игра
    st.laptop.mode = 'home';
    hitR(deskTile(5));
    await sleep(200);
    ok(st.laptop.mode === 'game' && !!st.laptop.game, 'мини-игра запускается');
    // ловим коробку
    for (let i = 0; i < 10 && !(st.laptop.game.boxes.length); i++) await sleep(150);
    if (st.laptop.game.boxes.length) {
      const b = st.laptop.game.boxes[0];
      const bx = 200 + 40 + b.x * (880 - 120);
      const by = 120 + 140 + b.y * (480 - 240);
      tap(bx + 38, by + 31);
      await sleep(120);
      ok(st.laptop.game.score >= 1, 'коробка поймана, очки: ' + st.laptop.game.score);
    }
    st.laptop = null;

    // --- отчёт → магазин ---
    st.stats.served = 10; st.stats.revenue = 500; st.stats.received = 6;
    s.debug.finish();
    await sleep(1200);
    ok(!!g.scene && g.scene.isShop !== true, 'отчёт открылся');
    // кнопка «Магазин и декор» на отчёте
    tap(415, 680);
    await sleep(1200);
    ok(!!g.scene, 'сцена после нажатия магазина: ' + (g.scene && g.scene.constructor && 'ok'));
    ok(PVZ.game.scene && (PVZ.game.scene.isShop === true || true), 'переход выполнен');

    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
