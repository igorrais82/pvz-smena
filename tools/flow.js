/* Сквозной тест: покупатель -> склад -> стеллаж -> скан -> выдача */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const center = (r) => [r.x + r.w / 2, r.y + r.h / 2];

  try {
    const cust = st.customer;
    if (!cust) return { ok: false, reason: 'нет покупателя у стойки' };
    log.push('покупатель: ' + cust.name + ' / ' + cust.kind + ' / код ' + (cust.code || '-'));

    // 1. поговорить
    tap(620, 300);
    await sleep(150);
    log.push('после разговора, bubble=' + JSON.stringify(cust.bubble));

    if (cust.kind !== 'pickup') {
      // диалог: выбираем первый вариант
      const rects = st.dlg ? st.dlg.choiceRects : [];
      if (!rects.length) return { ok: false, reason: 'диалог не открылся', log };
      const [cx, cy] = center(rects[0]);
      tap(cx, cy);
      await sleep(200);
      return { ok: true, kind: cust.kind, served: st.stats.served, log };
    }

    // 2. на склад
    const par = st.parcels.find(p => p.code === cust.code && !p.taken);
    if (!par) return { ok: false, reason: 'посылка не найдена', log };
    st.rack = par.rack;
    s.debug.view('rack');
    await sleep(120);
    const slot = PVZ.art.rackSlots(6)[par.slot];
    if (!slot) return { ok: false, reason: 'нет слота ' + par.slot, log };
    const [sx, sy] = center(slot);
    tap(sx, sy);
    await sleep(200);
    log.push('взят заказ: ' + JSON.stringify(st.held && st.held.code) + ', view=' + st.view);

    // 3. скан
    let tries = 0;
    while (st.held && !st.held.scanned && tries < 6) {
      tap(616, 558);
      await sleep(150);
      if (st.qte) {
        if (st.qte.type === 'timing') st.qte.pos = st.qte.zone;
        tap(640, 360);
        await sleep(220);
      }
      tries++;
    }
    log.push('сканирование: ' + (st.held && st.held.scanned) + ' (попыток ' + tries + ')');

    // 4. выдача
    tap(620, 300);
    await sleep(300);
    log.push('обслужено: ' + st.stats.served + ', жалоб: ' + st.stats.complaints + ', денег: ' + PVZ.state.data.money);
    log.push('у стойки: ' + (st.customer ? st.customer.name : 'никого'));

    return { ok: st.stats.served > 0, served: st.stats.served, money: PVZ.state.data.money, rating: PVZ.state.data.rating.toFixed(2), log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
