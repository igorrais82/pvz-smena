/* Стресс: 25 секунд жизни смены с постоянными событиями и покупателями */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = PVZ.game, s = g.scene, st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  PVZ.state.data.money = 8000;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 12 * 60; st.doorOpen = true; st.lightsOn = true;
  st.spawnT = 1;
  let events = 0, spawns = 0, served0 = st.stats.served;
  const t0 = Date.now();
  let lastEvent = 0, lastSpawn = 0;
  while (Date.now() - t0 < 25000) {
    await sleep(120);
    // закрываем модалки
    if (st.qte) { st.qte.finish(Math.random() < 0.6); }
    if (st.dlg) {
      const idx = Math.floor(Math.random() * st.dlg.choices.length);
      const r = st.dlg.choiceRects[idx];
      tap(r.x + r.w / 2, r.y + r.h / 2);
    }
    if (st.phone) { st.phone = null; }
    if (st.laptop) { st.laptop = null; }
    if (st.terminal) { st.terminal = null; }
    // события и покупатели
    if (Date.now() - lastEvent > 2500) { lastEvent = Date.now(); if (!st.qte && !st.dlg) { s.debug.event(); events++; } }
    if (Date.now() - lastSpawn > 3200) { lastSpawn = Date.now(); s.debug.spawn(); spawns++; }
    if (!st.customer && st.queue.length && !st.dlg) { st.nextT = 0; s.debug.step(); }
    // иногда выдаём посылку, чтобы рос счётчик
    if (st.customer && st.customer.arrived && !st.dlg && !st.qte && !st.phone && !st.terminal) {
      const c = st.customer;
      const o = st.orders.find(x => x.state === 'stored' && c.orderIds && c.orderIds.indexOf(x.id) >= 0);
      if (o) {
        st.held = { id: o.id, code: o.code, item: o.item, scanned: true };
        c.codeScanned = true;
        tap(620, 300);
      }
    }
  }
  const err = g.lastError || null;
  log.push('событий: ' + events + ', спавнов: ' + spawns + ', выдач: ' + (st.stats.served - served0));
  log.push('очередь=' + st.queue.length + ' у стойки=' + !!st.customer + ' уходящих=' + st.leavers.length +
    ' заказов=' + st.orders.length + ' жалоб=' + st.stats.complaints);
  log.push('деньги=' + PVZ.state.data.money + ' рейтинг=' + PVZ.state.data.rating.toFixed(2) + ' время=' + PVZ.util.fmtTime(st.clock));
  return { ok: !err, error: err, log };
})()
