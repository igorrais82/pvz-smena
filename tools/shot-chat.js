(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  const d = PVZ.state.data;
  d.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat', 'premium'];
  d.tutorialSeen = true;
  d.day = 3;
  d.money = 8600;
  d.chatUnlocked = ['semyon', 'liza', 'vera'];
  const s = PVZ.scenes.shift({ day: 3, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 12 * 60 + 20;
  s.debug.openApp('chat');
  st.laptop.chatWith = 'semyon';
  await sleep(700);
  return { mode: st.laptop.mode, contacts: PVZ.talks.contacts().length, node: (PVZ.talks.chatNode('semyon', d) || {}).id, log: d.chatLog.length };
})()
