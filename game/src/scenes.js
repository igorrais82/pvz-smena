/* ПВЗ: Смена — сцены: меню, смена (утро → день → вечер), отчёт, магазин */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util, art = PVZ.art, sys = PVZ.sys;
  var scenes = (PVZ.scenes = {});
  var TARIFF = PVZ.tariff;

  var PHASE_LABEL = { morning: 'УТРО', day: 'ДЕНЬ', evening: 'ВЕЧЕР' };

  var MORNING_START = 7 * 60 + 45;
  var DAY_START = 9 * 60;
  var EVENING_START = 20 * 60;
  var CLOSE_LIMIT = 21 * 60 + 30;

  /* План растёт до 16 выдач: к десятой смене зал полон, и план честно
     требует скорости. Дальше давление создают терпение, поток людей и события. */
  function planFor(day) {
    return Math.min(16, 6 + Math.ceil(Math.max(1, day))) + (PVZ.state.level ? PVZ.state.level('ad') * 2 : 0);
  }
  function supplyFor(day) { return 5 + Math.min(4, Math.floor(day * 0.7)); }
  function storedFor(day) { return Math.min(16, 8 + Math.round(day * 1.2)); }
  /* Терпение тает быстрее с каждой сменой: 1.0 на первой, ~2.2 к десятой.
     Это главный источник напряжения: обслуживать надо всё быстрее. */
  function patienceScale(day) { return Math.min(2.2, 1 + Math.max(0, day - 1) * 0.15); }

  /* «Событие дня» — погода и обстоятельства, которые меняют правила смены.
     Выбирается заново каждое утро и показывается в HUD.
     Поля: patience — скорость усталости, spawn — интервал прихода покупателей,
     tip — чаевые, rating — сила падения рейтинга, supply — добавка к поставке,
     returns — доля возвратов, hard — все QTE сложнее, time — скорость часов,
     planAdd — правка плана дня, events — частота происшествий. */
  var DAY_MODS = [
    {
      id: 'calm', icon: '☀', label: 'обычный день', color: '#9fd6c6',
      desc: 'Без сюрпризов — работаем ровно.',
      patience: 1, spawn: 1, tip: 1, rating: 1, supply: 0
    },
    {
      id: 'rain', icon: '☂', label: 'дождь', color: '#8fb8e0',
      desc: 'Мокрые покупатели ждут хуже, зато чаевые щедрее.',
      patience: 1.15, spawn: 1, tip: 1.2, rating: 1, supply: 0
    },
    {
      id: 'sale', icon: '🏷', label: 'распродажа', color: '#ffb27a',
      desc: 'Покупателей заметно больше обычного.',
      patience: 1.05, spawn: 0.78, tip: 1.05, rating: 1, supply: 0
    },
    {
      id: 'heat', icon: '☀', label: 'жара', color: '#ff9d6a',
      desc: 'Все торопятся и хуже переносят ожидание.',
      patience: 1.22, spawn: 0.94, tip: 1.15, rating: 1, supply: 0
    },
    {
      id: 'holiday', icon: '🎉', label: 'праздник', color: '#ffd479',
      desc: 'Настроение хорошее: ждут дольше, чаевые щедрее.',
      patience: 0.85, spawn: 0.95, tip: 1.4, rating: 1, supply: 0
    },
    {
      id: 'check', icon: '📋', label: 'день проверки', color: '#ff8a5c',
      desc: 'Каждое нарушение бьёт по рейтингу больнее.',
      patience: 1.08, spawn: 1, tip: 0.95, rating: 1.4, supply: 0
    },
    {
      id: 'delivery', icon: '📦', label: 'день поставок', color: '#9fd6c6',
      desc: 'Курьеры везут коробки весь день: поставка больше обычной.',
      patience: 1, spawn: 1, tip: 1, rating: 1, supply: 2
    },
    {
      id: 'returns_day', icon: '↩', label: 'день возвратов', color: '#c9a2e8',
      desc: 'Маркетплейс прислал брак: каждый второй пришёл сдавать.',
      patience: 1.05, spawn: 1, tip: 0.85, rating: 1.1, supply: 0, returns: 2.4
    },
    {
      id: 'inventory', icon: '▤', label: 'инвентаризация', color: '#8fb8e0',
      desc: 'Склад считают поштучно: план выше, времени меньше.',
      patience: 1.05, spawn: 0.95, tip: 1, rating: 1, supply: 0, planAdd: 2, time: 1.12
    },
    {
      id: 'trainee', icon: '🎓', label: 'день стажёра', color: '#9fd6c6',
      desc: 'Стажёр путается под ногами: очередь растёт быстрее.',
      patience: 1.14, spawn: 0.88, tip: 1.1, rating: 1, supply: 0
    },
    {
      id: 'blackout', icon: '🔌', label: 'перебои со светом', color: '#ffb27a',
      desc: 'Свет мигает: все мини-игры сложнее.',
      patience: 1.1, spawn: 1, tip: 1.05, rating: 1, supply: 0, hard: true
    },
    {
      id: 'payday', icon: '💳', label: 'день зарплат', color: '#ffd479',
      desc: 'Люди получили деньги и несут их вам — чаевые жирнее.',
      patience: 1.05, spawn: 0.86, tip: 1.35, rating: 1, supply: 0
    },
    {
      id: 'frost', icon: '❄', label: 'мороз', color: '#8fb8e0',
      desc: 'На улице минус: ждут дольше, но идут неохотно.',
      patience: 0.88, spawn: 1.12, tip: 0.9, rating: 1, supply: 0
    },
    {
      id: 'incidents', icon: '⚠', label: 'день происшествий', color: '#ff8a5c',
      desc: 'Что-то случается каждые пару минут: не расслабляйтесь.',
      patience: 1.06, spawn: 1, tip: 1, rating: 1.05, supply: 0, events: 0.55
    },
    {
      id: 'quiet', icon: '🌙', label: 'тихий день', color: '#9fd6c6',
      desc: 'Людей мало и план скромнее — можно выдохнуть.',
      patience: 0.92, spawn: 1.18, tip: 0.95, rating: 1, supply: 0, planAdd: -3
    }
  ];
  function pickDayMod(day) {
    if (day <= 1) return DAY_MODS[0];
    // один и тот же день два раза подряд не выпадает
    var last = PVZ.state.data && PVZ.state.data.lastDayMod;
    var pool = DAY_MODS.filter(function (m) { return m.id !== 'calm' && m.id !== last; });
    if (!pool.length) pool = DAY_MODS;
    return U.pick(pool);
  }
  function dayModById(id) {
    for (var i = 0; i < DAY_MODS.length; i++) if (DAY_MODS[i].id === id) return DAY_MODS[i];
    return DAY_MODS[0];
  }
  // список событий дня доступен тестам и инструментам
  PVZ.dayMods = DAY_MODS;

  function wrap(ctx, text, x, y, maxW, size, color, weight, lineH, align) {
    var lines = U.wrapLines(ctx, text, maxW, size, weight);
    lines.forEach(function (l, i) {
      art.txt(ctx, l, x, y + i * (lineH || size * 1.35), size, color, weight, align || 'left');
    });
    return lines.length;
  }

  function labelChip(ctx, rect, text, enabled) {
    var size = 14;
    var w = art.txtW(ctx, text, size, 700) + 22;
    var x = rect.x + rect.w / 2 - w / 2;
    var y = rect.y + Math.max(0, rect.h - 34);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    art.fillRR(ctx, x, y, w, 30, 15, enabled ? 'rgba(242,153,74,0.96)' : 'rgba(60,50,44,0.9)');
    ctx.restore();
    art.txt(ctx, text, x + w / 2, y + 20, size, enabled ? '#2a1a10' : 'rgba(255,240,225,0.6)', 700, 'center');
  }

  /* =========================================================
     МАГАЗИН: общая панель для прилавка после смены и для ноутбука
     ========================================================= */
  var SHOP_PANEL = { x: 150, y: 104, w: 980, h: 522 };
  var SHOP_CLOSE = { x: 1096, y: 112, w: 32, h: 32 };
  function shopPanel() {
    return art.compact ? { x: 16, y: 36, w: 1248, h: 548 } : SHOP_PANEL;
  }
  function shopClose() {
    return art.compact ? { x: 1216, y: 64, w: 36, h: 36 } : SHOP_CLOSE;
  }

  function ShopUI(opts) {
    opts = opts || {};
    this.tab = 'up';
    this.page = 0;
    this.msg = '';
    this.msgT = 0;
    this.title = opts.title || 'МАГАЗИН ПВЗ';
    this.subtitle = opts.subtitle || 'Смена закрыта — самое время вложиться в пункт';
    this.showClose = !!opts.close;
    this.t = 0;
  }
  ShopUI.prototype.items = function () { return sys.shopByCat(this.tab); };
  ShopUI.prototype.perPage = function () { return art.compact ? 6 : 8; };
  ShopUI.prototype.pages = function () { return Math.max(1, Math.ceil(this.items().length / this.perPage())); };
  ShopUI.prototype.pageItems = function () {
    var p = this.perPage();
    return this.items().slice(this.page * p, this.page * p + p);
  };
  ShopUI.prototype.tabRects = function () {
    var p = shopPanel();
    var compact = art.compact;
    var ty = p.y + (compact ? 92 : 66);
    var th = compact ? 48 : 36;
    var tw = compact ? 210 : 170;
    return [
      { id: 'up', rect: { x: p.x + 26, y: ty, w: tw, h: th }, label: 'Улучшения' },
      { id: 'decor', rect: { x: p.x + 26 + tw + 12, y: ty, w: tw, h: th }, label: 'Декор' }
    ];
  };
  ShopUI.prototype.cardRects = function () {
    var p = shopPanel();
    var compact = art.compact;
    var out = [];
    var gap = compact ? 10 : 8;
    var cw = (p.w - 52 - gap) / 2;
    var chH = compact ? 100 : 80;
    var top = p.y + (compact ? 146 : 116);
    this.pageItems().forEach(function (it, i) {
      out.push({
        item: it,
        rect: {
          x: p.x + 26 + (i % 2) * (cw + gap),
          y: top + Math.floor(i / 2) * (chH + (compact ? 10 : 8)),
          w: cw, h: chH
        }
      });
    });
    return out;
  };
  ShopUI.prototype.draw = function (ctx, t) {
    var p = shopPanel();
    var compact = art.compact;
    var money = PVZ.state.data ? PVZ.state.data.money : 0;
    var ts = compact ? 1.35 : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(8,5,4,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    art.panel(ctx, p.x, p.y, p.w, p.h, { bg: 'rgba(30,22,18,0.98)', r: 20, border: 'rgba(255,210,160,0.24)' });

    art.txt(ctx, this.title, p.x + 26, p.y + 40 * (compact ? 1.15 : 1), 22 * ts, '#ffd8a8', 800);
    art.txt(ctx, this.subtitle, p.x + 26, p.y + 58 * (compact ? 1.3 : 1), 12 * ts, 'rgba(255,240,220,0.62)', 600);
    art.txt(ctx, 'В кошельке', p.x + p.w - 70, p.y + 26, 10 * ts, 'rgba(255,236,214,0.62)', 800, 'right');
    art.txt(ctx, U.fmtMoney(money), p.x + p.w - 70, p.y + 52 * (compact ? 1.1 : 1), 22 * ts, '#ffd479', 800, 'right');

    if (this.showClose) {
      var sc = shopClose();
      var hovX = U.hit(sc, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, sc.x, sc.y, sc.w, sc.h, 8, hovX ? '#e4572e' : 'rgba(255,255,255,0.1)');
      art.txt(ctx, '✕', sc.x + sc.w / 2, sc.y + sc.h / 2 + 7, 18 * ts, '#fff', 700, 'center');
    }

    this.tabRects().forEach(function (tb) {
      var active = tb.id === this.tab;
      var hov = U.hit(tb.rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, tb.rect.x, tb.rect.y, tb.rect.w, tb.rect.h, 10,
        active ? 'rgba(242,153,74,0.95)' : hov ? 'rgba(90,70,56,0.95)' : 'rgba(255,255,255,0.07)');
      art.txt(ctx, tb.label, tb.rect.x + tb.rect.w / 2, tb.rect.y + tb.rect.h / 2 + 6, (compact ? 19 : 15) * (compact ? 1 : 1),
        active ? '#2a1a10' : '#f7ead8', 700, 'center');
    }, this);

    this.cardRects().forEach(function (c) {
      var it = c.item, r = c.rect;
      var level = PVZ.state.level(it.id);
      var owned = level > 0;
      var tier = PVZ.tier(level || 1);
      var nextCost = PVZ.state.upgradeCost(it.id);
      var afford = money >= (owned ? nextCost : it.price);
      var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? 'rgba(64,47,37,0.98)' : 'rgba(255,255,255,0.045)');
      var edge = !owned ? (hov ? 'rgba(255,200,150,0.45)' : 'rgba(255,235,210,0.12)')
        : level >= 3 ? 'rgba(242,193,74,0.72)' : level === 2 ? 'rgba(199,216,228,0.62)' : 'rgba(127,224,160,0.5)';
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 12, edge, level >= 3 ? 1.9 : 1.4);
      var iconS = compact ? 64 : 56;
      var iconX = r.x + (compact ? 14 : 12);
      var iconY = r.y + (compact ? 14 : 12);
      art.fillRR(ctx, iconX, iconY, iconS, iconS, 10, it.cat === 'decor' ? 'rgba(90,168,119,0.25)' : 'rgba(242,153,74,0.22)');
      art.txt(ctx, it.icon, iconX + iconS / 2, iconY + iconS / 2 + 8, (compact ? 30 : 26), '#ffd8a8', 700, 'center');
      // уровень: три точки под иконкой
      for (var li = 0; li < 3; li++) {
        ctx.beginPath();
        ctx.arc(r.x + (compact ? 24 : 22) + li * 14, r.y + (compact ? 86 : 70), 4, 0, Math.PI * 2);
        ctx.fillStyle = owned && li < level ? PVZ.tier(li + 1).metal : 'rgba(255,255,255,0.18)';
        ctx.fill();
      }
      var nameSize = compact ? 19 : 16;
      var descSize = compact ? 14 : 11;
      var priceSize = compact ? 19 : 15;
      var subSize = compact ? 13 : 10;
      var nameY = r.y + (compact ? 38 : 28);
      var descY = r.y + (compact ? 64 : 50);
      var subY = r.y + (compact ? 88 : 68);
      art.txt(ctx, it.name, r.x + iconS + 30, nameY, nameSize, '#fff3e2', 700);
      var descW = r.w - iconS - 30 - 150;
      var desc = (owned && it.eff ? it.eff[level - 1] : it.desc);
      var shown = art.fitTxt(ctx, desc, descW, descSize, 600, compact ? 11 : 9);
      art.txt(ctx, shown.text, r.x + iconS + 30, descY, shown.size, 'rgba(255,240,220,0.72)', 600);
      if (!owned) {
        art.txt(ctx, U.fmtMoney(it.price), r.x + r.w - 16, nameY, priceSize, afford ? '#ffd479' : 'rgba(255,150,120,0.9)', 800, 'right');
        art.txt(ctx, afford ? 'купить' : 'не хватает', r.x + r.w - 16, descY, subSize,
          afford ? 'rgba(255,240,220,0.62)' : 'rgba(255,160,130,0.8)', 600, 'right');
        if (!compact) art.txt(ctx, '3 уровня прокачки', r.x + 82, subY, 9, 'rgba(255,228,190,0.62)', 600);
      } else if (level < PVZ.balance.maxLevel) {
        art.txt(ctx, tier.name.toUpperCase(), r.x + r.w - 16, nameY - 4, subSize, tier.color, 800, 'right');
        art.txt(ctx, U.fmtMoney(nextCost), r.x + r.w - 16, nameY + 20, priceSize, afford ? '#ffd479' : 'rgba(255,150,120,0.9)', 800, 'right');
        art.txt(ctx, afford ? 'улучшить' : 'не хватает', r.x + r.w - 16, descY + 16, subSize,
          afford ? 'rgba(255,240,220,0.62)' : 'rgba(255,160,130,0.8)', 600, 'right');
        if (!compact) art.txt(ctx, 'след: ' + PVZ.tier(level + 1).name, r.x + 82, subY, 9, 'rgba(255,228,190,0.62)', 600);
      } else {
        art.txt(ctx, 'ЗОЛОТО', r.x + r.w - 16, nameY - 4, subSize, '#ffd479', 800, 'right');
        art.txt(ctx, 'МАКС', r.x + r.w - 16, nameY + 20, priceSize, '#ffd479', 800, 'right');
        if (!compact) art.txt(ctx, 'макс. уровень', r.x + 82, subY, 9, 'rgba(242,193,74,0.7)', 600);
      }
    });

    // подсказка внизу панели (на крупном шрифте не помещается — скрываем)
    if (art.textScale <= 1.08 && !compact) {
      if (this.tab === 'decor') {
        var comfortPct = Math.round((PVZ.state.mods ? PVZ.state.mods().comfort : 0) * 100);
        art.txt(ctx, 'Уют: +' + (PVZ.balance.decorPatience * 100).toFixed(1).replace('.', ',') + '% за каждый уровень · сейчас +' + comfortPct + '% из +' + Math.round(PVZ.balance.decorMax * 100) + '%',
          p.x + 26, p.y + p.h - 58, 11, 'rgba(255,240,220,0.55)', 600);
      } else {
        art.txt(ctx, 'Улучшайте купленное: обычный → серебряный → золотой. Характеристики растут с каждым уровнем.',
          p.x + 26, p.y + p.h - 58, 11, 'rgba(255,240,220,0.55)', 600);
      }
    }

    // страницы
    if (this.pages() > 1) {
      var py = p.y + p.h - 40;
      var prev = { x: p.x + p.w / 2 - 110, y: py - 8, w: 90, h: 30 };
      var next = { x: p.x + p.w / 2 + 20, y: py - 8, w: 90, h: 30 };
      var ph = U.hit(prev, PVZ.input.x, PVZ.input.y), nh = U.hit(next, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, prev.x, prev.y, prev.w, prev.h, 8, ph ? '#f2994a' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '◀', prev.x + 45, prev.y + 21, 15, ph ? '#2a1a10' : '#f7ead8', 700, 'center');
      art.fillRR(ctx, next.x, next.y, next.w, next.h, 8, nh ? '#f2994a' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '▶', next.x + 45, next.y + 21, 15, nh ? '#2a1a10' : '#f7ead8', 700, 'center');
      art.txt(ctx, (this.page + 1) + ' / ' + this.pages(), p.x + p.w / 2, py + 14, 12, 'rgba(255,240,220,0.6)', 700, 'center');
    }

    if (this.msg) {
      var alpha = U.clamp(this.msgT, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      art.txt(ctx, this.msg, p.x + p.w / 2, p.y + p.h - 12, 14, '#ffd8a8', 700, 'center');
      ctx.restore();
    }
    ctx.restore();
  };
  ShopUI.prototype.update = function (dt) {
    if (this.msg) { this.msgT += dt; if (this.msgT > 3.5) { this.msg = ''; this.msgT = 0; } }
  };
  ShopUI.prototype.tap = function (x, y) {
    var self = this;
    if (this.showClose && U.hit(shopClose(), x, y)) return { action: 'close' };
    var tabs = this.tabRects();
    for (var i = 0; i < tabs.length; i++) {
      if (U.hit(tabs[i].rect, x, y)) {
        if (this.tab !== tabs[i].id) { this.tab = tabs[i].id; this.page = 0; PVZ.audio.ui(); }
        return { action: 'tab' };
      }
    }
    var cards = this.cardRects();
    for (var c = 0; c < cards.length; c++) {
      if (U.hit(cards[c].rect, x, y)) return { action: 'buy', id: cards[c].item.id };
    }
    if (this.pages() > 1) {
      var p = shopPanel();
      var py = p.y + p.h - 40;
      var prev = { x: p.x + p.w / 2 - 110, y: py - 8, w: 90, h: 30 };
      var next = { x: p.x + p.w / 2 + 20, y: py - 8, w: 90, h: 30 };
      if (U.hit(prev, x, y)) { this.page = (this.page + this.pages() - 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
      if (U.hit(next, x, y)) { this.page = (this.page + 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
    }
    void self;
    return null;
  };
  ShopUI.prototype.handleBuy = function (id) {
    var item = sys.shopItem(id);
    if (!item) return;
    if (PVZ.state.owns(id)) {
      var lv = PVZ.state.level(id);
      if (lv >= PVZ.balance.maxLevel) {
        this.msg = item.name + ' уже золотой — максимальный уровень.';
        this.msgT = 0;
        PVZ.audio.ui();
        return;
      }
      var cost = PVZ.state.upgradeCost(id);
      if (PVZ.state.upgrade(id)) {
        PVZ.audio.coin();
        PVZ.audio.level();
        this.msg = item.name + ' улучшен до «' + PVZ.tier(lv + 1).name + '»!';
        this.msgT = 0;
      } else {
        PVZ.audio.bad();
        this.msg = 'Не хватает ' + U.fmtMoney(cost - (PVZ.state.data ? PVZ.state.data.money : 0)) + ' на улучшение.';
        this.msgT = 0;
      }
      return;
    }
    if (PVZ.state.buy(id)) {
      PVZ.audio.coin();
      PVZ.audio.level();
      this.msg = 'Куплено: ' + item.name + '. Уже работает!';
      this.msgT = 0;
    } else {
      PVZ.audio.bad();
      this.msg = 'Не хватает ' + U.fmtMoney(item.price - (PVZ.state.data ? PVZ.state.data.money : 0)) + '.';
      this.msgT = 0;
    }
  };
  scenes.ShopUI = ShopUI;

  /* =========================================================
     ОТЗЫВЫ: список в ноутбуке, ответы и накрутки
     ========================================================= */
  var REVIEWS_BOX = { x: 224, y: 192, w: 832, h: 380 };
  var REVIEWS_SUMMARY = { x: 224, y: 192, w: 200, h: 380 };
  var REVIEWS_LIST = { x: 440, y: 192, w: 616, h: 380 };
  var REVIEWS_PER_PAGE = 3;

  function ReviewsUI() {
    this.page = 0;
    this.sel = null;
    this.msg = '';
    this.msgT = 0;
    this.t = 0;
  }
  ReviewsUI.prototype.list = function () {
    return ((PVZ.state.data && PVZ.state.data.reviews) || []).slice().reverse();
  };
  ReviewsUI.prototype.pages = function () { return Math.max(1, Math.ceil(this.list().length / REVIEWS_PER_PAGE)); };
  ReviewsUI.prototype.pageItems = function () {
    this.page = Math.min(this.page, this.pages() - 1);
    var p = REVIEWS_PER_PAGE;
    return this.list().slice(this.page * p, this.page * p + p);
  };
  ReviewsUI.prototype.cardRects = function () {
    var out = [];
    var L = REVIEWS_LIST;
    this.pageItems().forEach(function (r, i) {
      out.push({ review: r, rect: { x: L.x + 12, y: L.y + 40 + i * 102, w: L.w - 24, h: 94 } });
    });
    return out;
  };
  ReviewsUI.prototype.navRects = function () {
    var L = REVIEWS_LIST;
    return {
      prev: { x: L.x + 40, y: L.y + L.h - 34, w: 80, h: 26 },
      next: { x: L.x + L.w - 120, y: L.y + L.h - 34, w: 80, h: 26 }
    };
  };
  ReviewsUI.prototype.replyRects = function () {
    var L = REVIEWS_LIST;
    var out = [];
    for (var i = 0; i < 3; i++) {
      out.push({ id: this.replyOptions()[i] ? this.replyOptions()[i].id : null, rect: { x: L.x + 12, y: L.y + 214 + i * 52, w: L.w - 24, h: 44 } });
    }
    return out;
  };
  ReviewsUI.prototype.replyOptions = function () {
    var r = this.sel;
    if (!r) return [];
    if (r.replied) return [];
    if (r.fake) {
      return [
        { id: 'report', label: 'Пожаловаться на накрутку', hint: 'шанс удалить отзыв · +репутация', color: '#8fe0a8' },
        { id: 'polite', label: 'Вежливо ответить', hint: 'небольшой плюс к репутации', color: '#ffd8a8' },
        { id: 'ignore', label: 'Проигнорировать', hint: 'без изменений', color: 'rgba(255,240,220,0.6)' }
      ];
    }
    return [
      {
        id: 'polite',
        label: r.score >= 4 ? 'Поблагодарить покупателя' : 'Извиниться и предложить решение',
        hint: r.score >= 4 ? '+репутация' : 'шанс повысить оценку · +репутация',
        color: '#8fe0a8'
      },
      { id: 'fix', label: 'Ответить по существу и помочь', hint: 'шанс повысить оценку', color: '#ffd8a8' },
      { id: 'rude', label: 'Ответить резко', hint: '−репутация', color: '#ff9d8a' }
    ];
  };
  ReviewsUI.prototype.draw = function (ctx) {
    var st = sys.reviewStats();
    var S = REVIEWS_SUMMARY, L = REVIEWS_LIST;
    ctx.save();
    // сводка
    art.fillRR(ctx, S.x, S.y, S.w, S.h, 14, 'rgba(255,255,255,0.045)');
    art.strokeRR(ctx, S.x, S.y, S.w, S.h, 14, 'rgba(140,210,190,0.2)', 1.2);
    art.txt(ctx, 'ОТЗЫВЫ', S.x + 16, S.y + 28, 14, '#9fd6c6', 800);
    art.txt(ctx, st.count ? st.avg.toFixed(1) : '—', S.x + 16, S.y + 78, 38, '#ffd479', 900);
    art.txt(ctx, 'из 5,00', S.x + 16, S.y + 100, 11, 'rgba(200,235,225,0.55)', 600);
    if (st.count) {
      art.stars(ctx, S.x + 16, S.y + 118, st.avg, 12);
      art.txt(ctx, st.count + ' ' + U.plural(st.count, 'отзыв', 'отзыва', 'отзывов'), S.x + 16, S.y + 142, 11, 'rgba(200,235,225,0.65)', 600);
    } else {
      art.txt(ctx, 'Пока нет отзывов', S.x + 16, S.y + 130, 11, 'rgba(200,235,225,0.5)', 600);
    }
    // распределение
    for (var i = 0; i < 5; i++) {
      var y = S.y + 170 + i * 22;
      var n = st.counts[i] || 0;
      var pct = st.count ? n / st.count : 0;
      art.txt(ctx, (5 - i) + '★', S.x + 16, y, 10, 'rgba(255,240,220,0.6)', 700);
      art.bar(ctx, S.x + 44, y - 8, 110, 7, pct, i < 2 ? '#e4572e' : i === 2 ? '#f2c14a' : '#5aa877', 'rgba(0,0,0,0.35)');
      art.txt(ctx, String(n), S.x + 164, y, 10, 'rgba(255,240,220,0.5)', 600, 'right');
    }
    if (st.fake) {
      art.txt(ctx, 'подозрительных: ' + st.fake, S.x + 16, S.y + 300, 10, '#ff9d8a', 700);
    }
    wrap(ctx, 'Хороший ответ поднимает рейтинг ПВЗ, грубый — роняет.', S.x + 16, S.y + 326, S.w - 32, 11, 'rgba(200,235,225,0.5)', 600, 15);
    // текущий рейтинг
    art.txt(ctx, 'РЕЙТИНГ ПВЗ', S.x + 16, S.y + S.h - 20, 9, 'rgba(200,235,225,0.4)', 800);
    art.txt(ctx, (PVZ.state.data.rating || 0).toFixed(2), S.x + S.w - 16, S.y + S.h - 20, 14, '#ffd479', 800, 'right');

    // правая часть
    art.fillRR(ctx, L.x, L.y, L.w, L.h, 14, 'rgba(255,255,255,0.035)');
    art.strokeRR(ctx, L.x, L.y, L.w, L.h, 14, 'rgba(140,210,190,0.18)', 1.2);

    if (this.sel) {
      this.drawReply(ctx);
      ctx.restore();
      return;
    }

    art.txt(ctx, 'ПОСЛЕДНИЕ ОТЗЫВЫ', L.x + 16, L.y + 26, 12, '#9fd6c6', 800);
    art.txt(ctx, this.pages() > 1 ? (this.page + 1) + ' / ' + this.pages() : '', L.x + L.w - 16, L.y + 26, 11, 'rgba(200,235,225,0.5)', 700, 'right');

    var cards = this.cardRects();
    if (!cards.length) {
      art.txt(ctx, 'Покупатели пока не оставили отзывов.', L.x + L.w / 2, L.y + 180, 14, 'rgba(200,235,225,0.45)', 600, 'center');
    }
    cards.forEach(function (c) {
      var r = c.review, rect = c.rect;
      var hov = U.hit(rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, rect.x, rect.y, rect.w, rect.h, 10, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.045)');
      art.strokeRR(ctx, rect.x, rect.y, rect.w, rect.h, 10, hov ? 'rgba(160,240,220,0.5)' : 'rgba(255,255,255,0.09)', 1.1);
      art.txt(ctx, r.author, rect.x + 14, rect.y + 22, 13, '#fff3e2', 700);
      var ax = rect.x + 14 + art.txtW(ctx, r.author, 13, 700) + 10;
      if (r.fake) {
        art.fillRR(ctx, ax, rect.y + 9, 70, 18, 9, 'rgba(228,87,46,0.25)');
        art.txt(ctx, 'накрутка?', ax + 35, rect.y + 22, 9, '#ff9d8a', 800, 'center');
      }
      art.stars(ctx, rect.x + rect.w - 90, rect.y + 16, r.score, 9);
      art.txt(ctx, 'день ' + r.day, rect.x + rect.w - 14, rect.y + 38, 9, 'rgba(200,235,225,0.4)', 600, 'right');
      var lines = U.wrapLines(ctx, r.text, rect.w - 160, 12, 600).slice(0, 2);
      lines.forEach(function (ln, li) { art.txt(ctx, ln, rect.x + 14, rect.y + 46 + li * 15, 12, 'rgba(240,250,246,0.78)', 600); });
      if (r.replied) {
        art.txt(ctx, '✓ ответ дан', rect.x + 14, rect.y + rect.h - 12, 10, '#8fe0a8', 700);
      } else {
        var bw = 86, bx = rect.x + rect.w - bw - 12, by = rect.y + rect.h - 30;
        var bhov = U.hit({ x: bx, y: by, w: bw, h: 22 }, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, bx, by, bw, 22, 11, bhov ? '#f2994a' : 'rgba(242,153,74,0.18)');
        art.txt(ctx, 'Ответить', bx + bw / 2, by + 15, 10, bhov ? '#2a1a10' : '#ffd8a8', 800, 'center');
      }
    });

    // страницы
    if (this.pages() > 1) {
      var nav = this.navRects();
      var ph = U.hit(nav.prev, PVZ.input.x, PVZ.input.y), nh = U.hit(nav.next, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, nav.prev.x, nav.prev.y, nav.prev.w, nav.prev.h, 8, ph ? '#f2994a' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '◀', nav.prev.x + nav.prev.w / 2, nav.prev.y + 18, 13, ph ? '#2a1a10' : '#f7ead8', 700, 'center');
      art.fillRR(ctx, nav.next.x, nav.next.y, nav.next.w, nav.next.h, 8, nh ? '#f2994a' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '▶', nav.next.x + nav.next.w / 2, nav.next.y + 18, 13, nh ? '#2a1a10' : '#f7ead8', 700, 'center');
    }
    if (this.msg) {
      ctx.save();
      ctx.globalAlpha = U.clamp(this.msgT, 0, 1);
      art.txt(ctx, this.msg, L.x + L.w / 2, L.y + L.h - 16, 11, '#ffd8a8', 700, 'center');
      ctx.restore();
    }
    ctx.restore();
  };

  ReviewsUI.prototype.drawReply = function (ctx) {
    var L = REVIEWS_LIST, r = this.sel;
    art.txt(ctx, 'ОТВЕТ НА ОТЗЫВ', L.x + 16, L.y + 26, 12, '#9fd6c6', 800);
    var back = { x: L.x + L.w - 120, y: L.y + 10, w: 104, h: 26 };
    var bh = U.hit(back, PVZ.input.x, PVZ.input.y);
    art.fillRR(ctx, back.x, back.y, back.w, back.h, 8, bh ? '#f2994a' : 'rgba(255,255,255,0.08)');
    art.txt(ctx, '← К списку', back.x + back.w / 2, back.y + 18, 10, bh ? '#2a1a10' : '#f7ead8', 700, 'center');

    art.txt(ctx, r.author, L.x + 16, L.y + 60, 15, '#fff3e2', 700);
    art.stars(ctx, L.x + 16 + art.txtW(ctx, r.author, 15, 700) + 12, L.y + 52, r.score, 11);
    if (r.fake) {
      art.fillRR(ctx, L.x + L.w - 110, L.y + 44, 94, 20, 10, 'rgba(228,87,46,0.25)');
      art.txt(ctx, 'накрутка?', L.x + L.w - 63, L.y + 58, 9, '#ff9d8a', 800, 'center');
    }
    art.txt(ctx, 'день ' + r.day, L.x + L.w - 16, L.y + 74, 9, 'rgba(200,235,225,0.4)', 600, 'right');
    var full = U.wrapLines(ctx, r.text, L.w - 32, 13, 600).slice(0, 3);
    full.forEach(function (ln, li) { art.txt(ctx, ln, L.x + 16, L.y + 92 + li * 19, 13, 'rgba(240,250,246,0.82)', 600); });

    if (r.replied) {
      art.fillRR(ctx, L.x + 16, L.y + 150, L.w - 32, 50, 10, 'rgba(90,168,119,0.14)');
      art.txt(ctx, 'Ответ уже дан: ' + (r.replyResult || 'вы ответили покупателю.'), L.x + 30, L.y + 180, 12, '#8fe0a8', 600);
      return;
    }

    art.txt(ctx, 'Выберите ответ:', L.x + 16, L.y + 158, 11, 'rgba(200,235,225,0.55)', 700);
    var rects = this.replyRects();
    var opts = this.replyOptions();
    rects.forEach(function (o, i) {
      var op = opts[i];
      if (!op) return;
      var hov = U.hit(o.rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, o.rect.x, o.rect.y, o.rect.w, o.rect.h, 9, hov ? 'rgba(242,153,74,0.9)' : 'rgba(255,255,255,0.05)');
      art.strokeRR(ctx, o.rect.x, o.rect.y, o.rect.w, o.rect.h, 9, hov ? '#ffdcb0' : 'rgba(255,255,255,0.1)', 1.1);
      art.txt(ctx, (i + 1) + '. ' + op.label, o.rect.x + 14, o.rect.y + 20, 13, hov ? '#2a1a10' : (op.color || '#f7ead8'), 700);
      art.txt(ctx, op.hint, o.rect.x + 14, o.rect.y + 35, 9, hov ? 'rgba(40,26,16,0.7)' : 'rgba(200,235,225,0.5)', 600);
    });
    if (this.msg) {
      ctx.save();
      ctx.globalAlpha = U.clamp(this.msgT, 0, 1);
      art.txt(ctx, this.msg, L.x + L.w / 2, L.y + L.h - 16, 11, '#ffd8a8', 700, 'center');
      ctx.restore();
    }
  };

  ReviewsUI.prototype.update = function (dt) {
    this.t += dt;
    if (this.msg) { this.msgT += dt; if (this.msgT > 4) { this.msg = ''; this.msgT = 0; } }
  };

  ReviewsUI.prototype.tap = function (x, y) {
    if (this.sel) {
      if (U.hit({ x: REVIEWS_LIST.x + REVIEWS_LIST.w - 120, y: REVIEWS_LIST.y + 10, w: 104, h: 26 }, x, y)) {
        this.sel = null; PVZ.audio.ui(); return { action: 'back' };
      }
      if (!this.sel.replied) {
        var rects = this.replyRects();
        for (var i = 0; i < rects.length; i++) {
          if (rects[i].id && U.hit(rects[i].rect, x, y)) {
            this.applyReply(rects[i].id);
            return { action: 'reply' };
          }
        }
      }
      return null;
    }
    var cards = this.cardRects();
    for (var c = 0; c < cards.length; c++) {
      if (U.hit(cards[c].rect, x, y)) {
        this.sel = cards[c].review;
        this.msg = '';
        PVZ.audio.ui();
        return { action: 'select' };
      }
    }
    if (this.pages() > 1) {
      var nav = this.navRects();
      if (U.hit(nav.prev, x, y)) { this.page = (this.page + this.pages() - 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
      if (U.hit(nav.next, x, y)) { this.page = (this.page + 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
    }
    return null;
  };

  ReviewsUI.prototype.applyReply = function (kind) {
    var r = this.sel;
    if (!r || r.replied) return;
    var d = PVZ.state.data;
    var delta = 0, message = '', remove = false;
    if (r.fake) {
      if (kind === 'report') {
        if (U.chance(0.55)) {
          remove = true; delta = 0.04;
          message = 'Жалоба принята: накрутка удалена. +репутация.';
        } else {
          delta = -0.01;
          message = 'Жалобу отклонили: отзыв остался.';
        }
      } else if (kind === 'polite') {
        delta = 0.015;
        message = 'Вежливый ответ на накрутку: небольшой плюс к репутации.';
      } else {
        message = 'Накрутку проигнорировали.';
      }
    } else if (kind === 'rude') {
      delta = -0.05;
      r.score = Math.max(1, r.score - 1);
      message = 'Резкий ответ: покупатель обиделся, рейтинг упал.';
    } else if (r.score >= 4) {
      delta = 0.02;
      message = 'Покупатель доволен ответом: +репутация.';
    } else if (kind === 'polite') {
      if (U.chance(0.6)) {
        r.score = Math.min(5, r.score + 2); delta = 0.05;
        message = 'Извинения приняты: оценка отзыва выросла.';
      } else {
        delta = 0.01; message = 'Ответ вежливый, но оценку не изменил.';
      }
    } else {
      if (U.chance(0.45)) {
        r.score = Math.min(5, r.score + 1); delta = 0.035;
        message = 'Покупатель оценил решение: оценка выросла.';
      } else {
        delta = 0.005; message = 'Ответ по существу: без изменений.';
      }
    }
    if (remove) {
      var idx = d.reviews.indexOf(r);
      if (idx >= 0) d.reviews.splice(idx, 1);
    } else {
      r.replied = true;
      r.reply = kind;
      r.replyResult = message;
    }
    if (delta) PVZ.state.addRating(delta);
    PVZ.state.save();
    this.msg = message;
    this.msgT = 0;
    this.sel = null;
    if (delta > 0) PVZ.audio.ok(); else if (delta < 0) PVZ.audio.bad(); else PVZ.audio.ui();
  };
  scenes.ReviewsUI = ReviewsUI;

  /* =========================================================
     ТЕЛЕФОН В НОУТБУКЕ: контакты и набор номера
     ========================================================= */
  var PHONE_CONTACTS = [
    { id: 'police', name: 'Полиция', num: '102', icon: '102', note: 'дежурная часть' },
    { id: 'ambulance', name: 'Скорая', num: '103', icon: '103', note: 'неотложная помощь' },
    { id: 'fire', name: 'Пожарные', num: '101', icon: '101', note: 'МЧС' },
    { id: 'mom', name: 'Мама', num: '+7 900 123-45-67', icon: 'М', note: 'просто позвонить' },
    { id: 'friend', name: 'Артём', num: '+7 900 555-11-22', icon: 'А', note: 'друг, знает город' },
    { id: 'support', name: 'Поддержка ПВЗ', num: '8 800 100-14-14', icon: 'ПВЗ', note: 'помощь по смене' }
  ];

  function PhoneUI(opts) {
    opts = opts || {};
    this.onCall = opts.onCall || function () { return { text: 'Абонент недоступен.', tone: 'info' }; };
    this.screen = 'home';
    this.num = '';
    this.cur = null;
    this.t = 0;
    this.callT = 0;
    this.calling = false;
    this.result = null;
    this.rows = [];
    this.emg = [];
    this.keys = [];
    this.buttons = [];
    this.msg = '';
    this.msgT = 0;
  }
  PhoneUI.prototype.setResult = function (res) {
    this.result = res || null;
    this.calling = !!this.result;
    if (this.result) PVZ.audio.ok();
    else PVZ.audio.ui();
  };
  PhoneUI.prototype.startCall = function (contact) {
    this.cur = contact || null;
    this.screen = 'call';
    this.callT = 0;
    this.calling = true;
    this.result = null;
    PVZ.audio.ui();
    var res = this.onCall(this.cur ? this.cur.num : this.num, this.cur);
    if (res) {
      this.result = res;
      this.calling = false;
      if (res.tone === 'bad') PVZ.audio.bad(); else if (res.tone === 'good') PVZ.audio.ok();
    }
  };
  PhoneUI.prototype.update = function (dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.screen === 'call' && this.calling) {
      this.callT += dt;
    }
  };
  PhoneUI.prototype.draw = function (ctx) {
    var self = this;
    this.rows = [];
    this.emg = [];
    this.keys = [];
    this.buttons = [];
    var x0 = 232, y0 = 196, w = 816;

    if (this.screen === 'home') {
      art.txt(ctx, 'ТЕЛЕФОН · КОНТАКТЫ', x0, y0, 15, '#9fd6c6', 800);
      art.txt(ctx, 'Экстренные службы и близкие люди — всё в одном месте', x0, y0 + 20, 11, 'rgba(200,235,225,0.45)', 600);

      // контакты
      PHONE_CONTACTS.forEach(function (c, i) {
        var r = { x: x0, y: y0 + 40 + i * 52, w: 430, h: 46 };
        self.rows.push({ rect: r, contact: c });
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? 'rgba(242,153,74,0.22)' : 'rgba(255,255,255,0.05)');
        art.strokeRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? 'rgba(255,200,150,0.55)' : 'rgba(255,255,255,0.08)', 1.2);
        art.fillRR(ctx, r.x + 8, r.y + 7, 32, 32, 16, i < 3 ? 'rgba(228,87,46,0.28)' : 'rgba(90,168,119,0.22)');
        art.txt(ctx, c.icon, r.x + 24, r.y + 27, c.icon.length > 2 ? 11 : 14, '#fff', 800, 'center');
        art.txt(ctx, c.name, r.x + 50, r.y + 21, 15, '#fff3e2', 700);
        art.txt(ctx, c.num, r.x + 50, r.y + 38, 11, 'rgba(200,235,225,0.55)', 600);
        art.txt(ctx, c.note, r.x + r.w - 12, r.y + 30, 10, 'rgba(200,235,225,0.4)', 600, 'right');
      });

      // экстренные кнопки
      art.fillRR(ctx, x0 + 456, y0 + 40, 360, 168, 14, 'rgba(60,20,16,0.5)');
      art.strokeRR(ctx, x0 + 456, y0 + 40, 360, 168, 14, 'rgba(255,120,90,0.26)', 1.4);
      art.txt(ctx, 'ЭКСТРЕННЫЕ СЛУЖБЫ', x0 + 476, y0 + 66, 12, '#ffb59d', 800);
      [{ l: '101', n: 'Пожарные' }, { l: '102', n: 'Полиция' }, { l: '103', n: 'Скорая' }].forEach(function (e, i) {
        var r = { x: x0 + 476 + i * 110, y: y0 + 84, w: 100, h: 74 };
        self.emg.push({ rect: r, num: e.l, name: e.n, icon: e.l });
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? 'rgba(228,87,46,0.92)' : 'rgba(255,255,255,0.07)');
        art.strokeRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? '#ffd0b0' : 'rgba(255,255,255,0.12)', 1.3);
        art.txt(ctx, e.l, r.x + r.w / 2, r.y + 38, 26, hov ? '#2a1008' : '#ffd8a8', 900, 'center');
        art.txt(ctx, e.n, r.x + r.w / 2, r.y + 62, 10, hov ? 'rgba(42,16,8,0.8)' : 'rgba(255,235,220,0.55)', 600, 'center');
      });
      art.txt(ctx, 'Если в ПВЗ бандит — звоните 102 и не подавайте виду.', x0 + 476, y0 + 184, 11, 'rgba(255,190,170,0.6)', 600);

      var dialR = { x: x0 + 456, y: y0 + 226, w: 360, h: 46 };
      this.buttons.push({ id: 'dial', rect: dialR });
      var dh = U.hit(dialR, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, dialR.x, dialR.y, dialR.w, dialR.h, 12, dh ? 'rgba(242,153,74,0.9)' : 'rgba(255,255,255,0.07)');
      art.txt(ctx, 'Набрать номер', dialR.x + dialR.w / 2, dialR.y + 29, 15, dh ? '#2a1a10' : '#f7ead8', 700, 'center');
      var list = PHONE_CONTACTS.slice(3, 5);
      art.txt(ctx, 'Можно позвонить друзьям: ' + list.map(function (c) { return c.name; }).join(', '), x0 + 456, y0 + 298, 11, 'rgba(200,235,225,0.4)', 600);
      if (this.msg && this.msgT > 0) art.txt(ctx, this.msg, x0 + 456, y0 + 326, 12, '#9fe0c0', 600);
    } else if (this.screen === 'dial') {
      art.txt(ctx, 'НАБОР НОМЕРА', x0, y0, 15, '#9fd6c6', 800);
      art.txt(ctx, this.num || '— — —', x0, y0 + 56, 34, '#fff3e2', 800);
      art.txt(ctx, 'Введите номер или выберите службу', x0, y0 + 84, 12, 'rgba(200,235,225,0.45)', 600);
      var labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '☎'];
      for (var i = 0; i < 12; i++) {
        var r = { x: x0 + 430 + (i % 3) * 116, y: y0 + 40 + Math.floor(i / 3) * 62, w: 106, h: 54 };
        this.keys.push({ rect: r, label: labels[i] });
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        var isCall = labels[i] === '☎';
        art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, isCall ? (hov ? '#7fe0a0' : 'rgba(90,168,119,0.7)') : hov ? 'rgba(242,153,74,0.85)' : 'rgba(255,255,255,0.07)');
        art.txt(ctx, labels[i], r.x + r.w / 2, r.y + 36, 20, isCall ? '#0f2a1a' : hov ? '#2a1a10' : '#f7ead8', 800, 'center');
      }
      var back = { x: x0, y: y0 + 320, w: 170, h: 42 };
      this.buttons.push({ id: 'back', rect: back });
      var bh = U.hit(back, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, back.x, back.y, back.w, back.h, 10, bh ? 'rgba(242,153,74,0.85)' : 'rgba(255,255,255,0.07)');
      art.txt(ctx, '◀ Контакты', back.x + back.w / 2, back.y + 27, 14, bh ? '#2a1a10' : '#f7ead8', 700, 'center');
      art.txt(ctx, 'Подсказка: экстренные номера — 101, 102, 103.', x0, y0 + 300, 11, 'rgba(200,235,225,0.45)', 600);
    } else {
      // экран вызова
      var c = this.cur;
      var name = c ? c.name : (this.num || 'Неизвестный номер');
      var num = c ? c.num : this.num;
      var em = c && c.id === 'police' ? '102' : c && c.id === 'ambulance' ? '103' : c && c.id === 'fire' ? '101' : '☎';
      ctx.beginPath();
      ctx.arc(640, y0 + 92, 52, 0, Math.PI * 2);
      ctx.fillStyle = this.calling ? 'rgba(242,153,74,0.22)' : 'rgba(90,168,119,0.18)';
      ctx.fill();
      art.txt(ctx, em, 640, y0 + 104, em.length > 1 ? 28 : 40, '#fff', 800, 'center');
      art.txt(ctx, name, 640, y0 + 182, 24, '#fff3e2', 800, 'center');
      art.txt(ctx, num, 640, y0 + 206, 14, 'rgba(200,235,225,0.55)', 600, 'center');
      art.txt(ctx, this.calling ? 'ВЫЗОВ…' : 'ВЫЗОВ ЗАВЕРШЁН', 640, y0 + 244, 13, this.calling ? '#ffd479' : 'rgba(200,235,225,0.55)', 800, 'center');
      var sec = Math.floor(this.callT);
      art.txt(ctx, '00:' + (sec < 10 ? '0' : '') + sec, 640, y0 + 276, 20, this.calling ? '#9fd6c6' : 'rgba(200,235,225,0.4)', 700, 'center');
      if (this.result && this.result.text) {
        wrap(ctx, this.result.text, 440, y0 + 306, 400, 14,
          this.result.tone === 'bad' ? '#ff9d7a' : this.result.tone === 'good' ? '#9fe0c0' : 'rgba(230,240,235,0.7)', 600, 20, 'center');
      }
      var hang = { x: 540, y: y0 + 356, w: 200, h: 46 };
      this.buttons.push({ id: 'hangup', rect: hang });
      var hh = U.hit(hang, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, hang.x, hang.y, hang.w, hang.h, 12, hh ? '#e4572e' : 'rgba(228,87,46,0.75)');
      art.txt(ctx, 'Сбросить', hang.x + hang.w / 2, hang.y + 29, 15, '#fff', 700, 'center');
    }
    art.txt(ctx, 'Esc — назад / закрыть телефон', 640, 582, 11, 'rgba(200,235,225,0.35)', 600, 'center');
  };
  PhoneUI.prototype.tap = function (x, y) {
    var self = this;
    if (this.screen === 'home') {
      for (var i = 0; i < this.rows.length; i++) {
        if (U.hit(this.rows[i].rect, x, y)) { this.startCall(this.rows[i].contact); return; }
      }
      for (var e = 0; e < this.emg.length; e++) {
        if (U.hit(this.emg[e].rect, x, y)) {
          this.startCall({ id: this.emg[e].num === '102' ? 'police' : this.emg[e].num === '103' ? 'ambulance' : 'fire', name: this.emg[e].name, num: this.emg[e].num, icon: this.emg[e].icon });
          return;
        }
      }
      for (var b = 0; b < this.buttons.length; b++) {
        if (U.hit(this.buttons[b].rect, x, y) && this.buttons[b].id === 'dial') {
          this.screen = 'dial'; this.num = ''; PVZ.audio.click(); return;
        }
      }
      return;
    }
    if (this.screen === 'dial') {
      for (var k = 0; k < this.keys.length; k++) {
        if (U.hit(this.keys[k].rect, x, y)) {
          var lab = this.keys[k].label;
          PVZ.audio.key();
          if (lab === '⌫') this.num = this.num.slice(0, -1);
          else if (lab === '☎') {
            if (this.num.length >= 3) this.startCall({ id: 'unknown', name: 'Набранный номер', num: this.num, icon: '☎' });
            else { this.msg = 'Номер слишком короткий.'; this.msgT = 2; }
          } else if (this.num.length < 14) this.num += lab;
          return;
        }
      }
      for (var b2 = 0; b2 < this.buttons.length; b2++) {
        if (U.hit(this.buttons[b2].rect, x, y) && this.buttons[b2].id === 'back') {
          this.screen = 'home'; PVZ.audio.click(); return;
        }
      }
      return;
    }
    for (var b3 = 0; b3 < this.buttons.length; b3++) {
      if (U.hit(this.buttons[b3].rect, x, y) && this.buttons[b3].id === 'hangup') {
        this.screen = 'home'; this.calling = false; PVZ.audio.click(); return;
      }
    }
  };
  PhoneUI.prototype.key = function (k) {
    if (this.screen === 'dial') {
      if (/^[0-9]$/.test(k) && this.num.length < 14) { this.num += k; PVZ.audio.key(); return true; }
      if (k === 'Backspace') { this.num = this.num.slice(0, -1); return true; }
      if (k === 'Enter') { this.startCall({ id: 'unknown', name: 'Набранный номер', num: this.num, icon: '☎' }); return true; }
    }
    if (k === 'Escape') {
      if (this.screen !== 'home') { this.screen = 'home'; return true; }
      return false;
    }
    return false;
  };
  scenes.PhoneUI = PhoneUI;
  scenes.PHONE_CONTACTS = PHONE_CONTACTS;


  /* =========================================================
     СМЕНА
     ========================================================= */
  scenes.shift = function (cfg) {
    cfg = cfg || {};
    var mods = PVZ.state.mods ? PVZ.state.mods() : {};
    var st = {
      day: cfg.day || 1,
      phase: cfg.phase || 'morning',
      clock: cfg.clock != null ? cfg.clock : MORNING_START,
      view: 'counter',
      viewFade: 0,
      rack: 'A',
      t: 0,
      hots: [],
      hover: null,
      msg: null,
      msgT: 0,
      msgKind: 'info',
      held: null,
      customer: null,
      queue: [],
      leavers: [],
      crowd: [],
      orders: [],
      objectives: [],
      qte: null,
      dlg: null,
      terminal: null,
      phone: null,
      laptop: null,
      threat: null,
      tut: null,
      scannerHeld: false,
      placing: null,
      targetCell: null,
      targetOrder: null,
      fitting: [],
      /* сцена выдачи и особый гость смены */
      moment: null,
      special: null,
      specialBanner: 0,
      smash: null,
      cashDone: false,
      returnsDone: false,
      shiftOpen: false,
      lightsOn: false,
      doorOpen: false,
      spawnT: 8,
      nextT: 0,
      eventT: 30,
      bellRinging: 0,
      dust: [],
      talon: 1,
      plan: planFor(cfg.day || 1),
      mods: mods,
      dev: { open: false, patience: false },
      stats: { served: 0, complaints: 0, returns: 0, received: 0, revenue: 0, waitSum: 0, waitN: 0, late: 0, tips: 0, specials: 0, moments: 0 },
      lateDone: false,
      lateWaiting: false,
      catAnim: { anim: 'sit', t: 0 },
      catStorySpawned: false,
      friend: null,
      friendT: 0,
      friendCheck: 0,
      bossCallT: 0,
      shadyCooldown: 0,
      npcT: 6,
      npcSpawned: false,
      reviewBombDay: 0,
      arrest: null,
      arrestT: 0,
      /* серия быстрых выдач и «час пик» — то, что делает смену живой */
      combo: 0,
      comboBest: 0,
      comboFlash: 0,
      rush: null,
      rushNext: 0,
      // постоянные персонажи: очередь рекомендаций, «забытые» посылки и их звуки
      refQueue: [],
      boxIdx: 0,
      susT: 0,
      susPing: null,
      dayMod: DAY_MODS[0],
      morning: { light: false, terminal: false, door: false }
    };

    var api = { isShift: true };

    /* Артём — друг из соседнего ПВЗ. Приходит через смену утром поболтать. */
    var ARTEM_PERSON = art.makePerson({
      skin: 1, hair: '#4a3020', style: 'short', shirt: '#4a86b8', pants: '#2f3b46',
      coat: '#3a4a5a', expr: 'happy', glasses: false, beard: false, bangs: false, female: false
    });
    ARTEM_PERSON.name = 'Артём';
    ARTEM_PERSON.bag = 'backpack';
    ARTEM_PERSON.phone = 'smart';

    /* Полицейский, который приходит арестовывать за чёрный рынок */
    var COP_PERSON = art.makePerson({
      skin: 1, hair: '#2a2420', style: 'short', shirt: '#3c5a7a', pants: '#22303f',
      coat: '#2a3a4a', expr: 'neutral', hat: 'cap', beard: false, glasses: false,
      bangs: false, female: false
    });
    COP_PERSON.name = 'Сержант Грачёв';
    COP_PERSON.bag = 'none';
    COP_PERSON.phone = 'none';

    /* ---------------- утилиты сцены ---------------- */
    function msg(text, kind) { st.msg = text; st.msgT = 0; st.msgKind = kind || 'info'; }

    function boxNote() {
      if (!PVZ.boxes || !PVZ.boxes.count()) return '';
      return ' В зале у стены — забытые посылки: ' + PVZ.boxes.count() + '.';
    }

    function objective(id) { return st.objectives.find(function (o) { return o.id === id; }); }
    function setObjective(id, done) { var ob = objective(id); if (ob) ob.done = done; }
    function allObjectivesDone() { return st.objectives.length > 0 && st.objectives.every(function (o) { return o.done; }); }
    function eveningReady() {
      var list = st.objectives.filter(function (o) { return o.id !== 'shift'; });
      return list.length > 0 && list.every(function (o) { return o.done; });
    }

    /* Утренняя задача «установить приложения»: без них смену не открыть */
    function syncAppsObjective() {
      if (st.phase !== 'morning') return;
      var ob = objective('apps');
      if (!ob) return;
      var ready = PVZ.apps.coreReady();
      if (ready && !ob.done) {
        ob.done = true;
        ob.progress = '3/3';
        msg('Приложения установлены: терминал, маркет, отзывы.', 'good');
        PVZ.audio.ok();
        checkMorningDone();
      } else if (!ready) {
        if (ob.done) ob.done = false;
        ob.progress = (PVZ.apps.CORE.length - PVZ.apps.missingCore().length) + '/' + PVZ.apps.CORE.length;
      }
    }
    function phaseRate() {
      var base = st.phase === 'day' ? 1.38 : st.phase === 'evening' ? 1.0 : 0.8;
      return base * ((st.dayMod && st.dayMod.time) || 1);
    }
    function ordersIn(state) { return st.orders.filter(function (o) { return o.state === state; }); }
    function storedOrders() { return ordersIn('stored'); }
    function supplyOrders() { return ordersIn('new'); }
    function returnOrders() { return ordersIn('return'); }
    function orderById(id) { return st.orders.find(function (o) { return o.id === id; }); }
    function customerOrders(c) {
      if (!c || !c.orderIds) return [];
      return c.orderIds.map(orderById).filter(function (o) { return o && (o.state === 'stored' || o.state === 'fitting'); });
    }
    function firstOrderFor(c) {
      var list = customerOrders(c);
      return list.length ? list[0] : null;
    }
    function isMine(c, order) {
      return !!(c && order && c.orderIds && c.orderIds.indexOf(order.id) >= 0);
    }
    function payLabel(c) {
      return { card: 'оплата картой', cash: 'наличные', phone: 'оплата телефоном', watch: 'оплата часами' }[c.pay] || '';
    }

    /* ---------------- обучение первой смены ---------------- */
    var TUT_PANEL = { x: 930, y: 104, w: 332, h: 146 };
    // на телефоне панель обучения крупнее и стоит справа, не наезжая на карточку клиента
    function tutPanel() {
      return art.compact ? { x: 840, y: 116, w: 424, h: 236 } : TUT_PANEL;
    }
    function tutSkipRect() {
      var p = tutPanel();
      return { x: p.x + p.w - 196, y: p.y + p.h - 34, w: 184, h: 26 };
    }
    var TUT_STEPS = [
      {
        id: 'hall', text: 'Пройдите в зал: нажмите на дверь справа от стойки или смахните вправо.',
        check: function () { return st.view === 'hall'; }, where: '→ в зал'
      },
      {
        id: 'light', text: 'Включите свет: выключатель на стене у примерочной.',
        check: function () { return st.lightsOn; }, target: 'light', where: 'выключатель'
      },
      {
        id: 'apps',
        text: 'Вернитесь к стойке и откройте ноутбук (L). В «App Market» установите «Терминал ПВЗ», «Маркет ПВЗ» и «Отзывы» — без них смену не открыть.',
        check: function () { return PVZ.apps.coreReady(); }, target: 'laptop', where: 'App Market'
      },
      {
        id: 'terminal', text: 'Откройте смену в терминале (T) — или через ноутбук (L → Терминал).',
        check: function () { return st.shiftOpen; }, target: 'laptop', where: 'терминал'
      },
      {
        id: 'receive', text: 'На складе (дверь слева) нажмите на коробку и перетащите её в свободную ячейку стеллажа.',
        check: function () { return st.stats.received > 0 && supplyOrders().length === 0; }, where: '← на склад'
      },
      {
        id: 'door', text: 'Вернитесь в зал и откройте входную дверь — первый покупатель уже ждёт.',
        check: function () { return st.phase === 'day' && st.doorOpen; }, target: 'door', where: 'дверь'
      },
      {
        id: 'scan', text: 'Покупатель у стойки. Возьмите сканер слева, нажмите на покупателя и отсканируйте код с его телефона.',
        check: function () { var c = st.customer; return !!(c && (c.codeScanned || c.dictated)); }, target: 'scanner', where: 'сканер'
      },
      {
        id: 'fetch',
        text: function () { return 'Заказ в ячейке ' + (st.targetOrder ? st.targetOrder.cell : '—') + '. Пройдите на склад (←) и возьмите посылку.'; },
        check: function () { return !!st.held; }, where: '← на склад'
      },
      {
        id: 'parcel', text: 'Посылка в руках. Нажмите на свободное место слева на столе, чтобы положить её, затем возьмите сканер и отсканируйте штрихкод на коробке.',
        check: function () { return !!(st.held && st.held.onTable && st.held.scanned); }, target: 'parcel', where: 'стол'
      },
      {
        id: 'unpack', text: 'Коробка на столе. Нажмите на неё: возьмите нож, проведите им по скотчу, затем ножницами разрежьте пакет и достаньте товар.',
        check: function () { return !!(st.held && st.held.unpacked); }, target: 'parcel', where: 'вскрыть коробку'
      },
      {
        id: 'give', text: 'Товар у вас в руках. Нажмите на покупателя и отдайте заказ.',
        check: function () { return st.stats.served > 0; }, target: 'customer', where: 'покупатель'
      },
      {
        id: 'evening', text: 'Вечер: закройте дверь, уберите мусор, сдайте возвраты, сверьте кассу и закройте смену в терминале.',
        check: function () { return st.phase === 'evening' && eveningReady(); }, where: 'вечер'
      }
    ];

    st.tut = (st.day === 1 && PVZ.state.data && !PVZ.state.data.tutorialSeen)
      ? { idx: 0, on: true, flash: 0, firstSpawned: false }
      : null;

    function tutFinish() {
      if (!st.tut) return;
      st.tut.on = false;
      if (PVZ.state.data) {
        PVZ.state.data.tutorialSeen = true;
        PVZ.state.save();
      }
      PVZ.audio.level();
      msg('Обучение завершено. Дальше — самостоятельно.', 'good');
    }

    function tutRecompute() {
      if (!st.tut) return;
      st.tut.idx = 0;
      for (var tsi = 0; tsi < TUT_STEPS.length; tsi++) {
        if (TUT_STEPS[tsi].check()) st.tut.idx = tsi + 1; else break;
      }
    }

    function tutUpdate(dt) {
      if (!st.tut || !st.tut.on) return;
      if (st.tut.flash > 0) st.tut.flash = Math.max(0, st.tut.flash - dt);
      var guard = 0;
      while (st.tut.idx < TUT_STEPS.length && TUT_STEPS[st.tut.idx].check() && guard++ < TUT_STEPS.length) {
        st.tut.idx++;
        st.tut.flash = 1.4;
        PVZ.audio.ok();
        if (st.tut.idx < TUT_STEPS.length) {
          var nx = TUT_STEPS[st.tut.idx];
          var ntx = typeof nx.text === 'function' ? nx.text() : nx.text;
          msg('Обучение · шаг ' + (st.tut.idx + 1) + '/' + TUT_STEPS.length + ': ' + ntx, 'info');
        }
      }
      if (st.tut.idx >= TUT_STEPS.length) tutFinish();
    }

    function tutTargetRect(step) {
      if (!step || !step.target) return null;
      var L = art.LAYOUT;
      if (step.target === 'light' && st.view === 'hall') return L.hall.light;
      if (step.target === 'door' && st.view === 'hall') return L.hall.door;
      if (step.target === 'laptop' && st.view === 'counter') return L.counter.laptop;
      if (step.target === 'scanner' && st.view === 'counter') return L.counter.scanner;
      if (step.target === 'parcel' && st.view === 'counter') return L.counter.parcelOnTable;
      if (step.target === 'customer' && st.view === 'counter' && st.customer) {
        return { x: st.customer.vx - 90, y: st.customer.vgy - st.customer.vh * 0.82, w: 180, h: st.customer.vh * 0.84 };
      }
      return null;
    }

    function drawTutorial(ctx) {
      if (!st.tut || !st.tut.on) return;
      var step = TUT_STEPS[st.tut.idx];
      if (!step) return;
      var p = tutPanel();
      var ts = art.compact ? 1.6 : 1;
      art.panel(ctx, p.x, p.y, p.w, p.h, { bg: 'rgba(26,32,30,0.96)', r: 16, border: 'rgba(140,220,200,0.35)' });
      art.txt(ctx, 'ОБУЧЕНИЕ · ПЕРВАЯ СМЕНА', p.x + 18, p.y + 24 * (art.compact ? 1.2 : 1), 11 * ts, '#9fd6c6', 800);
      art.txt(ctx, (st.tut.idx + 1) + ' / ' + TUT_STEPS.length, p.x + p.w - 18, p.y + 24 * (art.compact ? 1.2 : 1), 11 * ts, '#ffd479', 800, 'right');
      var tx = typeof step.text === 'function' ? step.text() : step.text;
      wrap(ctx, tx, p.x + 18, p.y + (art.compact ? 58 : 50), p.w - 36, 12.5 * ts, '#f2e8da', 600, 16 * ts);
      if (step.where) art.txt(ctx, step.where, p.x + 18, p.y + p.h - 40, 11 * ts, 'rgba(255,210,150,0.75)', 700);
      var sk = tutSkipRect();
      var skh = U.hit(sk, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      art.txt(ctx, 'Пропустить обучение', sk.x + sk.w, sk.y + 16, 11 * ts, skh ? '#ffd8a8' : 'rgba(200,235,225,0.5)', 700, 'right');

      var tr = tutTargetRect(step);
      if (tr) {
        var pulse = 0.55 + 0.45 * Math.sin(st.t * 4.5);
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = 'rgba(255,206,130,' + (0.45 + pulse * 0.5) + ')';
        ctx.lineWidth = 3;
        art.rr(ctx, tr.x - 6, tr.y - 6, tr.w + 12, tr.h + 12, 12);
        ctx.stroke();
        ctx.restore();
        // стрелка-указатель
        var ax = tr.x + tr.w / 2, ay = Math.max(104, tr.y - 28 - Math.sin(st.t * 4) * 5);
        ctx.beginPath();
        ctx.moveTo(ax, ay + 18);
        ctx.lineTo(ax - 11, ay);
        ctx.lineTo(ax + 11, ay);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,200,120,' + (0.7 + pulse * 0.3) + ')';
        ctx.fill();
      }
    }

    /* ---------------- мафия, полиция, скорая, пожар ---------------- */
    var THREAT_INFO = {
      robber: { title: 'В ПВЗ ГРАБИТЕЛЬ', hint: 'Позвоните в полицию: ноутбук → Телефон → 102. И не подавайте виду.', color: '#ff8a5c' },
      thief: { title: 'В ПВЗ ВОР', hint: 'Он хочет на склад. Позвоните в полицию: ноутбук → Телефон → 102.', color: '#ffb27a' },
      sick: { title: 'ЧЕЛОВЕКУ ПЛОХО', hint: 'Вызовите скорую: ноутбук → Телефон → 103.', color: '#ffd479' },
      fire: { title: 'ПОЖАР В ПВЗ!', hint: 'Срочно звоните пожарным: ноутбук → Телефон → 101.', color: '#ff6a3c' }
    };

    function threatKey(th) {
      return th.kind === 'bandit' ? (th.variant || 'robber') : th.kind;
    }
    function threatBannerRect() { return { x: 380, y: 100, w: 520, h: 92 }; }
    function threatPersonRect() { return { x: 752, y: 168, w: 220, h: 336 }; }

    function spawnThreat(kind) {
      if (st.threat || st.phase !== 'day' || st.finished) return;
      // травмат с чёрного рынка: часть грабителей уходит, не начав
      if (kind === 'bandit' && PVZ.state.bananaHas('gun') && U.chance(0.6)) {
        PVZ.audio.bad();
        PVZ.state.addRating(0.02);
        msg('Грабитель заметил травмат за стойкой и быстро передумал.', 'good');
        return;
      }
      var th = { kind: kind, t: 0, warned: false, limit: 42 };
      if (kind === 'bandit') {
        th.variant = U.pick(['robber', 'thief']);
        th.limit = th.variant === 'thief' ? 46 : 42;
        th.person = {
          skin: th.variant === 'thief' ? 2 : 1,
          hair: '#1a1714', style: 'short', shirt: '#2a2a32', pants: '#1c1c22',
          coat: '#16161c', beard: true, expr: 'angry', glasses: th.variant === 'thief'
        };
      } else if (kind === 'sick') {
        th.limit = 40;
        th.person = {
          skin: 4, hair: '#3a2c20', style: 'short', shirt: '#7a8b99', pants: '#3c4a5a',
          expr: 'sad'
        };
      } else {
        th.limit = 36;
      }
      // глушилка с чёрного рынка тянет время до приезда полиции
      if (kind === 'bandit') th.limit += (st.mods.policeTime || 0);
      st.threat = th;
      PVZ.audio.bad();
      msg(THREAT_INFO[threatKey(th)].title + ': ' + THREAT_INFO[threatKey(th)].hint, 'bad');
    }

    function removeOwnedItem(id) {
      var d = PVZ.state.data;
      if (!d) return null;
      d.owned = (d.owned || []).filter(function (x) { return x !== id; });
      if (d.levels) delete d.levels[id];
      return id;
    }

    function threatFail(forced) {
      var th = st.threat;
      if (!th) return;
      var key = threatKey(th);
      st.threat = null;
      if (st.qte) st.qte = null;
      if (key === 'fire') { fireFail(); return; }
      if (key === 'sick') {
        PVZ.state.addRating(-0.35);
        st.stats.complaints++;
        PVZ.audio.bad();
        msg('Человек потерял сознание. Скорая приехала слишком поздно — жалоба и удар по репутации.', 'bad');
        PVZ.state.save();
        return;
      }
      if (th.variant === 'thief') {
        var stolen = st.orders.filter(function (o) { return o.state === 'stored'; }).slice(0, 2);
        stolen.forEach(function (o) { o.state = 'stolen'; });
        st.orders = st.orders.filter(function (o) { return o.state !== 'stolen'; });
        PVZ.state.addRating(-0.14);
        PVZ.audio.bad();
        msg(stolen.length
          ? 'Вор пробрался на склад и унёс ' + stolen.length + ' ' + U.plural(stolen.length, 'посылку', 'посылки', 'посылок') + '.'
          : 'Вор пробрался на склад, но там было пусто.', 'bad');
      } else {
        var d = PVZ.state.data;
        if (d.money >= 300) {
          var take = Math.min(d.money, Math.round(d.money * 0.35) + 200);
          d.money -= take;
          msg('Грабитель забрал ' + U.fmtMoney(take) + ' из кассы и скрылся.', 'bad');
        } else {
          var pick = sys.mafiaPickItem();
          if (pick) {
            removeOwnedItem(pick.id);
            msg('Грабитель забрал ' + pick.item.name + ' и скрылся. Нужно было звонить в полицию.', 'bad');
          } else {
            var all = d.money;
            d.money = 0;
            msg(all > 0 ? 'Грабитель забрал ' + U.fmtMoney(all) + ' и скрылся.' : 'Грабитель ушёл ни с чем, но напугал покупателей.', 'bad');
          }
        }
        PVZ.state.addRating(-0.16);
      }
      PVZ.state.save();
    }

    function policeArrive() {
      if (!st.threat || st.threat.kind !== 'bandit') return;
      st.threat = null;
      PVZ.state.addRating(0.14);
      PVZ.state.addMoney(150);
      st.stats.revenue += 150;
      PVZ.audio.level();
      msg('Полиция приехала и задержала преступника. Городская премия: +150 ₽', 'good');
    }

    function ambulanceArrive() {
      if (!st.threat || st.threat.kind !== 'sick') return { text: 'Диспетчер: «Вызова по адресу нет».', tone: 'info' };
      st.threat = null;
      PVZ.state.addRating(0.12);
      PVZ.audio.ok();
      msg('Скорая приехала вовремя. Человеку помогли, покупатели это оценили.', 'good');
      return { text: 'Скорая уже в пути. Человеку помогут.', tone: 'good' };
    }

    function extinguishFire() {
      if (!st.threat || st.threat.kind !== 'fire') return { text: 'Диспетчер: «Пожара по адресу не зарегистрировано».', tone: 'info' };
      st.threat = null;
      PVZ.state.addRating(0.2);
      PVZ.state.addMoney(300);
      st.stats.revenue += 300;
      PVZ.audio.level();
      msg('Пожарные потушили огонь. ПВЗ спасён, страховая выплата: +300 ₽', 'good');
      return { text: 'Пожарные выехали и уже тушат. Держитесь!', tone: 'good' };
    }

    function fireFail() {
      st.threat = null;
      st.qte = null;
      st.finished = true;
      var d = PVZ.state.data;
      var fin = {
        kind: 'fire',
        reason: 'Пожар уничтожил ПВЗ — вы не успели вызвать пожарных',
        day: st.day,
        days: d.totals.days,
        served: d.totals.served,
        earned: d.totals.earned,
        complaints: d.totals.complaints,
        money: d.money,
        rating: d.rating,
        debt: d.debt
      };
      d.over = true;
      d.won = false;
      d.finale = fin;
      d.shift = null;
      PVZ.state.save();
      PVZ.audio.bad();
      PVZ.game.goto(PVZ.scenes.gameover(fin));
    }

    function startThinCall() {
      if (!st.threat || st.threat.kind !== 'bandit') {
        msg('Полиция: «Вызов принят. Проверяем адрес».', 'info');
        return;
      }
      st.laptop = null;
      st.dlg = null;
      startQTE({
        type: 'calm',
        title: 'Звонок в полицию',
        sub: 'Не подавайте виду: дышите ровно и нажимайте в такт пульсу',
        hard: st.day > 4,
        onDone: function (ok) {
          if (!st.threat || st.threat.kind !== 'bandit') return;
          if (ok) policeArrive();
          else {
            PVZ.state.addRating(-0.05);
            msg('Вы не сдержали голос — преступник всё понял!', 'bad');
            threatFail(true);
          }
        }
      });
    }

    function openThreatPhone() {
      if (st.qte || st.dlg || st.terminal || st.phone) return;
      st.laptop = makeLaptop('phone');
      PVZ.audio.ui();
    }

    function handlePhoneCall(num, contact) {
      var digits = String(num || '').replace(/\D/g, '');
      var id = contact && contact.id;
      if (digits === '102' || id === 'police') {
        if (st.threat && st.threat.kind === 'bandit') {
          st.laptop = null;
          startThinCall();
          return null;
        }
        return { text: 'Диспетчер: «Наряд принял вызов, проверяем адрес». В ПВЗ пока спокойно.', tone: 'info' };
      }
      if (digits === '103' || id === 'ambulance') {
        if (st.threat && st.threat.kind === 'sick') return ambulanceArrive();
        return { text: 'Диспетчер: «Вызова по вашему адресу нет».', tone: 'info' };
      }
      if (digits === '101' || id === 'fire') {
        if (st.threat && st.threat.kind === 'fire') return extinguishFire();
        return { text: 'Диспетчер МЧС: «Пожара по адресу не зарегистрировано».', tone: 'info' };
      }
      if (id === 'friend') {
        PVZ.state.addRating(0.01);
        var next = sys.mafiaDemand(st.day + 1);
        return { text: 'Артём: «Слышал, мафия снова подняла ставку. В следующий раз жди ' + U.fmtMoney(next) + '».', tone: 'info' };
      }
      if (id === 'mom') {
        PVZ.state.addRating(0.015);
        return { text: 'Мама: «Ты поел? Держись там. Всё получится». Стало немного спокойнее.', tone: 'good' };
      }
      if (id === 'support') {
        var demand = sys.mafiaDemand(st.day);
        return { text: 'Поддержка: «Вечерний платёж сегодня — ' + U.fmtMoney(demand) + '. Держите кассу готовой».', tone: 'info' };
      }
      return { text: 'Никто не отвечает. Может, номер неверный.', tone: 'bad' };
    }

    function payBandit() {
      var th = st.threat;
      if (!th || th.kind !== 'bandit') return;
      var d = PVZ.state.data;
      var sum = Math.min(d.money, th.variant === 'thief' ? 600 : 1200);
      if (sum <= 0) { threatFail(true); return; }
      d.money -= sum;
      st.threat = null;
      PVZ.state.addRating(-0.04);
      PVZ.state.save();
      msg((th.variant === 'thief' ? 'Вор' : 'Грабитель') + ' забрал ' + U.fmtMoney(sum) + ' и ушёл. В полицию было бы надёжнее.', 'bad');
    }

    function attemptKickBandit() {
      if (!st.threat || st.threat.kind !== 'bandit') return;
      if (U.chance(0.4)) {
        st.threat = null;
        PVZ.state.addRating(-0.03);
        msg('Вы вытолкали его за дверь. Он запомнил ваш пункт.', 'info');
      } else {
        PVZ.audio.bad();
        threatFail(true);
      }
    }

    function openBanditDialog() {
      var th = st.threat;
      if (!th || th.kind !== 'bandit') return;
      var thief = th.variant === 'thief';
      openDialog({
        name: thief ? 'Вор' : 'Грабитель',
        person: th.person,
        role: 'подозрительный тип',
        mood: '😠 опасен',
        text: thief
          ? 'Я только посмотрю, что у вас на складе. Тише, и никто не пострадает.'
          : 'Быстро открывай кассу. И без глупостей, понял?',
        choices: [
          {
            label: 'Тихо достать телефон',
            hint: 'ноутбук → Телефон',
            cb: function () { openThreatPhone(); }
          },
          {
            label: 'Отдать деньги из кассы',
            hint: thief ? '−до 600 ₽' : '−до 1 200 ₽',
            cb: function () { payBandit(); }
          },
          {
            label: 'Попробовать выгнать',
            hint: 'риск · 40%',
            cb: function () { attemptKickBandit(); }
          },
          {
            label: 'Спокойно продолжить работу',
            hint: 'время идёт',
            cb: function () { msg('Он не сводит с вас глаз. Лучше позвонить в полицию.', 'bad'); }
          }
        ]
      });
    }

    function openSickDialog() {
      var th = st.threat;
      if (!th || th.kind !== 'sick') return;
      openDialog({
        name: 'Посетитель',
        person: th.person,
        role: 'ему плохо',
        mood: '🤢',
        text: 'Мне… плохо. Голова кружится, сейчас упаду…',
        choices: [
          { label: 'Вызвать скорую из ноутбука', hint: '103', cb: function () { openThreatPhone(); } },
          {
            label: 'Усадить и дать воды', hint: '−6 сек · риск', cb: function () {
              if (st.threat) st.threat.t = Math.max(0, st.threat.t - 0);
              PVZ.state.addRating(0.02);
              msg('Ему немного легче, но нужен врач. Вызовите скорую.', 'info');
            }
          },
          { label: 'Не вмешиваться', hint: '−репутация, если не успеют', cb: function () { msg('Он остался один. Скорая ещё не вызвана!', 'bad'); } }
        ]
      });
    }

    function updateThreat(dt) {
      if (!st.threat) return;
      var th = st.threat;
      th.t += dt;
      if (!th.warned && th.limit - th.t <= 10) {
        th.warned = true;
        PVZ.audio.bad();
        msg('Осталось 10 секунд! ' + THREAT_INFO[threatKey(th)].hint, 'bad');
      }
      if (th.t >= th.limit) threatFail();
    }

    function threatCrowd() {
      var th = st.threat;
      if (!th) return [];
      if (th.kind === 'bandit') {
        return [{ person: th.person, x: 858, gy: 488, h: 360, mood: '😠', bubbleAlpha: 0, alpha: 1 }];
      }
      if (th.kind === 'sick') {
        return [{ person: th.person, x: 858, gy: 488, h: 340, mood: '🤢', bubbleAlpha: 0, alpha: 1 }];
      }
      return [];
    }

    function drawFireOverlay(ctx) {
      if (!st.threat || st.threat.kind !== 'fire') return;
      ctx.save();
      var g = ctx.createLinearGradient(0, 360, 0, 720);
      g.addColorStop(0, 'rgba(255,120,40,0)');
      g.addColorStop(1, 'rgba(255,90,20,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 360, 1280, 360);
      for (var i = 0; i < 14; i++) {
        var fx = 40 + i * 92 + Math.sin(st.t * 2 + i) * 18;
        var fh = 70 + Math.sin(st.t * 3.4 + i * 1.7) * 36 + U.hash(i * 3.1) * 60;
        var fg = ctx.createLinearGradient(0, 700 - fh, 0, 700);
        fg.addColorStop(0, 'rgba(255,220,120,0.0)');
        fg.addColorStop(0.35, 'rgba(255,170,60,0.55)');
        fg.addColorStop(1, 'rgba(255,90,30,0.75)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(fx - 34, 700);
        ctx.quadraticCurveTo(fx - 20, 700 - fh * 0.55, fx - 4, 700 - fh);
        ctx.quadraticCurveTo(fx + 8, 700 - fh * 0.6, fx + 18, 700 - fh * 0.3);
        ctx.quadraticCurveTo(fx + 30, 700 - fh * 0.5, fx + 34, 700);
        ctx.closePath();
        ctx.fill();
      }
      // дым
      ctx.globalAlpha = 0.18;
      for (var s = 0; s < 8; s++) {
        var sy = 120 + ((st.t * 40 + s * 70) % 480);
        ctx.beginPath();
        ctx.arc(160 + s * 140 + Math.sin(st.t + s) * 22, sy, 46 + (s % 3) * 16, 0, Math.PI * 2);
        ctx.fillStyle = '#3a2a22';
        ctx.fill();
      }
      ctx.restore();
    }

    function drawThreatBanner(ctx) {
      var th = st.threat;
      if (!th) return;
      var info = THREAT_INFO[threatKey(th)];
      var r = threatBannerRect();
      var pulse = 0.55 + 0.45 * Math.sin(st.t * 5);
      ctx.save();
      ctx.shadowColor = 'rgba(255,80,40,' + (0.35 + pulse * 0.3) + ')';
      ctx.shadowBlur = 22;
      art.panel(ctx, r.x, r.y, r.w, r.h, { bg: 'rgba(48,14,10,0.96)', r: 16, border: 'rgba(255,120,90,' + (0.35 + pulse * 0.3) + ')' });
      ctx.restore();
      art.txt(ctx, info.title, r.x + 18, r.y + 26, 16, info.color, 900);
      var left = Math.max(0, th.limit - th.t);
      art.bar(ctx, r.x + r.w - 154, r.y + 18, 136, 9, left / th.limit, left < 10 ? '#ff5a32' : '#ffb347', 'rgba(0,0,0,0.45)');
      art.txt(ctx, Math.ceil(left) + ' с', r.x + r.w - 18, r.y + 27, 11, '#ffd8c8', 800, 'right');
      wrap(ctx, info.hint, r.x + 18, r.y + 50, r.w - 150, 11.5, 'rgba(255,235,225,0.8)', 600, 14);
      var chip = { x: r.x + r.w - 130, y: r.y + 44, w: 112, h: 26 };
      var hov = U.hit(chip, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      art.fillRR(ctx, chip.x, chip.y, chip.w, chip.h, 8, hov ? 'rgba(242,153,74,0.95)' : 'rgba(255,255,255,0.12)');
      art.txt(ctx, 'Телефон ▸', chip.x + chip.w / 2, chip.y + 18, 11, hov ? '#2a1a10' : '#ffe9d8', 700, 'center');
    }


    /* ---------------- отложенные последствия ---------------- */
    /* Утром показываем, что выросло из решений прошлых смен. Последствия
       идут по одному: иначе текст не помещается в диалог и теряется. */
    function runConsequences() {
      var d = PVZ.state.data;
      if (!d || st.phase !== 'morning') return;
      if (d.consequencesDay === st.day) return;
      d.consequencesDay = st.day;
      var queue = PVZ.state.dueConsequences();
      if (!queue.length) return;
      function showNext() {
        var item = queue.shift();
        if (!item) return;
        var res = sys.applyConsequence(item.id);
        if (!res) { showNext(); return; }
        if (res.kind === 'bad') PVZ.audio.bad(); else PVZ.audio.level();
        openDialog({
          name: 'Новости пункта',
          person: null,
          icon: '📰',
          role: 'последствия прошлых решений',
          text: res.text,
          choices: [
            {
              label: 'Дальше', hint: 'так и было',
              cb: function () { if (queue.length) showNext(); }
            }
          ]
        });
      }
      showNext();
    }

    /* ---------------- сюжет мафии ---------------- */
    /* Сюжетные сцены показываем только когда в смене нет других окон:
       иначе они наезжают на диалоги покупателей и QTE. */
    function checkMafiaStory() {
      if (!PVZ.state.data || PVZ.state.data.over) return;
      if (st.arrest) return;
      if (PVZ.state.endless()) return;
      if (st.phase !== 'morning' && st.phase !== 'day') return;
      if (st.dlg || st.qte || st.terminal || st.laptop || st.phone) return;
      var story = sys.mafiaStoryNext(st.day);
      if (!story) return;
      var m = PVZ.state.mafiaState();
      if (m.seen.indexOf(story.id) >= 0) return;
      var choices = story.choices.map(function (ch, i) {
        return {
          label: ch.label,
          hint: ch.hint || '',
          cb: function () {
            var res = sys.mafiaStoryApply(story.id, i);
            if (!res) return;
            if (res.note) msg(res.note, res.trust >= 0 ? 'info' : 'bad');
            if (res.install) msg('На ноутбуке появилось приложение «Долги»: долг, доверие и грязь.', 'info');
            PVZ.audio.ui();
          }
        };
      });
      openDialog({
        scary: true,
        name: story.name,
        person: story.person || null,
        role: story.role,
        text: story.text,
        choices: choices
      });
      PVZ.audio.ui();
    }

    /* ---------------- Артём: друг приходит через смену ---------------- */
    function friendSeen(day) {
      var d = PVZ.state.data;
      if (!d) return false;
      if (!Array.isArray(d.friendDays)) d.friendDays = [];
      return d.friendDays.indexOf(day) >= 0;
    }
    function markFriendSeen(day) {
      var d = PVZ.state.data;
      if (!d) return;
      if (!Array.isArray(d.friendDays)) d.friendDays = [];
      if (d.friendDays.indexOf(day) < 0) d.friendDays.push(day);
      PVZ.state.save();
    }
    function openFriendDialog() {
      var d = PVZ.state.data || {};
      if (!st.friend || st.friend.dialogDone) return;
      st.friend.dialogDone = true;
      markFriendSeen(st.day);
      PVZ.audio.bell();
      var bossCall = d.bossCallDay === 9;
      var text = (bossCall
        ? 'Слушай, я на минуту. Вчера у меня телефон пропадал из кармана… Вернули. Но лучше тебе знать: они звонили с него. Ты как?'
        : (d.debt || 0) > 0
          ? 'Здорово! Решил забежать до открытия. У тебя тут как? Слухи ходят, что к тебе вечером заходят серьёзные люди. Я не лезу, просто… держись.'
          : 'Здорово! Забежал на пять минут, пока мой пункт не открылся. Кофе будешь? У тебя тут уютно, я смотрю.')
        + (d.cat ? ' Кот твой уже командует?' : '');
      var choices = [
        {
          label: 'Поболтать о жизни', hint: '2 мин · настроение',
          fx: { time: 2, rating: 0.03 },
          cb: function () {
            PVZ.state.addRating(0.02);
            PVZ.state.chatAdd('artem', 'Спасибо, что выслушал. Если что — я рядом, через два квартала.');
            msg('Артём ушёл на свою смену. На душе стало теплее.', 'good');
            PVZ.audio.ok();
            leaveFriend();
          }
        },
        {
          label: (d.debt || 0) > 0 ? 'Спросить, что слышно про мафию' : 'Спросить, как дела на его пункте',
          hint: 'совет · 2 мин',
          fx: { time: 2 },
          cb: function () {
            var advice = (d.debt || 0) > 0
              ? 'Совет один: не отдавай последнее. Собирай бумажки, записывай, кто приходил. И не ходи к ним сам.'
              : 'У меня всё как обычно: очередь, коробки. Зато у тебя кот. Я бы тоже завёл, но боюсь, что он сгрызёт накладные.';
            PVZ.state.chatAdd('artem', advice);
            msg('Артём: «' + advice + '»', 'info');
            PVZ.audio.ui();
            leaveFriend();
          }
        },
        {
          label: 'Угостить Артёма кофе', hint: '−60 ₽ · +настроение',
          fx: { time: 3, money: -60, rating: 0.05 },
          cb: function () {
            st.friendCoffee = true;
            msg('Кофе для Артёма: он обещал зайти ещё. Следующий клиент будет терпеливее.', 'good');
            PVZ.audio.ok();
            leaveFriend();
          }
        },
        {
          label: 'Извиниться — смена начинается', hint: 'быстро',
          cb: function () {
            msg('Артём понимающе кивнул: «Работай. Я ещё забегу».', 'info');
            leaveFriend();
          }
        }
      ];
      openDialog({
        name: 'Артём',
        person: ARTEM_PERSON,
        role: 'друг · соседний ПВЗ',
        mood: '☕ пришёл поболтать',
        text: text,
        choices: choices
      });
    }
    function leaveFriend() {
      if (!st.friend) return;
      st.friend.leaving = true;
      st.friend.leaveT = 0;
      st.friend.bubble = 'Ну, я побежал. Если что — звони!';
      st.friend.bubbleAlpha = 0;
    }
    function spawnFriend() {
      st.friend = {
        person: ARTEM_PERSON,
        x: 1240, gy: 500, h: 340 * 0.98,
        state: 'arriving',
        dialogDone: false,
        leaving: false,
        leaveT: 0,
        arrivedT: 0,
        alpha: 0,
        bubble: 'Привет! Есть минутка?',
        bubbleAlpha: 0
      };
      st.bellRinging = 1.2;
      PVZ.audio.bell();
      msg('В дверь заходит Артём — друг из соседнего ПВЗ. Он пришёл поболтать.', 'info');
    }
    function updateFriend(dt) {
      var f = st.friend;
      if (st.arrest) return;
      if (!f) {
        st.friendCheck += dt;
        if (st.friendCheck < 1) return;
        st.friendCheck = 0;
        if (st.phase !== 'morning') return;
        if (st.day < 2 || st.day % 2 !== 0) return;
        if (friendSeen(st.day)) return;
        if (st.dlg || st.qte || st.terminal || st.laptop || st.phone) return;
        if (st.finished) return;
        spawnFriend();
        return;
      }
      f.alpha = Math.min(1, (f.alpha || 0) + dt * 3);
      if (f.bubble) f.bubbleAlpha = Math.min(1, (f.bubbleAlpha || 0) + dt * 3);
      if (f.leaving) {
        f.leaveT += dt;
        f.x = U.approach(f.x, 1260, 3.2, dt);
        f.gy = U.approach(f.gy, 488, 3.2, dt);
        if (f.leaveT > 2.6) st.friend = null;
        return;
      }
      moveTo(f, 850, 505, 336, dt, 3.6);
      if (!f.dialogDone) {
        if (!f.moving) f.arrivedT = (f.arrivedT || 0) + dt;
        if (f.arrivedT > 0.8) openFriendDialog();
      }
    }
    function friendCrowd() {
      var f = st.friend;
      if (!f) return [];
      f.person.bubble = f.bubble;
      return [{
        person: f.person, x: f.x, gy: f.gy, h: f.h,
        walking: f.moving || f.leaving, alpha: f.alpha, bubbleAlpha: f.bubbleAlpha
      }];
    }

    /* ---------------- звонок с телефона друга (голос Босса) ---------------- */
    function checkBossCall() {
      var d = PVZ.state.data;
      if (!d || d.over || PVZ.state.endless()) return;
      if (st.day !== 9 || d.bossCallDay === 9) return;
      if (st.phase !== 'morning' && st.phase !== 'day') return;
      if (st.dlg || st.qte || st.terminal || st.laptop || st.phone) return;
      d.bossCallDay = 9;
      PVZ.state.save();
      PVZ.audio.bell();
      PVZ.audio.tone(720, 0.18, 'sine', 0.14);
      PVZ.audio.tone(620, 0.18, 'sine', 0.12, null, 0.22);
      var choices = [
        {
          label: 'Слушать молча', hint: 'они это ценят',
          cb: function () {
            PVZ.state.mafiaAdd('trust', 5);
            PVZ.state.mafiaAdd('dirt', 2);
            msg('Босс доволен: вы умеете слушать. Доверие +5, грязь +2.', 'bad');
            PVZ.audio.bad();
          }
        },
        {
          label: 'Спросить, что с Артёмом', hint: 'важнее друга',
          cb: function () {
            PVZ.state.mafiaAdd('trust', -2);
            PVZ.state.chatAdd('artem', 'Со мной всё нормально. Они просто забрали телефон на вечер и вернули. Не лезь к ним из-за меня.');
            msg('Босс усмехнулся: «С твоим другом всё в порядке. Пока». Доверие −2.', 'bad');
            PVZ.audio.bad();
          }
        },
        {
          label: 'Сбросить звонок', hint: 'они запомнят',
          cb: function () {
            PVZ.state.mafiaAdd('trust', -8);
            PVZ.state.mafiaAdd('dirt', 2);
            msg('Вы сбросили звонок с чужого телефона. Они этого не забудут.', 'bad');
            PVZ.audio.bad();
          }
        }
      ];
      openDialog({
        scary: true,
        name: 'Артём · входящий',
        person: null,
        icon: '📱',
        role: 'звонок с телефона друга',
        mood: '⚠ это не Артём',
        text: 'Ты берёшь трубку и слышишь не Артёма. Низкий, спокойный голос: «Привет. Телефон твоего друга у меня. Не волнуйся, он цел. Я просто хотел сказать: осталось две смены. Долг — это не бумажка, это твоя жизнь. Подумай, на чьей ты стороне».',
        choices: choices
      });
      msg('Звонок с телефона Артёма. В трубке — голос Босса.', 'bad');
    }


    function openMafiaVisit(cb) {
      var m = PVZ.state.mafiaState();
      var demand = sys.mafiaDemand(st.day);
      var money = PVZ.state.data.money || 0;
      var choices = [
        {
          label: 'Отдать как просили', hint: money >= demand ? 'деньги · без последствий' : 'денег не хватает',
          cb: function () { cb(finishMafia('pay')); }
        },
        {
          label: 'Попросить отсрочку', hint: 'проценты · они недовольны',
          cb: function () { cb(finishMafia('defer')); }
        },
        {
          label: 'Отработать услугой', hint: 'грязно · долг тает',
          cb: function () { cb(finishMafia('favor')); }
        }
      ];
      if ((m.proof || 0) >= 2) {
        choices.push({
          label: 'Намекнуть на полицию', hint: 'улики · они запомнят',
          cb: function () { cb(finishMafia('threat')); }
        });
      }
      openDialog({
        scary: true,
        name: 'Мафия',
        person: null,
        icon: '♠',
        role: 'вечерний визит',
        text: 'Босс и его человек у двери. «День ' + st.day + '. Принесли ' + U.fmtMoney(demand) +
          '. В кассе ' + U.fmtMoney(money) + '. Как решаем?»',
        choices: choices
      });
    }

    function finishMafia(mode) {
      var res = sys.mafiaVisit(mode);
      if (!res || res.blocked) {
        msg('С такими словами нужны улики. Они этого не забудут.', 'bad');
        res = sys.mafiaVisit('pay');
      }
      if (res && res.paid) PVZ.audio.cash();
      else PVZ.audio.bad();
      return res;
    }

    /* ---------------- день ---------------- */
    function buildDay() {
      st.dayMod = pickDayMod(st.day);
      // полиция потихоньку забывает про чёрный рынок,
      // но не 100% подозрения: иначе арест можно переждать до утра
      var bn0 = PVZ.state.banana();
      if (bn0) {
        if (bn0.soldDay !== st.day) bn0.soldToday = 0;
        if ((bn0.heat || 0) < 100) bn0.heat = Math.max(0, (bn0.heat || 0) - 5);
      }
      var supply = sys.generateSupply(st.day, supplyFor(st.day) + (st.dayMod.supply || 0));
      var carried = (cfg.carry || []).filter(function (o) {
        return o && o.cell && o.state === 'stored' && sys.storageLeft(o, st.day) > 0;
      });
      var maxCarry = sys.CELL_TOTAL - supply.length - 2;
      if (carried.length > maxCarry) carried = carried.slice(0, Math.max(0, maxCarry));
      var stored = carried.length ? carried : sys.generateStored(st.day, storedFor(st.day));
      st.orders = stored.concat(supply);
      st.plan = Math.max(6, planFor(st.day) + (st.dayMod.planAdd || 0));
      if (PVZ.state.data) PVZ.state.data.lastDayMod = st.dayMod.id;
      st.talon = 1;
      st.stats = { served: 0, complaints: 0, returns: 0, received: 0, revenue: 0, waitSum: 0, waitN: 0, late: 0, tips: 0, referred: 0, refBonus: 0, boxes: 0, specials: 0, moments: 0 };
      st.fitting = [];
      st.moment = null;
      st.special = null;
      st.specialBanner = 0;
      st.smash = null;
      st.queue = [];
      st.leavers = [];
      st.customer = null;
      st.held = null;
      st.placing = null;
      st.targetCell = null;
      st.targetOrder = null;
      st.cashDone = false;
      st.returnsDone = false;
      st.lateDone = false;
      st.lateWaiting = false;
      st.combo = 0;
      st.comboBest = 0;
      st.comboFlash = 0;
      st.rush = null;
      st.rushNext = U.rand(55, 95);
      st.shadyCooldown = 0;
      st.susT = U.rand(40, 70);
      st.susPing = null;
      st.refQueue = [];
      st.boxIdx = 0;
      // «забытые» посылки копятся изо дня в день: никто за ними не приходит
      if (PVZ.boxes) {
        var freshBox = PVZ.boxes.arrive(st.day);
        if (freshBox) st.stats.boxes = PVZ.boxes.count();
      }
    }

    function startPhase(phase, silent) {
      st.phase = phase;
      if (phase === 'morning') {
        st.clock = MORNING_START;
        st.objectives = sys.morningObjectives(supplyFor(st.day));
        st.lightsOn = false;
        st.doorOpen = false;
        st.shiftOpen = false;
        st.morning = { light: false, terminal: false, door: false };
      } else if (phase === 'day') {
        st.clock = Math.max(st.clock, DAY_START);
        st.objectives = [];
        st.doorOpen = true;
        st.lightsOn = true;
        st.shiftOpen = true;
        st.spawnT = 4;
        st.rush = null;
        st.rushNext = U.rand(50, 90);
        st.combo = 0;
        st.comboFlash = 0;
        st.npcSpawned = false;
        st.npcT = 6;
        st.moment = null;
        st.special = null;
        st.specialBanner = 0;
        st.smash = null;
        // предупреждение об особом госте дня
        var warn = PVZ.serve && PVZ.serve.warning(st.day, PVZ.state.data);
        if (warn && st.day > 1) msg(warn, 'info');
      } else if (phase === 'evening') {
        st.clock = Math.max(st.clock, EVENING_START);
        st.objectives = sys.eveningObjectives();
        st.lightsOn = true;
        st.dust = [
          { x: 430, y: 630, r: 30, done: false },
          { x: 910, y: 612, r: 28, done: false }
        ];
        // никто не исчезает: покупатели спокойно уходят к двери
        var toLeave = st.queue.slice();
        if (st.customer) toLeave.push(st.customer);
        toLeave.forEach(function (c) {
          c.bubble = U.pick(['До свидания!', 'Ладно, зайду завтра.', 'Уже закрываетесь?']);
          c.state = 'leaving';
          st.leavers.push({ person: c, vx: c.vx, vgy: c.vgy, vh: c.vh, t: 0 });
        });
        st.queue.length = 0;
        st.customer = null;
        st.held = null;
        if (st.special) st.special.done = true;
        st.specialBanner = 0;
        st.moment = null;
        st.fitting.forEach(function (f) { f.order.state = 'stored'; f.order.customer = null; });
        st.fitting = [];
        if (!silent) msg('19:00–21:00. Закрываемся: дверь, возвраты, касса.', 'info');
      }
      if (PVZ.state.data) {
        PVZ.state.data.phase = phase;
        PVZ.state.data.clock = st.clock;
      }
    }

    function checkMorningDone() {
      if (st.phase !== 'morning') return;
      var ob = objective('receive');
      if (ob) ob.progress = st.stats.received + '/' + supplyFor(st.day);
      if (allObjectivesDone()) {
        startPhase('day');
        var modNote = st.dayMod && st.dayMod.id !== 'calm' ? ' ' + st.dayMod.icon + ' сегодня ' + st.dayMod.label + '.' : '';
        msg('Смена открыта. План на день — ' + st.plan + ' выдач.' + modNote + boxNote(), 'good');
        PVZ.state.addRating(0.03);
      }
    }

    /* ---------------- покупатели ---------------- */
    /* Поток людей: первая смена — редкие гости, к десятой — плотная очередь.
       22 секунды на первой смене, ~18 на второй, ~10 на пятой и ~3,5 к десятой.
       Очередь при этом тоже растёт, поэтому зал постепенно заполняется. */
    function spawnBase(day) {
      return Math.max(3.0, 22 * Math.pow(0.815, Math.max(0, day - 1)));
    }
    function maxLineFor(day) {
      var base = Math.min(QUEUE_SLOTS.length, 2 + Math.floor(Math.max(0, day - 1) * 0.75));
      if (st.rush && st.rush.on) base += 1;
      if (st.mods && st.mods.adSpawn) base += 1;
      return Math.min(QUEUE_SLOTS.length, base);
    }
    function scheduleSpawn() {
      var mod = st.dayMod || DAY_MODS[0];
      var base = spawnBase(st.day) * (st.mods.spawn || 1) * (mod.spawn || 1);
      if (st.rush && st.rush.on) base = Math.min(base, 2.4);
      st.spawnT = U.rand(base, base + Math.max(1.2, base * 0.3));
    }

    function availableOrdersFor() {
      var busy = {};
      st.queue.forEach(function (c) { (c.orderIds || []).forEach(function (id) { busy[id] = true; }); });
      if (st.customer && st.customer.orderIds) st.customer.orderIds.forEach(function (id) { busy[id] = true; });
      return storedOrders().filter(function (o) {
        return o.cell && !busy[o.id] && sys.storageLeft(o, st.day) > 0;
      });
    }

    function castGreeting(c) {
      if (!c || !c.castId || !PVZ.cast) return '';
      var ch = PVZ.cast.byId(c.castId);
      return ch ? PVZ.cast.greeting(ch, c) : '';
    }

    function spawnCustomer(forcedKind) {
      var kind = forcedKind;
      var storyKind = null;
      var egg = null;
      var mod = st.dayMod || DAY_MODS[0];
      if (!kind) {
        var catReady = st.day >= 2 && st.clock >= 11 * 60 && !st.catStorySpawned &&
          !(PVZ.state.data && PVZ.state.data.cat) && PVZ.state.data.catStory !== 'refused';
        var eggRoll = U.chance(sys.EGG_CHANCE) ? sys.pickEgg() : null;
        if (catReady) {
          kind = 'cat_story';
          st.catStorySpawned = true;
        } else if (eggRoll && !(st.tut && st.tut.on)) {
          // редкий гость из другого мира — пасхалка
          kind = 'guest';
          egg = eggRoll;
        } else {
          // доля возвратов зависит от события дня
          var retW = Math.min(0.28, 0.13 * (mod.returns || 1));
          var r = Math.random();
          if (r < 0.58) kind = 'pickup';
          else if (r < 0.58 + retW) kind = 'return';
          else if (r < 0.86) kind = 'question';
          else if (r < 0.93) { kind = 'story'; storyKind = U.pick(['gift', 'first_time', 'lost']); }
          else kind = 'resolve';
          if (kind === 'pickup' && !availableOrdersFor().length) kind = 'question';
        }
      }
      var c = sys.makeCustomer();
      if (kind === 'guest' && egg) {
        c.eggId = egg.id;
        c.name = egg.name;
        c.last = egg.last || '';
        c.kind = 'guest';
        var em = sys.mood(egg.mood || 'chatty');
        c.mood = em.id;
        c.moodLabel = 'гость из другого мира';
        c.moodIcon = '✨';
        if (egg.person) {
          Object.keys(egg.person).forEach(function (k) { if (egg.person[k] != null) c[k] = egg.person[k]; });
        }
        c.phone = 'smart';
        c.phoneLabel = 'смартфон';
        c.pay = 'card';
        c.parcels = 1;
        c.orderIds = [];
        c.ask = egg.ask;
      }
      if (kind === 'cat_story') {
        var cm = sys.mood('chatty');
        c.mood = cm.id;
        c.moodLabel = 'ищет дом';
        c.moodIcon = '🐈';
      }
      if (kind === 'shady') {
        // мутный тип с пятой смены: имени нет, одежда странная
        c.name = '???';
        c.last = '';
        c.shirt = '#252b26';
        c.pants = '#1a201d';
        c.coat = '#121815';
        c.hair = '#2a2420';
        c.hat = 'beanie';
        c.glasses = true;
        c.beard = false;
        c.bag = 'backpack';
        c.scarf = null;
        c.expr = 'neutral';
        c.mood = 'calm';
        c.moodLabel = 'непонятно кто';
        c.moodIcon = '🕶';
        c.phone = 'none';
        c.phoneLabel = 'без телефона';
        c.pay = 'card';
        c.ask = '…';
      }
      if (storyKind) c.story = storyKind;
      // с третьего дня в зале всё больше недовольных — держите темп
      if (kind !== 'guest' && kind !== 'shady' && st.day >= 3 && U.chance(Math.min(0.34, 0.06 * (st.day - 1)))) {
        var gm = sys.mood('grumpy');
        c.mood = gm.id;
        c.moodLabel = gm.label;
        c.moodIcon = gm.icon;
      }
      c.kind = kind;
      // ---- постоянный персонаж: у каждого покупателя своё лицо и своя история
      var special = kind === 'guest' || kind === 'shady' || kind === 'cat_story' || kind === 'npc';
      if (!special && PVZ.cast) {
        var ch = null;
        var referredBy = null;
        if (st.refQueue && st.refQueue.length) {
          var ref = st.refQueue.shift();
          ch = PVZ.cast.byId(ref.charId);
          if (ch) referredBy = ref.by;
        }
        if (!ch) ch = PVZ.cast.pick(st.day, PVZ.state.data);
        if (ch) {
          PVZ.cast.dress(c, ch);
          c.castNew = !!PVZ.cast.lastPickNew;
          if (referredBy) {
            c.referredBy = referredBy;
            c.castNew = true;
            PVZ.cast.markMet(ch.id, st.day);
            st.stats.referred++;
            msg('По рекомендации от ' + referredBy + ' зашёл(ла) ' + ch.name + '.', 'good');
          } else if (c.castNew) {
            msg('Новое лицо: ' + ch.name + ' — ' + ch.role + '. С ним можно поговорить у стойки.', 'info');
          } else if (ch.align === 'bad' && U.chance(0.55)) {
            msg(ch.name + ' снова в зале. С ним лучше держать ухо востро.', 'bad');
          }
          // характер персонажа важнее случайного настроения
          var cmood = PVZ.cast.moodOf(ch);
          if (cmood) {
            var cm = sys.mood(cmood);
            c.mood = cm.id;
            c.moodLabel = cm.label;
            c.moodIcon = cm.icon;
          }
        }
      }
      // у обычного покупателя всегда есть тема для живого разговора
      if (kind === 'pickup' || kind === 'return' || kind === 'question' || kind === 'resolve' || kind === 'story') {
        c.talkTopic = PVZ.talks ? PVZ.talks.pickTopic(PVZ.state.data) : null;
      }
      c.talon = st.talon++;
      c.patience = 1;
      c.state = 'queue';
      c.waitT = 0;
      c.atT = 0;
      c.bubble = null;
      c.bubbleAlpha = 0;
      c.revealed = false;
      c.codeScanned = false;
      c.dictated = false;
      c.codeEntered = false;
      c.wantsFitting = false;
      c.fittingDone = false;
      c.fittingOrder = null;
      c.momentDone = false;
      c.paid = false;
      c.codSum = 0;
      c.docs = false;
      // платёжные привычки — тоже индивидуальны
      c.pay = U.pick(['card', 'card', 'card', 'cash', 'cash', 'phone', 'watch']);
      if (c.phone === 'none' && c.pay === 'phone') c.pay = 'cash';
      c.orderIds = [];
      c.reviewed = false;

      var mood = sys.mood(c.mood);
      var base = kind === 'resolve' ? 0.03 : kind === 'shady' ? 0.005 : kind === 'cat_story' ? 0.008 : kind === 'story' ? 0.017 : kind === 'return' ? 0.022 : kind === 'question' ? 0.018 : kind === 'guest' ? 0.008 : 0.024;
      c.patienceRate = base / mood.patience * patienceScale(st.day) * (mod.patience || 1) * (st.mods.patience || 1) *
        (st.rush && st.rush.on ? 0.78 : 1);

      if (kind === 'pickup') {
        var pool = availableOrdersFor();
        if (!pool.length) { kind = 'question'; c.kind = kind; }
        else {
          var tutPick = st.tut && st.tut.on && st.stats.served === 0;
          var n = (!tutPick && U.chance(0.22) && pool.length >= 2) ? 2 : 1;
          var chosen = U.shuffle(pool).slice(0, n);
          c.orderIds = chosen.map(function (o) { return o.id; });
          chosen.forEach(function (o) { o.customer = c.id; });
          var order = chosen[0];
          c.orderId = order.id;
          c.code = order.code;
          c.item = order.item;
          c.parcels = chosen.length;
          c.codSum = chosen.reduce(function (s, o) { return s + (o.cod ? o.codSum : 0); }, 0);
          c.docs = chosen.some(function (o) { return o.docs; });
          c.wantsFitting = chosen.length === 1 && order.kind === 'clothes' && U.chance(0.72);
          c.ask = 'Заказ ' + order.code + ', ' + order.item.toLowerCase() + '.';
          // для обучения первый покупатель — максимально простой
          if (tutPick) { c.codSum = 0; c.docs = false; c.wantsFitting = false; }
        }
      }

      // появляется у входной двери и идёт в очередь
      c.vx = 1240;
      c.vgy = 488;
      c.vh = 296 * c.height;
      c.enterAlpha = 0;
      c.moving = true;
      c.arrived = false;
      c.arrivedT = 0;
      st.queue.push(c);
      st.bellRinging = 1.2;
      PVZ.audio.bell();
      if (kind === 'shady') msg('В ПВЗ зашёл мутный тип в странной одежде. Он явно не за посылкой.', 'bad');
    }

    function stepUpCustomer() {
      if (st.customer || !st.queue.length) return;
      var c = st.queue.shift();
      st.customer = c;
      c.state = 'atCounter';
      c.atT = 0;
      c.arrivedT = 0;
      c.arrived = false;
      c.patience = Math.max(0.5, c.patience);
      if (st.friendCoffee) {
        st.friendCoffee = false;
        c.patience = Math.min(1, c.patience + 0.12);
        msg('Кофе от Артёма: следующий покупатель терпеливее.', 'good');
      }
      var mood = sys.mood(c.mood);
      var hi = castGreeting(c);
      if (c.kind === 'pickup') {
        c.bubble = (hi || U.pick(mood.greet)) + ' ' + (c.parcels > 1 ? 'У меня ' + c.parcels + ' посылки.' : 'Вот мой код получения.');
        c.revealed = true;
        // «Камера у стойки»: код с телефона читается сразу, без мини-игры
        if (PVZ.state.mods().autoCode) c.codeScanned = true;
      } else if (c.kind === 'npc') {
        c.bubble = U.pick(['Есть разговор.', 'Здравствуйте. На пару слов?', 'Можно вас на минуту?']);
      } else {
        c.bubble = hi || U.pick(mood.greet);
      }
      c.bubbleAlpha = 0;
      st.bellRinging = 0;
    }

    function moveTo(c, x, gy, h, dt, speed) {
      if (c.vx == null) { c.vx = x; c.vgy = gy; c.vh = h; }
      c.vx = U.approach(c.vx, x, speed, dt);
      c.vgy = U.approach(c.vgy, gy, speed, dt);
      c.vh = U.approach(c.vh, h, speed, dt);
      c.moving = Math.abs(x - c.vx) > 1.4 || Math.abs(gy - c.vgy) > 1.4 || Math.abs(h - c.vh) > 1.4;
    }

    /* Восемь мест в очереди: на первой смене заняты одно-два, к десятой
       зал стоит плотно. Второй ряд чуть дальше и мельче — так очередь
       читается как живая толпа, а не как ряд одинаковых фигур. */
    var QUEUE_SLOTS = [
      { x: 950, gy: 507, h: 352 },
      { x: 1026, gy: 501, h: 334 },
      { x: 1100, gy: 496, h: 318 },
      { x: 1170, gy: 490, h: 304 },
      // второй ряд — у самой стены: плечи и головы видны, ноги прячутся за первым
      { x: 1218, gy: 472, h: 286 },
      { x: 1150, gy: 469, h: 278 },
      { x: 1078, gy: 466, h: 270 },
      { x: 1006, gy: 463, h: 262 }
    ];

    function updateCrowd(dt) {
      st.crowd = [];
      // дальние стоят ближе к стене — рисуем их первыми, чтобы ближние перекрывали
      for (var qi = st.queue.length - 1; qi >= 0; qi--) {
        var c = st.queue[qi];
        var s = QUEUE_SLOTS[Math.min(qi, QUEUE_SLOTS.length - 1)];
        moveTo(c, s.x, s.gy, s.h * c.height, dt, 5.0);
        c.walking = c.moving;
        c.enterAlpha = Math.min(1, (c.enterAlpha == null ? 1 : c.enterAlpha) + dt * 3.2);
        if (c.bubble) c.bubbleAlpha = Math.min(1, (c.bubbleAlpha || 0) + dt * 3.5);
        st.crowd.push({ person: c, x: c.vx, gy: c.vgy, h: c.vh, walking: c.moving, mood: qi === 0 ? c.moodIcon : null, small: true, bubbleAlpha: 0, alpha: c.enterAlpha });
      }

      if (st.customer) {
        var c = st.customer;
        moveTo(c, 625, 800, 580 * c.height, dt, 3.4);
        c.walking = c.moving;
        c.enterAlpha = Math.min(1, (c.enterAlpha == null ? 1 : c.enterAlpha) + dt * 3.2);
        if (!c.moving) c.arrivedT = (c.arrivedT || 0) + dt;
        c.arrived = !c.moving && c.arrivedT > 0.25;
        if (c.bubble) c.bubbleAlpha = Math.min(1, (c.bubbleAlpha || 0) + dt * 4);
        st.crowd.push({
          person: c, x: c.vx, gy: c.vgy, h: c.vh, walking: c.moving, alpha: c.enterAlpha,
          // стопы за прилавком не видны — фигуру приподнимаем, чтобы над стойкой были плечи
          lift: 0.075,
          mood: c.arrived ? c.moodIcon : null, bubbleAlpha: c.bubbleAlpha
        });
      }

      for (var i = st.leavers.length - 1; i >= 0; i--) {
        var l = st.leavers[i];
        l.t += dt;
        moveTo(l, 1200, 480, 280, dt, 4.2);
        st.crowd.push({ person: l.person, x: l.vx, gy: l.vgy, h: l.vh, walking: l.moving, leaving: true, alpha: 1, bubbleAlpha: l.person.bubbleAlpha || 0 });
        if (l.t > 2.6 && !l.moving) st.leavers.splice(i, 1);
      }
    }

    function leaveCustomer(customer, ok, reason) {
      var c = customer || st.customer;
      if (!c) return;
      // покупатель уже ушёл (например, терпение кончилось во время QTE)
      if (c.state === 'leaving') return;
      // особый гость ушёл сам — его история закрыта, буянить больше некому
      if (c.kind === 'special' && st.special && st.special.c === c && !st.special.done) {
        st.special.done = true;
        st.specialBanner = 0;
        st.moment = null;
        if (st.special.def.danger) {
          st.smash = { t: 0, x: 985, y: 470, seed: 6 };
          PVZ.state.addRating(-0.05);
          msg('Гром ушёл, не дождавшись, — и напоследок снёс ещё одну коробку.', 'bad');
        }
      }
      if (!ok) {
        c.expr = 'angry';
        c.bubble = U.pick(['Безобразие!', 'Я буду жаловаться.', 'Больше сюда не приду.']);
        st.stats.complaints++;
        var mod = st.dayMod || DAY_MODS[0];
        // жалоба — это оценка 2 (или 1, если клиент ушёл не дождавшись):
        // рейтинг едет вниз сразу и заметно, но не с одного раза
        PVZ.state.rateVisit(reason ? 2 : 1, (mod.rating || 1) * (st.mods.complaint || 1));
        PVZ.state.addMoney(-TARIFF.complaint);
        PVZ.audio.bad();
        breakCombo(reason);
        if (reason) msg(reason + ' −' + TARIFF.complaint + ' ₽', 'bad');
        // плохой персонаж, уходя без заказа, может оставить после себя «подарок»
        if (c.castAlign === 'bad' && !c.leftBox && PVZ.boxes && U.chance(0.35)) {
          c.leftBox = true;
          var lb = PVZ.boxes.add('stolen', st.day, { note: 'Осталась после ' + c.name + '.' });
          if (lb) msg('После ' + c.name + ' в зале осталась безымянная коробка. Никто за ней не приходит.', 'bad');
        }
      } else {
        c.expr = c.patience > 0.55 ? 'happy' : 'neutral';
        c.bubble = U.pick(['Спасибо!', 'До свидания!', 'Спасибо, хорошего дня!', 'Приятно было!']);
        // довольный клиент тянет рейтинг вверх: быстро и вежливо — пятёрка
        var score = c.expr === 'happy' ? 5 : 4;
        // «плохие» персонажи и в хорошем настроении скупы на пятёрки,
        // но с теми, с кем подружились, оттаивают
        if (c.castAlign === 'bad' && score === 5) {
          score = PVZ.cast && c.castId && PVZ.cast.rel(c.castId) >= 2 ? 4 : 3;
        }
        PVZ.state.rateVisit(score);
        if (c.castAlign === 'good' && c.expr === 'happy') PVZ.state.addRating(0.005);
        // человек пришёл по рекомендации: знакомый не зря хвалил пункт
        if (c.referredBy && !c.refRewarded) {
          c.refRewarded = true;
          PVZ.state.addMoney(30);
          st.stats.revenue += 30;
          st.stats.refBonus += 30;
          PVZ.state.addRating(0.02);
          msg('Клиент пришёл по рекомендации — +30 ₽ и плюс к репутации.', 'good');
        }
      }
      c.bubbleAlpha = 1;
      if (c.orderIds) {
        c.orderIds.forEach(function (id) {
          var o = orderById(id);
          if (o && o.customer === c.id) o.customer = null;
        });
      }
      // покупатель может оставить отзыв о визите
      if (!c.reviewed) {
        c.reviewed = true;
        if (U.chance(0.7)) {
          var sc = !ok ? (U.chance(0.5) ? 1 : 2) : c.expr === 'sad' ? 3 : c.expr === 'happy' ? 5 : 4;
          if (ok && c.castAlign === 'bad' && sc >= 4) {
            sc = PVZ.cast && c.castId && PVZ.cast.rel(c.castId) >= 2 ? 4 : 3;
          }
          var rv = sys.addReview(c, sc);
          if (rv && rv.score <= 2) msg('Плохой отзыв от ' + rv.author + '. Ответьте в ноутбуке → Отзывы.', 'bad');
        }
      }
      c.state = 'leaving';
      st.leavers.push({ person: c, vx: c.vx, vgy: c.vgy, vh: c.vh, t: 0 });
      if (st.customer === c) {
        st.customer = null;
        st.nextT = 1.5;
      } else {
        var i = st.queue.indexOf(c);
        if (i >= 0) st.queue.splice(i, 1);
      }
      st.held = null;
      st.phone = null;
    }

    /* ---------------- серия выдач ---------------- */
    /* Каждая выдача подряд поднимает серию: за неё платят бонус, а на 5/10/15
       дают репутацию. Жалоба или ушедший клиент серию обнуляют. */
    function comboBonus() { return Math.min(8, st.combo) * 5; }
    function bumpCombo() {
      st.combo++;
      st.comboFlash = 1;
      if (st.combo > st.comboBest) st.comboBest = st.combo;
      var bonus = comboBonus();
      if (bonus > 0) {
        PVZ.state.addMoney(bonus);
        st.stats.revenue += bonus;
        st.stats.tips += bonus;
      }
      if (st.combo === 5 || st.combo === 10 || st.combo === 15 || st.combo === 20) {
        PVZ.state.addRating(0.02 * Math.min(3, st.combo / 5) * (st.mods.rating || 1));
        msg('Серия ' + st.combo + ' выдач подряд! +' + bonus + ' ₽ и плюс к репутации.', 'good');
        PVZ.audio.level();
      }
    }
    function breakCombo(reason) {
      if (st.combo >= 3) msg('Серия прервана: ' + (reason || 'клиент ушёл недовольным') + '.', 'bad');
      st.combo = 0;
    }

    /* Мутный тип не жалуется: он просто уходит, если его не обслужили */
    function leaveShady(c) {
      if (!c) return;
      c.bubble = 'Ладно. Зайду в другой раз.';
      c.bubbleAlpha = 1;
      c.state = 'leaving';
      st.leavers.push({ person: c, vx: c.vx, vgy: c.vgy, vh: c.vh, t: 0 });
      if (st.customer === c) { st.customer = null; st.nextT = 2; }
      else {
        var i = st.queue.indexOf(c);
        if (i >= 0) st.queue.splice(i, 1);
      }
      st.shadyCooldown = 150;
      msg('Мутный тип ушёл, ничего не сделав. Может, ещё вернётся.', 'info');
    }

    /* ---------------- выдача и оплата ---------------- */
    /* Передача товара в руки покупателю: короткая анимация, чтобы было видно,
       что отдаём именно тот товар, который достали из коробки. */
    function handoffProduct() {
      if (!st.held || !st.held.unpacked) return;
      st.handoff = { item: st.held.item, kind: st.held.kind, code: st.held.code, t: 0 };
    }

    function issueParcel(order, c) {
      if (!order) return;
      order.state = 'issued';
      order.customer = null;
      st.stats.served++;
      // услуга мафии: смена «под присмотром» засчитывается по выдачам
      var taskStep = sys.mafiaTaskServe();
      if (taskStep) {
        if (taskStep.done) {
          msg('Услуга закрыта: долг уменьшился на ' + U.fmtMoney(taskStep.reward) + '. Осталось ' + U.fmtMoney(taskStep.debt) + '.', 'good');
          PVZ.audio.level();
        } else if (taskStep.remaining === taskStep.need - 1) {
          msg('Мафия начала отсчёт: обслужено ' + (taskStep.need - taskStep.remaining) + ' из ' + taskStep.need + '.', 'info');
        }
      }
      var pay = TARIFF.issue;
      if (c && c.arrived && c.atT < 26) pay += TARIFF.issueFast;
      st.stats.revenue += pay;
      PVZ.state.addMoney(pay);
      PVZ.state.addRating(0.045 * (st.mods.rating || 1));
      PVZ.audio.coin();
      bumpCombo();
      if (st.stats.served === st.plan) {
        msg('План дня выполнен: ' + st.plan + ' выдач! Премия в конце смены.', 'good');
        PVZ.state.addRating(0.05);
      }
      if (c) c.bubble = PVZ.serve ? PVZ.serve.handoffLine(order) : U.pick(['Спасибо!', 'О, быстро!', 'Отлично, спасибо.']);
    }

    function giveTip(c) {
      var mood = sys.mood(c.mood);
      var chance = 0.22 + Math.max(0, c.patience - 0.35) * 0.75;
      if (mood.id === 'vip') chance += 0.28;
      if (mood.id === 'grumpy') chance -= 0.12;
      if (Math.random() < chance) {
        var mod = st.dayMod || DAY_MODS[0];
        var tipMult = (mod.tip || 1) * (st.rush && st.rush.on ? 1.4 : 1) * (st.combo >= 5 ? 1.1 : 1);
        var tip = Math.round(TARIFF.tip * mood.tip * (st.mods.tip || 1) * tipMult);
        PVZ.state.addMoney(tip);
        st.stats.revenue += tip;
        st.stats.tips += tip;
        PVZ.audio.coin();
        msg('Покупатель оставил чаевые: +' + tip + ' ₽', 'good');
      }
    }

    function finishPickup(c) {
      if (c.codSum > 0 && !c.paid) { startPayment(c); return; }
      giveTip(c);
      leaveCustomer(c, true);
    }

    function startPayment(c) {
      var sum = c.codSum;
      var type = c.pay;
      var title, sub, t;
      if (type === 'cash') {
        t = 'cashier';
        title = 'Наложенный платёж';
        sub = 'Клиент платит наличными. Отсчитайте сдачу: ' + sum + ' ₽';
      } else if (type === 'watch') {
        t = 'hold';
        title = 'Оплата часами';
        sub = 'Поднесите терминал к часам и удержите: ' + sum + ' ₽';
      } else if (type === 'phone') {
        t = 'timing';
        title = 'Оплата телефоном';
        sub = 'Покупатель платит QR-кодом: ' + sum + ' ₽';
      } else {
        t = 'swipe';
        title = 'Оплата картой';
        sub = 'Проведите карту клиента: ' + sum + ' ₽';
      }
      startQTE({
        type: t,
        title: title,
        sub: sub,
        onDone: function (ok) {
          // пока шла оплата, клиент мог не дождаться и уйти
          if (c.state === 'leaving') return;
          if (ok) {
            c.paid = true;
            // наложенный платёж — деньги продавца: пункту остаётся комиссия
            PVZ.state.addMoney(TARIFF.cod);
            st.stats.revenue += TARIFF.cod;
            PVZ.state.addRating(0.02);
            msg('Наложенный платёж ' + U.fmtMoney(sum) + ' принят. Комиссия пункта +' + TARIFF.cod + ' ₽', 'good');
            PVZ.audio.cash();
            giveTip(c);
            leaveCustomer(c, true);
          } else {
            leaveCustomer(c, false, 'Оплата не прошла — клиент ушёл с жалобой.');
          }
        }
      });
    }

    /* ---------------- эффекты выбора ---------------- */
    function applyFx(fx, c) {
      if (!fx) return;
      if (fx.time) st.clock = Math.max(0, st.clock + fx.time * (fx.time > 0 ? (st.mods.time || 1) : 1));
      if (fx.money) {
        PVZ.state.addMoney(fx.money);
        if (fx.money > 0) { st.stats.revenue += fx.money; PVZ.audio.coin(); }
        else PVZ.audio.bad();
      }
      if (fx.rating) PVZ.state.addRating(fx.rating * (fx.rating > 0 ? (st.mods.rating || 1) : 1));
      if (fx.patience && c) c.patience = U.clamp(c.patience + fx.patience, 0.08, 1);
    }

    function fxText(fx) {
      if (!fx) return '';
      var out = [];
      if (fx.time) out.push((fx.time > 0 ? '−' : '+') + Math.abs(fx.time) + ' мин');
      if (fx.money) out.push((fx.money > 0 ? '+' : '−') + Math.abs(fx.money) + ' ₽');
      if (fx.rating) out.push((fx.rating > 0 ? '+' : '−') + 'репутация');
      if (fx.patience) out.push((fx.patience > 0 ? '+' : '−') + 'терпение');
      return out.join(' · ');
    }

    /* ---------------- диалоги у стойки ---------------- */
    function onCustomerTap() {
      var c = st.customer;
      if (!c) { msg('За стойкой никого нет. Следующий подойдёт сам.'); return; }
      if (st.qte || st.dlg || st.terminal || st.phone || st.laptop) return;
      if (c.moving || !c.arrived) { msg('Покупатель ещё подходит к стойке…'); return; }
      c.atT = 0;
      if (c.kind === 'guest') { openEgg(c); return; }
      if (c.kind === 'special') { openSpecial(c); return; }
      if (c.kind === 'pickup') { pickupDialog(c); return; }
      if (c.kind === 'return') { openReturn(c); return; }
      if (c.kind === 'question') { openQuestion(c); return; }
      if (c.kind === 'resolve') { openResolve(c); return; }
      if (c.kind === 'fitting-back') { openFittingBack(c); return; }
      if (c.kind === 'late') { openLate(c); return; }
      if (c.kind === 'cat_story') { openCatStory(c, 0); return; }
      if (c.kind === 'shady') { openShady(c, 0); return; }
      if (c.kind === 'npc') { openNpcDialog(c); return; }
      if (c.kind === 'story') { openStory(c, 0); return; }
    }

    function openPickupDialog(c) {
      var order = isMine(c, st.held) ? orderById(st.held.id) : firstOrderFor(c);
      if (!order) { finishPickup(c); return; }
      var mood = sys.mood(c.mood);
      var clothes = order.kind === 'clothes';
      var left = customerOrders(c).length;
      var react = PVZ.serve ? PVZ.serve.itemLine(order) + ' ' : '';
      var text = react + 'Заказ ' + order.code + ' — «' + order.item + '», ' + U.fmtMoney(order.price) + '. ' +
        (c.codSum ? 'К оплате при получении: ' + U.fmtMoney(c.codSum) + ' (наша комиссия ' + U.fmtMoney(TARIFF.cod) + '). ' : '') +
        (c.docs ? 'Нужно сверить документ. ' : '') +
        (left > 1 ? 'Осталось посылок: ' + left + '. ' : '') +
        U.pick(['Проверьте, пожалуйста.', 'Распишитесь в приложении.']);
      if (mood.id === 'hurry') text += ' Только быстрее, пожалуйста.';
      if (mood.id === 'chatty') text += ' А я вам сейчас расскажу, как я заказывала…';

      var choices = [];
      // личная история персонажа — главный «крючок» разговора, поэтому она
      // стоит сразу после выдачи, а не в конце стопки
      var personal = castTalkChoice(c, function () { openPickupDialog(c); });
      // основное действие
      choices.push({
        label: left > 1 ? 'Отдать товар и взяться за следующую' : 'Отдать товар: ' + order.item,
        hint: '+' + TARIFF.issue + ' ₽ · 1 мин',
        fx: { time: 1 },
        cb: function () {
          var heldOrder = st.held ? orderById(st.held.id) : order;
          function deliver() {
            if (!heldOrder || heldOrder.state === 'issued') return;
            handoffProduct();
            st.held = null;
            issueParcel(heldOrder, c);
            var rest = customerOrders(c);
            if (rest.length) {
              c.bubble = 'Спасибо! А вторую?';
              msg('Выдана ' + heldOrder.code + '. У клиента ещё ' + rest.length + ' — заберите со склада.', 'good');
              openTerminal('found', rest[0]);
              return;
            }
            finishPickup(c);
          }
          // у каждого товара — своя маленькая сценка: примерка, проверка,
          // восторг ребёнка, кот в переноске. Игрок реагирует, и выдача
          // запоминается, а не пролетает одинаково.
          if (!c.momentDone && PVZ.serve && !(st.tut && st.tut.on)) {
            var mm = PVZ.serve.momentFor(c, heldOrder);
            if (mm) {
              c.momentDone = true;
              showMoment(c, heldOrder, mm, deliver);
              return;
            }
          }
          deliver();
        }
      });
      if (personal) choices.push(personal);

      // проверка документа
      if (c.docs) {
        choices.push({
          label: 'Сверить паспорт с заказом',
          hint: '2 мин · +репутация',
          fx: { time: 2, rating: 0.05 },
          cb: function () {
            msg('Документ в порядке. Клиент оценил внимательность.', 'good');
            c.docs = false;
            openPickupDialog(c);
          }
        });
      }

      // универсальная проверка заказа
      choices.push({
        label: 'Сверить имя и адрес в заказе',
        hint: '2 мин · +репутация',
        fx: { time: 2, rating: 0.03 },
        cb: function () {
          c.bubble = 'Да, всё верно, спасибо.';
          msg('Данные сверены — риск перепутать заказ меньше.', 'good');
          openPickupDialog(c);
        }
      });

      // болтовня / торопливость — у каждого свой характер
      if (!personal && (mood.id === 'chatty' || mood.id === 'elder' || mood.id === 'vip' || mood.id === 'kid')) {
        choices.push({
          label: mood.id === 'kid' ? 'Похвалить ребёнка за терпение' : 'Поболтать с покупателем',
          hint: '3 мин · +репутация · +терпение',
          fx: { time: 3, rating: 0.06, patience: 0.18 },
          cb: function () {
            c.bubble = U.pick(mood.talk);
            msg('Тёплый разговор: клиент доволен, но время идёт.', 'good');
            openPickupDialog(c);
          }
        });
      }
      if (mood.id === 'hurry' || mood.id === 'grumpy') {
        choices.push({
          label: 'Поторопить клиента и ускориться',
          hint: '+1 мин · −репутация',
          fx: { time: 1, rating: -0.03, patience: -0.08 },
          cb: function () {
            msg('Получилось быстро, но клиент нахмурился.', 'info');
            openPickupDialog(c);
          }
        });
      }

      // допродажа
      choices.push({
        label: 'Предложить пакет за 30 ₽',
        hint: '+30 ₽ · 1 мин',
        fx: { time: 1, money: 30 },
        cb: function () {
          if (U.chance(0.65)) {
            msg('Пакет продан: +30 ₽.', 'good');
          } else {
            PVZ.state.addMoney(-30);
            st.stats.revenue -= 30;
            msg('Клиент отказался — вы всё равно записали продажу, пришлось отменить.', 'bad');
            PVZ.state.addRating(-0.01);
          }
          openPickupDialog(c);
        }
      });

      // примерка
      if (clothes && c.wantsFitting && !c.fittingDone && left === 1) {
        choices.push({
          label: 'Сначала предложить примерить',
          hint: 'примерочная · +прибыль',
          cb: function () { st.held = null; sendToFitting(c, order); }
        });
      }

      // живой разговор: клиент человек, а не сканер кода.
      // если вариантов уже много, разговор не добавляем — иначе стопка не влезет
      if (!personal && choices.length < 6) {
        var talk = talkChoice(c, function () { openPickupDialog(c); });
        if (talk) choices.push(talk);
      }

      // отмена
      choices.push({
        label: 'Отмена — клиент подождёт',
        hint: '−терпение',
        fx: { patience: -0.05 },
        cb: function () { msg('Клиент ждёт у стойки.'); }
      });

      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'покупатель',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: text,
        choices: choices
      });
    }

    /* Микросценка выдачи: товар в руках, покупатель реагирует.
       Сцена рисуется над диалогом, а выбор игрока задаёт настроение визита. */
    function showMoment(c, order, m, proceed) {
      if (!m) { proceed(); return; }
      st.moment = {
        kind: m.scene || 'item',
        person: c,
        item: order,
        title: m.title || 'Выдача',
        subtitle: '«' + order.item + '» · ' + ((c.name || '') + ' ' + (c.last || '')).trim(),
        t: 0
      };
      var choices = m.choices.map(function (ch) {
        return {
          label: ch.label,
          hint: ch.hint || '',
          fx: ch.fx || null,
          cb: function () {
            if (ch.tip) {
              PVZ.state.addMoney(ch.tip);
              st.stats.revenue += ch.tip;
              st.stats.tips += ch.tip;
              PVZ.audio.coin();
            }
            if (ch.queue) {
              st.queue.forEach(function (q) { q.patience = U.clamp(q.patience + ch.queue, 0.05, 1); });
            }
            st.stats.moments = (st.stats.moments || 0) + 1;
            if (PVZ.state.data) {
              var sv = PVZ.serve.ensure(PVZ.state.data);
              sv.moments = (sv.moments || 0) + 1;
            }
            st.moment = null;
            if (c) {
              c.bubble = ch.reply || 'Спасибо!';
              c.bubbleAlpha = 0;
              c.expr = 'happy';
            }
            msg(ch.reply || 'Покупатель доволен.', 'good');
            PVZ.audio.ok();
            proceed();
          }
        };
      });
      openDialog({
        name: (c.name + ' ' + (c.last || '')).trim(),
        person: c,
        role: 'выдача · ' + (m.title || 'товар'),
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: m.text,
        choices: choices
      });
    }

    function pickupDialog(c) {
      if (!st.held) {
        c.talked = true;
        var order = firstOrderFor(c);
        if (!order) { msg('Заказ покупателя уже выдан.', 'bad'); leaveCustomer(c, true); return; }
        if (c.codeScanned || c.codeEntered) {
          openTerminal('found', order);
          return;
        }
        if (c.dictated) {
          // код продиктован, но ещё не введён в терминал — без этого ячейку не узнать
          msg('Сначала введите продиктованный код ' + c.code + ' в терминале.', 'info');
          openTerminal('search');
          return;
        }
        openPhone(c);
        return;
      }

      var held = orderById(st.held.id);
      if (!isMine(c, held)) {
        c.patience = Math.max(0.05, c.patience - 0.14);
        c.expr = 'confused';
        msg('Это не тот заказ: у клиента ' + c.code + ', а в руках ' + st.held.code + '.', 'bad');
        PVZ.audio.bad();
        return;
      }
      if (!st.held.onTable) {
        msg('Посылка ещё в руках — положите её на стол и отсканируйте.', 'bad');
        return;
      }
      if (!st.held.scanned) {
        msg('Сначала отсканируйте посылку — она на столе, сканер слева.', 'bad');
        return;
      }
      if (!st.held.unpacked) {
        msg('Сначала вскройте коробку и достаньте товар — нажмите на неё на столе.', 'bad');
        startUnpack();
        return;
      }
      openPickupDialog(c);
    }

    function sendToFitting(c, order) {
      order.state = 'fitting';
      order.cellSaved = order.cell;
      order.cell = null;
      order.fittingCustomer = c.id;
      c.fittingOrder = order;
      c.fittingDone = true;
      c.bubble = 'Я в примерочную, спасибо!';
      c.bubbleAlpha = 0;
      st.fitting.push({ order: order, customer: c, t: U.rand(12, 18) });
      releaseCounterCustomer(c);
      msg('Клиент ушёл в примерочную. Вернётся через пару минут.', 'info');
    }

    function releaseCounterCustomer(c) {
      if (st.customer === c) { st.customer = null; st.nextT = 1.2; }
      st.held = null;
    }

    function finishFitting(entry) {
      var c = entry.customer, o = entry.order;
      c.kind = 'fitting-back';
      c.fittingOrder = o;
      c.fittingDone = true;
      c.state = 'queue';
      c.bubble = null;
      c.patience = 1;
      c.expr = 'neutral';
      c.vx = 1050;
      c.vgy = 496;
      c.vh = 320 * c.height;
      st.queue.unshift(c);
      if (!st.customer) st.nextT = 0.6;
      st.bellRinging = 1;
      PVZ.audio.bell();
      msg('Клиент вернулся из примерочной — ' + c.name + '.', 'info');
    }

    /* Клиент вышел из примерочной. Главное зрелище смены: он показывает,
       как сидит вещь, поворачивается у зеркала и ждёт вашей реакции. */
    function openFittingBack(c) {
      var o = c.fittingOrder || firstOrderFor(c);
      if (!o) { leaveCustomer(c, true); return; }
      var fits = U.chance(0.76);
      if (PVZ.serve) {
        var col = PVZ.serve.colorFor(o.item, o.kind);
        c.shirt = col;
        c.coat = null;
      }
      c.expr = 'happy';
      st.moment = {
        kind: 'tryon',
        person: c,
        item: o,
        title: 'Примерочная',
        subtitle: '«' + o.item + '» · ' + ((c.name || '') + ' ' + (c.last || '')).trim(),
        t: 0
      };
      var lookLines = [
        'Отлично сидит в плечах — и цвет как будто подобрали под вас.',
        'Посадка ровная, ткань не тянет. Похоже, это ваша вещь.',
        'Смотрится лучше, чем на картинке в приложении.',
        'Свободно ровно настолько, чтобы было удобно двигаться.'
      ];
      var text = fits
        ? 'Клиент выходит из примерочной и поворачивается у зеркала: «Ну как? Смотрите, какая посадка!» ' + U.pick(lookLines)
        : 'Клиент выходит из примерочной, тянет рукав и морщится: «Кажется, маловато. Или это я вырос?»';

      function finishIssue(bonus) {
        o.state = 'stored';
        o.cell = o.cellSaved || sys.assignCell(st.orders, o.size);
        issueParcel(o, c);
        if (bonus) {
          PVZ.state.addMoney(bonus);
          st.stats.revenue += bonus;
          msg('Клиент доволен примеркой: +' + bonus + ' ₽.', 'good');
        }
        giveTip(c);
        st.moment = null;
        leaveCustomer(c, true);
      }
      function finishReturn() {
        o.state = 'return';
        o.customer = null;
        o.cell = null;
        st.stats.returns++;
        st.stats.revenue += TARIFF.ret;
        PVZ.state.addMoney(TARIFF.ret);
        PVZ.audio.ok();
        msg('Возврат оформлен: «' + o.item + '» → зона возвратов. +' + TARIFF.ret + ' ₽', 'good');
        st.moment = null;
        leaveCustomer(c, true);
      }
      function secondThoughts() {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'примерочная',
          mood: c.moodIcon + ' ' + c.moodLabel,
          text: 'Клиент смотрит в зеркало ещё раз: «Может, я зря сомневаюсь? Или всё-таки не моё?»',
          choices: [
            {
              label: 'Оформить возврат — клиент всегда прав', hint: 'долго · хороший отзыв',
              fx: { time: 2, rating: 0.04 },
              cb: finishReturn
            },
            {
              label: 'Убедить, что вещь сидит лучше, чем кажется', hint: '50/50 · риск',
              fx: { time: 2, patience: -0.06 },
              cb: function () {
                if (U.chance(0.55)) finishIssue(60);
                else { st.moment = null; leaveCustomer(c, false, 'Клиент всё-таки решил не брать — и обиделся.'); }
              }
            }
          ]
        });
      }

      var choices;
      if (fits) {
        choices = [
          {
            label: 'Сказать: «Сидит идеально, вам очень идёт»', hint: 'недолго · хороший отзыв',
            fx: { time: 1, rating: 0.05 },
            cb: function () { finishIssue(40); }
          },
          {
            label: 'Сфотографировать для отзывов', hint: 'недолго · прибыль',
            fx: { time: 2, rating: 0.06 },
            cb: function () {
              c.bubble = 'Снимайте! Только скажите, что это лучший ПВЗ.';
              finishIssue(80);
            }
          },
          {
            label: 'Похвалить и предложить пакет', hint: 'быстро · прибыль',
            fx: { time: 1, money: 60, rating: 0.02 },
            cb: function () { finishIssue(0); }
          },
          {
            label: 'Честно сказать: «Цвет немного спорный»', hint: 'недолго · риск',
            fx: { time: 2, rating: -0.02, patience: -0.08 },
            cb: secondThoughts
          }
        ];
      } else {
        choices = [
          {
            label: 'Принести размер больше', hint: 'долго · хороший отзыв',
            fx: { time: 4, rating: 0.06 },
            cb: function () {
              c.bubble = 'Вот это другое дело! Спасибо, что не отмахнулись.';
              finishIssue(50);
            }
          },
          {
            label: 'Оформить возврат: принять товар', hint: 'недолго · хороший отзыв',
            fx: { time: 2, rating: 0.04 },
            cb: finishReturn
          },
          {
            label: 'Убедить, что сядет после стирки', hint: '50/50 · −терпение',
            fx: { time: 2, patience: -0.1 },
            cb: function () {
              if (U.chance(0.45)) finishIssue(20);
              else { st.moment = null; leaveCustomer(c, false, 'Клиент не поверил про стирку и ушёл с жалобой.'); }
            }
          },
          {
            label: 'Предложить другую модель со склада', hint: 'долго · прибыль',
            fx: { time: 4, rating: 0.05 },
            cb: function () { finishIssue(70); }
          }
        ];
      }
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'примерочная',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: text,
        choices: choices
      });
    }

    /* ---------------- особые гости смены ---------------- */
    /* Витя Гром (2-я смена) — не просто диалог: пока его не успокоили, он
       кричит на очередь и сносит товар с полок. Остальные особые гости —
       короткие истории с выбором, за которые дают деньги, рейтинг или
       добавляют проблем. */
    function spawnSpecial(def) {
      if (!def || (st.special && !st.special.done)) return null;
      var c = sys.makeCustomer();
      c.kind = 'special';
      c.specialId = def.id;
      c.name = def.name;
      c.last = def.last || '';
      if (def.look) {
        Object.keys(def.look).forEach(function (k) {
          if (def.look[k] != null) c[k] = def.look[k];
        });
      }
      var mo = sys.mood(def.mood || 'calm');
      c.mood = mo.id;
      c.moodLabel = def.moodLabel || mo.label;
      c.moodIcon = def.moodIcon || mo.icon;
      c.expr = (def.look && def.look.expr) || 'neutral';
      c.phone = 'none';
      c.phoneLabel = 'без телефона';
      c.pay = 'card';
      c.parcels = 0;
      c.orderIds = [];
      c.ask = def.intro || '';
      c.talon = st.talon++;
      c.patience = 1;
      c.patienceRate = (def.danger ? 0.006 : 0.012) * patienceScale(st.day) * (st.mods.patience || 1);
      c.state = 'queue';
      c.waitT = 0;
      c.atT = 0;
      c.bubble = def.danger ? 'Я вне очереди!' : null;
      c.bubbleAlpha = 0;
      c.revealed = true;
      c.codeScanned = false;
      c.dictated = false;
      c.momentDone = true;
      c.vx = 1240;
      c.vgy = 488;
      c.vh = 296 * c.height;
      c.enterAlpha = 0;
      c.moving = true;
      c.arrived = false;
      c.arrivedT = 0;
      // двойник: второй такой же гость для сцены
      if (def.scene === 'duo') {
        c.specialTwin = art.makePerson({
          female: false, skin: 1, hair: '#5a4028', style: 'short', shirt: '#8a6a4a',
          pants: '#3a4048', coat: null, expr: 'confused', glasses: false,
          hat: null, beard: true, bangs: false, build: 1.04
        });
        c.specialTwin.name = def.name;
        c.specialTwin.last = def.last;
      }
      // в зале всего восемь мест: если очередь уже плотная, дальний
      // покупатель просто уходит, а особый гость всё равно заходит
      if (st.queue.length >= QUEUE_SLOTS.length) {
        var over = st.queue.pop();
        if (over) {
          over.state = 'leaving';
          st.leavers.push({ person: over, vx: over.vx, vgy: over.vgy, vh: over.vh, t: 0 });
        }
      }
      if (def.danger) st.queue.unshift(c);
      else st.queue.push(c);
      st.special = {
        id: def.id, def: def, c: c, stage: 'active', t: 0,
        shoutT: def.danger ? 4.5 : 0,
        breakT: def.danger ? 9.5 : 0,
        breaks: 0, done: false
      };
      st.specialBanner = 8;
      st.bellRinging = 1.4;
      PVZ.audio.bell();
      if (def.danger) {
        PVZ.audio.bad();
        st.smash = { t: 0, x: 985, y: 470, seed: 3 };
      }
      msg(def.announce || ('В зал входит ' + c.name + '.'), def.danger ? 'bad' : 'info');
      st.stats.specials = (st.stats.specials || 0) + 1;
      if (PVZ.serve) PVZ.serve.markSeen(def.id, st.day);
      scheduleSpawn();
      return st.special;
    }

    function queueFlee(q, why) {
      if (!q || q.state === 'leaving') return;
      q.state = 'leaving';
      q.expr = 'sad';
      q.bubble = U.pick(['Я лучше в другой раз.', 'Ну и атмосфера у вас.', 'Пойду, пожалуй.']);
      q.bubbleAlpha = 1;
      st.leavers.push({ person: q, vx: q.vx, vgy: q.vgy, vh: q.vh, t: 0 });
      var i = st.queue.indexOf(q);
      if (i >= 0) st.queue.splice(i, 1);
      st.stats.complaints++;
      PVZ.state.rateVisit(2, (st.dayMod.rating || 1) * (st.mods.complaint || 1));
      PVZ.state.addMoney(-TARIFF.complaint);
      PVZ.audio.bad();
      msg(why || 'Клиент не выдержал и ушёл.', 'bad');
    }

    function rageShout(sp) {
      var c = sp.c;
      if (!c || c.state === 'leaving') return;
      c.bubble = PVZ.serve ? PVZ.serve.shout(sp.def) : 'Безобразие!';
      c.bubbleAlpha = 0;
      c.expr = 'angry';
      st.specialBanner = 3;
      PVZ.audio.bad();
      var scared = 0;
      var flee = null;
      st.queue.forEach(function (q) {
        if (q === c) return;
        q.patience = Math.max(0.05, q.patience - 0.1);
        scared++;
        if (!flee && q.patience < 0.4 && U.chance(0.22)) flee = q;
        else if (U.chance(0.3)) { q.expr = 'sad'; }
      });
      if (flee) queueFlee(flee, 'Клиент не выдержал крика и ушёл из очереди.');
      else if (scared) msg('Гром накричал на очередь — покупатели нервничают.', 'bad');
    }

    function breakGoods(sp) {
      var cost = U.ri(90, 240);
      PVZ.state.addMoney(-cost);
      st.stats.revenue -= cost;
      PVZ.state.addRating(-0.02 * (st.mods.rating || 1));
      sp.breaks = (sp.breaks || 0) + 1;
      st.smash = { t: 0, x: 960 + U.rand(-40, 40), y: 470 + U.rand(-16, 16), seed: sp.breaks };
      st.specialBanner = 3;
      PVZ.audio.bad();
      msg('Гром снёс коробку с полки: −' + cost + ' ₽ и испорченный товар. Успокойте его!', 'bad');
    }

    function enrageSpecial(c, reply) {
      var sp = st.special;
      var wasDone = !sp || sp.done;
      if (sp && !sp.done) {
        sp.done = true;
        var cost = U.ri(200, 360);
        PVZ.state.addMoney(-cost);
        st.stats.revenue -= cost;
        st.smash = { t: 0, x: 985, y: 468, seed: 9 };
        st.specialBanner = 0;
        msg('Гром окончательно разошёлся и снёс полку: −' + cost + ' ₽.', 'bad');
      }
      st.moment = null;
      if (!c) return;
      c.expr = 'angry';
      c.bubble = reply || 'Я этого так не оставлю!';
      c.bubbleAlpha = 0;
      leaveCustomer(c, false, 'Гром ушёл, разгромив зал.');
      if (!wasDone) PVZ.state.addRating(-0.08);
      if (c) { c.bubble = reply || 'Я этого так не оставлю!'; c.bubbleAlpha = 0; }
    }

    function finishSpecial(c, ok, reply) {
      var sp = st.special;
      if (sp && !sp.done) sp.done = true;
      st.specialBanner = 0;
      st.moment = null;
      if (!c) return;
      if (ok) {
        PVZ.state.addRating(0.04);
        msg('Особый гость обслужен — история закрыта.', 'good');
        leaveCustomer(c, true);
        if (reply) { c.bubble = reply; c.bubbleAlpha = 0; }
      } else {
        leaveCustomer(c, false, 'Особый гость ушёл недовольным.');
        if (reply) { c.bubble = reply; c.bubbleAlpha = 0; }
      }
    }

    function openSpecial(c) {
      var def = (PVZ.serve && PVZ.serve.specialById(c.specialId)) ||
        (st.special && st.special.c === c ? st.special.def : null);
      if (!def) { leaveCustomer(c, true); return; }
      openSpecialStep(c, def, 0, def.intro || '');
    }

    function openSpecialStep(c, def, idx, intro) {
      var step = def.steps[idx];
      if (!step) { finishSpecial(c, true); return; }
      var scenePerson = c;
      st.moment = {
        kind: def.scene || 'item',
        person: scenePerson,
        person2: c.specialTwin || null,
        item: null,
        title: def.role || 'особый гость',
        subtitle: ((def.name || '') + ' ' + (def.last || '')).trim(),
        t: 0
      };
      var choices = step.choices.map(function (ch) {
        return {
          label: ch.label,
          hint: ch.hint || '',
          fx: ch.fx || null,
          cb: function () {
            if (ch.tip) {
              PVZ.state.addMoney(ch.tip);
              st.stats.revenue += ch.tip;
              st.stats.tips += ch.tip;
              PVZ.audio.coin();
            }
            if (ch.queue) {
              st.queue.forEach(function (q) { q.patience = U.clamp(q.patience + ch.queue, 0.05, 1); });
            }
            if (ch.enrage) { enrageSpecial(c, ch.reply); return; }
            if (ch.peace) { finishSpecial(c, true, ch.reply); return; }
            var next = ch.next != null ? ch.next : idx + 1;
            if (ch.roll != null) next = U.chance(ch.roll) ? ch.ok : ch.bad;
            if (def.steps[next]) openSpecialStep(c, def, next, ch.reply);
            else finishSpecial(c, true, ch.reply);
          }
        };
      });
      openDialog({
        name: ((def.name || '') + ' ' + (def.last || '')).trim(),
        person: c,
        role: def.role || 'особый гость',
        mood: (c.moodIcon || '★') + ' ' + (c.moodLabel || ''),
        text: (intro ? intro + ' ' : '') + step.text,
        choices: choices
      });
    }

    function updateSpecial(dt) {
      var sp = st.special;
      if (!sp || sp.done) return;
      var c = sp.c;
      if (!c || c.state === 'leaving') { sp.done = true; return; }
      if (st.phase !== 'day') return;
      sp.t += dt;
      if (sp.def.danger) {
        sp.shoutT -= dt;
        sp.breakT -= dt;
        if (sp.shoutT <= 0) {
          sp.shoutT = U.rand(6.5, 9.5);
          rageShout(sp);
        }
        if (sp.breakT <= 0) {
          sp.breakT = U.rand(12, 16);
          breakGoods(sp);
        }
        if (sp.breaks >= 5 && !sp.done) {
          enrageSpecial(c, 'Всё! Я ухожу, но вы ещё услышите обо мне!');
          return;
        }
      } else if (sp.t > 160) {
        // гость заждался и уходит без истории
        finishSpecial(c, false);
      }
    }

    function drawSpecialBanner(ctx) {
      if (!st.special || st.special.done) return;
      var d = st.special.def;
      var label = d.danger
        ? '⚠ ' + d.name + ' ' + (d.last || '') + ' буянит в зале'
        : '★ ' + d.name + ' ' + (d.last || '') + ' — ' + d.role;
      var w = Math.min(640, art.txtW(ctx, label, 15, 800) + 50);
      art.panel(ctx, 640 - w / 2, 78, w, 38, {
        bg: d.danger ? 'rgba(120,32,22,0.93)' : 'rgba(40,32,24,0.92)',
        r: 19,
        border: d.danger ? 'rgba(255,120,70,0.55)' : 'rgba(255,214,150,0.35)'
      });
      art.txt(ctx, label, 640, 102, 15, d.danger ? '#ffd0b0' : '#ffe0b0', 800, 'center');
      if (d.danger) {
        art.txt(ctx, 'Дождитесь его у стойки и нажмите на него — успокойте', 640, 128, 11, 'rgba(255,214,180,0.75)', 600, 'center');
      }
    }

    function openReturn(c) {
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'возврат',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Хочу вернуть заказ — не подошло. Что мне делать?',
        choices: [
          {
            label: 'Принять товар и оформить заявку',
            hint: '+' + TARIFF.ret + ' ₽ · 2 мин',
            fx: { time: 2, rating: 0.04 },
            cb: function () {
              st.stats.returns++;
              st.stats.revenue += TARIFF.ret;
              PVZ.state.addMoney(TARIFF.ret);
              PVZ.audio.ok();
              msg('Возврат оформлен («' + U.pick(sys.RETURN_REASONS) + '»). +' + TARIFF.ret + ' ₽', 'good');
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Проверить вещь и помочь с размером',
            hint: '+80 ₽ · 5 мин · +репутация',
            fx: { time: 5, money: 80, rating: 0.08 },
            cb: function () {
              st.stats.returns++;
              st.stats.revenue += TARIFF.ret * 2;
              PVZ.state.addMoney(TARIFF.ret * 2);
              msg('Разобрались с размером — клиент взял другой товар. +' + (TARIFF.ret * 2) + ' ₽', 'good');
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Сказать: «возвраты не принимаем»',
            hint: '2 мин · −репутация',
            fx: { time: 2, rating: -0.05 },
            cb: function () {
              if (U.chance(0.5)) {
                msg('Клиент ушёл недовольный: возврат можно оформить в ПВЗ.', 'bad');
                leaveCustomer(c, true);
              } else {
                leaveCustomer(c, false, 'Жалоба: отказали в возврате.');
              }
            }
          },
          {
            label: 'Позвать администратора и потянуть время',
            hint: '4 мин · −терпение',
            fx: { time: 4, patience: -0.2 },
            cb: function () {
              msg('Администратора нет, клиент ждёт.', 'bad');
              openReturn(c);
            }
          }
        ].concat(talkChoice(c, function () { openReturn(c); }) || [])
      });
    }

    function openQuestion(c, q) {
      q = q || c.question || sys.makeQuestion();
      c.question = q;
      var choices = q.opts.map(function (o) {
        return {
          label: o.t,
          hint: fxText(o.fx),
          fx: o.fx,
          cb: function () {
            if (o.ok) {
              var money = TARIFF.consult;
              PVZ.state.addMoney(money);
              st.stats.revenue += money;
              c.expr = 'happy';
              msg('Клиент доволен: «' + o.reply + '» +' + money + ' ₽ за консультацию', 'good');
              leaveCustomer(c, true);
            } else {
              c.expr = 'annoyed';
              leaveCustomer(c, false, 'Клиент остался недоволен ответом.');
            }
          }
        };
      });
      var talk = talkChoice(c, function () { openQuestion(c, q); });
      if (talk) choices.push(talk);
      openDialog({ name: c.name + ' ' + c.last, person: c, role: 'вопрос', mood: c.moodIcon + ' ' + c.moodLabel, text: q.q, choices: choices });
    }

    /* ---------------- сюжетные диалоги ---------------- */
    function storyFinish(c, bubble, good, money, rating) {
      if (money) {
        PVZ.state.addMoney(money);
        st.stats.revenue += money;
      }
      if (rating) PVZ.state.addRating(rating);
      st.stats.served++;
      leaveCustomer(c, true);
      c.expr = good ? 'happy' : 'sad';
      c.bubble = bubble;
      c.bubbleAlpha = 1;
    }

    /* Уличный кот: гостья оставляет его на ПВЗ — можно взять или отказаться */
    function openCatStory(c, step) {
      if (!c) return;
      if (step === 3) {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'с котом',
          mood: '🐈 котёнок ищет дом',
          text: 'Он уже освоился у вас на прилавке. Как его назовём?',
          choices: [
            { label: 'Назвать Мурзиком', hint: '+уют · +чаевые', cb: function () { takeCat(c, 'Мурзик'); } },
            { label: 'Назвать Барсиком', hint: '+уют · +чаевые', cb: function () { takeCat(c, 'Барсик'); } },
            { label: 'Просто Кот — имя ни к чему', hint: '+уют · +чаевые', cb: function () { takeCat(c, 'Кот'); } }
          ]
        });
        return;
      }
      if (step === 2) {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'с котом',
          mood: '🐈 котёнок ищет дом',
          text: 'Он не привередливый: обычный корм, лоток, тёплое место. И мышей ловит — будете спать спокойно.',
          choices: [
            { label: 'Хорошо, оставляйте кота', hint: '+уют · +чаевые', cb: function () { openCatStory(c, 3); } },
            { label: 'Всё равно придётся отказаться', hint: 'без штрафа', cb: function () { refuseCat(c); } }
          ]
        });
        return;
      }
      if (step === 1) {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'с котом',
          mood: '🐈 котёнок ищет дом',
          text: 'Я нашла его у вас на крыльце: худой, но ласковый. У меня аллергия и маленькая квартира. Может, он останется у вас?',
          choices: [
            { label: 'Согласиться: пусть живёт на столе', hint: '+уют · +чаевые', cb: function () { openCatStory(c, 3); } },
            { label: 'Спросить, чем его кормить', hint: '2 мин', cb: function () { openCatStory(c, 2); } },
            { label: 'Извиниться и отказаться', hint: 'без штрафа', cb: function () { refuseCat(c); } }
          ]
        });
        return;
      }
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'с кошачьей переноской',
        mood: '🐈 котёнок ищет дом',
        text: 'Здравствуйте… Вы не подскажете, кто у вас тут главный? Я нашла кота у входа. Ему нужен дом, а я не могу его взять.',
        choices: [
          { label: 'Расспросить, что случилось', hint: '2 мин', cb: function () { openCatStory(c, 1); } },
          { label: 'Сразу приютить кота', hint: '+уют · +чаевые', cb: function () { openCatStory(c, 3); } },
          { label: 'Извиниться и отказаться', hint: 'без штрафа', cb: function () { refuseCat(c); } }
        ]
      });
    }

    function takeCat(c, name) {
      var pool = ['ginger', 'gray', 'black', 'white'];
      if (PVZ.state.premiumHas && PVZ.state.premiumHas('catSkins')) pool = pool.concat(['siam', 'tuxedo', 'calico', 'blue']);
      var fur = U.pick(pool);
      PVZ.state.data.cat = { name: name || 'Мурзик', fur: fur, takenDay: st.day, petDay: 0 };
      PVZ.state.data.catStory = 'taken';
      PVZ.state.save();
      st.catAnim = { anim: 'happy', t: 0 };
      PVZ.audio.level();
      storyFinish(c, 'Спасибо! Теперь у него есть дом. Он будет отличным талисманом!', true, 0, 0.08);
      msg('Кот ' + (name || 'Мурзик') + ' остался на ПВЗ: +3% к терпению и +8% к чаевым. Гладьте его каждый день!', 'good');
    }

    function refuseCat(c) {
      PVZ.state.data.catStory = 'refused';
      PVZ.state.save();
      storyFinish(c, 'Понимаю… Может, кто-то другой его приютит.', false, 0, 0);
      msg('Кот остался на улице. Может быть, в другой раз.', 'info');
    }

    /* ---------------- мутный тип и чёрный рынок ---------------- */
    function shadyName(c) { return (c && c.name) || '???'; }

    function openShady(c, step) {
      if (st.dlg) return;
      if (step === 2) {
        openDialog({
          name: shadyName(c),
          person: c,
          role: 'странная одежда',
          mood: '🕶 непонятно кто',
          text: 'Всё равно поставлю. Уже поставил, пока вы на меня смотрели. Не благодарите.',
          choices: [
            { label: 'Ладно. Что это вообще?', hint: 'открыть приложение', cb: function () { installBanana(c); } }
          ]
        });
        return;
      }
      if (step === 1) {
        openDialog({
          name: shadyName(c),
          person: c,
          role: 'странная одежда',
          mood: '🕶 непонятно кто',
          text: 'Кто я — не важно. Важно, что у вас есть ноутбук и склад. «Banana store» — магазин без правил. Там берут то, чего нет в обычных магазинах. И скупают то, что у вас залежалось.',
          choices: [
            { label: 'Поставить приложение', hint: 'чёрный рынок · риск', cb: function () { installBanana(c); } },
            { label: 'А если полиция узнает?', hint: '2 мин', cb: function () { openShady(c, 2); } },
            { label: 'Мне это не нужно', hint: 'он всё равно поставит', cb: function () { openShady(c, 2); } }
          ]
        });
        return;
      }
      openDialog({
        name: shadyName(c),
        person: c,
        role: 'странная одежда',
        mood: '🕶 непонятно кто',
        text: '…Не пугайтесь. Мне сказали, у вас тут ноутбук с интернетом. Мне нужно кое-что поставить. Две минуты — и я уйду, вы меня не видели.',
        choices: [
          { label: 'Спросить, кто он такой', hint: '2 мин', cb: function () { openShady(c, 1); } },
          { label: 'Позволить пользоваться ноутбуком', hint: 'чёрный рынок', cb: function () { installBanana(c); } },
          { label: 'Выставить его за дверь', hint: 'он всё равно поставит', cb: function () { openShady(c, 2); } }
        ]
      });
    }

    function installBanana(c) {
      var b = PVZ.state.banana();
      if (b) b.met = true;
      var res = PVZ.state.installApp('banana');
      // он ставит приложение в любом случае — даже если касса ушла в минус
      if (!res.ok && !PVZ.state.hasApp('banana') && PVZ.state.data) {
        PVZ.state.data.apps.push('banana');
        PVZ.state.save();
      }
      PVZ.audio.bad();
      if (c) {
        c.reviewed = true;
        c.bubble = 'Не показывайте это антивирусу.';
        c.bubbleAlpha = 1;
      }
      msg('??? поставил на ноутбук «Banana store». Приложение — в ноутбуке (L). Антивирус будет ругаться.', 'bad');
      PVZ.state.addRating(-0.02);
      if (c) leaveCustomer(c, true);
    }

    /* Покупка на чёрном рынке */
    function bananaBuy(id) {
      var item = PVZ.apps.bananaItem(id);
      var b = PVZ.state.banana();
      if (!item || !b) return;
      if (!PVZ.state.hasApp('banana')) { msg('Banana store больше не установлен.', 'bad'); return; }
      if (!item.repeat && PVZ.state.bananaHas(id)) { msg('Это уже куплено.', 'info'); return; }
      if (item.id === 'bribe' && b.heat <= 0) { msg('Подозрений нет — взятка ни к чему.', 'info'); return; }
      if (PVZ.state.data.money < item.price) {
        msg('Не хватает ' + U.fmtMoney(item.price - PVZ.state.data.money) + ' на «' + item.name + '».', 'bad');
        PVZ.audio.bad();
        return;
      }
      PVZ.state.addMoney(-item.price);
      if (item.id === 'bribe') {
        PVZ.state.bananaHeat(-30);
        PVZ.audio.ok();
        msg('Взятка передана. Подозрение полиции: ' + Math.round(PVZ.state.banana().heat) + '%.', 'good');
      } else {
        b.bought.push(id);
        PVZ.state.bananaHeat(4);
        PVZ.state.save();
        st.mods = PVZ.state.mods();
        PVZ.audio.ok();
        msg('Куплено на чёрном рынке: ' + item.name + '. ' + item.sold, 'good');
      }
    }

    /* Сбыт посылки со склада */
    function bananaSell(orderId) {
      var b = PVZ.state.banana();
      var o = orderById(orderId);
      if (!b || !o || o.state !== 'stored' || o.customer) return;
      if (!PVZ.state.hasApp('banana')) { msg('Banana store больше не установлен.', 'bad'); return; }
      if (b.soldDay === st.day && b.soldToday >= 1) {
        msg('Сегодня уже сбывали товар. Скупщик просит не наглеть.', 'bad');
        PVZ.audio.bad();
        return;
      }
      var price = PVZ.apps.bananaPrice(o);
      var heat = PVZ.state.bananaHeat(22);
      PVZ.state.addMoney(price);
      st.stats.revenue += price;
      PVZ.state.addRating(-0.12 * (st.dayMod && st.dayMod.rating || 1));
      if (b.soldDay !== st.day) { b.soldDay = st.day; b.soldToday = 0; }
      b.soldToday++;
      b.totalSold = (b.totalSold || 0) + 1;
      o.state = 'sold';
      o.cell = null;
      o.customer = null;
      st.orders = st.orders.filter(function (x) { return x !== o; });
      PVZ.state.save();
      PVZ.audio.cash();
      var note = heat >= 80 ? ' Полиция уже собирает материал — следующая сделка может стать последней.'
        : heat >= 50 ? ' Участковый начал задавать вопросы про ваш склад.' : '';
      msg('Товар «' + o.item + '» сбыт: +' + U.fmtMoney(price) + '. Подозрение полиции: ' + Math.round(heat) + '%.' + note, 'bad');
      // при 100% подозрения арест запустит checkBananaArrest() в ближайшем кадре:
      // сначала полицейский войдёт и поговорит, а не появится окно «вас арестовали»
    }

    /* ---------------- арест за чёрный рынок ---------------- */
    /* Раньше при 100% подозрения игра просто показывала «вас арестовали».
       Теперь в ПВЗ действительно приходит полицейский: стучит, идёт от двери
       к стойке, разговаривает с игроком — и только потом надевает наручники. */

    function arrestHeat() {
      var b = PVZ.state.banana ? PVZ.state.banana() : null;
      return b && PVZ.state.hasApp('banana') ? b.heat : 0;
    }

    /* Проверяем переполненное подозрение каждый кадр: сработать оно может
       от сбыта, от покупки или от события дня. Пока открыт диалог/терминал/QTE,
       ждём: полиция не должна перебивать окно. Ноутбук закрываем сами. */
    function checkBananaArrest() {
      if (st.arrest || st.over || st.finished) return;
      if (st.phase !== 'day' && st.phase !== 'evening') return;
      if (!st.shiftOpen) return;
      if (st.qte || st.terminal || st.phone || st.dlg) return;
      if (st.threat) return;
      if (!PVZ.state.data || PVZ.state.data.over) return;
      if (arrestHeat() < 100) return;
      startArrest();
    }

    function startArrest() {
      if (st.arrest || st.over) return;
      st.laptop = null;
      st.view = 'counter';
      st.viewFade = 0;
      st.doorOpen = true;
      clearHallForArrest();
      st.arrest = {
        person: COP_PERSON,
        vx: 1240, vgy: 490, vh: 348,
        stage: 'arriving',
        t: 0,
        stageT: 0,
        arrivedT: 0,
        alpha: 0,
        moving: false,
        bubble: 'Проверка по адресу. Полиция.',
        bubbleAlpha: 0
      };
      st.bellRinging = 1.4;
      PVZ.audio.knock();
      PVZ.audio.bad();
      msg('В дверях стоит полицейский. Подозрение полиции — 100%.', 'bad');
    }

    /* Посетители не должны пострадать от визита: отпускаем их без штрафов */
    function clearHallForArrest() {
      var away = st.queue.slice();
      if (st.customer) away.unshift(st.customer);
      st.queue = [];
      st.customer = null;
      st.nextT = 0;
      st.held = null;
      st.phone = null;
      st.dlg = null;
      away.forEach(function (c) {
        if (c.orderIds) c.orderIds.forEach(function (id) {
          var o = orderById(id);
          if (o && o.customer === c.id) o.customer = null;
        });
        c.expr = 'sad';
        c.bubble = U.pick(['Полиция? Мне пора.', 'Я лучше в другой раз.', 'Ой… я ничего не покупал.']);
        c.bubbleAlpha = 1;
        c.state = 'leaving';
        st.leavers.push({ person: c, vx: c.vx, vgy: c.vgy, vh: c.vh, t: 0 });
      });
    }

    function updateArrest(dt) {
      var a = st.arrest;
      if (!a) return;
      a.t += dt;
      a.alpha = Math.min(1, (a.alpha || 0) + dt * 3);
      if (a.bubble) a.bubbleAlpha = Math.min(1, (a.bubbleAlpha || 0) + dt * 3);

      if (a.stage === 'arriving') {
        moveTo(a, 625, 800, 580, dt, 3.2);
        if (!a.moving) a.arrivedT += dt;
        if (a.arrivedT > 0.7) {
          a.stage = 'talking';
          a.bubble = null;
          a.bubbleAlpha = 0;
          openArrestIntro();
        }
        return;
      }

      if (a.stage === 'cuffing') {
        a.stageT += dt;
        if (a.stageT > 2.8 && !st.over) finishArrest();
      }
    }

    function openArrestIntro() {
      if (!st.arrest) return;
      openDialog({
        name: 'Сержант Грачёв',
        person: COP_PERSON,
        role: 'полиция · проверка',
        mood: '🚔 по наводке',
        text: 'Добрый день. Сержант Грачёв, участковый. Поступил сигнал: через ваш пункт сбывают товары с чёрного рынка. Покажите ноутбук и журнал приёма. Без резких движений.',
        choices: [
          {
            label: 'Это какая-то ошибка', hint: 'отрицать',
            cb: function () { openArrestProof('deny'); }
          },
          {
            label: 'Молча показать ноутбук', hint: 'не спорить',
            cb: function () { openArrestProof('show'); }
          },
          {
            label: 'Попробовать договориться', hint: 'взятка · поздно',
            cb: function () { openArrestBribe(); }
          }
        ]
      });
      PVZ.audio.ui();
    }

    function openArrestProof(kind) {
      if (!st.arrest) return;
      var text = kind === 'show'
        ? 'Так… «Banana store» на месте, сделки в журнале. Понятно. Закрывайте ноутбук и отойдите от стола.'
        : 'Ошибка? Тогда откуда на ноутбуке «Banana store» и почему склад пустеет без выдач? Скупщик уже дал показания.';
      openDialog({
        name: 'Сержант Грачёв',
        person: COP_PERSON,
        role: 'полиция · проверка',
        mood: '🚔 по наводке',
        text: text,
        choices: [
          {
            label: 'Показать накладные', hint: 'формальности',
            cb: function () { openArrestFinal('papers'); }
          },
          {
            label: 'Сказать, что ноутбук не мой', hint: 'отрицать',
            cb: function () { openArrestFinal('lie'); }
          },
          {
            label: 'Потребовать адвоката', hint: 'по закону',
            cb: function () { openArrestFinal('lawyer'); }
          }
        ]
      });
      PVZ.audio.ui();
    }

    function openArrestBribe() {
      if (!st.arrest) return;
      openDialog({
        name: 'Сержант Грачёв',
        person: COP_PERSON,
        role: 'полиция · проверка',
        mood: '🚔 по наводке',
        text: 'Сержант отодвигает конверт. «Это уже взятка должностному лицу при исполнении. Спасибо, теперь у меня есть всё для протокола».',
        choices: [
          {
            label: 'Понять, что это конец', hint: 'поздно',
            cb: function () { openArrestFinal('bribe'); }
          }
        ]
      });
      PVZ.audio.ui();
    }

    function openArrestFinal(kind) {
      if (!st.arrest) return;
      var lead = kind === 'lawyer'
        ? 'Адвокат — ваше право, зачитаете его в отделении.'
        : kind === 'lie'
          ? 'Ноутбук ваш, и вы это знаете. Хватит.'
          : kind === 'bribe'
            ? 'Конверт я приобщу к делу.'
            : 'Накладные не сходятся со складом.';
      openDialog({
        name: 'Сержант Грачёв',
        person: COP_PERSON,
        role: 'полиция · задержание',
        mood: '🚔 наручники',
        text: lead + ' Вы задержаны по подозрению в незаконной торговле. Права зачитают в отделении. Пункт выдачи закрывается.',
        choices: [
          {
            label: 'Молча пойти с ним', hint: 'без слов',
            cb: function () { beginArrestEnding(); }
          },
          {
            label: 'Сказать, что вас подставили', hint: 'бесполезно',
            cb: function () { beginArrestEnding(); }
          }
        ]
      });
      PVZ.audio.ui();
    }

    function beginArrestEnding() {
      var a = st.arrest;
      if (!a) return;
      a.stage = 'cuffing';
      a.stageT = 0;
      a.bubble = null;
      a.bubbleAlpha = 0;
      PVZ.audio.bad();
      PVZ.audio.boom();
      msg('Сержант Грачёв надевает наручники. Вас увозят в отделение.', 'bad');
    }

    function finishArrest() {
      if (st.over) return;
      st.laptop = null;
      st.terminal = null;
      st.phone = null;
      st.qte = null;
      st.dlg = null;
      failRun('Полиция арестовала вас за торговлю краденым с чёрного рынка');
    }

    function arrestCrowd() {
      var a = st.arrest;
      if (!a) return [];
      a.person.bubble = a.bubble;
      return [{
        person: a.person, x: a.vx, gy: a.vgy, h: a.vh, lift: 0.075,
        walking: a.moving, alpha: a.alpha, bubbleAlpha: a.bubbleAlpha
      }];
    }

    function drawArrestOverlay(ctx) {
      var a = st.arrest;
      if (!a || a.stage !== 'cuffing') return;
      var k = U.clamp(a.stageT / 1.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.45 * k;
      ctx.fillStyle = '#0a0604';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = k;
      art.fillRR(ctx, 240, 268, 800, 168, 18, 'rgba(48,14,10,0.92)');
      art.strokeRR(ctx, 240, 268, 800, 168, 18, 'rgba(255,120,90,0.75)', 2);
      art.txt(ctx, 'ВАС АРЕСТОВАЛИ', 640, 336, 52, '#ff6a4a', 900, 'center');
      art.txt(ctx, 'Полиция задержала вас за чёрный рынок «Banana store». Пункт выдачи закрыт.', 640, 380, 17, 'rgba(255,235,225,0.9)', 600, 'center');
      art.txt(ctx, 'Сержант Грачёв ведёт вас к машине…', 640, 408, 13, 'rgba(255,200,180,0.7)', 600, 'center');
      ctx.restore();
    }


    /* Подарок: упаковать или нет */
    function openGiftStory(c) {
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'с подарком',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Здравствуйте! Купила подарок, а упаковать негде. Вы можете красиво завернуть?',
        choices: [
          {
            label: 'Завернуть в подарочную бумагу', hint: '+120 ₽ · 3 мин · +репутация',
            cb: function () {
              storyFinish(c, 'Вот это красота! Спасибо вам огромное!', true, 120, 0.05);
              msg('Подарок упакован: +120 ₽ и благодарность.', 'good');
            }
          },
          {
            label: 'Предложить фирменный пакет', hint: '+30 ₽ · 1 мин',
            cb: function () {
              storyFinish(c, 'Пакет тоже сойдёт, спасибо.', true, 30, 0.01);
              msg('Фирменный пакет продан: +30 ₽.', 'good');
            }
          },
          {
            label: 'Извиниться: упаковки нет', hint: '2 мин · −репутация',
            cb: function () {
              storyFinish(c, 'Жаль, придётся вручать как есть.', false, 0, -0.02);
              msg('Клиентка расстроилась — упаковки не нашлось.', 'bad');
            }
          }
        ]
      });
    }

    /* Первый заказ: человек волнуется */
    function openFirstTimeStory(c, step) {
      if (step === 1) {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'первый заказ',
          mood: c.moodIcon + ' ' + c.moodLabel,
          text: 'Спасибо! Кажется, я понял. А вы точно не будете смеяться, если я нажму что-то не так?',
          choices: [
            {
              label: 'Успокоить и выдать заказ', hint: '+45 ₽ · +репутация',
              cb: function () {
                storyFinish(c, 'Ура! Получилось. Вы очень добрый человек.', true, 45, 0.06);
                msg('Первый заказ выдан — клиент счастлив.', 'good');
              }
            },
            {
              label: 'Показать, где расписаться', hint: '+12 ₽ · +репутация',
              cb: function () {
                storyFinish(c, 'Вот здесь? Спасибо, теперь я не потеряюсь.', true, 12, 0.04);
                msg('Клиент научился получать заказы.', 'good');
              }
            },
            {
              label: 'Поторопить: очередь', hint: '+45 ₽ · −репутация',
              cb: function () {
                storyFinish(c, 'Ладно-ладно, уже иду.', false, 45, -0.02);
                msg('Вышло быстро, но клиент немного растерялся.', 'info');
              }
            }
          ]
        });
        return;
      }
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'первый заказ',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Здравствуйте! Это мой первый заказ… Подскажите, как всё пройдёт? Я боюсь что-то сделать не так.',
        choices: [
          {
            label: 'Подробно объяснить, как всё пройдёт', hint: '3 мин · +репутация · +терпение',
            cb: function () { c.expr = 'happy'; c.patience = Math.min(1, c.patience + 0.12); openFirstTimeStory(c, 1); }
          },
          {
            label: 'Коротко: назовите код и распишитесь', hint: '1 мин · −терпение',
            cb: function () { c.expr = 'confused'; c.patience = Math.max(0.2, c.patience - 0.08); openFirstTimeStory(c, 1); }
          },
          {
            label: 'Позвать администратора', hint: '4 мин · −терпение',
            cb: function () { c.patience = Math.max(0.2, c.patience - 0.2); openFirstTimeStory(c, 1); }
          }
        ]
      });
    }

    /* Потерял извещение */
    function openLostStory(c, step) {
      if (step === 1) {
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'без кода',
          mood: c.moodIcon + ' ' + c.moodLabel,
          text: 'Нашлась! Вот она, спасибо. Я уж думал, всё пропало и придётся ехать домой ни с чем.',
          choices: [
            {
              label: 'Выдать посылку', hint: '+45 ₽ · +репутация',
              cb: function () {
                storyFinish(c, 'Спасибо! Вы меня очень выручили.', true, 45, 0.05);
                msg('Заказ найден по фамилии и выдан: +45 ₽.', 'good');
              }
            },
            {
              label: 'Записать на завтра: пусть принесёт паспорт', hint: '+12 ₽ · +репутация',
              cb: function () {
                storyFinish(c, 'Хорошо, завтра обязательно приду с паспортом.', true, 12, 0.03);
                msg('Клиент записан на завтра, заказ оставлен на складе.', 'good');
              }
            }
          ]
        });
        return;
      }
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'без кода',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Я потерял извещение и не помню код. Но посылка точно здесь, на моё имя. Помогите, пожалуйста.',
        choices: [
          {
            label: 'Найти по фамилии в ноутбуке', hint: '3 мин · +репутация',
            cb: function () { openLostStory(c, 1); }
          },
          {
            label: 'Попросить паспорт и найти', hint: '2 мин · +репутация',
            cb: function () { c.expr = 'happy'; openLostStory(c, 1); }
          },
          {
            label: 'Без кода не могу помочь', hint: '1 мин · −репутация',
            cb: function () {
              storyFinish(c, 'Ну вот… А я так надеялся.', false, 0, -0.03);
              msg('Клиент ушёл ни с чем — код так и не нашли.', 'bad');
            }
          }
        ]
      });
    }

    function openStory(c, step) {
      if (c.story === 'gift') openGiftStory(c);
      else if (c.story === 'first_time') openFirstTimeStory(c, step);
      else if (c.story === 'lost') openLostStory(c, step);
      else openQuestion(c);
    }

    /* Погладить кота: раз в день поднимает настроение в зале */
    function petCat() {
      var cat = PVZ.state.data.cat;
      if (!cat) return;
      st.catAnim = { anim: 'happy', t: 0 };
      PVZ.audio.tone(760, 0.12, 'sine', 0.08, 620);
      // секрет: если гладить кота каждый день, он становится настоящим напарником
      PVZ.state.data.eggPets = (PVZ.state.data.eggPets || 0) + 1;
      if (PVZ.state.data.eggPets === 10 && !PVZ.state.hasEgg('catfriend')) {
        foundHiddenEgg('catfriend');
        PVZ.state.save();
      }
      if (cat.petDay !== st.day) {
        cat.petDay = st.day;
        PVZ.state.addRating(0.02);
        st.queue.forEach(function (q) { q.patience = Math.min(1, q.patience + 0.08); });
        if (st.customer) st.customer.patience = Math.min(1, st.customer.patience + 0.08);
        PVZ.state.save();
        msg(cat.name + ' мурлычет: в зале стало спокойнее, +репутация.', 'good');
      } else {
        msg(cat.name + ' щурится и трётся о руку. Хороший кот.');
      }
    }

    function openResolve(c) {
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'претензия',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Мне пришёл товар с браком, я полчаса жду! Разбирайтесь.',
        choices: [
          {
            label: 'Извиниться и оформить возврат по браку',
            hint: '+' + TARIFF.ret + ' ₽ · 3 мин · +репутация',
            fx: { time: 3, rating: 0.07 },
            cb: function () {
              st.stats.returns++;
              st.stats.revenue += TARIFF.ret;
              PVZ.state.addMoney(TARIFF.ret);
              msg('Конфликт улажен, возврат по браку оформлен.', 'good');
              PVZ.audio.ok();
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Предложить скидку на следующий заказ',
            hint: '−50 ₽ · 4 мин · +репутация',
            fx: { time: 4, money: -50, rating: 0.05 },
            cb: function () {
              msg('Клиент смягчился: скидка оформлена.', 'good');
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Сказать, что это не наша проблема',
            hint: '1 мин · −репутация',
            fx: { time: 1, rating: -0.06 },
            cb: function () {
              leaveCustomer(c, false, 'Жалоба: клиента отправили «разбираться самим».');
            }
          },
          {
            label: 'Позвать администратора',
            hint: '5 мин · −терпение',
            fx: { time: 5, patience: -0.25 },
            cb: function () {
              msg('Клиент ждёт администратора, очередь растёт.', 'bad');
              openResolve(c);
            }
          }
        ].concat(talkChoice(c, function () { openResolve(c); }) || [])
      });
    }

    function openLate(c) {
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'опоздавший',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Извините, я опоздал. Заказ с сегодняшней поставки, можно забрать?',
        choices: [
          {
            label: 'Обслужить, хоть смена и закрыта',
            hint: '+' + TARIFF.issue + ' ₽ · 3 мин · +репутация',
            fx: { time: 3, rating: 0.07 },
            cb: function () {
              st.stats.served++;
              st.stats.revenue += TARIFF.issue;
              PVZ.state.addMoney(TARIFF.issue);
              st.stats.late++;
              msg('Поздний покупатель обслужен: +' + TARIFF.issue + ' ₽', 'good');
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Извиниться: приходите завтра',
            hint: '1 мин · −репутация',
            fx: { time: 1, rating: -0.02 },
            cb: function () {
              msg('Клиент ушёл, но обещал вернуться.');
              leaveCustomer(c, true);
            }
          },
          {
            label: 'Записать заказ на утро и проводить',
            hint: '2 мин · +репутация',
            fx: { time: 2, rating: 0.03 },
            cb: function () {
              msg('Договорились на утро — клиент спокоен.', 'good');
              leaveCustomer(c, true);
            }
          }
        ].concat(talkChoice(c, function () { openLate(c); }) || [])
      });
    }

    /* ---------------- забытые посылки ---------------- */
    /* Те самые коробки, за которыми никто не приходит. Они тикают, мяукают,
       храпят и пахнут. Разбираться с ними — отдельная маленькая история,
       которая не мешает основной смене. */
    function susRect() { return art.LAYOUT.hall.boxes; }
    function susBoxList() { return PVZ.boxes ? PVZ.boxes.shelf() : []; }

    function adoptBoxCat() {
      if (PVZ.state.data.cat) {
        PVZ.state.addMoney(120);
        st.stats.revenue += 120;
        msg('Котёнка из коробки пристроили в добрые руки: +120 ₽.', 'good');
        return;
      }
      var name = U.pick(['Коробок', 'Кекс', 'Пломбир', 'Скотч', 'Бублик']);
      PVZ.state.data.cat = { name: name, fur: U.pick(['ginger', 'gray', 'black', 'white']), takenDay: st.day, petDay: 0 };
      PVZ.state.data.catStory = 'taken';
      PVZ.state.save();
      st.catAnim = { anim: 'happy', t: 0 };
      PVZ.audio.level();
      msg('Котёнок из коробки остался на ПВЗ. Его зовут ' + name + '.', 'good');
    }

    function applyBoxResult(out) {
      var fx = (out && out.fx) || {};
      if (fx.money) {
        PVZ.state.addMoney(fx.money);
        if (fx.money > 0) { st.stats.revenue += fx.money; PVZ.audio.coin(); }
        else PVZ.audio.bad();
      }
      if (fx.rating) PVZ.state.addRating(fx.rating * (fx.rating > 0 ? (st.mods.rating || 1) : 1));
      if (fx.heat) PVZ.state.bananaHeat(fx.heat);
      if (fx.proof) PVZ.state.mafiaAdd('proof', fx.proof);
      if (fx.cat) adoptBoxCat();
      if (fx.patience) {
        st.queue.forEach(function (q) { q.patience = U.clamp(q.patience + fx.patience, 0.08, 1); });
        if (st.customer) st.customer.patience = U.clamp(st.customer.patience + fx.patience, 0.08, 1);
      }
      st.stats.boxes = PVZ.boxes ? PVZ.boxes.count() : 0;
    }

    function openBoxFor(box) {
      if (!PVZ.boxes) return;
      var list = susBoxList();
      if (!list.length) { msg('Полка забытых посылок пуста — разобрались со всеми.', 'good'); return; }
      if (!box || list.indexOf(box) < 0) box = list[Math.min(st.boxIdx || 0, list.length - 1)] || list[0];
      var kind = PVZ.boxes.kind(box.kind);
      var boxNum = String(box.id || '').replace(/^sb/, '') || '?';
      var text = 'Коробка №' + boxNum + ' — ' + kind.name + '. ' + PVZ.boxes.description(box);
      var choices = [];
      choices.push({
        label: 'Осмотреть и послушать',
        hint: '2 мин · без риска',
        fx: { time: 2 },
        cb: function () {
          PVZ.boxes.study(box);
          openBoxFor(box);
        }
      });
      choices.push({
        label: 'Вскрыть коробку',
        hint: '4 мин · риск и любопытство',
        cb: function () { resolveBox(box, 'open'); }
      });
      choices.push({
        label: 'Позвонить по накладной',
        hint: '3 мин · вдруг получится',
        cb: function () { resolveBox(box, 'call'); }
      });
      choices.push({
        label: 'Написать заявление в полицию',
        hint: '3 мин · по-честному',
        cb: function () { resolveBox(box, 'report'); }
      });
      if (list.length > 1) {
        choices.push({
          label: 'Следующая посылка',
          hint: 'в стопке ещё ' + (list.length - 1),
          cb: function () {
            st.boxIdx = (list.indexOf(box) + 1) % list.length;
            openBoxFor(list[st.boxIdx]);
          }
        });
      }
      choices.push({ label: 'Оставить как есть', hint: 'пусть стоит' });
      openDialog({
        name: 'Забытые посылки',
        icon: kind.icon,
        role: 'полка в зале · ' + list.length + ' шт.',
        mood: 'получатель не приходит',
        text: text,
        choices: choices
      });
      PVZ.audio.ui();
    }

    function resolveBox(box, action) {
      if (!PVZ.boxes) return;
      var kind = PVZ.boxes.kind(box.kind);
      var out = PVZ.boxes.resolve(box, action);
      if (!out) { msg('С этой коробкой уже разобрались.', 'info'); return; }
      st.clock = Math.max(0, st.clock + (action === 'open' ? 4 : 3) * (st.mods.time || 1));
      applyBoxResult(out);
      PVZ.audio.ok();
      openDialog({
        name: 'Забытые посылки',
        icon: kind.icon,
        role: out.title,
        mood: box.status === 'opened' ? 'вскрыто' : box.status === 'sent' ? 'получатель найден' : 'передано в полицию',
        text: out.text,
        choices: [{
          label: 'Вернуться к работе',
          hint: PVZ.boxes.count() ? 'на полке осталось: ' + PVZ.boxes.count() : 'полка пуста',
          cb: function () {
            if (PVZ.boxes.count()) msg('Забытых посылок на полке: ' + PVZ.boxes.count() + '.', 'info');
          }
        }]
      });
      PVZ.state.save();
    }

    function drawSuspicious(ctx) {
      if (!PVZ.boxes) return;
      var list = susBoxList();
      if (!list.length) return;
      var bx = susRect();
      var n = Math.min(4, list.length);
      var place = [
        { x: bx.x + 2, y: bx.y + 52, w: 100, h: 70 },
        { x: bx.x + 106, y: bx.y + 60, w: 92, h: 62 },
        { x: bx.x + 26, y: bx.y + 2, w: 88, h: 64 },
        { x: bx.x + 98, y: bx.y + 6, w: 76, h: 54 }
      ];
      for (var i = 0; i < n; i++) {
        var p = place[i];
        var ph = (st.susPing && list[i] && st.susPing.id === list[i].id) ? Math.sin(st.t * 22) * 3 : Math.sin(st.t * 1.6 + i) * 1.2;
        ctx.save();
        ctx.translate(0, ph);
        art.drawParcel(ctx, p.x, p.y, p.w, p.h, { seed: i + 3, rot: i % 2 ? 0.03 : -0.02 });
        // красный скотч крест-накрест: такие коробки лучше не трогать
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = i === 0 ? '#d24b3a' : '#c9a227';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p.x + 8, p.y + 8);
        ctx.lineTo(p.x + p.w - 8, p.y + p.h - 8);
        ctx.moveTo(p.x + p.w - 8, p.y + 8);
        ctx.lineTo(p.x + 8, p.y + p.h - 8);
        ctx.stroke();
        ctx.restore();
        // бирка «получатель не найден»
        art.fillRR(ctx, p.x + 6, p.y + p.h - 18, p.w - 12, 14, 3, 'rgba(255,248,235,0.9)');
        art.txt(ctx, 'НЕ ВСКРЫВАТЬ', p.x + p.w / 2, p.y + p.h - 8, 6.5, '#8a2a1e', 800, 'center');
        ctx.restore();
      }
      // значок «?» над стопкой
      var top = place[Math.max(0, n - 1)];
      var wob = Math.sin(st.t * 2.2) * 2;
      art.txt(ctx, '?', top.x + top.w / 2, top.y - 12 + wob, 24, '#ffb27a', 800, 'center');
      // счётчик
      var badge = { x: bx.x + 6, y: bx.y + 4, w: 122, h: 24 };
      art.fillRR(ctx, badge.x, badge.y, badge.w, badge.h, 12, 'rgba(40,26,18,0.82)');
      art.txt(ctx, 'ЗАБЫТЫЕ: ' + list.length, badge.x + badge.w / 2, badge.y + 16, 11, '#ffd8a8', 800, 'center');
      // звуковые волны, когда коробка «подаёт голос»
      if (st.susPing) {
        var t = st.susPing.t || 0;
        for (var w = 0; w < 3; w++) {
          var rr = 18 + ((t * 42 + w * 16) % 52);
          ctx.save();
          ctx.globalAlpha = Math.max(0, 0.5 - (rr - 18) / 104);
          ctx.strokeStyle = '#ffb27a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(top.x + top.w / 2, top.y + top.h / 2, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    /* ---------------- пасхалка: гость из другого мира ---------------- */
    function unlockSecretsApp() {
      if (!PVZ.state.data) return;
      if (!Array.isArray(PVZ.state.data.apps)) PVZ.state.data.apps = [];
      if (PVZ.state.data.apps.indexOf('secrets') < 0) {
        PVZ.state.data.apps.push('secrets');
        PVZ.state.save();
        msg('На ноутбуке появилось приложение «Секреты» — там вся коллекция пасхалок.', 'good');
      }
    }

    function grantEgg(egg, c) {
      var fresh = PVZ.state.addEgg(egg.id);
      var money = (egg.reward && egg.reward.money) || 0;
      if (money) {
        PVZ.state.addMoney(money);
        st.stats.revenue += money;
      }
      if (egg.reward && egg.reward.rating) PVZ.state.addRating(egg.reward.rating);
      if (fresh) {
        unlockSecretsApp();
        PVZ.audio.level();
        msg(egg.findMsg + (money ? ' +' + U.fmtMoney(money) : ''), 'good');
      } else if (money) {
        msg('Гость снова заходил: +' + U.fmtMoney(money) + ' ₽ к смене.', 'good');
      }
      if (c && !egg.noReview) {
        var author = egg.name + (egg.last ? ' ' + egg.last.charAt(0).toUpperCase() + '.' : '');
        sys.addReview(c, 5, {
          author: author,
          text: egg.review || 'Получил заказ. Сотрудник держался достойно. Рекомендую.'
        });
      }
    }

    function openEgg(c) {
      var egg = sys.eggById(c.eggId);
      if (!egg) { leaveCustomer(c, true); return; }
      var choices = (egg.choices || []).map(function (ch) {
        return {
          label: ch.label,
          hint: ch.hint || '',
          cb: function () {
            applyFx(ch.fx, c);
            c.expr = 'happy';
            c.bubble = ch.reply || 'Спасибо.';
            c.bubbleAlpha = 0;
            grantEgg(egg, c);
            leaveCustomer(c, true);
          }
        };
      });
      openDialog({
        name: egg.name + (egg.last ? ' ' + egg.last : ''),
        person: c,
        role: 'пасхалка · ' + egg.from,
        mood: '✨ гость из другого мира',
        text: egg.greet + ' ' + egg.ask,
        choices: choices
      });
    }

    /* Секреты, которые находятся не разговором, а нажатиями на предметы */
    function foundHiddenEgg(id) {
      var egg = sys.eggById(id);
      if (!egg) return false;
      if (PVZ.state.hasEgg(id)) {
        msg('Вы уже находили этот секрет.', 'info');
        return false;
      }
      grantEgg(egg, null);
      return true;
    }

    function bumpInteriorTap(key, need, eggId, text) {
      var d = PVZ.state.data;
      if (!d) return;
      if (!d.eggTaps) d.eggTaps = {};
      d.eggTaps[key] = (d.eggTaps[key] || 0) + 1;
      if (d.eggTaps[key] < need) {
        if (d.eggTaps[key] === Math.max(2, need - 2)) msg(text, 'info');
        return;
      }
      d.eggTaps[key] = 0;
      foundHiddenEgg(eggId);
    }

    function openDialog(opts) {
      st.dlg = new sys.Dialogue(opts);
      // разговор с мафией сразу перебивает радио страшной темой
      if (opts && opts.scary && PVZ.music && PVZ.music.snapMood) PVZ.music.snapMood('scary');
    }

    /* ---------------- живые разговоры у стойки ---------------- */
    /* Любой покупатель может поболтать: две реплики, выбор игрока,
       ответ клиента. Темы и тексты лежат в talks.js. */
    function talkChoice(c, resume) {
      if (!c) return null;
      // сначала — личная история персонажа, общие темы остаются на потом
      var personal = castTalkChoice(c, resume);
      if (personal) return personal;
      if (!PVZ.talks) return null;
      var topic = c.talkTopic || PVZ.talks.pickTopic(PVZ.state.data);
      if (!topic) return null;
      c.talkTopic = topic;
      return {
        label: 'Поболтать: ' + topic.title,
        hint: 'разговор · 2–4 мин',
        cb: function () {
          PVZ.talks.markTopic(PVZ.state.data, topic.id);
          PVZ.state.save();
          PVZ.audio.ui();
          openTalk(c, topic, 0, topic.open, resume);
        }
      };
    }

    /* ---- личная история постоянного персонажа ---- */
    function castTalkChoice(c, resume) {
      if (!c || !c.castId || !PVZ.cast || !PVZ.state.data) return null;
      var ch = PVZ.cast.byId(c.castId);
      if (!ch) return null;
      var beat = c.castBeat || PVZ.cast.nextBeat(ch, PVZ.state.data);
      if (!beat) return null;
      c.castBeat = beat;
      var rel = PVZ.cast.rel(ch.id);
      return {
        label: 'Поговорить: ' + beat.title,
        hint: ch.role + ' · ' + PVZ.cast.relLabel(rel),
        cb: function () {
          PVZ.audio.ui();
          openCastBeat(c, ch, beat, 0, beat.open, resume);
        }
      };
    }

    function castFx(fx) {
      if (!fx) return;
      if (fx.heat) PVZ.state.bananaHeat(fx.heat);
      if (fx.proof) PVZ.state.mafiaAdd('proof', fx.proof);
    }

    function openCastBeat(c, ch, beat, stage, text, resume) {
      var step = beat.steps[stage];
      if (!step) { finishCastBeat(c, ch, beat, text, resume); return; }
      var choices = step.choices.map(function (pick) {
        return {
          label: pick.t,
          hint: pick.hint || '',
          fx: pick.fx,
          cb: function () {
            if (pick.rel) PVZ.cast.addRel(ch.id, pick.rel);
            castFx(pick.fx);
            var next = stage + 1;
            if (next < beat.steps.length) openCastBeat(c, ch, beat, next, pick.reply, resume);
            else finishCastBeat(c, ch, beat, pick.reply, resume);
          }
        };
      });
      openDialog({
        name: ch.name + ' ' + (ch.last || ''),
        person: c,
        role: ch.role,
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: text,
        choices: choices
      });
    }

    function finishCastBeat(c, ch, beat, reply, resume) {
      if (!c.castBeatDone) {
        c.castBeatDone = true;
        c.expr = 'happy';
        PVZ.cast.markBeat(ch.id, beat.id, PVZ.state.data);
        var reward = beat.reward || {};
        if (reward.rating) PVZ.state.addRating(reward.rating * (st.mods.rating || 1));
        if (reward.money) {
          PVZ.state.addMoney(reward.money);
          st.stats.revenue += reward.money;
        }
      }
      var fin = PVZ.cast.finishBeat(c, ch, beat, PVZ.state.data);
      var extra = '';
      if (fin.number) {
        extra = ' Кстати, вот мой номер — записывайте: ' + ch.name + ' теперь есть в «Мессенджере».';
        msg(ch.name + ' оставил(а) свой номер телефона. Контакт появился в «Мессенджере».', 'good');
        PVZ.audio.level();
      }
      if (fin.referral) {
        st.refQueue.push({ charId: fin.referral.char.id, by: fin.referral.by });
        msg(fin.referral.by + ' расскажет о вашем ПВЗ знакомым. Ждите нового человека — по рекомендации.', 'good');
      }
      openDialog({
        name: ch.name + ' ' + (ch.last || ''),
        person: c,
        role: ch.role,
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: reply + (beat.end ? ' ' + beat.end : '') + extra,
        choices: [{
          label: 'Вернуться к работе',
          hint: fin.number ? 'номер сохранён' : 'разговор сблизил',
          cb: function () { if (resume) resume(); }
        }]
      });
      PVZ.state.save();
    }

    function openTalk(c, topic, stage, text, resume) {
      var step = topic.steps[stage];
      if (!step) { openTalkEnd(c, topic, text, resume); return; }
      var choices = step.choices.map(function (ch) {
        return {
          label: ch.t,
          hint: ch.hint || '',
          fx: ch.fx,
          cb: function () {
            var next = stage + 1;
            if (next < topic.steps.length) openTalk(c, topic, next, ch.reply, resume);
            else openTalkEnd(c, topic, ch.reply, resume);
          }
        };
      });
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'покупатель · ' + (topic.cat || 'разговор'),
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: text,
        choices: choices
      });
    }

    function openTalkEnd(c, topic, reply, resume) {
      if (!c.talkDone) {
        c.talkDone = true;
        c.expr = 'happy';
        var reward = topic.reward || {};
        if (reward.rating) PVZ.state.addRating(reward.rating * (st.mods.rating || 1));
        if (reward.money) { PVZ.state.addMoney(reward.money); st.stats.revenue += reward.money; }
        PVZ.state.save();
      }
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'покупатель',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: reply + (topic.end ? ' ' + topic.end : ''),
        choices: [{
          label: 'Вернуться к работе',
          hint: 'разговор сблизил',
          cb: function () { if (resume) resume(); }
        }]
      });
    }

    /* ---------------- сюжетные покупатели ---------------- */
    function npcById(id) { return PVZ.talks ? PVZ.talks.npcById(id) : null; }

    function spawnStoryNpc(npc, beat) {
      if (!npc) return;
      var c = sys.makeCustomer({ female: !!npc.person.female });
      Object.keys(npc.person).forEach(function (k) { if (npc.person[k] != null) c[k] = npc.person[k]; });
      c.name = npc.name;
      c.last = '';
      c.kind = 'npc';
      c.npcId = npc.id;
      c.npcBeat = beat;
      c.mood = 'calm';
      c.moodLabel = npc.role;
      c.moodIcon = '✎';
      c.expr = 'neutral';
      c.phone = 'smart';
      c.phoneLabel = 'смартфон';
      c.pay = 'card';
      c.ask = '…';
      c.orderIds = [];
      c.parcels = 0;
      c.talon = st.talon++;
      c.patience = 1;
      // сюжетный гость ждёт долго, но не бесконечно
      c.patienceRate = 0.0035;
      c.state = 'queue';
      c.waitT = 0;
      c.atT = 0;
      c.bubble = U.pick(['Есть разговор.', 'Здравствуйте. На пару слов?', 'Можно вас на минуту?']);
      c.bubbleAlpha = 0;
      c.revealed = true;
      c.codeScanned = false;
      c.dictated = false;
      c.codeEntered = false;
      c.wantsFitting = false;
      c.fittingDone = false;
      c.paid = false;
      c.codSum = 0;
      c.docs = false;
      c.reviewed = true;
      c.vx = 1240;
      c.vgy = 488;
      c.vh = 296 * c.height;
      c.enterAlpha = 0;
      c.moving = true;
      c.arrived = false;
      c.arrivedT = 0;
      st.queue.push(c);
      st.bellRinging = 1.2;
      PVZ.audio.bell();
      var d = PVZ.state.data;
      if (d) {
        if (!d.npcSpawnDay || typeof d.npcSpawnDay !== 'object') d.npcSpawnDay = {};
        d.npcSpawnDay[npc.id] = st.day;
        PVZ.state.save();
      }
      msg(npc.name + ' зашёл поговорить: «' + (beat ? beat.title : 'по делу') + '». Нажмите на него у стойки.', 'info');
    }

    function openNpcDialog(c) {
      var npc = npcById(c.npcId);
      if (!npc) { leaveNpc(c); return; }
      if (c.npcBeatDone) {
        openDialog({
          name: npc.name, person: c, role: npc.role, mood: '✎ уже поговорили',
          text: 'Спасибо, что выслушали. Я пойду, а вы работайте — у вас смена.',
          choices: [{ label: 'Попрощаться', hint: '', cb: function () { leaveNpc(c); } }]
        });
        return;
      }
      var beat = c.npcBeat || PVZ.talks.nextBeat(npc, PVZ.state.data) || PVZ.talks.genericBeat(npc, st.day);
      if (!beat) { leaveNpc(c); return; }
      c.npcBeat = beat;
      var choices = beat.choices.map(function (ch) {
        return {
          label: ch.t,
          hint: ch.hint || '',
          fx: ch.fx,
          cb: function () {
            if (ch.mafia) {
              if (ch.mafia.trust) PVZ.state.mafiaAdd('trust', ch.mafia.trust);
              if (ch.mafia.dirt) PVZ.state.mafiaAdd('dirt', ch.mafia.dirt);
              if (ch.mafia.proof) PVZ.state.mafiaAdd('proof', ch.mafia.proof);
            }
            if (!beat.idle) PVZ.talks.markBeat(npc.id, beat.id);
            if (ch.unlock) {
              PVZ.talks.unlockContact(npc.id);
              msg((ch.note || (npc.name + ' оставил номер телефона.')) + ' Теперь он есть в «Мессенджере».', 'good');
            } else if (ch.note) {
              msg(ch.note, 'good');
            }
            c.npcBeatDone = true;
            c.expr = 'happy';
            PVZ.audio.ok();
            openDialog({
              name: npc.name, person: c, role: npc.role, mood: '✎ ' + beat.title,
              text: ch.reply,
              choices: [{ label: 'Вернуться к работе', hint: 'разговор закончен', cb: function () { leaveNpc(c); } }]
            });
          }
        };
      });
      openDialog({ name: npc.name, person: c, role: npc.role, mood: '✎ ' + beat.title, text: beat.text, choices: choices });
      PVZ.audio.ui();
    }

    /* Сюжетный гость уходит без оценки и без отзыва: он приходил не за посылкой */
    function leaveNpc(c) {
      if (!c) return;
      c.bubble = U.pick(['Спасибо. Я ещё зайду.', 'Понял. Держитесь.', 'Хорошо. Не пропадайте.']);
      c.bubbleAlpha = 1;
      c.reviewed = true;
      c.state = 'leaving';
      st.leavers.push({ person: c, vx: c.vx, vgy: c.vgy, vh: c.vh, t: 0 });
      if (st.customer === c) { st.customer = null; st.nextT = 1.4; }
      else {
        var i = st.queue.indexOf(c);
        if (i >= 0) st.queue.splice(i, 1);
      }
      st.held = null;
    }

    /* ---------------- телефон покупателя + сканер ---------------- */
    var PHONE_BODY = { x: 462, y: 58, w: 356, h: 604 };
    var PHONE_SCAN_BTN = { x: 504, y: 412, w: 272, h: 58 };
    var PHONE_DICT_BTN = { x: 504, y: 478, w: 272, h: 44 };
    var PHONE_CLOSE_BTN = { x: 504, y: 530, w: 272, h: 38 };

    function openPhone(c) {
      if (!c || st.qte || st.dlg) return;
      var order = firstOrderFor(c);
      if (!order) { msg('Не удалось найти заказ этого покупателя.', 'bad'); return; }
      if (c.phone === 'none' || c.phone === 'watch') {
        // код негде показать — только со слов
        openDialog({
          name: c.name + ' ' + c.last,
          person: c,
          role: 'покупатель',
          mood: c.moodIcon + ' ' + c.moodLabel,
          text: c.phone === 'watch'
            ? 'Код у меня на часах, но экран мелкий. Продиктую: ' + c.code + '.'
            : 'Телефон я дома забыл. Код помню, продиктую: ' + c.code + '.',
          choices: [
            {
              label: 'Записать код со слов',
              hint: '2 мин · ввести в терминале',
              fx: { time: 2 },
              cb: function () {
                c.dictated = true;
                PVZ.state.addMinutes(2);
                msg('Клиент продиктовал код ' + c.code + '. Введите его в терминале, чтобы узнать ячейку.', 'good');
                openTerminal('search');
              }
            },
            {
              label: 'Попросить найти код в приложении',
              hint: '4 мин · −терпение',
              fx: { time: 4, patience: -0.1 },
              cb: function () {
                c.patience = Math.max(0.1, c.patience - 0.1);
                msg('Клиент ищет код в приложении…', 'info');
                openPhone(c);
              }
            },
            {
              label: 'Отказать без кода',
              hint: '+1 мин · −репутация',
              fx: { time: 1, rating: -0.06 },
              cb: function () { leaveCustomer(c, false, 'Клиент не смог получить заказ.'); }
            }
          ]
        });
        return;
      }
      st.phone = { customer: c, order: order, tries: 0 };
      PVZ.audio.ui();
    }

    function phoneTap(x, y) {
      var P = st.phone;
      if (!P) return;
      if (U.hit(PHONE_CLOSE_BTN, x, y)) { st.phone = null; PVZ.audio.click(); return; }
      if (U.hit(PHONE_SCAN_BTN, x, y)) { startCodeScan(P); return; }
      if (U.hit(PHONE_DICT_BTN, x, y)) { askDictate(P); return; }
    }

    function startCodeScan(P) {
      var c = P.customer;
      if (c.codeScanned) return;
      if (c.phone === 'cracked') {
        PVZ.audio.bad();
        msg('Экран телефона разбит — штрихкод не читается. Попросите продиктовать код.', 'bad');
        return;
      }
      if (!st.scannerHeld) {
        PVZ.audio.bad();
        msg('Сначала возьмите сканер со стола — он лежит слева.', 'bad');
        return;
      }
      startQTE({
        type: 'scan',
        code: P.order.code,
        title: 'Сканирование кода покупателя',
        sub: c.phone === 'paper' ? 'Наведите сканер на бумажку с кодом' : 'Наведите сканер на штрихкод в телефоне',
        hard: c.phone === 'old' || c.phone === 'paper',
        onDone: function (ok) {
          if (c.state === 'leaving') return;
          if (ok) {
            c.codeScanned = true;
            c.expr = 'happy';
            PVZ.audio.scanOk();
            PVZ.state.addMinutes(1);
            st.phone = null;
            msg('Код считан: ' + P.order.code + '. Ячейка ' + P.order.cell + '.', 'good');
            openTerminal('found', P.order);
          } else {
            P.tries++;
            c.patience = Math.max(0.1, c.patience - 0.06);
            PVZ.audio.scanFail();
            msg('Сканер не распознал штрихкод. Попробуйте ещё раз или продиктуйте код.', 'bad');
          }
        }
      });
    }

    function askDictate(P) {
      var c = P.customer;
      st.phone = null;
      c.dictated = true;
      c.patience = Math.max(0.1, c.patience - 0.05);
      openDialog({
        name: c.name + ' ' + c.last,
        person: c,
        role: 'покупатель',
        mood: c.moodIcon + ' ' + c.moodLabel,
        text: 'Конечно, диктую: код ' + c.code + '. Записывайте.',
        choices: [
          {
            label: 'Записать код и открыть терминал',
            hint: '2 мин · ввести вручную',
            fx: { time: 2 },
            cb: function () {
              msg('Код ' + c.code + ' записан на слух. Введите его в терминале — он покажет ячейку.', 'good');
              openTerminal('search');
            }
          },
          {
            label: 'Всё равно отсканировать телефон',
            hint: '1 мин',
            fx: { time: 1 },
            cb: function () { c.dictated = false; openPhone(c); }
          }
        ]
      });
    }

    function drawPhone(ctx) {
      var P = st.phone;
      if (!P) return;
      var c = P.customer;
      ctx.save();
      ctx.fillStyle = 'rgba(8,5,4,0.68)';
      ctx.fillRect(0, 0, 1280, 720);

      var sc;
      if (c.phone === 'paper') {
        // бумажка с кодом
        var px0 = 470, py0 = 120, pw0 = 340, ph0 = 470;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 10;
        art.fillRR(ctx, px0, py0, pw0, ph0, 6, '#fffdf3');
        ctx.restore();
        ctx.save();
        ctx.translate(px0 + pw0 / 2, py0 + ph0 / 2);
        ctx.rotate(-0.015);
        art.barcode(ctx, -pw0 / 2 + 20, -140, pw0 - 40, 120, P.order.code);
        art.txt(ctx, 'ФОТО ШТРИХКОДА', 0, 10, 11, 'rgba(60,60,60,0.55)', 700, 'center');
        art.txt(ctx, P.order.code, 0, 70, 36, '#1d3b33', 800, 'center');
        art.txt(ctx, P.order.item + ' · ' + U.fmtMoney(P.order.price), 0, 100, 13, 'rgba(30,60,52,0.8)', 700, 'center');
        art.txt(ctx, 'Заказ №' + P.order.code + ' · ' + PVZ.state.title(), 0, -160, 12, 'rgba(30,60,52,0.6)', 600, 'center');
        ctx.restore();
        sc = { y: py0 + 40 };
      } else {
        sc = art.phoneBody(ctx, PHONE_BODY.x, PHONE_BODY.y, PHONE_BODY.w, PHONE_BODY.h, { body: '#1b191f' });
        art.txt(ctx, 'ПВЗ · КОД ПОЛУЧЕНИЯ', 640, sc.y + 34, 12, 'rgba(40,80,70,0.72)', 800, 'center');

        var px = sc.x + 26, py = sc.y + 54, pw = sc.w - 52, ph = 170;
        ctx.save();
        ctx.translate(px + pw / 2, py + ph / 2);
        ctx.rotate(-0.015);
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        art.rr(ctx, -pw / 2, -ph / 2, pw, ph, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        art.barcode(ctx, -pw / 2 + 10, -ph / 2 + 14, pw - 20, 104, P.order.code);
        art.txt(ctx, 'ФОТО ШТРИХКОДА', 0, ph / 2 - 20, 11, 'rgba(60,60,60,0.55)', 700, 'center');
        ctx.restore();

        var shown = c.codeScanned || c.dictated;
        art.txt(ctx, shown ? P.order.code : '• • • •', 640, sc.y + 266, 40, '#1d3b33', 800, 'center');
        art.txt(ctx, P.order.item + ' · ' + U.fmtMoney(P.order.price), 640, sc.y + 296, 14, 'rgba(30,60,52,0.8)', 700, 'center');
        art.txt(ctx, 'Срок хранения: ' + sys.storageLeft(P.order, st.day) + ' дн.', 640, sc.y + 318, 12, 'rgba(30,60,52,0.55)', 600, 'center');

        // трещины на экране
        if (c.phone === 'cracked') {
          ctx.save();
          ctx.strokeStyle = 'rgba(40,50,55,0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sc.x + 40, sc.y + 30);
          ctx.lineTo(sc.x + 120, sc.y + 140);
          ctx.lineTo(sc.x + 90, sc.y + 260);
          ctx.moveTo(sc.x + 120, sc.y + 140);
          ctx.lineTo(sc.x + 250, sc.y + 90);
          ctx.moveTo(sc.x + 120, sc.y + 140);
          ctx.lineTo(sc.x + 210, sc.y + 300);
          ctx.stroke();
          ctx.restore();
        }
      }

      // кнопки
      var scanHov = U.hit(PHONE_SCAN_BTN, PVZ.input.x, PVZ.input.y);
      var canScan = c.phone !== 'cracked';
      art.button(ctx, PHONE_SCAN_BTN, canScan ? 'Сканировать код' : 'Экран разбит', {
        hover: scanHov, size: 17,
        bg: st.scannerHeld && canScan ? 'rgba(90,168,119,0.95)' : 'rgba(70,62,54,0.9)',
        hoverBg: st.scannerHeld && canScan ? '#7fe0a0' : '#f2994a',
        hoverFg: st.scannerHeld && canScan ? '#12321f' : '#2a1a10',
        fg: st.scannerHeld && canScan ? '#12321f' : 'rgba(255,240,225,0.55)'
      });
      art.button(ctx, PHONE_DICT_BTN, 'Попросить продиктовать код', {
        hover: U.hit(PHONE_DICT_BTN, PVZ.input.x, PVZ.input.y), size: 14, bg: 'rgba(70,58,48,0.9)'
      });
      art.button(ctx, PHONE_CLOSE_BTN, 'Закрыть', {
        hover: U.hit(PHONE_CLOSE_BTN, PVZ.input.x, PVZ.input.y), size: 14, bg: 'rgba(48,38,32,0.9)'
      });

      if (!st.scannerHeld) {
        art.txt(ctx, 'Сканер лежит на столе слева — сначала возьмите его', 640, 640, 13, '#e08a4a', 700, 'center');
      } else {
        art.txt(ctx, 'Сканер в руке · наведите на штрихкод', 640, 640, 12, 'rgba(255,240,220,0.6)', 600, 'center');
      }
      ctx.restore();
    }

    /* ---------------- приёмка поставки: коробки перетаскиваем руками ---------------- */
    function receiveBox(order) {
      if (!order || order.state !== 'new') return;
      if (!sys.freeCells(st.orders, order.size).length) {
        msg('Нет свободных ячеек — сначала выдайте заказы.', 'bad');
        return;
      }
      // подсказываем стеллаж, но ячейку выбирает игрок
      var cell = sys.assignCell(st.orders, order.size);
      if (cell) st.rack = sys.parseCell(cell).rack;
      st.placing = order;
      st.targetCell = null;
      st.view = 'rack';
      st.viewFade = 0.24;
      PVZ.audio.beep();
      msg('Коробка ' + order.code + ' на руках. Перетащите её на полку стеллажа ' + st.rack + '.', 'good');
    }

    /* Куда можно положить коробку */
    function canDrop(order, cellId) {
      if (!order || !cellId) return false;
      if (!sys.cellAllowsSize(cellId, order.size)) return false;
      var busy = st.orders.some(function (o) {
        return o.cell === cellId && o !== order && sys.CELL_STATES[o.state];
      });
      return !busy;
    }

    /* Положили коробку в ячейку (приёмка или перестановка) */
    function dropBox(order, cellId, mode) {
      if (!canDrop(order, cellId)) {
        PVZ.audio.bad();
        msg(order.size === 'L' ? 'Крупный товар — только на нижнюю полку.' : 'Ячейка занята — выберите свободную.', 'bad');
        return false;
      }
      var wasNew = order.state === 'new';
      order.cell = cellId;
      order.state = 'stored';
      st.placing = null;
      st.targetCell = null;
      PVZ.audio.ok();
      if (wasNew) {
        st.stats.received++;
        st.stats.revenue += TARIFF.receive;
        PVZ.state.addMoney(TARIFF.receive);
        PVZ.state.addMinutes(2);
        msg('Заказ ' + order.code + ' на месте (' + cellId + '). +' + TARIFF.receive + ' ₽', 'good');
        var ob = objective('receive');
        if (ob) ob.progress = st.stats.received + '/' + supplyFor(st.day);
        if (st.stats.received >= supplyFor(st.day)) setObjective('receive', true);
        checkMorningDone();
      } else {
        PVZ.state.addMinutes(1);
        msg('Посылка ' + order.code + ' переставлена в ' + cellId + '.', 'info');
      }
      return true;
    }

    /* Ячейки и лоток приёмки в виде стеллажа */
    function supplyTrayRects() {
      var list = supplyOrders().slice(0, 9);
      var w = 70, h = 58, gap = 8;
      var total = list.length * (w + gap) - gap;
      var x0 = 640 - total / 2;
      var out = [];
      list.forEach(function (o, i) {
        out.push({ order: o, x: x0 + i * (w + gap), y: 552, w: w, h: 58 });      });
      return out;
    }

    /* ---------------- выдача со склада ---------------- */
    function takeFromCell(order) {
      if (!order || order.state !== 'stored') return;
      if (st.held) {
        msg('В руках уже ' + st.held.code + '. Сначала положите её на стол и выдайте.', 'bad');
        return;
      }
      st.held = {
        id: order.id, code: order.code, item: order.item, kind: order.kind, size: order.size,
        scanned: false, onTable: false, unpacked: false, placeT: 0
      };
      PVZ.audio.ok();
      PVZ.state.addMinutes(1);
      st.targetCell = null;
      st.view = 'counter';
      var c = st.customer;
      var mods = PVZ.state.mods();
      if (c && c.kind === 'pickup' && !isMine(c, order)) {
        msg('Взяли ' + order.code + ', а клиент ждёт ' + c.code + '.', 'bad');
      } else if (mods.autoCarry) {
        // «Лента к стойке»: посылка приезжает на стол сама
        st.held.onTable = true;
        if (mods.autoScan) {
          st.held.scanned = true;
          msg('Лента доставила ' + order.code + ' к стойке, браслет уже считал штрихкод. Можно выдавать.', 'good');
        } else {
          msg('Лента доставила ' + order.code + ' к стойке. Отсканируйте коробку на столе.', 'good');
        }
      } else {
        msg('Посылка ' + order.code + ' в руках. Положите её на стол — там её и сканируют.', 'good');
      }
    }

    /* Посылка из ячейки сначала ложится на стол: вскрывать на весу нельзя */
    function placeHeldOnDesk() {
      var h = st.held;
      if (!h) { msg('В руках нет посылки. Возьмите её на складе.', 'bad'); return; }
      if (h.onTable) { return; }
      h.onTable = true;
      h.placeT = 0;
      PVZ.audio.click();
      PVZ.state.addMinutes(1);
      if (PVZ.state.mods().autoScan) {
        h.scanned = true;
        msg('Посылка ' + h.code + ' на столе. Браслет уже считал штрихкод — вскройте коробку ножом.', 'good');
      } else {
        msg('Посылка ' + h.code + ' на столе. Возьмите сканер слева и отсканируйте штрихкод.', 'good');
      }
    }

    /* QTE сканирования посылки: тот же мини-игровой сканер, что и для телефона */
    function startParcelScan() {
      var h = st.held;
      if (!h) { msg('На столе нет посылки.', 'bad'); return; }
      if (!h.onTable) { msg('Сначала положите посылку на стол — на свободное место слева.', 'bad'); return; }
      if (h.scanned) {
        if (!h.unpacked) startUnpack();
        else msg('Товар уже достали — отдавайте его покупателю.', 'info');
        return;
      }
      if (!st.scannerHeld) {
        PVZ.audio.bad();
        msg('Сканер лежит слева на столе — сначала возьмите его.', 'bad');
        return;
      }
      startQTE({
        type: 'scan',
        code: h.code,
        title: 'Сканирование посылки',
        sub: 'Наведите сканер на штрихкод на коробке: ' + h.code,
        onDone: function (ok) {
          if (!st.held || st.held.code !== h.code) return;
          if (ok) {
            st.held.scanned = true;
            PVZ.audio.scanOk();
            PVZ.state.addMinutes(1);
            msg('Штрихкод посылки считан: ' + h.code + '. Теперь нажмите на коробку и вскройте её.', 'good');
          } else {
            PVZ.audio.scanFail();
            PVZ.state.addMinutes(1);
            h.scanMiss = (h.scanMiss || 0) + 1;
            msg('Штрихкод не читается. Попробуйте ещё раз — или переверните коробку.', 'bad');
          }
        }
      });
    }

    /* ---------------- вскрытие посылки: нож → пакет → товар ---------------- */
    /* Сцена-крупный план: игрок наклоняется к коробке, ведёт ножом по скотчу,
       ножницами разрезает пакет и достаёт настоящий товар из заказа. */
    var UNPACK_RECT = {
      knife: { x: 882, y: 404, w: 236, h: 132 },
      scissors: { x: 152, y: 404, w: 236, h: 132 },
      tape: { x: 390, y: 262, w: 500, h: 108 },
      bag: { x: 498, y: 196, w: 284, h: 176 },
      product: { x: 497, y: 165, w: 286, h: 286 },
      close: { x: 24, y: 24, w: 44, h: 44 }
    };

    function startUnpack() {
      var h = st.held;
      if (!h) { msg('В руках нет посылки. Возьмите её на складе.', 'bad'); return; }
      if (!h.onTable) { msg('Сначала положите посылку на стол.', 'bad'); return; }
      if (!h.scanned) { msg('Сначала отсканируйте штрихкод — сканер лежит слева на столе.', 'bad'); return; }
      if (h.unpacked) { msg('Товар уже достали — отдавайте его покупателю.', 'info'); return; }
      if (st.unpack) return;
      if (st.dlg || st.qte || st.terminal || st.laptop || st.phone) return;
      st.unpack = {
        t: 0,
        phase: 'lean',
        lean: 0,
        tool: null,
        progress: 0,
        open: 0,
        openT: 0,
        snips: 0,
        bagShow: 0,
        product: 0,
        pull: 0,
        snipCd: 0,
        cutting: false,
        hx: 640,
        hy: 318,
        lastX: 640,
        lastY: 318,
        code: h.code,
        item: h.item,
        kind: h.kind
      };
      // если сцену уже открывали и закрыли — продолжаем с того же места
      var prev = h.unpackState;
      if (prev) {
        st.unpack.progress = prev.progress || 0;
        st.unpack.open = prev.open || 0;
        st.unpack.openT = st.unpack.open;
        st.unpack.bagShow = st.unpack.open > 0.55 ? 1 : 0;
        st.unpack.snips = prev.snips || 0;
        if (st.unpack.open >= 1) {
          if (st.unpack.snips >= 3) { st.unpack.phase = 'product'; st.unpack.product = 1; }
          else st.unpack.phase = 'scissorsIdle';
        } else {
          st.unpack.phase = 'knifeIdle';
        }
      }
      PVZ.audio.ui();
      msg('Коробка ' + h.code + ' на столе. Нож — справа, ножницы — слева.', 'info');
    }

    function closeUnpack() {
      if (!st.unpack) return;
      var u = st.unpack;
      var h = st.held;
      if (h && h.code === u.code) {
        h.unpackState = { progress: u.progress, open: u.open, snips: u.snips };
      }
      st.unpack = null;
      PVZ.audio.click();
      msg('Коробка осталась на столе. Вскрыть её можно в любой момент.', 'info');
    }

    function pickUnpackTool(tool) {
      var u = st.unpack;
      if (!u) return;
      u.tool = tool;
      u.phase = tool === 'knife' ? 'cut' : 'bagCut';
      u.snipCd = 0;
      PVZ.audio.tap();
      if (tool === 'knife') msg('Нож в руке. Проведите им по скотчу на крышке коробки.', 'info');
      else msg('Ножницы в руке. Разрежьте пакет — три надреза.', 'info');
    }

    function unpackSnip() {
      var u = st.unpack;
      if (!u || u.phase !== 'bagCut' || u.snipCd > 0) return;
      u.snips = Math.min(3, u.snips + 1);
      u.snipCd = 0.24;
      PVZ.audio.snip();
      if (u.snips >= 3) {
        u.phase = 'product';
        u.product = 0.001;
        PVZ.audio.ok();
        msg('Пакет разрезан. Достаньте «' + u.item + '».', 'good');
      }
    }

    function unpackPullProduct() {
      var u = st.unpack;
      if (!u || u.phase !== 'product') return;
      u.phase = 'pull';
      u.pull = 0;
      PVZ.audio.tap();
    }

    function unpackFinish() {
      var u = st.unpack;
      if (!u) return;
      var h = st.held;
      if (h && h.code === u.code) {
        h.unpacked = true;
        h.boxOpen = true;
        h.unpackState = null;
      }
      st.unpack = null;
      PVZ.state.addMinutes(2);
      PVZ.audio.level();
      msg('«' + u.item + '» у вас в руках. Отдайте товар покупателю.', 'good');
    }

    function unpackTap(x, y) {
      var u = st.unpack;
      if (!u) return;
      if (U.hit(UNPACK_RECT.close, x, y)) { closeUnpack(); return; }
      if (u.phase === 'lean') { u.lean = Math.max(u.lean, 0.55); return; }
      if (u.phase === 'knifeIdle' && U.hit(UNPACK_RECT.knife, x, y)) { pickUnpackTool('knife'); return; }
      if (u.phase === 'scissorsIdle' && U.hit(UNPACK_RECT.scissors, x, y)) { pickUnpackTool('scissors'); return; }
      if (u.phase === 'cut') {
        msg('Зажмите и проведите ножом по скотчу слева направо.', 'info');
        return;
      }
      if (u.phase === 'bagCut') {
        if (U.hit(UNPACK_RECT.bag, x, y)) unpackSnip();
        else msg('Режьте пакет внутри коробки — по центру.', 'info');
        return;
      }
      if (u.phase === 'product' && U.hit(UNPACK_RECT.product, x, y)) { unpackPullProduct(); return; }
    }

    function unpackDown(x, y) {
      var u = st.unpack;
      if (!u) return;
      if (u.phase === 'cut' && U.hit(UNPACK_RECT.tape, x, y)) {
        u.cutting = true;
        u.lastX = x;
        u.lastY = y;
      }
    }

    function unpackMove(x, y) {
      var u = st.unpack;
      if (!u || !u.cutting || u.phase !== 'cut') return;
      if (U.hit(UNPACK_RECT.tape, x, y)) {
        u.progress = Math.min(1, u.progress + (Math.abs(x - u.lastX) + Math.abs(y - u.lastY) * 0.4) / 700);
      }
      u.lastX = x;
      u.lastY = y;
    }

    function unpackUp() {
      var u = st.unpack;
      if (!u) return;
      u.cutting = false;
    }

    function unpackUpdate(dt) {
      var u = st.unpack;
      if (!u) return;
      u.t += dt;
      if (u.snipCd > 0) u.snipCd -= dt;
      var leanTarget = u.phase === 'lean' ? 0.55 : 1;
      u.lean = U.approach(u.lean, leanTarget, 3.4, dt);

      if (u.phase === 'lean' && u.t > 0.9) {
        u.phase = 'knifeIdle';
        PVZ.audio.ui();
      }

      if (u.phase === 'cut') {
        var holdCut = u.cutting && PVZ.input.down;
        var keyCut = PVZ.input.keys[' '] || PVZ.input.keys['Enter'];
        if (holdCut) u.progress = Math.min(1, u.progress + dt * 0.65);
        if (keyCut) u.progress = Math.min(1, u.progress + dt * 0.95);
        u.hx = U.approach(u.hx, 430 + 420 * u.progress, 9, dt);
        u.hy = U.approach(u.hy, 318, 9, dt);
        if (u.progress >= 1) {
          u.phase = 'opening';
          u.openT = 0;
          u.cutting = false;
          u.tool = null;
          PVZ.audio.cut();
          PVZ.state.addMinutes(1);
          msg('Скотч прорезан — раскрываем коробку.', 'good');
        }
      } else if (u.phase === 'opening') {
        u.openT += dt;
        u.open = Math.min(1, u.openT / 0.75);
        if (u.open >= 1) {
          u.phase = 'scissorsIdle';
          PVZ.audio.ui();
        }
      } else if (u.phase === 'bagCut') {
        u.hx = U.approach(u.hx, U.clamp(PVZ.input.x, 520, 800), 8, dt);
        u.hy = U.approach(u.hy, U.clamp(PVZ.input.y, 220, 330), 8, dt);
      } else if (u.phase === 'product') {
        u.product = Math.min(1, u.product + dt * 2.1);
      } else if (u.phase === 'pull') {
        u.pull = Math.min(1, u.pull + dt / 0.7);
        if (u.pull >= 1) unpackFinish();
      }
      if (u.open > 0.55) u.bagShow = Math.min(1, u.bagShow + dt * 2.4);
    }


    /* Клик по сканеру: сначала берём его в руку, потом сканируем им то, что на столе */
    function scanHeld() {
      if (!st.scannerHeld) {
        st.scannerHeld = true;
        PVZ.audio.click();
        msg('Сканер в руке. Наведите его на код покупателя или на посылку на столе.', 'good');
        return;
      }
      if (st.held && st.held.onTable) { startParcelScan(); return; }
      if (st.held) { msg('Посылка ещё в руках — положите её на стол, там и сканируют.', 'bad'); return; }
      msg('Сканер в руке. В руках нет посылки — сканируйте код с телефона покупателя.', 'bad');
    }

    /* ---------------- терминал ---------------- */
    function openTerminal(mode, preloadOrder) {
      if (!PVZ.state.hasApp('terminal')) {
        if (st.dlg || st.phone) return;
        msg('Терминал не установлен. Откройте ноутбук (L) → App Market.', 'bad');
        PVZ.audio.bad();
        openAppStore();
        return;
      }
      if (st.dlg || st.phone) return;
      if (st.qte) st.qte = null; // терминал открывается сразу после QTE
      var auto = 'search';
      if (st.phase === 'morning' && !st.shiftOpen) auto = 'shift';
      else if (st.phase === 'evening' && st.shiftOpen && eveningReady()) auto = 'shift';
      var T = {
        mode: mode || auto,
        input: '',
        order: preloadOrder || null,
        flash: 0,
        message: '',
        msgKind: 'info'
      };
      if (T.mode === 'found' && !T.order) T.mode = 'search';

      var PANEL = { x: 168, y: 96, w: 944, h: 528 };
      var CLOSE = { x: 1060, y: 112, w: 32, h: 32 };
      var KEYS = [];
      var labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
      for (var i = 0; i < 12; i++) {
        KEYS.push({
          label: labels[i],
          rect: { x: 700 + (i % 3) * 96, y: 196 + Math.floor(i / 3) * 68, w: 86, h: 58 }
        });
      }

      function lookup() {
        var code = T.input;
        if (code.length < 4) { T.message = 'Код получения — 4 цифры.'; T.msgKind = 'bad'; PVZ.audio.bad(); return; }
        var o = st.orders.find(function (x) { return x.code === code && x.state === 'stored'; });
        if (!o) {
          T.message = 'Заказ ' + code + ' не найден на складе.';
          T.msgKind = 'bad';
          PVZ.audio.bad();
          T.flash = 1;
          return;
        }
        T.order = o;
        T.mode = 'found';
        T.message = '';
        if (st.customer && isMine(st.customer, o)) st.customer.codeEntered = true;
        PVZ.audio.ok();
      }

      T.key = function (k) {
        if (k === 'Escape') { api.closeTerminal(); return; }
        if (T.mode === 'found' || T.mode === 'shift') {
          if (k === 'Enter') T.mode = 'search';
          return;
        }
        if (/^[0-9]$/.test(k)) {
          if (T.input.length < 4) { T.input += k; PVZ.audio.key(); }
          if (T.input.length === 4) lookup();
        } else if (k === 'Backspace') {
          T.input = T.input.slice(0, -1); PVZ.audio.key();
        } else if (k === 'Enter') {
          lookup();
        }
      };

      T.tap = function (x, y) {
        if (U.hit(CLOSE, x, y)) { api.closeTerminal(); return; }
        if (U.hit({ x: 660, y: 560, w: 400, h: 44 }, x, y)) { api.closeTerminal(); return; }

        if (T.mode === 'search') {
          for (var i = 0; i < KEYS.length; i++) {
            if (U.hit(KEYS[i].rect, x, y)) {
              var lab = KEYS[i].label;
              if (lab === 'C') { T.input = ''; PVZ.audio.key(); }
              else if (lab === '⌫') { T.input = T.input.slice(0, -1); PVZ.audio.key(); }
              else { if (T.input.length < 4) { T.input += lab; PVZ.audio.key(); } if (T.input.length === 4) lookup(); }
              return;
            }
          }
          if (U.hit({ x: 200, y: 440, w: 260, h: 52 }, x, y)) { lookup(); return; }
          if (U.hit({ x: 200, y: 505, w: 260, h: 44 }, x, y)) { T.input = ''; PVZ.audio.click(); return; }
        } else if (T.mode === 'found') {
          if (U.hit({ x: 200, y: 500, w: 280, h: 56 }, x, y)) {
            var o = T.order;
            if (o) {
              st.targetCell = o.cell;
              st.targetOrder = o;
              var p = sys.parseCell(o.cell);
              if (p) st.rack = p.rack;
              api.closeTerminal();
              msg('Ячейка ' + o.cell + '. Пройдите на склад — дверь слева.', 'good');
            }
            return;
          }
          if (U.hit({ x: 500, y: 500, w: 160, h: 56 }, x, y)) { T.mode = 'search'; T.order = null; return; }
        } else if (T.mode === 'shift') {
          if (U.hit({ x: 200, y: 500, w: 340, h: 56 }, x, y)) { api.shiftAction(); return; }
        }
      };

      T.update = function (dt) {
        if (T.flash > 0) T.flash = Math.max(0, T.flash - dt * 2.5);
        if (T.mode === 'search' && !st.shiftOpen && st.phase === 'morning') T.mode = 'shift';
        if (T.mode === 'search' && st.phase === 'evening' && st.shiftOpen && eveningReady()) T.mode = 'shift';
      };

      T.draw = function (ctx) {
        var p = PANEL;
        ctx.save();
        ctx.fillStyle = 'rgba(8,5,4,0.62)';
        ctx.fillRect(0, 0, 1280, 720);
        art.panel(ctx, p.x, p.y, p.w, p.h, { bg: 'rgba(22,26,28,0.98)', r: 18, border: 'rgba(140,210,190,0.3)' });

        art.fillRR(ctx, p.x, p.y, p.w, 54, 18, 'rgba(30,58,56,0.95)');
        var termFit = art.fitTxt(ctx, PVZ.state.title() + ' · ТЕРМИНАЛ СОТРУДНИКА', 460, 15, 800, 9);
        art.txt(ctx, termFit.text, 200, 130, termFit.size, '#9fd6c6', 800);
        var modeName = { search: 'ПОИСК ЗАКАЗА', found: 'КАРТОЧКА ЗАКАЗА', shift: 'СМЕНА' }[T.mode] || '';
        art.txt(ctx, modeName, 700, 130, 13, 'rgba(159,214,198,0.7)', 700);
        art.txt(ctx, U.fmtTime(st.clock) + '  ·  ' + PHASE_LABEL[st.phase], 1030, 130, 14, 'rgba(200,235,225,0.8)', 700, 'right');

        var hovX = U.hit(CLOSE, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, CLOSE.x, CLOSE.y, CLOSE.w, CLOSE.h, 8, hovX ? '#e4572e' : 'rgba(255,255,255,0.1)');
        art.txt(ctx, '✕', CLOSE.x + CLOSE.w / 2, CLOSE.y + 23, 18, '#fff', 700, 'center');

        if (T.mode === 'search') {
          art.txt(ctx, 'КОД ПОЛУЧЕНИЯ ИЗ ПРИЛОЖЕНИЯ', 200, 196, 13, 'rgba(159,214,198,0.75)', 700);
          for (var d = 0; d < 4; d++) {
            var bx = 200 + d * 92, by = 210, bw = 78, bh = 92;
            var filled = T.input.length > d;
            art.fillRR(ctx, bx, by, bw, bh, 10, filled ? 'rgba(60,120,108,0.95)' : 'rgba(255,255,255,0.06)');
            art.strokeRR(ctx, bx, by, bw, bh, 10, filled ? 'rgba(150,240,215,0.8)' : 'rgba(255,255,255,0.12)', 1.5);
            if (filled) art.txt(ctx, T.input[d], bx + bw / 2, by + 66, 46, '#eafff8', 800, 'center');
            else if (T.input.length === d) art.fillRR(ctx, bx + bw / 2 - 2, by + 30, 4, 36, 2, 'rgba(150,240,215,0.9)');
          }
          var findHov = U.hit({ x: 200, y: 440, w: 260, h: 52 }, PVZ.input.x, PVZ.input.y);
          art.button(ctx, { x: 200, y: 440, w: 260, h: 52 }, 'Найти заказ', { hover: findHov, size: 18, bg: 'rgba(50,110,98,0.95)', hoverBg: '#f2994a', hoverFg: '#2a1a10' });
          art.button(ctx, { x: 200, y: 505, w: 260, h: 44 }, 'Очистить', { hover: U.hit({ x: 200, y: 505, w: 260, h: 44 }, PVZ.input.x, PVZ.input.y), size: 15 });

          if (T.message) {
            var col = T.msgKind === 'bad' ? '#ff9d7a' : '#9fe0c0';
            art.txt(ctx, T.message, 200, 390, 15, col, 700);
          } else {
            art.txt(ctx, 'Попросите покупателя назвать код из приложения.', 200, 380, 14, 'rgba(210,235,228,0.55)', 600);
          }
          // покупатель забыл телефон: код продиктован, но вбить его нужно самому
          if (st.customer && st.customer.dictated && !st.customer.codeScanned) {
            art.fillRR(ctx, 200, 402, 300, 32, 8, 'rgba(242,153,74,0.14)');
            art.txt(ctx, 'На слух: ' + st.customer.code, 214, 423, 14, '#ffd8a8', 800);
          }
          art.txt(ctx, 'Есть ' + storedOrders().length + ' ' + U.plural(storedOrders().length, 'заказ', 'заказа', 'заказов') +
            ' на складе · свободно ячеек: ' + sys.freeCells(st.orders, 'M').length, 200, 560, 13, 'rgba(190,225,215,0.6)', 600);

          KEYS.forEach(function (k) {
            var hov = U.hit(k.rect, PVZ.input.x, PVZ.input.y);
            var bg = k.label === 'C' ? 'rgba(120,60,50,0.8)' : 'rgba(255,255,255,0.08)';
            art.fillRR(ctx, k.rect.x, k.rect.y, k.rect.w, k.rect.h, 10, hov ? 'rgba(242,153,74,0.9)' : bg);
            art.txt(ctx, k.label, k.rect.x + k.rect.w / 2, k.rect.y + 38, 24, hov ? '#2a1a10' : '#dff5ee', 700, 'center');
          });
        } else if (T.mode === 'found') {
          var o = T.order;
          if (!o) { T.mode = 'search'; return; }
          art.txt(ctx, 'ЗАКАЗ НАЙДЕН', 200, 196, 13, 'rgba(159,214,198,0.75)', 700);
          art.txt(ctx, o.code, 200, 280, 64, '#eafff8', 800);
          art.txt(ctx, o.item.toUpperCase() + ' · ' + U.fmtMoney(o.price), 200, 320, 18, '#cfe9e2', 700);
          art.txt(ctx, 'Размер: ' + sys.sizeRu(o.size) + (o.cod ? ' · наложенный платёж ' + U.fmtMoney(o.codSum) : ''), 200, 346, 14, 'rgba(200,235,225,0.7)', 600);
          art.fillRR(ctx, 200, 366, 300, 96, 12, 'rgba(60,120,108,0.35)');
          art.strokeRR(ctx, 200, 366, 300, 96, 12, 'rgba(150,240,215,0.5)', 2);
          art.txt(ctx, 'ЯЧЕЙКА', 220, 392, 12, 'rgba(159,214,198,0.8)', 700);
          art.txt(ctx, o.cell || '—', 220, 440, 44, '#eafff8', 800);
          var left = sys.storageLeft(o, st.day);
          art.txt(ctx, 'Срок хранения: ' + left + ' ' + U.plural(left, 'день', 'дня', 'дней'), 520, 400, 15,
            left <= 3 ? '#ffb27a' : 'rgba(200,235,225,0.8)', 700);
          art.txt(ctx, 'Принят: день ' + o.day, 520, 426, 13, 'rgba(180,220,210,0.6)', 600);

          var bh2 = U.hit({ x: 200, y: 500, w: 280, h: 56 }, PVZ.input.x, PVZ.input.y);
          art.button(ctx, { x: 200, y: 500, w: 280, h: 56 }, 'Взять на складе', { hover: bh2, size: 18, bg: 'rgba(90,168,119,0.95)', hoverBg: '#7fe0a0', hoverFg: '#12321f' });
          var bb = U.hit({ x: 500, y: 500, w: 160, h: 56 }, PVZ.input.x, PVZ.input.y);
          art.button(ctx, { x: 500, y: 500, w: 160, h: 56 }, 'Назад', { hover: bb, size: 16 });
          art.txt(ctx, 'Подсказка: ' + o.cell + ' — стеллаж ' + (o.cell || 'A').charAt(0) + ', ' +
            (o.cell || 'A-1-1').charAt(2) + '-я полка, ' + (o.cell || 'A-1-1').charAt(4) + '-е место.', 200, 592, 13, 'rgba(190,225,215,0.55)', 600);
        } else if (T.mode === 'shift') {
          var opening = !st.shiftOpen;
          art.txt(ctx, opening ? 'ОТКРЫТИЕ СМЕНЫ' : 'ЗАКРЫТИЕ СМЕНЫ', 200, 200, 20, '#cfe9e2', 800);
          var rows = opening ? [
            ['Сотрудник', 'Вы'],
            ['ПВЗ', PVZ.state.title()],
            ['Адрес', PVZ.state.address()],
            ['Смена', '09:00 — 21:00'],
            ['План на день', st.plan + ' выдач']
          ] : [
            ['Выдано за смену', st.stats.served + ' / ' + st.plan],
            ['Принято на склад', st.stats.received + ' шт.'],
            ['Оформлено возвратов', st.stats.returns],
            ['Выручка смены', U.fmtMoney(st.stats.revenue)],
            ['Жалоб', String(st.stats.complaints)]
          ];
          rows.forEach(function (r, i) {
            var y = 250 + i * 34;
            art.txt(ctx, r[0], 200, y, 15, 'rgba(200,235,225,0.7)', 600);
            art.txt(ctx, r[1], 620, y, 16, '#eafff8', 700, 'right');
          });
          if (!opening && !eveningReady()) {
            var left2 = st.objectives.filter(function (o) { return !o.done && o.id !== 'shift'; }).map(function (o) { return o.text; });
            art.txt(ctx, 'Сначала: ' + left2.join(' · '), 200, 448, 13, '#ffb27a', 600);
          }
          var hb = U.hit({ x: 200, y: 500, w: 340, h: 56 }, PVZ.input.x, PVZ.input.y);
          art.button(ctx, { x: 200, y: 500, w: 340, h: 56 }, opening ? 'Открыть смену' : 'Закрыть смену', {
            hover: hb, size: 18,
            bg: opening ? 'rgba(90,168,119,0.95)' : 'rgba(228,87,46,0.92)',
            hoverBg: opening ? '#7fe0a0' : '#ff8a5c',
            hoverFg: opening ? '#12321f' : '#2a1008',
            disabled: !opening && !eveningReady()
          });
        }
        art.txt(ctx, 'Esc / ✕ — закрыть терминал', 1060, 600, 12, 'rgba(160,200,190,0.5)', 600, 'right');
        ctx.restore();
      };

      st.terminal = T;
    }

    api.closeTerminal = function () { st.terminal = null; };

    api.shiftAction = function () {
      if (st.phase === 'morning' && !st.shiftOpen) {
        var missing = PVZ.apps.missingCore();
        if (missing.length) {
          msg('Смену не открыть: не установлены приложения — ' + missing.map(function (id) {
            var a = PVZ.apps.byId(id);
            return a ? a.short : id;
          }).join(', ') + '.', 'bad');
          PVZ.audio.bad();
          openAppStore();
          return;
        }
        st.shiftOpen = true;
        setObjective('terminal', true);
        st.morning.terminal = true;
        PVZ.audio.ok();
        msg('Смена открыта в системе.', 'good');
        api.closeTerminal();
        checkMorningDone();
      } else if (st.phase === 'evening' && st.shiftOpen) {
        if (!eveningReady()) {
          msg('Сначала закройте дверь, сдайте возвраты и сверьте кассу.', 'bad');
          return;
        }
        api.closeTerminal();
        finishEvening();
      }
    };

    /* ---------------- ноутбук ---------------- */
    /* Один ноутбук на все случаи: рабочий стол, магазин, телефон, игры */
    function makeLaptop(mode) {
      return {
        mode: mode || 'home',
        page: 0,
        appstore: new PVZ.apps.AppStore(),
        shop: new ShopUI({ title: 'МАРКЕТ ПВЗ · ноутбук', subtitle: 'Покупки действуют сразу — улучшения и декор уже работают', close: true }),
        reviews: new ReviewsUI(),
        phone: new PhoneUI({ onCall: handlePhoneCall }),
        calc: new PVZ.apps.Calculator(),
        snake: new PVZ.apps.Snake(),
        memory: new PVZ.apps.Memory(),
        banana: { tab: 'buy' },
        premium: { tab: 'bundles', modal: null, ad: null, msg: '', msgT: 0 },
        chatWith: 'artem',
        cctvCam: 0,
        crmSel: 0,
        game: null,
        t: 0
      };
    }

    function openLaptop() {
      if (st.qte || st.dlg || st.terminal || st.phone) return;
      if (st.laptop) { st.laptop = null; PVZ.audio.click(); return; }
      st.laptop = makeLaptop('home');
      PVZ.audio.ui();
    }

    function closeLaptop() { st.laptop = null; }

    /* Открыть магазин приложений из любой точки игры */
    function openAppStore() {
      if (!st.laptop) st.laptop = makeLaptop('appstore');
      st.laptop.mode = 'appstore';
      st.laptop.page = 0;
      st.laptop.appstore.tab = 'all';
      st.laptop.appstore.page = 0;
      PVZ.audio.ui();
    }

    /* Запуск приложения по id (только если установлено) */
    function openLaptopApp(id) {
      if (!PVZ.state.hasApp(id)) {
        msg('Приложение не установлено. Откройте App Market.', 'bad');
        PVZ.audio.bad();
        openAppStore();
        return;
      }
      var L = st.laptop;
      if (!L) return;
      if (id === 'terminal') { st.laptop = null; openTerminal('search'); return; }
      if (id === 'market') { L.mode = 'shop'; return; }
      if (id === 'reviews') { L.mode = 'reviews'; L.reviews.page = 0; L.reviews.sel = null; return; }
      if (id === 'phone') { L.mode = 'phone'; if (!L.phone) L.phone = new PhoneUI({ onCall: handlePhoneCall }); L.phone.screen = 'home'; return; }
      if (id === 'game') { L.mode = 'game'; startLaptopGame(); return; }
      if (id === 'calc') { L.mode = 'calc'; return; }
      if (id === 'snake') { L.mode = 'snake'; L.snake.reset(); return; }
      if (id === 'memory') { L.mode = 'memory'; L.memory.reset(); return; }
      if (id === 'banana') { L.mode = 'banana'; if (!L.banana) L.banana = { tab: 'buy' }; return; }
      if (id === 'premium') { L.mode = 'premium'; if (!L.premium) L.premium = { tab: 'bundles', modal: null, ad: null, msg: '', msgT: 0 }; return; }
      if (id === 'appstore') { L.mode = 'appstore'; L.appstore.tab = 'all'; L.appstore.page = 0; return; }
      if (id === 'chat') {
        L.mode = 'chat';
        if (PVZ.talks && PVZ.talks.ensureThread) PVZ.talks.ensureThread(L.chatWith || 'artem');
        return;
      }
      // остальные программы рисуются общим экраном
      L.mode = id;
    }

    function startLaptopGame() {
      var g = { t: 0, boxes: [], score: 0, over: false, spawn: 0.2, best: PVZ.state.data.totals.minigame || 0, earned: 0 };
      st.laptop.game = g;
    }

    function updateLaptopGame(dt) {
      var g = st.laptop && st.laptop.game;
      if (!g || g.over) return;
      g.t += dt;
      g.spawn -= dt;
      if (g.spawn <= 0 && g.t < 18) {
        g.spawn = U.rand(0.42, 0.72);
        g.boxes.push({
          x: U.rand(0.08, 0.82),
          y: U.rand(0.1, 0.72),
          life: U.rand(1.1, 1.9),
          seed: U.ri(0, 5)
        });
      }
      for (var i = g.boxes.length - 1; i >= 0; i--) {
        g.boxes[i].life -= dt;
        if (g.boxes[i].life <= 0) g.boxes.splice(i, 1);
      }
      if (g.t >= 20) {
        g.over = true;
        g.earned = g.score * 5;
        if (g.earned) {
          PVZ.state.addMoney(g.earned);
          st.stats.revenue += g.earned;
        }
        if (g.score > g.best) {
          PVZ.state.data.totals.minigame = g.score;
          g.best = g.score;
          PVZ.state.save();
        }
        PVZ.audio.level();
      }
    }

    var LAPTOP_WIN = { x: 200, y: 120, w: 880, h: 480 };
    var LAPTOP_CLOSE = { x: LAPTOP_WIN.x + LAPTOP_WIN.w - 46, y: LAPTOP_WIN.y + 12, w: 34, h: 34 };
    /* сетка ярлыков рабочего стола: 5 × 2, страницы */
    var DESK = { x: 214, y: 252, cols: 5, cw: 152, ch: 136, gapX: 12, gapY: 10, per: 10 };

    function deskApps() { return PVZ.apps.desktopApps(); }
    function deskPages() {
      var L = st.laptop;
      var pages = Math.max(1, Math.ceil(deskApps().length / DESK.per));
      if (L.page > pages - 1) L.page = pages - 1;
      if (L.page < 0) L.page = 0;
      return pages;
    }
    function deskPageApps() {
      var p = st.laptop ? (st.laptop.page || 0) : 0;
      return deskApps().slice(p * DESK.per, p * DESK.per + DESK.per);
    }
    function deskTileRect(i) {
      return {
        x: DESK.x + (i % DESK.cols) * (DESK.cw + DESK.gapX),
        y: DESK.y + Math.floor(i / DESK.cols) * (DESK.ch + DESK.gapY),
        w: DESK.cw, h: DESK.ch
      };
    }
    function deskPageRects() {
      if (deskPages() <= 1) return null;
      var y = LAPTOP_WIN.y + LAPTOP_WIN.h - 48;
      return {
        prev: { x: LAPTOP_WIN.x + LAPTOP_WIN.w / 2 - 120, y: y, w: 78, h: 28 },
        next: { x: LAPTOP_WIN.x + LAPTOP_WIN.w / 2 + 42, y: y, w: 78, h: 28 }
      };
    }
    function appBadge(a) {
      if (a.id === 'appstore') {
        var miss = PVZ.apps.missingCore().length;
        return miss ? { text: String(miss), color: '#e4572e' } : null;
      }
      if (a.id === 'reviews') {
        var rs = sys.reviewStats();
        return rs.fresh ? { text: String(Math.min(9, rs.fresh)), color: '#e4572e' } : null;
      }
      if (a.id === 'banana') {
        var bb = PVZ.state.banana();
        if (bb && PVZ.state.hasApp('banana') && bb.heat >= 70) return { text: '!', color: '#e4572e' };
      }
      // Premium store зовёт скидкой, пока не куплен стартовый набор
      if (a.id === 'premium' && !PVZ.state.premiumHas('starter')) {
        return { text: '−84%', color: '#e4572e', w: 44 };
      }
      // непрочитанные переписки: живые люди ждут ответа
      if (a.id === 'chat') {
        var pend = (PVZ.talks && PVZ.talks.pendingCount) ? PVZ.talks.pendingCount(PVZ.state.data) : 0;
        return pend ? { text: String(Math.min(9, pend)), color: '#5b7fd0' } : null;
      }
      return null;
    }

    function laptopTap(x, y) {
      var L = st.laptop;
      if (!L) return;
      var mode = L.mode;
      // крестик окна ноутбука (у магазина и витрины свои крестики)
      if (mode !== 'shop' && mode !== 'appstore' && U.hit(LAPTOP_CLOSE, x, y)) {
        closeLaptop();
        PVZ.audio.click();
        return;
      }

      if (mode === 'appstore') {
        var sres = L.appstore.tap(x, y);
        if (sres) {
          if (sres.action === 'close') { L.mode = 'home'; PVZ.audio.click(); }
          else if (sres.action === 'install') L.appstore.install(sres.id);
        }
        return;
      }
      if (mode === 'shop') {
        var res = L.shop.tap(x, y);
        if (res) {
          if (res.action === 'close') { L.mode = 'home'; PVZ.audio.click(); }
          else if (res.action === 'buy') { L.shop.handleBuy(res.id); st.mods = PVZ.state.mods(); }
          else if (res.action === 'tab' || res.action === 'page') { /* уже применено */ }
        }
        return;
      }
      if (mode === 'reviews') { L.reviews.tap(x, y); return; }
      if (mode === 'phone') {
        if (!L.phone) L.phone = new PhoneUI({ onCall: handlePhoneCall });
        L.phone.tap(x, y);
        return;
      }
      if (mode === 'calc') { L.calc.tap(LAPTOP_WIN, x, y); return; }
      if (mode === 'snake') { L.snake.tap(LAPTOP_WIN, x, y); return; }
      if (mode === 'memory') { L.memory.tap(LAPTOP_WIN, x, y); return; }
      if (mode === 'banana') {
        var bres = PVZ.apps.tapBanana(LAPTOP_WIN, x, y, { st: st, laptop: L });
        if (bres) {
          if (bres.action === 'tab') PVZ.audio.ui();
          else if (bres.action === 'buy') bananaBuy(bres.id);
          else if (bres.action === 'sell') bananaSell(bres.id);
        }
        return;
      }
      if (mode === 'premium') {
        PVZ.apps.tapPremium(LAPTOP_WIN, x, y, { laptop: L, st: st, t: st.t });
        return;
      }
      if (mode === 'game') {
        var g = L.game;        if (!g) return;
        if (g.over) {
          if (U.hit({ x: LAPTOP_WIN.x + LAPTOP_WIN.w / 2 - 230, y: LAPTOP_WIN.y + LAPTOP_WIN.h - 88, w: 220, h: 46 }, x, y)) { startLaptopGame(); PVZ.audio.ui(); }
          if (U.hit({ x: LAPTOP_WIN.x + LAPTOP_WIN.w / 2 + 10, y: LAPTOP_WIN.y + LAPTOP_WIN.h - 88, w: 220, h: 46 }, x, y)) { L.mode = 'home'; PVZ.audio.ui(); }
          return;
        }
        for (var i = g.boxes.length - 1; i >= 0; i--) {
          var b = g.boxes[i];
          var bx = LAPTOP_WIN.x + 40 + b.x * (LAPTOP_WIN.w - 120);
          var by = LAPTOP_WIN.y + 140 + b.y * (LAPTOP_WIN.h - 240);
          if (U.hit({ x: bx, y: by, w: 76, h: 62 }, x, y)) {
            g.boxes.splice(i, 1);
            g.score++;
            PVZ.audio.coin();
            return;
          }
        }
        return;
      }

      // дальше — окно ноутбука с шапкой
      if (mode !== 'home') {
        PVZ.apps.tapScreen(mode, LAPTOP_WIN, x, y, { laptop: L, st: st, t: st.t });
        return;
      }

      // рабочий стол: перелистывание и ярлыки
      var pr = deskPageRects();
      if (pr) {
        if (U.hit(pr.prev, x, y)) { L.page = (L.page + deskPages() - 1) % deskPages(); PVZ.audio.ui(); return; }
        if (U.hit(pr.next, x, y)) { L.page = (L.page + 1) % deskPages(); PVZ.audio.ui(); return; }
      }
      var appsNow = deskPageApps();
      for (var k = 0; k < appsNow.length; k++) {
        if (U.hit(deskTileRect(k), x, y)) {
          PVZ.audio.click();
          openLaptopApp(appsNow[k].id);
          return;
        }
      }
    }

    function drawLaptop(ctx) {
      var L = st.laptop;
      if (!L) return;
      ctx.save();
      ctx.fillStyle = 'rgba(8,5,4,0.74)';
      ctx.fillRect(0, 0, 1280, 720);

      // ноутбук не останавливает ожидание — показываем, кто ждёт в зале
      if (st.customer && st.phase === 'day' && st.shiftOpen) {
        var waitC = st.customer;
        art.panel(ctx, 24, 16, 302, 52, { bg: 'rgba(30,22,18,0.94)', r: 12, border: 'rgba(255,200,150,0.2)' });
        art.txt(ctx, waitC.state === 'leaving' ? 'Покупатель ушёл' : 'Покупатель ждёт',
          38, 37, 12, waitC.state === 'leaving' ? '#ff8a5c' : 'rgba(255,240,220,0.7)', 700);
        if (st.queue.length) {
          art.txt(ctx, 'в очереди: ' + st.queue.length, 312, 37, 11, 'rgba(255,240,220,0.45)', 700, 'right');
        }
        art.bar(ctx, 38, 46, 274, 8, waitC.state === 'leaving' ? 0 : U.clamp(waitC.patience, 0, 1),
          waitC.patience > 0.55 ? '#5aa877' : waitC.patience > 0.3 ? '#f2c14a' : '#e4572e');
      }

      if (L.mode === 'shop') {
        L.shop.draw(ctx, st.t);
        art.txt(ctx, 'Esc / ✕ — выйти из магазина', 1080, 660, 12, 'rgba(255,240,220,0.5)', 600, 'right');
        ctx.restore();
        return;
      }
      if (L.mode === 'appstore') {
        L.appstore.draw(ctx);
        art.txt(ctx, 'Esc / ✕ — на рабочий стол', 1080, 660, 12, 'rgba(255,240,220,0.5)', 600, 'right');
        ctx.restore();
        return;
      }

      var w = LAPTOP_WIN;
      art.panel(ctx, w.x, w.y, w.w, w.h, { bg: 'rgba(24,30,34,0.98)', r: 18, border: 'rgba(140,210,190,0.3)' });
      art.fillRR(ctx, w.x, w.y, w.w, 62, 18, 'rgba(30,58,56,0.95)');
      art.txt(ctx, 'НОУТБУК СОТРУДНИКА', w.x + 24, w.y + 28, 14, '#9fd6c6', 800);
      var lapTitle = PVZ.state.title();
      var lapFit = art.fitTxt(ctx, '· ' + lapTitle, 300, 12, 700, 8);
      art.txt(ctx, lapFit.text, w.x + 24 + art.txtW(ctx, 'НОУТБУК СОТРУДНИКА', 14, 800) + 10, w.y + 28, lapFit.size, 'rgba(180,240,220,0.75)', 700);
      art.txt(ctx, U.fmtTime(st.clock) + ' · день ' + st.day, w.x + 24, w.y + 48, 12, 'rgba(200,235,225,0.6)', 700);
      art.txt(ctx, U.fmtMoney(PVZ.state.data.money), w.x + w.w - 120, w.y + 32, 15, '#ffd479', 800, 'right');
      var hx = U.hit(LAPTOP_CLOSE, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, LAPTOP_CLOSE.x, LAPTOP_CLOSE.y, LAPTOP_CLOSE.w, LAPTOP_CLOSE.h, 8, hx ? '#e4572e' : 'rgba(255,255,255,0.1)');
      art.txt(ctx, '✕', LAPTOP_CLOSE.x + 17, LAPTOP_CLOSE.y + 23, 18, '#fff', 700, 'center');

      if (L.mode === 'home') {
        var appsNow = deskPageApps();
        var pages = deskPages();
        var missing = PVZ.apps.missingCore();
        art.txt(ctx, 'Рабочий стол', w.x + 24, w.y + 96, 12, 'rgba(200,235,225,0.55)', 700);
        art.txt(ctx, 'Приложений: ' + deskApps().length, w.x + w.w - 24, w.y + 96, 11, 'rgba(200,235,225,0.45)', 700, 'right');
        if (missing.length) {
          art.txt(ctx, 'Для смены не хватает: ' + missing.map(function (id) {
            var a = PVZ.apps.byId(id);
            return a ? a.short : id;
          }).join(', ') + ' — откройте App Market', w.x + 24, w.y + 114, 11, 'rgba(255,205,150,0.85)', 700);
        } else {
          art.txt(ctx, 'Все приложения для смены установлены', w.x + 24, w.y + 114, 11, 'rgba(160,240,210,0.65)', 700);
        }
        appsNow.forEach(function (a, i) {
          var r = deskTileRect(i);
          var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
          ctx.save();
          if (hov) { ctx.shadowColor = 'rgba(120,220,200,0.6)'; ctx.shadowBlur = 22; }
          art.fillRR(ctx, r.x, r.y, r.w, r.h, 14, hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)');
          ctx.restore();
          art.strokeRR(ctx, r.x, r.y, r.w, r.h, 14, hov ? 'rgba(160,240,220,0.6)' : 'rgba(255,255,255,0.1)', 1.4);
          if (a.id === 'premium' && !PVZ.state.premiumHas('starter')) {
            ctx.save();
            ctx.shadowColor = 'rgba(255,190,80,0.8)';
            ctx.shadowBlur = 16;
            art.strokeRR(ctx, r.x, r.y, r.w, r.h, 14, '#ffd479', 2);
            ctx.restore();
          }
          art.fillRR(ctx, r.x + r.w / 2 - 38, r.y + 16, 76, 62, 14, a.color);
          art.txt(ctx, a.glyph, r.x + r.w / 2, r.y + 58, 27, '#ffffff', 800, 'center');
          art.txt(ctx, a.short || a.name, r.x + r.w / 2, r.y + 98, 13, '#fff3e2', 800, 'center');
          var sub = a.core ? (PVZ.state.hasApp(a.id) ? 'для смены' : 'обязательно') : (a.id === 'appstore' ? 'магазин' : 'приложение');
          art.txt(ctx, sub, r.x + r.w / 2, r.y + 114, 10,
            a.core && !PVZ.state.hasApp(a.id) ? 'rgba(255,190,140,0.9)' : 'rgba(210,235,228,0.5)', 600, 'center');
          art.txt(ctx, hov ? 'нажмите, чтобы открыть' : '', r.x + r.w / 2, r.y + 128, 9, '#9fd6c6', 600, 'center');
          var badge = appBadge(a);
          if (badge) {
            var bdw = badge.w || 20;
            var bdy = badge.w ? r.y - 6 : r.y + 8;
            art.fillRR(ctx, r.x + r.w - bdw - 10, bdy, bdw, 20, 10, badge.color);
            art.txt(ctx, badge.text, r.x + r.w - bdw / 2 - 10, bdy + 15, 10.5, '#fff', 800, 'center');
          }
        });
        var pr = deskPageRects();
        if (pr) {
          var ph = U.hit(pr.prev, PVZ.input.x, PVZ.input.y), nh = U.hit(pr.next, PVZ.input.x, PVZ.input.y);
          art.fillRR(ctx, pr.prev.x, pr.prev.y, pr.prev.w, pr.prev.h, 9, ph ? '#9fd6c6' : 'rgba(255,255,255,0.08)');
          art.txt(ctx, '◀', pr.prev.x + pr.prev.w / 2, pr.prev.y + 20, 14, ph ? '#12231f' : '#dff6ee', 700, 'center');
          art.fillRR(ctx, pr.next.x, pr.next.y, pr.next.w, pr.next.h, 9, nh ? '#9fd6c6' : 'rgba(255,255,255,0.08)');
          art.txt(ctx, '▶', pr.next.x + pr.next.w / 2, pr.next.y + 20, 14, nh ? '#12231f' : '#dff6ee', 700, 'center');
          art.txt(ctx, (L.page + 1) + ' / ' + pages, w.x + w.w / 2, pr.prev.y + 19, 12, 'rgba(200,235,225,0.6)', 700, 'center');
        }
        art.txt(ctx, 'Esc — закрыть ноутбук · T — терминал', w.x + w.w / 2, w.y + w.h - 14, 11, 'rgba(200,235,225,0.4)', 600, 'center');
      } else if (L.mode === 'reviews') {
        L.reviews.draw(ctx);
        art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', w.x + w.w / 2, w.y + w.h - 14, 11, 'rgba(200,235,225,0.4)', 600, 'center');
      } else if (L.mode === 'phone') {
        if (!L.phone) L.phone = new PhoneUI({ onCall: handlePhoneCall });
        L.phone.draw(ctx);
      } else if (L.mode === 'calc') {
        L.calc.draw(ctx, w);
        art.txt(ctx, 'Esc — на рабочий стол', w.x + w.w / 2, w.y + w.h - 12, 11, 'rgba(200,235,225,0.4)', 600, 'center');
      } else if (L.mode === 'snake') {
        L.snake.draw(ctx, w);
      } else if (L.mode === 'memory') {
        L.memory.draw(ctx, w);
      } else if (L.mode === 'game') {
        var g = L.game || { boxes: [], score: 0, t: 0, over: false };
        art.txt(ctx, 'ПОЙМАЙ ПОСЫЛКИ', w.x + 24, w.y + 96, 15, '#9fd6c6', 800);
        art.txt(ctx, 'Очки: ' + g.score, w.x + w.w - 24, w.y + 96, 15, '#ffd479', 800, 'right');
        art.txt(ctx, 'Осталось: ' + Math.max(0, Math.ceil(20 - g.t)) + ' с', w.x + 24, w.y + 116, 11, 'rgba(200,235,225,0.6)', 700);
        art.bar(ctx, w.x + 24, w.y + 126, w.w - 48, 6, Math.min(1, g.t / 20), '#5aa877');
        if (!g.over) {
          g.boxes.forEach(function (b) {
            var bx = w.x + 40 + b.x * (w.w - 120);
            var by = w.y + 140 + b.y * (w.h - 240);
            var alpha = Math.min(1, b.life * 2.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            art.drawParcel(ctx, bx, by, 76, 62, { seed: b.seed });
            art.txt(ctx, '?', bx + 38, by + 42, 24, 'rgba(60,40,25,0.7)', 800, 'center');
            ctx.restore();
          });
          if (!g.boxes.length) art.txt(ctx, 'Ловите коробки!', w.x + w.w / 2, w.y + w.h / 2, 18, 'rgba(200,235,225,0.5)', 700, 'center');
        } else {
          art.panel(ctx, w.x + w.w / 2 - 200, w.y + 150, 400, 220, { bg: 'rgba(30,22,18,0.95)', r: 16 });
          art.txt(ctx, 'ВРЕМЯ ВЫШЛО', w.x + w.w / 2, w.y + 196, 20, '#ffd8a8', 800, 'center');
          art.txt(ctx, 'Поймано посылок: ' + g.score, w.x + w.w / 2, w.y + 236, 17, '#fff3e2', 700, 'center');
          art.txt(ctx, 'Заработано: +' + U.fmtMoney(g.earned || 0), w.x + w.w / 2, w.y + 266, 17, '#ffd479', 700, 'center');
          art.txt(ctx, 'Рекорд: ' + g.best, w.x + w.w / 2, w.y + 292, 13, 'rgba(255,240,220,0.6)', 600, 'center');
          var b1 = { x: w.x + w.w / 2 - 230, y: w.y + w.h - 88, w: 220, h: 46 };
          var b2 = { x: w.x + w.w / 2 + 10, y: w.y + w.h - 88, w: 220, h: 46 };
          art.button(ctx, b1, 'Ещё раз', { hover: U.hit(b1, PVZ.input.x, PVZ.input.y), size: 16, bg: 'rgba(242,153,74,0.92)', fg: '#2a1a10' });
          art.button(ctx, b2, 'На рабочий стол', { hover: U.hit(b2, PVZ.input.x, PVZ.input.y), size: 15 });
        }
        art.txt(ctx, 'Esc — закрыть ноутбук', w.x + w.w / 2, w.y + w.h - 20, 12, 'rgba(200,235,225,0.4)', 600, 'center');
      } else if (L.mode === 'secrets') {
        PVZ.apps.drawSecrets(ctx, w, { st: st });
      } else if (L.mode === 'premium') {
        PVZ.apps.drawPremium(ctx, w, { st: st, laptop: L, t: st.t });
      } else if (L.mode === 'banana') {
        PVZ.apps.drawBanana(ctx, w, { st: st, laptop: L });
      } else {
        // универсальный экран программы из App Market
        var curApp = PVZ.apps.byId(L.mode);
        if (curApp) PVZ.apps.drawScreen(ctx, curApp, w, { st: st, laptop: L, t: st.t });
        else art.txt(ctx, 'Приложение не найдено', w.x + w.w / 2, w.y + w.h / 2, 16, '#ffb59d', 700, 'center');
      }
      ctx.restore();
    }

    /* ---------------- вечер ---------------- */
    function closeDoor() {
      if (st.doorOpen) {
        st.doorOpen = false;
        PVZ.audio.bell();
        msg('Дверь закрыта. ПВЗ не принимает покупателей.', 'good');
      } else {
        msg('Дверь уже закрыта.');
      }
      setObjective('closeDoor', true);
    }

    function handoverReturns() {
      var list = returnOrders();
      if (!list.length) {
        setObjective('returns', true);
        msg('Зона возвратов пуста — сдавать нечего.', 'good');
        return;
      }
      st.returnsDone = true;
      setObjective('returns', true);
      PVZ.audio.ok();
      PVZ.state.addRating(0.02);
      msg('Возвраты переданы курьеру: ' + list.length + ' шт.', 'good');
    }

    function reconcileCash() {
      if (st.cashDone) { msg('Касса уже сверена.'); return; }
      st.cashDone = true;
      setObjective('cash', true);
      PVZ.audio.printer();
      msg('Сверка: выручка ' + U.fmtMoney(st.stats.revenue) + ', расхождений нет.', 'good');
    }

    /* Насколько смена провалена по плану — это тоже бьёт по рейтингу */
    function planPenalty() {
      var pct = st.plan ? st.stats.served / st.plan : 1;
      if (pct >= 0.85) return 0;
      if (pct >= 0.6) return -0.06;
      if (pct >= 0.35) return -0.12;
      return -0.2;
    }

    /* Забег проигран: пункт закрывают */
    function failRun(reason) {
      if (st.over) return false;
      st.over = true;
      var d = PVZ.state.data;
      var res = PVZ.state.result();
      d.over = true;
      d.won = false;
      d.shift = null;
      if (d.mode === 'endless' && d.endlessBest) {
        d.endlessBest.day = Math.max(d.endlessBest.day || 0, st.day);
        d.endlessBest.money = Math.max(d.endlessBest.money || 0, d.money || 0);
      }
      d.finale = {
        kind: 'fail',
        reason: reason,
        day: st.day,
        rating: d.rating,
        days: res.days,
        earned: res.earned,
        served: res.served,
        complaints: res.complaints,
        money: d.money
      };
      PVZ.state.save();
      PVZ.audio.bad();
      PVZ.game.goto(PVZ.scenes.gameover(d.finale));
      return true;
    }

    /* Проверка рейтинга: предупреждение, затем закрытие пункта */
    function checkRunState() {
      if (st.over || !PVZ.state.data) return false;
      var rating = PVZ.state.data.rating;
      if (rating <= PVZ.balance.ratingFail) {
        return failRun('Рейтинг упал до ' + rating.toFixed(2) + ' из 5,00');
      }
      if (rating < PVZ.balance.ratingWarn && !st.warned) {
        st.warned = true;
        PVZ.audio.bad();
        msg('Рейтинг ' + rating.toFixed(2) + ' — ниже ' + PVZ.balance.ratingWarn.toFixed(2) + '. Ещё пара жалоб, и пункт закроют.', 'bad');
      } else if (rating >= PVZ.balance.ratingWarn + 0.15) {
        st.warned = false;
      }
      return false;
    }

    function finishEvening() {
      if (st.finished) return;
      if (st.threat && st.threat.kind === 'fire') { fireFail(); return; }
      st.threat = null;
      st.finished = true;
      if (st.day === 1 && PVZ.state.data) PVZ.state.data.tutorialSeen = true;
      var missed = st.objectives.filter(function (o) { return !o.done; }).length;
      if (missed) PVZ.state.addRating(-0.03 * missed);
      var pen = planPenalty();
      if (pen) PVZ.state.addRating(pen);
      var bonus = 0;
      if (st.stats.served >= st.plan) bonus = 300 + (st.stats.served - st.plan) * 60;
      // премия действительно начисляется на счёт, а не только показывается в отчёте
      if (bonus > 0) { PVZ.state.addMoney(bonus); st.stats.revenue += bonus; }

      PVZ.state.data.totals.days++;
      PVZ.state.data.totals.served += st.stats.served;
      PVZ.state.data.totals.complaints += st.stats.complaints;
      PVZ.state.data.totals.returns += st.stats.returns;
      PVZ.state.data.totals.bestRating = Math.max(PVZ.state.data.totals.bestRating, PVZ.state.data.rating);
      PVZ.state.data.shift = null;

      // смена провалена по рейтингу — пункт закрывают вместо отчёта
      if (PVZ.state.data.rating <= PVZ.balance.ratingFail) {
        failRun('Рейтинг ПВЗ упал до ' + PVZ.state.data.rating.toFixed(2) + ' из 5,00');
        return;
      }

      PVZ.state.save();

      var isFinal = !PVZ.state.endless() && st.day >= PVZ.balance.WIN_DAY;
      if (isFinal) {
        PVZ.state.data.won = true;
        PVZ.state.data.finale = {
          kind: 'win',
          day: st.day,
          rating: PVZ.state.data.rating,
          days: PVZ.state.data.totals.days,
          earned: PVZ.state.data.totals.earned,
          served: PVZ.state.data.totals.served,
          complaints: PVZ.state.data.totals.complaints,
          money: PVZ.state.data.money
        };
        PVZ.state.save();
      }

      var carry = st.orders.filter(function (o) {
        return o.state === 'stored' && sys.storageLeft(o, st.day) > 0;
      });

      // вечером приходят люди мафии и забирают свою долю (если долг ещё есть).
      // В бесконечном режиме мафии нет — вместо неё арендодатель.
      var endless = PVZ.state.endless();
      var rent = endless ? sys.rentCollect(st.stats.revenue) : null;
      if (endless && PVZ.state.data.endlessBest) {
        PVZ.state.data.endlessBest.day = Math.max(PVZ.state.data.endlessBest.day || 0, st.day);
        PVZ.state.data.endlessBest.money = Math.max(PVZ.state.data.endlessBest.money || 0, PVZ.state.data.money);
        PVZ.state.data.endlessBest.served = Math.max(PVZ.state.data.endlessBest.served || 0, PVZ.state.data.totals.served || 0);
      }
      PVZ.state.save();

      function makeReport(collection) {
        var mm = PVZ.state.mafiaState();
        return {
          day: st.day,
          served: st.stats.served,
          plan: st.plan,
          complaints: st.stats.complaints,
          returns: st.stats.returns,
          received: st.stats.received,
          earned: st.stats.revenue,
          bonus: bonus,
          rating: PVZ.state.data.rating,
          money: PVZ.state.data.money,
          missed: missed,
          planPenalty: pen,
          tips: st.stats.tips,
          final: isFinal,
          carry: carry,
          mafia: collection || null,
          rent: rent,
          mode: endless ? 'endless' : 'story',
          freed: !endless && !!(PVZ.state.data && PVZ.state.data.debt <= 0),
          eggs: PVZ.state.eggCount(),
          referred: st.stats.referred || 0,
          refBonus: st.stats.refBonus || 0,
          specials: st.stats.specials || 0,
          moments: st.stats.moments || 0,
          boxStats: PVZ.boxes ? PVZ.boxes.stats() : null,
          castNums: PVZ.cast ? PVZ.cast.contacts().length : 0,
          avgScore: PVZ.state.ratingAvg(0),
          ratingLog: PVZ.state.ratingTail(8),
          debt: PVZ.state.data.debt || 0,
          mafiaStats: { trust: mm.trust || 0, dirt: mm.dirt || 0, proof: mm.proof || 0 },
          task: mm.task ? { need: mm.task.need, remaining: mm.task.remaining, reward: mm.task.reward } : null
        };
      }

      if (endless) {
        if (rent && rent.evicted) {
          failRun('Арендодатель выселил: три смены подряд не оплачена аренда. Долг — ' + U.fmtMoney(rent.unpaid) + '.');
          return;
        }
        PVZ.game.goto(PVZ.scenes.report(makeReport(null)));
        return;
      }

      // долг закрыт — мафия больше не приходит, отчёт показывается сразу
      if ((PVZ.state.data.debt || 0) <= 0) {
        PVZ.state.data.freed = true;
        PVZ.game.goto(PVZ.scenes.report(makeReport(null)));
        return;
      }

      // пришли за деньгами — и теперь с ними можно разговаривать
      openMafiaVisit(function (result) {
        var report = makeReport(result);
        PVZ.game.goto(PVZ.scenes.mafia({ result: result, report: report, mode: result && result.mode }));
      });
    }

    /* ---------------- казусы и события ---------------- */
    function startQTE(opts) {
      // в «перебои со светом» любая мини-игра сложнее
      if (st.dayMod && st.dayMod.hard) opts.hard = true;
      // мини-игра не останавливает ожидание: показываем, кто именно ждёт
      if (!opts.customer && st.customer) opts.customer = st.customer;
      st.qte = new sys.QTE(opts);
    }

    function addSupply(count) {
      var extra = sys.generateSupply(st.day, count);
      extra.forEach(function (o) { st.orders.push(o); });
      return extra;
    }

    var EVENTS = [
      {
        id: 'review_bomb', weight: 1, minDay: 3,
        run: function () {
          if (st.reviewBombDay === st.day) return;
          st.reviewBombDay = st.day;
          var n = sys.addFakeReviews(U.ri(2, 3));
          PVZ.audio.bad();
          msg('Хакерская атака: ' + n + ' фальшивых плохих отзывов! Ноутбук → Отзывы.', 'bad');
        }
      },
      {
        id: 'boxes', weight: 3,
        run: function () {
          startQTE({
            type: 'balance',
            title: 'Казус: упала стопка коробок',
            sub: 'Придержите стопку с той стороны, куда кренит',
            hard: st.day > 2,
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.04); msg('Удержали! Ничего не рассыпалось.', 'good'); }
              else { PVZ.state.addRating(-0.05); msg('Коробки рассыпались, пришлось собирать.', 'bad'); st.clock += 5; }
            }
          });
        }
      },
      {
        id: 'spill', weight: 3,
        run: function () {
          startQTE({
            type: 'clean',
            tool: 'mop',
            stain: 'coffee',
            title: 'Казус: кто-то разлил кофе',
            sub: 'Возьмите швабру и протрите пол, пока никто не поскользнулся',
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.04); msg('Кофе вытерт, пол чистый.', 'good'); }
              else { PVZ.state.addRating(-0.04); msg('Лужа осталась на полу — покупатели косились.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'glass', weight: 2, minDay: 2,
        run: function () {
          startQTE({
            type: 'clean',
            tool: 'broom',
            stain: 'shards',
            title: 'Казус: разбилась банка',
            sub: 'Возьмите веник и соберите осколки, пока никто не порезался',
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.04); msg('Осколки собраны, пол безопасен.', 'good'); }
              else { PVZ.state.addRating(-0.05); msg('Осколки остались на полу — пришлось закрыть проход.', 'bad'); st.clock += 3; }
            }
          });
        }
      },
      {
        id: 'cables', weight: 2, minDay: 3,
        run: function () {
          startQTE({
            type: 'wires',
            title: 'Казус: провода под стойкой',
            sub: 'Соедините каждый штекер с гнездом того же цвета',
            onDone: function (ok) {
              if (ok) { msg('Провода подключены — касса и сканер снова в сети.', 'good'); PVZ.state.addRating(0.03); }
              else { msg('Провода так и остались в куче, пришлось звать электрика.', 'bad'); st.clock += 5; PVZ.state.addRating(-0.04); }
            }
          });
        }
      },
      {
        id: 'falling', weight: 2, minDay: 2,
        run: function () {
          startQTE({
            type: 'catch',
            title: 'Казус: посылки сыплются с полки',
            sub: 'Ловите коробки нажатиями, пока они не упали на пол',
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.04); msg('Все посылки пойманы — ни одна не разбилась.', 'good'); }
              else { PVZ.state.addRating(-0.05); msg('Посылки попадали на пол, пришлось переупаковывать.', 'bad'); st.clock += 4; }
            }
          });
        }
      },
      {
        id: 'scanner', weight: 2,
        run: function () {
          startQTE({
            type: 'hold',
            title: 'Сканер барахлит',
            sub: 'Удержите калибровку, иначе касса встанет',
            onDone: function (ok) {
              if (ok) { msg('Сканер откалиброван.', 'good'); PVZ.state.addRating(0.02); }
              else { msg('Сканер так и не заработал — пришлось звать мастера.', 'bad'); st.clock += 6; PVZ.state.addRating(-0.03); }
            }
          });
        }
      },
      {
        id: 'courier', weight: 3,
        run: function () {
          addSupply(2);
          PVZ.audio.bell();
          msg('Курьер привёз ещё 2 коробки. Примите их на складе.', 'info');
        }
      },
      {
        id: 'delivery', weight: 2,
        run: function () {
          PVZ.state.data.totals.minigame = PVZ.state.data.totals.minigame || 0;
          startQTE({
            type: 'sort',
            title: 'Курьер перепутал коробки',
            sub: 'Разложите посылки по стеллажам',
            onDone: function (ok) {
              if (ok) { PVZ.state.addMoney(120); st.stats.revenue += 120; PVZ.state.addRating(0.04); PVZ.state.scheduleConsequence('courier_help', 2); msg('Посылки разложены, курьер благодарен: +120 ₽', 'good'); }
              else { st.clock += 6; PVZ.state.addRating(-0.03); msg('Разбор коробок занял время.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'docs', weight: 2,
        run: function () {
          startQTE({
            type: 'trace',
            title: 'Накладная от поставщика',
            sub: 'Поставьте подпись, не отрывая руки',
            onDone: function (ok) {
              if (ok) { PVZ.state.addMoney(90); st.stats.revenue += 90; PVZ.state.addRating(0.03); msg('Накладная подписана: +90 ₽', 'good'); }
              else { st.clock += 4; msg('Пришлось переписывать накладную.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'count', weight: 2,
        run: function () {
          var o = U.pick(storedOrders());
          if (!o) { addSupply(1); msg('Курьер привёз коробку.', 'info'); return; }
          startQTE({
            type: 'count',
            code: o.code,
            title: 'Пересчёт посылок',
            sub: 'Найдите все посылки с кодом ' + o.code,
            onDone: function (ok) {
              if (ok) { PVZ.state.addMoney(60); st.stats.revenue += 60; PVZ.state.addRating(0.03); msg('Посылки нашлись: +60 ₽', 'good'); }
              else { PVZ.state.addRating(-0.02); msg('Коробки перепутались, пришлось разбирать.', 'bad'); st.clock += 4; }
            }
          });
        }
      },
      {
        id: 'cashier', weight: 2,
        run: function () {
          startQTE({
            type: 'cashier',
            title: 'Сдача покупателю',
            sub: 'Клиент дал крупную купюру',
            onDone: function (ok) {
              if (ok) { PVZ.state.addMoney(40); st.stats.revenue += 40; msg('Сдача отсчитана верно: +40 ₽', 'good'); }
              else { PVZ.state.addRating(-0.04); msg('Сдача не сошлась, покупатель ворчит.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'support', weight: 3,
        run: function () {
          openDialog({
            name: 'Телефон',
            person: null,
            role: 'звонок',
            text: 'Звонок из поддержки: «Клиент не может найти свой заказ, проверьте, пожалуйста».',
            choices: [
              {
                label: 'Проверить в терминале и ответить',
                hint: '3 мин · +репутация',
                fx: { time: 3, rating: 0.04 },
                cb: function () { msg('Поддержка: «Спасибо, всё понятно!»', 'good'); }
              },
              {
                label: 'Сказать «не знаю» и положить трубку',
                hint: '1 мин · −репутация',
                fx: { time: 1, rating: -0.05 },
                cb: function () { msg('Звонок не оценён по достоинству.', 'bad'); }
              },
              {
                label: 'Перевести звонок администратору',
                hint: '2 мин',
                fx: { time: 2 },
                cb: function () { msg('Администратор обещал разобраться.', 'info'); }
              }
            ]
          });
        }
      },
      {
        id: 'inspector', weight: 2,
        run: function () {
          openDialog({
            name: 'Проверяющий',
            person: null,
            role: 'тайный покупатель',
            text: 'Здравствуйте, я проверяю качество обслуживания. Расскажите, как вы работаете с возвратами.',
            choices: [
              {
                label: 'Вежливо рассказать всё по регламенту',
                hint: '4 мин · +репутация',
                fx: { time: 4, rating: 0.08 },
                cb: function () { msg('Проверяющий: «Отлично, замечаний нет».', 'good'); PVZ.audio.level(); }
              },
              {
                label: 'Отмахнуться: «некогда»',
                hint: '1 мин · −репутация',
                fx: { time: 1, rating: -0.1 },
                cb: function () { msg('Проверяющий записал замечание.', 'bad'); }
              },
              {
                label: 'Предложить кофе и всё показать',
                hint: '5 мин · 80 ₽ · +репутация',
                fx: { time: 5, money: 80, rating: 0.06 },
                cb: function () { msg('Тайный покупатель остался доволен.', 'good'); }
              }
            ]
          });
        }
      },
      {
        id: 'neighbor', weight: 2,
        run: function () {
          openDialog({
            name: 'Соседний магазин',
            person: null,
            role: 'сосед',
            text: 'Из соседнего магазина: «У вас тут очередь на улице, люди к нам заходят!»',
            choices: [
              {
                label: 'Извиниться и побыстрее обслужить',
                hint: '3 мин · +репутация',
                fx: { time: 3, rating: 0.03 },
                cb: function () { msg('Сосед отошёл успокоенный.', 'good'); }
              },
              {
                label: 'Отшутиться: «зато у вас скидки»',
                hint: '1 мин',
                fx: { time: 1 },
                cb: function () { msg('Разошлись миром.', 'info'); }
              },
              {
                label: 'Нахамить',
                hint: '−репутация',
                fx: { rating: -0.05 },
                cb: function () {
                  PVZ.state.scheduleConsequence('neighbor_rude', 2);
                  msg('Сосед ушёл обиженным. Такое не забывают.', 'bad');
                }
              }
            ]
          });
        }
      },
      {
        id: 'review', weight: 3,
        run: function () {
          PVZ.state.addRating(0.03);
          msg('Покупатель оставил отзыв: «Быстро и вежливо» ★★★★★', 'good');
          PVZ.audio.level();
        }
      },
      {
        id: 'power', weight: 2,
        run: function () {
          startQTE({
            type: 'breakers',
            title: 'Автомат выбило',
            sub: 'Переключите автоматы в щитке, пока не погас свет',
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.03); msg('Свет вернулся!', 'good'); }
              else { st.lightsOn = false; PVZ.state.addRating(-0.04); msg('Свет погас — включите в зале.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'kid', weight: 1,
        run: function () {
          openDialog({
            name: 'Ребёнок',
            person: null,
            role: 'потерялся',
            text: 'Маленький мальчик потерялся у примерочной и плачет.',
            choices: [
              {
                label: 'Успокоить и позвать родителей по громкой связи',
                hint: '4 мин · +репутация',
                fx: { time: 4, rating: 0.09 },
                cb: function () {
                  PVZ.state.scheduleConsequence('kid_saved', 2);
                  msg('Родители нашлись, ребёнок цел. Они запомнили ваш пункт.', 'good');
                  PVZ.audio.level();
                }
              },
              {
                label: 'Дать жвачку и вернуться к работе',
                hint: '1 мин · −репутация',
                fx: { time: 1, rating: -0.06 },
                cb: function () { msg('Мальчик остался один — покупатели косились.', 'bad'); }
              }
            ]
          });
        }
      },
      /* --- события, которые включаются со 2–7 дня --- */
      {
        id: 'crush', weight: 3, minDay: 2,
        run: function () {
          openDialog({
            name: 'Очередь',
            person: null,
            role: 'скандал в зале',
            text: 'В зале скопилась очередь, и двое покупателей уже спорят, кто первый. Все смотрят на вас.',
            choices: [
              {
                label: 'Выйти к ним и развести по талонам',
                hint: '5 мин · +репутация',
                fx: { time: 5, rating: 0.07 },
                cb: function () { msg('Разобрались по талонам, очередь успокоилась.', 'good'); }
              },
              {
                label: 'Крикнуть «соблюдайте очередь!» со стойки',
                hint: '2 мин · −репутация',
                fx: { time: 2, rating: -0.07 },
                cb: function () { msg('Стало тише, но обидчиков прибавилось.', 'bad'); }
              },
              {
                label: 'Не отвлекаться — обслуживать по одному',
                hint: '3 мин · +терпение',
                fx: { time: 3, rating: 0.02 },
                cb: function () {
                  st.queue.forEach(function (c) { c.patience = U.clamp(c.patience + 0.16, 0.1, 1); });
                  msg('Очередь дождалась спокойнее.', 'info');
                }
              }
            ]
          });
        }
      },
      {
        id: 'netdown', weight: 3, minDay: 3,
        run: function () {
          startQTE({
            type: 'hold',
            title: 'Пропал интернет',
            sub: 'Поднимите терминал: удерживайте кнопку, пока не поймаем сеть',
            hard: st.day > 5,
            onDone: function (ok) {
              if (ok) { PVZ.state.addRating(0.05); msg('Сеть вернулась, очередь пошла быстрее.', 'good'); }
              else { st.clock += 8; PVZ.state.addRating(-0.07); msg('Терминал завис — 8 минут простоя.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'audit', weight: 2, minDay: 5,
        run: function () {
          startQTE({
            type: 'trace',
            title: 'Проверка накладных',
            sub: 'Распишитесь в акте сверки, не отрывая руки',
            hard: true,
            onDone: function (ok) {
              if (ok) { PVZ.state.addMoney(140); st.stats.revenue += 140; PVZ.state.addRating(0.05); msg('Акт сверки подписан, документы в порядке: +140 ₽', 'good'); }
              else { PVZ.state.addRating(-0.09); msg('Акт пришлось переоформлять — замечание.', 'bad'); }
            }
          });
        }
      },
      {
        id: 'inspection', weight: 2, minDay: 7,
        run: function () {
          openDialog({
            name: 'Комиссия',
            person: null,
            role: 'плановая проверка',
            text: 'Комиссия проверяет чистоту, сроки хранения и работу с возвратами. На складе как раз стоит просрочка.',
            choices: [
              {
                label: 'Показать всё и сразу убрать просрочку',
                hint: '7 мин · +репутация',
                fx: { time: 7, rating: 0.11 },
                cb: function () { msg('Комиссия: «Порядок, замечаний нет».', 'good'); PVZ.state.addMoney(200); st.stats.revenue += 200; }
              },
              {
                label: 'Показать то, что успели подготовить',
                hint: '4 мин · −репутация',
                fx: { time: 4, rating: -0.06 },
                cb: function () { msg('Половину замечаний записали в акт.', 'bad'); }
              },
              {
                label: 'Сказать, что склада нет и провести некуда',
                hint: '−репутация',
                fx: { rating: -0.14 },
                cb: function () { msg('Комиссия не оценила импровизацию. Серьёзное замечание.', 'bad'); }
              }
            ]
          });
        }
      },
      {
        id: 'bandit', weight: 2, minDay: 2,
        run: function () { spawnThreat('bandit'); }
      },
      {
        id: 'sick', weight: 2, minDay: 2,
        run: function () { spawnThreat('sick'); }
      },
      {
        id: 'fire', weight: 1, minDay: 4,
        run: function () { spawnThreat('fire'); }
      },
      /* --- динамика: блогер, час пик и интерес полиции к складу --- */
      {
        id: 'vlogger', weight: 2, minDay: 2,
        run: function () {
          openDialog({
            name: 'Блогер',
            person: null,
            role: 'снимает видео',
            text: 'Я снимаю ролик «Худший ПВЗ района». Улыбнитесь, вы в кадре. Или докажите, что вы лучший.',
            choices: [
              {
                label: 'Показать, как у вас всё устроено',
                hint: '4 мин · +репутация · чаевые',
                fx: { time: 4, rating: 0.1 },
                cb: function () {
                  PVZ.state.addMoney(120);
                  st.stats.revenue += 120;
                  PVZ.state.addRating(0.03);
                  PVZ.state.scheduleConsequence('vlogger_good', 2);
                  msg('Блогер ушёл довольный: +120 ₽. Ролик выйдет через пару смен.', 'good');
                  PVZ.audio.level();
                }
              },
              {
                label: 'Попросить не снимать зал',
                hint: '2 мин · −репутация',
                fx: { time: 2, rating: -0.04 },
                cb: function () {
                  PVZ.state.scheduleConsequence('vlogger_bad', 2);
                  msg('Блогер снял «запрет» на камеру. Через пару смен узнаете, что из этого вышло.', 'bad');
                }
              },
              {
                label: 'Проигнорировать и работать',
                hint: '2 мин · терпение очереди',
                fx: { time: 2 },
                cb: function () {
                  st.queue.forEach(function (c) { c.patience = U.clamp(c.patience + 0.05, 0.1, 1); });
                  msg('Вы просто работали — очередь даже чуть успокоилась.', 'info');
                }
              }
            ]
          });
        }
      },
      {
        id: 'rush', weight: 2, minDay: 1,
        run: function () { startRush(); }
      },
      {
        id: 'police_heat', weight: 2, minDay: 4,
        run: function () {
          var b = PVZ.state.banana();
          if (!b || !PVZ.state.hasApp('banana') || b.heat < 40) {
            msg('Участковый зашёл просто поздороваться. Пока всё спокойно.', 'info');
            return;
          }
          openDialog({
            name: 'Участковый',
            person: null,
            role: 'полиция',
            text: 'Добрый день. К нам поступила информация, что через ваш пункт продают товар в обход кассы. Пока неофициально. Поговорим?',
            choices: [
              {
                label: 'Всё отрицать',
                hint: '2 мин · подозрение +8',
                fx: { time: 2 },
                cb: function () {
                  PVZ.state.bananaHeat(8);
                  msg('Участковый сделал пометку в блокноте. Подозрение: ' + Math.round(PVZ.state.banana().heat) + '%.', 'bad');
                }
              },
              {
                label: 'Дать взятку',
                hint: '500 ₽ · подозрение −30',
                fx: { time: 3 },
                cb: function () {
                  if (PVZ.state.data.money < 500) {
                    PVZ.state.bananaHeat(10);
                    msg('Денег на взятку не нашлось. Участковый всё записал.', 'bad');
                    return;
                  }
                  PVZ.state.addMoney(-500);
                  PVZ.state.bananaHeat(-30);
                  msg('Конверт перекочевал в карман. Подозрение: ' + Math.round(PVZ.state.banana().heat) + '%.', 'good');
                }
              },
              {
                label: 'Показать чистые накладные',
                hint: '4 мин · +репутация · подозрение +4',
                fx: { time: 4, rating: 0.04 },
                cb: function () {
                  PVZ.state.bananaHeat(4);
                  msg('Проверка документов прошла спокойно.', 'good');
                }
              }
            ]
          });
        }
      }
    ];

    /* ---------------- час пик ---------------- */
    function startRush() {
      if (st.phase !== 'day' || !st.shiftOpen) return;
      if (st.tut && st.tut.on) return;
      if (st.rush && st.rush.on) return;
      st.rush = { on: true, t: 0, total: 38 };
      st.rushNext = U.rand(105, 165);
      st.spawnT = Math.min(st.spawnT, 0.8);
      PVZ.audio.level();
      msg('ЧАС ПИК! Покупатели идут потоком, чаевые +40%. Держите темп!', 'bad');
      for (var i = 0; i < 2; i++) {
        if (st.queue.length + (st.customer ? 1 : 0) < 6) spawnCustomer();
      }
    }

    function triggerEvent() {
      if (st.qte || st.dlg || st.terminal || st.phone || st.laptop) return;
      if (st.threat) return;
      var pool = EVENTS.filter(function (e) {
        if (e.minDay && st.day < e.minDay) return false;
        if (e.id === 'review_bomb' && st.reviewBombDay === st.day) return false;
        return true;
      });
      var total = 0;
      pool.forEach(function (e) { total += e.weight; });
      var r = Math.random() * total;
      for (var i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) { pool[i].run(); return; }
      }
      pool[0].run();
    }

    /* ---------------- горячие точки ---------------- */
    function supplyRect(i) { return { x: 330 + i * 118, y: 548, w: 104, h: 96 }; }

    function buildHots() {
      var h = [];
      var L = art.LAYOUT;
      var c = L.counter, hl = L.hall, wh = L.warehouse;
      if (st.view === 'counter') {
        if (st.customer) {
          var codeKnown = st.customer.codeScanned || st.customer.dictated;
          h.push({ id: 'customer', rect: c.customer, label: st.customer.moving ? 'Подходит…' : st.held ? (st.held.unpacked ? 'Отдать товар' : 'Выдать заказ') : (!codeKnown && st.customer.kind === 'pickup' ? 'Телефон покупателя' : st.customer.kind === 'shady' ? '??? — поговорить' : 'Обслужить') });
        }
        // посылка на столе: сначала кладём, потом сканируем и вскрываем
        if (st.held && !st.held.onTable) {
          h.push({ id: 'parcel', rect: c.parcelOnTable, label: 'Положить ' + st.held.code + ' на стол' });
        } else if (st.held && st.held.onTable) {
          h.push({
            id: 'parcel', rect: c.parcelOnTable,
            label: st.held.unpacked ? 'Товар в руках' : st.held.scanned ? 'Вскрыть коробку ' + st.held.code :
              (st.scannerHeld ? 'Сканировать ' + st.held.code : 'Нужен сканер')
          });
        }
        // сканер уходит со стола в руку — его горячая точка больше не нужна
        if (!st.scannerHeld) h.push({ id: 'scanner', rect: c.scanner, label: 'Взять сканер' });
        h.push({
          id: 'laptop', rect: c.laptop,
          label: (PVZ.talks && PVZ.talks.pendingCount && PVZ.talks.pendingCount(PVZ.state.data) > 0)
            ? 'Ноутбук (L) · новое сообщение' : 'Ноутбук (L)'
        });
        if (art.has('decor_clock')) h.push({ id: 'deskClock', rect: c.deskClock, label: U.fmtTime(st.clock) });
        if (PVZ.state.data && PVZ.state.data.cat) h.push({ id: 'deskCat', rect: { x: 1088, y: 552, w: 148, h: 156 }, label: 'Погладить ' + PVZ.state.data.cat.name });
        h.push({ id: 'warehouseDoor', rect: c.warehouseDoor, label: 'На склад' });
        h.push({ id: 'entrance', rect: c.entrance, label: 'В зал' });
        if (st.phase === 'evening') h.push({ id: 'cash', rect: c.cash, label: 'Сверить кассу' });
      } else if (st.view === 'hall') {
        h.push({ id: 'door', rect: hl.door, label: st.doorOpen ? 'Закрыть дверь' : 'Дверь закрыта' });
        h.push({ id: 'light', rect: hl.light, label: 'Свет' });
        h.push({ id: 'fitting', rect: hl.fitting, label: 'Примерочная' });
        h.push({ id: 'counter', rect: hl.counter, label: 'К стойке' });
        var susN = PVZ.boxes ? PVZ.boxes.count() : 0;
        if (susN > 0) h.push({ id: 'sus', rect: susRect(), label: 'Забытые посылки: ' + susN });
        if (st.phase === 'evening') {
          st.dust.forEach(function (d, i) {
            if (!d.done) h.push({ id: 'dust' + i, rect: { x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2 }, label: 'Убрать мусор' });
          });
        }
      } else if (st.view === 'warehouse') {
        sys.RACKS.forEach(function (r) {
          h.push({ id: 'rack' + r, rect: wh['rack' + r], label: 'Стеллаж ' + r });
        });
        h.push({ id: 'back', rect: wh.back, label: 'К стойке' });
        h.push({ id: 'returnsZone', rect: wh.returns, label: 'Зона возвратов (' + returnOrders().length + ')' });
        supplyOrders().forEach(function (o, i) {
          h.push({ id: 'supply' + o.id, rect: supplyRect(i), label: 'Разложить ' + o.code });
        });
      } else if (st.view === 'rack') {
        h.push({ id: 'backRack', rect: { x: 20, y: 340, w: 150, h: 44 }, label: 'На склад' });
      }
      return h;
    }

    function cellRects() {
      var gx = 350, gy = 174, gw = 700, gh = 348;
      var cw = gw / sys.COLS, ch = gh / sys.ROWS;
      var out = [];
      for (var r = 0; r < sys.ROWS; r++) {
        for (var c = 0; c < sys.COLS; c++) {
          out.push({
            id: sys.cellId(st.rack, r, c),
            rack: st.rack, row: r, col: c,
            x: gx + c * cw + 8, y: gy + r * ch + 7,
            w: cw - 16, h: ch - 14
          });
        }
      }
      return out;
    }

    /* ---------------- пасхалка: Konami-код ---------------- */
    var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var konamiBuf = [];
    function trackKonami(k) {
      if (PVZ.state.hasEgg('konami')) return;
      var key = String(k || '');
      if (key.length === 1) key = key.toLowerCase();
      konamiBuf.push(key);
      if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
      if (konamiBuf.length < KONAMI.length) return;
      var hitCode = true;
      for (var i = 0; i < KONAMI.length; i++) {
        if (konamiBuf[i] !== KONAMI[i]) { hitCode = false; break; }
      }
      if (hitCode) {
        konamiBuf = [];
        foundHiddenEgg('konami');
        PVZ.audio.level();
        PVZ.state.eggTaps = PVZ.state.eggTaps || {};
        PVZ.state.eggTaps.konami = 1;
        PVZ.state.save();
      }
    }

    function setView(v) {
      if (st.arrest) return;
      if (st.qte || st.dlg || st.terminal || st.laptop || st.unpack) return;
      if (v === st.view) return;
      if (v === 'rack' || v === 'warehouse') PVZ.audio.step();
      st.view = v;
      st.viewFade = 0.24;
      st.msg = null;
    }

    /* ---------------- API сцены ---------------- */
    api.debug = {
      st: st,
      spawn: spawnCustomer,
      step: stepUpCustomer,
      take: function (id) { var o = orderById(id); if (o) takeFromCell(o); },
      view: setView,
      msg: msg,
      startPhase: startPhase,
      terminal: openTerminal,
      shop: function () { openLaptop(); openLaptopApp('market'); },
      laptop: openLaptop,
      appstore: function () { openLaptop(); openAppStore(); },
      installApp: function (id) { return PVZ.state.installApp(id); },
      installCore: function () {
        PVZ.apps.CORE.forEach(function (id) { if (!PVZ.state.hasApp(id)) PVZ.state.installApp(id); });
        syncAppsObjective();
      },
      openApp: function (id) { if (!st.laptop) openLaptop(); openLaptopApp(id); },
      phone: function () { openThreatPhone(); },
      threat: spawnThreat,
      event: triggerEvent,
      finish: finishEvening,
      shady: function () { spawnCustomer('shady'); },
      /* особые гости и микросценки выдачи */
      special: function (id) {
        if (!PVZ.serve) return null;
        var def = id ? PVZ.serve.specialById(id) : PVZ.serve.specialForDay(st.day, PVZ.state.data);
        if (!def) return null;
        return spawnSpecial(def);
      },
      specialList: function () {
        return PVZ.serve ? PVZ.serve.SPECIALS.map(function (d) { return d.id + ':' + d.day; }) : [];
      },
      moments: function () {
        return PVZ.serve ? PVZ.serve.MOMENTS.map(function (m) { return m.id; }) : [];
      },
      tryon: function () {
        var c = st.customer;
        if (!c) return null;
        var o = firstOrderFor(c) || st.orders.find(function (x) { return x.state === 'stored' && x.kind === 'clothes'; });
        if (!o) return null;
        o.state = 'fitting';
        o.cellSaved = o.cell;
        o.cell = null;
        c.kind = 'fitting-back';
        c.fittingOrder = o;
        c.fittingDone = true;
        c.expr = 'happy';
        c.arrived = true;
        c.moving = false;
        c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
        openFittingBack(c);
        return o;
      },
      /* отладка постоянных персонажей: покупатель и его личная история */
      cast: function (id) {
        if (!PVZ.cast) return null;
        var ch = id ? PVZ.cast.byId(id) : PVZ.cast.pick(st.day, PVZ.state.data);
        if (!ch) return null;
        spawnCustomer('question');
        var c = st.queue[st.queue.length - 1];
        if (!c) return null;
        PVZ.cast.dress(c, ch);
        var cm = PVZ.cast.moodOf(ch);
        if (cm) {
          var mo = sys.mood(cm);
          c.mood = mo.id;
          c.moodLabel = mo.label;
          c.moodIcon = mo.icon;
        }
        c.castBeat = PVZ.cast.nextBeat(ch, PVZ.state.data);
        return c;
      },
      castTalk: function (id) {
        var c = api.debug.cast(id);
        if (!c) return null;
        stepUpCustomer();
        c.arrived = true;
        c.moving = false;
        c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
        var ch = PVZ.cast.byId(c.castId);
        var beat = c.castBeat || PVZ.cast.nextBeat(ch, PVZ.state.data);
        if (!beat) return null;
        openCastBeat(c, ch, beat, 0, beat.open, function () {});
        return beat;
      },
      /* отладка «забытых» посылок */
      box: function (kindId) {
        if (!PVZ.boxes) return null;
        var b = PVZ.boxes.add(kindId, st.day);
        st.view = 'hall';
        openBoxFor(b);
        return b;
      },
      sus: function () { st.view = 'hall'; return PVZ.boxes ? PVZ.boxes.shelf() : []; },
      /* отладка кривой толпы: интервал прихода и предел очереди по дню */
      crowd: function (d) {
        d = d || st.day;
        return {
          base: spawnBase(d),
          max: Math.min(QUEUE_SLOTS.length, 2 + Math.floor(Math.max(0, d - 1) * 0.75)),
          slots: QUEUE_SLOTS.length
        };
      },
      referral: function (id) {
        if (!PVZ.cast) return null;
        var ch = PVZ.cast.byId(id || 'marina');
        var ref = PVZ.cast.makeReferral(ch, st.day);
        if (!ref) return null;
        st.refQueue.push({ charId: ref.char.id, by: ref.by });
        return ref;
      },
      /* отладка сюжетного покупателя: без id — тот, кто заходит сегодня */
      npc: function (id) {
        if (!PVZ.talks) return null;
        var npc = id ? PVZ.talks.npcById(id) : (PVZ.talks.dueNpc(st.day, PVZ.state.data) || {}).npc;
        if (!npc) return null;
        var beat = PVZ.talks.nextBeat(npc, PVZ.state.data) || PVZ.talks.genericBeat(npc, st.day);
        spawnStoryNpc(npc, beat);
        return beat;
      },
      /* отладка разговора: открыть тему у текущего покупателя */
      talk: function (topicId) {
        var c = st.customer;
        if (!c || !PVZ.talks) return null;
        var topic = topicId ? PVZ.talks.topicById(topicId) : (c.talkTopic || PVZ.talks.pickTopic(PVZ.state.data));
        if (!topic) return null;
        c.talkTopic = topic;
        openTalk(c, topic, 0, topic.open, function () { openPickupDialog(c); });
        return topic;
      },
      chat: function (id) {
        if (!st.laptop) openLaptop();
        openLaptopApp('chat');
        if (id && st.laptop) st.laptop.chatWith = id;
      },
      banana: function () {
        PVZ.state.installApp('banana');
        PVZ.state.banana().met = true;
        if (!st.laptop) openLaptop();
        openLaptopApp('banana');
        st.laptop.banana = { tab: 'buy' };
      },
      rush: startRush,
      arrest: function () {
        var b = PVZ.state.banana();
        if (b) b.heat = 100;
        startArrest();
      },
      dayMod: function (id) {
        st.dayMod = dayModById(id);
        st.plan = Math.max(6, planFor(st.day) + (st.dayMod.planAdd || 0));
        if (PVZ.state.data) PVZ.state.data.lastDayMod = st.dayMod.id;
        return st.dayMod;
      },
      story: checkMafiaStory,
      mafiaVisit: openMafiaVisit,
      receive: function () {
        var o = supplyOrders()[0];
        if (o) receiveBox(o);
      },
      /* отладка вскрытия: сразу поставить коробку на стол и открыть сцену */
      unpack: function () {
        var o = st.orders.find(function (x) { return x.state === 'stored'; });
        if (!o) return null;
        if (!st.held || st.held.code !== o.code) {
          st.held = {
            id: o.id, code: o.code, item: o.item, kind: o.kind, size: o.size,
            scanned: true, onTable: true, unpacked: false, placeT: 1
          };
        }
        st.held.onTable = true;
        st.held.scanned = true;
        startUnpack();
        return st.unpack;
      },
      unpackFinish: unpackFinish
    };

    api.enter = function () {
      if (cfg.resume && PVZ.state.data && PVZ.state.data.shift) {
        var s = PVZ.state.data.shift;
        st.day = s.day || st.day;
        st.phase = s.phase || st.phase;
        st.clock = s.clock || st.clock;
        st.orders = s.orders || [];
        // старые сохранения могли оставить коробку «на руках» — возвращаем её в лоток
        st.orders.forEach(function (o) {
          if (o.state === 'placing') { o.state = 'new'; o.cell = null; }
        });
        st.plan = s.plan || planFor(st.day);
        st.stats = Object.assign(st.stats, s.stats || {});
        st.shiftOpen = !!s.shiftOpen;
        st.doorOpen = !!s.doorOpen;
        st.lightsOn = !!s.lightsOn;
        st.objectives = s.objectives || [];
        st.dayMod = dayModById(s.dayMod);
        st.combo = s.combo || 0;
        st.held = s.held || null;
        if (st.held) {
          // старые сохранения не знают про вскрытие — считаем коробку целой
          var ho = orderById(st.held.id);
          if (!st.held.kind && ho) st.held.kind = ho.kind;
          st.held.unpacked = !!st.held.unpacked;
          st.held.onTable = !!st.held.onTable;
          st.held.scanned = !!st.held.scanned;
          st.held.placeT = 1;
        }
        st.scannerHeld = !!s.scannerHeld;
        st.refQueue = Array.isArray(s.refQueue) ? s.refQueue : [];
        st.rush = s.rush && s.rush.on ? { on: true, t: s.rush.t || 0, total: s.rush.total || 38 } : null;
        // старые сохранения: добавляем задачу на установку приложений
        if (st.phase === 'morning' && !st.objectives.some(function (o) { return o.id === 'apps'; })) {
          var coreReady = PVZ.apps.coreReady();
          st.objectives.unshift({
            id: 'apps',
            text: 'Установить приложения',
            done: coreReady,
            progress: (PVZ.apps.CORE.length - PVZ.apps.missingCore().length) + '/' + PVZ.apps.CORE.length
          });
        }
        st.dust = s.dust || [];
        if (st.phase === 'evening' && !st.dust.length) {
          st.dust = [
            { x: 360, y: 636, r: 30, done: false },
            { x: 742, y: 604, r: 26, done: false },
            { x: 1010, y: 628, r: 28, done: false }
          ];
        }
        st.view = 'counter';
        tutRecompute();
        syncAppsObjective();
        runConsequences();
        msg('Смена продолжается. День ' + st.day + '.', 'info');
        return;
      }
      buildDay();
      // день в сейве и в смене должны совпадать: от этого зависят визиты и переписка
      if (PVZ.state.data && (PVZ.state.data.day || 1) !== st.day) {
        PVZ.state.data.day = st.day;
        PVZ.state.save();
      }
      startPhase(st.phase === 'day' ? 'day' : st.phase === 'evening' ? 'evening' : 'morning', true);
      if (st.phase === 'morning') {
        st.objectives = sys.morningObjectives(supplyFor(st.day));
        msg('07:45. Подготовьте ПВЗ к открытию: приложения на ноутбуке, свет, терминал, поставка, дверь.', 'info');
      } else if (st.phase === 'evening') {
        msg('Смена закрывается: дверь, возвраты, касса.', 'info');
      } else {
        msg('Смена идёт. План — ' + st.plan + ' выдач.' + boxNote(), 'info');
      }
      if (PVZ.state.endless() && (PVZ.state.data.totals.days || 0) === 0) {
        msg('Бесконечный режим: мафии нет, смены не кончаются. Вечером придёт арендодатель — ставка плюс доля выручки.', 'info');
      }
      // обучение возобновляется с первой невыполненной задачи
      tutRecompute();
      syncAppsObjective();
      runConsequences();
    };

    /* Насколько напряжённо сейчас в зале — для адаптивной музыки */
    api.musicTension = function () {
      var t = 0.12;
      var inLine = st.queue.length + (st.customer ? 1 : 0);
      t += Math.min(1, inLine / 5) * 0.34;
      if (st.customer) t += (1 - U.clamp(st.customer.patience, 0, 1)) * 0.3;
      var rating = PVZ.state.data ? PVZ.state.data.rating : 5;
      if (rating < PVZ.balance.ratingWarn) t += Math.min(0.25, (PVZ.balance.ratingWarn - rating) * 0.15);
      if (st.phase === 'evening') t += 0.08;
      if (st.rush && st.rush.on) t += 0.14;
      t += Math.min(0.12, st.combo * 0.008);
      if (st.clock > 20 * 60) t += 0.1;
      if (st.qte || st.terminal) t += 0.07;
      return U.clamp(t, 0, 1);
    };

    /* Фаза смены выбирает музыкальную тему: утро, день или вечер */
    api.musicPhase = function () { return st.phase; };
    /* Пока открыт разговор с мафией, играет страшная тема */
    api.musicMood = function () { return st.dlg && st.dlg.scary ? 'scary' : 'calm'; };

    api.exit = function () {};

    api.serialize = function () {
      return {
        day: st.day,
        phase: st.phase,
        clock: st.clock,
        plan: st.plan,
        orders: st.orders,
        stats: st.stats,
        shiftOpen: st.shiftOpen,
        doorOpen: st.doorOpen,
        lightsOn: st.lightsOn,
        objectives: st.objectives,
        dust: st.dust,
        dayMod: st.dayMod && st.dayMod.id,
        combo: st.combo,
        held: st.held,
        scannerHeld: st.scannerHeld,
        refQueue: st.refQueue || [],
        rush: st.rush && st.rush.on ? { on: true, t: st.rush.t, total: st.rush.total } : null
      };
    };

    /* Терпение идёт, даже когда открыт ноутбук или мини-игра: ожидание
       не должно замирать. Возвращает true, если покупатель у стойки ушёл. */
    function tickPatience(dt) {
      if (st.phase !== 'day' || !st.shiftOpen) return false;
      var left = false;
      if (st.customer) {
        var c = st.customer;
        c.atT = (c.atT || 0) + dt;
        if (c.arrived && !st.dev.patience) c.patience -= c.patienceRate * dt;
        if (c.patience <= 0) {
          if (c.kind === 'shady') leaveShady(c);
          else if (c.kind === 'npc') {
            msg(c.name + ' не дождался: «Ладно, зайду в другой раз».', 'info');
            leaveNpc(c);
          } else leaveCustomer(c, false, 'Покупатель не дождался и ушёл');
          left = true;
        }
      }
      st.queue.forEach(function (cq) {
        cq.waitT += dt;
        if (!st.dev.patience) {
          if (cq.kind === 'npc') cq.patience = Math.max(0.3, cq.patience - 0.0012 * dt);
          else cq.patience = Math.max(0.08, cq.patience - 0.0026 * patienceScale(st.day) * dt / sys.mood(cq.mood).patience);
        }
      });
      return left;
    }

    api.update = function (dt) {
      st.t += dt;
      if (st.viewFade > 0) st.viewFade = Math.max(0, st.viewFade - dt);
      if (checkRunState()) return;
      // 100% подозрения: полицейский приходит в зал (сбыт/покупка/событие)
      checkBananaArrest();
      syncAppsObjective();
      // сюжет мафии: сцены показываем в паузах между покупателями
      st.storyT = (st.storyT || 0) + dt;
      if (st.storyT > 1.6) {
        st.storyT = 0;
        checkMafiaStory();
        checkBossCall();
      }
      updateFriend(dt);
      st.saveT = (st.saveT || 0) + dt;
      if (st.saveT > 15) {
        st.saveT = 0;
        if (!st.qte && !st.dlg && !st.terminal && !st.unpack) { try { PVZ.game.persist(); } catch (e) { /* ignore */ } }
      }
      if (st.handoff) {
        st.handoff.t += dt;
        if (st.handoff.t > 1.1) st.handoff = null;
      }
      if (st.moment) st.moment.t = (st.moment.t || 0) + dt;
      if (st.smash) {
        st.smash.t += dt;
        if (st.smash.t > 1.3) st.smash = null;
      }
      if (st.specialBanner > 0) st.specialBanner = Math.max(0, st.specialBanner - dt);
      if (st.held && st.held.onTable && st.held.placeT < 1) {
        st.held.placeT = Math.min(1, (st.held.placeT || 0) + dt * 3.4);
      }
      if (st.msg) {
        st.msgT += dt;
        if (st.msgT > 4.5) st.msg = null;
      }
      if (st.comboFlash > 0) st.comboFlash = Math.max(0, st.comboFlash - dt * 1.6);
      if (st.bellRinging > 0) st.bellRinging -= dt;
      tutUpdate(dt);
      updateThreat(dt);
      // вскрытие посылки — отдельная сцена-крупный план, время смены замирает
      if (st.unpack) { unpackUpdate(dt); return; }
      // после закрытия смены ждём только вечерний диалог (визит мафии),
      // иначе он не анимируется и остаётся невидимым
      if (st.finished && !st.dlg) return;

      // кот живёт своей жизнью: сидит, спит, умывается, играет
      var deskCat = PVZ.state.data && PVZ.state.data.cat;
      if (deskCat && st.catAnim) {
        var ca = st.catAnim;
        ca.t += dt;
        if (ca.anim === 'happy' && ca.t > 3.2) { ca.anim = 'sit'; ca.t = 0; }
        else if (ca.anim !== 'happy' && ca.t > 7.5) {
          ca.anim = U.pick(['sit', 'sleep', 'groom', 'play', 'sit']);
          ca.t = 0;
        }
      }

      // арест: полицейский идёт к стойке, диалог, наручники.
      // Время смены на это время замирает — иначе вечер закроет ПВЗ посреди сцены.
      if (st.arrest) {
        updateArrest(dt);
        if (st.dlg) st.dlg.update(dt);
        updateCrowd(dt);
        return;
      }

      // всплывающие сообщения и модальные окна
      if (st.qte) {
        var q = st.qte;
        q.update(dt);
        // мини-игра не останавливает терпение покупателей
        tickPatience(dt);
        if (st.qte === q && q.done) {
          q.closeDelay -= dt;
          if (q.closeDelay <= 0) st.qte = null;
        }
        return;
      }
      if (st.laptop) {
        st.laptop.t += dt;
        if (st.laptop.mode === 'appstore') st.laptop.appstore.update(dt);
        if (st.laptop.mode === 'shop') st.laptop.shop.update(dt);
        if (st.laptop.mode === 'reviews') st.laptop.reviews.update(dt);
        if (st.laptop.mode === 'phone' && st.laptop.phone) st.laptop.phone.update(dt);
        if (st.laptop.mode === 'game') updateLaptopGame(dt);
        if (st.laptop.mode === 'snake') st.laptop.snake.update(dt);
        if (st.laptop.mode === 'memory') st.laptop.memory.update(dt);
        if (st.laptop.mode === 'premium') PVZ.apps.updatePremium(st.laptop.premium, dt);
        // ноутбук не пауза: очередь и клиент у стойки продолжают ждать
        tickPatience(dt);
        syncAppsObjective();
        return;
      }
      if (st.terminal) { st.terminal.update(dt); updateCrowd(dt); return; }
      if (st.phone) { updateCrowd(dt); return; }
      if (st.dlg) { st.dlg.update(dt); updateCrowd(dt); return; }

      // время
      st.clock += dt * phaseRate();
      if (st.phase === 'morning') {
        st.clock = Math.min(st.clock, DAY_START);
      } else if (st.phase === 'day') {
        if (st.clock >= EVENING_START) { startPhase('evening'); return; }
      } else if (st.phase === 'evening') {
        st.clock = Math.min(st.clock, CLOSE_LIMIT);
        if (st.clock >= CLOSE_LIMIT && !st.forcedClose) {
          st.forcedClose = true;
          msg('ПВЗ закрывается принудительно: рабочее время вышло.', 'bad');
          finishEvening();
          return;
        }
      }

      // примерочная
      if (st.fitting.length) {
        for (var i = st.fitting.length - 1; i >= 0; i--) {
          var f = st.fitting[i];
          f.t -= dt;
          if (f.t <= 0) {
            st.fitting.splice(i, 1);
            finishFitting(f);
          }
        }
      }

      // покупатели
      if (st.phase === 'day' && st.shiftOpen) {
        // час пик: короткий шквал покупателей с двойными чаевыми
        if (st.rush && st.rush.on) {
          st.rush.t += dt;
          if (st.rush.t >= st.rush.total) {
            st.rush.on = false;
            st.rushNext = U.rand(105, 165);
            PVZ.audio.level();
            msg('Час пик закончился — можно выдохнуть.', 'good');
          }
        } else {
          if (!(st.tut && st.tut.on)) st.rushNext -= dt;
          if (st.rushNext <= 0 && st.clock > 11 * 60 && st.clock < 19 * 60) startRush();
        }

        st.spawnT -= dt;
        var inLine = st.queue.length + (st.customer ? 1 : 0);
        var maxLine = maxLineFor(st.day);
        if (st.spawnT <= 0 && inLine < maxLine && st.clock < 19 * 60 + 30 && st.doorOpen) {
          var tutPick = st.tut && st.tut.on && !st.tut.firstSpawned && st.stats.served === 0;
          if (tutPick) {
            st.tut.firstSpawned = true;
            spawnCustomer('pickup');
          } else {
            spawnCustomer();
          }
          scheduleSpawn();
        }
        if (!st.customer && st.queue.length && st.nextT <= 0) stepUpCustomer();
        if (st.nextT > 0) st.nextT -= dt;

        // с пятой смены приходит мутный тип с «Banana store» (если ещё не приходил)
        var bn = PVZ.state.banana();
        if (st.day >= 5 && bn && !bn.met && !PVZ.state.hasApp('banana')) {
          st.shadyCooldown = Math.max(0, (st.shadyCooldown || 0) - dt);
          var shadyHere = st.queue.some(function (q) { return q.kind === 'shady'; }) ||
            !!(st.customer && st.customer.kind === 'shady');
          if (!shadyHere && st.shadyCooldown <= 0) {
            spawnCustomer('shady');
            st.shadyCooldown = 150;
            scheduleSpawn();
          }
        }

        // сюжетные знакомые: почти каждый день кто-то заходит поговорить
        if (!st.npcSpawned && PVZ.talks) {
          st.npcT = (st.npcT || 0) - dt;
          if (st.npcT <= 0) {
            st.npcT = 20;
            if (st.clock >= 10 * 60 && !(st.tut && st.tut.on) && !st.arrest) {
              var due = PVZ.talks.dueNpc(st.day, PVZ.state.data);
              // в бесконечном режиме знакомые иногда заходят просто так
              if (!due && PVZ.state.endless() && st.day % 3 === 0) {
                var npcIdle = PVZ.talks.npcForDay(st.day);
                if (npcIdle) due = { npc: npcIdle, beat: PVZ.talks.genericBeat(npcIdle, st.day) };
              }
              var spawnDay = PVZ.state.data && PVZ.state.data.npcSpawnDay;
              if (due && !(spawnDay && spawnDay[due.npc.id] === st.day)) {
                spawnStoryNpc(due.npc, due.beat);
                st.npcSpawned = true;
                scheduleSpawn();
              }
            }
          }
        }

        // особый гость смены: у каждого дня свой характер и свой визит
        if (PVZ.serve && !(st.tut && st.tut.on) && !st.arrest && st.doorOpen) {
          if (!st.special || st.special.done) {
            var spDef = PVZ.serve.dueSpecial(st.day, st.clock, PVZ.state.data);
            if (spDef) spawnSpecial(spDef);
          }
          updateSpecial(dt);
        }

        // «забытые» посылки напоминают о себе: тикают, мяукают, храпят
        if (PVZ.boxes && PVZ.boxes.count()) {
          st.susT -= dt;
          if (st.susT <= 0) {
            st.susT = U.rand(45, 85);
            var sb = PVZ.boxes.ambientBox();
            if (sb) {
              var tn = PVZ.boxes.tone(sb.kind);
              if (PVZ.audio && PVZ.audio.tone) PVZ.audio.tone(tn[0], tn[1], tn[2], tn[3]);
              st.susPing = { id: sb.id, t: 0 };
              msg(PVZ.boxes.soundLine(sb) + ' Забытая посылка ждёт в зале.', 'info');
            }
          }
        }
        if (st.susPing) {
          st.susPing.t = (st.susPing.t || 0) + dt;
          if (st.susPing.t > 2.6) st.susPing = null;
        }

        // терпение (общая логика — в tickPatience)
        if (tickPatience(dt)) {
          updateCrowd(dt);
          return;
        }

        st.eventT -= dt;
        if (st.eventT <= 0) {
          triggerEvent();
          st.eventT = U.rand(Math.max(9, 20 - st.day * 1.2), Math.max(14, 30 - st.day * 1.1)) * ((st.dayMod && st.dayMod.events) || 1);
        }
      }

      if (st.phase === 'evening') {
        if (!st.lateDone && st.clock >= EVENING_START + 32) {
          st.lateDone = true;
          if (!st.doorOpen) {
            st.lateWaiting = true;
            PVZ.audio.knock();
            msg('Стук в дверь: поздний покупатель. Откройте дверь.', 'bad');
          }
        }
        if (st.lateWaiting && st.doorOpen) {
          st.lateWaiting = false;
          var late = sys.makeCustomer({ expr: 'sad' });
          late.kind = 'late'; late.talon = st.talon++; late.patience = 1; late.patienceRate = 0.02;
          if (PVZ.cast) {
            var lateCh = PVZ.cast.pick(st.day, PVZ.state.data);
            if (lateCh) {
              PVZ.cast.dress(late, lateCh);
              late.moodIcon = '🌙';
              late.moodLabel = 'опоздавший';
            }
          }
          late.state = 'queue'; late.waitT = 0; late.bubble = null; late.bubbleAlpha = 0;
          late.orderIds = [];
          late.vx = 1240; late.vgy = 488; late.vh = 296 * late.height; late.enterAlpha = 0;
          late.moving = true; late.arrived = false; late.arrivedT = 0;
          st.queue.push(late);
          st.nextT = 0.5;
        }
      }

      updateCrowd(dt);
    };

    /* ---------------- отрисовка ---------------- */
    api.draw = function (ctx) {
      st.hots = buildHots();
      var night = st.clock > 18 * 60 + 30;
      var crowd = st.crowd;
      var laptopApp = st.laptop ? st.laptop.mode : 'home';
      if (st.view === 'counter') {
        art.drawCounterScene(ctx, {
          t: st.t,
          clock: st.clock,
          crowd: crowd.concat(threatCrowd()).concat(friendCrowd()).concat(arrestCrowd()),
          night: night,
          doorOpen: st.doorOpen,
          bellRinging: st.bellRinging > 0,
          passerby: 1,
          laptopApp: laptopApp,
          money: PVZ.state.data.money,
          reviewsFresh: sys.reviewStats().fresh,
          plan: st.plan,
          planDone: st.stats.served,
          storedCount: storedOrders().length,
          shiftOpen: st.shiftOpen,
          bestScore: PVZ.state.data.totals.minigame || 0,
          showCash: st.phase === 'evening',
          cashDone: st.cashDone,
          scannerHeld: st.scannerHeld,
          parcel: st.held && st.held.onTable ? st.held : null,
          carry: st.held && !st.held.onTable ? st.held : null,
          heldProduct: st.held && st.held.unpacked ? st.held : null,
          handoff: st.handoff,
          cat: PVZ.state.data.cat,
          catAnim: st.catAnim && st.catAnim.anim,
          phone: null
        });
        if (!st.lightsOn) {
          ctx.save();
          ctx.fillStyle = 'rgba(10,8,6,0.4)';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.restore();
          art.txt(ctx, 'Свет выключен', 640, 252, 22, 'rgba(255,240,220,0.55)', 800, 'center');
          art.txt(ctx, 'Выключатель в зале — дверь справа', 640, 278, 13, 'rgba(255,240,220,0.4)', 600, 'center');
        }
      } else if (st.view === 'hall') {
        art.drawHallScene(ctx, { t: st.t, night: night, doorOpen: st.doorOpen, fittingBusy: st.fitting.length > 0, lightsOn: st.lightsOn });
        drawSuspicious(ctx);
        if (st.phase === 'evening') st.dust.forEach(function (d) { if (!d.done) drawDust(ctx, d); });
        if (st.lateWaiting && !st.doorOpen) drawLateSilhouette(ctx);
        if (!st.lightsOn) {
          ctx.save();
          ctx.fillStyle = 'rgba(10,8,6,0.55)';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.restore();
          art.txt(ctx, 'Свет выключен', 640, 210, 26, 'rgba(255,240,220,0.45)', 700, 'center');
          art.txt(ctx, 'Выключатель в зале, у примерочной', 640, 242, 14, 'rgba(255,240,220,0.35)', 600, 'center');
        }
      } else if (st.view === 'warehouse') {
        var counts = {};
        sys.RACKS.forEach(function (r) {
          counts[r] = st.orders.filter(function (o) {
            return o.cell && o.cell.charAt(0) === r && o.state === 'stored';
          }).length;
        });
        art.drawWarehouseScene(ctx, {
          t: st.t,
          counts: counts,
          supply: supplyOrders(),
          returns: returnOrders().length,
          hoverRack: st.hover && st.hover.id && st.hover.id.indexOf('rack') === 0 ? st.hover.id.slice(4) : null
        });
        drawSupplyBoxes(ctx);
      } else if (st.view === 'rack') {
        drawRackView(ctx);
      }

      // мягкая смена вида: короткое затемнение вместо резкой склейки
      if (st.viewFade > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, st.viewFade / 0.24) * 0.85;
        ctx.fillStyle = '#0d0a08';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.restore();
      }

      // пожар поверх интерьера
      drawFireOverlay(ctx);
      // осколки и обломки, когда Гром сносит коробку с полки
      if (st.smash) art.drawSmash(ctx, st.smash);

      // подсветка
      st.hots.forEach(function (hot) {
        if (st.hover && st.hover.id === hot.id && hot.id.indexOf('supply') !== 0 && hot.id !== 'customer') {
          art.glowRect(ctx, hot.rect, st.t);
          labelChip(ctx, hot.rect, hot.label, true);
        }
      });
      if (st.hover && st.hover.id === 'customer') labelChip(ctx, st.hover.rect, st.hover.label, true);

      // HUD
      var cc = st.customer;
      art.drawHUD(ctx, {
        day: st.day,
        winDay: PVZ.state.endless() ? 0 : PVZ.balance.WIN_DAY,
        endless: PVZ.state.endless(),
        ratingWarn: PVZ.balance.ratingWarn,
        t: st.t,
        phase: st.phase,
        clock: st.clock,
        money: PVZ.state.data.money,
        revenue: st.stats.revenue,
        rating: PVZ.state.data.rating,
        ratingLog: PVZ.state.ratingTail(5),
        ratingTrend: PVZ.state.ratingTrend(),
        plan: st.phase === 'day' ? { done: st.stats.served, plan: st.plan } : null,
        objectives: (st.phase === 'day' || (st.tut && st.tut.on)) ? [] : st.objectives,
        streak: st.phase === 'day' ? st.combo : 0,
        streakFlash: st.comboFlash,
        rush: st.rush && st.rush.on ? { left: Math.max(0, st.rush.total - st.rush.t), total: st.rush.total } : null,
        dayMod: st.dayMod,
        held: st.held,
        customer: cc ? {
          name: (cc.name + ' ' + (cc.last || '')).trim(),
          talon: cc.talon,
          patience: cc.patience,
          code: cc.kind === 'pickup' ? cc.code : null,
          masked: !(cc.dictated || cc.codeScanned),
          kind: cc.kind,
          mood: cc.moodIcon,
          moodLabel: cc.moodLabel,
          walking: cc.moving,
          story: cc.story || null,
          phone: cc.phone === 'none' ? 'без телефона' : cc.phoneLabel,
          pay: cc.kind === 'pickup' ? payLabel(cc) : '',
          parcels: cc.parcels || 1
        } : null,
        queue: st.queue.length,
        scannerHeld: st.scannerHeld,
        tutorial: !!(st.tut && st.tut.on),
        dialog: !!st.dlg,
        hint: hintText()
      });

      // сообщение
      if (st.msg && !st.dlg) {
        var alpha = U.clamp(4.5 - st.msgT, 0, 1) * Math.min(1, st.msgT * 6);
        ctx.save();
        ctx.globalAlpha = alpha;
        var col = st.msgKind === 'bad' ? 'rgba(120,40,30,0.94)' : st.msgKind === 'good' ? 'rgba(32,90,58,0.94)' : 'rgba(30,22,18,0.9)';
        var w = Math.min(920, art.txtW(ctx, st.msg, 16, 700) + 56);
        var toastY = art.compact ? 516 : 624;
        art.panel(ctx, 640 - w / 2, toastY, w, 44, { bg: col, r: 22 });
        art.txt(ctx, st.msg, 640, toastY + 28, art.compact ? 17 : 16, '#fff3e2', 700, 'center');
        ctx.restore();
      }

      if (st.threat) drawThreatBanner(ctx);
      if (st.special && !st.special.done) drawSpecialBanner(ctx);
      if (st.tut && st.tut.on && !MODALS()) drawTutorial(ctx);

      if (st.phone) drawPhone(ctx);
      if (st.qte) st.qte.draw(ctx);
      if (st.terminal) st.terminal.draw(ctx);
      if (st.laptop) drawLaptop(ctx);
      if (st.unpack) art.drawUnpackScene(ctx, st.unpack);
      if (st.moment && st.dlg) {
        art.drawMomentScene(ctx, {
          kind: st.moment.kind,
          person: st.moment.person,
          person2: st.moment.person2,
          item: st.moment.item,
          title: st.moment.title,
          subtitle: st.moment.subtitle,
          t: st.moment.t || 0
        });
      }
      if (st.dlg) st.dlg.draw(ctx);
      drawArrestOverlay(ctx);

      // коробка в руке при перетаскивании
      if (st.drag && st.drag.active) {
        var dg = st.drag;
        ctx.save();
        ctx.globalAlpha = 0.97;
        ctx.translate(dg.x, dg.y);
        ctx.rotate(-0.055);
        ctx.shadowColor = 'rgba(16,10,5,0.45)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        art.drawParcel(ctx, -50, -40, 100, 80, { seed: dg.order.code.charCodeAt(0) % 6, code: dg.order.code });
        ctx.restore();
      }

      if (!st.qte && !st.dlg && !st.terminal && !st.laptop && !st.phone && !st.unpack) drawDev(ctx);
    };

    function hintText() {
      if (st.arrest) return st.arrest.stage === 'arriving' ? 'Полицейский идёт к стойке. Лучше не рыпаться.' : '';
      if (st.qte || st.dlg || st.terminal || st.phone || st.laptop) return '';
      if (st.threat) return THREAT_INFO[threatKey(st.threat)].hint;
      if (st.view === 'counter') {
        if (st.phase === 'morning') {
          if (!st.lightsOn) return 'Включите свет в зале — дверь справа.';
          if (!st.shiftOpen) return 'Откройте смену: ноутбук на столе (L) или клавиша T.';
          if (supplyOrders().length) return 'Примите поставку на складе (дверь слева): ' + supplyOrders().length + ' коробок.';
          if (!st.doorOpen) return 'Откройте входную дверь в зале (дверь справа).';
          return 'Утро: свет, поставка, дверь — и смена начнётся.';
        }
        if (st.phase === 'evening') {
          if (!st.cashDone) return 'Сверьте кассу, сдайте возвраты и закройте смену в терминале.';
          return 'Закройте смену в терминале (T).';
        }
        if (st.customer && st.customer.kind === 'special') {
          return 'Особый гость: нажмите на него и выберите, как поступить.';
        }
        if (st.special && !st.special.done && st.special.c && st.special.c.state === 'queue') {
          return 'Особый гость ждёт в очереди. Дождитесь его у стойки — и нажмите на него.';
        }
        if (st.customer) {
          if (st.customer.moving) return 'Покупатель подходит к стойке…';
          if (st.customer.kind === 'shady') return 'Мутный тип в странной одежде явно что-то задумал. Нажмите на него.';
          if (st.customer.castId && PVZ.cast && PVZ.cast.nextBeat(PVZ.cast.byId(st.customer.castId), PVZ.state.data)) {
            return 'У покупателя есть своя история — нажмите и выберите «Поговорить».';
          }
          if (st.held && isMine(st.customer, orderById(st.held.id))) {
            if (!st.held.onTable) return 'Посылка в руках: нажмите на свободное место слева на столе.';
            if (!st.held.scanned) return st.scannerHeld ? 'Нажмите на посылку на столе, чтобы отсканировать штрихкод.' : 'Возьмите сканер слева и нажмите на посылку на столе.';
            if (!st.held.unpacked) return 'Коробка на столе: нажмите на неё и вскройте — нож, пакет, товар.';
            return 'Товар в руках — нажмите на покупателя, чтобы отдать заказ.';
          }
          if (st.held) return 'В руках чужая посылка: клиент ждёт ' + st.customer.code + '.';
          if (st.customer.codeScanned || st.customer.dictated) {
            if (PVZ.state.mods().autoCarry) return 'Код известен. Возьмите заказ из ячейки — лента привезёт его к стойке.';
            return 'Код известен. Возьмите заказ из ячейки, положите на стол и отсканируйте.';
          }
          if (!st.scannerHeld && !PVZ.state.mods().autoCode) return 'Клиент показывает код — возьмите сканер слева на столе.';
          return 'Нажмите на покупателя и отсканируйте код с его телефона.';
        }
        if (st.queue.length) return 'Следующий покупатель подойдёт сам. Загляните в ноутбук (L).';
        if (PVZ.boxes && PVZ.boxes.count()) return 'В зале у стены стоит забытая посылка — загляните в зал (дверь справа).';
        return 'Покупателей нет — можно заглянуть в ноутбук (L) или в зал.';
      }
      if (st.view === 'warehouse') {
        if (supplyOrders().length) return 'Нажмите на коробку — откроется стеллаж, где её нужно перетащить на полку.';
        if (returnOrders().length) return 'Возвраты: ' + returnOrders().length + ' шт. в зоне возвратов.';
        return 'Выберите стеллаж и найдите нужную ячейку.';
      }
      if (st.view === 'rack') {
        if (st.drag && st.drag.active) return 'Отпустите коробку над свободной ячейкой.';
        if (supplyOrders().length) return 'Перетащите коробку из лотка приёмки в свободную ячейку.';
        if (st.targetCell) return 'Ваш заказ в ячейке ' + st.targetCell + '. Нажмите на посылку.';
        return 'Нажмите на посылку, чтобы взять её, или перетащите в другую ячейку.';
      }
      if (st.view === 'hall') {
        if (st.phase === 'evening') return 'Уберите мусор и закройте дверь.';
        if (st.phase === 'morning') return 'Включите свет и откройте входную дверь.';
        if (PVZ.boxes && PVZ.boxes.count()) return 'Забытые посылки: ' + PVZ.boxes.count() + '. Нажмите на стопку у стены.';
        return 'Вернитесь к стойке — нажмите на неё справа.';
      }
      return '';
    }

    /* --- дополнительные элементы --- */
    function drawDust(ctx, d) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(i * 2.2) * 12, d.y + Math.sin(i * 2.9) * 10, d.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? '#7a6a52' : '#8d7a5e';
        ctx.fill();
      }
      ctx.restore();
    }

    function drawLateSilhouette(ctx) {
      art.drawPerson(ctx, { skin: 2, hair: '#2a2119', style: 'short', shirt: '#39465a', pants: '#2c3542', expr: 'neutral' },
        640, 520, 260, { silhouette: 'rgba(12,16,24,0.85)', noShadow: true });
      art.bubble(ctx, 'Извините! Я опоздал, но очень нужна посылка…', 640, 300, { size: 15, maxW: 300 });
    }

    function drawSupplyBoxes(ctx) {
      var list = supplyOrders();
      for (var i = 0; i < list.length && i < 4; i++) {
        var r = supplyRect(i);
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        if (hov) art.glowRect(ctx, r, st.t, 'rgba(255,200,120,0.95)');
        art.drawParcel(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 10, { seed: i + 2, code: list[i].code });
      }
      if (list.length) {
        art.txt(ctx, 'ПРИЁМКА · ' + list.length + ' коробок · откройте стеллаж и перетащите их на полки', 560, 664, 13, 'rgba(255,255,255,0.85)', 700, 'center');
      }
    }

    function drawRackView(ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#9fa9ab');
      g.addColorStop(1, '#798385');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(330, 118, 740, 408);
      ctx.save();
      ctx.shadowColor = 'rgba(240,255,245,0.85)';
      ctx.shadowBlur = 70;
      art.fillRR(ctx, 520, 16, 240, 18, 8, '#f2fff6');
      ctx.restore();

      // вкладки стеллажей — переключаться можно, не уходя со склада
      var tabs = rackTabs();
      tabs.forEach(function (tb) {
        var active = tb.id === st.rack;
        var hov = U.hit(tb, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, tb.x, tb.y, tb.w, tb.h, 10, active ? 'rgba(242,153,74,0.95)' : hov ? 'rgba(255,255,255,0.28)' : 'rgba(20,30,30,0.28)');
        art.txt(ctx, tb.id, tb.x + tb.w / 2, tb.y + 26, 17, active ? '#2a1a10' : 'rgba(255,255,255,0.85)', 800, 'center');
      });
      art.txt(ctx, 'СТЕЛЛАЖ ' + st.rack, 640, 162, 15, 'rgba(30,45,45,0.6)', 800, 'center');

      var rects = cellRects();
      var busy = {};
      st.orders.forEach(function (o) {
        if (o.cell && (o.state === 'stored' || o.state === 'placing' || o.state === 'fitting' || o.state === 'return')) busy[o.cell] = o;
      });
      var dragging = st.drag && st.drag.active;
      var overCell = dragging ? cellAt(st.drag.x, st.drag.y) : null;

      rects.forEach(function (cell) {
        var hov = U.hit(cell, PVZ.input.x, PVZ.input.y);
        var order = busy[cell.id];
        var isDrop = dragging && overCell === cell.id;
        var okDrop = isDrop && st.drag.order && canDrop(st.drag.order, cell.id);
        art.fillRR(ctx, cell.x, cell.y, cell.w, cell.h, 8,
          isDrop ? (okDrop ? 'rgba(127,224,160,0.28)' : 'rgba(228,87,46,0.28)') : hov ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');
        // ровная рамка без пунктира: нужную ячейку игрок ищет сам
        art.strokeRR(ctx, cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8, 6,
          isDrop ? (okDrop ? '#8fe0a8' : '#ff9d7a') : hov ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.14)',
          isDrop ? 3 : 1.5);
        art.txt(ctx, cell.id, cell.x + 12, cell.y + 24, 12, 'rgba(255,255,255,0.5)', 700);
        if (order) {
          if (order.state === 'placing') {
            art.txt(ctx, 'резерв', cell.x + cell.w / 2, cell.y + cell.h / 2, 13, 'rgba(255,200,120,0.8)', 700, 'center');
            return;
          }
          var hidden = dragging && st.drag.order === order;
          var bw = Math.min(cell.w - 34, 190), bh = Math.min(cell.h - 58, 92);
          var bx = cell.x + (cell.w - bw) / 2, by = cell.y + 32;
          if (!hidden) {
            if (hov) {
              ctx.save();
              ctx.shadowColor = 'rgba(242,153,74,0.85)';
              ctx.shadowBlur = 24;
              art.fillRR(ctx, bx - 6, by - 6, bw + 12, bh + 12, 10, 'rgba(242,153,74,0.22)');
              ctx.restore();
            }
            art.drawParcel(ctx, bx, by, bw, bh, { seed: order.code.charCodeAt(0) % 6, code: order.code });
          } else {
            art.fillRR(ctx, bx, by, bw, bh, 8, 'rgba(255,255,255,0.06)');
            art.strokeRR(ctx, bx, by, bw, bh, 8, 'rgba(255,255,255,0.18)', 1.5);
          }
          art.txt(ctx, order.item, cell.x + cell.w / 2, cell.y + cell.h - 12, 11, 'rgba(255,255,255,0.85)', 600, 'center');
        } else {
          art.txt(ctx, 'пусто', cell.x + cell.w / 2, cell.y + cell.h / 2, 12, 'rgba(255,255,255,0.22)', 600, 'center');
        }
      });

      // лоток приёмки: коробки привезли и они лежат у стеллажа
      var tray = supplyTrayRects();
      if (tray.length) {
        art.fillRR(ctx, 270, 534, 740, 84, 14, 'rgba(18,26,26,0.42)');
        art.strokeRR(ctx, 270, 534, 740, 84, 14, 'rgba(255,255,255,0.14)', 1.4);
        art.txt(ctx, 'ПРИЁМКА · перетащите коробку в свободную ячейку', 286, 548, 12, 'rgba(255,255,255,0.62)', 700);
        tray.forEach(function (t) {
          var hov = U.hit(t, PVZ.input.x, PVZ.input.y) && !(st.drag && st.drag.active);
          var held = dragging && st.drag.order === t.order;
          if (!held) {
            if (hov) art.glowRect(ctx, t, st.t, 'rgba(255,200,120,0.9)');
            art.drawParcel(ctx, t.x, t.y, t.w, t.h, { seed: t.order.code.charCodeAt(0) % 6, code: t.order.code });
          } else {
            art.strokeRR(ctx, t.x, t.y, t.w, t.h, 8, 'rgba(255,200,120,0.35)', 1.4);
          }
          if (t.order.size === 'L') art.txt(ctx, 'L', t.x + t.w - 10, t.y + 16, 11, 'rgba(255,230,180,0.9)', 800, 'right');
        });
      } else if (st.phase === 'morning') {
        art.txt(ctx, 'Поставка разложена', 640, 578, 15, 'rgba(255,255,255,0.45)', 700, 'center');
      }

      // постоянная кнопка возврата — работает и на тач-экране без наведения
      var backR = { x: 20, y: 340, w: 150, h: 44 };
      var backHov = U.hit(backR, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, backR.x, backR.y, backR.w, backR.h, 12, backHov ? 'rgba(242,153,74,0.95)' : 'rgba(30,22,18,0.8)');
      art.strokeRR(ctx, backR.x, backR.y, backR.w, backR.h, 12, 'rgba(255,235,210,0.2)', 1.4);
      art.txt(ctx, '◀ На склад', backR.x + backR.w / 2, backR.y + 28, 15, backHov ? '#2a1a10' : '#f2e4d2', 700, 'center');
    }

    function rackTabs() {
      var out = [];
      sys.RACKS.forEach(function (r, i) {
        var count = st.orders.filter(function (o) {
          return o.cell && o.cell.charAt(0) === r && o.state === 'stored';
        }).length;
        out.push({ id: r, x: 470 + i * 116, y: 104, w: 100, h: 40, count: count });
      });
      return out;
    }

    function cellAt(x, y) {
      var rects = cellRects();
      for (var i = 0; i < rects.length; i++) if (U.hit(rects[i], x, y)) return rects[i].id;
      return null;
    }

    function trayAt(x, y) {
      var tray = supplyTrayRects();
      for (var i = 0; i < tray.length; i++) if (U.hit(tray[i], x, y)) return tray[i].order;
      return null;
    }

    /* ------- меню разработчика ------- */
    var DEV_TAB = { x: 1150, y: 668, w: 110, h: 34 };

    function devActions() {
      return [
        { id: 'hour', label: '+1 час', run: function () { st.clock += 60; msg('Время +1 час: ' + U.fmtTime(st.clock)); } },
        { id: 'money', label: '+1 000 \u20BD', run: function () { PVZ.state.addMoney(1000); msg('Деньги начислены.', 'good'); } },
        { id: 'rating', label: 'Рейтинг 5.0', run: function () { PVZ.state.data.rating = 5; msg('Рейтинг выставлен на 5.0.', 'good'); } },
        {
          id: 'phase', label: 'Следующая фаза', run: function () {
            if (st.phase === 'morning') {
              st.objectives.forEach(function (o) { o.done = true; });
              checkMorningDone();
              if (st.phase === 'morning') startPhase('day');
            } else if (st.phase === 'day') { startPhase('evening'); msg('Фаза: вечер.'); }
            else finishEvening();
          }
        },
        { id: 'spawn', label: 'Спавн покупателя', run: function () { spawnCustomer(); msg('Покупатель пришёл.'); } },
        { id: 'event', label: 'Случайное событие', run: triggerEvent },
        { id: 'shady', label: 'Мутный тип (??? )', run: function () { spawnCustomer('shady'); msg('Мутный тип пришёл.'); } },
        {
          id: 'cat',
          label: function () { return PVZ.state.data.cat ? 'Кот уже на столе' : 'Спавн кота'; },
          run: function () {
            if (PVZ.state.data.cat) {
              msg('Кот ' + PVZ.state.data.cat.name + ' уже живёт на столе — погладьте его справа.', 'info');
              return;
            }
            spawnCustomer('cat_story');
            st.catStorySpawned = true;
            msg('Кошка с котёнком пришла: нажмите на неё у стойки.', 'good');
          }
        },
        { id: 'banana', label: 'Banana store', run: function () { api.debug.banana(); } },
        { id: 'rush', label: 'Час пик', run: function () { startRush(); } },
        { id: 'shop', label: 'Открыть магазин', run: function () { api.debug.shop(); } },
        { id: 'laptop', label: 'Ноутбук', run: openLaptop },
        { id: 'supply', label: 'Досыпать поставку', run: function () { addSupply(3); msg('Поставка +3 коробки.'); } },
        {
          id: 'patience', label: function () { return st.dev.patience ? 'Терпение: не тратится' : 'Терпение: обычное'; },
          run: function () { st.dev.patience = !st.dev.patience; }
        },
        { id: 'report', label: 'К отчёту смены', run: function () { finishEvening(); } },
        { id: 'close', label: 'Закрыть меню', run: function () { st.dev.open = false; } }
      ];
    }

    function devRects() {
      var acts = devActions();
      var out = [];
      for (var i = 0; i < acts.length; i++) {
        out.push({ action: acts[i], rect: { x: 872, y: 112 + i * 35, w: 368, h: 30 } });
      }
      return out;
    }

    function drawDev(ctx) {
      // в релизной сборке отладки нет вовсе
      if (window.PVZ_RELEASE) return;
      // ?clean=1 — кадры для магазина без кнопки DEV
      if (location.search.indexOf('clean=1') >= 0) return;
      var tabHover = U.hit(DEV_TAB, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      art.fillRR(ctx, DEV_TAB.x, DEV_TAB.y, DEV_TAB.w, DEV_TAB.h, 10, tabHover ? 'rgba(242,153,74,0.95)' : 'rgba(28,20,16,0.72)');
      art.txt(ctx, 'DEV ⚙', DEV_TAB.x + DEV_TAB.w / 2, DEV_TAB.y + 23, 14, tabHover ? '#2a1a10' : '#ffcf9a', 800, 'center');
      if (!st.dev.open) return;
      ctx.save();
      ctx.fillStyle = 'rgba(8,5,4,0.55)';
      ctx.fillRect(0, 0, 1280, 720);
      art.panel(ctx, 840, 66, 424, 588, { bg: 'rgba(26,19,15,0.97)', r: 20, border: 'rgba(255,200,150,0.22)' });
      art.txt(ctx, 'МЕНЮ РАЗРАБОТЧИКА', 1052, 100, 17, '#ffc27a', 800, 'center');
      art.txt(ctx, 'фаза: ' + PHASE_LABEL[st.phase].toLowerCase() + '  •  ' + U.fmtTime(st.clock), 1052, 124, 12, 'rgba(255,235,215,0.6)', 600, 'center');
      devRects().forEach(function (item) {
        var r = item.rect;
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        var label = typeof item.action.label === 'function' ? item.action.label() : item.action.label;
        art.button(ctx, r, label, { hover: hov, size: 13, bg: 'rgba(52,38,30,0.92)', hoverBg: '#f2994a', hoverFg: '#2a1a10' });
      });
      ctx.restore();
    }

    function handleDevTap(x, y) {
      if (window.PVZ_RELEASE) return false;
      if (U.hit(DEV_TAB, x, y)) { st.dev.open = !st.dev.open; PVZ.audio.click(); return true; }
      if (!st.dev.open) return false;
      var items = devRects();
      for (var i = 0; i < items.length; i++) {
        if (U.hit(items[i].rect, x, y)) { PVZ.audio.click(); items[i].action.run(); return true; }
      }
      if (x < 840) st.dev.open = false;
      return true;
    }

    /* ---------------- ввод ---------------- */
    api.onMove = function (x, y) {
      if (st.unpack) { unpackMove(x, y); return; }
      if (st.drag && st.drag.active) {
        st.drag.moved += Math.abs(x - st.drag.x) + Math.abs(y - st.drag.y);
        st.drag.x = x;
        st.drag.y = y;
      }
      st.hover = null;
      for (var i = 0; i < st.hots.length; i++) {
        if (U.hit(st.hots[i].rect, x, y)) { st.hover = st.hots[i]; break; }
      }
    };

    var MODALS = function () { return !!(st.laptop || st.terminal || st.qte || st.phone || st.dlg || st.unpack); };

    function startDrag(order, mode, x, y) {
      st.drag = { order: order, mode: mode, x: x, y: y, sx: x, sy: y, active: true, moved: 0 };
      PVZ.audio.tap();
    }

    api.onDown = function (x, y) {
      if (st.unpack) { unpackDown(x, y); return; }
      if (MODALS() || st.view !== 'rack' || st.drag) return;
      var tabs = rackTabs();
      for (var i = 0; i < tabs.length; i++) if (U.hit(tabs[i], x, y)) return;
      var ord = trayAt(x, y);
      if (ord) { startDrag(ord, 'new', x, y); return; }
      var cellId = cellAt(x, y);
      if (cellId) {
        var stored = null;
        st.orders.forEach(function (o) { if (o.cell === cellId && o.state === 'stored') stored = o; });
        if (stored) startDrag(stored, 'move', x, y);
      }
    };

    api.onUp = function (x, y) {
      if (st.unpack) { unpackUp(); return; }
      var d = st.drag;
      if (!d) return;
      st.drag = null;
      var dist = Math.abs(x - d.sx) + Math.abs(y - d.sy);
      if (dist < 18) {
        // это был обычный тап, а не перетаскивание
        if (d.mode === 'move' && d.order.state === 'stored') takeFromCell(d.order);
        else if (d.mode === 'new') msg('Возьмите коробку и перетащите её в свободную ячейку.', 'info');
        return;
      }
      var cellId = cellAt(x, y);
      if (!cellId) {
        PVZ.audio.bad();
        msg('Отпустите коробку над ячейкой стеллажа — она вернулась на место.', 'bad');
        return;
      }
      if (d.mode === 'move' && cellId === d.order.cell) return;
      dropBox(d.order, cellId, d.mode);
    };

    function tapCell(x, y) {
      var rects = cellRects();
      for (var i = 0; i < rects.length; i++) {
        if (U.hit(rects[i], x, y)) return rects[i].id;
      }
      return null;
    }

    api.onTap = function (x, y) {
      if (st.unpack) { unpackTap(x, y); return; }
      if (st.laptop) { laptopTap(x, y); return; }
      if (st.terminal) { st.terminal.tap(x, y); return; }
      if (st.qte) { st.qte.onTap(x, y); return; }
      if (st.phone) { phoneTap(x, y); return; }
      if (st.dlg) {
        var idx = st.dlg.hitChoice(x, y);
        if (idx >= 0) {
          var ch = st.dlg.choices[idx];
          var closeFn = st.dlg.onClose;
          var target = st.customer;
          st.dlg = null;
          PVZ.audio.click();
          if (ch.fx) applyFx(ch.fx, target);
          if (ch.cb) ch.cb();
          if (closeFn && !st.dlg) closeFn();
        }
        return;
      }

      // во время визита полиции игрок не работает — только слушает
      if (st.arrest) return;

      if (!window.PVZ_RELEASE && (st.dev.open || U.hit(DEV_TAB, x, y))) {
        if (handleDevTap(x, y)) return;
      }

      if (st.tut && st.tut.on && U.hit(tutSkipRect(), x, y)) { tutFinish(); return; }

      if (st.threat) {
        if (U.hit(threatBannerRect(), x, y)) { openThreatPhone(); return; }
        if (st.threat.kind === 'bandit' && U.hit(threatPersonRect(), x, y)) { openBanditDialog(); return; }
        if (st.threat.kind === 'sick' && U.hit(threatPersonRect(), x, y)) { openSickDialog(); return; }
      }

      // стеллаж: вкладки и ячейки (коробки перетаскиваются, см. onDown/onUp)
      if (st.view === 'rack') {
        var tabs = rackTabs();
        for (var ti = 0; ti < tabs.length; ti++) {
          if (U.hit(tabs[ti], x, y)) {
            if (st.rack !== tabs[ti].id) {
              st.rack = tabs[ti].id;
              PVZ.audio.step();
            }
            return;
          }
        }
        if (tapCell(x, y) || trayAt(x, y)) return;
      }

      var hot = null;
      for (var i = 0; i < st.hots.length; i++) {
        if (U.hit(st.hots[i].rect, x, y)) { hot = st.hots[i]; break; }
      }
      // секретные точки интерьера: без подсказок и подсветки
      if (st.view === 'counter') {
        var C0 = art.LAYOUT.counter;
        if (U.hit(C0.mug, x, y)) { bumpInteriorTap('mug', 7, 'coffee', 'Кружка уже пустая. Может, ещё одну?'); return; }
        if (U.hit(C0.figurines, x, y)) { bumpInteriorTap('figurine', 7, 'figurine', 'Фигурки будто переставляются сами.'); return; }
      }
      if (!hot) return;
      PVZ.audio.click();

      var id = hot.id;
      if (id === 'customer') onCustomerTap();
      else if (id === 'scanner') scanHeld();
      else if (id === 'parcel') {
        if (st.held && !st.held.onTable) placeHeldOnDesk();
        else startParcelScan();
      }
      else if (id === 'laptop') openLaptop();
      else if (id === 'deskClock') msg('Сейчас ' + U.fmtTime(st.clock) + '.');
      else if (id === 'deskCat') petCat();
      else if (id === 'warehouseDoor') setView('warehouse');
      else if (id === 'entrance') setView('hall');
      else if (id === 'cash') reconcileCash();
      else if (id === 'door') {
        if (st.lateWaiting && !st.doorOpen) { st.doorOpen = true; PVZ.audio.bell(); msg('Поздний покупатель зашёл.', 'good'); return; }
        if (st.phase === 'morning') {
          if (!st.doorOpen) {
            st.doorOpen = true;
            st.morning.door = true;
            setObjective('door', true);
            PVZ.audio.bell();
            msg('Входная дверь открыта.', 'good');
            checkMorningDone();
          } else msg('Дверь уже открыта.');
          return;
        }
        if (st.phase === 'evening') { closeDoor(); return; }
        st.doorOpen = !st.doorOpen;
        msg(st.doorOpen ? 'Дверь открыта.' : 'Дверь закрыта — новые покупатели не заходят.');
      } else if (id === 'light') {
        st.lightsOn = !st.lightsOn;
        PVZ.audio.click();
        if (st.lightsOn && st.phase === 'morning') {
          st.morning.light = true;
          setObjective('light', true);
          msg('Свет включён.', 'good');
          checkMorningDone();
        } else {
          msg(st.lightsOn ? 'Свет включён.' : 'Свет выключен.');
        }
      } else if (id === 'fitting') {
        msg(st.fitting.length ? 'В примерочной сейчас клиент.' : 'Примерочная свободна. Клиенты ходят туда сами.');
      } else if (id === 'counter') setView('counter');
      else if (id === 'sus') openBoxFor(null);
      else if (id.indexOf('dust') === 0) {
        var di = parseInt(id.slice(4), 10);
        var d = st.dust[di];
        if (d && !d.done) {
          d.done = true;
          PVZ.audio.sweep();
          msg('Мусор убран.', 'good');
          if (st.dust.every(function (x2) { return x2.done; })) {
            setObjective('clean', true);
            PVZ.state.addRating(0.01);
          }
        }
      } else if (id.indexOf('rack') === 0) {
        st.rack = id.slice(4);
        setView('rack');
      } else if (id === 'backRack') setView('warehouse');
      else if (id === 'back') setView('counter');
      else if (id === 'returnsZone') handoverReturns();
      else if (id.indexOf('supply') === 0) {
        var oid = id.slice(6);
        var ord = st.orders.find(function (o) { return o.id === oid; });
        if (ord) receiveBox(ord);
      }
    };

    api.onKey = function (k) {
      if (st.unpack) {
        if (k === 'Escape') { closeUnpack(); return; }
        if (k === ' ' || k === 'Enter') {
          var u = st.unpack;
          if (u.phase === 'knifeIdle') pickUnpackTool('knife');
          else if (u.phase === 'scissorsIdle') pickUnpackTool('scissors');
          else if (u.phase === 'bagCut') unpackSnip();
          else if (u.phase === 'product') unpackPullProduct();
        }
        return;
      }
      if (!st.laptop && !st.terminal && !st.qte && !st.phone && !st.dlg) trackKonami(k);
      if (st.laptop) {
        var L = st.laptop;
        if (k === 'Escape') {
          if (L.mode === 'home') { closeLaptop(); PVZ.audio.click(); }
          else if (L.mode === 'shop') { L.mode = 'home'; PVZ.audio.click(); }
          else if (L.mode === 'appstore') { L.mode = 'home'; PVZ.audio.click(); }
          else if (L.mode === 'reviews') {
            if (L.reviews.sel) { L.reviews.sel = null; PVZ.audio.click(); }
            else { L.mode = 'home'; PVZ.audio.click(); }
          } else if (L.mode === 'phone') {
            if (L.phone && L.phone.key('Escape')) PVZ.audio.click();
            else { L.mode = 'home'; PVZ.audio.click(); }
          } else if (L.mode === 'premium' && L.premium && (L.premium.modal || L.premium.ad)) {
            L.premium.modal = null; L.premium.ad = null; PVZ.audio.click();
          } else { L.mode = 'home'; PVZ.audio.click(); }
          return;
        }
        if (L.mode === 'snake') { L.snake.key(k); return; }
        if (L.mode === 'phone' && L.phone) L.phone.key(k);
        return;
      }
      if (st.terminal) { st.terminal.key(k); return; }
      if (k === '`' || k === 'F2' || k === 'ё' || k === 'Ё') {
        if (!st.qte && !st.dlg) { st.dev.open = !st.dev.open; PVZ.audio.click(); }
        return;
      }
      if (st.qte) { st.qte.onKey(k); return; }
      if (st.phone) {
        if (k === 'Escape') { st.phone = null; return; }
        if (k === ' ' || k === 'Enter') { startCodeScan(st.phone); return; }
        return;
      }
      if (st.dlg) {
        var n = parseInt(k, 10);
        if (n >= 1 && n <= st.dlg.choices.length) {
          var ch = st.dlg.choices[n - 1];
          var closeFn = st.dlg.onClose;
          var target = st.customer;
          st.dlg = null;
          PVZ.audio.click();
          if (ch.fx) applyFx(ch.fx, target);
          if (ch.cb) ch.cb();
          if (closeFn && !st.dlg) closeFn();
        }
        return;
      }
      // идёт арест: клавиши смены больше не работают
      if (st.arrest) return;
      if (k === 'Escape') { PVZ.game.togglePause(); return; }
      if (k === 't' || k === 'T' || k === 'е' || k === 'Е') { openTerminal(); return; }
      if (k === 'l' || k === 'L' || k === 'д' || k === 'Д') { openLaptop(); return; }
      if (k === 'ArrowLeft') {
        if (st.view === 'counter') setView('warehouse');
        else if (st.view === 'hall') setView('counter');
        else if (st.view === 'rack') setView('warehouse');
        return;
      }
      if (k === 'ArrowRight') {
        if (st.view === 'counter') setView('hall');
        else if (st.view === 'warehouse') setView('counter');
        return;
      }
      if (k === 'ArrowDown') { if (st.view !== 'counter') setView('counter'); return; }
      if (k === 'ArrowUp') { if (st.view === 'warehouse') setView('rack'); return; }
      if (k === ' ' || k === 'Enter') {
        if (st.view === 'counter') {
          if (st.customer) onCustomerTap();
          else if (st.held && !st.held.onTable) placeHeldOnDesk();
          else if (st.held) startParcelScan();
          else if (!st.scannerHeld) scanHeld();
        }
      }
    };

    /* Esc сначала закрывает окна ноутбука/терминала/телефона, иначе — пауза */
    api.onEscape = function () {
      if (st.unpack) { closeUnpack(); return true; }
      if (!(st.laptop || st.terminal || st.phone)) return false;
      api.onKey('Escape');
      return true;
    };

    api.onSwipe = function (dir) {
      if (st.unpack) return;
      if (st.qte) { st.qte.onSwipe(dir); return; }
      if (st.arrest) return;
      if (st.dlg || st.terminal || st.laptop || st.phone) return;
      if (dir === 'left') {
        if (st.view === 'counter') setView('warehouse');
        else if (st.view === 'hall') setView('counter');
        else if (st.view === 'rack') setView('warehouse');
      } else if (dir === 'right') {
        if (st.view === 'counter') setView('hall');
        else if (st.view === 'warehouse') setView('counter');
      } else if (dir === 'down') {
        if (st.view !== 'counter') setView('counter');
      } else if (dir === 'up') {
        if (st.view === 'warehouse') setView('rack');
      }
    };

    return api;
  };

  /* =========================================================
     ОТЧЁТ
     ========================================================= */
  scenes.report = function (data) {
    var btns = [];
    var scene = {};
    scene.isReport = true;
    var t = 0;

    scene.enter = function () {
      PVZ.state.save();
      if (data.final) {
        btns = [
          { id: 'finale', rect: { x: 400, y: 596, w: 480, h: 58 }, label: 'Итоги забега ▶', primary: true },
          { id: 'menu', rect: { x: 500, y: 664, w: 280, h: 40 }, label: 'В меню' }
        ];
        return;
      }
      btns = [
        { id: 'shop', rect: { x: 400, y: 596, w: 480, h: 58 }, label: 'Магазин и следующий день ▶', primary: true },
        { id: 'next', rect: { x: 250, y: 660, w: 330, h: 40 }, label: 'Следующий день без магазина' },
        { id: 'menu', rect: { x: 700, y: 660, w: 330, h: 40 }, label: 'В меню' }
      ];
    };
    scene.update = function (dt) { t += dt; };
    scene.draw = function (ctx) {
      ctx.fillStyle = '#1a1310';
      ctx.fillRect(0, 0, 1280, 720);
      var g = ctx.createRadialGradient(640, 300, 100, 640, 300, 700);
      g.addColorStop(0, 'rgba(242,153,74,0.13)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);

      var planPct = data.plan ? Math.min(150, Math.round(data.served / data.plan * 100)) : 0;
      var kpiCol = planPct >= 100 ? '#7fe0a0' : planPct >= 70 ? '#ffd479' : '#ff9d7a';

      var endlessRun = data.mode === 'endless';
      art.txt(ctx, 'СМЕНА ЗАКРЫТА', 640, 88, 42, '#ffd8a8', 800, 'center');
      art.txt(ctx, endlessRun
        ? 'Смена ' + data.day + ' · бесконечный режим · ' + PVZ.state.title()
        : 'День ' + data.day + ' из ' + PVZ.balance.WIN_DAY + ' · ' + PVZ.state.title(),
        640, 122, 17, 'rgba(255,240,220,0.6)', 600, 'center');
      if (data.final) {
        art.txt(ctx, 'ПОСЛЕДНИЙ ДЕНЬ ЗАБЕГА', 640, 140, 13, '#ffc27a', 800, 'center');
      }

      art.panel(ctx, 210, 156, 860, 420, { bg: 'rgba(38,28,22,0.94)', r: 22, border: 'rgba(255,230,200,0.14)' });

      art.txt(ctx, 'ПЛАН ДНЯ', 260, 190, 12, 'rgba(255,236,214,0.5)', 800);
      art.txt(ctx, data.served + ' / ' + data.plan + ' выдач', 260, 224, 26, '#fff3e2', 800);
      art.bar(ctx, 260, 238, 320, 12, Math.min(1, data.served / Math.max(1, data.plan)), planPct >= 100 ? '#5aa877' : '#f2994a');
      art.txt(ctx, planPct + '%', 596, 232, 22, kpiCol, 800, 'right');

      art.txt(ctx, 'ВЫРУЧКА СМЕНЫ', 260, 286, 12, 'rgba(255,236,214,0.5)', 800);
      art.txt(ctx, U.fmtMoney(data.earned), 260, 320, 26, '#ffd479', 800);
      art.txt(ctx, 'Премия: ' + (data.bonus ? U.fmtMoney(data.bonus) : '—') + (data.tips ? ' · чаевые ' + U.fmtMoney(data.tips) : ''), 260, 346, 14, 'rgba(255,240,220,0.7)', 600);
      art.txt(ctx, 'Итого на счету: ' + U.fmtMoney(data.money), 260, 370, 14, 'rgba(255,240,220,0.55)', 600);

      var rows = [
        ['Принято на склад', data.received + ' шт.'],
        ['Оформлено возвратов', String(data.returns)],
        ['Жалоб', String(data.complaints)],
        ['Осталось до завтра', (data.carry ? data.carry.length : 0) + ' шт.']
      ];
      if (data.moments) rows.push(['Живых выдач', String(data.moments)]);
      if (data.specials) rows.push(['Особых гостей', String(data.specials)]);
      if (data.avgScore) {
        rows.push(['Средняя оценка клиентов', data.avgScore.toFixed(2) + ' / 5']);
      }
      if (data.rent) {
        rows.push(['Аренда за смену', U.fmtMoney(data.rent.paid)]);
        if (data.rent.unpaid > 0) rows.push(['Долг по аренде', U.fmtMoney(data.rent.unpaid)]);
      } else if (data.mafia) {
        rows.push(['Мафии отдано', U.fmtMoney(data.mafia.paid)]);
        if (data.mafia.taken && data.mafia.taken.length) rows.push(['Мафия забрала', data.mafia.taken[0].name]);
        rows.push(['Долг мафии', U.fmtMoney(data.debt || 0)]);
      } else if (data.freed) {
        rows.push(['Долг мафии', 'закрыт']);
      }
      if (data.eggs) rows.push(['Секретов найдено', data.eggs + ' / ' + sys.EGGS.length]);
      if (data.mafiaStats && !endlessRun) {
        rows.push(['Доверие мафии', (data.mafiaStats.trust > 0 ? '+' : '') + data.mafiaStats.trust]);
        rows.push(['Грязь', data.mafiaStats.dirt + '%']);
        if (data.mafiaStats.proof) rows.push(['Улик собрано', data.mafiaStats.proof + ' / 3']);
      }
      // если строк много — поджимаем шаг, чтобы блок не наехал на рейтинг
      var rowGap = rows.length > 8 ? 26 : 34;
      var rowY = rows.length > 8 ? 186 : 196;
      rows.forEach(function (r, i) {
        var y = rowY + i * rowGap;
        art.txt(ctx, r[0], 700, y, 15, 'rgba(255,240,220,0.65)', 600);
        art.txt(ctx, r[1], 1010, y, 18, '#fff3e2', 800, 'right');
      });

      art.stars(ctx, 260, 486, data.rating, 18);
      art.txt(ctx, 'Рейтинг ПВЗ: ' + data.rating.toFixed(2) + ' / 5.0', 400, 492, 16, 'rgba(255,240,220,0.75)', 600);
      if (data.planPenalty) {
        art.txt(ctx, 'Штраф за невыполненный план: ' + data.planPenalty.toFixed(2) + ' к рейтингу', 400, 470, 12, '#ff9d7a', 700);
      }
      if (data.rating < PVZ.balance.ratingWarn) {
        art.txt(ctx, 'Рейтинг ниже ' + PVZ.balance.ratingWarn.toFixed(2) + ' — пункт на грани закрытия', 400, 512, 12, '#ffb59d', 700);
      }

      var verdict = endlessRun
        ? (data.rent && data.rent.unpaid > 0
          ? 'Аренда оплачена не полностью — остаток перейдёт на следующую смену.'
          : 'Аренда оплачена. Смена закрыта — работаем дальше.')
        : data.final ? (planPct >= 100 ? 'Последняя смена закрыта с выполненным планом — смотрим итоги забега.' : 'Последняя смена позади. Смотрим, чем закончился забег.')
          : planPct >= 110 ? 'Отличная смена! План перевыполнен.'
            : planPct >= 100 ? 'План выполнен — премия начислена.'
              : planPct >= 70 ? 'План не дотянули. Завтра наверстаем.'
                : 'Смена провалена по плану. Обратите внимание на скорость выдачи.';
      if (data.rent && data.rent.unpaid > 0) {
        art.txt(ctx, 'Долг по аренде ' + U.fmtMoney(data.rent.unpaid) + ' ₽ · неоплата ' + data.rent.strikes +
          ' из ' + PVZ.balance.rentUnpaidLimit + '. Дальше — выселение.', 640, 548, 14, '#ffb59d', 700, 'center');
      } else if (data.freed && !endlessRun) {
        art.txt(ctx, 'Долг закрыт. Мафия больше не придёт — вы свободны.', 640, 548, 14, '#8fe0a8', 700, 'center');
      }
      art.txt(ctx, verdict, 640, 528, 15, 'rgba(255,240,220,0.6)', 600, 'center');
      var extraLine = [];
      if (data.referred) extraLine.push('по рекомендации: ' + data.referred);
      if (data.refBonus) extraLine.push('бонус за рекомендации: ' + U.fmtMoney(data.refBonus));
      if (data.boxStats && data.boxStats.shelf) extraLine.push('забытых посылок на полке: ' + data.boxStats.shelf);
      if (data.castNums) extraLine.push('знакомых в телефоне: ' + data.castNums);
      if (extraLine.length) {
        art.txt(ctx, extraLine.join(' · '), 640, 568, 12, 'rgba(255,216,168,0.82)', 600, 'center');
      }

      btns.forEach(function (b) {
        var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        art.button(ctx, b.rect, b.label, {
          hover: hov, size: b.primary ? 23 : 16,
          bg: b.primary ? 'rgba(242,153,74,0.92)' : b.id === 'shop' ? 'rgba(90,168,119,0.85)' : 'rgba(60,46,36,0.9)',
          fg: b.primary ? '#2a1a10' : '#f7ead8'
        });
      });
    };
    scene.onTap = function (x, y) {
      for (var i = 0; i < btns.length; i++) {
        if (U.hit(btns[i].rect, x, y)) {
          PVZ.audio.click();
          if (btns[i].id === 'finale') {
            PVZ.game.goto(PVZ.scenes.finale());
            return;
          }
          if (btns[i].id === 'next') {
            PVZ.state.data.day++;
            PVZ.state.data.phase = 'morning';
            PVZ.state.data.clock = MORNING_START;
            PVZ.state.data.stats = { served: 0, complaints: 0, earned: 0, returns: 0 };
            PVZ.state.data.shift = null;
            PVZ.state.save();
            PVZ.game.goto(PVZ.scenes.shift({ day: PVZ.state.data.day, phase: 'morning', carry: data.carry || [] }));
          } else if (btns[i].id === 'shop') {
            PVZ.game.goto(PVZ.scenes.shop({ carry: data.carry || [], from: 'report' }));
          } else {
            PVZ.game.goto(PVZ.scenes.menu());
          }
          return;
        }
      }
    };
    scene.onKey = function (k) {
      if (k === 'Enter' || k === ' ') scene.onTap(640, 620);
      if (k === 'Escape') scene.onTap(865, 680);
    };
    scene.musicTension = function () { return 0.1; };
    scene.musicPhase = function () { return 'evening'; };
    return scene;
  };

  /* =========================================================
     МАГАЗИН МЕЖДУ СМЕНАМИ
     ========================================================= */
  scenes.shop = function (opts) {
    opts = opts || {};
    var scene = {};
    scene.isShop = true;
    var ui = new ShopUI({ title: 'МАГАЗИН ПВЗ · после смены' });
    scene.shopUI = ui;
    var t = 0;
    var btns = [];
    var carry = opts.carry || [];

    function nextDay() {
      if (!PVZ.state.endless() && PVZ.state.data.day >= PVZ.balance.WIN_DAY) {
        PVZ.state.data.shift = null;
        PVZ.state.save();
        PVZ.game.goto(PVZ.scenes.finale());
        return;
      }
      PVZ.state.data.day++;
      PVZ.state.data.phase = 'morning';
      PVZ.state.data.clock = MORNING_START;
      PVZ.state.data.stats = { served: 0, complaints: 0, earned: 0, returns: 0 };
      PVZ.state.data.shift = null;
      PVZ.state.save();
      PVZ.game.goto(PVZ.scenes.shift({ day: PVZ.state.data.day, phase: 'morning', carry: carry }));
    }

    scene.enter = function () {
      if (opts.from === 'menu') {
        var has = PVZ.state.hasShift();
        btns = [
          { id: has ? 'resume' : 'next', rect: { x: 760, y: 644, w: 340, h: 50 }, label: has ? 'Продолжить смену ▶' : 'Начать день ▶', primary: true },
          { id: 'menu', rect: { x: 180, y: 644, w: 250, h: 50 }, label: 'Назад в меню' }
        ];
      } else {
        btns = [
          { id: 'next', rect: { x: 760, y: 644, w: 340, h: 50 }, label: 'Следующий день ▶', primary: true },
          { id: 'menu', rect: { x: 180, y: 644, w: 250, h: 50 }, label: 'В меню' }
        ];
      }
      PVZ.audio.ui();
    };
    scene.update = function (dt) { t += dt; ui.update(dt); };
    scene.draw = function (ctx) {
      art.drawCounterScene(ctx, {
        t: t, clock: 20 * 60 + 40, night: true, doorOpen: false, crowd: [],
        laptopApp: 'shop', money: PVZ.state.data.money, showCash: false
      });
      ctx.fillStyle = 'rgba(10,7,5,0.62)';
      ctx.fillRect(0, 0, 1280, 720);
      art.txt(ctx, 'СМЕНА ЗАКРЫТА', 640, 62, 24, '#ffd8a8', 800, 'center');
      art.txt(ctx, 'День ' + PVZ.state.data.day + ' завершён. Загляните в магазин — улучшения помогут завтра.', 640, 88, 13, 'rgba(255,240,220,0.6)', 600, 'center');
      ui.draw(ctx, t);
      btns.forEach(function (b) {
        var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        art.button(ctx, b.rect, b.label, {
          hover: hov, size: b.primary ? 20 : 16,
          bg: b.primary ? 'rgba(242,153,74,0.95)' : 'rgba(52,40,32,0.92)',
          fg: b.primary ? '#2a1a10' : '#f7ead8',
          hoverBg: b.primary ? '#ffb768' : '#6a4e3c'
        });
      });
    };
    scene.onTap = function (x, y) {
      for (var i = 0; i < btns.length; i++) {
        if (U.hit(btns[i].rect, x, y)) {
          PVZ.audio.click();
          if (btns[i].id === 'next') nextDay();
          else if (btns[i].id === 'resume') PVZ.game.goto(PVZ.scenes.shift({ resume: true }));
          else PVZ.game.goto(PVZ.scenes.menu());
          return;
        }
      }
      var res = ui.tap(x, y);
      if (res && res.action === 'buy') ui.handleBuy(res.id);
    };
    scene.onKey = function (k) {
      if (k === 'Escape') PVZ.game.goto(PVZ.scenes.menu());
      if (k === 'Enter') {
        var b = btns.filter(function (x2) { return x2.primary; })[0] || btns[0];
        if (b) scene.onTap(b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2);
      }
    };
    scene.musicTension = function () { return 0.22; };
    scene.musicPhase = function () { return 'day'; };
    return scene;
  };

  /* =========================================================
     ПРОВАЛ: пункт закрыли
     ========================================================= */
  scenes.gameover = function (data) {
    data = data || (PVZ.state.data && PVZ.state.data.finale) || {};
    var scene = {};
    var t = 0;
    var btns = [];

    scene.enter = function () {
      PVZ.audio.bad();
      btns = [
        { id: 'restart', rect: { x: 420, y: 566, w: 440, h: 58 }, label: 'Начать заново', primary: true },
        { id: 'menu', rect: { x: 500, y: 638, w: 280, h: 44 }, label: 'В меню' }
      ];
    };
    scene.update = function (dt) { t += dt; };
    scene.draw = function (ctx) {
      art.drawCounterScene(ctx, {
        t: t, clock: 21 * 60, crowd: [], night: true, doorOpen: false, lightsOn: false,
        laptopApp: 'home', money: 0
      });
      ctx.fillStyle = 'rgba(24,8,6,0.78)';
      ctx.fillRect(0, 0, 1280, 720);

      art.panel(ctx, 330, 68, 620, 152, { bg: 'rgba(32,13,11,0.97)', r: 20, border: 'rgba(255,140,110,0.28)' });
      art.txt(ctx, data.kind === 'fire' ? 'ПВЗ СГОРЕЛ' : 'ПУНКТ ЗАКРЫТ', 640, 120, data.kind === 'fire' ? 46 : 50, '#ff8f6b', 900, 'center');
      art.txt(ctx, data.reason || 'Рейтинг ПВЗ упал ниже допустимого', 640, 160, 17, 'rgba(255,214,196,0.85)', 600, 'center');
      art.txt(ctx, 'День ' + (data.day || 1) + ' · ' + PVZ.state.title(), 640, 194, 13, 'rgba(255,190,170,0.55)', 600, 'center');

      art.panel(ctx, 300, 232, 680, 300, { bg: 'rgba(42,20,16,0.94)', r: 22, border: 'rgba(255,140,110,0.32)' });

      var rows = [
        ['Смен закрыто', String(data.days || 0)],
        ['Заказов выдано', String(data.served || 0)],
        ['Выручка за всё время', U.fmtMoney(data.earned || 0)],
        ['Жалоб', String(data.complaints || 0)],
        ['Остаток на счету', U.fmtMoney(data.money || 0)]
      ];
      rows.forEach(function (r, i) {
        var y = 282 + i * 42;
        art.txt(ctx, r[0], 360, y, 15, 'rgba(255,224,208,0.62)', 600);
        art.txt(ctx, r[1], 920, y, 20, i === 2 ? '#ffd479' : '#fff3e2', 800, 'right');
      });

      art.stars(ctx, 360, 512, data.rating || 0, 16);
      art.txt(ctx, 'рейтинг ' + (data.rating || 0).toFixed(2) + ' из 5,00', 360 + 5 * 19 + 10, 518, 14, 'rgba(255,214,196,0.8)', 600);

      btns.forEach(function (b) {
        var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        art.button(ctx, b.rect, b.label, {
          hover: hov, size: b.primary ? 22 : 16,
          bg: b.primary ? 'rgba(228,87,46,0.95)' : 'rgba(56,34,28,0.92)',
          fg: b.primary ? '#2a1008' : '#f7ead8',
          hoverBg: b.primary ? '#ff8a5c' : '#6a463c'
        });
      });
    };
    scene.onTap = function (x, y) {
      for (var i = 0; i < btns.length; i++) {
        if (U.hit(btns[i].rect, x, y)) {
          PVZ.audio.click();
          if (btns[i].id === 'restart') {
            PVZ.state.newGame();
            PVZ.game.goto(PVZ.scenes.intro());
          } else {
            PVZ.game.goto(PVZ.scenes.menu());
          }
          return;
        }
      }
    };
    scene.onKey = function (k) {
      if (k === 'Enter' || k === ' ') scene.onTap(640, 595);
      if (k === 'Escape') scene.onTap(640, 660);
    };
    scene.musicTension = function () { return 0.92; };
    scene.musicPhase = function () { return 'evening'; };
    return scene;
  };

  /* =========================================================
     ФИНАЛ: забег пройден
     ========================================================= */
  scenes.finale = function () {
    var scene = {};
    var t = 0;
    var btns = [];
    var res = PVZ.state.result();
    var ending = res.ending || null;
    var grade, gradeColor, gradeLine;
    if (ending) {
      grade = ending.title;
      gradeColor = ending.color;
      gradeLine = ending.epilogue || ending.line;
    } else if (res.topTier) {
      grade = 'ФЛАГМАН СЕТИ';
      gradeColor = '#ffd479';
      gradeLine = 'Пункт ' + PVZ.state.title() + ' — образец сервиса: рейтинг и выручка выше плана.';
    } else if (res.rating >= 3.8) {
      grade = 'РОВНАЯ РАБОТА';
      gradeColor = '#8fe0a8';
      gradeLine = 'Десять смен без провалов — так держать.';
    } else {
      grade = 'ДОТЯНУЛИ ДО КОНЦА';
      gradeColor = '#ffb07a';
      gradeLine = 'Пункт выжил, но рейтинг оставляет желать лучшего.';
    }

    scene.enter = function () {
      PVZ.audio.level();
      btns = [
        { id: 'restart', rect: { x: 420, y: 600, w: 440, h: 56 }, label: 'Новый забег', primary: true },
        { id: 'menu', rect: { x: 500, y: 666, w: 280, h: 42 }, label: 'В меню' }
      ];
    };
    scene.update = function (dt) { t += dt; };
    scene.draw = function (ctx) {
      art.drawCounterScene(ctx, {
        t: t, clock: 10 * 60, crowd: [], night: false, doorOpen: true, lightsOn: true,
        laptopApp: 'home', money: res.money
      });
      ctx.fillStyle = 'rgba(26,16,10,0.72)';
      ctx.fillRect(0, 0, 1280, 720);

      // конфетти
      for (var i = 0; i < 26; i++) {
        var px = U.hash(i * 5.3) * 1280 + Math.sin(t * 0.6 + i) * 18;
        var py = ((U.hash(i * 3.7) * 720 + t * (18 + U.hash(i) * 26)) % 760) - 20;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(px, py);
        ctx.rotate(t * 1.4 + i);
        ctx.fillStyle = ['#ffd479', '#f2994a', '#8fe0a8', '#e4572e', '#fff3e2'][i % 5];
        ctx.fillRect(-3, -6, 6, 12);
        ctx.restore();
      }

      art.panel(ctx, 340, 66, 600, 120, { bg: 'rgba(34,22,14,0.97)', r: 20, border: 'rgba(255,220,180,0.22)' });
      art.txt(ctx, 'ЗАБЕГ ПРОЙДЕН', 640, 120, 44, '#ffd8a8', 900, 'center');
      art.txt(ctx, '10 смен · ' + PVZ.state.title(), 640, 150, 15, 'rgba(255,240,220,0.6)', 600, 'center');

      art.panel(ctx, 300, 196, 680, 356, { bg: 'rgba(40,28,20,0.94)', r: 22, border: 'rgba(255,220,180,0.28)' });
      art.txt(ctx, grade, 640, 234, 28, gradeColor, 900, 'center');
      wrap(ctx, gradeLine, 640, 262, 560, 13.5, 'rgba(255,240,220,0.75)', 600, 18, 'center');
      art.stars(ctx, 578, 306, res.rating, 15);
      art.txt(ctx, res.rating.toFixed(2) + ' / 5,00', 640, 334, 15, '#fff3e2', 800, 'center');

      var rows = [
        ['Смен закрыто', String(res.days)],
        ['Заказов выдано', String(res.served)],
        ['Выручка за забег', U.fmtMoney(res.earned)],
        ['Жалоб', String(res.complaints)],
        ['На счету', U.fmtMoney(res.money)],
        ['Долг мафии', res.debt ? U.fmtMoney(res.debt) : 'закрыт'],
        ['Секретов найдено', res.eggs + ' / ' + (PVZ.sys && PVZ.sys.EGGS ? PVZ.sys.EGGS.length : 16)]
      ];
      rows.forEach(function (r, i) {
        var y = 366 + i * 25;
        art.txt(ctx, r[0], 380, y, 14, 'rgba(255,240,220,0.62)', 600);
        art.txt(ctx, r[1], 900, y, 16, i === 2 ? '#ffd479' : '#fff3e2', 800, 'right');
      });
      var mf = res.mafia || {};
      art.txt(ctx, 'Доверие Босса: ' + (mf.trust > 0 ? '+' : '') + (mf.trust || 0) +
        ' · грязь: ' + (mf.dirt || 0) + '% · улики: ' + (mf.proof || 0) + '/3', 640, 542, 12,
        (mf.dirt || 0) > 60 ? '#ffb59d' : 'rgba(255,240,220,0.55)', 600, 'center');
      if (res.freed && !ending) {
        art.txt(ctx, 'Долг закрыт — вы больше никому не должны.', 640, 566, 13, '#8fe0a8', 700, 'center');
      }

      btns.forEach(function (b) {
        var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        art.button(ctx, b.rect, b.label, {
          hover: hov, size: b.primary ? 21 : 15,
          bg: b.primary ? 'rgba(242,153,74,0.95)' : 'rgba(52,40,32,0.92)',
          fg: b.primary ? '#2a1a10' : '#f7ead8',
          hoverBg: b.primary ? '#ffb768' : '#6a4e3c'
        });
      });
    };
    scene.onTap = function (x, y) {
      for (var i = 0; i < btns.length; i++) {
        if (U.hit(btns[i].rect, x, y)) {
          PVZ.audio.click();
          if (btns[i].id === 'restart') {
            PVZ.state.newGame();
            PVZ.game.goto(PVZ.scenes.intro());
          } else {
            PVZ.game.goto(PVZ.scenes.menu());
          }
          return;
        }
      }
    };
    scene.onKey = function (k) {
      if (k === 'Enter' || k === ' ') scene.onTap(640, 628);
      if (k === 'Escape') scene.onTap(640, 686);
    };
    scene.musicTension = function () { return 0.3; };
    scene.musicPhase = function () { return 'menu'; };
    return scene;
  };

  /* =========================================================
     ПРОЛОГ: долг мафии и открытие ПВЗ
     ========================================================= */
  scenes.intro = function () {
    var scene = {};
    var t = 0;
    var idx = 0;
    var reveal = 0;
    var mode = 'frames';
    var starting = false;
    var nextBtn = { x: 1000, y: 648, w: 224, h: 46 };
    var skipBtn = { x: 944, y: 20, w: 200, h: 34 };
    var debt = (PVZ.state.data && PVZ.state.data.debt) || 9350;
    var COLORS = ['#f2994a', '#e4572e', '#c9a227', '#5aa877', '#3f8f8a', '#4a86b8', '#5b6fb0', '#8464b0', '#d0577f', '#8a6a52'];
    var swatches = [];
    var startBtn = { x: 620, y: 588, w: 520, h: 52 };
    var nameField = { x: 620, y: 490, w: 520, h: 50 };

    var FRAMES = [
      {
        art: 'office', kicker: 'ПРОЛОГ · ДОЛГ', title: 'Город, где всё решает мафия',
        caption: 'Ты задолжал им крупную сумму. Проценты растут быстрее, чем зарплата, а время, которое тебе дали, почти вышло.'
      },
      {
        art: 'office', kicker: 'ПРАВИЛА ПРОСТЫЕ', title: 'Каждую смену — наша доля',
        caption: '«Открой свой пункт выдачи. Работай. Каждый вечер мы будем приходить за деньгами. Не заплатишь — заберём то, что нажил».'
      },
      {
        art: 'exterior', kicker: 'СВОЁ ДЕЛО', title: 'Твой пункт выдачи',
        caption: 'Ты вложил последние деньги в аренду, стеллажи и терминал. Осталось выбрать вывеску — и первая смена начнётся.'
      },
      {
        art: 'counter', kicker: 'ПЕРЕД ОТКРЫТИЕМ', title: 'Осталось только название',
        caption: 'Цвет вывески и имя пункта увидят все покупатели. Название появится над входной дверью в зале.'
      }
    ];

    function hideInput() {
      if (scene.inputEl) {
        scene.inputEl.style.display = 'none';
        try { scene.inputEl.blur(); } catch (e) { /* ignore */ }
      }
    }

    function placeInput() {
      var el = scene.inputEl;
      var canvas = PVZ.game.canvas;
      if (!el || !canvas || !canvas.getBoundingClientRect) return;
      var r = canvas.getBoundingClientRect();
      var L = PVZ.logical || { w: 1280, h: 720 };
      var sx = r.width / L.w, sy = r.height / L.h;
      el.style.left = (r.left + nameField.x * sx) + 'px';
      el.style.top = (r.top + nameField.y * sy) + 'px';
      el.style.width = (nameField.w * sx) + 'px';
      el.style.height = (nameField.h * sy) + 'px';
      el.style.fontSize = Math.round(24 * sy) + 'px';
    }

    function ensureInput() {
      if (scene.inputEl) { scene.inputEl.style.display = 'block'; placeInput(); return; }
      if (!document.body || !document.createElement) return;
      var el = document.createElement('input');
      el.type = 'text';
      if (el.setAttribute) el.setAttribute('maxlength', '18');
      el.id = 'pvz-name-input';
      el.value = PVZ.state.title();
      el.style.display = 'block';
      el.addEventListener('input', function () {
        if (!PVZ.state.data) return;
        PVZ.state.data.pvzName = String(el.value || '').slice(0, 18);
        PVZ.state.save();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          startGame();
        }
      });
      document.body.appendChild(el);
      scene.inputEl = el;
      placeInput();
    }

    function openSetup() {
      mode = 'setup';
      ensureInput();
      if (scene.inputEl) {
        scene.inputEl.value = PVZ.state.title();
        placeInput();
        try { scene.inputEl.focus(); } catch (e) { /* ignore */ }
      }
      PVZ.audio.ui();
    }

    function startGame() {
      if (starting) return;
      starting = true;
      var name = String((PVZ.state.data && PVZ.state.data.pvzName) || '').trim().slice(0, 18) || 'ПВЗ №14';
      PVZ.state.data.pvzName = name;
      PVZ.state.save();
      hideInput();
      PVZ.game.goto(PVZ.scenes.shift({ day: 1, phase: 'morning' }));
    }

    function advance() {
      var f = FRAMES[idx];
      if (reveal < f.caption.length) { reveal = f.caption.length; return; }
      if (idx < FRAMES.length - 1) {
        idx++;
        reveal = 0;
        PVZ.audio.ui();
      } else {
        openSetup();
      }
    }

    scene.enter = function () {
      t = 0; idx = 0; reveal = 0; mode = 'frames'; starting = false;
      hideInput();
      PVZ.audio.ui();
    };
    scene.exit = function () {
      if (scene.inputEl) {
        try {
          if (scene.inputEl.parentNode && scene.inputEl.parentNode.removeChild) {
            scene.inputEl.parentNode.removeChild(scene.inputEl);
          }
        } catch (e) { /* ignore */ }
        scene.inputEl = null;
      }
    };
    scene.update = function (dt) {
      t += dt;
      if (mode === 'setup') { placeInput(); return; }
      reveal = Math.min(reveal + dt * 38, FRAMES[idx].caption.length);
    };

    function drawSetup(ctx) {
      art.drawHallScene(ctx, { t: t, night: false, doorOpen: false, fittingBusy: false, lightsOn: true });
      ctx.fillStyle = 'rgba(10,7,5,0.38)';
      ctx.fillRect(0, 0, 1280, 720);
      art.vignette(ctx, 0.4);
      art.panel(ctx, 120, 386, 1040, 310, { bg: 'rgba(22,17,13,0.97)', r: 20, border: 'rgba(255,220,180,0.22)' });
      art.txt(ctx, 'ОФОРМИТЕ СВОЙ ПВЗ', 150, 424, 22, '#ffd8a8', 800);
      art.txt(ctx, 'Вывеска будет висеть над входной дверью в зале', 150, 446, 12, 'rgba(255,240,220,0.5)', 600);

      art.txt(ctx, 'ЦВЕТ ВЫВЕСКИ', 150, 478, 11, 'rgba(255,236,214,0.55)', 800);
      swatches = [];
      COLORS.forEach(function (col, i) {
        var x = 150 + (i % 5) * 84, y = 488 + Math.floor(i / 5) * 62;
        var r = { x: x, y: y, w: 56, h: 48, color: col };
        swatches.push(r);
        var sel = PVZ.state.brandColor() === col;
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        if (sel) {
          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = 18;
          art.fillRR(ctx, r.x, r.y, r.w, r.h, 11, col);
          ctx.restore();
          art.strokeRR(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 13, '#fff8ea', 3);
        } else {
          art.fillRR(ctx, r.x, r.y, r.w, r.h, 11, col);
          art.strokeRR(ctx, r.x, r.y, r.w, r.h, 11, hov ? '#fff8ea' : 'rgba(255,255,255,0.16)', hov ? 2 : 1.5);
        }
      });

      art.txt(ctx, 'НАЗВАНИЕ ПВЗ', 620, 478, 11, 'rgba(255,236,214,0.55)', 800);
      art.fillRR(ctx, nameField.x, nameField.y, nameField.w, nameField.h, 10, 'rgba(255,250,240,0.94)');
      art.strokeRR(ctx, nameField.x, nameField.y, nameField.w, nameField.h, 10, '#f2994a', 2);
      if (!scene.inputEl) {
        var manual = art.fitTxt(ctx, PVZ.state.title(), nameField.w - 30, 24, 800, 10);
        art.txt(ctx, manual.text, nameField.x + nameField.w / 2, nameField.y + 33, manual.size, '#2a1a10', 800, 'center');
      }
      art.txt(ctx, 'До 18 символов — это имя увидят покупатели', 620, 562, 11, 'rgba(255,240,220,0.4)', 600);

      var hovStart = U.hit(startBtn, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      var col = PVZ.state.brandColor();
      art.button(ctx, startBtn, 'Открыть ПВЗ ▶', {
        hover: hovStart, size: 20,
        bg: art.readableOn(col) === '#fff8ea' ? col : 'rgba(242,153,74,0.95)',
        fg: art.readableOn(col) === '#fff8ea' ? '#fff8ea' : '#2a1a10'
      });
      art.txt(ctx, 'Название и цвет можно будет поменять только в новом забеге', 620, 664, 10, 'rgba(255,240,220,0.35)', 600);
    }

    scene.draw = function (ctx) {
      if (mode === 'setup') { drawSetup(ctx); return; }
      var f = FRAMES[idx];
      if (f.art === 'office') {
        art.drawNoirOffice(ctx, { t: t, debtLabel: U.fmtMoney(debt), tension: idx === 1 ? 0.5 : 0.12 });
      } else if (f.art === 'exterior') {
        art.drawShopExterior(ctx, { t: t, lit: true });
      } else {
        art.drawCounterScene(ctx, {
          t: t, clock: 7 * 60 + 45, crowd: [], night: false, doorOpen: false,
          laptopApp: 'home', money: 0, shiftOpen: false
        });
        ctx.fillStyle = 'rgba(12,8,6,0.32)';
        ctx.fillRect(0, 0, 1280, 720);
        art.vignette(ctx, 0.42);
      }

      // кинематографичные полосы
      var top = ctx.createLinearGradient(0, 0, 0, 96);
      top.addColorStop(0, 'rgba(4,3,3,0.96)');
      top.addColorStop(1, 'rgba(4,3,3,0.78)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, 1280, 96);
      var bot = ctx.createLinearGradient(0, 560, 0, 720);
      bot.addColorStop(0, 'rgba(4,3,3,0.55)');
      bot.addColorStop(0.25, 'rgba(4,3,3,0.94)');
      bot.addColorStop(1, 'rgba(4,3,3,0.99)');
      ctx.fillStyle = bot;
      ctx.fillRect(0, 560, 1280, 160);

      art.txt(ctx, f.kicker, 64, 46, 13, '#ffb27a', 800);
      // точки прогресса
      FRAMES.forEach(function (_, i) {
        ctx.beginPath();
        ctx.arc(640 - (FRAMES.length - 1) * 12 + i * 24, 42, i === idx ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i === idx ? '#f2994a' : 'rgba(255,240,220,0.25)';
        ctx.fill();
      });
      // пропустить
      var skipHov = U.hit(skipBtn, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      art.fillRR(ctx, skipBtn.x, skipBtn.y, skipBtn.w, skipBtn.h, 10, skipHov ? 'rgba(242,153,74,0.9)' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, 'Пропустить пролог ✕', skipBtn.x + skipBtn.w / 2, skipBtn.y + 22, 12, skipHov ? '#2a1a10' : 'rgba(255,240,220,0.6)', 700, 'center');

      art.txt(ctx, f.title, 64, 608, 32, '#ffd8a8', 800);
      var shown = f.caption.slice(0, Math.floor(reveal));
      wrap(ctx, shown, 64, 642, 880, 16, 'rgba(255,240,220,0.82)', 600, 23);
      var full = reveal >= f.caption.length;
      var hov = U.hit(nextBtn, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
      art.button(ctx, nextBtn, idx < FRAMES.length - 1 ? 'Далее ▶' : 'Оформить ПВЗ ▶', {
        hover: hov, size: 17,
        bg: full ? 'rgba(242,153,74,0.95)' : 'rgba(70,54,44,0.9)',
        fg: full ? '#2a1a10' : 'rgba(255,240,225,0.55)'
      });
      art.txt(ctx, 'Тап / Enter — дальше', 64, 700, 11, 'rgba(255,240,220,0.35)', 600);
    };
    scene.onTap = function (x, y) {
      if (mode === 'setup') {
        for (var i = 0; i < swatches.length; i++) {
          if (U.hit(swatches[i], x, y)) {
            PVZ.state.data.pvzColor = swatches[i].color;
            PVZ.state.save();
            PVZ.audio.click();
            return;
          }
        }
        if (U.hit(nameField, x, y)) {
          if (scene.inputEl) { try { scene.inputEl.focus(); } catch (e) { /* ignore */ } }
          return;
        }
        if (U.hit(startBtn, x, y)) { PVZ.audio.click(); startGame(); return; }
        return;
      }
      if (U.hit(skipBtn, x, y)) { PVZ.audio.click(); openSetup(); return; }
      if (U.hit(nextBtn, x, y)) {
        PVZ.audio.click();
        var f = FRAMES[idx];
        if (reveal < f.caption.length) { reveal = f.caption.length; return; }
        if (idx < FRAMES.length - 1) { idx++; reveal = 0; PVZ.audio.ui(); }
        else openSetup();
        return;
      }
      advance();
    };
    scene.onKey = function (k) {
      if (mode === 'setup') {
        if (k === 'Enter') startGame();
        return;
      }
      if (k === 'Enter' || k === ' ' || k === 'ArrowRight') advance();
      if (k === 'Escape') openSetup();
    };
    scene.musicTension = function () { return idx >= 2 ? 0.3 : 0.62; };
    scene.musicPhase = function () { return 'menu'; };
    return scene;
  };

  /* =========================================================
     ВЕЧЕРНИЙ ВИЗИТ МАФИИ
     ========================================================= */
  scenes.mafia = function (data) {
    data = data || {};
    var res = data.result || {
      day: (PVZ.state.data && PVZ.state.data.day) || 1,
      demand: 0, paid: 0, short: false, moneyBefore: 0, moneyAfter: 0,
      debtBefore: (PVZ.state.data && PVZ.state.data.debt) || 0,
      debtAfter: (PVZ.state.data && PVZ.state.data.debt) || 0,
      taken: [], rage: false
    };
    var report = data.report || null;
    var scene = {};
    scene.isMafia = true;
    var t = 0;
    var line = 0;
    var beatT = 1.2;
    var btn = { x: 420, y: 604, w: 440, h: 52 };

    var bossPerson = {
      skin: 1, hair: '#161412', style: 'short', shirt: '#f1e8d9', pants: '#191920',
      coat: '#8e2440', hat: 'fedora', hatColor: '#8e2440', tie: '#141014',
      stubble: true, scar: true, cigar: true, evil: true, armsCrossed: true,
      expr: 'angry', build: 1.3, headScale: 0.92
    };
    var goonPerson = {
      skin: 3, hair: '#131110', style: 'bald', shirt: '#22222a', pants: '#17171c',
      coat: '#1e1e26', beard: true, shades: true, scar: true, stubble: true, evil: true,
      armsCrossed: true, expr: 'snarl', build: 1.42, headScale: 0.8
    };

    var lines = (function () {
      var out = [];
      if (res.mode === 'defer') {
        out.push({ who: 'boss', name: 'Босс', text: 'День ' + res.day + '. Денег нет?' });
        out.push({ who: 'hero', name: 'Вы', text: 'Дайте срок. Я всё отдам.' });
        out.push({ who: 'goon', name: 'Громила', text: 'Срок — это проценты. ' + U.fmtMoney(res.interest || 0) + ' сверху.' });
        out.push({ who: 'boss', name: 'Босс', text: 'Долг теперь ' + U.fmtMoney(res.debtAfter) + '. В следующий раз не проси.' });
      } else if (res.mode === 'favor') {
        var need = res.task ? res.task.need : 8;
        var reward = res.task ? res.task.reward : 0;
        out.push({ who: 'boss', name: 'Босс', text: 'Денег нет — отработаешь.' });
        out.push({ who: 'goon', name: 'Громила', text: 'Завтра смена под присмотром. Обслужишь ' + need + ' клиентов — спишем ' + U.fmtMoney(reward) + '.' });
        out.push({ who: 'hero', name: 'Вы', text: 'Понял. Сделаю.' });
        out.push({ who: 'boss', name: 'Босс', text: 'И не вздумай мухлевать. Мы считаем.' });
      } else if (res.mode === 'threat') {
        out.push({ who: 'boss', name: 'Босс', text: 'Ты чем-то угрожаешь?' });
        out.push({ who: 'hero', name: 'Вы', text: 'У меня есть бумаги. Хотите — проверим, кто кого держит.' });
        out.push({ who: 'goon', name: 'Громила', text: '*делает шаг вперёд, но Босс его останавливает*' });
        out.push({ who: 'boss', name: 'Босс', text: 'Смело. Долг остаётся. Но теперь мы смотрим внимательнее.' });
      } else if (!res.short) {
        out.push({ who: 'boss', name: 'Босс', text: 'День ' + res.day + '. Принёс?' });
        out.push({ who: 'hero', name: 'Вы', text: 'Вот ' + U.fmtMoney(res.paid) + '. Как договаривались.' });
        out.push({ who: 'goon', name: 'Громила', text: 'Считано. ' + U.fmtMoney(res.paid) + ' ₽. Всё ровно.' });
        out.push({
          who: 'boss', name: 'Босс',
          text: res.debtAfter <= 0
            ? 'Долг закрыт. Но процент мы всё равно возьмём — за беспокойство.'
            : 'Остаток долга — ' + U.fmtMoney(res.debtAfter) + '. Не расслабляйся.'
        });
      } else {
        out.push({ who: 'boss', name: 'Босс', text: 'День ' + res.day + '. В кассе ' + U.fmtMoney(res.moneyBefore) + ', а надо ' + U.fmtMoney(res.demand) + '. Где остальное?' });
        out.push({ who: 'hero', name: 'Вы', text: 'Смена была тяжёлая. Я отдам в следующий раз…' });
        out.push({ who: 'goon', name: 'Громила', text: '«В следующий раз» не кормит. Не хватает ' + U.fmtMoney(Math.max(0, res.demand - res.moneyBefore)) + '.' });
        if (res.taken && res.taken.length) {
          out.push({ who: 'boss', name: 'Босс', text: res.taken[0].line });
          out.push({ who: 'hero', name: 'Вы', text: 'Это же для пункта…' });
          out.push({ who: 'boss', name: 'Босс', text: 'Долг остаётся ' + U.fmtMoney(res.debtAfter) + '. В следующий раз принеси всё. Иначе заберём пункт.' });
        } else if (res.rage) {
          out.push({ who: 'boss', name: 'Босс', text: 'Пусто. Даже взять нечего. Это твоё последнее предупреждение.' });
        }
      }
      return out;
    })();

    function done() { return line >= lines.length; }

    function finish() {
      if (report) PVZ.game.goto(PVZ.scenes.report(report));
      else PVZ.game.goto(PVZ.scenes.menu());
    }

    function advance() {
      if (done()) { finish(); return; }
      line++;
      PVZ.audio.ui();
    }

    scene.enter = function () {
      t = 0;
      line = 0;
      beatT = 1.2;
      // вечерний визит: радио захлёбывается помехами, включается страшная тема
      if (PVZ.music && PVZ.music.cutRadio && PVZ.state.hasApp && PVZ.state.hasApp('radio') && !PVZ.music.silent) {
        PVZ.music.cutRadio();
      }
      if (PVZ.music && PVZ.music.snapMood) PVZ.music.snapMood('scary');
      PVZ.audio.bad();
      PVZ.audio.boom();
    };
    scene.exit = function () { if (PVZ.music && PVZ.music.setMood) PVZ.music.setMood('calm'); };
    scene.update = function (dt) {
      t += dt;
      // сердцебиение в тишине диалога
      beatT -= dt;
      if (beatT <= 0) { beatT = 2.5; PVZ.audio.heartbeat(); }
    };
    scene.draw = function (ctx) {
      var crowd = [
        { person: bossPerson, x: 372, gy: 520, h: 356, mood: null, bubbleAlpha: 0, alpha: 1 },
        { person: goonPerson, x: 600, gy: 520, h: 330, mood: null, bubbleAlpha: 0, alpha: 1 }
      ];
      art.drawCounterScene(ctx, {
        t: t, clock: 21 * 60 + 5, crowd: crowd, night: true, doorOpen: false,
        laptopApp: 'home', money: res.moneyAfter, showCash: true, cashDone: true
      });
      ctx.fillStyle = 'rgba(20,6,4,0.26)';
      ctx.fillRect(0, 0, 1280, 720);
      art.vignette(ctx, 0.52);

      // заголовок вечера
      art.txt(ctx, 'КОНЕЦ СМЕНЫ · ВАС ЖДАЛИ', 640, 54, 20, '#ff9d7a', 900, 'center');
      art.txt(ctx, 'День ' + res.day + ' · ' + PVZ.state.title(), 640, 78, 13, 'rgba(255,220,205,0.6)', 600, 'center');

      // сводка требований
      art.panel(ctx, 946, 108, 306, 210, { bg: 'rgba(32,14,11,0.94)', r: 16, border: 'rgba(255,120,90,0.3)' });
      art.txt(ctx, 'ТРЕБУЮТ', 968, 136, 11, 'rgba(255,190,170,0.7)', 800);
      art.txt(ctx, U.fmtMoney(res.demand), 968, 166, 24, '#ffb59d', 800);
      art.txt(ctx, 'В кошельке: ' + U.fmtMoney(res.moneyBefore), 968, 196, 13, 'rgba(255,235,220,0.75)', 600);
      art.txt(ctx, 'Долг мафии: ' + U.fmtMoney(res.debtBefore), 968, 222, 13, 'rgba(255,235,220,0.6)', 600);
      art.txt(ctx, 'Визит №' + (res.visits || ((PVZ.state.data && PVZ.state.data.mafiaVisits) || 1)), 968, 250, 11, 'rgba(255,190,170,0.45)', 600);
      if (res.trust !== undefined) {
        art.txt(ctx, 'Доверие: ' + (res.trust > 0 ? '+' : '') + res.trust, 968, 276, 12,
          res.trust < -20 ? '#ff8a5c' : res.trust > 20 ? '#8fe0a8' : 'rgba(255,235,220,0.65)', 700);
      }
      if (res.dirt !== undefined) {
        art.txt(ctx, 'Грязь: ' + res.dirt + '%', 968, 296, 12,
          res.dirt > 60 ? '#ff8a5c' : 'rgba(255,235,220,0.65)', 700);
      }

      if (!done()) {
        var l = lines[line];
        var col = l.who === 'boss' ? '#ffd8a8' : l.who === 'goon' ? '#ffb59d' : '#9fd6c6';
        art.panel(ctx, 120, 470, 1040, 118, { bg: 'rgba(20,10,8,0.94)', r: 18, border: 'rgba(255,150,110,0.22)' });
        art.txt(ctx, l.name.toUpperCase(), 148, 500, 12, col, 800);
        wrap(ctx, l.text, 148, 530, 980, 18, '#fff3e2', 600, 26);
        art.txt(ctx, 'Тап — дальше', 1132, 574, 11, 'rgba(255,240,220,0.4)', 600, 'right');
      } else {
        // итог визита
        art.panel(ctx, 120, 452, 1040, 132, { bg: 'rgba(24,12,9,0.96)', r: 18, border: 'rgba(255,150,110,0.28)' });
        art.txt(ctx, 'ИТОГ ВИЗИТА', 148, 482, 12, 'rgba(255,190,170,0.65)', 800);
        if (res.mode === 'defer') {
          art.txt(ctx, 'Отсрочка: +' + U.fmtMoney(res.interest || 0) + ' процентов', 148, 520, 17, '#ffb59d', 700);
          art.txt(ctx, 'Долг теперь ' + U.fmtMoney(res.debtAfter) + ' ₽ · доверие ' + (res.trust || 0), 148, 546, 13, 'rgba(255,235,220,0.65)', 600);
        } else if (res.mode === 'favor') {
          art.txt(ctx, 'Услуга: обслужить ' + (res.task ? res.task.need : 8) + ' клиентов', 148, 520, 17, '#ffd8a8', 700);
          art.txt(ctx, 'Спишут ' + U.fmtMoney(res.task ? res.task.reward : 0) + ' ₽ · грязь ' + (res.dirt || 0) + '%', 148, 546, 13, 'rgba(255,235,220,0.65)', 600);
        } else if (res.mode === 'threat') {
          art.txt(ctx, 'Угроза принята. Улик: ' + (res.proof || 0) + ' / 3', 148, 520, 17, '#8fb8e0', 700);
          art.txt(ctx, 'Доверие ' + (res.trust || 0) + ' · долг ' + U.fmtMoney(res.debtAfter) + ' ₽', 148, 546, 13, 'rgba(255,235,220,0.65)', 600);
        } else if (res.taken && res.taken.length) {
          var it = res.taken[0];
          art.fillRR(ctx, 148, 498, 52, 52, 12, 'rgba(255,255,255,0.08)');
          art.txt(ctx, it.icon, 174, 534, 26, '#ffd8a8', 800, 'center');
          art.txt(ctx, 'Забрали: ' + it.name + ' (' + it.tier + ')', 218, 520, 17, '#ffb59d', 700);
          art.txt(ctx, 'Вместо денег. Долг: ' + U.fmtMoney(res.debtAfter) + ' ₽', 218, 546, 13, 'rgba(255,235,220,0.65)', 600);
        } else if (res.short) {
          art.txt(ctx, 'Денег не хватило. Забирать было нечего.', 148, 520, 17, '#ffb59d', 700);
          art.txt(ctx, 'Долг: ' + U.fmtMoney(res.debtAfter) + ' ₽ · репутация просела', 148, 546, 13, 'rgba(255,235,220,0.65)', 600);
        } else {
          art.txt(ctx, 'Оплачено: ' + U.fmtMoney(res.paid) + ' ₽', 148, 520, 18, '#8fe0a8', 700);
          art.txt(ctx, 'Остаток долга: ' + U.fmtMoney(res.debtAfter) + ' ₽ · в кошельке ' + U.fmtMoney(res.moneyAfter) + ' ₽', 148, 546, 13, 'rgba(255,235,220,0.65)', 600);
        }
        var hov = U.hit(btn, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
        art.button(ctx, btn, 'Открыть отчёт ▶', { hover: hov, size: 18, bg: 'rgba(242,153,74,0.95)', fg: '#2a1a10' });
      }
    };
    scene.onTap = function (x, y) {
      if (done()) {
        if (U.hit(btn, x, y)) { PVZ.audio.click(); finish(); }
        return;
      }
      advance();
    };
    scene.onKey = function (k) {
      if (k === 'Enter' || k === ' ' || k === 'Escape') advance();
    };
    scene.musicTension = function () { return 0.9; };
    scene.musicMood = function () { return 'scary'; };
    return scene;
  };

  /* =========================================================
     МЕНЮ
     ========================================================= */
  scenes.menu = function () {
    var scene = {};
    scene.isMenu = true;
    var t = 0;
    var btns = [];
    var showHelp = false;
    var helpPage = 0;
    var HELP_PAGES = [
      {
        title: 'СМЕНА: УТРО, ДЕНЬ, ВЕЧЕР',
        lines: [
          'Утро: включите свет в зале, откройте смену в терминале (T), примите поставку на складе и откройте входную дверь.',
          'Коробки из поставки перетаскивайте мышью или пальцем: возьмите из лотка «ПРИЁМКА» и отпустите над свободной ячейкой. Крупный товар — только на нижнюю полку.',
          'Днём покупатели подходят к стойке. У каждого свой характер, телефон и привычка платить.',
          'Вечер: закройте дверь, уберите мусор, сдайте возвраты, сверьте кассу и закройте смену в терминале.',
          'Цель — продержаться 10 смен. Если рейтинг упадёт до 3,00, пункт закроют. Следите за звёздочками слева сверху.',
          'Рейтинг — средняя оценка последних клиентов: довольный тянет его вверх, жалоба роняет сразу и заметно. Рядом со звёздами видны оценки последних пяти визитов и стрелка тренда.',
          'Бесконечный режим: мафии нет, смены не кончаются, но каждый вечер приходит арендодатель — фиксированная ставка плюс доля выручки. Три неоплаты подряд — выселение.'
        ]
      },
      {
        title: 'ПОКУПАТЕЛИ И ДЕНЬГИ',
        lines: [
          'Код получения можно отсканировать с телефона (QTE) или попросить продиктовать. У кого-то телефон разбит, у кого-то только часы.',
          'Возьмите посылку на складе (дверь слева), отсканируйте её и нажмите на покупателя. У клиента может быть несколько посылок.',
          'Наложенный платёж — деньги продавца: пункт получает только комиссию за приём. Сдачу отдавайте внимательно.',
          'Каждый вариант ответа стоит времени, денег или репутации — подпись справа говорит, чем именно рискуете, но без цифр: думайте сами.',
          'Решение возвращается: обиженный блогер, сосед или спасённый ребёнок напомнят о себе через пару смен — утром придёт «Новости пункта».',
          'Одежду можно отправить в примерочную, товар с браком — вернуть. За возврат и примерку пункт тоже получает деньги.'
        ]
      },
      {
        title: 'НОУТБУК, МАГАЗИН И СЕКРЕТЫ',
        lines: [
          'В ноутбуке (L): терминал, магазин, отзывы, телефон и мини-игры. Отвечайте на отзывы — вежливость поднимает рейтинг.',
          'Магазин: 19 предметов, у каждого три уровня (обычный → серебряный → золотой). Декор поднимает терпение, улучшения ускоряют работу, автоматизация убирает лишние шаги выдачи.',
          'Телефон: 101/102/103. Бандит — полиция, человеку плохо — скорая, пожар — пожарные. Промедление стоит пункта.',
          'Каждый вечер мафия требует долю. Не хватит денег — заберут предмет. Долг можно закрыть полностью: тогда вы свободны.',
          'В игре спрятаны пасхалки: редкие гости, предметы на столе, кот и даже клавиатура. Найденные собираются в приложении «Секреты».',
          'Первую смену ведёт обучение — его можно пропустить в любой момент.'
        ]
      }
    ];

    function layout() {
      var data = PVZ.state.data;
      var hasShift = !!(data && data.shift && data.shift.day);
      btns = [];
      var y = 356;
      if (hasShift) {
        btns.push({ id: 'continue', rect: { x: 440, y: y, w: 400, h: 56 }, label: 'Продолжить смену', primary: true });
        y += 64;
      }
      btns.push({ id: 'new', rect: { x: 440, y: y, w: 400, h: 52 }, label: hasShift ? 'Новая смена' : (data && data.over ? 'Новый забег' : 'Начать смену'), primary: !hasShift });
      y += 60;
      btns.push({ id: 'endless', rect: { x: 440, y: y, w: 400, h: 46 }, label: '∞  Бесконечный режим' });
      y += 54;
      if (data && data.finale) {
        btns.push({ id: 'results', rect: { x: 440, y: y, w: 400, h: 42 }, label: data.over ? 'Что случилось?' : 'Итоги забега' });
        y += 50;
      }
      if (data && (data.totals.days > 0 || (data.owned && data.owned.length))) {
        btns.push({ id: 'shop', rect: { x: 440, y: y, w: 400, h: 42 }, label: 'Магазин и декор' });
        y += 50;
      }
      btns.push({ id: 'help', rect: { x: 440, y: y, w: 196, h: 42 }, label: 'Как играть' });
      btns.push({ id: 'sound', rect: { x: 644, y: y, w: 196, h: 42 }, label: (data && data.settings.sound ? 'Звук: вкл' : 'Звук: выкл') });
    }

    scene.enter = function () {
      layout();
      PVZ.audio.resume();
    };
    scene.update = function (dt) { t += dt; };
    scene.draw = function (ctx) {
      art.drawCounterScene(ctx, {
        t: t, clock: 7 * 60 + 40, crowd: [], night: false, doorOpen: false, passerby: 2,
        laptopApp: 'home', money: PVZ.state.data ? PVZ.state.data.money : 0
      });
      ctx.fillStyle = 'rgba(16,11,8,0.74)';
      ctx.fillRect(0, 0, 1280, 720);

      ctx.save();
      ctx.shadowColor = 'rgba(242,153,74,0.55)';
      ctx.shadowBlur = 34;
      art.fillRR(ctx, 452, 82, 376, 120, 24, '#f2994a');
      ctx.restore();
      art.fillRR(ctx, 470, 98, 340, 88, 18, '#fff6e6');
      art.txt(ctx, 'ПВЗ', 640, 166, 62, '#3a2a21', 900, 'center');
      art.txt(ctx, 'Смена', 640, 236, 38, '#ffd8a8', 800, 'center');
      art.txt(ctx, 'симулятор пункта выдачи заказов', 640, 270, art.compact ? 22 : 17, 'rgba(255,240,220,0.72)', 600, 'center');

      var data = PVZ.state.data;
      var endlessMenu = !!(data && data.mode === 'endless');
      if (data && data.shift) {
        art.txt(ctx, 'Смена ' + data.shift.day + ' · ' + U.fmtTime(data.shift.clock || MORNING_START), 640, 306, art.compact ? 19 : 15, 'rgba(255,240,220,0.78)', 600, 'center');
      } else if (data && data.totals.days > 0) {
        art.txt(ctx, 'Смен закрыто: ' + data.totals.days + ' · обслужили: ' + data.totals.served + ' · рейтинг ' + data.rating.toFixed(2), 640, 306, art.compact ? 19 : 15, 'rgba(255,240,220,0.65)', 600, 'center');
      }
      if (data && endlessMenu && !data.over) {
        art.txt(ctx, '∞ Бесконечный режим · смена ' + data.day + ' · аренда ' + U.fmtMoney(sys.rentDue(data.day, 0)) +
          ' · рекорд ' + ((data.endlessBest && data.endlessBest.day) || 0) + ' смен', 640, 330, art.compact ? 17 : 13, '#ffd479', 600, 'center');
      } else if (data) {
        if (data.over) {
          art.txt(ctx, (data.finale && data.finale.kind === 'fire')
            ? 'ПВЗ сгорел: вы не успели вызвать пожарных. Начните новый забег.'
            : 'Пункт закрыт: рейтинг упал ниже ' + PVZ.balance.ratingFail.toFixed(1) + '. Начните новый забег.', 640, 330, art.compact ? 18 : 14, '#ffb59d', 700, 'center');
        } else if (data.won) {
          art.txt(ctx, 'Забег пройден: ' + PVZ.balance.WIN_DAY + ' смен позади. Рейтинг ' + data.rating.toFixed(2) + ' · долг ' + U.fmtMoney(data.debt || 0) + '.', 640, 330, art.compact ? 18 : 14, '#8fe0a8', 700, 'center');
        } else {
          art.txt(ctx, 'Цель: продержаться ' + PVZ.balance.WIN_DAY + ' смен · сейчас день ' + data.day + '/' + PVZ.balance.WIN_DAY + ' · долг мафии ' + U.fmtMoney(data.debt || 0), 640, 330, art.compact ? 17 : 13, 'rgba(255,240,220,0.6)', 600, 'center');
        }
      }

      if (!showHelp) {
        btns.forEach(function (b) {
          var hov = U.hit(b.rect, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch;
          art.button(ctx, b.rect, b.label, {
            hover: hov,
            size: b.primary ? (art.compact ? 26 : 22) : (art.compact ? 21 : 17),
            bg: b.primary ? 'rgba(242,153,74,0.95)' : 'rgba(52,38,30,0.92)',
            fg: b.primary ? '#2a1a10' : '#f7ead8',
            hoverBg: b.primary ? '#ffb768' : '#6a4e3c',
            hoverFg: b.primary ? '#2a1a10' : '#fff'
          });
        });
        if (!art.compact) art.txt(ctx, 'Мышь / тап · ◀ ▶ — склад и зал · L — ноутбук · T — терминал · Esc — пауза', 640, 700, 12, 'rgba(255,240,220,0.45)', 600, 'center');
      } else {
        // справка разбита на страницы: на телефоне длинная простыня была нечитаема
        var hp2 = art.compact ? { x: 16, y: 56, w: 1248, h: 644 } : { x: 140, y: 236, w: 1000, h: 448 };
        art.panel(ctx, hp2.x, hp2.y, hp2.w, hp2.h, { bg: 'rgba(34,24,19,0.98)', r: 20, border: 'rgba(255,220,180,0.18)' });
        art.txt(ctx, HELP_PAGES[helpPage].title, 640, hp2.y + 40, art.compact ? 24 : 19, '#ffc27a', 800, 'center');
        art.txt(ctx, (helpPage + 1) + ' / ' + HELP_PAGES.length, hp2.x + hp2.w - 40, hp2.y + 40, art.compact ? 17 : 13, 'rgba(255,240,220,0.6)', 700, 'right');
        var y = hp2.y + 76;
        HELP_PAGES[helpPage].lines.forEach(function (h) {
          var lines = wrap(ctx, '• ' + h, hp2.x + 40, y, hp2.w - 80, art.compact ? 19 : 14, 'rgba(255,240,220,0.92)', 600, art.compact ? 26 : 19);
          y += lines * (art.compact ? 26 : 19) + (art.compact ? 10 : 8);
        });
        var navY = art.compact ? 652 : 640;
        var prevB = { x: 180, y: navY, w: 170, h: 40 };
        var nextB = { x: 930, y: navY, w: 170, h: 40 };
        if (helpPage > 0) {
          art.button(ctx, prevB, '◀ Назад', {
            hover: U.hit(prevB, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch, size: art.compact ? 19 : 14
          });
        }
        if (helpPage < HELP_PAGES.length - 1) {
          art.button(ctx, nextB, 'Далее ▶', {
            hover: U.hit(nextB, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch, size: art.compact ? 19 : 14,
            bg: 'rgba(242,153,74,0.92)', fg: '#2a1a10'
          });
        } else {
          art.button(ctx, nextB, 'Понятно', {
            hover: U.hit(nextB, PVZ.input.x, PVZ.input.y) && !PVZ.input.touch, size: art.compact ? 19 : 14,
            bg: 'rgba(90,168,119,0.9)', fg: '#12321f'
          });
        }
        for (var hp = 0; hp < HELP_PAGES.length; hp++) {
          ctx.beginPath();
          ctx.arc(640 - (HELP_PAGES.length - 1) * 11 + hp * 22, art.compact ? 700 : 660, hp === helpPage ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = hp === helpPage ? '#f2994a' : 'rgba(255,240,220,0.25)';
          ctx.fill();
        }
        if (!art.compact) art.txt(ctx, 'Мышь / тап · ◀ ▶ — склад и зал · L — ноутбук · T — терминал · Esc — пауза', 640, 704, 12, 'rgba(255,240,220,0.35)', 600, 'center');
      }
    };
    scene.onTap = function (x, y) {
      if (showHelp) {
        var navY = art.compact ? 652 : 640;
        var prevB = { x: 180, y: navY, w: 170, h: 40 };
        var nextB = { x: 930, y: navY, w: 170, h: 40 };
        if (U.hit(prevB, x, y) && helpPage > 0) { helpPage--; PVZ.audio.ui(); return; }
        if (U.hit(nextB, x, y)) {
          if (helpPage < HELP_PAGES.length - 1) { helpPage++; PVZ.audio.ui(); }
          else { showHelp = false; PVZ.audio.click(); }
          return;
        }
        return;
      }
      for (var i = 0; i < btns.length; i++) {
        if (U.hit(btns[i].rect, x, y)) {
          PVZ.audio.click();
          var id = btns[i].id;
          if (id === 'new') {
            PVZ.state.newGame();
            PVZ.game.goto(PVZ.scenes.intro());
          } else if (id === 'endless') {
            PVZ.state.startEndless();
            PVZ.game.goto(PVZ.scenes.shift({ day: 1, phase: 'morning' }));
          } else if (id === 'continue') {
            PVZ.state.load();
            PVZ.game.goto(PVZ.scenes.shift({ resume: true }));
          } else if (id === 'shop') {
            PVZ.game.goto(PVZ.scenes.shop({ from: 'menu' }));
          } else if (id === 'results') {
            if (PVZ.state.data.over) PVZ.game.goto(PVZ.scenes.gameover(PVZ.state.data.finale));
            else PVZ.game.goto(PVZ.scenes.finale());
          } else if (id === 'help') {
            showHelp = true;
            helpPage = 0;
          } else if (id === 'sound') {
            PVZ.state.data.settings.sound = !PVZ.state.data.settings.sound;
            PVZ.audio.muted = !PVZ.state.data.settings.sound;
            PVZ.state.save();
            layout();
          }
          return;
        }
      }
    };
    scene.onKey = function (k) {
      if (showHelp) {
        if (k === 'Escape') { showHelp = false; return; }
        if (k === 'ArrowLeft' && helpPage > 0) { helpPage--; PVZ.audio.ui(); return; }
        if (k === 'ArrowRight' || k === 'Enter' || k === ' ') {
          if (helpPage < HELP_PAGES.length - 1) helpPage++;
          else showHelp = false;
          PVZ.audio.ui();
        }
        return;
      }
      if (k === 'Enter' || k === ' ') {
        var b = btns[0];
        if (b) scene.onTap(b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2);
      }
    };
    scene.musicTension = function () { return 0.12; };
    scene.musicPhase = function () { return 'menu'; };
    return scene;
  };
})();
