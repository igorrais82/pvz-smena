/* ПВЗ: Смена — рекламный слой.
   Одна точка входа для всех рекламных механик игры:
   PVZ.ads.available()            — есть ли нативный рекламный SDK;
   PVZ.ads.showRewarded(tag, cb)  — показать ролик за награду;
   PVZ.ads.onResult(id, status, error) — вызов из Android-обёртки.

   Сама реклама живёт в нативном контейнере (Yandex Mobile Ads / VK Ads),
   игра общается с ним через window.PVZNative:
     PVZNative.adsAvailable() → "true" | "false"
     PVZNative.showRewarded(id, tag)
     → после закрытия ролика обёртка вызывает
       PVZ.ads.onResult(id, "completed" | "skipped" | "error", "текст")

   Если моста нет (браузер, Windows-сборка), available() = false, и игра
   показывает либо демо-ролик (только вне релиза), либо честное
   «реклама недоступна». Так в магазине не бывает накрутки и обмана. */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var ads = (PVZ.ads = {});

  var seq = 0;
  var pending = {};   // id → cb
  var adFree = false;

  function bridge() {
    return window.PVZNative || null;
  }

  function bridgeBool(name) {
    var b = bridge();
    if (!b || typeof b[name] !== 'function') return false;
    try { return String(b[name]()) === 'true'; } catch (e) { return false; }
  }

  /* Реклама отключена покупкой «Без рекламы» — кнопка остаётся, ролика нет */
  ads.setAdFree = function (v) { adFree = !!v; };
  ads.adFree = function () { return adFree; };

  /* Есть ли нативный rewarded-формат. Без моста всегда false. */
  ads.available = function () {
    return bridgeBool('adsAvailable');
  };

  /* Показ ролика за награду.
     cb({ ok:true })                  — ролик досмотрен, награда положена;
     cb({ ok:false, cancelled:true })  — игрок закрыл ролик;
     cb({ ok:false, unavailable:true }) — SDK не подключён / нет филла. */
  ads.showRewarded = function (tag, cb) {
    var done = typeof cb === 'function' ? cb : function () {};
    if (!ads.available()) return done({ ok: false, unavailable: true });

    var id = 'ad' + (++seq) + '-' + Date.now().toString(36);
    pending[id] = done;
    try {
      bridge().showRewarded(String(id), String(tag || 'rewarded'));
    } catch (e) {
      delete pending[id];
      done({ ok: false, error: e && e.message ? e.message : String(e) });
    }

    /* Страховка: если обёртка не ответила за 60 секунд — не держим экран */
    setTimeout(function () {
      if (!pending[id]) return;
      var f = pending[id];
      delete pending[id];
      f({ ok: false, error: 'Реклама не ответила' });
    }, 60000);
  };

  /* Ответ из нативной обёртки. Вызывается через evaluateJavascript. */
  ads.onResult = function (id, status, error) {
    var cb = pending[id];
    if (!cb) return;
    delete pending[id];
    if (status === 'completed' || status === 'rewarded') return cb({ ok: true });
    if (status === 'skipped' || status === 'cancelled') return cb({ ok: false, cancelled: true });
    cb({ ok: false, error: error || 'Реклама не показана' });
  };
})();
