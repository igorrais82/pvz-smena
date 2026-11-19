(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  s.onKey('Escape');
  await sleep(300);
  const inp = document.getElementById('pvz-name-input');
  if (inp) {
    inp.value = 'ПВЗ «Уютный»';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  PVZ.state.data.pvzColor = '#5b6fb0';
  PVZ.state.save();
  s.onTap(262, 574);
  await sleep(150);
  s.onTap(880, 610); // открыть ПВЗ
  await sleep(1100);
  const g = PVZ.game.scene;
  if (g && g.debug) {
    g.debug.st.phase = 'day';
    g.debug.st.shiftOpen = true;
    g.debug.st.clock = 13 * 60;
    g.debug.st.doorOpen = true;
    g.debug.st.lightsOn = true;
    g.debug.view('hall');
  }
  await sleep(600);
  return { name: PVZ.state.data.pvzName, color: PVZ.state.data.pvzColor, view: g && g.debug && g.debug.st.view };
})()
