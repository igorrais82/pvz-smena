/* Проверка сюжета: пролог, обучение, телефон, бандиты, скорая, пожар, мафия.
   node tools/probe-story.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'game');
const errors = [];
function noop() {}
function gradient() { return { addColorStop: noop }; }
const canvas = {
  width: 1280, height: 720, style: {},
  getContext: () => ctxStub, addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }),
  focus: noop
};
const ctxStub = new Proxy({}, {
  get(target, prop) {
    if (prop === 'measureText') return (s) => ({ width: String(s).length * 6.2 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return gradient;
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

for (const f of ['core.js', 'art.js', 'systems.js', 'scenes.js', 'main.js']) {
  try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f }); }
  catch (e) { errors.push('load ' + f + ': ' + e.message); }
}
const PVZ = global.PVZ;
const log = [];
function ok(cond, name, extra) {
  if (!cond) errors.push('FAIL ' + name + (extra ? ' — ' + extra : ''));
  else log.push('ok   ' + name + (extra ? ' — ' + extra : ''));
}
function step(scene, n, dt) {
  for (let i = 0; i < (n || 3); i++) {
    try { scene.update(dt || 1 / 60); } catch (e) { errors.push('update: ' + (e.stack || e)); return; }
    try { scene.draw(ctxStub); } catch (e) { errors.push('draw: ' + (e.stack || e)); return; }
  }
}
function tap(scene, x, y) {
  try { scene.onTap(x, y); } catch (e) { errors.push('tap: ' + (e.stack || e)); }
}

// --- пролог
PVZ.state.newGame();
let intro = PVZ.scenes.intro();
PVZ.game.setScene(intro);
step(intro, 5);
ok(!!PVZ.scenes.intro, 'сцена пролога существует');
tap(intro, 1100, 37); // пропустить пролог → настройка вывески
step(intro, 3);
intro.onKey('Enter'); // открыть ПВЗ
ok(!!PVZ.game.trans && !!PVZ.game.trans.s, 'пролог переходит к смене');

// --- обучение на первой смене
PVZ.state.newGame();
let sh = PVZ.scenes.shift({ day: 1, phase: 'morning' });
PVZ.game.setScene(sh);
let st = sh.debug.st;
step(sh, 3);
ok(!!st.tut && st.tut.on, 'обучение включено на 1 смене');
const tutStart = st.tut.idx;
st.view = 'hall';
step(sh, 2);
ok(st.tut.idx > tutStart, 'обучение реагирует на переход в зал', st.tut.idx);
st.lightsOn = true;
step(sh, 2);
st.shiftOpen = true;
step(sh, 2);
ok(st.tut.idx >= 2, 'обучение идёт по шагам', 'idx=' + st.tut.idx);
sh.debug.view('counter');
st.phase = 'day'; st.shiftOpen = true; st.lightsOn = true; st.doorOpen = true;
st.tut.on = false;

// --- телефон и бандит: успешный звонок в полицию
st = sh.debug.st;
sh.debug.threat('bandit');
step(sh, 2);
ok(!!st.threat && st.threat.kind === 'bandit', 'бандит появился');
sh.debug.phone();
step(sh, 2);
ok(!!st.laptop && st.laptop.mode === 'phone', 'открылось приложение «Телефон»');
const phone = st.laptop.phone;
phone.startCall({ id: 'police', name: 'Полиция', num: '102', icon: '🚓' });
step(sh, 2);
ok(!!st.qte && st.qte.type === 'calm', 'запущен QTE на спокойствие', st.qte && st.qte.type);
const q = st.qte;
for (let i = 0; i < 3 && q && !q.done; i++) {
  q.pos = q.zone;
  q.onTap(0, 0);
  step(sh, 2);
}
step(sh, 60);
ok(!st.threat, 'полиция убрала бандита');
ok(!st.qte, 'QTE завершился');
st.qte = null;

// --- скорая
st = sh.debug.st;
sh.debug.threat('sick');
step(sh, 2);
ok(st.threat && st.threat.kind === 'sick', 'человеку стало плохо');
sh.debug.phone();
st.laptop.phone.startCall({ id: 'ambulance', name: 'Скорая', num: '103', icon: '🚑' });
step(sh, 3);
ok(!st.threat, 'скорая помогла');

// --- пожар и плохая концовка
st = sh.debug.st;
sh.debug.threat('fire');
step(sh, 3);
ok(st.threat && st.threat.kind === 'fire', 'начался пожар');
st.threat.t = st.threat.limit + 1;
step(sh, 3);
ok(!st.threat && PVZ.game.trans && PVZ.game.trans.s, 'пожар без звонка ведёт к плохой концовке');
PVZ.game.trans = null;

// --- пожар: успешный вызов
PVZ.state.newGame();
sh = PVZ.scenes.shift({ day: 4, phase: 'day' });
PVZ.game.setScene(sh);
st = sh.debug.st;
step(sh, 2);
sh.debug.threat('fire');
step(sh, 2);
sh.debug.phone();
st.laptop.phone.startCall({ id: 'fire', name: 'Пожарные', num: '101', icon: '🚒' });
step(sh, 3);
ok(!st.threat, 'пожарные потушили пожар');

// --- мафия забирает предмет, если не хватает денег
PVZ.state.newGame();
PVZ.state.data.money = 5000;
PVZ.state.buy('decor_cat');
PVZ.state.buy('decor_sofa');
PVZ.state.data.day = 3;
PVZ.state.data.money = 100;
const res = PVZ.sys.mafiaCollect();
ok(res && res.short, 'мафия требует больше, чем есть');
ok(res.taken.length === 1, 'мафия забрала предмет', res.taken.length && res.taken[0].name);
ok(!PVZ.state.owns(res.taken[0].id), 'предмет исчез из магазина');
ok(res.debtAfter > 0, 'долг мафии остался', res.debtAfter);
const mafiaScene = PVZ.scenes.mafia({ result: res, report: { day: 3, served: 5, plan: 12, complaints: 0, returns: 0, received: 5, earned: 900, rating: 4, money: 0, bonus: 0, final: false, carry: [], mafia: res, debt: res.debtAfter } });
PVZ.game.setScene(mafiaScene);
step(mafiaScene, 5);
tap(mafiaScene, 640, 500);
step(mafiaScene, 3);
ok(true, 'сцена мафии отрисовывается без ошибок');

// --- достаточный платёж
PVZ.state.newGame();
PVZ.state.data.day = 1;
PVZ.state.data.money = 5000;
const before = PVZ.state.data.debt;
const paid = PVZ.sys.mafiaCollect();
ok(paid.paid === PVZ.sys.mafiaDemand(1), 'мафии ушла требуемая сумма');
ok(PVZ.state.data.debt < before, 'долг уменьшился', before + ' → ' + PVZ.state.data.debt);

// --- вечер: смена заканчивается визитом мафии, потом отчёт
PVZ.state.newGame();
PVZ.state.data.money = 9000;
let eve = PVZ.scenes.shift({ day: 1, phase: 'evening', clock: 20 * 60 + 40 });
PVZ.game.setScene(eve);
eve.debug.st.objectives.forEach(o => { o.done = true; });
step(eve, 3);
eve.debug.finish();
ok(!!PVZ.game.trans && !!PVZ.game.trans.s, 'после смены открывается сцена мафии');
const ms = PVZ.game.trans.s;
step(ms, 3);
for (let i = 0; i < 12; i++) tap(ms, 640, 520);
step(ms, 3);
tap(ms, 640, 630); // «Открыть отчёт»
stepping: {
  const rep = PVZ.game.trans && PVZ.game.trans.s;
  ok(!!rep, 'мафия ведёт к отчёту смены');
  if (rep) step(rep, 3);
}
PVZ.game.trans = null;
ok(PVZ.state.data.tutorialSeen, 'обучение отмечено пройденным');
ok(PVZ.state.data.mafiaVisits >= 1, 'визит мафии записан');

if (errors.length) {
  console.log('FAILED (' + errors.length + ')');
  errors.slice(0, 15).forEach(e => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK: пролог, обучение, телефон, бандиты, скорая, пожар и мафия работают (' + log.length + ' проверок)');
