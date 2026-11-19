/* Тест диалогов и QTE: ?dev=question|return|complaint */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const center = (r) => [r.x + r.w / 2, r.y + r.h / 2];
  const dev = new URLSearchParams(location.search).get('dev');

  try {
    const cust = st.customer;
    if (!cust) return { ok: false, reason: 'нет покупателя' };
    log.push('покупатель ' + cust.name + ' / ' + cust.kind + ' / «' + cust.request.promise + '»');

    tap(620, 300);
    await sleep(200);

    if (st.qte) {
      log.push('QTE: ' + st.qte.type);
      for (let i = 0; i < 20 && st.qte; i++) {
        tap(640, 360);
        await sleep(40);
      }
      await sleep(300);
      log.push('после QTE: qte=' + (st.qte ? 'ещё идёт' : 'закрыт') + ', обслужено=' + st.stats.served + ', жалоб=' + st.stats.complaints);
      return { ok: !st.qte, served: st.stats.served, complaints: st.stats.complaints, log };
    }

    if (!st.dlg) return { ok: false, reason: 'ни диалога, ни QTE', log };
    log.push('вариантов: ' + st.dlg.choices.length);

    let idx = 0;
    if (dev === 'question' && cust.request.opts) {
      idx = cust.request.opts.findIndex(o => o.ok);
      if (idx < 0) idx = 0;
    }
    log.push('выбираем вариант ' + (idx + 1) + ': ' + st.dlg.choices[idx].label);
    const [cx, cy] = center(st.dlg.choiceRects[idx]);
    tap(cx, cy);
    await sleep(400);

    return {
      ok: true,
      served: st.stats.served,
      complaints: st.stats.complaints,
      money: PVZ.state.data.money,
      rating: PVZ.state.data.rating.toFixed(2),
      dialogClosed: !st.dlg,
      log
    };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
