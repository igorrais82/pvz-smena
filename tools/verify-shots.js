/* Подготовка кадра для проверки новых механик: живой рейтинг, подписи без цифр,
   отложенные последствия, бесконечный режим, посылка на столе. Режим задаётся
   параметром в адресе: ...index.html?dev=day&mode=hud
   hud | parcel | dialog | conseq | endlesshud | endlessreport | endlessevict | help1 | help3 | menu
   node tools/cdp.js "file:///.../game/index.html?dev=day&mode=hud" shots/x.png --evalfile=tools/verify-shots.js */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // ждём загрузки скриптов игры: под file:// с параметром ?dev=… страница
  // иногда отвечает на eval раньше, чем выполнился core.js
  for (let waited = 0; waited < 8000; waited += 100) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await sleep(100);
  }
  if (typeof PVZ === 'undefined' || !PVZ.game) return 'no-pvz';
  const mode = new URLSearchParams(location.search).get('mode') || 'hud';
  const S = PVZ.state;
  const now = () => PVZ.game.scene;

  if (mode === 'menu') {
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.menu());
  } else if (mode === 'help1' || mode === 'help3') {
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.menu());
    const s = now();
    s.onTap(538, 483); // «Как играть»
    if (mode === 'help3') {
      s.onTap(1015, 670);
      s.onTap(1015, 670);
    }
  } else if (mode === 'endlesshud') {
    S.startEndless();
    S.data.day = 37;
    S.data.rating = 4.71;
    S.data.ratingLog = [{ s: 5 }, { s: 5 }, { s: 5 }, { s: 4 }, { s: 5 }];
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 37, phase: 'day' }));
    const st = now().debug.st;
    st.clock = 15 * 60;
    st.shiftOpen = true;
    st.doorOpen = true;
    st.lightsOn = true;
    st.dayMod = null;
  } else if (mode === 'endlessreport') {
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.report({
      day: 37, served: 21, plan: 20, complaints: 1, returns: 2, received: 9,
      earned: 5120, rating: 4.71, money: 26400, bonus: 360, final: false, carry: [],
      mode: 'endless', avgScore: 4.62, eggs: 5,
      rent: { paid: 812, unpaid: 0, strikes: 0, due: 812, fixed: 412, percent: 400, share: 0.11 }
    }));
  } else if (mode === 'endlessevict') {
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.report({
      day: 12, served: 11, plan: 18, complaints: 4, returns: 0, received: 7,
      earned: 1500, rating: 3.6, money: 240, bonus: 0, final: false, carry: [],
      mode: 'endless', avgScore: 3.1, eggs: 5,
      rent: { paid: 240, unpaid: 640, strikes: 2, due: 880, fixed: 380, percent: 500, share: 0.1 }
    }));
  } else if (mode === 'parcel') {
    const st = now().debug.st;
    st.phase = 'day';
    st.shiftOpen = true;
    st.doorOpen = true;
    st.lightsOn = true;
    st.clock = 14 * 60;
    st.customer = null;
    st.queue.length = 0;
    const order = st.orders.find((o) => o.state === 'stored');
    st.scannerHeld = true;
    st.held = { id: order.id, code: order.code, item: order.item, scanned: false, onTable: true };
  } else if (mode === 'story') {
    PVZ.state.newGame();
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 2, phase: 'day' }));
    const st = now().debug.st;
    st.shiftOpen = true;
    st.doorOpen = true;
    st.lightsOn = true;
    st.clock = 12 * 60;
    st.queue.length = 0;
    st.customer = null;
  } else if (mode === 'mafiachoice') {
    PVZ.state.newGame();
    PVZ.state.mafiaState().seen = ['curator', 'parcel'];
    PVZ.state.data.money = 1200;
    PVZ.state.data.debt = 4200;
    PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'evening' }));
    const st = now().debug.st;
    st.day = 4;
    st.objectives.forEach((o) => { o.done = true; });
    now().debug.finish();
  } else if (mode === 'mafiafavor') {
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.mafia({
      result: {
        mode: 'favor', day: 5, demand: 870, paid: 0, short: false,
        moneyBefore: 900, moneyAfter: 900, debtBefore: 5120, debtAfter: 5120,
        taken: [], rage: false, visits: 5, trust: 18, dirt: 24, proof: 1,
        task: { need: 8, reward: 1305 }
      },
      report: null
    }));
  } else if (mode === 'ending') {
    PVZ.state.newGame();
    PVZ.state.data.debt = 0;
    PVZ.state.data.rating = 4.62;
    PVZ.state.data.totals.days = 10;
    PVZ.state.data.totals.served = 187;
    PVZ.state.data.totals.earned = 24600;
    PVZ.state.data.totals.complaints = 5;
    PVZ.state.data.money = 12400;
    PVZ.state.data.eggs = ['coffee', 'figurine', 'konami', 'cat'];
    PVZ.state.mafiaAdd('dirt', 22);
    PVZ.state.mafiaAdd('proof', 1);
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.finale());
  } else if (mode === 'debtapp') {
    PVZ.state.newGame();
    PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
    PVZ.state.installApp('debt');
    PVZ.state.data.debt = 5120;
    PVZ.state.data.money = 3400;
    PVZ.state.data.mafiaVisits = 4;
    PVZ.state.mafiaAdd('trust', 14);
    PVZ.state.mafiaAdd('dirt', 36);
    PVZ.state.mafiaAdd('proof', 1);
    PVZ.state.mafiaState().task = { need: 8, remaining: 3, reward: 900, day: 4 };
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 5, phase: 'day' }));
    const st2 = now().debug.st;
    st2.shiftOpen = true;
    st2.doorOpen = true;
    st2.lightsOn = true;
    st2.clock = 13 * 60;
    st2.queue.length = 0;
    now().debug.openApp('debt');
  } else if (mode === 'daymod') {
    PVZ.state.newGame();
    PVZ.state.mafiaState().seen = PVZ.sys.MAFIA_STORIES.map((s) => s.id);
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 6, phase: 'day' }));
    const st3 = now().debug.st;
    st3.shiftOpen = true;
    st3.doorOpen = true;
    st3.lightsOn = true;
    st3.clock = 15 * 60;
    st3.queue.length = 0;
    st3.customer = null;
    now().debug.dayMod('returns_day');
  } else if (mode === 'laptophome') {
    const st = now().debug.st;
    st.shiftOpen = true;
    st.doorOpen = true;
    st.lightsOn = true;
    st.clock = 14 * 60;
    st.queue.length = 0;
    st.customer = null;
    now().debug.laptop();
  } else if (mode.indexOf('premium') === 0) {
    // витрина доната: premium | premiumitems | premiumcoins | premiumbuy
    const st = now().debug.st;
    st.shiftOpen = true;
    st.doorOpen = true;
    st.lightsOn = true;
    st.clock = 14 * 60;
    st.queue.length = 0;
    st.customer = null;
    now().debug.laptop();
    st.laptop.mode = 'premium';
    st.laptop.premium.tab = mode === 'premiumitems' ? 'items' : mode === 'premiumcoins' ? 'coins' : 'bundles';
    PVZ.state.premiumCoins(420);
    PVZ.state.data.premium.plusUntil = Date.now() + 12 * 86400000;
    if (mode === 'premiumbuy') {
      st.laptop.premium.tab = 'items';
      st.laptop.premium.modal = { type: 'buy', id: 'catSkins' };
    }
  } else if (mode === 'conseq') {
    S.data.day = 3;
    S.data.pending = [{ id: 'kid_saved', day: 3 }, { id: 'neighbor_rude', day: 3 }];
    PVZ.game.trans = null;
    PVZ.game.setScene(PVZ.scenes.shift({ day: 3, phase: 'morning' }));
  } else if (mode === 'dialog') {
    const st = now().debug.st || now().debug;
    st.qte = null;
    st.dlg = new PVZ.sys.Dialogue({
      name: 'Блогер',
      person: PVZ.art.makePerson({
        skin: 1, hair: '#4a3020', style: 'short', shirt: '#e4572e', pants: '#3c4a5a',
        female: false, expr: 'happy'
      }),
      role: 'снимает видео',
      text: 'Я снимаю ролик «Худший ПВЗ района». Улыбнитесь, вы в кадре. Или докажите, что вы лучший.',
      choices: [
        { label: 'Показать, как у вас всё устроено', hint: '4 мин · +репутация · чаевые' },
        { label: 'Попросить не снимать зал', hint: '2 мин · −репутация' },
        { label: 'Проигнорировать и работать', hint: '2 мин · терпение очереди' }
      ]
    });
  } else {
    const st = now().debug.st;
    st.clock = 15 * 60;
    st.dayMod = null;
    S.data.rating = 4.12;
    S.data.ratingLog = [{ s: 5, day: 3 }, { s: 5, day: 3 }, { s: 4, day: 3 }, { s: 2, day: 3 }, { s: 1, day: 3 }, { s: 4, day: 3 }, { s: 3, day: 3 }];
  }
  await sleep(1300);
  const scene = PVZ.game.scene || {};
  const st = scene.debug && scene.debug.st ? scene.debug.st : null;
  return {
    mode: mode,
    dlg: !!(st && st.dlg),
    dlgT: st && st.dlg ? Math.round(st.dlg.tt * 100) / 100 : null,
    dlgChoices: st && st.dlg ? st.dlg.choices.length : 0,
    finished: !!(st && st.finished),
    trans: !!PVZ.game.trans,
    paused: !!PVZ.game.paused,
    err: PVZ.game.lastError || null,
    scene: scene.isMafia ? 'mafia' : scene.isReport ? 'report' : scene.isShift ? 'shift' : 'other'
  };
})()
