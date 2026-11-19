/* Стресс: долгий прогон смены с автоматическим закрытием диалогов/мини-игр и отрисовкой всех видов */
(async () => {
  const log = [];
  const s = PVZ.game.scene;
  const st = s.debug.st;
  const ctx = PVZ.game.ctx;
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const views = ['counter', 'hall', 'warehouse', 'rack'];
  let errors = 0, frames = 0;

  function resolveOverlays() {
    if (st.qte) {
      const q = st.qte;
      if (q.type === 'timing') { q.pos = q.zone; q.onTap(0, 0); }
      else if (q.type === 'wipe') { q.spots.forEach(sp => done(sp)); q.update(0.016); }
      else { for (let i = 0; i < 20; i++) q.onTap(0, 0); }
      return true;
    }
    function done(sp) { sp.done = true; }
    if (st.terminal) { s.closeTerminal(); return true; }
    if (st.dlg) {
      const r = st.dlg.choiceRects[0];
      s.onTap(r.x + r.w / 2, r.y + r.h / 2);
      return true;
    }
    return false;
  }

  try {
    st.phase = 'day'; st.shiftOpen = true; st.clock = 10 * 60; st.doorOpen = true;
    for (let i = 0; i < 5200; i++) {
      if (!st.customer && st.queue.length === 0 && i % 18 === 0) s.debug.spawn();
      if (st.customer && st.customer.orderId && !st.held && i % 24 === 0) {
        const o = st.orders.find(x => x.id === st.customer.orderId);
        if (o) st.held = { id: o.id, code: o.code, item: o.item, scanned: true };
      }
      if (st.customer && st.held && i % 24 === 8) s.onTap(620, 300);
      if (!resolveOverlays() && i % 7 === 0) {
        st.view = views[((i / 7) | 0) % views.length];
        if (st.view === 'rack') st.rack = PVZ.sys.RACKS[((i / 11) | 0) % 3];
      }
      try { s.update(0.05); } catch (e) { errors++; log.push('UPDATE ERROR: ' + e.message); break; }
      if (i % 13 === 0) {
        try { s.draw(ctx); frames++; } catch (e) { errors++; log.push('DRAW ERROR: ' + e.message); break; }
      }
    }
    ok(errors === 0, 'без ошибок за прогон (кадров ' + frames + ')');
    log.push('время=' + PVZ.util.fmtTime(st.clock) + ' фаза=' + st.phase);
    log.push('обслужено=' + st.stats.served + ' жалоб=' + st.stats.complaints + ' возвратов=' + st.stats.returns +
      ' выручка=' + st.stats.revenue + ' очередь=' + st.queue.length + ' примерочная=' + st.fitting.length);
    ok(st.stats.served > 0, 'покупатели обслуживались');
    ok(!st.orders.some(o => o.state === 'stored' && !o.cell), 'у всех заказов на складе есть ячейка');
    ok(st.orders.filter(o => o.cell).length <= PVZ.sys.CELL_TOTAL, 'ячейки не переполнены');
    ok(st.clock <= 20 * 60, 'день не вылез за 20:00');
    return { ok: errors === 0, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
