(async () => {
  const s = PVZ.game.scene, st = s.debug.st;
  st.clock = 1138;
  const out = [];
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 200));
    out.push([PVZ.util.fmtTime(st.clock), st.phase, 'dlg=' + !!st.dlg, 'qte=' + !!st.qte, 'cust=' + !!st.customer]);
  }
  return out;
})()
