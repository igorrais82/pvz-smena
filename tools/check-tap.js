/* Проверка клика по покупателю: открывается ли телефон/диалог.
   node tools/cdp.js "file:///.../game/index.html?dev=day&clean=1" shots/check-tap.png \
     --evalfile=tools/check-tap.js */
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await wait(100);
  }
  await wait(2500);
  const s = PVZ.game.scene;
  const st = s.debug.st;
  const c = st.customer;
  const L = PVZ.art.LAYOUT.counter.customer;
  const before = { customer: !!c, moving: c && c.moving, arrived: c && c.arrived, patience: c && c.patience };
  PVZ.input.dispatch('tap', L.x + L.w / 2, L.y + L.h / 2);
  await wait(500);
  return {
    before,
    after: {
      dlg: !!st.dlg,
      phone: !!st.phone,
      terminal: !!st.terminal,
      qte: !!st.qte,
      dlgText: st.dlg && st.dlg.text
    },
    err: PVZ.game.lastError || null
  };
})()
