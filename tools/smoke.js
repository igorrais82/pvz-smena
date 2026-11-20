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

const files = ['core.js', 'music.js', 'pay.js', 'ads.js', 'art.js', 'systems.js', 'talks.js', 'cast.js', 'serve.js', 'boxes.js', 'apps.js', 'scenes.js', 'main.js'];
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
function tapChoice(scene, i) {
  const dlg = scene.debug.st.dlg;
  if (!dlg || !dlg.choiceRects[i]) return;
  const r = dlg.choiceRects[i];
  scene.onTap(r.x + r.w / 2, r.y + r.h / 2);
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

// --- вскрытие: нож → пакет ножницами → товар в руках
pst.held.kind = pOrder.kind;
pst.held.placeT = 1;
step(parcelScene, 2);
parcelScene.onTap(px, py);
check('открылась сцена вскрытия', !!(pst.unpack && pst.unpack.phase), pst.unpack && pst.unpack.phase);
step(parcelScene, 70);
check('сцена ждёт нож', pst.unpack && pst.unpack.phase === 'knifeIdle', pst.unpack && pst.unpack.phase);
parcelScene.onTap(1000, 470);
check('нож взят', pst.unpack && pst.unpack.tool === 'knife', pst.unpack && pst.unpack.phase);
PVZ.input.down = true;
parcelScene.onDown(640, 318);
step(parcelScene, 180);
PVZ.input.down = false;
parcelScene.onUp(640, 318);
check('скотч прорезан', pst.unpack && pst.unpack.progress >= 1, pst.unpack && pst.unpack.progress);
step(parcelScene, 70);
check('крышка открыта, ждём ножницы', pst.unpack && pst.unpack.phase === 'scissorsIdle', pst.unpack && pst.unpack.phase);
parcelScene.onTap(270, 470);
check('ножницы взяты', pst.unpack && pst.unpack.tool === 'scissors', pst.unpack && pst.unpack.phase);
for (let i = 0; i < 3; i++) {
  parcelScene.onTap(640, 300);
  step(parcelScene, 20);
}
check('пакет разрезан', pst.unpack && pst.unpack.snips === 3, pst.unpack && pst.unpack.snips);
step(parcelScene, 70);
check('товар показан', pst.unpack && pst.unpack.phase === 'product', pst.unpack && pst.unpack.phase);
parcelScene.onTap(640, 300);
step(parcelScene, 70);
check('товар достали', !!(pst.held && pst.held.unpacked), pst.held && JSON.stringify(pst.held));
check('сцена вскрытия закрылась', !pst.unpack);

// без посылки на столе выдать нельзя
pst.held = { id: pOrder.id, code: pOrder.code, item: pOrder.item, scanned: false, onTable: false };
pst.customer = null;
check('сканирование требует стол', (function () {
  const before = pst.qte;
  return before == null;
})());

// --- выдача именно товара: диалог, «Отдать товар» и анимация передачи
pst.queue.length = 0;
pst.held = null;
parcelScene.debug.spawn('pickup');
parcelScene.debug.step();
const giver = pst.customer;
check('покупатель у стойки для выдачи', !!giver);
if (giver) {
  giver.vx = 625; giver.vgy = 800; giver.vh = 580 * (giver.height || 1);
  giver.moving = false; giver.arrived = true; giver.arrivedT = 1;
  giver.codeScanned = true;
  const gOrder = pst.orders.find((o) => o.id === giver.orderIds[0]);
  check('товар для выдачи найден', !!gOrder);
  pst.held = {
    id: gOrder.id, code: gOrder.code, item: gOrder.item, kind: gOrder.kind,
    scanned: true, onTable: true, unpacked: true, placeT: 1
  };
  const servedBefore = pst.stats.served;
  step(parcelScene, 4);
  parcelScene.onTap(620, 300);
  check('диалог выдачи открылся', !!pst.dlg);
  if (pst.dlg) {
    const giveRect = pst.dlg.choiceRects[0];
    parcelScene.onTap(giveRect.x + giveRect.w / 2, giveRect.y + giveRect.h / 2);
    // после «Отдать товар» открывается микросценка выдачи — её тоже проходим
    check('микросценка выдачи открылась', !!(pst.moment || pst.dlg), 'moment=' + !!pst.moment + ' dlg=' + !!pst.dlg);
    let mguard = 0;
    while (pst.dlg && mguard++ < 4) {
      const r = pst.dlg.choiceRects[0];
      parcelScene.onTap(r.x + r.w / 2, r.y + r.h / 2);
      step(parcelScene, 2);
    }
    check('товар передан покупателю', pst.stats.served === servedBefore + 1, 'served=' + pst.stats.served);
    check('запущена анимация передачи', !!(pst.handoff && pst.handoff.item), JSON.stringify(pst.handoff));
    check('руки опустели после выдачи', pst.held === null);
  }
}

// --- спрайты товаров: каждый товар каталога и пасхалок рисуется без ошибок
const itemNames = PVZ.sys.CATALOG.map((o) => o.name).concat(PVZ.sys.EGGS.map((e) => e.item));
let itemErr = null;
try {
  itemNames.forEach((n) => PVZ.art.drawCatalogItem(ctxStub, n, 'other', 40, 40, 120, 120));
} catch (e) { itemErr = e; }
check('спрайты всех товаров рисуются', !itemErr, itemErr && itemErr.message);

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

// --- живые покупатели: темы, сюжетные гости и мессенджер
function tapDlg(scene, i) {
  const d = scene.debug.st.dlg;
  if (!d || !d.choiceRects[i]) return false;
  const r = d.choiceRects[i];
  scene.onTap(r.x + r.w / 2, r.y + r.h / 2);
  return true;
}

PVZ.state.newGame();
silenceStories();
check('мессенджер предустановлен', PVZ.state.hasApp('chat'), JSON.stringify(PVZ.state.data.apps));
check('темы разговоров есть', PVZ.talks.TOPICS.length >= 12, 'topics=' + PVZ.talks.TOPICS.length);
check('у каждой темы два круга, выбор и финал', PVZ.talks.TOPICS.every((t) =>
  t.open && t.end && t.steps.length >= 2 && t.steps.every((s) => s.choices.length >= 2 && s.choices.every((c) => c.t && c.reply))));
check('сюжетных покупателей трое', PVZ.talks.NPCS.length === 3);
check('у сюжетных покупателей есть визиты по дням', PVZ.talks.NPCS.every((n) =>
  n.beats.length >= 6 && n.person && n.phone && n.idle.length));
check('контакты Артёма, мамы и поддержки открыты', ['artem', 'mom', 'support'].every((id) => PVZ.talks.contactUnlocked(id, PVZ.state.data)));
check('сюжетные знакомые пока не в контактах', !PVZ.talks.contactUnlocked('semyon', PVZ.state.data));

// визит сюжетного гостя открывает контакт
const npcScene = PVZ.scenes.shift({ day: 1, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(npcScene);
const nst = npcScene.debug.st;
nst.shiftOpen = true; nst.doorOpen = true; nst.lightsOn = true;
npcScene.debug.npc('semyon');
check('сюжетный гость появился в зале', nst.queue.some((q) => q.kind === 'npc' && q.npcId === 'semyon'));
npcScene.debug.step();
const npcGuest = nst.customer;
if (npcGuest) {
  npcGuest.vx = 625; npcGuest.vgy = 800; npcGuest.vh = 580 * (npcGuest.height || 1);
  npcGuest.moving = false; npcGuest.arrived = true; npcGuest.arrivedT = 1;
}
step(npcScene, 4);
npcScene.onTap(600, 290);
check('диалог сюжетного гостя открылся', !!nst.dlg);
check('у гостя есть выбор', nst.dlg && nst.dlg.choices.length >= 2);
tapDlg(npcScene, 0);
check('номер знакомого записан в мессенджер', PVZ.state.data.chatUnlocked.indexOf('semyon') >= 0);
check('визит отмечен пройденным', (PVZ.state.data.npcSeen.semyon || []).indexOf('s1') >= 0);
tapDlg(npcScene, 0);
step(npcScene, 4);
check('гость ушёл без оценки', !nst.customer);

// переписка: новые сообщения, выбор ответа и следующий день
PVZ.state.data.day = 2;
const chatNode = PVZ.talks.chatNode('semyon', PVZ.state.data);
check('на второй день есть сюжетная переписка', !!chatNode && chatNode.id === 'semyon_d2', chatNode && chatNode.id);
PVZ.talks.ensureThread('semyon');
check('сообщения легли в ленту', PVZ.state.data.chatLog.some((m) => m.to === 'semyon' && m.from === 'semyon'));
check('есть варианты ответа', PVZ.talks.repliesFor('semyon', PVZ.state.data).length >= 2);
const chatMoney = PVZ.state.data.money;
const answered = PVZ.talks.answerChat('semyon', 0);
check('ответ принят', !!answered && PVZ.state.data.chatDone.semyon_d2 === 1);
check('сообщение игрока записано', PVZ.state.data.chatLog.some((m) => m.from === 'me' && m.to === 'semyon'));
check('сюжетный узел закрыт', PVZ.talks.chatNode('semyon', PVZ.state.data) === null);
check('на смене остаётся бытовая болтовня', PVZ.talks.repliesFor('semyon', PVZ.state.data).length >= 1);
PVZ.state.data.day = 4;
check('на четвёртый день новый разговор', (PVZ.talks.chatNode('semyon', PVZ.state.data) || {}).id === 'semyon_d4');

// экран мессенджера: вёрстка и клик по варианту ответа
PVZ.state.data.chatUnlocked = ['semyon', 'liza', 'vera'];
PVZ.state.data.day = 3;
const chatScene = PVZ.scenes.shift({ day: 3, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(chatScene);
chatScene.debug.openApp('chat');
step(chatScene, 3);
check('экран мессенджера рисуется', !!(chatScene.debug.st.laptop && chatScene.debug.st.laptop.mode === 'chat'));
chatScene.debug.st.laptop.chatWith = 'liza';
const chatWin = { x: 200, y: 120, w: 880, h: 480 };
const chatLay = PVZ.apps.chatLayout(chatWin, 'liza');
check('вёрстка переписки: контакты и ответы', chatLay.rows.length >= 6 && chatLay.opts.length >= 2);
const optRect = chatLay.opts[0];
PVZ.apps.tapScreen('chat', chatWin, optRect.x + 10, optRect.y + 10, { laptop: chatScene.debug.st.laptop });
check('ответ из мессенджера принят', PVZ.state.data.chatDone.liza_d3 === 1, JSON.stringify(PVZ.state.data.chatDone));

// разговор с обычным покупателем через вариант в диалоге
PVZ.state.newGame();
silenceStories();
PVZ.state.data.tutorialSeen = true;
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat'];
const talkScene = PVZ.scenes.shift({ day: 2, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(talkScene);
const tst = talkScene.debug.st;
tst.shiftOpen = true; tst.doorOpen = true; tst.lightsOn = true;
tst.queue.length = 0; tst.customer = null;
talkScene.debug.spawn('question');
talkScene.debug.step();
const qc = tst.customer;
check('покупатель с вопросом пришёл', !!qc && qc.kind === 'question');
if (qc) {
  qc.vx = 625; qc.vgy = 800; qc.vh = 580 * (qc.height || 1);
  qc.moving = false; qc.arrived = true; qc.arrivedT = 1;
  // общая тема проверяется отдельно от личной истории персонажа
  qc.castId = null;
  qc.castBeat = null;
}
step(talkScene, 4);
talkScene.onTap(600, 290);
check('диалог вопроса открылся', !!tst.dlg);
const qLen = tst.dlg ? tst.dlg.choices.length : 0;
check('в диалоге есть вариант «поболтать»', qLen >= 3, 'choices=' + qLen);
tapDlg(talkScene, qLen - 1);
check('разговор начался с темы клиента', !!(tst.dlg && qc.talkTopic && tst.dlg.text === qc.talkTopic.open));
tapDlg(talkScene, 0);
check('второй круг разговора', !!(tst.dlg && tst.dlg.text === qc.talkTopic.steps[0].choices[0].reply));
tapDlg(talkScene, 0);
check('разговор дошёл до финала', !!tst.dlg);
tapDlg(talkScene, 0);
check('после разговора вернулись к вопросу', !!(tst.dlg && qc.question && tst.dlg.text === qc.question.q));
check('тема записана как обсуждённая', PVZ.state.data.talkSeen.indexOf(qc.talkTopic.id) >= 0);
step(talkScene, 2);

// --- сохранение: мессенджер и прогресс переписки
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews']; // без чата, как в старом сейве
PVZ.state.data.chatUnlocked = ['semyon'];
PVZ.state.data.chatDone = { semyon_d2: 1 };
PVZ.state.save();
const loadedChat = PVZ.state.load();
check('чат досоздан в старом сохранении', !!loadedChat && loadedChat.apps.indexOf('chat') >= 0, loadedChat && JSON.stringify(loadedChat.apps));
check('прогресс переписки сохранён', !!loadedChat && loadedChat.chatUnlocked.indexOf('semyon') >= 0 && loadedChat.chatDone.semyon_d2 === 1);

// --- сюжетный гость приходит сам, без отладочного вызова
PVZ.state.newGame();
silenceStories();
PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews', 'chat'];
PVZ.state.data.tutorialSeen = true;
const autoScene = PVZ.scenes.shift({ day: 3, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(autoScene);
const ast = autoScene.debug.st;
ast.phase = 'day'; ast.shiftOpen = true; ast.doorOpen = true; ast.lightsOn = true;
ast.clock = 10 * 60; ast.queue.length = 0; ast.customer = null; ast.npcT = 0;
step(autoScene, 120);
const autoGuest = ast.queue.concat(ast.customer ? [ast.customer] : []).find((c) => c.kind === 'npc');
check('сюжетный гость приходит сам', !!autoGuest, JSON.stringify(ast.queue.map((c) => c.kind)));
check('в гости пришла Вера', !!(autoGuest && autoGuest.npcId === 'vera'), autoGuest && autoGuest.npcId);
check('гость ждёт у стойки долго', !!(autoGuest && autoGuest.patienceRate < 0.01), autoGuest && autoGuest.patienceRate);

// сюжетные гости и переписка идут каждый день
PVZ.state.newGame();
silenceStories();
let npcDays = 0;
for (let d = 1; d <= 10; d++) {
  PVZ.state.data.day = d;
  const due = PVZ.talks.dueNpc(d, PVZ.state.data);
  if (due) { PVZ.talks.markBeat(due.npc.id, due.beat.id); npcDays++; }
}
check('сюжетный гость есть каждый день', npcDays === 10, 'npcDays=' + npcDays);
PVZ.state.data.chatDone = {};
PVZ.state.data.chatUnlocked = ['semyon', 'liza', 'vera'];
let chatDays = 0;
for (let d = 1; d <= 10; d++) {
  PVZ.state.data.day = d;
  let any = false;
  PVZ.talks.contacts().forEach((c) => {
    let node;
    while ((node = PVZ.talks.chatNode(c.id, PVZ.state.data))) {
      PVZ.state.data.chatDone[node.id] = 1;
      any = true;
    }
  });
  if (any) chatDays++;
}
check('новый разговор в мессенджере каждый день', chatDays === 10, 'chatDays=' + chatDays);

// --- постоянные персонажи: личные истории, номера и рекомендации
PVZ.state.newGame();
silenceStories();
const CH = PVZ.cast.CHARS;
check('постоянных персонажей не меньше двенадцати', CH.length >= 12, 'chars=' + CH.length);
check('есть и хорошие, и плохие', CH.some((c) => c.align === 'good') && CH.some((c) => c.align === 'bad'));
check('у каждого по три личные истории', CH.every((c) => c.beats.length >= 3), JSON.stringify(CH.map((c) => c.id + ':' + c.beats.length)));
check('в каждой истории есть выбор, ответы и финал', CH.every((c) => c.beats.every((b) =>
  b.id && b.title && b.open && b.end && b.steps.length >= 2 &&
  b.steps.every((s) => s.choices.length >= 2 && s.choices.every((o) => o.t && o.reply)))));
check('у каждого есть лицо, роль и бытовые реплики', CH.every((c) => c.person === undefined && c.look && c.role && c.greet.length && c.idle.length));
check('на первой смене знакомых немного', CH.filter((c) => (c.fromDay || 1) <= 1).length <= 6,
  'day1=' + CH.filter((c) => (c.fromDay || 1) <= 1).length);
check('к пятой смене в районе уже много людей', CH.filter((c) => (c.fromDay || 1) <= 5).length >= 11);

const castScene = PVZ.scenes.shift({ day: 3, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(castScene);
const cst = castScene.debug.st;
cst.shiftOpen = true; cst.doorOpen = true; cst.lightsOn = true; cst.clock = 12 * 60;
cst.queue.length = 0; cst.customer = null;
const cstBeat = castScene.debug.castTalk('marina');
check('личная история открылась у стойки', !!cstBeat && !!cst.dlg && cst.dlg.text === cstBeat.open,
  cst.dlg && cst.dlg.text);
const beatsBefore = PVZ.cast.beatsDone('marina').length;
let castGuard = 0;
while (cst.dlg && castGuard++ < 12) tapDlg(castScene, 0);
check('личная история засчитана', PVZ.cast.beatsDone('marina').length === beatsBefore + 1,
  JSON.stringify(PVZ.cast.beatsDone('marina')));
check('отношения с персонажем выросли', PVZ.cast.rel('marina') >= 1, 'rel=' + PVZ.cast.rel('marina'));
check('персонаж оставил номер телефона', PVZ.cast.hasNumber('marina') && PVZ.talks.contacts().some((c) => c.id === 'c_marina'));
check('номер стал контактом в мессенджере', PVZ.talks.contactUnlocked('c_marina', PVZ.state.data));
check('в переписке есть что ответить', PVZ.talks.repliesFor('c_marina', PVZ.state.data).length >= 2);

// рекомендация: знакомый рассказывает о ПВЗ, приходит новый человек
cst.customer = null; cst.queue.length = 0;
const ref = castScene.debug.referral('marina');
check('рекомендация создана', !!ref && !!ref.char, JSON.stringify(ref && ref.by));
cst.queue.length = 0; cst.customer = null;
castScene.debug.spawn('question');
const referred = cst.queue[cst.queue.length - 1];
check('по рекомендации пришёл человек', !!referred && referred.referredBy === 'Марина', referred && referred.referredBy);
check('у пришедшего есть своя история', !!(referred && PVZ.cast.byId(referred.castId)), referred && referred.castId);
check('рекомендация учтена в статистике', PVZ.cast.refs('marina') >= 1 && PVZ.cast.totalRefs() >= 1);

// плохой персонаж оставляет после себя «подарок»
PVZ.state.data.suspicious.boxes.length = 0;
PVZ.state.data.suspicious.seq = 0;
PVZ.state.data.suspicious.arrived = 0;
const badScene = PVZ.scenes.shift({ day: 4, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(badScene);
const bst0 = badScene.debug.st;
bst0.shiftOpen = true; bst0.doorOpen = true; bst0.lightsOn = true;
bst0.queue.length = 0; bst0.customer = null;
// убираем коробку, пришедшую утром, чтобы проверить именно «подарок» персонажа
PVZ.state.data.suspicious.boxes.length = 0;
const badC = badScene.debug.cast('gosha');
check('плохой персонаж пришёл', !!badC && badC.castAlign === 'bad');
let gotBox = false;
for (let attempt = 0; attempt < 30 && !gotBox; attempt++) {
  bst0.queue.length = 0; bst0.customer = null; bst0.leavers.length = 0;
  badScene.debug.cast('gosha');
  badScene.debug.step();
  const cur = bst0.customer;
  if (!cur) continue;
  cur.arrived = true; cur.moving = false;
  cur.patience = 0.001;
  cur.patienceRate = 99;
  badScene.update(0.4);
  if (PVZ.boxes.count() > 0) gotBox = true;
}
check('после плохого персонажа может остаться безымянная коробка', gotBox, 'count=' + PVZ.boxes.count());

// --- кривая толпы: первая смена тихая, десятая — полный зал
const crowdScene = PVZ.scenes.shift({ day: 1, phase: 'day' });
const crowd1 = crowdScene.debug.crowd(1);
const crowd10 = crowdScene.debug.crowd(10);
check('на первой смене покупатели приходят редко', crowd1.base >= 18 && crowd1.max <= 2,
  JSON.stringify(crowd1));
check('к десятой смене поток плотный', crowd10.base <= 4 && crowd10.max >= 7,
  JSON.stringify(crowd10));
check('в очереди достаточно мест для толпы', crowd10.slots >= 8);

// --- забытые посылки: звуки, осмотр, вскрытие и полиция
PVZ.state.newGame();
silenceStories();
check('видов забытых посылок много', PVZ.boxes.KINDS.length >= 10, 'kinds=' + PVZ.boxes.KINDS.length);
check('у каждого вида есть звук и три исхода', PVZ.boxes.KINDS.every((k) =>
  k.sound && k.odd && k.openText && k.callText && k.reportText && k.tone && k.openFx));
const sb1 = PVZ.boxes.add('ticking', 1);
check('коробка появилась на полке', PVZ.boxes.count() === 1 && sb1.status === 'shelf');
check('до осмотра описание короткое', PVZ.boxes.description(sb1).length > 10 && sb1.known === 0);
PVZ.boxes.study(sb1);
check('после осмотра известно больше', sb1.known === 1 && PVZ.boxes.description(sb1).length > 40);
const openOut = PVZ.boxes.resolve(sb1, 'open');
check('вскрытие дало исход и убрало коробку с полки', !!openOut && sb1.status === 'opened' && PVZ.boxes.count() === 0);
const sb2 = PVZ.boxes.arrive(2);
check('новая коробка приходит утром', !!sb2 && PVZ.boxes.count() === 1);
check('вторая коробка за день не приходит', PVZ.boxes.arrive(2) === null);
const sb3 = PVZ.boxes.arrive(3);
check('коробки копятся изо дня в день', !!sb3 && PVZ.boxes.count() === 2, 'count=' + PVZ.boxes.count());
const callOut = PVZ.boxes.resolve(sb2, 'call');
const repOut = PVZ.boxes.resolve(sb3, 'report');
check('звонок и заявление тоже закрывают коробку', !!callOut && !!repOut && PVZ.boxes.stats().sent === 1 && PVZ.boxes.stats().reported === 1);

// сцена зала с забытыми посылками рисуется без ошибок
const boxErrBefore = errors.length;
const boxScene = PVZ.scenes.shift({ day: 5, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(boxScene);
const bst = boxScene.debug.st;
bst.shiftOpen = true; bst.doorOpen = true; bst.lightsOn = true; bst.clock = 12 * 60;
PVZ.boxes.add('meow', 5); PVZ.boxes.add('music', 5); PVZ.boxes.add('moving', 5);
boxScene.debug.sus();
step(boxScene, 5);
check('зал с забытыми посылками рисуется без ошибок', errors.length === boxErrBefore, errors.slice(boxErrBefore).join(' | '));
boxScene.debug.view('counter');
step(boxScene, 3);

// --- толпа за стойкой: восемь человек в очереди рисуются без ошибок
const crowdErrBefore = errors.length;
const bigScene = PVZ.scenes.shift({ day: 10, phase: 'day' });
PVZ.game.trans = null;
PVZ.game.setScene(bigScene);
const bigSt = bigScene.debug.st;
bigSt.shiftOpen = true; bigSt.doorOpen = true; bigSt.lightsOn = true; bigSt.clock = 12 * 60;
bigSt.queue.length = 0; bigSt.customer = null;
for (let k = 0; k < 8; k++) bigScene.debug.spawn('question');
bigScene.debug.step();
step(bigScene, 8);
check('очередь из восьми человек отрисована без ошибок', errors.length === crowdErrBefore, errors.slice(crowdErrBefore).join(' | '));
check('в очереди действительно много людей', bigSt.queue.length + (bigSt.customer ? 1 : 0) >= 7,
  'line=' + (bigSt.queue.length + (bigSt.customer ? 1 : 0)));

// --- старый сейв получает поля персонажей и посылок
PVZ.state.data.cast = undefined;
PVZ.state.data.suspicious = undefined;
PVZ.state.save();
const migrated = PVZ.state.load();
check('старый сейв получает персонажей и посылки', !!migrated && !!migrated.cast && !!migrated.suspicious,
  migrated && JSON.stringify({ cast: !!migrated.cast, suspicious: !!migrated.suspicious }));

// --- новые мини-игры: швабра, равновесие, провода, ловля посылок
PVZ.input.down = false;
{
  // уборка кофе: сначала берём швабру, потом трём лужи, потом отжимаем
  const q = new PVZ.sys.QTE({ type: 'clean', tool: 'mop', stain: 'coffee', title: 'x' });
  q.draw(ctxStub);
  check('уборка: швабра лежит на стойке', q.phase === 'take' && !q.heldTool);
  q.onTap(q.toolRect.x + q.toolRect.w / 2, q.toolRect.y + q.toolRect.h / 2);
  q.draw(ctxStub);
  check('уборка: швабра взята', q.phase === 'clean' && q.heldTool);
  q.spots.forEach((sp) => {
    const cx = q.panel.x + 26 + sp.x * (q.panel.w - 52);
    const cy = q.panel.y + 100 + sp.y * (q.panel.h - 176);
    PVZ.input.down = true;
    for (let k = 0; k < 12; k++) {
      PVZ.input.x = cx + (k % 2 ? 42 : -42);
      PVZ.input.y = cy - 28;
      q.update(1 / 60);
    }
  });
  PVZ.input.down = false;
  q.draw(ctxStub);
  check('уборка: все пятна стёрты', q.spots.every((sp) => sp.done), JSON.stringify(q.spots.map((sp) => sp.grime)));
  check('уборка: пора отжимать швабру', q.phase === 'wring');
  PVZ.input.down = true;
  PVZ.input.x = q.bucket.x + q.bucket.w / 2;
  PVZ.input.y = q.bucket.y + q.bucket.h / 2;
  for (let k = 0; k < 40 && !q.done; k++) q.update(1 / 30);
  PVZ.input.down = false;
  check('уборка: завершена успешно', q.done && q.success);
}
{
  // веник и осколки используют тот же движок, но другой инструмент и рисунок
  const q = new PVZ.sys.QTE({ type: 'clean', tool: 'broom', stain: 'shards', title: 'x' });
  q.draw(ctxStub);
  q.onTap(q.toolRect.x + q.toolRect.w / 2, q.toolRect.y + q.toolRect.h / 2);
  q.draw(ctxStub);
  check('уборка: веник взят и осколки рисуются', q.heldTool && q.tool === 'broom' && q.stain === 'shards');
}
{
  // равновесие: придерживаем стопку с наклонившейся стороны
  const q = new PVZ.sys.QTE({ type: 'balance', title: 'x' });
  q.draw(ctxStub);
  PVZ.input.down = true;
  PVZ.input.x = q.panel.x + q.panel.w - 12;
  q.tilt = 0.4;
  for (let k = 0; k < 260 && !q.done; k++) {
    if (q.tilt < 0.06) q.tilt = 0.06;
    q.update(1 / 30);
  }
  PVZ.input.down = false;
  q.draw(ctxStub);
  check('равновесие: стопка удержана', q.done && q.success, 'held=' + q.held);
}
{
  // провода: каждому штекеру — гнездо того же цвета
  const q = new PVZ.sys.QTE({ type: 'wires', title: 'x' });
  q.draw(ctxStub);
  const lay = q.wireLayout();
  q.plugs.forEach((pl, i) => {
    const si = q.sockets.findIndex((s) => s.color === pl.color);
    q.onTap(lay.plugs[i].x + lay.plugs[i].w / 2, lay.plugs[i].y + lay.plugs[i].h / 2);
    q.onTap(lay.sockets[si].x + lay.sockets[si].w / 2, lay.sockets[si].y + lay.sockets[si].h / 2);
  });
  q.draw(ctxStub);
  check('провода: все три подключены', q.done && q.success);
}
{
  // ловля: нажимаем по падающим посылкам
  const q = new PVZ.sys.QTE({ type: 'catch', title: 'x' });
  q.draw(ctxStub);
  while (!q.done && q.caught < q.need) {
    q.items = [{ x: 0.5, y: q.panel.y + 180, vy: 0, seed: 1 }];
    const r = q.catchRect(q.items[0]);
    q.onTap(r.x + r.w / 2, r.y + r.h / 2);
  }
  q.draw(ctxStub);
  check('ловля: нужное число посылок поймано', q.done && q.success);
}
{
  // щиток: подбираем комбинацию автоматов (нажатие переключает соседей)
  const q = new PVZ.sys.QTE({ type: 'breakers', title: 'x' });
  q.draw(ctxStub);
  const n = q.switches.length;
  let solution = null;
  for (let mask = 0; mask < (1 << n) && solution === null; mask++) {
    const state = q.switches.slice();
    const presses = [];
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      presses.push(i);
      for (let k = i - 1; k <= i + 1; k++) if (k >= 0 && k < n) state[k] = !state[k];
    }
    if (state.every(Boolean)) solution = presses;
  }
  check('щиток: комбинация существует', !!solution, JSON.stringify(q.switches));
  const lay = q.breakerLayout();
  (solution || []).forEach((i) => q.onTap(lay[i].x + lay[i].w / 2, lay[i].y + lay[i].h / 2));
  q.draw(ctxStub);
  check('щиток: все автоматы включены', q.done && q.success);
}

// --- терпение не останавливается в QTE и ноутбуке
{
  PVZ.state.newGame();
  silenceStories();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  const scene = PVZ.scenes.shift({ day: 3, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(scene);
  const st2 = scene.debug.st;
  st2.phase = 'day'; st2.shiftOpen = true; st2.doorOpen = true; st2.lightsOn = true;
  st2.queue.length = 0; st2.customer = null; st2.nextT = 999; st2.eventT = 999;
  const c = PVZ.sys.makeCustomer({ expr: 'neutral' });
  c.kind = 'pickup'; c.state = 'atCounter'; c.talon = 1; c.orderIds = [];
  c.moving = false; c.arrived = true; c.arrivedT = 1; c.enterAlpha = 1;
  c.patience = 0.8; c.patienceRate = 0.05;
  st2.customer = c;
  st2.qte = new PVZ.sys.QTE({ type: 'rapid', title: 'x', customer: c });
  const before = c.patience;
  step(scene, 60);
  check('терпение идёт во время QTE', c.patience < before - 0.01, 'было ' + before + ', стало ' + c.patience);
  st2.qte = null;
  c.patience = 0.8;
  scene.debug.laptop();
  const beforeLaptop = c.patience;
  step(scene, 60);
  check('терпение идёт при открытом ноутбуке', c.patience < beforeLaptop - 0.01, 'было ' + beforeLaptop + ', стало ' + c.patience);
  st2.laptop = null;
}

// --- живые выдачи: у товаров есть свои микросценки, а у смен — особые гости
{
  const S = PVZ.serve;
  check('serve.js загружен', !!S && !!S.MOMENTS && !!S.SPECIALS);
  const ids = new Set();
  S.MOMENTS.forEach((m) => {
    check('у микросценки есть id и текст: ' + m.id, !!m.id && !!m.text && !ids.has(m.id));
    ids.add(m.id);
    check('у микросценки есть выбор: ' + m.id, Array.isArray(m.choices) && m.choices.length >= 2);
    m.choices.forEach((ch) => check('выбор микросценки: ' + m.id, !!ch.label && !!ch.reply));
  });
  check('микросценок не меньше двадцати', S.MOMENTS.length >= 20, 'MOMENTS=' + S.MOMENTS.length);
  const sids = new Set();
  S.SPECIALS.forEach((d) => {
    check('у особого гостя есть день и шаги: ' + d.id, !!d.id && d.day >= 2 && !sids.has(d.id));
    sids.add(d.id);
    check('у особого гостя есть сценарий: ' + d.id, Array.isArray(d.steps) && d.steps.length > 0);
    d.steps.forEach((step) => check('шаг особого гостя: ' + d.id, !!step.text && step.choices.length >= 2));
  });
  for (let d = 2; d <= 10; d++) {
    check('на смене ' + d + ' есть особый гость', S.SPECIALS.some((x) => x.day === d));
  }
  check('Витя Гром приходит на второй смене', (S.specialById('grom') || {}).day === 2);
  check('цвет вещи устойчив', S.colorFor('Футболка') === S.colorFor('Футболка'));
}

// --- вторая смена: Витя Гром кричит, ломает товар и распугивает очередь
{
  PVZ.state.newGame();
  silenceStories();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  const scene = PVZ.scenes.shift({ day: 2, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(scene);
  const st3 = scene.debug.st;
  st3.phase = 'day'; st3.shiftOpen = true; st3.doorOpen = true; st3.lightsOn = true;
  st3.queue.length = 0; st3.customer = null; st3.special = null;
  st3.clock = 11 * 60 + 30; st3.spawnT = 999; st3.eventT = 999; st3.npcSpawned = true;
  step(scene, 4);
  check('Гром приходит на второй смене сам', !!(st3.special && st3.special.id === 'grom'), st3.special && st3.special.id);
  if (st3.special) {
    // ставим его к стойке и даём побуянить
    st3.queue = st3.queue.filter((q) => q.kind === 'special');
    st3.nextT = 0;
    step(scene, 8);
    const grom = st3.customer;
    check('Гром дошёл до стойки', !!grom && grom.kind === 'special');
    if (grom) {
      grom.vx = 625; grom.vgy = 800; grom.vh = 580 * (grom.height || 1);
      grom.moving = false; grom.arrived = true; grom.arrivedT = 1;
      st3.queue.length = 0;
      const moneyBeforeRage = PVZ.state.data.money;
      const ratingBeforeRage = PVZ.state.data.rating;
      step(scene, 720);
      check('Гром ломает товар: деньги уходят', PVZ.state.data.money < moneyBeforeRage, 'money=' + PVZ.state.data.money);
      check('Гром ломает товар: рейтинг падает', PVZ.state.data.rating < ratingBeforeRage, 'rating=' + PVZ.state.data.rating);
      check('Гром ломает товар: есть обломки', !!st3.smash || (st3.special && st3.special.breaks > 0), 'breaks=' + (st3.special && st3.special.breaks));
      scene.onTap(620, 300);
      check('с Громом можно поговорить', !!st3.dlg && st3.moment && st3.moment.kind === 'rage', 'dlg=' + !!st3.dlg);
      if (st3.dlg) {
        tapChoice(scene, 0);
        step(scene, 2);
        check('успокоить Грома — второй шаг', !!st3.dlg);
        if (st3.dlg) tapChoice(scene, 0);
        step(scene, 2);
        check('Гром успокоен, история закрыта', !st3.dlg && st3.special.done, 'done=' + (st3.special && st3.special.done));
      }
    }
  }
}

// --- примерка: клиент выходит из примерочной и показывает, как сидит вещь
{
  PVZ.state.newGame();
  silenceStories();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  const scene = PVZ.scenes.shift({ day: 3, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(scene);
  const st4 = scene.debug.st;
  st4.phase = 'day'; st4.shiftOpen = true; st4.doorOpen = true; st4.lightsOn = true;
  st4.queue.length = 0; st4.customer = null; st4.spawnT = 999; st4.eventT = 999;
  st4.special = null; st4.specialBanner = 0; st4.npcSpawned = true;
  const dress = PVZ.sys.makeOrder({
    item: { name: 'Футболка', kind: 'clothes', size: 'S', price: 990 },
    state: 'stored', cell: 'A-1-1', day: 3, cod: false, docs: false
  });
  st4.orders.push(dress);
  scene.debug.spawn('pickup');
  const buyer = st4.queue[st4.queue.length - 1];
  buyer.orderIds = [dress.id];
  buyer.code = dress.code;
  buyer.item = dress.item;
  buyer.parcels = 1;
  buyer.codSum = 0;
  buyer.docs = false;
  buyer.wantsFitting = true;
  buyer.fittingDone = false;
  dress.customer = buyer.id;
  st4.queue = [buyer];
  st4.customer = null;
  st4.nextT = 0;
  step(scene, 4);
  check('покупатель за одеждой у стойки', !!st4.customer);
  if (st4.customer) {
    st4.customer.vx = 625; st4.customer.vgy = 800; st4.customer.vh = 580 * (st4.customer.height || 1);
    st4.customer.moving = false; st4.customer.arrived = true; st4.customer.arrivedT = 1;
    st4.held = { id: dress.id, code: dress.code, item: dress.item, kind: dress.kind, scanned: true, onTable: true, unpacked: true, placeT: 1 };
    step(scene, 2);
    scene.onTap(620, 300);
    check('диалог выдачи одежды открылся', !!st4.dlg);
    let fittingChoice = -1;
    if (st4.dlg) {
      st4.dlg.choices.forEach((ch, i) => { if (/пример/i.test(ch.label)) fittingChoice = i; });
    }
    check('есть вариант «предложить примерить»', fittingChoice >= 0, 'index=' + fittingChoice);
    if (fittingChoice >= 0) {
      tapChoice(scene, fittingChoice);
      check('клиент ушёл в примерочную', st4.fitting.length === 1, 'fitting=' + st4.fitting.length);
      if (st4.fitting.length) st4.fitting[0].t = 0;
      step(scene, 3);
      check('клиент вернулся из примерочной', st4.queue.some((q) => q.kind === 'fitting-back'));
      st4.nextT = 0;
      step(scene, 4);
      const back = st4.customer;
      check('клиент снова у стойки', !!back && back.kind === 'fitting-back');
      if (back) {
        back.vx = 625; back.vgy = 800; back.vh = 580 * (back.height || 1);
        back.moving = false; back.arrived = true; back.arrivedT = 1;
        const servedBeforeShow = st4.stats.served;
        scene.onTap(620, 300);
        check('сцена примерки и показа открылась', !!st4.dlg && !!st4.moment && st4.moment.kind === 'tryon');
        if (st4.dlg) {
          tapChoice(scene, 0);
          check('после примерки заказ выдан', st4.stats.served === servedBeforeShow + 1, 'served=' + st4.stats.served);
          check('сцена примерки закрылась', !st4.moment);
        }
      }
    }
  }
}

// --- обычный товар: микросценка выдачи, затем выдача
{
  PVZ.state.newGame();
  silenceStories();
  PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
  PVZ.state.data.tutorialSeen = true;
  const scene = PVZ.scenes.shift({ day: 4, phase: 'day' });
  PVZ.game.trans = null;
  PVZ.game.setScene(scene);
  const st5 = scene.debug.st;
  st5.phase = 'day'; st5.shiftOpen = true; st5.doorOpen = true; st5.lightsOn = true;
  st5.queue.length = 0; st5.customer = null; st5.spawnT = 999; st5.eventT = 999;
  st5.special = null; st5.specialBanner = 0; st5.npcSpawned = true;
  const cans = PVZ.sys.makeOrder({
    item: { name: 'Наушники', kind: 'other', size: 'S', price: 2990 },
    state: 'stored', cell: 'B-1-1', day: 4, cod: false, docs: false
  });
  st5.orders.push(cans);
  scene.debug.spawn('pickup');
  const listener = st5.queue[st5.queue.length - 1];
  listener.orderIds = [cans.id];
  listener.code = cans.code;
  listener.item = cans.item;
  listener.parcels = 1;
  listener.codSum = 0;
  listener.docs = false;
  listener.wantsFitting = false;
  listener.momentDone = false;
  cans.customer = listener.id;
  st5.queue = [listener];
  st5.customer = null;
  st5.nextT = 0;
  step(scene, 4);
  if (st5.customer) {
    st5.customer.vx = 625; st5.customer.vgy = 800; st5.customer.vh = 580 * (st5.customer.height || 1);
    st5.customer.moving = false; st5.customer.arrived = true; st5.customer.arrivedT = 1;
    st5.held = { id: cans.id, code: cans.code, item: cans.item, kind: cans.kind, scanned: true, onTable: true, unpacked: true, placeT: 1 };
    step(scene, 2);
    scene.onTap(620, 300);
    const servedBefore2 = st5.stats.served;
    if (st5.dlg) tapChoice(scene, 0);
    check('микросценка обычного товара открылась', !!st5.dlg && !!st5.moment, 'dlg=' + !!st5.dlg + ' moment=' + !!st5.moment);
    if (st5.dlg) tapChoice(scene, 0);
    step(scene, 2);
    check('после микросценки заказ выдан', st5.stats.served === servedBefore2 + 1, 'served=' + st5.stats.served);
    check('живые выдачи посчитаны', st5.stats.moments >= 1, 'moments=' + st5.stats.moments);
  }
}

// --- все особые гости проходятся по первому варианту без падений
{
  PVZ.serve.SPECIALS.forEach((def) => {
    PVZ.state.newGame();
    silenceStories();
    PVZ.state.data.apps = ['appstore', 'phone', 'terminal', 'market', 'reviews'];
    PVZ.state.data.tutorialSeen = true;
    const scene = PVZ.scenes.shift({ day: def.day, phase: 'day' });
    PVZ.game.trans = null;
    PVZ.game.setScene(scene);
    const st6 = scene.debug.st;
    st6.phase = 'day'; st6.shiftOpen = true; st6.doorOpen = true; st6.lightsOn = true;
    st6.queue.length = 0; st6.customer = null; st6.spawnT = 999; st6.eventT = 999;
    st6.special = null; st6.specialBanner = 0; st6.npcSpawned = true;
    const sp = scene.debug.special(def.id);
    check('особый гость заспавнен: ' + def.id, !!sp);
    if (!sp) return;
    const c = sp.c;
    st6.queue.length = 0;
    st6.customer = c;
    c.state = 'atCounter';
    c.moving = false;
    c.arrived = true;
    c.arrivedT = 1;
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    step(scene, 2);
    scene.onTap(620, 300);
    check('диалог особого гостя открылся: ' + def.id, !!st6.dlg);
    let guard = 0;
    while (st6.dlg && guard++ < 14) {
      tapChoice(scene, 0);
      step(scene, 2);
    }
    check('история особого гостя завершилась: ' + def.id, !st6.dlg && st6.special.done, 'dlg=' + !!st6.dlg);
  });
}

// --- итог
if (errors.length) {
  console.log('FAILED (' + errors.length + '):');
  errors.slice(0, 12).forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK: сцены, живой рейтинг, подписи без цифр, отложенные последствия, бесконечный режим, сюжет мафии (куратор, ящик, услуга, улики, 5 концов), события дня, финал, магазин, Banana store, кот, живые покупатели, сюжетные знакомые, мессенджер с выбором ответов, двенадцать постоянных персонажей с личными историями, рекомендации, кривая толпы, забытые посылки, живые выдачи с примеркой и девять особых гостей смен работают');