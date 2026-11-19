/* Замер экономики: сколько реально зарабатывает пункт за день при честной игре */
(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.money = 0;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  const s = PVZ.scenes.shift({ day: 5, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  const st = s.debug.st;
  const L = PVZ.art.LAYOUT.counter.customer;
  const out = { served: 0, moneyPerCustomer: [], complaints: 0, time: 0 };
  const t0 = Date.now();

  for (let n = 0; n < 14; n++) {
    // страхуемся от пустой очереди
    if (!st.customer) {
      s.debug.spawn('pickup');
      await wait(60);
      s.debug.step();
    }
    const t1 = Date.now();
    const m0 = PVZ.state.data.money;
    let guard = 0;
    while (st.customer && guard++ < 30) {
      if (st.dlg) {
        const idx = st.dlg.choices.findIndex(c => /Выдать заказ|Выдать посылку/.test(c.label));
        const r = st.dlg.choiceRects[idx >= 0 ? idx : 0];
        PVZ.input.dispatch('tap', r.x + 40, r.y + 20);
        await wait(220);
      } else if (st.qte) {
        if (st.qte.type === 'timing' || st.qte.type === 'scan') { st.qte.pos = st.qte.zone; st.qte.onTap(0, 0); }
        else if (st.qte.type === 'swipe') { st.qte.count = st.qte.need; st.qte.finish(true); }
        else if (st.qte.type === 'cashier') {
          const i = st.qte.options.findIndex(o => o.ok);
          const cw = (st.qte.panel.w - 80) / 3;
          PVZ.input.dispatch('tap', st.qte.panel.x + 40 + i * cw + 60, st.qte.panel.y + 238);
        } else { st.qte = null; }
        await wait(220);
      } else if (st.terminal) {
        st.terminal = null;
        await wait(120);
      } else if (st.held) {
        PVZ.input.dispatch('tap', L.x + L.w / 2, L.y + L.h / 2);
        await wait(220);
      } else {
        PVZ.input.dispatch('tap', L.x + L.w / 2, L.y + L.h / 2);
        await wait(220);
      }
    }
    out.served++;
    out.moneyPerCustomer.push({
      money: Math.round(PVZ.state.data.money - m0),
      sec: Math.round((Date.now() - t1) / 100) / 10,
      clock: Math.round(st.clock)
    });
  }

  out.total = Math.round(PVZ.state.data.money);
  out.rating = +PVZ.state.data.rating.toFixed(2);
  out.complaints = st.stats.complaints;
  out.plan = st.plan;
  out.clock = Math.round(st.clock);
  out.realSec = Math.round((Date.now() - t0) / 100) / 10;
  out.mafia5 = PVZ.sys.mafiaDemand(5);
  out.mafia10 = PVZ.sys.mafiaDemand(10);
  return out;
})()
