(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.pvzName = 'ПВЗ «Уютный»';
  PVZ.state.data.pvzColor = '#5b6fb0';
  PVZ.state.data.money = 20000;
  ['decor_rug', 'decor_sofa', 'decor_aquarium', 'decor_shelf', 'decor_poster', 'decor_neon',
    'decor_plant', 'decor_cat', 'decor_lamp', 'decor_clock'].forEach(id => PVZ.state.buy(id));
  st.phase = 'day'; st.shiftOpen = true; st.clock = 14 * 60; st.doorOpen = true; st.lightsOn = true;
  st.tut = null;
  s.debug.view('hall');
  await sleep(700);
  return { view: st.view, name: PVZ.state.title(), color: PVZ.state.brandColor(), owned: PVZ.state.data.owned.length };
})()
