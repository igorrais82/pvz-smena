(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const out = [];
  // меню → новая игра
  tap(640, 400);
  await sleep(1400);
  out.push('after menu: ' + (PVZ.game.scene && PVZ.game.scene.constructor ? 'scene' : 'none'));
  // пролог → оформление
  PVZ.game.scene.onKey('Escape');
  await sleep(400);
  const inp = document.getElementById('pvz-name-input');
  out.push('input visible: ' + (inp && getComputedStyle(inp).display));
  if (inp) {
    inp.value = 'Точка у дома';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  PVZ.state.data.pvzColor = '#5aa877';
  PVZ.state.save();
  // открыть ПВЗ
  tap(880, 612);
  await sleep(1500);
  const st = PVZ.game.scene && PVZ.game.scene.debug && PVZ.game.scene.debug.st;
  out.push('shift: ' + !!st);
  if (st) {
    out.push('tutorial: ' + !!(st.tut && st.tut.on));
    out.push('name: ' + PVZ.state.title());
    out.push('color: ' + PVZ.state.brandColor());
  }
  return out;
})()
