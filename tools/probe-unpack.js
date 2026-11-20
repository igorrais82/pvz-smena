/* Сквозная проверка в браузере: вскрытие коробки и выдача товара */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const ok = (cond, text) => { log.push((cond ? 'OK  ' : 'FAIL') + ' ' + text); return cond; };
  const s = PVZ.game.scene;
  const st = s.debug.st;
  const L = PVZ.art.LAYOUT.counter;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true; st.lightsOn = true;
  st.customer = null; st.queue.length = 0; st.tut = null; st.view = 'counter';
  st.scannerHeld = true;
  s.debug.spawn('pickup');
  s.debug.step();
  const c = st.customer;
  if (c) {
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    c.moving = false; c.arrived = true; c.arrivedT = 1; c.codeScanned = true;
  }
  const o = st.orders.find((x) => c && x.id === c.orderIds[0]);
  ok(!!o, 'нашёлся заказ покупателя');
  st.held = {
    id: o.id, code: o.code, item: o.item, kind: o.kind,
    scanned: true, onTable: true, unpacked: false, placeT: 1
  };
  await sleep(350);

  PVZ.input.dispatch('tap', L.parcelOnTable.x + 48, L.parcelOnTable.y + 38);
  await sleep(1100);
  ok(st.unpack && st.unpack.phase === 'knifeIdle', 'коробка ждёт нож: ' + (st.unpack && st.unpack.phase));

  PVZ.input.dispatch('tap', 1000, 470);
  await sleep(300);
  ok(st.unpack && st.unpack.tool === 'knife', 'нож в руке');

  PVZ.input.down = true;
  PVZ.input.dispatch('down', 440, 318);
  for (let pass = 0; pass < 2; pass++) {
    for (let x = 440; x <= 860; x += 30) {
      PVZ.input.dispatch('move', x, 318);
      await sleep(12);
    }
    for (let x = 860; x >= 440; x -= 30) {
      PVZ.input.dispatch('move', x, 318);
      await sleep(12);
    }
  }
  await sleep(600);
  PVZ.input.down = false;
  PVZ.input.dispatch('up', 440, 318);
  await sleep(1200);
  ok(st.unpack && st.unpack.progress >= 1, 'скотч прорезан: ' + (st.unpack && st.unpack.progress));
  ok(st.unpack && st.unpack.phase === 'scissorsIdle', 'нужны ножницы: ' + (st.unpack && st.unpack.phase));

  PVZ.input.dispatch('tap', 270, 470);
  await sleep(300);
  ok(st.unpack && st.unpack.tool === 'scissors', 'ножницы в руке');
  for (let i = 0; i < 3; i++) {
    PVZ.input.dispatch('tap', 640, 300);
    await sleep(900);
  }
  await sleep(1200);
  ok(st.unpack && st.unpack.snips === 3, 'пакет разрезан');
  ok(st.unpack && st.unpack.phase === 'product', 'товар показан: ' + (st.unpack && st.unpack.phase));

  PVZ.input.dispatch('tap', 640, 308);
  await sleep(2600);
  ok(st.held && st.held.unpacked, 'товар достали');
  ok(!st.unpack, 'сцена вскрытия закрыта');

  PVZ.input.dispatch('tap', 620, 300);
  await sleep(500);
  ok(!!st.dlg, 'диалог выдачи открыт');
  if (st.dlg) {
    const r = st.dlg.choiceRects[0];
    PVZ.input.dispatch('tap', r.x + r.w / 2, r.y + r.h / 2);
    await sleep(700);
  }
  ok(st.stats.served >= 1, 'товар отдан, выдач: ' + st.stats.served);
  ok(!!st.handoff, 'анимация передачи запущена');
  return log;
})()
