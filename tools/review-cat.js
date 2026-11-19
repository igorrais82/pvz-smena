(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.tutorialSeen = true;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 2, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day';
  PVZ.state.data.cat = { name: 'Барсик', kind: 'кот', petDay: 0 };
  await wait(400);
  const hot = st.hots.filter((h) => h.id === 'deskCat');
  const out = { hot: hot, pets0: PVZ.state.data.eggPets };
  for (let i = 0; i < 10; i++) {
    PVZ.input.dispatch('tap', 1240, 600);
    await wait(120);
  }
  out.pets1 = PVZ.state.data.eggPets;
  out.eggs = PVZ.state.data.eggs;
  out.msg = st.msg;
  return out;
})()
