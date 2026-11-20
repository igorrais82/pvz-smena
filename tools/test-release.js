/* Проверка релизного режима: DEV выключен, демо-оплата запрещена,
   Premium store без платёжного моста спрятан, реклама работает через мост.
   node tools/test-release.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'game');
const errors = [];
function check(name, ok, extra) {
  if (!ok) errors.push(name + (extra ? ' — ' + extra : ''));
}

function noop() {}
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'measureText') return (s) => ({ width: String(s).length * 6.2 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (p === 'createPattern') return () => null;
    if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (p === 'canvas') return canvas;
    if (p === 'globalAlpha') return 1;
    if (p === 'lineWidth' || p === 'shadowBlur') return 1;
    return noop;
  },
  set() { return true; }
});
const canvas = {
  width: 1280, height: 720, style: {},
  getContext: () => ctxStub,
  addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }),
  focus: noop
};
const store = new Map();
global.window = global;
const elStub = () => ({
  style: {}, classList: { toggle: noop, add: noop, remove: noop },
  addEventListener: noop, appendChild: noop, remove: noop
});
global.document = {
  readyState: 'complete',
  getElementById: (id) => (id === 'game' ? canvas : elStub()),
  addEventListener: noop,
  hidden: false,
  fullscreenElement: null,
  documentElement: { requestFullscreen: noop, style: {} },
  createElement: () => canvas
};
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
global.navigator = { maxTouchPoints: 0, userAgent: 'test' };
global.devicePixelRatio = 1;
global.requestAnimationFrame = noop;
global.cancelAnimationFrame = noop;
global.location = { search: '', href: 'file:///game/index.html' };
global.addEventListener = noop;
global.removeEventListener = noop;
global.URLSearchParams = URLSearchParams;

/* Релизная сборка */
global.PVZ_RELEASE = true;

for (const f of ['core.js', 'music.js', 'pay.js', 'ads.js', 'art.js', 'systems.js', 'talks.js', 'cast.js', 'serve.js', 'boxes.js', 'apps.js', 'scenes.js', 'main.js']) {
  try {
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), { filename: f });
  } catch (e) {
    errors.push('load ' + f + ': ' + e.message);
  }
}

const PVZ = global.PVZ;
PVZ.state.data = PVZ.state.fresh();
PVZ.state.data.apps = ['appstore', 'phone', 'premium', 'chat'];

check('провайдер релиза — RuStore', PVZ.pay.provider() === 'rustore', PVZ.pay.provider());
check('без моста деньги не принимаются', PVZ.pay.canPay() === false);
check('без моста рекламы нет', PVZ.ads.available() === false);
check('Premium store скрыт без платежей и рекламы',
  PVZ.apps.desktopApps().every(a => a.id !== 'premium'),
  PVZ.apps.desktopApps().map(a => a.id).join(','));
check('витрина не может продать за рубли',
  PVZ.apps.premiumCheckout('starter', null).ok === false);

/* Подключаем «нативный» мост: реклама и платежи работают */
let adCb = null;
let buyCb = null;
global.PVZNative = {
  adsAvailable: () => 'true',
  billingAvailable: () => 'true',
  showRewarded: (id, tag) => { adCb = id; },
  purchase: (id, json) => { buyCb = id; }
};

check('мост видит рекламу', PVZ.ads.available() === true);
check('мост видит платежи', PVZ.pay.canPay() === true);
check('Premium store появился', PVZ.apps.desktopApps().some(a => a.id === 'premium'));

let adResult = null;
PVZ.ads.showRewarded('test', (res) => { adResult = res; });
check('ролик запрошен у моста', !!adCb);
PVZ.ads.onResult(adCb, 'completed', '');
check('досмотренный ролик даёт награду', adResult && adResult.ok === true, JSON.stringify(adResult));

let buyResult = null;
PVZ.pay.buy({ sku: 'premium.starter', title: 'Стартовый набор', price: 249, currency: 'RUB' }, (res) => { buyResult = res; });
check('покупка ушла в нативный мост', !!buyCb);
PVZ.pay.onNativePurchase(buyCb, JSON.stringify({ status: 'success', purchaseId: 'p1' }));
check('успешная покупка подтверждена', buyResult && buyResult.ok === true, JSON.stringify(buyResult));

let cancelResult = null;
PVZ.pay.buy({ sku: 'premium.coins100', title: '100 монет', price: 99, currency: 'RUB' }, (res) => { cancelResult = res; });
PVZ.pay.onNativePurchase(buyCb, JSON.stringify({ status: 'cancelled' }));
check('отмена оплаты не выдаёт товар', cancelResult && cancelResult.ok === false && cancelResult.cancelled === true);

if (errors.length) {
  console.log('FAILED (' + errors.length + '):');
  errors.forEach(e => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK: релизный режим, скрытие DEMO/DEV, награда за рекламу и нативные платежи работают');
process.exit(0);
