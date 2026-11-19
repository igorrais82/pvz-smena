/* Кадр для RuStore: вечер, задачи смены, тёплый свет.
   node tools/cdp.js "file:///.../game/index.html?dev=evening&clean=1" shots/store-evening.png \
     --evalfile=tools/store-evening.js */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 80; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await sleep(100);
  }
  PVZ.state.data.money = 4260;
  PVZ.state.data.rating = 4.48;
  const s = PVZ.game.scene;
  const st = s.debug.st;
  st.day = 5;
  st.clock = 20 * 60 + 24;
  st.lightsOn = true;
  st.shiftOpen = true;
  st.objectives.forEach((o) => { o.done = o.id === 'closeDoor'; });
  s.debug.view('hall');
  await sleep(900);
  return { ok: true, phase: st.phase, tasks: st.objectives.length };
})()
