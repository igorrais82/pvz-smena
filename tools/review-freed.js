(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const out = {};

  // долг закрыт: вечер не должен показывать мафию
  PVZ.state.newGame();
  PVZ.state.data.debt = 0;
  PVZ.state.data.freed = true;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'secrets'];
  PVZ.state.data.eggs = ['bond', 'coffee'];
  PVZ.state.data.tutorialSeen = true;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 5, phase: 'evening' }));
  await wait(400);
  PVZ.game.scene.debug.finish();
  await wait(1200);
  out.afterFinish = {
    sceneIsReport: !!(PVZ.game.scene && PVZ.game.scene.isReport),
    sceneIsMafia: !!(PVZ.game.scene && PVZ.game.scene.isMafia),
    lastError: PVZ.game.lastError || null
  };
  out.dataAfter = { debt: PVZ.state.data.debt, money: PVZ.state.data.money, freed: PVZ.state.data.freed };

  // рабочий стол с «Секретами»
  PVZ.game.setScene(PVZ.scenes.shift({ day: 2, phase: 'day' }));
  await wait(300);
  PVZ.game.scene.debug.laptop();
  await wait(400);
  out.desktop = { mode: PVZ.game.scene.debug.st.laptop.mode, apps: PVZ.apps.desktopApps().map(a => a.id) };

  // долг не закрыт: мафия приходит и при нехватке забирает предмет
  PVZ.state.data.debt = 2000;
  PVZ.state.data.money = 100;
  PVZ.state.data.freed = false;
  const r = PVZ.sys.mafiaCollect();
  out.shortVisit = { paid: r && r.paid, short: r && r.short, debt: PVZ.state.data.debt, money: PVZ.state.data.money, taken: r && r.taken.length };
  return out;
})()
