/* Проверка логики мини-игр: сдача, сортировка, пересчёт, свайп, rapid */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true;
  try {
    // cashier
    let q = new PVZ.sys.QTE({ type: 'cashier', title: 'x' });
    st.qte = q;
    await sleep(120);
    const cw = (q.panel.w - 80) / 3;
    const good = q.options.findIndex(o => o.ok);
    tap(q.panel.x + 40 + good * cw + (cw - 12) / 2, q.panel.y + 190 + 48);
    await sleep(120);
    ok(q.done && q.success, 'сдача: верный набор засчитан');
    st.qte = null;

    // sort
    q = new PVZ.sys.QTE({ type: 'sort', title: 'x' });
    st.qte = q;
    await sleep(100);
    const bw = (q.panel.w - 80) / 3;
    for (let i = 0; i < q.rounds.length; i++) {
      const rack = q.rounds[q.round].rack;
      const idx = PVZ.sys.RACKS.indexOf(rack);
      tap(q.panel.x + 40 + idx * bw + (bw - 14) / 2, q.panel.y + q.panel.h - 96 + 33);
      await sleep(80);
    }
    ok(q.done && q.success, 'сортировка: 4 раунда пройдены');
    st.qte = null;

    // count
    q = new PVZ.sys.QTE({ type: 'count', code: '4821', title: 'x' });
    st.qte = q;
    await sleep(100);
    q.boxes.filter(b => b.correct).forEach(b => {
      const bx = q.panel.x + b.x * q.panel.w + b.w * q.panel.w / 2;
      const by = q.panel.y + 68 + b.y * (q.panel.h - 110) + b.h * q.panel.h / 2;
      tap(bx, by);
    });
    await sleep(120);
    ok(q.done && q.success, 'пересчёт: все нужные посылки найдены');
    st.qte = null;

    // swipe
    q = new PVZ.sys.QTE({ type: 'swipe', dir: 'right', title: 'x' });
    st.qte = q;
    await sleep(80);
    q.onSwipe('right'); q.onSwipe('right'); q.onSwipe('right');
    await sleep(80);
    ok(q.done && q.success, 'оплата картой: три свайпа');
    st.qte = null;

    // rapid
    q = new PVZ.sys.QTE({ type: 'rapid', title: 'x' });
    st.qte = q;
    for (let i = 0; i < q.need; i++) q.onTap(0, 0);
    await sleep(80);
    ok(q.done && q.success, 'быстрые тапы: порог достигнут');
    st.qte = null;

    // phone scan timing
    q = new PVZ.sys.QTE({ type: 'scan', code: '1234', title: 'x' });
    st.qte = q;
    q.pos = q.zone;
    q.onTap(0, 0);
    await sleep(80);
    ok(q.done && q.success, 'сканирование: попадание в зону');
    st.qte = null;

    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
