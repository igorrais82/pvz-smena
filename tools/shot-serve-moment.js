/* Кадр микросценки обычного товара: ?dev=day&mi=Наушники */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const name = new URLSearchParams(location.search).get('mi') || 'Наушники';
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  st.phase = 'day';
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.day = 4;
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
  const cat = PVZ.sys.CATALOG.find((x) => x.name === name) || PVZ.sys.CATALOG[12];
  const o = PVZ.sys.makeOrder({ item: cat, state: 'stored', cell: 'A-1-1', day: 4, cod: false, docs: false });
  st.orders.push(o);
  s.debug.spawn('pickup');
  const c = st.queue[st.queue.length - 1];
  c.orderIds = [o.id];
  c.code = o.code;
  c.item = o.item;
  c.parcels = 1;
  c.codSum = 0;
  c.docs = false;
  c.momentDone = false;
  c.wantsFitting = false;
  c.arrived = true;
  c.moving = false;
  c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
  o.customer = c.id;
  st.queue.length = 0;
  st.customer = c;
  c.state = 'atCounter';
  st.held = { id: o.id, code: o.code, item: o.item, kind: o.kind, scanned: true, onTable: true, unpacked: true, placeT: 1 };
  await sleep(900);
  const before = {
    customer: !!st.customer, kind: st.customer && st.customer.kind,
    arrived: st.customer && st.customer.arrived, moving: st.customer && st.customer.moving,
    held: !!st.held, mine: st.customer && st.held ? st.customer.orderIds.indexOf(st.held.id) >= 0 : null
  };
  PVZ.input.dispatch('tap', 620, 300);
  await sleep(600);
  const first = !!st.dlg;
  const dlg = st.dlg;
  let err = null;
  let picked = null;
  if (dlg) {
    const idx = dlg.choices.findIndex((x) => /Отдать товар/.test(x.label));
    picked = { idx: idx, labels: dlg.choices.map((x) => x.label) };
    const r = dlg.choiceRects[idx >= 0 ? idx : 0];
    try {
      s.onTap(r.x + r.w / 2, r.y + r.h / 2);
    } catch (e) {
      err = String(e && e.stack || e);
    }
  }
  const rightAfter = {
    dlg: !!st.dlg, role: st.dlg && st.dlg.role, moment: st.moment && st.moment.kind,
    served: st.stats.served, held: !!st.held
  };
  await sleep(1500);
  return {
    name: o.item, before: before, first: first,
    dlg: !!st.dlg, role: st.dlg && st.dlg.role, text: st.dlg && st.dlg.text.slice(0, 60),
    moment: st.moment && st.moment.kind, choices: st.dlg ? st.dlg.choices.length : 0,
    labels: st.dlg ? st.dlg.choices.map((x) => x.label) : [],
    served: st.stats.served, moments: st.stats.moments, held: !!st.held, err: err,
    rightAfter: rightAfter, picked: picked
  };
})()
