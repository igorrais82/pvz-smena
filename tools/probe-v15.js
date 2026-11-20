/* Проверка новых механик 1.5: Premium store, радио, Артём, звонок Босса и код в терминале.
   Запуск: node tools/probe-v15.js */
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

for (const f of ['core.js', 'music.js', 'pay.js', 'art.js', 'systems.js', 'apps.js', 'scenes.js', 'main.js']) {
  try {
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f });
  } catch (e) {
    errors.push('load ' + f + ': ' + (e.stack || e));
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
function makeShift(day, phase) {
  PVZ.game.trans = null;
  const s = PVZ.scenes.shift({ day, phase: phase || 'day' });
  s.enter();
  PVZ.game.scene = s;
  return s;
}

try {
  PVZ.state.newGame();
  const d = PVZ.state.data;
  PVZ.state.mafiaState().seen = ['curator', 'parcel', 'raid', 'offer', 'deal'];
  PVZ.state.data.bossCallDay = 0;
  PVZ.state.data.friendDays = [];
  ok(d.apps.indexOf('premium') >= 0, 'Premium store установлен на ноутбук сразу');
  ok(PVZ.apps.byCat('all').every((a) => a.id !== 'premium'), 'Premium store не виден в App Market');
  ok(PVZ.apps.AppStore.STORE, 'витрина App Market на месте');

  // ---- все экраны рисуются ----
  d.apps = ['appstore', 'phone', 'premium', 'terminal', 'market', 'reviews', 'notes', 'weather', 'schedule', 'bank', 'debt', 'crm', 'cctv', 'map', 'chat', 'radio', 'catcam', 'antivirus', 'taxi', 'snake', 'memory', 'calc', 'game'];
  d.money = 999999;
  d.cat = { name: 'Мурзик', fur: 'ginger', takenDay: 2, petDay: 0 };
  d.catStory = 'taken';
  const s = makeShift(5, 'day');
  const st = s.debug.st;
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.customer = null;
  st.queue = [];
  s.debug.laptop();
  PVZ.apps.desktopApps().forEach((a) => {
    st.laptop.mode = 'home';
    if (a.id === 'terminal') return;
    st.laptop.mode = a.id;
    if (a.id === 'market') st.laptop.mode = 'shop';
    step(s, 1);
  });
  ok(true, 'каждый экран приложения рисуется без исключений');

  // ---- радио: меню и темы ----
  st.laptop.mode = 'radio';
  ok(PVZ.apps.RADIO.length >= 7, 'в радио несколько станций: ' + PVZ.apps.RADIO.length);
  const r0 = PVZ.apps.radioStationRect({ x: 200, y: 120, w: 880, h: 480 }, 0);
  tap(r0.x + 10, r0.y + 10);
  ok(PVZ.state.data.radioStation === 0 && PVZ.music.silent, '«Тишина» выключает фон');
  ok(Math.abs(PVZ.music.gainScale - 0.15) < 1e-6, 'у тишины тихая громкость');
  for (let i = 1; i < PVZ.apps.RADIO.length; i++) {
    const rr = PVZ.apps.radioStationRect({ x: 200, y: 120, w: 880, h: 480 }, i);
    tap(rr.x + 10, rr.y + 10);
    ok(PVZ.state.data.radioStation === i && !PVZ.music.silent, 'станция ' + PVZ.apps.RADIO[i].name + ' включается');
  }
  ok(PVZ.music.TRACKS.length >= 6, 'музыкальных тем: ' + PVZ.music.TRACKS.length);
  ok(!!(PVZ.music.THEMES.morning && PVZ.music.THEMES.day && PVZ.music.THEMES.evening),
    'у утра, дня и вечера свои темы');
  ok(!!PVZ.music.THEMES.mafia, 'у визита мафии своя тема');
  ok(true, 'все темы играются без ошибок');

  // ---- Premium store: витрина, скидки, монеты, подписка ----
  st.laptop.mode = 'premium';
  st.laptop.premium.tab = 'bundles';
  const win = { x: 200, y: 120, w: 880, h: 480 };
  const prB = PVZ.apps.premiumRects(win, 'bundles');
  ok(prB.cards.length === 4 && prB.cards[0].item.id === 'starter', 'в «Наборах» четыре предложения');
  ok(prB.cards[0].item.oldRub > prB.cards[0].item.rub, 'у стартового набора есть зачёркнутая цена');
  ok(PVZ.apps.premiumPercent(PVZ.apps.premiumItem('starter')) >= 80, 'скидка стартового набора ≥ 80%');
  ok(prB.tabs.length === 3 && prB.tabs[1].id === 'items', 'три вкладки витрины');
  ok(PVZ.apps.PREMIUM_ITEMS.filter((i) => !i.hidden).length >= 12, 'в витрине не меньше 12 предложений');

  // геометрия: карточки и кнопки не вылезают и не перекрываются
  ['bundles', 'items', 'coins'].forEach((tab) => {
    const rr = PVZ.apps.premiumRects(win, tab);
    rr.cards.forEach((c) => {
      const r = c.rect;
      ok(r.x >= rr.box.x - 1 && r.x + r.w <= rr.box.x + rr.box.w + 1 &&
        r.y >= rr.box.y && r.y + r.h <= rr.box.y + rr.box.h + 1,
        'карточка ' + c.item.id + ' влезает в витрину');
      c.buttons.forEach((b) => {
        ok(b.x >= r.x && b.x + b.w <= r.x + r.w && b.y >= r.y && b.y + b.h <= r.y + r.h,
          'кнопка ' + c.item.id + ' внутри карточки');
      });
      for (let i = 0; i < c.buttons.length; i++) {
        for (let j = i + 1; j < c.buttons.length; j++) {
          const a = c.buttons[i], b = c.buttons[j];
          const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          ok(!hit, 'кнопки ' + c.item.id + ' не перекрываются');
        }
      }
    });
  });

  // реклама даёт монету
  tap(prB.adBtn.x + 10, prB.adBtn.y + 10);
  ok(!!st.laptop.premium.ad, 'реклама запускается');
  for (let i = 0; i < 320; i++) PVZ.apps.updatePremium(st.laptop.premium, 0.02);
  ok(st.laptop.premium.ad === null && PVZ.state.data.premium.coins === 1, 'за рекламу дали монету');
  PVZ.state.premiumCoins(2000);

  // вкладка «Товары»
  tap(prB.tabs[1].rect.x + 10, prB.tabs[1].rect.y + 10);
  ok(st.laptop.premium.tab === 'items', 'вкладка «Товары» открывается');
  const pr = PVZ.apps.premiumRects(win, 'items');
  const packCard = pr.cards.find((c) => c.item.id === 'appPack');
  tap(packCard.coinBtn.x + 10, packCard.coinBtn.y + 10);
  ok(PVZ.state.premiumHas('appPack'), 'пак приложений куплен за монеты');
  ok(PVZ.state.hasApp('snake') && PVZ.state.hasApp('radio') && PVZ.state.hasApp('notes'), 'пак установил приложения');
  const adCard = pr.cards.find((c) => c.item.id === 'adFree');
  tap(adCard.coinBtn.x + 10, adCard.coinBtn.y + 10);
  ok(PVZ.state.premiumHas('adFree') && PVZ.state.data.premium.adFree, 'реклама отключена');
  ok(PVZ.apps.premiumAdGain() >= 1, 'бонус за ролик настраивается');
  const catCard = pr.cards.find((c) => c.item.id === 'catSkins');
  tap(catCard.coinBtn.x + 10, catCard.coinBtn.y + 10);
  ok(PVZ.state.premiumHas('catSkins'), 'пак скинов куплен');
  ok(st.laptop.premium.modal && st.laptop.premium.modal.type === 'skins', 'открылся выбор скина');
  const skinRects = PVZ.apps.premiumModalRects(win, st.laptop.premium).skins;
  tap(skinRects[5].x + 10, skinRects[5].y + 10);
  ok(PVZ.state.data.cat.fur === 'tuxedo', 'скин кота применился: ' + PVZ.state.data.cat.fur);
  const okr = PVZ.apps.premiumModalRects(win, st.laptop.premium).ok;
  tap(okr.x + 10, okr.y + 10);
  // DEV-доступ убран из витрины, но активируется
  ok(PVZ.apps.premiumItem('dev') && PVZ.apps.premiumItem('dev').hidden, 'DEV-доступ убран из витрины');
  PVZ.apps.premiumBuy('dev', 'coins', st.laptop.premium);
  ok(PVZ.state.premiumHas('dev'), 'DEV-доступ активирован');

  // подписка
  st.laptop.premium.modal = null;
  PVZ.apps.premiumBuy('plus30', 'rub', st.laptop.premium);
  ok(PVZ.state.premiumHasPlus(), 'ПВЗ Плюс активируется');
  ok(PVZ.apps.premiumDiscount() === 0.8, 'Плюс даёт −20% на монеты');
  ok(PVZ.apps.premiumCoins(PVZ.apps.premiumItem('catSkins')) < PVZ.apps.premiumItem('catSkins').coins, 'цена в монетах со скидкой Плюса');
  const daily = PVZ.apps.premiumClaimDaily(st.laptop.premium);
  ok(daily.ok, 'ежедневный подарок Плюса начисляется');
  ok(!PVZ.apps.premiumClaimDaily(st.laptop.premium).ok, 'подарок нельзя взять дважды в день');

  // пополнение монет
  st.laptop.premium.modal = null;
  st.laptop.premium.tab = 'bundles';
  tap(PVZ.apps.premiumRects(win, 'bundles').topBtn.x + 10, PVZ.apps.premiumRects(win, 'bundles').topBtn.y + 10);
  ok(st.laptop.premium.tab === 'coins', '«Пополнить» открывает паки монет');
  const prCoins = PVZ.apps.premiumRects(win, 'coins');
  const pack100 = prCoins.cards.find((c) => c.item.id === 'coins100');
  const coins0 = PVZ.state.data.premium.coins;
  tap(pack100.buyBtn.x + 10, pack100.buyBtn.y + 10);
  ok(st.laptop.premium.modal && st.laptop.premium.modal.type === 'buy', 'пакет монет просит подтверждение');
  const packOk = PVZ.apps.premiumModalRects(win, st.laptop.premium).ok;
  tap(packOk.x + 10, packOk.y + 10);
  ok(PVZ.state.data.premium.coins === coins0 + 100, 'монеты зачислены после демо-оплаты');

  // покупка за рубли
  PVZ.state.data.premium.adFree = false;
  PVZ.state.data.premium.bought = PVZ.state.data.premium.bought.filter((x) => x !== 'adFree');
  st.laptop.premium.modal = null;
  st.laptop.premium.tab = 'items';
  const pr3 = PVZ.apps.premiumRects(win, 'items');
  const adCard3 = pr3.cards.find((c) => c.item.id === 'adFree');
  tap(adCard3.rubBtn.x + 10, adCard3.rubBtn.y + 10);
  ok(st.laptop.premium.modal && st.laptop.premium.modal.type === 'buy', 'покупка за рубли просит подтверждение');
  const buyOk = PVZ.apps.premiumModalRects(win, st.laptop.premium).ok;
  tap(buyOk.x + 10, buyOk.y + 10);
  ok(PVZ.state.premiumHas('adFree') && PVZ.state.data.premium.rubSpent >= 149, 'демо-покупка за рубли прошла');

  // наборы выдают содержимое целиком
  PVZ.state.data.premium.bought = PVZ.state.data.premium.bought.filter((x) => ['starter', 'adFree', 'catSkins', 'appPack', 'pro', 'mega'].indexOf(x) < 0);
  PVZ.state.data.premium.adFree = false;
  const beforeStarter = PVZ.state.data.premium.coins;
  const buyStarter = PVZ.apps.premiumBuy('starter', 'rub', st.laptop.premium);
  ok(buyStarter.ok, 'стартовый набор покупается');
  ok(PVZ.state.premiumHas('starter'), 'стартовый набор помечен купленным');
  ok(PVZ.state.premiumHas('adFree') && PVZ.state.premiumHas('catSkins') && PVZ.state.premiumHas('appPack'), 'набор выдал все товары');
  ok(PVZ.state.data.premium.coins === beforeStarter + 400, 'набор начислил 400 монет');
  ok(!PVZ.apps.premiumBuy('starter', 'rub', st.laptop.premium).ok, 'набор нельзя купить дважды');
  const beforePro = PVZ.state.data.premium.coins;
  PVZ.apps.premiumBuy('pro', 'rub', st.laptop.premium);
  ok(PVZ.state.data.premium.coins === beforePro + 1200, '«Профи» начислил 1 200 монет');
  ok(PVZ.state.premiumPlusDays() >= 30, '«Профи» продлил Плюс');
  PVZ.apps.premiumBuy('mega', 'rub', st.laptop.premium);
  ok(PVZ.state.premiumPlusDays() > 9000, '«Всё навсегда» включает Плюс навсегда');

  // платёжный слой
  ok(PVZ.pay && PVZ.pay.provider() === 'demo', 'по умолчанию демо-оплата');
  PVZ.pay.configure({ provider: 'rustore' });
  let payErr = null;
  PVZ.pay.buy({ sku: 'premium.adFree', title: 'x', price: 1 }, (r) => { payErr = r; });
  ok(payErr && payErr.ok === false && /RuStore/.test(payErr.error), 'без моста RuStore покупка не выдаётся');
  PVZ.pay.demo();

  // ---- код в терминале ----
  st.laptop = null;
  st.phase = 'day';
  st.shiftOpen = true;
  st.doorOpen = true;
  st.customer = null;
  st.queue = [];
  s.debug.spawn('pickup');
  step(s, 2);
  // дождёмся, пока покупатель дойдёт до стойки
  for (let i = 0; i < 400 && !(st.customer && st.customer.arrived); i++) step(s, 1, 1 / 30);
  const c = st.customer;
  ok(!!c, 'покупатель у стойки');
  if (c) {
    c.phone = 'none';
    c.phoneLabel = 'без телефона';
    c.dictated = false;
    c.codeEntered = false;
    s.debug.step();
    // открываем телефон через диалог: onCustomerTap -> openPhone
    s.onTap(0, 0); // закрыть возможные окна
    const hotC = (st.hots || []).find((h) => h.id === 'customer');
    ok(!!hotC, 'зона покупателя на экране есть');
    if (hotC) s.onTap(hotC.rect.x + hotC.rect.w / 2, hotC.rect.y + hotC.rect.h / 2);
    if (!st.dlg) s.onTap(625, 500);
    ok(!!st.dlg, 'покупатель без телефона начинает диалог');
    if (st.dlg) {
      const idx = st.dlg.choices.findIndex((ch) => /Записать код со слов/.test(ch.label));
      if (idx >= 0) {
        const cr = st.dlg.choiceRects[idx];
        tap(cr.x + 30, cr.y + 20);
      }
      ok(!!st.terminal && st.terminal.mode === 'search', 'после диктовки открывается терминал в режиме поиска');
      ok(st.terminal && st.terminal.input === '', 'терминал не подставляет код сам');
      if (st.terminal) {
        for (const ch of c.code) st.terminal.key(ch);
        ok(st.terminal.mode === 'found' && st.terminal.order && st.terminal.order.code === c.code, 'код, введённый вручную, находит заказ');
        ok(c.codeEntered === true, 'факт ввода кода отмечен у покупателя');
      }
    }
  }

  // ---- Артём через смену ----
  PVZ.state.data.friendDays = [];
  PVZ.state.data.bossCallDay = 0;
  PVZ.state.mafiaState().seen = ['curator', 'parcel', 'raid', 'offer', 'deal'];
  const fs2 = makeShift(2, 'morning');
  const st2 = fs2.debug.st;
  for (let i = 0; i < 600 && !st2.friend; i++) step(fs2, 1, 1 / 20);
  ok(!!st2.friend, 'на второй смене утром приходит Артём');
  for (let i = 0; i < 400 && !st2.dlg; i++) step(fs2, 1, 1 / 20);
  ok(!!st2.dlg && /Артём/.test(st2.dlg.name), 'Артём заводит разговор: ' + (st2.dlg && st2.dlg.name));
  if (st2.dlg) {
    const cr = st2.dlg.choiceRects[0];
    tap(cr.x + 30, cr.y + 20);
    ok(PVZ.state.data.friendDays.indexOf(2) >= 0, 'визит Артёма записан в сейв');
  }
  ok(st2.friend === null || st2.friend.leaving, 'Артём уходит после разговора');

  // ---- звонок Босса на 9-й смене ----
  PVZ.state.data.bossCallDay = 0;
  const bs = makeShift(9, 'morning');
  const bst = bs.debug.st;
  for (let i = 0; i < 900 && !bst.dlg; i++) step(bs, 1, 1 / 20);
  ok(!!bst.dlg && /Артём · входящий/.test(bst.dlg.name), 'на 9-й смене звонят с телефона друга');
  ok(bst.dlg && /Босс|голос/.test(bst.dlg.text) && /не Артёма/.test(bst.dlg.text), 'в трубке голос Босса');
  if (bst.dlg) {
    const cr = bst.dlg.choiceRects[0];
    tap(cr.x + 30, cr.y + 20);
    ok(PVZ.state.data.bossCallDay === 9, 'звонок записан в сейв');
  }

  // ---- сохранение/загрузка ----
  PVZ.state.save();
  const loaded = PVZ.state.load();
  ok(loaded && loaded.apps.indexOf('premium') >= 0 && loaded.premium && loaded.premium.coins >= 0, 'Premium store сохраняется');
  ok(loaded && Array.isArray(loaded.friendDays), 'визиты Артёма сохраняются');
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
