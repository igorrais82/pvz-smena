(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'bank', 'secrets'];
  PVZ.state.data.eggs = ['bond', 'coffee', 'witcher', 'konami', 'sherlock', 'vader'];
  PVZ.state.data.tutorialSeen = true;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'day' }));
  await wait(500);
  PVZ.game.scene.debug.openApp('bank');
  await wait(700);
  return { mode: PVZ.game.scene.debug.st.laptop.mode, scale: PVZ.art.textScale };
})()
