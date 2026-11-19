(async () => {
  const s = PVZ.game.scene, st = s.debug.st;
  const t = (x, y) => PVZ.input.dispatch('tap', x, y);
  const out = [];
  st.dev.open = true;
  await new Promise(r => setTimeout(r, 100));
  const before = st.clock;
  t(1066, 190); await new Promise(r => setTimeout(r, 120));
  out.push('время ' + PVZ.util.fmtTime(before) + ' -> ' + PVZ.util.fmtTime(st.clock));
  const q0 = st.queue.length;
  t(1066, 466); await new Promise(r => setTimeout(r, 120));
  out.push('очередь ' + q0 + ' -> ' + st.queue.length);
  const m0 = PVZ.state.data.money;
  t(1066, 262); await new Promise(r => setTimeout(r, 120));
  out.push('деньги ' + m0 + ' -> ' + PVZ.state.data.money);
  t(1066, 630); await new Promise(r => setTimeout(r, 120));
  out.push('меню открыто после закрытия: ' + st.dev.open);
  return out;
})()
