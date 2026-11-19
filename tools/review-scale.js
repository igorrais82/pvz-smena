(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.tutorialSeen = true;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 6, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;
  st.clock = 13 * 60;
  st.doorOpen = true; st.lightsOn = true; st.shiftOpen = true;
  s.debug.spawn();
  await wait(700);
  s.debug.step();
  await wait(2600);
  st.objectives = PVZ.sys.eveningObjectives();
  return { scale: PVZ.art.textScale, customer: !!st.customer };
})()
