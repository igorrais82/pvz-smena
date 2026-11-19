(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'secrets'];
  PVZ.state.data.tutorialSeen = true;
  PVZ.state.data.eggs = ['bond', 'coffee', 'witcher', 'konami', 'sherlock'];
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'day' }));
  await wait(500);
  PVZ.game.scene.debug.openApp('secrets');
  await wait(800);
  return { mode: PVZ.game.scene.debug.st.laptop.mode, eggs: PVZ.state.data.eggs.length };
})()
