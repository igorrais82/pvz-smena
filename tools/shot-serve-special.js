/* Кадр особого гостя: ?dev=day&sid=<id> */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sid = new URLSearchParams(location.search).get('sid') || 'blogger';
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  st.day = (PVZ.serve.specialById(sid) || {}).day || 3;
  st.phase = 'day';
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.clock = 14 * 60;
  st.spawnT = 999;
  st.eventT = 999;
  st.npcSpawned = true;
  st.special = null;
  st.queue.length = 0;
  st.customer = null;
  PVZ.state.data.money = 12000;
  try {
    const m = PVZ.state.mafiaState();
    m.seen = PVZ.sys.MAFIA_STORIES.map((x) => x.id);
    PVZ.state.data.bossCallDay = 9;
  } catch (e) { /* ignore */ }
  const sp = s.debug.special(sid);
  if (!sp) return { error: 'not spawned: ' + sid };
  const c = sp.c;
  st.queue.length = 0;
  st.customer = c;
  c.state = 'atCounter';
  c.moving = false;
  c.arrived = true;
  c.arrivedT = 1;
  c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
  await sleep(700);
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(1200);
  return { id: sid, dlg: !!st.dlg, moment: st.moment && st.moment.kind, choices: st.dlg ? st.dlg.choices.length : 0 };
})()
