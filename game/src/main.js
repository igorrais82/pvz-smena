/* ПВЗ: Смена — запуск, игровой цикл, пауза, переходы, платформенные мосты */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util;

  var G = (PVZ.game = {
    W: 1280,
    H: 720,
    scale: 1,
    canvas: null,
    ctx: null,
    scene: null,
    t: 0,
    paused: false,
    trans: null,
    pauseBtns: [],
    last: 0
  });

  PVZ.logical = { w: 1280, h: 720 };

  function isTouch() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  }
  PVZ.isTouch = isTouch;

  function setupResolution() {
    var canvas = G.canvas;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var scale = dpr >= 2 ? 1.25 : 1;
    G.scale = scale;
    canvas.width = Math.round(1280 * scale);
    canvas.height = Math.round(720 * scale);
    G.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    G.ctx.imageSmoothingEnabled = true;
    // на телефоне/планшете текст крупнее, иначе 11 px логических нечитаемы
    applyTextScale();
  }

  /* Крупный текст: авто по размеру экрана, но игрок может переопределить через ?ui= */
  function applyTextScale() {
    var params = new URLSearchParams(location.search);
    var forced = parseFloat(params.get('ui') || '');
    var w = window.innerWidth || 1280;
    var h = window.innerHeight || 720;
    // телефон/небольшой планшет: компактный HUD и крупнее шрифт
    var compact = w < 1000 || h < 540;
    var v;
    if (forced > 0) v = forced;
    else if (compact) v = w < 760 ? 1.32 : 1.22;
    else v = w < 1150 ? 1.06 : 1;
    if (PVZ.art && PVZ.art.setCompact) PVZ.art.setCompact(compact);
    if (PVZ.art && PVZ.art.setTextScale) PVZ.art.setTextScale(v);
  }

  G.setScene = function (s) {
    if (G.scene && G.scene.exit) {
      try { G.scene.exit(); } catch (e) { console.warn(e); }
    }
    G.scene = s;
    if (s && s.enter) {
      try { s.enter(G); } catch (e) { console.error(e); }
    }
  };

  G.goto = function (s) {
    if (G.trans) return;
    G.trans = { phase: 'out', a: 0, s: s };
  };

  /* сохранить игру вместе с состоянием смены */
  G.persist = function () {
    if (G.scene && G.scene.isShift && G.scene.serialize) {
      try { PVZ.state.data.shift = G.scene.serialize(); } catch (e) { /* ignore */ }
    }
    PVZ.state.save();
  };

  G.togglePause = function () {
    if (G.trans) return;
    G.paused = !G.paused;
    if (G.paused) {
      PVZ.audio.ui();
      G.pauseBtns = [
        { id: 'resume', rect: { x: 490, y: 288, w: 300, h: 58 }, label: 'Продолжить' },
        { id: 'sound', rect: { x: 490, y: 360, w: 300, h: 50 }, label: (PVZ.state.data && PVZ.state.data.settings.sound) ? 'Звук: вкл' : 'Звук: выкл' },
        { id: 'menu', rect: { x: 490, y: 424, w: 300, h: 50 }, label: 'Сохранить и в меню' }
      ];
      G.persist();
    }
  };

  /* кнопка "Назад" на Android */
  G.onAndroidBack = function () {
    if (G.paused) { G.paused = false; return 'resume'; }
    if (G.scene && G.scene.isMenu) return 'exit';
    G.togglePause();
    return 'paused';
  };

  G.drawPause = function (ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,5,4,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    PVZ.art.panel(ctx, 400, 188, 480, 392, { bg: 'rgba(34,24,19,0.98)', r: 22, border: 'rgba(255,220,180,0.18)' });
    PVZ.art.txt(ctx, 'ПАУЗА', 640, 252, 34, '#ffd8a8', 800, 'center');
    G.pauseBtns.forEach(function (b) {
      var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      PVZ.art.button(ctx, b.rect, b.label, { hover: hov, size: 20 });
    });
    PVZ.art.txt(ctx, 'Смена сохраняется автоматически', 640, 540, 14, 'rgba(255,240,220,0.45)', 600, 'center');
    ctx.restore();
  };

  G.onTapPause = function (x, y) {
    for (var i = 0; i < G.pauseBtns.length; i++) {
      var b = G.pauseBtns[i];
      if (U.hit(b.rect, x, y)) {
        PVZ.audio.click();
        if (b.id === 'resume') G.paused = false;
        else if (b.id === 'menu') {
          G.paused = false;
          G.persist();
          G.goto(PVZ.scenes.menu());
        } else if (b.id === 'sound') {
          PVZ.state.data.settings.sound = !PVZ.state.data.settings.sound;
          PVZ.audio.muted = !PVZ.state.data.settings.sound;
          b.label = PVZ.state.data.settings.sound ? 'Звук: вкл' : 'Звук: выкл';
          G.persist();
        }
        return;
      }
    }
  };

  function loop(ts) {
    var dt = G.last ? Math.min(0.05, (ts - G.last) / 1000) : 0.016;
    G.last = ts;
    G.t += dt;

    // переход между сценами — мягкое затухание
    if (G.trans) {
      if (G.trans.phase === 'out') {
        G.trans.a += dt * 3.2;
        if (G.trans.a >= 1) {
          G.trans.a = 1;
          G.setScene(G.trans.s);
          G.trans.phase = 'in';
        }
      } else {
        G.trans.a -= dt * 3.2;
        if (G.trans.a <= 0) {
          G.trans.a = 0;
          G.trans = null;
        }
      }
    }

    if (!G.paused && G.scene && G.scene.update) {
      try { G.scene.update(dt); } catch (e) { G.lastError = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); console.error(e); }
    }

    // музыка подстраивается под обстановку в зале
    try {
      var tension = G.scene && G.scene.musicTension ? G.scene.musicTension() : 0.16;
      var mood = G.scene && G.scene.musicMood ? G.scene.musicMood() : 'calm';
      var phase = G.scene && G.scene.musicPhase ? G.scene.musicPhase() : null;
      PVZ.music.update(dt, G.paused ? 0.08 : tension, mood, phase);
    } catch (e) { /* музыка не должна ломать игру */ }

    var ctx = G.ctx;
    ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0);
    ctx.clearRect(0, 0, 1280, 720);
    if (G.scene && G.scene.draw) {
      try { G.scene.draw(ctx); } catch (e) { G.lastError = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); console.error(e); }
    }
    if (G.paused) G.drawPause(ctx);
    if (G.trans) PVZ.art.fade(ctx, G.trans.a, '#0d0a08');
    if (G.lastError) {
      ctx.save();
      ctx.fillStyle = 'rgba(150,28,20,0.94)';
      ctx.fillRect(0, 684, 1280, 36);
      ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#ffe8e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('JS ERROR: ' + G.lastError, 10, 702);
      ctx.restore();
    }

    requestAnimationFrame(loop);
  }

  /* ---------------- запуск ---------------- */
  function addManifest() {
    // под file:// манифест не грузится (CORS), и не нужен: он для установки PWA
    if (location.protocol === 'file:' || !document.createElement) return;
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.webmanifest';
    var head = document.head || document.documentElement;
    if (head && typeof head.appendChild === 'function') head.appendChild(link);
  }

  function boot() {
    var canvas = document.getElementById('game');
    G.canvas = canvas;
    G.ctx = canvas.getContext('2d');
    setupResolution();
    addManifest();
    window.addEventListener('resize', setupResolution);
    window.addEventListener('orientationchange', function () { setTimeout(setupResolution, 250); });

    PVZ.input.init(canvas);

    // звук
    var soundBtn = document.getElementById('btn-sound');
    var saved = PVZ.state.load();
    var soundOn = saved ? saved.settings.sound !== false : true;
    PVZ.audio.muted = !soundOn;
    soundBtn.classList.toggle('off', !soundOn);
    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      PVZ.audio.resume();
      PVZ.audio.muted = !PVZ.audio.muted;
      if (PVZ.state.data) {
        PVZ.state.data.settings.sound = !PVZ.audio.muted;
        G.persist();
      }
      soundBtn.classList.toggle('off', PVZ.audio.muted);
      if (!PVZ.audio.muted) PVZ.audio.click();
    });

    // полный экран
    var fullBtn = document.getElementById('btn-full');
    fullBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var d = document;
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || function () {}).call(d.documentElement);
      } else {
        (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
      }
    });

    // пауза при уходе из приложения
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.scene && !G.paused && G.scene.isShift) {
        G.togglePause();
        G.persist();
      }
    });

    // первичное состояние
    if (!PVZ.state.data) {
      PVZ.state.data = PVZ.state.fresh();
    }
    PVZ.state.data.settings.sound = !PVZ.audio.muted;
    // громкость и тема фона из приложения «Радио ПВЗ»
    try {
      if (PVZ.state.hasApp('radio')) {
        PVZ.apps.applyRadio(PVZ.state.data.radioStation == null ? 2 : PVZ.state.data.radioStation);
      } else if (PVZ.music && PVZ.music.setTrack) {
        PVZ.music.setTrack(1);
      }
    } catch (e) { /* радио не критично */ }
    G.setScene(PVZ.scenes.menu());
    requestAnimationFrame(loop);

    applyDevQuery();
  }

  /* отладочные точки входа: index.html?dev=day / warehouse / rack / evening / report / terminal.
     В релизной сборке (window.PVZ_RELEASE) выключены полностью. */
  function applyDevQuery() {
    if (window.PVZ_RELEASE) return;
    var params = new URLSearchParams(location.search);
    var dev = params.get('dev');
    if (!dev) return;
    if (dev !== 'tutorial' && PVZ.state.data) PVZ.state.data.tutorialSeen = true;
    // в отладочных сценах обязательные приложения уже стоят (кроме обучения и магазина)
    if (dev !== 'tutorial' && dev !== 'apps' && PVZ.state.data) {
      PVZ.apps.CORE.forEach(function (id) {
        if (!PVZ.state.hasApp(id)) PVZ.state.data.apps.push(id);
      });
      PVZ.state.save();
    }
    var s;

    function dayScene() {
      s = PVZ.scenes.shift({ day: 1, phase: 'day' });
      G.setScene(s);
      s.debug.st.clock = 12 * 60;
      return s;
    }

    if (dev === 'day') {
      dayScene();
      s.debug.spawn();
      s.debug.spawn();
      s.debug.step();
    } else if (dev === 'cast') {
      dayScene();
      setTimeout(function () { try { s.debug.castTalk('marina'); } catch (e) { /* ignore */ } }, 200);
    } else if (dev === 'crowd') {
      // бесконечный режим: на кадре не нужен вечерний визит мафии
      PVZ.state.data.mode = 'endless';
      PVZ.state.data.debt = 0;
      PVZ.state.data.freed = true;
      dayScene();
      s.debug.st.day = 10;
      s.debug.st.shiftOpen = true;
      s.debug.st.doorOpen = true;
      s.debug.st.lightsOn = true;
      s.debug.st.clock = 15 * 60;
      for (var ci = 0; ci < 8; ci++) s.debug.spawn('question');
      s.debug.step();
    } else if (dev === 'boxes') {
      PVZ.state.data.mode = 'endless';
      PVZ.state.data.debt = 0;
      PVZ.state.data.freed = true;
      s = PVZ.scenes.shift({ day: 5, phase: 'day' });
      G.setScene(s);
      s.debug.view('hall');
      if (PVZ.boxes) {
        ['ticking', 'meow', 'music', 'moving'].forEach(function (k) { PVZ.boxes.add(k, 5); });
        s.debug.st.clock = 14 * 60;
      }
    } else if (dev === 'pickup') {
      dayScene();
      s.debug.spawn('pickup');
      s.debug.step();
      s.debug.st.customer.bubble = 'Здравствуйте! Вот мой код получения.';
    } else if (dev === 'question' || dev === 'return' || dev === 'resolve') {
      dayScene();
      s.debug.spawn(dev);
      s.debug.step();
      setTimeout(function () { s.onTap(620, 300); }, 120);
    } else if (dev === 'terminal') {
      dayScene();
      s.debug.spawn('pickup');
      s.debug.step();
      setTimeout(function () { s.debug.terminal(); }, 100);
    } else if (dev === 'warehouse') {
      dayScene();
      s.debug.view('warehouse');
    } else if (dev === 'rack') {
      dayScene();
      s.debug.spawn('pickup');
      s.debug.step();
      var cust = s.debug.st.customer;
      var target = s.debug.st.orders.find(function (o) { return o.code === cust.code; });
      if (target) { s.debug.st.rack = target.cell.charAt(0); s.debug.view('rack'); }
    } else if (dev === 'hall') {
      dayScene();
      s.debug.view('hall');
    } else if (dev === 'evening') {
      s = PVZ.scenes.shift({ day: 1, phase: 'evening' });
      G.setScene(s);
      s.debug.st.clock = 20 * 60 + 10;
      s.debug.view('hall');
    } else if (dev === 'morning') {
      s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
      G.setScene(s);
      s.debug.view('warehouse');
    } else if (dev === 'laptop') {
      dayScene();
      s.debug.spawn();
      s.debug.step();
      s.debug.laptop();
    } else if (dev === 'apps') {
      s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
      G.setScene(s);
      s.debug.appstore();
    } else if (dev === 'appsdesk') {
      s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
      G.setScene(s);
      s.debug.laptop();
    } else if (dev === 'scary' || dev === 'mafia') {
      G.setScene(PVZ.scenes.mafia({
        result: {
          day: 3, demand: 610, paid: 350, short: true, moneyBefore: 350, moneyAfter: 0,
          debtBefore: 8000, debtAfter: 7650, visits: 3, rage: false,
          taken: [{
            id: 'decor_cat', name: 'Фигурка кота', icon: '🐈', level: 2, tier: 'серебряный', price: 700,
            line: 'У тебя нет денег, чтобы расплатиться с нами? Тогда этот кот поможет. *собирает фигурку кота со стола*'
          }]
        },
        report: null
      }));
    } else if (dev === 'shop') {
      dayScene();
      s.debug.step();
      G.setScene(PVZ.scenes.shop({ from: 'dev' }));
    } else if (dev === 'devmenu') {
      dayScene();
      s.debug.spawn();
      s.debug.step();
      s.debug.st.dev.open = true;
    } else if (dev === 'report') {
      G.setScene(PVZ.scenes.report({ day: 3, served: 11, plan: 11, complaints: 1, returns: 2, received: 7, earned: 3120, rating: 4.4, money: 8640, bonus: 300, late: 1, referred: 3, refBonus: 90, boxStats: { shelf: 2, opened: 1, reported: 0, sent: 1, arrived: 2 }, castNums: 4 }));
    } else if (dev === 'intro') {
      G.setScene(PVZ.scenes.intro());
    } else if (dev === 'tutorial') {
      PVZ.state.data.tutorialSeen = false;
      s = PVZ.scenes.shift({ day: 1, phase: 'morning' });
      G.setScene(s);
    } else if (dev === 'bandit') {
      dayScene();
      s.debug.threat('bandit');
    } else if (dev === 'sick') {
      dayScene();
      s.debug.threat('sick');
    } else if (dev === 'fire') {
      dayScene();
      s.debug.threat('fire');
    } else if (dev === 'phone') {
      dayScene();
      s.debug.phone();
    }
  }

  /* видимая ошибка на канвасе — для отладки на устройстве */
  window.addEventListener('error', function (e) {
    G.lastError = (e.message || 'error') + ' — ' + ((e.filename || '').split('/').pop()) + ':' + (e.lineno || 0);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
