/* Проверка пасхалок: гость, коллекция, кот, кружка, Konami. */
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const out = { steps: [] };

  PVZ.state.newGame();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  PVZ.sys.EGG_CHANCE = 1;
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'day' }));
  const s = PVZ.game.scene, st = s.debug.st;

  const arrive = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 9000 && !(st.customer && st.customer.arrived)) await wait(120);
    return !!(st.customer && st.customer.arrived);
  };

  // --- 1. гость-пасхалка
  s.debug.spawn();
  await wait(200);
  s.debug.step();
  out.arrived = await arrive();
  out.guest = st.customer ? { name: st.customer.name + ' ' + st.customer.last, egg: st.customer.eggId, kind: st.customer.kind } : null;
  const L = PVZ.art.LAYOUT.counter.customer;
  tap(L.x + L.w / 2, L.y + L.h / 2);
  await wait(500);
  out.dialog = st.dlg ? { name: st.dlg.name, role: st.dlg.role, text: st.dlg.text, choices: st.dlg.choices.map((c) => c.label) } : null;
  if (st.dlg) {
    const before = PVZ.state.data.money;
    const r = st.dlg.choiceRects[0];
    tap(r.x + 50, r.y + 22);
    await wait(900);
    out.afterChoice = {
      money: PVZ.state.data.money - before,
      eggs: PVZ.state.data.eggs.slice(),
      secretsApp: PVZ.state.data.apps.indexOf('secrets') >= 0,
      customerGone: !st.customer
    };
  }

  // --- 2. коллекция в ноутбуке
  st.queue.length = 0; st.customer = null; st.nextT = 0;
  s.debug.openApp('secrets');
  await wait(400);
  out.secretsMode = st.laptop && st.laptop.mode;
  out.secretLines = PVZ.apps.drawSecrets ? 'drawable' : 'missing';

  // --- 3. кружка и фигурки
  st.laptop = null;
  const C = PVZ.art.LAYOUT.counter;
  for (let i = 0; i < 7; i++) { tap(C.mug.x + 10, C.mug.y + 10); await wait(60); }
  out.afterMug = PVZ.state.data.eggs.slice();
  for (let i = 0; i < 7; i++) { tap(C.figurines.x + 10, C.figurines.y + 10); await wait(60); }
  out.afterFigurines = PVZ.state.data.eggs.slice();

  // --- 4. кот
  PVZ.state.data.cat = { name: 'Барсик', kind: 'кот', petDay: 0 };
  for (let i = 0; i < 10; i++) { tap(1240, 600); await wait(60); }
  out.afterCat = PVZ.state.data.eggs.slice();

  // --- 5. Konami
  ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
    .forEach((k) => PVZ.input.dispatch('key', 0, 0, k));
  await wait(300);
  out.afterKonami = PVZ.state.data.eggs.slice();
  out.total = PVZ.state.data.eggs.length + ' / ' + PVZ.sys.EGGS.length;
  out.lastError = PVZ.game.lastError || null;
  return out;
})()
