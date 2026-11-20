/* Кадр: клиент вышел из примерочной и показывает футболку */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  st.day = 3;
  st.phase = 'day';
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.clock = 13 * 60;
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
  const o = PVZ.sys.makeOrder({
    item: { name: 'Футболка', kind: 'clothes', size: 'S', price: 990 },
    state: 'stored', cell: 'A-1-1', day: 3, cod: false, docs: false
  });
  st.orders.push(o);
  s.debug.spawn('pickup');
  const c = st.queue[st.queue.length - 1];
  c.orderIds = [o.id];
  c.code = o.code;
  c.item = o.item;
  c.parcels = 1;
  c.codSum = 0;
  c.docs = false;
  c.momentDone = true;
  c.arrived = true;
  c.moving = false;
  c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
  o.customer = c.id;
  st.queue.length = 0;
  st.customer = c;
  c.state = 'atCounter';
  await sleep(700);
  s.debug.tryon();
  await sleep(900);
  return { dlg: !!st.dlg, moment: st.moment && st.moment.kind, choices: st.dlg ? st.dlg.choices.length : 0 };
})()
