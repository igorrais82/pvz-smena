(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  const d = PVZ.state.data;
  d.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat', 'premium', 'radio', 'cctv', 'calc', 'notes', 'weather', 'schedule'];
  d.tutorialSeen = true;
  d.day = 3;
  d.money = 8600;
  d.chatUnlocked = ['semyon', 'liza', 'vera'];
  PVZ.state.mafiaState().seen = PVZ.sys.MAFIA_STORIES.map((x) => x.id);
  const s = PVZ.scenes.shift({ day: 3, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 12 * 60;
  s.debug.laptop();
  await sleep(600);
  return { mode: st.laptop.mode, pending: PVZ.talks.pendingCount(d), badge: PVZ.apps.desktopApps().some(a => a.id === 'chat') };
})()
