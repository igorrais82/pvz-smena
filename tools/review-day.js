/* Один "честный" день: обслуживаем клиентов по правилам (сканер-код уже считан),
   затем закрываем смену и смотрим, что осталось после мафии. */
(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const L = PVZ.art.LAYOUT.counter.customer;
  const hitC = () => tap(L.x + L.w / 2, L.y + L.h / 2);

  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.money = 0;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 5, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;

  const out = { served: 0, money: [], details: [], payments: {}, errors: [] };
  const t0 = Date.now();

  for (let n = 0; n < 16; n++) {
    if (!st.customer) {
      st.queue.length = 0;
      st.nextT = 0;
      s.debug.spawn('pickup');
      await wait(80);
      s.debug.step();
      await wait(200);
    }
    if (!st.customer) { out.errors.push('нет клиента на шаге ' + n); break; }
    const c = st.customer;
    const m0 = PVZ.state.data.money;
    // код считан, посылка на руках — как после сканера и похода на склад
    const order = st.orders.find(o => o.id === (c.orderIds && c.orderIds[0]));
    if (!order) { out.errors.push('нет заказа у клиента ' + n); break; }
    c.codeScanned = true;
    st.held = { id: order.id, code: order.code, item: order.item, kind: order.kind, scanned: true, onTable: true, unpacked: true, placeT: 1 };

    let guard = 0;
    while (st.customer && guard++ < 25) {
      if (st.dlg) {
        const idx = st.dlg.choices.findIndex(ch => /Отдать товар|Выдать заказ|Выдать посылку/.test(ch.label));
        const r = st.dlg.choiceRects[idx >= 0 ? idx : 0];
        tap(r.x + 45, r.y + 22);
        await wait(260);
      } else if (st.qte) {
        const q = st.qte;
        if (q.type === 'timing' || q.type === 'scan') { q.pos = q.zone; q.onTap(0, 0); }
        else if (q.type === 'swipe') { q.count = q.need; q.finish(true); }
        else if (q.type === 'cashier') {
          const i = q.options.findIndex(o => o.ok);
          const cw = (q.panel.w - 80) / 3;
          tap(q.panel.x + 40 + i * cw + 60, q.panel.y + 238);
        } else if (q.type === 'hold') { q.progress = q.need; q.finish(true); }
        else { q.finish(true); }
        out.payments[q.type] = (out.payments[q.type] || 0) + 1;
        await wait(900);
      } else if (st.terminal) {
        st.terminal = null;
        await wait(150);
      } else if (st.held) {
        hitC();
        await wait(260);
      } else {
        hitC();
        await wait(260);
      }
    }
    out.served++;
    out.money.push(Math.round(PVZ.state.data.money - m0));
    out.details.push({
      mood: c.moodLabel,
      parcels: c.parcels || 1,
      cod: c.codSum || 0,
      paid: Math.round(PVZ.state.data.money - m0)
    });
  }

  out.revenue = st.stats.revenue;
  out.servedStat = st.stats.served;
  out.plan = st.plan;
  out.ratingBeforeClose = +PVZ.state.data.rating.toFixed(2);
  out.moneyBeforeMafia = PVZ.state.data.money;
  out.clock = Math.round(st.clock);
  out.realSec = Math.round((Date.now() - t0) / 100) / 10;

  // закрываем смену
  s.debug.finish();
  await wait(1200);
  out.afterClose = {
    money: PVZ.state.data.money,
    debt: PVZ.state.data.debt,
    taken: (PVZ.state.data.mafiaTaken || []).map(x => x.id),
    scene: PVZ.game.scene && PVZ.game.scene.isMafia ? 'mafia' : 'other',
    lastError: PVZ.game.lastError || null
  };
  return out;
})()
