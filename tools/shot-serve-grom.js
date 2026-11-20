/* Кадр: Витя Гром на второй смене — диалог со сценой разгрома */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  st.day = 2;
  st.phase = 'day';
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.clock = 12 * 60;
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
  const sp = s.debug.special('grom');
  if (!sp) return { error: 'grom not spawned' };
  st.smash = { t: 0.35, x: 985, y: 470, seed: 4 };
  const c = sp.c;
  st.queue.length = 0;
  st.customer = c;
  c.state = 'atCounter';
  c.moving = false;
  c.arrived = true;
  c.arrivedT = 1;
  c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
  c.bubble = 'Три недели! Три недели я ждал!';
  c.bubbleAlpha = 1;
  await sleep(900);
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(900);
  return { dlg: !!st.dlg, moment: st.moment && st.moment.kind, choices: st.dlg ? st.dlg.choices.length : 0 };
})()
