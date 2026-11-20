(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  const d = PVZ.state.data;
  d.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat'];
  d.tutorialSeen = true;
  d.day = 1;
  d.money = 5400;
  const s = PVZ.scenes.shift({ day: 1, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 11 * 60;
  st.queue.length = 0; st.customer = null;
  s.debug.npc('semyon');
  s.debug.step();
  const c = st.customer;
  if (c) {
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    c.moving = false; c.arrived = true; c.arrivedT = 1;
  }
  await sleep(500);
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(500);
  return { dlg: !!st.dlg, name: st.dlg && st.dlg.name, choices: st.dlg && st.dlg.choices.length, text: st.dlg && st.dlg.text.slice(0, 60) };
})()
