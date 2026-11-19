/* Проверка App Market: установка приложений, гейтинг смены и страшная музыка.
   Запуск: node tools/probe-apps.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'game');
const errors = [];
const noop = () => {};
const gradient = () => ({ addColorStop: noop });
const canvas = {
  width: 1280, height: 720, style: {}, focus: noop,
  getContext: () => ctxStub,
  addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 })
};
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
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
const buttons = {};
function el(id) {
  if (id === 'game') return canvas;
  if (!buttons[id]) buttons[id] = { style: {}, classList: { toggle: noop, add: noop, remove: noop }, addEventListener: noop, appendChild: noop };
  return buttons[id];
}
global.window = global;
global.document = {
  readyState: 'complete', getElementById: el, addEventListener: noop, hidden: false,
  fullscreenElement: null, documentElement: { requestFullscreen: noop, style: {} }, createElement: () => canvas
};
global.localStorage = localStorage;
global.navigator = { maxTouchPoints: 0, userAgent: 'probe' };
global.devicePixelRatio = 1;
global.requestAnimationFrame = noop;
global.cancelAnimationFrame = noop;
global.location = { search: '', href: 'file:///game/index.html' };
global.addEventListener = noop;
global.removeEventListener = noop;
global.URLSearchParams = URLSearchParams;

for (const f of ['core.js', 'art.js', 'systems.js', 'apps.js', 'scenes.js', 'main.js']) {
  try {
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f });
  } catch (e) {
    errors.push('load ' + f + ': ' + e.message);
  }
}

const PVZ = global.PVZ;
const log = [];
const ok = (cond, text) => { log.push((cond ? 'OK  ' : 'FAIL') + ' ' + text); if (!cond) errors.push('FAIL: ' + text); return cond; };

function step(scene, n, dt) {
  for (let i = 0; i < n; i++) {
    try { scene.update(dt || 1 / 60); } catch (e) { errors.push('update: ' + (e.stack || e)); return; }
    try { scene.draw(ctxStub); } catch (e) { errors.push('draw: ' + (e.stack || e)); return; }
  }
}
function tap(x, y) { PVZ.input.dispatch('tap', x, y); }

try {
  PVZ.state.newGame();
  const d = PVZ.state.data;
  ok(d.apps.indexOf('appstore') >= 0 && d.apps.indexOf('phone') >= 0, 'на старте есть App Market и Телефон');
  ok(!PVZ.state.hasApp('terminal') && !PVZ.state.hasApp('market') && !PVZ.state.hasApp('reviews') && !PVZ.state.hasApp('game'),
    'терминала, маркета, отзывов и мини-игры нет');
  ok(!PVZ.apps.coreReady(), 'смена заблокирована: обязательных приложений нет');

  const s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
  PVZ.game.setScene(s);
  const st = s.debug.st;
  ok(st.objectives.some((o) => o.id === 'apps' && !o.done), 'утренняя задача «установить приложения» есть');

  // без терминала T ведёт в App Market
  tap(0, 0);
  s.debug.terminal();
  ok(!st.terminal && st.laptop && st.laptop.mode === 'appstore', 'без терминала открывается App Market');

  // витрина: 3 страницы и установка всех обязательных
  const storeUI = st.laptop.appstore;
  ok(storeUI.items().length >= 15, 'в магазине много приложений: ' + storeUI.items().length);
  ['terminal', 'market', 'reviews'].forEach((id) => {
    storeUI.install(id);
    for (let i = 0; i < 100 && !PVZ.state.hasApp(id); i++) storeUI.update(0.05);
    ok(PVZ.state.hasApp(id), 'установлено: ' + id);
  });
  storeUI.update(0.05);
  step(s, 3);
  const appsOb = st.objectives.find((o) => o.id === 'apps');
  ok(appsOb && appsOb.done, 'задача установки закрыта');
  ok(PVZ.apps.coreReady(), 'все обязательные приложения стоят');

  // теперь терминал открывается, смена стартует
  tap(0, 0);
  s.debug.terminal();
  ok(!!st.terminal, 'терминал открывается после установки');
  st.terminal.tap(370, 528);
  ok(st.shiftOpen, 'смена открыта после установки приложений');

  // мини-игру можно не ставить
  ok(!PVZ.state.hasApp('game'), 'мини-игра осталась необязательной');

  // установить всё остальное и открыть каждый экран
  PVZ.state.data.money = 999999;
  PVZ.apps.storeApps().forEach((a) => {
    if (!PVZ.state.hasApp(a.id)) {
      const res = PVZ.state.installApp(a.id);
      if (!res.ok) errors.push('install ' + a.id + ': ' + res.reason);
    }
  });
  const installed = PVZ.apps.desktopApps();
  ok(installed.length >= 15, 'ярлыков на рабочем столе: ' + installed.length);
  ok(s.debug.st.laptop && s.debug.st.laptop.mode === 'appstore', 'витрина осталась открытой');
  s.debug.st.laptop.mode = 'home';
  step(s, 3);

  installed.forEach((a) => {
    st.laptop.mode = 'home';
    st.laptop.page = 0;
    if (a.id === 'terminal') return; // терминал открывает отдельное окно, проверим ниже
    s.debug.openApp(a.id);
    step(s, 2);
    const mode = st.laptop && st.laptop.mode;
    if (!(mode === a.id || (a.id === 'market' && mode === 'shop'))) errors.push('не открылось приложение ' + a.id + ' (mode=' + mode + ')');
    if (st.terminal) st.laptop = null;
  });
  ok(true, 'все экраны приложений рисуются без ошибок');

  // терминал из ноутбука закрывает ноутбук и открывает терминал
  st.laptop = null;
  s.debug.openApp('terminal');
  ok(!!st.terminal && !st.laptop, 'ярлык «Терминал» открывает терминал');
  s.closeTerminal();

  // --- клики по настоящему интерфейсу витрины ---
  s.debug.appstore();
  const win = { x: 200, y: 120, w: 880, h: 480 };
  const storeUI2 = st.laptop.appstore;
  const tabs = storeUI2.tabRects();
  tap(tabs[2].rect.x + 10, tabs[2].rect.y + 10);
  ok(storeUI2.tab === tabs[2].id && storeUI2.items().every((a) => a.cat === 'games'), 'витрина: переключение категории');
  tap(tabs[0].rect.x + 10, tabs[0].rect.y + 10);
  const stConst = PVZ.apps.AppStore.STORE;
  const nextArrow = { x: stConst.x + stConst.w / 2 + 20, y: stConst.y + stConst.h - 46, w: 90, h: 30 };
  if (storeUI2.pages() > 1) {
    tap(nextArrow.x + 40, nextArrow.y + 15);
    ok(storeUI2.page === 1, 'витрина: перелистывание страниц (страниц: ' + storeUI2.pages() + ')');
  }
  const closeStore = PVZ.apps.AppStore.CLOSE;
  tap(closeStore.x + 10, closeStore.y + 10);
  ok(st.laptop.mode === 'home', 'витрина: крестик возвращает на рабочий стол');

  // --- клики по ярлыкам рабочего стола ---
  const deskTile = (i) => ({ x: 214 + (i % 5) * 164, y: 252 + Math.floor(i / 5) * 146, w: 152, h: 136 });
  tap(deskTile(0).x + 20, deskTile(0).y + 20);
  ok(st.laptop.mode === 'appstore', 'ярлык App Market открывает магазин');
  PVZ.input.dispatch('key', 0, 0, 'Escape');
  ok(st.laptop.mode === 'home', 'Esc из витрины возвращает на рабочий стол');
  var deskIdx = PVZ.apps.desktopApps().map(function (a) { return a.id; });
  var marketIdx = deskIdx.indexOf('market');
  tap(deskTile(marketIdx).x + 20, deskTile(marketIdx).y + 20);
  ok(st.laptop && st.laptop.mode === 'shop', 'ярлык Маркет открывает магазин улучшений');
  PVZ.input.dispatch('key', 0, 0, 'Escape');

  // --- программы: радио, антивирус, такси, калькулятор ---
  s.debug.openApp('radio');
  const stationRect = PVZ.apps.radioStationRect(win, 0);
  tap(stationRect.x + 10, stationRect.y + 10);
  ok(PVZ.state.data.radioStation === 0 && Math.abs(PVZ.music.gainScale - 0.15) < 1e-6, 'радио переключает станцию и громкость');
  s.debug.openApp('antivirus');
  const avR = PVZ.apps.avRects(win);
  tap(avR.scan.x + 10, avR.scan.y + 10);
  ok(PVZ.state.data.antivirusAt === (PVZ.state.data.day || 1), 'антивирус запускает проверку');
  s.debug.openApp('taxi');
  const taxiR = PVZ.apps.taxiRects(win);
  tap(taxiR.call.x + 10, taxiR.call.y + 10);
  ok(!!PVZ.state.data.taxiAt, 'такси вызывает машину');
  s.debug.openApp('calc');
  const calcKeys = st.laptop.calc.keyRects(win);
  const key1 = calcKeys.find((k) => k.label === '7');
  tap(key1.rect.x + 10, key1.rect.y + 10);
  ok(st.laptop.calc.display === '7', 'калькулятор реагирует на нажатие');
  s.debug.openApp('snake');
  PVZ.input.dispatch('key', 0, 0, 'ArrowUp');
  ok(st.laptop.snake.next.y === -1 || st.laptop.snake.next.x !== 1, 'змейка слушает стрелки');
  s.debug.openApp('memory');
  const card0 = st.laptop.memory.cardRect(win, 0);
  tap(card0.x + 10, card0.y + 10);
  ok(st.laptop.memory.open.length === 1, 'игра «Пары» открывает карточку');
  st.laptop = null;

  // калькулятор считает
  s.debug.laptop();
  st.laptop.mode = 'home';
  s.debug.openApp('calc');
  const calc = st.laptop.calc;
  ['1', '2', '+', '3', '='].forEach((k) => calc.press(k));
  ok(calc.display === '15', 'калькулятор: 12 + 3 = ' + calc.display);

  // змейка двигается
  s.debug.openApp('snake');
  const snake = st.laptop.snake;
  const y0 = snake.snake[0].y;
  snake.turn(0, 1);
  for (let i = 0; i < 20; i++) snake.update(0.02);
  ok(snake.snake[0].y !== y0 || snake.over, 'змейка двигается');

  // память открывает карточки
  s.debug.openApp('memory');
  const mem = st.laptop.memory;
  ok(mem.deck.length === 16, 'в памяти 16 карточек');

  // витрина: страницы
  st.laptop.mode = 'home';
  s.debug.openApp('appstore');
  ok(st.laptop.appstore.pages() >= 3, 'страниц витрины: ' + st.laptop.appstore.pages());
  st.laptop = null;

  // вечер: смена закрывается → вечерний визит мафии со страшной музыкой
  st.phase = 'evening';
  st.clock = 21 * 60;
  st.shiftOpen = true;
  st.dust.forEach((d) => { d.done = true; });
  st.objectives = PVZ.sys.eveningObjectives().map((o) => Object.assign({}, o, { done: true }));
  st.stats.served = 10;
  st.finished = false;
  PVZ.state.data.money = 5000;
  PVZ.state.data.rating = 4.6;
  s.debug.finish();
  // вечерний визит теперь начинается с диалога: выбираем «отдать», чтобы попасть в сцену мафии
  if (st.dlg && st.dlg.choiceRects.length) {
    var payRect = st.dlg.choiceRects[0];
    tap(payRect.x + 30, payRect.y + 20);
  }
  if (PVZ.game.trans) { PVZ.game.setScene(PVZ.game.trans.s); PVZ.game.trans = null; }
  const eveningScene = PVZ.game.scene;
  ok(!!eveningScene && typeof eveningScene.musicMood === 'function' && eveningScene.musicMood() === 'scary',
    'после смены приходит мафия, музыка становится страшной');
  if (eveningScene && eveningScene.update) {
    step(eveningScene, 10);
    ok(PVZ.music.mood === 'scary', 'страшная тема держится на визите');
  }

  // модальное окно ноутбука не мешает смене
  step(s, 5);

  // вечер и страшная музыка у мафии
  const mafia = PVZ.scenes.mafia({
    result: {
      day: 3, demand: 2600, paid: 1200, short: true, moneyBefore: 1200, moneyAfter: 0,
      debtBefore: 43000, debtAfter: 41800, visits: 3, rage: false, taken: []
    }, report: null
  });
  PVZ.game.setScene(mafia);
  ok(PVZ.music.mood === 'scary' && PVZ.music.dark >= 0.99, 'визит мафии включает страшную тему');
  step(mafia, 30);
  ok(PVZ.music.dark >= 0.99, 'страшная тема держится');
  tap(0, 0);
  mafia.onTap(640, 300);
  mafia.exit();
  ok(PVZ.music.mood === 'calm', 'после визита тема сбрасывается');
  ok(PVZ.music.playCalmStep && PVZ.music.playScaryStep, 'обе музыкальные темы определены');

  // сохранение приложений
  PVZ.state.save();
  const loaded = PVZ.state.load();
  ok(loaded && loaded.apps.indexOf('terminal') >= 0, 'приложения сохраняются');
} catch (e) {
  errors.push('EXCEPTION: ' + (e.stack || e));
}

if (errors.length) {
  console.log(log.join('\n'));
  console.log('\nОШИБКИ:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(log.join('\n'));
console.log('\nВСЁ ОК');
