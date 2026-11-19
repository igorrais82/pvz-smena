/* ПВЗ: Смена — платёжный слой.
   Один интерфейс для всех магазинов (сейчас — Premium store):
   PVZ.pay.buy({ sku, title, price, currency }, done).

   По умолчанию работает демо-провайдер: он ничего не списывает и честно
   помечает покупку как демо. Настоящий платёж подключается через
   PVZ.pay.configure({...}) — из конфига сборки, нативного моста (RuStore
   Billing в Android-обёртке) или платёжной страницы на своём сервере.
   Подробная инструкция — в README, раздел «Донат и платежи». */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var pay = (PVZ.pay = {});

  /* Настройки. provider: 'demo' | 'rustore' | 'web'.
     endpoint — база вашего платёжного API для провайдера 'web'.
     products — необязательная карта sku → цена на сервере: если цена
     в игре разошлась с серверной, покупка отклоняется (защита от
     подмены цены в localStorage). */
  pay.config = {
    provider: 'demo',
    endpoint: '',
    currency: 'RUB',
    products: null,
    testMode: true
  };

  pay.configure = function (cfg) {
    if (!cfg) return pay.config;
    for (var k in cfg) if (Object.prototype.hasOwnProperty.call(cfg, k)) pay.config[k] = cfg[k];
    return pay.config;
  };

  /* Конфиг из окружения: window.PVZ_PAY_CONFIG (положить перед src/pay.js)
     либо параметр ?pay=rustore|web|demo для проверки на устройстве. */
  (function readEnv() {
    if (window.PVZ_PAY_CONFIG && typeof window.PVZ_PAY_CONFIG === 'object') {
      pay.configure(window.PVZ_PAY_CONFIG);
    }
    try {
      var q = String((window.location && window.location.search) || '');
      var m = /[?&]pay=([a-z]+)/.exec(q);
      if (m && (m[1] === 'demo' || m[1] === 'rustore' || m[1] === 'web')) {
        pay.configure({ provider: m[1], testMode: m[1] === 'demo' });
      }
    } catch (e) { /* file:// и урезанные окружения — не повод падать */ }
  })();

  pay.provider = function () { return pay.config.provider || 'demo'; };
  pay.isLive = function () { return pay.provider() !== 'demo'; };

  /* Цена в формате «299 ₽» */
  pay.priceLabel = function (price, currency) {
    if (currency && currency !== 'RUB') return String(price) + ' ' + currency;
    return String(price) + ' ₽';
  };

  function orderId() {
    return 'pvz-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  function later(fn) { setTimeout(fn, 0); }

  /* ---------------- демо-провайдер ---------------- */
  /* Ничего не списывает: это витрина и тесты. Покупка помечается demo:true,
     чтобы интерфейс мог честно написать «демо-оплата». */
  var demo = {
    id: 'demo',
    live: false,
    purchase: function (order, done) {
      // демо-покупка проходит сразу: так витрина ведёт себя предсказуемо
      done({ ok: true, demo: true, orderId: orderId() });
    }
  };

  /* ---------------- RuStore Billing ---------------- */
  /* Ожидает мост из Android-обёртки (WebView + BillingClient):
     window.RuStoreBilling.purchase(jsonString) → jsonString
     { status: 'success'|'cancelled'|'pending'|'error', purchaseId, error }
     Серверная проверка чека — на вашей стороне: pay.verifyReceipt. */
  function rustoreBridge() {
    return window.RuStoreBilling || (window.PVZNative && window.PVZNative.billing) || null;
  }
  var rustore = {
    id: 'rustore',
    live: true,
    purchase: function (order, done) {
      var bridge = rustoreBridge();
      if (!bridge || typeof bridge.purchase !== 'function') {
        return done({
          ok: false,
          error: 'RuStore Billing не подключён: нужен Android-контейнер и товары в консоли RuStore.'
        });
      }
      var payload = { productId: order.sku, title: order.title, price: order.price, currency: order.currency || 'RUB' };
      var raw;
      try { raw = bridge.purchase(JSON.stringify(payload)); }
      catch (e) { return done({ ok: false, error: 'Ошибка RuStore Billing: ' + (e && e.message ? e.message : e) }); }

      var res = raw;
      if (typeof raw === 'string') {
        try { res = JSON.parse(raw); } catch (e) { res = { status: raw }; }
      }
      if (!res) return done({ ok: false, error: 'RuStore Billing не вернул ответ.' });
      if (res.status === 'success' || res.status === 'purchased') {
        return pay.verifyReceipt({ provider: 'rustore', order: order, receipt: res }, done);
      }
      if (res.status === 'pending') return done({ ok: false, pending: true, error: 'Платёж обрабатывается — загляните в магазин через минуту.' });
      if (res.status === 'cancelled') return done({ ok: false, cancelled: true, error: 'Оплата отменена.' });
      done({ ok: false, error: res.error || 'RuStore Billing отклонил платёж.' });
    }
  };

  /* ---------------- платёжная страница своего сервера ---------------- */
  /* POST {endpoint}/create { sku, title, price, currency } → { paymentUrl, orderId }
     Дальше открываем paymentUrl и опрашиваем {endpoint}/status?orderId=...
     { status: 'paid'|'pending'|'canceled', receipt } */
  var web = {
    id: 'web',
    live: true,
    purchase: function (order, done) {
      var base = String(pay.config.endpoint || '').replace(/\/+$/, '');
      if (!base) return done({ ok: false, error: 'Платёжный сервер не настроен: PVZ.pay.configure({ provider:"web", endpoint:"https://..." }).' });
      if (typeof fetch !== 'function') return done({ ok: false, error: 'Браузер не умеет fetch — нужен современный WebView.' });
      var id = orderId();
      fetch(base + '/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, sku: order.sku, title: order.title, price: order.price, currency: order.currency || 'RUB' })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (!data || !data.paymentUrl) throw new Error('сервер не вернул ссылку на оплату');
        if (window.pvzOpenPayment) window.pvzOpenPayment(data.paymentUrl, id);
        else window.open(data.paymentUrl, '_blank');
        poll(id, 0);
      }).catch(function (e) {
        done({ ok: false, error: 'Платёж не создан: ' + (e && e.message ? e.message : e) });
      });

      function poll(orderId, tries) {
        if (tries > 150) return done({ ok: false, pending: true, error: 'Ожидание оплаты истекло, загляните позже.' });
        fetch(base + '/status?orderId=' + encodeURIComponent(orderId))
          .then(function (r) { return r.json(); })
          .then(function (s) {
            if (s && s.status === 'paid') {
              pay.verifyReceipt({ provider: 'web', order: order, receipt: s }, done);
            } else if (s && s.status === 'canceled') {
              done({ ok: false, cancelled: true, error: 'Оплата отменена.' });
            } else {
              later(function () { poll(orderId, tries + 1); });
            }
          })
          .catch(function () { later(function () { poll(orderId, tries + 1); }); });
      }
    }
  };

  pay.providers = { demo: demo, rustore: rustore, web: web };

  /* Проверка чека. По умолчанию доверяем провайдеру (демо/мост), но если
     задан pay.config.verifyUrl, отправляем чек на сервер и ждём { valid:true }.
     Так покупки нельзя накрутить правкой localStorage. */
  pay.verifyReceipt = function (ctx, done) {
    var url = pay.config.verifyUrl;
    if (!url || typeof fetch !== 'function') {
      if (pay.config.testMode) return done({ ok: true, demo: true, receipt: ctx.receipt });
      return done({ ok: true, verified: false, receipt: ctx.receipt });
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: ctx.order.sku, price: ctx.order.price, receipt: ctx.receipt })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res && res.valid) done({ ok: true, verified: true, receipt: ctx.receipt });
      else done({ ok: false, error: 'Чек не подтверждён сервером.' });
    }).catch(function () {
      done({ ok: false, error: 'Не удалось проверить чек — оплата не зачислена.' });
    });
  };

  /* Единая точка покупки. done({ok, demo?, pending?, cancelled?, error?}) */
  pay.buy = function (order, done) {
    var cb = typeof done === 'function' ? done : function () {};
    var prov = pay.providers[pay.provider()] || demo;
    try {
      prov.purchase(order, cb);
    } catch (e) {
      cb({ ok: false, error: 'Платёж не прошёл: ' + (e && e.message ? e.message : e) });
    }
  };

  /* Демо-режим: игра сама решает, что покупка прошла */
  pay.demo = function () { pay.configure({ provider: 'demo', testMode: true }); };
})();
