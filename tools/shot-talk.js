(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  PVZ.state.newGame();
  const d = PVZ.state.data;
  d.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat'];
  d.tutorialSeen = true;
  d.day = 2;
  const s = PVZ.scenes.shift({ day: 2, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(s);
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 13 * 60;
  st.queue.length = 0; st.customer = null;
  s.debug.spawn('question');
  s.debug.step();
  const c = st.customer;
  if (c) {
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    c.moving = false; c.arrived = true; c.arrivedT = 1;
  }
  await sleep(500);
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(400);
  const dlg = st.dlg;
  if (!dlg) return { error: 'no dialog' };
  const talkRect = dlg.choiceRects[dlg.choices.length - 1];
  PVZ.input.dispatch('tap', talkRect.x + talkRect.w / 2, talkRect.y + talkRect.h / 2);
  await sleep(600);
  return { topic: dlg.choices[dlg.choices.length - 1].label, open: st.dlg && st.dlg.text.slice(0, 70), choices: st.dlg && st.dlg.choices.length };
})()
