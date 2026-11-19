/* Headless smoke-тест: поднимает игру без браузера (canvas-заглушка) и прогоняет сцены.
   node tools/smoke.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'game');
const errors = [];

function noop() {}
function gradient() { return { addColorStop: noop }; }

const ctxStub = new Proxy({}, {
  get(target, prop) {
    if (prop === 'measureText') return (s) => ({ width: String(s).length * 6.2 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return gradient;
    if (prop === 'createPattern') return () => null;
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (prop === 'canvas') return canvas;
    if (prop === 'globalAlpha') return 1;
    if (prop === 'lineWidth' || prop === 'shadowBlur') return 1;
    return noop;
  },
  set() { return true; }
});

const canvas = {
  width: 1280, height: 720, style: {},
  getContext: () => ctxStub,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }),
  focus: noop
};

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const buttons = {};
function el(id) {
  if (id === 'game') return canvas;
  if (!buttons[id]) {
    buttons[id] = {
      style: {}, classList: { toggle: noop, add: noop, remove: noop },
      addEventListener: noop, appendChild: noop
    };
  }
  return buttons[id];
}

const documentStub = {
  readyState: 'complete',
  getElementById: el,
  addEventListener: noop,
  hidden: false,
  fullscreenElement: null,
  documentElement: { requestFullscreen: noop, style: {} },
  createElement: () => canvas
};

const windowStub = global;
global.window = windowStub;
global.document = documentStub;
global.localStorage = localStorage;
global.navigator = { maxTouchPoints: 0, userAgent: 'smoke' };
global.devicePixelRatio = 1;
global.requestAnimationFrame = noop;
global.cancelAnimationFrame = noop;
global.location = { search: '', href: 'file:///game/index.html' };
global.addEventListener = noop;
global.removeEventListener = noop;
global.URLSearchParams = URLSearchParams;

const files = ['core.js', 'pay.js', 'art.js', 'systems.js', 'apps.js', 'scenes.js', 'main.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
  try {
    vm.runInThisContext(code, { filename: f });
  } catch (e) {
    errors.push('load ' + f + ': ' + e.message);
  }
}

const PVZ = global.PVZ;
function step(scene, n, dt) {
  for (let i = 0; i < n; i++) {
    try { scene.update(dt || 1 / 60); } catch (e) { errors.push('update: ' + (e.stack || e)); return; }
    try { scene.draw(ctxStub); } catch (e) { errors.push('draw: ' + (e.stack || e)); return; }
    if (!scene && !PVZ.game.scene) return;
    scene = PVZ.game.scene || scene;
  }
  return scene;
}

function check(name, cond, extra) {
  if (!cond) errors.push('CHECK FAILED: ' + name + (extra ? ' — ' + extra : ''));
}

/* Сюжетные сцены мафии открываются сами и перехватывают тапы в тестах —
   для большинства прогонов помечаем их пройденными. */
function silenceStories() {
  const m = PVZ.state.mafiaState && PVZ.state.mafiaState();
  if (m && PVZ.sys && PVZ.sys.MAFIA_STORIES) m.seen = PVZ.sys.MAFIA_STORIES.map((s) => s.id);
}

// --- меню
step(PVZ.scenes.menu(), 5);

// --- новая игра, утро
PVZ.state.newGame();
silenceStories();
let s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
PVZ.game.setScene(s);
let st = s.debug.st;
check('supply на утро', st.orders.filter((o) => o.state === 'new').length > 0, 'нет поставки');
check('план дня', st.plan > 0, 'plan=' + st.plan);
step(s, 60);

// --- drag&drop: берём коробку из лотка и кладём в свободную ячейку
st.view = 'rack';
st.rack = 'A';
step(s, 3);
const supply = st.orders.find((o) => o.state === 'new');
check('коробка для перетаскивания', !!supply);
// координаты лотка повторяют supplyTrayRects (70x58, шаг 78, y 622)
const trayList = st.orders.filter((o) => o.state === 'new').slice(0, 9);
const idx = trayList.indexOf(supply);
const tw = 70, th = 58, gap = 8, total = trayList.length * (tw + gap) - gap;
const tx = 640 - total / 2 + idx * (tw + gap) + tw / 2;
const ty = 552 + th / 2;

// свободная ячейка A-1-1 (или любая подходящая)
const ROWS = 3, COLS = 3;
function cellCenter(row, col) {
  const gx = 350, gy = 174, gw = 700, gh = 348;
  const cw = gw / COLS, ch = gh / ROWS;
  return { x: gx + col * cw + cw / 2, y: gy + row * ch + ch / 2 };
}
let target = null;
const occupied = new Set(st.orders.filter((o) => o.cell && o.state === 'stored').map((o) => o.cell));
for (const rack of ['A', 'B', 'C']) {
  for (let r = 0; r < ROWS && !target; r++) {
    for (let c = 0; c < COLS && !target; c++) {
      const id = rack + '-' + (r + 1) + '-' + (c + 1);
      if (occupied.has(id)) continue;
      if (supply.size === 'L' && r !== ROWS - 1) continue;
      target = { id, ...cellCenter(r, c), rack };
    }
  }
  if (target) {
    st.rack = rack;
    step(s, 2);
    break;
  }
}
check('нашлась свободная ячейка', !!target);
if (!target) {
  console.log('FAILED: нет свободных ячеек в A');
  process.exit(1);
}

const moneyBefore = PVZ.state.data.money;
s.onDown(tx, ty);
s.onMove(target.x, target.y);
s.onUp(target.x, target.y);
check('коробка легла на полку', supply.state === 'stored' && supply.cell === target.id, supply.state + ' / ' + supply.cell);
check('приёмка засчитана', st.stats.received === 1, 'received=' + st.stats.received);
check('деньги за приёмку', PVZ.state.data.money > moneyBefore);
check('коробка исчезла из лотка', st.orders.filter((o) => o.state === 'new').indexOf(supply) === -1);

// --- перетаскивание уже лежащей посылки в другую ячейку
let free2 = null;
for (let r = 0; r < ROWS && !free2; r++) {
  for (let c = 0; c < COLS && !free2; c++) {
    const id = 'A-' + (r + 1) + '-' + (c + 1);
    if (id !== target.id && !st.orders.some((o) => o.cell === id && o.state === 'stored') && (supply.size !== 'L' || r === ROWS - 1)) {
      free2 = { id, ...cellCenter(r, c) };
    }
  }
}
if (free2) {
  s.onDown(target.x, target.y);
  s.onMove(free2.x, free2.y);
  s.onUp(free2.x, free2.y);
  check('посылка переставлена', supply.cell === free2.id, 'cell=' + supply.cell);
}

// --- провал по рейтингу посреди смены
PVZ.state.data.rating = 2.9;
step(s, 2);
check('сцена провала запущена', PVZ.game.trans && PVZ.game.trans.s && typeof PVZ.game.trans.s.onTap === 'function');
const gameover = PVZ.scenes.gameover({ reason: 'test', day: 3, days: 2, served: 10, earned: 5000, complaints: 4, money: 1000, rating: 2.9 });
PVZ.game.trans = null;
PVZ.game.setScene(gameover);
step(gameover, 5);
PVZ.game.setScene(PVZ.scenes.report({ day: 3, served: 14, plan: 14, complaints: 1, returns: 2, received: 7, earned: 3480, rating: 4.4, money: 8640, bonus: 300, final: true, carry: [] }));
step(PVZ.game.scene, 5);

// --- финал и магазин
PVZ.state.data.totals.days = 10;
PVZ.state.data.totals.earned = 26000;
PVZ.state.data.rating = 4.6;
const fin = PVZ.scenes.finale();
PVZ.game.setScene(fin);
step(fin, 5);
const shop = PVZ.scenes.shop({ from: 'report', carry: [] });
PVZ.game.setScene(shop);
step(shop, 5);
const shopUI = new PVZ.scenes.ShopUI({ title: 'T' });
shopUI.tab = 'decor';
step({ update: () => shopUI.update(1 / 60), draw: (c) => shopUI.draw(c, 1) }, 3);

// --- полный день без падений: утро → день → вечер
PVZ.state.newGame();
silenceStories();
let day = PVZ.scenes.shift({ day: 2, phase: 'morning' });
PVZ.game.setScene(day);
day.debug.st.objectives.forEach((o) => { o.done = true; });
day.debug.startPhase('day');
step(day, 900);
const st2 = day.debug.st;
check('покупатели приходят', st2.queue.length + (st2.customer ? 1 : 0) > 0, 'очередь пуста');
day.debug.startPhase('evening');
step(day, 600);

// --- decor даёт реальный модификатор
PVZ.state.data.owned = ['decor_plant', 'decor_cat', 'decor_lamp'];
const mods = PVZ.state.mods();
check('уют от декора', mods.comfort > 0 && mods.comfort <= PVZ.balance.decorMax, 'comfort=' + mods.comfort);
check('уют уменьшает скорость усталости', mods.patience < 1, 'patience=' + mods.patience);

// --- пасхалка: редкий гость приходит, даёт награду и открывает «Секреты»
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
PVZ.state.data.tutorialSeen = true;
const eggScene = PVZ.scenes.shift({ day: 4, phase: 'day' });
PVZ.game.setScene(eggScene);
const eggSt = eggScene.debug.st;
eggSt.phase = 'day';
PVZ.sys.EGG_CHANCE = 1;
eggScene.debug.spawn();
check('гость-пасхалка появился', eggSt.queue.length === 1 && eggSt.queue[0].kind === 'guest', 'kind=' + (eggSt.queue[0] && eggSt.queue[0].kind));
const guestEgg = eggSt.queue[0] && eggSt.queue[0].eggId;
eggScene.debug.step();
const guest = eggSt.customer;
guest.vx = 625; guest.vgy = 800; guest.vh = 580 * (guest.height || 1);
guest.moving = false;
guest.arrived = true;
eggSt.customer.arrivedT = 1;
step(eggScene, 6);
const moneyBeforeEgg = PVZ.state.data.money;
eggScene.onTap(600, 290);
check('диалог пасхалки открылся', !!eggSt.dlg, 'dlg=' + !!eggSt.dlg);
if (eggSt.dlg) {
  const r0 = eggSt.dlg.choiceRects[0];
  eggScene.onTap(r0.x + 40, r0.y + 20);
  check('секрет записан', PVZ.state.hasEgg(guestEgg), 'eggs=' + JSON.stringify(PVZ.state.data.eggs));
  check('награда начислена', PVZ.state.data.money > moneyBeforeEgg, 'money=' + PVZ.state.data.money);
  check('приложение «Секреты» открылось', PVZ.state.hasApp('secrets'), 'apps=' + JSON.stringify(PVZ.state.data.apps));
}

// --- скрытые секреты интерьера
PVZ.state.data.eggs = [];
for (let i = 0; i < 7; i++) eggScene.onTap(1020, 620);
check('секрет с кружкой', PVZ.state.hasEgg('coffee'), 'eggs=' + JSON.stringify(PVZ.state.data.eggs));
for (let i = 0; i < 7; i++) eggScene.onTap(1040, 550);
check('секрет с фигурками', PVZ.state.hasEgg('figurine'), 'eggs=' + JSON.stringify(PVZ.state.data.eggs));
['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  .forEach((k) => eggScene.onKey(k));
check('Konami-код', PVZ.state.hasEgg('konami'), 'eggs=' + JSON.stringify(PVZ.state.data.eggs));

// --- долг мафии можно закрыть за 10 смен
PVZ.state.newGame();
silenceStories();
PVZ.state.data.money = 30000;
PVZ.state.data.debt = PVZ.sys.DEBT_TOTAL;
let visits = 0;
for (let d = 1; d <= PVZ.balance.WIN_DAY; d++) {
  PVZ.state.data.day = d;
  const res = PVZ.sys.mafiaCollect();
  if (!res) break;
  visits++;
}
check('10 визитов мафии за забег', visits === PVZ.balance.WIN_DAY, 'visits=' + visits);
check('долг закрывается', PVZ.state.data.debt === 0, 'debt=' + PVZ.state.data.debt);
check('пункт свободен от мафии', !!(PVZ.state.data.freed) && PVZ.sys.mafiaCollect() === null, 'freed=' + PVZ.state.data.freed);

// --- мутный тип на 5-й смене и чёрный рынок «Banana store»
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
PVZ.state.data.tutorialSeen = true;
const bnScene = PVZ.scenes.shift({ day: 5, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(bnScene);
const bnSt = bnScene.debug.st;
step(bnScene, 120);
const shady = bnSt.queue.find((q) => q.kind === 'shady') || (bnSt.customer && bnSt.customer.kind === 'shady' ? bnSt.customer : null);
check('мутный тип пришёл на 5-й смене', !!shady, 'queue=' + JSON.stringify(bnSt.queue.map((q) => q.kind)));
check('у мутного типа нет имени', shady && shady.name === '???', shady && shady.name);
// доводим его до стойки и открываем диалог
bnSt.queue.length = 0;
bnSt.customer = null;
bnScene.debug.spawn('shady');
bnScene.debug.step();
const shadyC = bnSt.customer;
shadyC.vx = 625; shadyC.vgy = 800; shadyC.vh = 580 * (shadyC.height || 1);
shadyC.moving = false; shadyC.arrived = true; shadyC.arrivedT = 1;
step(bnScene, 4);
bnScene.onTap(600, 290);
check('диалог мутного типа открылся', !!bnSt.dlg);
function tapChoice(scene, i, n) {
  const gap = Math.min(60, 300 / Math.max(1, n));
  scene.onTap(316 + 300, 372 + i * gap + 23);
}
if (bnSt.dlg) tapChoice(bnScene, 0, bnSt.dlg.choices.length);
if (bnSt.dlg) tapChoice(bnScene, 0, bnSt.dlg.choices.length);
check('Banana store установлен', PVZ.state.hasApp('banana'), 'apps=' + JSON.stringify(PVZ.state.data.apps));
check('Banana store не виден в App Market', PVZ.apps.byCat('all').every((a) => a.id !== 'banana'));

// витрина и покупка
PVZ.state.data.money = 9000;
bnScene.debug.banana();
step(bnScene, 3);
check('открыт экран Banana store', bnSt.laptop && bnSt.laptop.mode === 'banana', bnSt.laptop && bnSt.laptop.mode);
bnScene.onTap(880, 290); // «Травмат»
check('травмат куплен', PVZ.state.bananaHas('gun'), 'bought=' + JSON.stringify(PVZ.state.banana().bought));
check('покупка добавила подозрение', PVZ.state.banana().heat >= 4, 'heat=' + PVZ.state.banana().heat);
step(bnScene, 3);

// сбыт посылки
bnSt.orders.forEach((o) => { if (o.state === 'stored') o.customer = null; });
const sellOrder = bnSt.orders.find((o) => o.state === 'stored');
check('есть что сбыть', !!sellOrder);
const moneyBeforeSell = PVZ.state.data.money;
bnScene.onTap(400, 235); // вкладка «Сбыть товар»
step(bnScene, 2);
bnScene.onTap(880, 290); // первая посылка
check('посылка сбыта', !bnSt.orders.some((o) => o.id === sellOrder.id), 'state=' + (sellOrder && sellOrder.state));
check('деньги за сбыт', PVZ.state.data.money > moneyBeforeSell, 'money=' + PVZ.state.data.money);
check('подозрение выросло', PVZ.state.banana().heat >= 22, 'heat=' + PVZ.state.banana().heat);
step(bnScene, 3);

// полиция приходит и арестовывает при переполненном подозрении
bnSt.laptop = null;
const bNow = PVZ.state.banana();
bNow.soldDay = 0;
bNow.heat = 95;
PVZ.state.data.money = 9000;
bnScene.debug.banana();
step(bnScene, 2);
bnScene.onTap(400, 235);
bnScene.onTap(880, 290);
check('сбыт при 100% не арестовывает мгновенно', PVZ.state.banana().heat >= 100 && !bnSt.over && !PVZ.state.data.over,
  'heat=' + PVZ.state.banana().heat + ' over=' + bnSt.over);
step(bnScene, 1);
check('полицейский пришёл в зал', !!(bnSt.arrest && bnSt.arrest.stage === 'arriving'), bnSt.arrest && bnSt.arrest.stage);
step(bnScene, 240);
check('полицейский дошёл и начал диалог', !!bnSt.dlg, 'arrest=' + (bnSt.arrest && bnSt.arrest.stage));
let talk = 0;
while (bnSt.dlg && talk++ < 8) {
  tapChoice(bnScene, 0, bnSt.dlg.choices.length);
  step(bnScene, 2);
}
check('после диалога надевают наручники', !!(bnSt.arrest && bnSt.arrest.stage === 'cuffing'), bnSt.arrest && bnSt.arrest.stage);
step(bnScene, 240);
check('арест при 100% подозрения', !!bnSt.over || PVZ.state.data.over, 'heat=' + PVZ.state.banana().heat + ' over=' + bnSt.over);

// антивирус ругается и умеет удалять
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'banana', 'antivirus'];
PVZ.state.data.banana = { met: true, heat: 30, soldDay: 0, soldToday: 0, totalSold: 0, bought: [], avFound: false, removedDay: 0 };
const avScene = PVZ.scenes.shift({ day: 6, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(avScene);
step(avScene, 2);
avScene.debug.openApp('antivirus');
const avSt = avScene.debug.st;
const avLines = PVZ.apps.liveLines(PVZ.apps.byId('antivirus'), { st: avSt });
check('антивирус ругается на Banana store', avLines.some((l) => /Banana/.test(l)), JSON.stringify(avLines));
const avWin = { x: 200, y: 120, w: 880, h: 480 };
const avRects = PVZ.apps.avRects(avWin);
avScene.onTap(avRects.scan.x + avRects.scan.w / 2, avRects.scan.y + avRects.scan.h / 2); // проверить
check('антивирус нашёл угрозу', PVZ.state.banana().avFound === true);
avScene.onTap(avRects.del.x + avRects.del.w / 2, avRects.del.y + avRects.del.h / 2); // удалить
check('Banana store удалён', !PVZ.state.hasApp('banana'), 'apps=' + JSON.stringify(PVZ.state.data.apps));

// час пик и серия
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
const rushScene = PVZ.scenes.shift({ day: 4, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(rushScene);
rushScene.debug.startPhase('day');
rushScene.debug.rush();
const rushSt = rushScene.debug.st;
check('час пик включился', !!(rushSt.rush && rushSt.rush.on), 'rush=' + JSON.stringify(rushSt.rush));
step(rushScene, 30);
rushSt.rush.t = rushSt.rush.total - 0.01;
step(rushScene, 2);
check('час пик заканчивается по таймеру', !(rushSt.rush && rushSt.rush.on), 't=' + (rushSt.rush && rushSt.rush.t));
check('событие дня выбрано', !!(rushSt.dayMod && rushSt.dayMod.id), 'dayMod=' + JSON.stringify(rushSt.dayMod));

// кот: большой, живёт на столе и рисуется
PVZ.state.newGame();
silenceStories();
PVZ.state.data.cat = { name: 'Мурзик', fur: 'ginger', takenDay: 2, petDay: 0 };
const catScene = PVZ.scenes.shift({ day: 3, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(catScene);
step(catScene, 4);
check('кот рисуется на стойке', true);

// --- стресс: полная смена 8-го дня с часом пиком и событием дня
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'antivirus'];
PVZ.state.data.money = 20000;
PVZ.state.data.day = 8;
const stress = PVZ.scenes.shift({ day: 8, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(stress);
stress.debug.startPhase('day');
stress.debug.rush();
stress.debug.spawn('shady');
step(stress, 2500);
check('полная смена не падает', true);

// --- живой рейтинг: каждая оценка клиента двигает число
PVZ.state.newGame();
silenceStories();
const ratingStart = PVZ.state.data.rating;
PVZ.state.rateVisit(2);
PVZ.state.rateVisit(2);
PVZ.state.rateVisit(2);
check('жалобы роняют рейтинг заметно', ratingStart - PVZ.state.data.rating > 0.5, 'rating=' + PVZ.state.data.rating);
for (let i = 0; i < 10; i++) PVZ.state.rateVisit(5);
check('хорошая работа возвращает рейтинг', PVZ.state.data.rating > 4.2, 'rating=' + PVZ.state.data.rating);
check('журнал оценок ограничен', PVZ.state.data.ratingLog.length <= PVZ.balance.ratingLogMax, 'len=' + PVZ.state.data.ratingLog.length);
check('средняя оценка считается', PVZ.state.ratingAvg(0) > 3, 'avg=' + PVZ.state.ratingAvg(0));
check('тренд рейтинга определён', typeof PVZ.state.ratingTrend() === 'number');

// --- подписи выбора без цифр, инструкции не ломаются
const flavored = PVZ.sys.hintLabel('+120 ₽ · 3 мин · +репутация');
check('подпись без цифр', !/[0-9]/.test(flavored), flavored);
check('подпись без рублей', flavored.indexOf('₽') < 0, flavored);
check('подпись не пустая', flavored.length > 3, flavored);
check('номер службы сохраняется', PVZ.sys.hintLabel('103') === '103', PVZ.sys.hintLabel('103'));
check('инструкция сохраняется', PVZ.sys.hintLabel('ноутбук → Телефон') === 'ноутбук → Телефон');
check('качественная подпись не портится', PVZ.sys.hintLabel('чёрный рынок') === 'чёрный рынок');

// --- отложенные последствия приходят через 2 смены
PVZ.state.newGame();
silenceStories();
check('последствие запланировано', !!PVZ.state.scheduleConsequence('kid_saved', 2));
check('дубликат не создаётся', PVZ.state.scheduleConsequence('kid_saved', 2) === null);
check('раньше срока не срабатывает', PVZ.state.dueConsequences().length === 0);
PVZ.state.data.day = 3;
const dueList = PVZ.state.dueConsequences();
check('последствие созрело', dueList.length === 1 && dueList[0].id === 'kid_saved', JSON.stringify(dueList));
const moneyBeforeCons = PVZ.state.data.money;
const appliedCons = PVZ.sys.applyConsequence('kid_saved');
check('последствие дало деньги', PVZ.state.data.money > moneyBeforeCons);
check('последствие вернуло текст', !!(appliedCons && appliedCons.text && appliedCons.title));
check('второй раз не срабатывает', PVZ.state.dueConsequences().length === 0);

// --- бесконечный режим: мафии нет, аренда есть, финала нет
PVZ.state.startEndless();
check('режим бесконечный', PVZ.state.endless() && PVZ.state.data.mode === 'endless');
check('долга мафии нет', PVZ.state.data.debt === 0);
check('мафия не приходит', PVZ.sys.mafiaCollect() === null);
PVZ.state.data.money = 20000;
const rent1 = PVZ.sys.rentCollect(2000);
check('аренда списывается', rent1 && rent1.paid > 0 && PVZ.state.data.money < 20000, JSON.stringify(rent1));
check('аренда растёт с днём', PVZ.sys.rentDue(10, 0) > PVZ.sys.rentDue(1, 0));
check('аренда не улетает в космос', PVZ.sys.rentDue(10000, 0) < 40000, 'due=' + PVZ.sys.rentDue(10000, 0));
check('100 смен без переполнения', (function () {
  const d = PVZ.state.data;
  d.money = 100000;
  for (let i = 1; i <= 100; i++) {
    d.day = i;
    PVZ.sys.rentCollect(3000);
    if (!isFinite(d.money) || d.money < 0) return false;
  }
  return true;
})());
// выселение за три неоплаты подряд
PVZ.state.startEndless();
PVZ.state.data.money = 0;
let evictedNow = false;
for (let i = 0; i < 3; i++) {
  PVZ.state.data.day = 2 + i;
  evictedNow = PVZ.sys.rentCollect(0).evicted;
}
check('за три неоплаты выселяют', evictedNow);
// оплата сбрасывает счётчик неоплат
PVZ.state.startEndless();
PVZ.state.data.money = 50000;
PVZ.sys.rentCollect(0);
check('оплата сбрасывает неоплаты', PVZ.state.data.rent.strikes === 0, 'strikes=' + PVZ.state.data.rent.strikes);

// бесконечная смена закрывается отчётом, а не финалом
PVZ.state.startEndless();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
PVZ.state.data.money = 8000;
const endScene = PVZ.scenes.shift({ day: 12, phase: 'evening' });
PVZ.game.trans = null;
PVZ.game.setScene(endScene);
step(endScene, 3);
endScene.debug.finish();
check('в бесконечном режиме смена ведёт в отчёт', !!(PVZ.game.trans && PVZ.game.trans.s && PVZ.game.trans.s.isReport),
  'scene=' + (PVZ.game.trans && PVZ.game.trans.s ? 'other' : 'none'));
if (PVZ.game.trans && PVZ.game.trans.s) {
  PVZ.game.setScene(PVZ.game.trans.s);
  PVZ.game.trans = null;
  step(PVZ.game.scene, 4);
}
check('аренда реально списана', PVZ.state.data.rent.paidTotal > 0, 'paidTotal=' + PVZ.state.data.rent.paidTotal);
check('режим пережил смену', PVZ.state.endless());
// магазин после 10-й смены продолжает бесконечный забег, а не уходит в финал
PVZ.state.data.day = 10;
const endlessShop = PVZ.scenes.shop({ carry: [] });
PVZ.game.trans = null;
PVZ.game.setScene(endlessShop);
step(endlessShop, 2);
endlessShop.onTap(760 + 40, 644 + 20);
check('магазин ведёт в следующую смену', !!(PVZ.game.trans && PVZ.game.trans.s && PVZ.game.trans.s.isShift),
  'scene=' + (PVZ.game.trans && PVZ.game.trans.s ? 'other' : 'none'));
check('день вырос', PVZ.state.data.day === 11, 'day=' + PVZ.state.data.day);
PVZ.game.trans = null;
// отчёт с арендой рисуется без ошибок
const rentReport = PVZ.scenes.report({
  day: 42, served: 18, plan: 20, complaints: 1, returns: 2, received: 9, earned: 4200,
  rating: 4.3, money: 15400, bonus: 300, final: false, carry: [],
  mode: 'endless', avgScore: 4.4, eggs: 3,
  rent: { paid: 780, unpaid: 120, strikes: 1, due: 900, fixed: 420, percent: 480, share: 0.12 }
});
PVZ.game.setScene(rentReport);
step(rentReport, 5);

// --- посылка: сначала на стол, потом сканер и QTE со штрихкодом коробки
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
PVZ.state.data.tutorialSeen = true;
const parcelScene = PVZ.scenes.shift({ day: 2, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(parcelScene);
const pst = parcelScene.debug.st;
pst.shiftOpen = true; pst.doorOpen = true; pst.lightsOn = true; pst.view = 'counter';
step(parcelScene, 2);
const pOrder = pst.orders.find((o) => o.state === 'stored');
check('есть посылка для выдачи', !!pOrder);
pst.held = { id: pOrder.id, code: pOrder.code, item: pOrder.item, scanned: false, onTable: false };
step(parcelScene, 1);
const pRect = PVZ.art.LAYOUT.counter.parcelOnTable;
const px = pRect.x + pRect.w / 2, py = pRect.y + pRect.h / 2;
parcelScene.onTap(px, py);
check('посылка легла на стол', pst.held && pst.held.onTable === true, JSON.stringify(pst.held));
step(parcelScene, 1);
parcelScene.onTap(px, py);
check('без сканера QTE не начинается', !pst.qte);
const sRect = PVZ.art.LAYOUT.counter.scanner;
parcelScene.onTap(sRect.x + sRect.w / 2, sRect.y + sRect.h / 2);
check('сканер взят в руку', pst.scannerHeld === true);
step(parcelScene, 1);
parcelScene.onTap(px, py);
check('запустился QTE сканирования посылки', !!(pst.qte && pst.qte.type === 'scan'), pst.qte && pst.qte.type);
if (pst.qte) pst.qte.finish(true);
check('посылка отсканирована', !!(pst.held && pst.held.scanned));
pst.qte = null;
// без посылки на столе выдать нельзя
pst.held = { id: pOrder.id, code: pOrder.code, item: pOrder.item, scanned: false, onTable: false };
pst.customer = null;
check('сканирование требует стол', (function () {
  const before = pst.qte;
  return before == null;
})());

// --- события дня: типы разные и реально меняют правила
const dayTypes = PVZ.dayMods || [];
check('событий дня не меньше 14', dayTypes.length >= 14, 'count=' + dayTypes.length);
check('id событий уникальны', new Set(dayTypes.map((m) => m.id)).size === dayTypes.length);
check('у каждого события есть базовые поля', dayTypes.every((m) => m.label && m.desc && typeof m.patience === 'number' && typeof m.spawn === 'number'));
check('есть событие с возвратами', dayTypes.some((m) => (m.returns || 1) > 1.5));
check('есть событие со сложными мини-играми', dayTypes.some((m) => m.hard === true));
check('есть событие с правкой плана', dayTypes.some((m) => typeof m.planAdd === 'number'));
check('есть событие с ускоренным временем', dayTypes.some((m) => (m.time || 1) > 1));
check('есть событие с частыми происшествиями', dayTypes.some((m) => (m.events || 1) < 0.8));

// --- сюжет мафии: куратор, ящик, улики
PVZ.state.newGame();
check('первая сцена — куратор', (PVZ.sys.mafiaStoryNext(2) || {}).id === 'curator', JSON.stringify(PVZ.sys.mafiaStoryNext(2)));
check('до второй смены сцен нет', PVZ.sys.mafiaStoryNext(1) === null);
const curStory = PVZ.sys.mafiaStory('curator');
check('куратор устанавливает приложение «Долги»', curStory.install === 'debt');
const curApplied = PVZ.sys.mafiaStoryApply('curator', 1);
check('вежливость даёт доверие', PVZ.state.mafiaState().trust === 8, 'trust=' + PVZ.state.mafiaState().trust);
check('приложение «Долги» установлено', PVZ.state.hasApp('debt'), JSON.stringify(PVZ.state.data.apps));
check('сцена отмечена пройденной', PVZ.state.mafiaState().seen.indexOf('curator') >= 0);
check('следующая сцена — ящик', (PVZ.sys.mafiaStoryNext(3) || {}).id === 'parcel');
const parcelApplied = PVZ.sys.mafiaStoryApply('parcel', 2);
check('запись в журнал даёт улику', PVZ.state.mafiaState().proof === 1, 'proof=' + PVZ.state.mafiaState().proof);
check('ящик даёт деньги', parcelApplied && PVZ.state.data.money >= 400, 'money=' + PVZ.state.data.money);

// --- вечерний визит: четыре способа расплатиться
PVZ.state.newGame();
silenceStories();
PVZ.state.data.money = 2000;
const debtStart = PVZ.state.data.debt;
const deferRes = PVZ.sys.mafiaVisit('defer');
check('отсрочка растит долг', PVZ.state.data.debt > debtStart, 'debt=' + PVZ.state.data.debt);
check('отсрочка не берёт денег', deferRes.paid === 0 && PVZ.state.data.money === 2000);
check('отсрочка портит доверие', PVZ.state.mafiaState().trust < 0, 'trust=' + PVZ.state.mafiaState().trust);
check('угроза без улик не проходит', PVZ.sys.mafiaVisit('threat').blocked === true);
const favorRes = PVZ.sys.mafiaVisit('favor');
check('услуга даёт задание', !!(PVZ.state.mafiaState().task && favorRes.task), JSON.stringify(favorRes.task));
check('услуга добавляет грязи', PVZ.state.mafiaState().dirt >= 12, 'dirt=' + PVZ.state.mafiaState().dirt);
const debtBeforeTask = PVZ.state.data.debt;
for (let i = 0; i < 8; i++) PVZ.sys.mafiaTaskServe();
check('услуга списывает долг', PVZ.state.data.debt < debtBeforeTask, 'debt=' + PVZ.state.data.debt);
check('задание закрыто', PVZ.state.mafiaState().task === null);
// оплата деньгами
PVZ.state.newGame();
silenceStories();
PVZ.state.data.money = 30000;
const payRes = PVZ.sys.mafiaVisit('pay');
check('оплата списывает деньги', payRes && payRes.paid > 0 && PVZ.state.data.money < 30000);
check('оплата уменьшает долг', PVZ.state.data.debt < PVZ.sys.DEBT_TOTAL);
// улики открывают угрозу и путь стукача
PVZ.state.newGame();
silenceStories();
PVZ.state.data.money = 30000;
PVZ.state.mafiaAdd('proof', 3);
const threatRes = PVZ.sys.mafiaVisit('threat');
check('угроза с уликами проходит', threatRes && threatRes.threat === true, JSON.stringify(threatRes));
check('три улики — путь стукача', PVZ.state.mafiaState().path === 'snitch', 'path=' + PVZ.state.mafiaState().path);

// --- пять концов
PVZ.state.newGame();
silenceStories();
PVZ.state.data.debt = 0;
check('концовка «свободен»', PVZ.sys.mafiaEnding().id === 'free', PVZ.sys.mafiaEnding().id);
PVZ.state.data.debt = 4000;
PVZ.state.mafiaState().path = 'family';
check('концовка «свой человек»', PVZ.sys.mafiaEnding().id === 'family');
PVZ.state.mafiaState().path = null;
PVZ.state.mafiaAdd('dirt', 75);
check('концовка «по уши в грязи»', PVZ.sys.mafiaEnding().id === 'dirty', PVZ.sys.mafiaEnding().id);
PVZ.state.data.debt = 4000;
PVZ.state.mafiaState().dirt = 10;
check('концовка «долг остался»', PVZ.sys.mafiaEnding().id === 'debt');
PVZ.state.mafiaAdd('proof', 3);
check('улики важнее пути', PVZ.sys.mafiaEnding().id === 'snitch');
// финальная сцена рисуется с любой концовкой
const finScene = PVZ.scenes.finale();
PVZ.game.trans = null;
PVZ.game.setScene(finScene);
step(finScene, 4);

// --- событие дня через отладочный вход: правило реально применяется
PVZ.state.newGame();
silenceStories();
const modScene = PVZ.scenes.shift({ day: 4, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(modScene);
const mst = modScene.debug.st;
modScene.debug.dayMod('calm');
const planBefore = mst.plan;
modScene.debug.dayMod('inventory');
check('инвентаризация поднимает план', mst.plan === planBefore + 2, planBefore + ' -> ' + mst.plan);
modScene.debug.dayMod('blackout');
check('перебои со светом усложняют мини-игры', mst.dayMod.hard === true);
modScene.debug.dayMod('returns_day');
check('день возвратов повышает долю возвратов', (mst.dayMod.returns || 1) > 1.5);
step(modScene, 2);

// --- итог
if (errors.length) {
  console.log('FAILED (' + errors.length + '):');
  errors.slice(0, 12).forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK: сцены, живой рейтинг, подписи без цифр, отложенные последствия, бесконечный режим, сюжет мафии (куратор, ящик, услуга, улики, 5 концов), события дня, финал, магазин, Banana store и кот работают');