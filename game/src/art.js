/* ПВЗ: Смена — вся векторная графика: интерьеры, люди, реквизит, HUD */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util;
  var art = (PVZ.art = {});

  var FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  var P = (art.P = {
    ink: '#3a2a21',
    inkSoft: '#6b5344',
    wall: '#efe1cc',
    wallTop: '#e4d2b6',
    wallShade: '#d8c3a4',
    wallDark: '#c2a982',
    floor: '#c8a274',
    floorDot: '#b98e5d',
    wood: '#a9713f',
    woodLight: '#c78b52',
    woodMid: '#b57c47',
    woodDark: '#7d4f2a',
    deskTop: '#c08a52',
    accent: '#f2994a',
    accentDark: '#d97b2f',
    green: '#5aa877',
    greenDark: '#3f8659',
    blue: '#4a86b8',
    blueDark: '#366a94',
    red: '#e4572e',
    cream: '#faf0df',
    paper: '#fffaf0',
    parcel: '#c9a26a',
    parcelLight: '#dcb87f',
    parcelDark: '#a07c4b',
    parcelTape: '#e6d3a8',
    metal: '#9aa3a8',
    metalDark: '#6c757a',
    metalLight: '#c3cbd0',
    glass: '#a9d3dd',
    glassDark: '#7fb4c2',
    night: '#2a3446',
    skin: ['#f4cba8', '#e5b183', '#cf9868', '#b5794c', '#96603a', '#7c4c2c', '#f7dcc0'],
    hairColors: ['#2e2119', '#4a3020', '#6d4526', '#a4713a', '#d8b072', '#c9c1b6', '#8a3b2a', '#3d3d46'],
    shirtColors: ['#4a86b8', '#5aa877', '#e4572e', '#f2994a', '#8464b0', '#d0577f', '#3f8f8a', '#7a8b99', '#c9a227', '#5b6fb0'],
    pantsColors: ['#3c4a5a', '#54483d', '#2f3b46', '#6a5d52', '#40485c', '#8a7a66']
  });

  /* ---------------- примитивы ---------------- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r == null ? 8 : r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  art.rr = rr;

  function fillRR(ctx, x, y, w, h, r, color) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }
  art.fillRR = fillRR;

  function strokeRR(ctx, x, y, w, h, r, color, lw) {
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw || 2;
    ctx.stroke();
  }
  art.strokeRR = strokeRR;

  /* Масштаб текста: на телефоне 11–13 px логических превращаются в нечитаемые
     6–8 px, поэтому на маленьких экранах весь текст рисуется чуть крупнее. */
  art.textScale = 1;
  art.setTextScale = function (v) {
    art.textScale = Math.max(0.85, Math.min(1.6, v || 1));
  };
  /* Компактный интерфейс для телефона: меньше панелей, крупнее шрифт.
     Включается по реальному CSS-размеру окна, а не по logical 1280×720. */
  art.compact = false;
  art.setCompact = function (v) { art.compact = !!v; };

  function txt(ctx, s, x, y, size, color, weight, align, baseline) {
    ctx.font = (weight || 600) + ' ' + (size * art.textScale).toFixed(2) + 'px ' + FONT;
    ctx.fillStyle = color || P.ink;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(s, x, y);
  }
  art.txt = txt;

  function txtW(ctx, s, size, weight) {
    ctx.font = (weight || 600) + ' ' + (size * art.textScale).toFixed(2) + 'px ' + FONT;
    return ctx.measureText(s).width;
  }
  art.txtW = txtW;

  /* Вписать строку в ширину: уменьшаем кегль, при необходимости обрезаем */
  function fitTxt(ctx, s, maxW, size, weight, minSize) {
    var m = Math.max(minSize || 9, size);
    while (m > (minSize || 9) && txtW(ctx, s, m, weight) > maxW) m -= 1;
    var out = String(s);
    if (txtW(ctx, out, m, weight) > maxW) {
      while (out.length > 3 && txtW(ctx, out + '…', m, weight) > maxW) out = out.slice(0, -1);
      out += '…';
    }
    return { text: out, size: m };
  }
  art.fitTxt = fitTxt;

  /* Контрастный цвет текста для плашки бренда */
  function readableOn(hex) {
    var c = String(hex || '#f2994a').replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.slice(0, 2), 16) / 255;
    var g = parseInt(c.slice(2, 4), 16) / 255;
    var b = parseInt(c.slice(4, 6), 16) / 255;
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.56 ? '#2a1a10' : '#fff8ea';
  }
  art.readableOn = readableOn;

  function glowRect(ctx, r, t, color) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save();
    ctx.shadowColor = color || 'rgba(242,153,74,0.9)';
    ctx.shadowBlur = 14 + pulse * 10;
    ctx.strokeStyle = color || '#ffc27a';
    ctx.lineWidth = 2.5;
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.stroke();
    ctx.restore();
  }
  art.glowRect = glowRect;

  /* Мягкая контактная тень: предмет не «висит» над поверхностью */
  function softShadow(ctx, cx, cy, rx, ry, alpha, color) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, color || ('rgba(38,24,14,' + (alpha == null ? 0.28 : alpha) + ')'));
    g.addColorStop(0.55, 'rgba(38,24,14,' + ((alpha == null ? 0.28 : alpha) * 0.55) + ')');
    g.addColorStop(1, 'rgba(38,24,14,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.max(0.08, ry / Math.max(1, rx)));
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(rx, ry), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  art.softShadow = softShadow;

  /* Затемнение по краям сцены — объём, а не плоская заливка */
  function edgeShade(ctx, x, y, w, h, strength) {
    var s = strength == null ? 0.16 : strength;
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(45,28,18,' + s + ')');
    g.addColorStop(0.16, 'rgba(45,28,18,' + (s * 0.22) + ')');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(0.84, 'rgba(45,28,18,' + (s * 0.22) + ')');
    g.addColorStop(1, 'rgba(45,28,18,' + s + ')');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    var v = ctx.createLinearGradient(0, y, 0, y + h);
    v.addColorStop(0, 'rgba(40,25,16,' + (s * 0.85) + ')');
    v.addColorStop(0.22, 'rgba(40,25,16,0)');
    v.addColorStop(1, 'rgba(40,25,16,' + (s * 0.45) + ')');
    ctx.fillStyle = v;
    ctx.fillRect(x, y, w, h);
  }
  art.edgeShade = edgeShade;

  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    ctx.save();
    if (opts.shadow !== false) {
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
    }
    fillRR(ctx, x, y, w, h, opts.r == null ? 16 : opts.r, opts.bg || 'rgba(30,22,18,0.82)');
    ctx.restore();
    if (opts.border) {
      strokeRR(ctx, x, y, w, h, opts.r == null ? 16 : opts.r, opts.border, opts.borderW || 2);
    }
  }
  art.panel = panel;

  function button(ctx, r, label, opts) {
    opts = opts || {};
    var hover = opts.hover, disabled = opts.disabled;
    var bg = disabled ? 'rgba(60,50,44,0.55)' : hover ? (opts.hoverBg || P.accent) : (opts.bg || 'rgba(48,36,30,0.94)');
    var fg = disabled ? 'rgba(240,230,220,0.4)' : hover ? (opts.hoverFg || '#2a1a10') : (opts.fg || '#f7ead8');
    ctx.save();
    if (hover && !disabled) {
      ctx.shadowColor = 'rgba(242,153,74,0.55)';
      ctx.shadowBlur = 20;
    }
    fillRR(ctx, r.x, r.y, r.w, r.h, opts.r == null ? 12 : opts.r, bg);
    ctx.restore();
    strokeRR(ctx, r.x, r.y, r.w, r.h, opts.r == null ? 12 : opts.r, disabled ? 'rgba(255,255,255,0.08)' : (hover ? '#ffdcb0' : 'rgba(255,235,210,0.22)'), 1.6);
    var size = opts.size || 20;
    txt(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + size * 0.34, size, fg, opts.weight || 700, 'center');
  }
  art.button = button;

  function bar(ctx, x, y, w, h, v, col, bg) {
    fillRR(ctx, x, y, w, h, h / 2, bg || 'rgba(0,0,0,0.35)');
    var ww = Math.max(0, Math.min(1, v)) * w;
    if (ww > 1) fillRR(ctx, x, y, ww, h, h / 2, col || P.green);
  }
  art.bar = bar;

  var STAR = '';
  function stars(ctx, x, y, rating, size) {
    for (var i = 0; i < 5; i++) {
      var fill = U.clamp(rating - i, 0, 1);
      drawStar(ctx, x + i * (size + 3), y, size, 'rgba(255,255,255,0.16)');
      if (fill > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + i * (size + 3) - size, y - size, size * 2 * fill, size * 2.2);
        ctx.clip();
        drawStar(ctx, x + i * (size + 3), y, size, '#ffc94a');
        ctx.restore();
      }
    }
  }
  art.stars = stars;

  function drawStar(ctx, cx, cy, r, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + (i * Math.PI) / 5;
      var rad = i % 2 === 0 ? r : r * 0.45;
      var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function bubble(ctx, text, cx, cy, opts) {
    opts = opts || {};
    var size = opts.size || 22;
    var maxW = opts.maxW || 380;
    var words = String(text).split(' ');
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (txtW(ctx, test, size, 600) > maxW - 32 && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    var lh = size * 1.32;
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, txtW(ctx, l, size, 600)); });
    w = Math.min(maxW, w + 34);
    var h = lines.length * lh + 24;
    var x = cx - w / 2, y = cy - h - 18;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    fillRR(ctx, x, y, w, h, 14, opts.bg || '#fffaf0');
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 9, y + h - 1);
    ctx.lineTo(cx + 3, y + h + 14);
    ctx.lineTo(cx + 11, y + h - 1);
    ctx.closePath();
    ctx.fillStyle = opts.bg || '#fffaf0';
    ctx.fill();
    lines.forEach(function (l, idx) {
      txt(ctx, l, x + w / 2, y + 18 + idx * lh + size * 0.8, size, opts.color || P.ink, 600, 'center');
    });
    return { x: x, y: y, w: w, h: h };
  }
  art.bubble = bubble;

  function clockFace(ctx, cx, cy, r, minutes) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8ec';
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.strokeStyle = P.woodDark;
    ctx.stroke();
    // ticks
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      var r1 = r * (i % 3 === 0 ? 0.72 : 0.82);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = i % 3 === 0 ? Math.max(1.5, r * 0.06) : 1;
      ctx.stroke();
    }
    var hh = (minutes / 60) % 12, mm = minutes % 60;
    var ha = ((hh + mm / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    var ma = (mm / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = P.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * r * 0.74, cy + Math.sin(ma) * r * 0.74); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r * 0.07), 0, Math.PI * 2); ctx.fillStyle = P.accentDark; ctx.fill();
    ctx.restore();
  }
  art.clockFace = clockFace;

  /* ---------------- люди ---------------- */
  var EYE_COLORS = ['#5b3a28', '#3f5f70', '#4d6b44', '#6a4a78', '#3a3a46', '#7a5230', '#2f4f5f'];

  /* Смешиваем цвет с белым (amt > 0) или с тёмно-коричневым (amt < 0). */
  function shade(hex, amt) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var v = hex.slice(1);
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    var r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    var tr = amt > 0 ? 255 : 32, tg = amt > 0 ? 252 : 22, tb = amt > 0 ? 246 : 16, k = Math.abs(amt);
    r = Math.round(r + (tr - r) * k); g = Math.round(g + (tg - g) * k); b = Math.round(b + (tb - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  art.shade = shade;

  art.makePerson = function (opts) {
    opts = opts || {};
    var female = opts.female == null ? false : !!opts.female;
    var style = opts.style || U.pick(female
      ? ['long', 'bob', 'bun', 'curly', 'ponytail', 'bob', 'long', 'short']
      : ['short', 'bald', 'short', 'curly', 'bun', 'short']);
    return {
      skin: opts.skin == null ? U.ri(0, P.skin.length - 1) : opts.skin,
      hair: opts.hair || U.pick(P.hairColors),
      style: style,
      shirt: opts.shirt || U.pick(P.shirtColors),
      pants: opts.pants || U.pick(P.pantsColors),
      eyeColor: opts.eyeColor || U.pick(EYE_COLORS),
      female: female,
      expr: opts.expr || 'neutral',
      glasses: opts.glasses == null ? U.chance(0.2) : opts.glasses,
      hat: opts.hat === undefined ? (U.chance(0.12) ? U.pick(['cap', 'beanie']) : null) : opts.hat,
      beard: opts.beard == null ? U.chance(0.16) : opts.beard,
      bag: opts.bag || (U.chance(0.25) ? U.pick(['bag', 'backpack', 'none']) : 'none'),
      bangs: opts.bangs == null ? U.chance(female ? 0.62 : 0.35) : !!opts.bangs,
      freckles: opts.freckles == null ? U.chance(0.2) : !!opts.freckles,
      scarf: opts.scarf === undefined ? (U.chance(0.24) ? U.pick(['#c05a4a', '#5d7f9a', '#8a6aa0', '#c9a227', '#5aa877']) : null) : opts.scarf,
      sleeves: opts.sleeves || (U.chance(0.4) ? 'short' : 'long'),
      pattern: opts.pattern || U.pick(['plain', 'plain', 'plain', 'stripe', 'pocket', 'badge']),
      collar: opts.collar || U.pick(['round', 'v', 'polo']),
      // мультяшные пропорции: голова и телосложение гуляют от человека к человеку
      headScale: opts.headScale == null ? U.rand(0.86, 1.26) : opts.headScale,
      build: opts.build == null ? U.rand(0.9, 1.22) : opts.build,
      name: opts.name || ''
    };
  };

  /* ======================================================================
     Люди в мультяшном стиле «Городская пиццерия»: крупная голова, плотное
     короткое тело, толстая тёплая обводка, плоские заливки, румянец,
     руки-рукавицы. Пропорции одинаковые у всех, силуэты различаются
     headScale (размер головы) и build (ширина тела).
     ====================================================================== */

  var INK = 'rgba(40,25,16,0.95)';
  var BLUSH = 'rgba(226,104,82,0.45)';

  // Единые метрики фигуры в долях роста (от стоп вверх)
  function personMetrics(p, h) {
    var hs = (p && p.headScale) || 1;
    var wf = (p && p.build) || 1;
    var headR = h * 0.135 * hs;
    var shoulder = h * 0.605;
    var headCY = shoulder + headR * 0.86;
    return {
      hs: hs,
      wf: wf,
      headR: headR,
      headCY: headCY,
      top: headCY + headR * 1.15,
      shoulder: shoulder,
      chest: h * 0.535,
      waist: h * 0.472,
      hip: h * 0.41,
      shoulderW: h * 0.148 * wf
    };
  }
  art.personMetrics = personMetrics;

  // Крупная «яйцевидная» голова: шире в щеках, округлый подбородок
  function headPath(ctx, headCY, R) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.99, headCY - R * 0.32);
    ctx.bezierCurveTo(-R * 1.0, headCY - R * 1.05, -R * 0.54, headCY - R * 1.16, 0, headCY - R * 1.16);
    ctx.bezierCurveTo(R * 0.54, headCY - R * 1.16, R * 1.0, headCY - R * 1.05, R * 0.99, headCY - R * 0.32);
    ctx.bezierCurveTo(R * 1.0, headCY + R * 0.28, R * 0.72, headCY + R * 0.96, 0, headCY + R * 1.0);
    ctx.bezierCurveTo(-R * 0.72, headCY + R * 0.96, -R * 1.0, headCY + R * 0.28, -R * 0.99, headCY - R * 0.32);
    ctx.closePath();
  }

  /* Лицо: крупные глаза с жирной обводкой и бликом, толстые брови,
     румянец, простой рот. Никаких тонких линий и градиентов. */
  // у светлых волос брови всё равно тёмные — иначе лицо «слепнет»
  function browColor(c) {
    if (!c || c.charAt(0) !== '#') return c || '#3a2a1d';
    var v = c.slice(1);
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    var r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return c;
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? '#4a3423' : c;
  }

  function drawFace(ctx, p, cx, cy, R, lw) {
    var female = !!p.female;
    var expr = p.expr || 'neutral';
    var happy = expr === 'happy',
      snarl = expr === 'snarl',
      angry = expr === 'angry' || expr === 'annoyed' || snarl,
      sad = expr === 'sad',
      conf = expr === 'confused',
      tired = expr === 'tired';
    var evil = !!p.evil;
    var ink = 'rgba(32,20,13,0.96)';
    var hairInk = browColor(p.hair);
    var skinCol = P.skin[(p.skin == null ? 0 : p.skin) % P.skin.length];
    var ey = cy + R * 0.03;
    var eo = R * 0.375;
    var eRX = R * (female ? 0.135 : 0.125) * (tired ? 0.9 : 1);
    var eRY = R * (tired ? 0.11 : 0.16) * (angry ? 0.85 : 1) * (evil && !p.shades ? 0.82 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // тяжёлая тень над глазами — взгляд из-под бровей
    if (evil) {
      ctx.beginPath();
      ctx.ellipse(cx, cy - R * 0.27, R * 0.92, R * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(28,14,8,0.15)';
      ctx.fill();
    }

    // брови
    var browY = cy - R * (evil ? 0.24 : 0.30);
    [-1, 1].forEach(function (s) {
      var bx = cx + s * eo;
      ctx.strokeStyle = evil ? '#241611' : hairInk;
      ctx.lineWidth = Math.max(2, R * (evil ? 0.115 : 0.085));
      ctx.beginPath();
      if (angry) {
        // злые брови: внешний край вверх, внутренний — вниз, к переносице
        ctx.moveTo(bx + s * R * 0.19, browY - R * (evil ? 0.17 : 0.13));
        ctx.quadraticCurveTo(bx + s * R * 0.02, browY - R * 0.02, bx - s * R * 0.17, browY + R * 0.07);
      } else if (sad) {
        ctx.moveTo(bx - s * R * 0.17, browY + R * 0.08);
        ctx.quadraticCurveTo(bx, browY, bx + s * R * 0.17, browY - R * 0.07);
      } else if (conf && s > 0) {
        ctx.moveTo(bx - R * 0.16, browY - R * 0.16);
        ctx.quadraticCurveTo(bx, browY - R * 0.11, bx + R * 0.15, browY - R * 0.02);
      } else if (tired) {
        ctx.moveTo(bx - s * R * 0.16, browY + R * 0.03);
        ctx.quadraticCurveTo(bx, browY + R * 0.06, bx + s * R * 0.15, browY);
      } else {
        ctx.moveTo(bx - s * R * 0.17, browY + R * 0.04);
        ctx.quadraticCurveTo(bx, browY - R * 0.10, bx + s * R * 0.17, browY + R * 0.01);
      }
      ctx.stroke();
    });

    // глаза: обычные, «злые» из-под бровей или тёмные очки
    if (p.shades) {
      [-1, 1].forEach(function (s) {
        var lx = cx + s * eo;
        ctx.beginPath();
        rr(ctx, lx - eRX * 1.35, ey - eRY * 0.95, eRX * 2.7, eRY * 1.9, eRY * 0.5);
        ctx.fillStyle = '#120e0d';
        ctx.fill();
        ctx.strokeStyle = 'rgba(16,10,8,0.98)';
        ctx.lineWidth = Math.max(2, R * 0.055);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150,180,205,0.4)';
        ctx.lineWidth = Math.max(1.4, R * 0.04);
        ctx.beginPath();
        ctx.moveTo(lx - eRX * 0.9, ey + eRY * 0.45);
        ctx.lineTo(lx + eRX * 0.2, ey - eRY * 0.5);
        ctx.stroke();
      });
      // перемычка и дужки
      ctx.strokeStyle = 'rgba(16,10,8,0.95)';
      ctx.lineWidth = Math.max(1.8, R * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - eRX * 0.6, ey - R * 0.02);
      ctx.lineTo(cx + eRX * 0.6, ey - R * 0.02);
      ctx.moveTo(cx - eo - eRX * 1.35, ey - R * 0.02);
      ctx.lineTo(cx - R * 0.9, ey - R * 0.1);
      ctx.moveTo(cx + eo + eRX * 1.35, ey - R * 0.02);
      ctx.lineTo(cx + R * 0.9, ey - R * 0.1);
      ctx.stroke();
    } else {
      [-1, 1].forEach(function (s) {
        var ex = cx + s * eo;
        var eyy = ey + (conf && s > 0 ? -R * 0.02 : 0);
        if (evil) {
          // злой прищур под тяжёлой бровью
          ctx.beginPath();
          ctx.ellipse(ex, eyy + eRY * 0.1, eRX * 1.08, eRY * 0.74, 0, 0, Math.PI * 2);
          ctx.fillStyle = ink;
          ctx.fill();
          // обычный блик, только маленький
          ctx.beginPath();
          ctx.ellipse(ex - eRX * 0.26, eyy - eRY * 0.08, eRX * 0.2, eRY * 0.16, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,250,242,0.8)';
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.ellipse(ex, eyy, eRX, eRY, 0, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.fill();
        // блик
        ctx.beginPath();
        ctx.ellipse(ex - eRX * 0.32, eyy - eRY * 0.40, eRX * 0.44, eRY * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,252,246,0.95)';
        ctx.fill();
        // ресницы
        if (female) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = Math.max(1.6, R * 0.05);
          ctx.beginPath();
          ctx.moveTo(ex + s * eRX * 0.7, eyy - eRY * 0.72);
          ctx.lineTo(ex + s * eRX * 1.45, eyy - eRY * 1.05);
          ctx.moveTo(ex + s * eRX * 0.95, eyy - eRY * 0.2);
          ctx.lineTo(ex + s * eRX * 1.6, eyy - eRY * 0.42);
          ctx.stroke();
        }
        // мешки под глазами
        if (tired) {
          ctx.strokeStyle = 'rgba(120,80,58,0.4)';
          ctx.lineWidth = Math.max(1.2, R * 0.035);
          ctx.beginPath();
          ctx.arc(ex, eyy + eRY * 0.2, eRX * 0.9, Math.PI * 0.2, Math.PI * 0.8);
          ctx.stroke();
        }
      });
    }

    // шрам через бровь и щёку
    if (p.scar) {
      ctx.strokeStyle = 'rgba(96,44,32,0.85)';
      ctx.lineWidth = Math.max(2, R * 0.055);
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.68, cy - R * 0.44);
      ctx.quadraticCurveTo(cx + R * 0.58, cy + R * 0.1, cx + R * 0.46, cy + R * 0.64);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,222,200,0.55)';
      ctx.lineWidth = Math.max(1.2, R * 0.022);
      ctx.stroke();
      // стежки
      ctx.strokeStyle = 'rgba(90,42,30,0.7)';
      ctx.lineWidth = Math.max(1.2, R * 0.03);
      for (var si = 0; si < 3; si++) {
        var sy = cy - R * 0.22 + si * R * 0.32;
        ctx.beginPath();
        ctx.moveTo(cx + R * 0.44, sy);
        ctx.lineTo(cx + R * 0.74, sy - R * 0.05);
        ctx.stroke();
      }
    }

    // щетина
    if (p.stubble) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.72, cy + R * 0.34);
      ctx.quadraticCurveTo(cx - R * 0.62, cy + R * 1.0, cx, cy + R * 1.03);
      ctx.quadraticCurveTo(cx + R * 0.62, cy + R * 1.0, cx + R * 0.72, cy + R * 0.34);
      ctx.quadraticCurveTo(cx + R * 0.4, cy + R * 0.5, cx + R * 0.24, cy + R * 0.56);
      ctx.quadraticCurveTo(cx, cy + R * 0.46, cx - R * 0.24, cy + R * 0.56);
      ctx.quadraticCurveTo(cx - R * 0.4, cy + R * 0.5, cx - R * 0.72, cy + R * 0.34);
      ctx.closePath();
      ctx.fillStyle = 'rgba(38,26,20,0.28)';
      ctx.fill();
      ctx.restore();
    }

    // нос — маленькая «кнопка»
    ctx.beginPath();
    ctx.ellipse(cx + R * 0.01, cy + R * 0.27, R * 0.075, R * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,86,58,0.32)';
    ctx.fill();

    // румянец — только у добрых
    if (!evil) {
      ctx.fillStyle = happy ? 'rgba(230,96,76,0.55)' : BLUSH;
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.ellipse(cx + s * R * 0.62, cy + R * 0.26, R * 0.2, R * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // веснушки
    if (p.freckles) {
      ctx.fillStyle = 'rgba(146,88,58,0.55)';
      for (var fi = 0; fi < 6; fi++) {
        var fs = fi < 3 ? -1 : 1;
        var fx = cx + fs * R * (0.38 + (fi % 3) * 0.1);
        var fy = cy + R * (0.22 + ((fi * 7) % 3) * 0.05);
        ctx.beginPath();
        ctx.arc(fx, fy, R * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // борода и усы — плотным силуэтом
    if (p.beard) {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.82, cy + R * 0.26);
      ctx.quadraticCurveTo(cx - R * 0.92, cy + R * 0.82, cx - R * 0.34, cy + R * 1.03);
      ctx.quadraticCurveTo(cx, cy + R * 1.11, cx + R * 0.34, cy + R * 1.03);
      ctx.quadraticCurveTo(cx + R * 0.92, cy + R * 0.82, cx + R * 0.82, cy + R * 0.26);
      // внутренний край по скулам — щёки остаются открытыми
      ctx.quadraticCurveTo(cx + R * 0.56, cy + R * 0.4, cx + R * 0.3, cy + R * 0.5);
      ctx.quadraticCurveTo(cx, cy + R * 0.38, cx - R * 0.3, cy + R * 0.5);
      ctx.quadraticCurveTo(cx - R * 0.56, cy + R * 0.4, cx - R * 0.82, cy + R * 0.26);
      ctx.closePath();
      ctx.fillStyle = p.hair;
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,17,11,0.55)';
      ctx.lineWidth = Math.max(1.2, R * 0.04);
      ctx.stroke();
      // площадка под губами: борода не должна закрывать рот
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 0.64, R * 0.29, R * 0.18, 0, 0, Math.PI * 2);
      ctx.fillStyle = skinCol;
      ctx.fill();
      // усы
      ctx.strokeStyle = p.hair;
      ctx.lineWidth = Math.max(2, R * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.24, cy + R * 0.41);
      ctx.quadraticCurveTo(cx, cy + R * 0.32, cx + R * 0.24, cy + R * 0.41);
      ctx.stroke();
    }

    // рот
    var my = cy + R * 0.58;
    if (snarl) {
      // оскал: тёмный рот с зубами
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.32, my - R * 0.04);
      ctx.quadraticCurveTo(cx, my - R * 0.16, cx + R * 0.32, my - R * 0.04);
      ctx.quadraticCurveTo(cx + R * 0.28, my + R * 0.22, cx + R * 0.16, my + R * 0.24);
      ctx.quadraticCurveTo(cx, my + R * 0.3, cx - R * 0.16, my + R * 0.24);
      ctx.quadraticCurveTo(cx - R * 0.28, my + R * 0.22, cx - R * 0.32, my - R * 0.04);
      ctx.closePath();
      ctx.fillStyle = '#2a1210';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,14,10,0.95)';
      ctx.lineWidth = Math.max(1.8, R * 0.055);
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f4ecdd';
      ctx.fillRect(cx - R * 0.34, my - R * 0.06, R * 0.68, R * 0.15);
      ctx.strokeStyle = 'rgba(50,26,20,0.5)';
      ctx.lineWidth = Math.max(1, R * 0.022);
      for (var ti = -1; ti <= 1; ti++) {
        ctx.beginPath();
        ctx.moveTo(cx + ti * R * 0.16, my - R * 0.07);
        ctx.lineTo(cx + ti * R * 0.16, my + R * 0.09);
        ctx.stroke();
      }
      ctx.restore();
    } else if (happy) {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.24, my - R * 0.06);
      ctx.quadraticCurveTo(cx, my + R * 0.3, cx + R * 0.24, my - R * 0.06);
      ctx.quadraticCurveTo(cx, my + R * 0.02, cx - R * 0.24, my - R * 0.06);
      ctx.closePath();
      ctx.fillStyle = '#8e3a33';
      ctx.fill();
      ctx.strokeStyle = 'rgba(44,24,17,0.8)';
      ctx.lineWidth = Math.max(1.4, R * 0.045);
      ctx.stroke();
    } else if (sad) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, R * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.2, my + R * 0.08);
      ctx.quadraticCurveTo(cx, my - R * 0.08, cx + R * 0.2, my + R * 0.08);
      ctx.stroke();
    } else if (angry) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, R * (evil ? 0.085 : 0.07));
      ctx.beginPath();
      ctx.moveTo(cx - R * (evil ? 0.26 : 0.21), my + R * 0.07);
      ctx.quadraticCurveTo(cx, my - R * (evil ? 0.09 : 0.05), cx + R * (evil ? 0.26 : 0.21), my + R * 0.07);
      ctx.stroke();
    } else if (conf) {
      ctx.beginPath();
      ctx.ellipse(cx, my, R * 0.085, R * 0.11, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122,58,50,0.55)';
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.4, R * 0.05);
      ctx.stroke();
    } else if (tired) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, R * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.16, my + R * 0.02);
      ctx.lineTo(cx + R * 0.16, my + R * 0.02);
      ctx.stroke();
    } else {
      ctx.strokeStyle = female ? 'rgba(160,66,62,0.95)' : 'rgba(120,58,46,0.9)';
      ctx.lineWidth = Math.max(2, R * 0.075);
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.2, my - R * 0.02);
      ctx.quadraticCurveTo(cx, my + R * 0.15, cx + R * 0.2, my - R * 0.02);
      ctx.stroke();
    }

    // сигара: зажата в правом углу рта, кончик торчит наружу
    if (p.cigar) {
      ctx.save();
      ctx.translate(cx + R * 0.17, my + R * 0.03);
      ctx.rotate(0.2);
      rr(ctx, 0, -R * 0.052, R * 0.62, R * 0.104, R * 0.048);
      ctx.fillStyle = '#4a2c18';
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,16,10,0.85)';
      ctx.lineWidth = Math.max(1.2, R * 0.03);
      ctx.stroke();
      // тлеющий кончик
      ctx.beginPath();
      ctx.arc(R * 0.58, 0, R * 0.058, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7b34';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(R * 0.58, 0, R * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe6a0';
      ctx.fill();
      ctx.restore();
    }
  }

  function hairBack(ctx, p, headCY, R, lw) {
    var c = p.hair || '#3a2a1d';
    var dark = shade(c, -0.18);
    if (p.style === 'long') {
      ctx.beginPath();
      ctx.moveTo(-R * 0.98, headCY - R * 0.55);
      ctx.bezierCurveTo(-R * 1.38, headCY + R * 0.7, -R * 1.34, headCY + R * 2.3, -R * 1.06, headCY + R * 2.85);
      ctx.quadraticCurveTo(0, headCY + R * 3.1, R * 1.06, headCY + R * 2.85);
      ctx.bezierCurveTo(R * 1.34, headCY + R * 2.3, R * 1.38, headCY + R * 0.7, R * 0.98, headCY - R * 0.55);
      ctx.closePath();
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
    } else if (p.style === 'bob') {
      ctx.beginPath();
      ctx.ellipse(0, headCY + R * 0.1, R * 1.16, R * 1.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
    } else if (p.style === 'bun') {
      ctx.beginPath();
      ctx.arc(R * 0.5, headCY - R * 1.12, R * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
    } else if (p.style === 'curly') {
      for (var i = 0; i < 9; i++) {
        var a = Math.PI + (i / 8) * Math.PI;
        var rr2 = R * (1.0 + (i % 3) * 0.06);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr2, headCY + Math.sin(a) * rr2 * 0.9 - R * 0.02, R * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? c : shade(c, -0.12);
        ctx.fill();
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.beginPath();
      ctx.arc(0, headCY - R * 0.1, R * 1.14, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
    } else if (p.style === 'ponytail') {
      ctx.save();
      ctx.translate(R * 1.02, headCY - R * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.12);
      ctx.bezierCurveTo(R * 0.55, R * 0.3, R * 0.62, R * 1.1, R * 0.3, R * 1.75);
      ctx.bezierCurveTo(R * 0.1, R * 2.1, -R * 0.3, R * 1.95, -R * 0.26, R * 1.5);
      ctx.bezierCurveTo(-R * 0.2, R * 0.95, -R * 0.3, R * 0.4, -R * 0.06, R * 0.02);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-R * 0.04, R * 0.04, R * 0.17, R * 0.1, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#d0577f';
      ctx.fill();
      ctx.restore();
    }
  }

  function hairFront(ctx, p, headCY, R, lw) {
    if (p.hat) return;
    var c = p.hair || '#3a2a1d';
    if (p.style === 'bald') {
      ctx.strokeStyle = 'rgba(255,248,232,0.35)';
      ctx.lineWidth = R * 0.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, headCY - R * 0.15, R * 0.62, Math.PI * 1.18, Math.PI * 1.46);
      ctx.stroke();
      return;
    }
    var topY = headCY - R * 1.16;
    var fringe = p.bangs ? R * 0.46 : R * 0.62;
    // шапка волос поверх черепа
    ctx.beginPath();
    ctx.moveTo(-R * 1.01, headCY - R * 0.06);
    ctx.bezierCurveTo(-R * 1.16, headCY - R * 0.92, -R * 0.62, topY - R * 0.12, 0, topY - R * 0.1);
    ctx.bezierCurveTo(R * 0.62, topY - R * 0.12, R * 1.16, headCY - R * 0.92, R * 1.01, headCY - R * 0.06);
    if (p.style === 'long' || p.style === 'bob' || p.style === 'ponytail') {
      ctx.quadraticCurveTo(R * 1.06, headCY + R * 0.5, R * 0.92, headCY + R * 0.9);
      ctx.quadraticCurveTo(R * 0.72, headCY + R * 0.5, R * 0.74, headCY - R * 0.02);
    }
    if (p.bangs) {
      ctx.quadraticCurveTo(R * 0.46, headCY - fringe, R * 0.16, headCY - fringe * 0.85);
      ctx.quadraticCurveTo(R * 0.02, headCY - fringe * 0.62, -R * 0.18, headCY - fringe * 0.9);
      ctx.quadraticCurveTo(-R * 0.5, headCY - fringe * 1.02, -R * 0.74, headCY - fringe * 0.55);
    } else {
      ctx.quadraticCurveTo(R * 0.5, headCY - R * 0.86, R * 0.06, headCY - R * 0.94);
      ctx.quadraticCurveTo(-R * 0.46, headCY - R * 0.84, -R * 0.74, headCY - R * 0.52);
    }
    ctx.quadraticCurveTo(-R * 0.92, headCY + R * 0.2, -R * 1.01, headCY - R * 0.06);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.9;
    ctx.stroke();
    // плоский блик
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#fff8e8';
    ctx.lineWidth = R * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, headCY - R * 0.22, R * 0.66, Math.PI * 1.16, Math.PI * 1.44);
    ctx.stroke();
    ctx.restore();
    // кудри
    if (p.style === 'curly') {
      [[-0.86, -0.2], [0.86, -0.2], [-0.6, -0.78], [0.6, -0.78], [0, -1.02]].forEach(function (q) {
        ctx.beginPath();
        ctx.arc(q[0] * R, headCY + q[1] * R, R * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });
    }
  }

  function drawHat(ctx, p, headCY, R, lw) {
    if (!p.hat) return;
    var hatCol = p.hat === 'cap' ? '#3f6f9a' : '#b0563f';
    if (p.hat === 'fedora') {
      // шляпа гангстера: широкие поля, примятая тулья, лента
      var fc = p.hatColor || '#8e2440';
      var fdark = shade(fc, -0.34);
      // поля — низ и верх
      ctx.beginPath();
      ctx.ellipse(0, headCY - R * 0.7, R * 1.82, R * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = fdark;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      var brim = ctx.createLinearGradient(-R * 1.8, 0, R * 1.8, 0);
      brim.addColorStop(0, shade(fc, 0.14));
      brim.addColorStop(0.5, fc);
      brim.addColorStop(1, shade(fc, -0.2));
      ctx.beginPath();
      ctx.ellipse(0, headCY - R * 0.78, R * 1.78, R * 0.23, 0, 0, Math.PI * 2);
      ctx.fillStyle = brim;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // тулья — выше, с плоским верхом и примятием
      ctx.beginPath();
      ctx.moveTo(-R * 0.98, headCY - R * 0.74);
      ctx.quadraticCurveTo(-R * 1.08, headCY - R * 1.34, -R * 0.66, headCY - R * 1.66);
      ctx.quadraticCurveTo(-R * 0.3, headCY - R * 1.8, 0, headCY - R * 1.8);
      ctx.quadraticCurveTo(R * 0.3, headCY - R * 1.8, R * 0.66, headCY - R * 1.66);
      ctx.quadraticCurveTo(R * 1.08, headCY - R * 1.34, R * 0.98, headCY - R * 0.74);
      ctx.closePath();
      ctx.fillStyle = fc;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // вмятина на тулье
      ctx.strokeStyle = fdark;
      ctx.lineWidth = Math.max(2, R * 0.075);
      ctx.beginPath();
      ctx.moveTo(-R * 0.42, headCY - R * 1.72);
      ctx.quadraticCurveTo(0, headCY - R * 1.44, R * 0.42, headCY - R * 1.72);
      ctx.stroke();
      // лента
      ctx.beginPath();
      ctx.moveTo(-R * 0.95, headCY - R * 0.94);
      ctx.quadraticCurveTo(0, headCY - R * 0.84, R * 0.95, headCY - R * 0.94);
      ctx.lineTo(R * 0.93, headCY - R * 0.74);
      ctx.quadraticCurveTo(0, headCY - R * 0.64, -R * 0.93, headCY - R * 0.74);
      ctx.closePath();
      ctx.fillStyle = shade(fc, -0.42);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      // тень от полей на лице
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, headCY - R * 0.52, R * 1.3, R * 0.2, 0, 0, Math.PI);
      ctx.fillStyle = 'rgba(24,10,8,0.22)';
      ctx.fill();
      ctx.restore();
      return;
    }
    if (p.hat === 'cap') {
      ctx.beginPath();
      ctx.arc(0, headCY - R * 0.36, R * 1.08, Math.PI * 0.98, Math.PI * 2.02);
      ctx.quadraticCurveTo(R * 1.02, headCY - R * 0.5, 0, headCY - R * 0.5);
      ctx.quadraticCurveTo(-R * 1.02, headCY - R * 0.5, -R * 1.08, headCY - R * 0.36);
      ctx.closePath();
      ctx.fillStyle = hatCol;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // козырёк
      ctx.beginPath();
      ctx.ellipse(R * 0.62, headCY - R * 0.42, R * 0.64, R * 0.15, 0.06, 0, Math.PI * 2);
      ctx.fillStyle = shade(hatCol, -0.22);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
      // пуговка
      ctx.beginPath();
      ctx.arc(0, headCY - R * 1.22, R * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = shade(hatCol, 0.3);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, headCY - R * 0.34, R * 1.08, Math.PI * 0.98, Math.PI * 2.02);
      ctx.quadraticCurveTo(R * 0.8, headCY - R * 0.52, 0, headCY - R * 0.52);
      ctx.quadraticCurveTo(-R * 0.8, headCY - R * 0.52, -R * 1.08, headCY - R * 0.34);
      ctx.closePath();
      ctx.fillStyle = hatCol;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // отворот
      ctx.beginPath();
      ctx.moveTo(-R * 1.06, headCY - R * 0.54);
      ctx.quadraticCurveTo(0, headCY - R * 0.72, R * 1.06, headCY - R * 0.54);
      ctx.lineTo(R * 1.02, headCY - R * 0.24);
      ctx.quadraticCurveTo(0, headCY - R * 0.44, -R * 1.02, headCY - R * 0.24);
      ctx.closePath();
      ctx.fillStyle = shade(hatCol, 0.16);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
      // помпон
      ctx.beginPath();
      ctx.arc(0, headCY - R * 1.38, R * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = shade(hatCol, 0.34);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
    }
  }

  function drawGlasses(ctx, p, headCY, R, lw) {
    if (!p.glasses) return;
    var round = p.female || p.style === 'bob' || p.style === 'bun';
    var ey = headCY + R * 0.03;
    var eo = R * 0.40;
    var w = R * 0.46, h2 = R * 0.4;
    [-1, 1].forEach(function (s) {
      var lx = s * eo - w / 2, ly = ey - h2 / 2;
      ctx.beginPath();
      if (round) ctx.ellipse(s * eo, ey, w / 2, h2 / 2, 0, 0, Math.PI * 2);
      else rr(ctx, lx, ly, w, h2, R * 0.12);
      ctx.fillStyle = 'rgba(198,228,238,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(38,28,22,0.96)';
      ctx.lineWidth = Math.max(2, lw * 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx + w * 0.2, ly + h2 * 0.8);
      ctx.lineTo(lx + w * 0.44, ly + h2 * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = Math.max(1.4, R * 0.05);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(-eo + w / 2, ey - R * 0.02);
    ctx.quadraticCurveTo(0, ey - R * 0.1, eo - w / 2, ey - R * 0.02);
    ctx.strokeStyle = 'rgba(38,28,22,0.96)';
    ctx.lineWidth = Math.max(2, lw * 0.95);
    ctx.stroke();
  }

  /**
   * Человек в фас, ноги на groundY.
   * h — полный рост в пикселях.
   */
  function drawPerson(ctx, p, x, gy, h, opts) {
    opts = opts || {};
    var M = personMetrics(p, h);
    var lw = Math.max(1.4, h * 0.0115);
    var skin = P.skin[(p.skin == null ? 0 : p.skin) % P.skin.length];
    var skinShade = shade(skin, -0.17);
    var shirt = p.shirt || '#4a86b8';
    var pants = p.pants || '#3c4a5a';
    var coat = p.coat || null;
    var sleeve = coat || shirt;
    var sway = opts.sway || 0;
    var walk = opts.walk || 0;
    var alpha = opts.alpha == null ? 1 : opts.alpha;
    var bob = walk ? Math.abs(Math.sin(walk)) * h * 0.012 : 0;
    var headR = M.headR;
    var headCY = gy - M.headCY;
    var shoulder = gy - M.shoulder;
    var chest = gy - M.chest;
    var waist = gy - M.waist;
    var hip = gy - M.hip;
    var sw = M.shoulderW;
    var bw = h * 0.14 * M.wf;
    var hw = h * 0.118 * M.wf;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // тень
    if (!opts.noShadow) {
      ctx.beginPath();
      ctx.ellipse(x, gy - h * 0.006, h * 0.125, h * 0.026, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(55,35,22,0.17)';
      ctx.fill();
    }

    ctx.translate(x, 0);
    if (sway) ctx.translate(0, Math.sin(sway) * h * 0.004);
    if (walk) ctx.translate(0, -bob);

    function torsoPath() {
      ctx.moveTo(-sw * 0.7, shoulder - h * 0.012);
      ctx.quadraticCurveTo(-sw * 1.02, shoulder - h * 0.006, -sw, shoulder + h * 0.03);
      ctx.quadraticCurveTo(-bw * 1.03, chest, -bw, waist);
      ctx.quadraticCurveTo(-hw * 1.08, hip - h * 0.02, -hw, hip + h * 0.008);
      ctx.quadraticCurveTo(0, hip + h * 0.032, hw, hip + h * 0.008);
      ctx.quadraticCurveTo(hw * 1.08, hip - h * 0.02, bw, waist);
      ctx.quadraticCurveTo(bw * 1.03, chest, sw, shoulder + h * 0.03);
      ctx.quadraticCurveTo(sw * 1.02, shoulder - h * 0.006, sw * 0.7, shoulder - h * 0.012);
      ctx.quadraticCurveTo(0, shoulder - h * 0.036, -sw * 0.7, shoulder - h * 0.012);
      ctx.closePath();
    }

    // упрощённый силуэт для отражений, окон и ночных сцен
    if (opts.silhouette) {
      var sil = opts.silhouette;
      ctx.fillStyle = sil;
      ctx.strokeStyle = sil;
      ctx.lineWidth = lw;
      var legLenS = gy - hip;
      [-1, 1].forEach(function (s) {
        rr(ctx, s * h * 0.052 * M.wf - h * 0.046 * M.wf, hip - h * 0.01, h * 0.092 * M.wf, legLenS, h * 0.03);
        ctx.fill();
        rr(ctx, s * h * 0.052 * M.wf - h * 0.05, gy - h * 0.05, h * 0.1, h * 0.05, h * 0.02);
        ctx.fill();
      });
      ctx.beginPath();
      torsoPath();
      ctx.fill();
      [-1, 1].forEach(function (s) {
        rr(ctx, s * sw * 0.94 - h * 0.028, shoulder, h * 0.056, h * 0.2, h * 0.028);
        ctx.fill();
      });
      ctx.beginPath();
      headPath(ctx, headCY, headR);
      ctx.fill();
      if (p.style !== 'bald') {
        ctx.beginPath();
        ctx.arc(0, headCY - headR * 0.1, headR * 1.06, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // волосы за спиной
    hairBack(ctx, p, headCY, headR, lw);

    // рюкзак за спиной
    if (p.bag === 'backpack' && !opts.noBag) {
      rr(ctx, -h * 0.098 * M.wf, shoulder + h * 0.005, h * 0.196 * M.wf, h * 0.16, h * 0.04);
      ctx.fillStyle = '#51705f';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      rr(ctx, -h * 0.07 * M.wf, shoulder + h * 0.06, h * 0.14 * M.wf, h * 0.045, h * 0.02);
      ctx.fillStyle = '#3f5a4c';
      ctx.fill();
    }

    var legLen = gy - hip;
    var legTopW = h * 0.102 * M.wf;
    var legBotW = h * 0.086 * M.wf;

    // ноги и обувь
    [-1, 1].forEach(function (s) {
      var swing = walk ? Math.sin(walk + (s > 0 ? Math.PI : 0)) * 0.14 : 0;
      ctx.save();
      ctx.translate(s * h * 0.055 * M.wf, hip);
      ctx.rotate(swing);
      // штанина
      ctx.beginPath();
      ctx.moveTo(-legTopW / 2, -h * 0.012);
      ctx.lineTo(legTopW / 2, -h * 0.012);
      ctx.lineTo(legBotW / 2, legLen - h * 0.012);
      ctx.lineTo(-legBotW / 2, legLen - h * 0.012);
      ctx.closePath();
      ctx.fillStyle = pants;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // цел-тень по правому краю
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(30,20,14,0.16)';
      ctx.fillRect(legBotW * 0.1, -h * 0.02, legTopW, legLen);
      ctx.restore();
      // ботинок
      var shoeW = h * 0.098, shoeH = h * 0.056;
      rr(ctx, -shoeW * 0.5 + s * h * 0.004, legLen - shoeH, shoeW, shoeH, shoeH * 0.45);
      ctx.fillStyle = '#efe7d8';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // подошва
      rr(ctx, -shoeW * 0.52 + s * h * 0.004, legLen - shoeH * 0.3, shoeW * 1.04, shoeH * 0.3, shoeH * 0.12);
      ctx.fillStyle = '#40464e';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      ctx.restore();
    });

    // руки рисуем поверх торса: в мультяшном стиле у них свой жирный контур
    function drawArms() {
      var armLen = h * 0.205;
      var armW = h * 0.062 * M.wf;
      var handR = h * 0.046;
      // «руки скрещены на груди» — поза головорезов
      if (p.armsCrossed) {
        ctx.save();
        ctx.lineCap = 'round';
        var elbowY = chest + h * 0.05;
        var cw = armW * 0.78;
        [{ s: 1, dy: 0.028 }, { s: -1, dy: 0.004 }].forEach(function (a) {
          var s = a.s;
          var elbowX = s * sw * 0.86;
          // плечо вниз до локтя
          ctx.beginPath();
          ctx.moveTo(s * sw * 0.88, shoulder + h * 0.034);
          ctx.lineTo(elbowX, elbowY - h * 0.008);
          ctx.strokeStyle = INK;
          ctx.lineWidth = cw + lw * 2;
          ctx.stroke();
          ctx.strokeStyle = shade(sleeve, 0.05);
          ctx.lineWidth = cw;
          ctx.stroke();
          // предплечье поперёк груди
          var hy = elbowY + h * a.dy;
          var hx = -s * h * 0.086;
          ctx.beginPath();
          ctx.moveTo(elbowX, elbowY);
          ctx.quadraticCurveTo(s * h * 0.02, hy - h * 0.012, hx, hy);
          ctx.strokeStyle = INK;
          ctx.lineWidth = cw + lw * 2;
          ctx.stroke();
          ctx.strokeStyle = shade(sleeve, 0.09);
          ctx.lineWidth = cw;
          ctx.stroke();
          // манжета
          ctx.beginPath();
          ctx.moveTo(hx + s * cw * 0.5, hy);
          ctx.lineTo(hx + s * cw * 0.95, hy);
          ctx.strokeStyle = shade(sleeve, -0.28);
          ctx.lineWidth = cw * 0.9;
          ctx.stroke();
          // кулак
          ctx.beginPath();
          ctx.arc(hx + s * cw * 0.1, hy, handR * 0.78, 0, Math.PI * 2);
          ctx.fillStyle = skin;
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = lw;
          ctx.stroke();
          // костяшки
          ctx.strokeStyle = 'rgba(80,44,30,0.45)';
          ctx.lineWidth = Math.max(1.2, h * 0.005);
          for (var k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(hx + s * cw * 0.1 - s * handR * (0.28 + k * 0.2), hy - handR * 0.42);
            ctx.lineTo(hx + s * cw * 0.1 - s * handR * (0.28 + k * 0.2), hy + handR * 0.02);
            ctx.stroke();
          }
        });
        ctx.restore();
        return;
      }
      [-1, 1].forEach(function (s) {
      // жест «руки вверх» — наружу и вверх, иначе кисти прячутся за большой головой
      var angle = (opts.handsUp && !p.evil) ? -s * 2.3 : s * 0.15 + (walk ? Math.sin(walk + (s > 0 ? 0 : Math.PI)) * 0.1 : 0);
      ctx.save();
      ctx.translate(s * sw * 0.98, shoulder + h * 0.05);
      ctx.rotate(angle);
      var shortSleeve = p.sleeves === 'short' && !coat;
      var sleeveLen = shortSleeve ? armLen * 0.48 : armLen;
      // рукав
      rr(ctx, -armW / 2, -armW * 0.35, armW, sleeveLen + armW * 0.35, armW / 2);
      ctx.fillStyle = sleeve;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      if (shortSleeve) {
        // предплечье
        rr(ctx, -armW * 0.4, sleeveLen - armW * 0.25, armW * 0.8, armLen - sleeveLen + armW * 0.3, armW * 0.4);
        ctx.fillStyle = skin;
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw;
        ctx.stroke();
      } else {
        // манжета
        rr(ctx, -armW * 0.54, armLen - h * 0.022, armW * 1.08, h * 0.024, h * 0.009);
        ctx.fillStyle = shade(sleeve, -0.24);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      }
      // рукавица
      ctx.beginPath();
      ctx.arc(0, armLen + handR * 0.5, handR, 0, Math.PI * 2);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      // большой палец
      ctx.beginPath();
      ctx.ellipse(-s * handR * 0.6, armLen + handR * 0.5 - handR * 0.15, handR * 0.42, handR * 0.5, -s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = skinShade;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.7;
      ctx.stroke();
      ctx.restore();
      });
    }

    // торс
    ctx.beginPath();
    torsoPath();
    ctx.fillStyle = shirt;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();

    // цел-тень справа + плоские детали одежды
    ctx.save();
    ctx.beginPath();
    torsoPath();
    ctx.clip();
    ctx.fillStyle = 'rgba(32,20,12,0.14)';
    ctx.fillRect(h * 0.045, shoulder - h * 0.05, h * 0.4, hip - shoulder + h * 0.1);
    if (p.pattern === 'stripe') {
      ctx.fillStyle = 'rgba(255,248,232,0.5)';
      ctx.fillRect(-h * 0.16, chest + h * 0.005, h * 0.32, h * 0.032);
      ctx.fillRect(-h * 0.16, chest + h * 0.055, h * 0.32, h * 0.014);
    } else if (p.pattern === 'pocket') {
      ctx.strokeStyle = 'rgba(28,18,10,0.35)';
      ctx.lineWidth = Math.max(1.4, lw * 0.8);
      rr(ctx, -h * 0.075, chest + h * 0.02, h * 0.06, h * 0.05, h * 0.012);
      ctx.stroke();
    } else if (p.pattern === 'badge') {
      ctx.beginPath();
      ctx.arc(h * 0.06, chest + h * 0.02, h * 0.016, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd479';
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,48,20,0.6)';
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.stroke();
    }
    ctx.restore();

    // галстук под пиджаком
    if (p.tie) {
      ctx.beginPath();
      ctx.moveTo(-h * 0.024, shoulder + h * 0.004);
      ctx.lineTo(h * 0.024, shoulder + h * 0.004);
      ctx.lineTo(h * 0.034, waist - h * 0.004);
      ctx.lineTo(0, hip + h * 0.004);
      ctx.lineTo(-h * 0.034, waist - h * 0.004);
      ctx.closePath();
      ctx.fillStyle = p.tie;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,12,8,0.75)';
      ctx.lineWidth = Math.max(1.2, lw * 0.6);
      ctx.stroke();
      // узел
      rr(ctx, -h * 0.026, shoulder - h * 0.004, h * 0.052, h * 0.03, h * 0.008);
      ctx.fillStyle = shade(p.tie, 0.14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,12,8,0.75)';
      ctx.lineWidth = Math.max(1.2, lw * 0.6);
      ctx.stroke();
    }

    // верхняя одежда: пиджак застёгнут на талии, вверху — V-образный вырез
    if (coat) {
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(s * sw * 0.98, shoulder + h * 0.028);
        ctx.lineTo(s * bw * 1.0, waist);
        ctx.lineTo(s * hw * 1.04, hip + h * 0.012);
        ctx.lineTo(s * h * 0.022, hip + h * 0.012);
        ctx.lineTo(s * h * 0.05, waist - h * 0.002);
        ctx.lineTo(s * sw * 0.34, shoulder - h * 0.006);
        ctx.closePath();
        ctx.fillStyle = shade(coat, -0.04);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw;
        ctx.stroke();
      });
      // лацканы
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(s * sw * 0.36, shoulder - h * 0.004);
        ctx.lineTo(s * h * 0.03, chest + h * 0.02);
        ctx.lineTo(s * sw * 0.42, chest + h * 0.012);
        ctx.lineTo(s * sw * 0.62, shoulder + h * 0.014);
        ctx.closePath();
        ctx.fillStyle = shade(coat, 0.18);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      });
    }

    // ворот
    if (!coat) {
      ctx.strokeStyle = shade(shirt, -0.3);
      ctx.lineWidth = Math.max(2, h * 0.014);
      if (p.collar === 'v') {
        ctx.beginPath();
        ctx.moveTo(-h * 0.046, shoulder - h * 0.006);
        ctx.lineTo(0, shoulder + h * 0.058);
        ctx.lineTo(h * 0.046, shoulder - h * 0.006);
        ctx.stroke();
      } else if (p.collar === 'polo') {
        ctx.beginPath();
        ctx.moveTo(-h * 0.05, shoulder - h * 0.008);
        ctx.lineTo(-h * 0.014, shoulder + h * 0.03);
        ctx.lineTo(0, shoulder + h * 0.008);
        ctx.lineTo(h * 0.014, shoulder + h * 0.03);
        ctx.lineTo(h * 0.05, shoulder - h * 0.008);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, shoulder + h * 0.001, h * 0.054, h * 0.026, 0, 0.12, Math.PI - 0.12);
        ctx.stroke();
      }
      // пуговицы
      ctx.fillStyle = 'rgba(255,248,232,0.4)';
      for (var bi = 0; bi < 2; bi++) {
        ctx.beginPath();
        ctx.arc(0, chest + h * 0.04 + bi * h * 0.045, Math.max(1.4, h * 0.006), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ремень
    if (!coat) {
      ctx.fillStyle = 'rgba(44,29,18,0.9)';
      ctx.fillRect(-hw * 0.98, hip - h * 0.012, hw * 1.96, h * 0.018);
    }

    // шарф
    if (p.scarf) {
      ctx.beginPath();
      ctx.ellipse(0, shoulder + h * 0.008, h * 0.082, h * 0.038, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.scarf;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h * 0.034, shoulder + h * 0.03);
      ctx.quadraticCurveTo(h * 0.07, chest + h * 0.04, h * 0.05, chest + h * 0.1);
      ctx.lineTo(h * 0.012, chest + h * 0.095);
      ctx.quadraticCurveTo(h * 0.022, chest + h * 0.02, -h * 0.006, shoulder + h * 0.03);
      ctx.closePath();
      ctx.fillStyle = shade(p.scarf, -0.1);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.75;
      ctx.stroke();
    }

    drawArms();

    // шея
    rr(ctx, -h * 0.042, shoulder - h * 0.05, h * 0.084, h * 0.09, h * 0.024);
    ctx.fillStyle = skinShade;
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,32,22,0.5)';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();

    // уши
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.ellipse(s * headR * 0.97, headCY + headR * 0.1, headR * 0.19, headR * 0.24, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * headR * 0.99, headCY + headR * 0.11, headR * 0.1, headR * 0.13, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = skinShade;
      ctx.fill();
    });

    // голова
    ctx.beginPath();
    headPath(ctx, headCY, headR);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // мягкая тень только под подбородком: лицо остаётся плоским, без шва на щеке
    ctx.fillStyle = 'rgba(96,54,32,0.1)';
    ctx.beginPath();
    ctx.ellipse(0, headCY + headR * 0.95, headR * 0.62, headR * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    headPath(ctx, headCY, headR);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();

    drawFace(ctx, p, 0, headCY, headR, lw);
    hairFront(ctx, p, headCY, headR, lw);
    drawHat(ctx, p, headCY, headR, lw);
    drawGlasses(ctx, p, headCY, headR, lw);

    // сумка через плечо
    if (p.bag === 'bag' && !opts.noBag) {
      ctx.strokeStyle = '#6a4a32';
      ctx.lineWidth = Math.max(2, h * 0.011);
      ctx.beginPath();
      ctx.moveTo(-h * 0.085, shoulder + h * 0.014);
      ctx.lineTo(h * 0.088, hip - h * 0.008);
      ctx.stroke();
      ctx.save();
      ctx.translate(h * 0.105, hip - h * 0.015);
      rr(ctx, -h * 0.052, 0, h * 0.104, h * 0.12, h * 0.018);
      ctx.fillStyle = '#d8b48a';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,72,44,0.5)';
      ctx.fillRect(-h * 0.052, h * 0.038, h * 0.104, h * 0.012);
      ctx.restore();
    }

    ctx.restore();
  }
  art.drawPerson = drawPerson;

  /* ---------------- посылки ---------------- */
  var parcelPalette = ['#c9a26a', '#d8b77f', '#b98f57', '#e3d3b6', '#9fb3bd', '#c98f7a'];

  function drawParcel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    var col = opts.color || parcelPalette[(opts.seed || 0) % parcelPalette.length];
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.shadow !== false) {
      ctx.shadowColor = 'rgba(50,35,25,0.22)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
    }
    fillRR(ctx, -w / 2, -h / 2, w, h, Math.min(6, w * 0.06), col);
    ctx.restore();
    // скотч
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#efe4c8';
    ctx.fillRect(-w * 0.06, -h / 2, w * 0.12, h);
    ctx.globalAlpha = 1;
    // блик
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w * 0.12, h - 6);
    // этикетка
    if (opts.code) {
      var lw2 = Math.min(w * 0.72, 86), lh2 = Math.min(h * 0.4, 30);
      var lx = -w / 2 + 5, ly = h / 2 - lh2 - 4;
      fillRR(ctx, lx, ly, lw2, lh2, 3, '#fffdf6');
      ctx.fillStyle = '#2a2a2a';
      for (var i = 0; i < Math.floor(lw2 / 3) - 2; i++) {
        var bw = (i % 3 === 0 ? 2 : 1);
        ctx.fillRect(lx + 4 + i * 3, ly + 3, bw, lh2 * 0.42);
      }
      txt(ctx, opts.code, lx + 4, ly + lh2 - 4, Math.min(13, lh2 * 0.46), '#2a2a2a', 700);
    }
    ctx.restore();
  }
  art.drawParcel = drawParcel;

  /* ---------------- товары: узнаваемые спрайты по названию заказа ---------------- */
  /* Покупатель должен получить не безликую коробку, а тот товар, который
     действительно лежит в заказе. Категорий немного, но по ним закрывается
     весь каталог и товары пасхалок. */
  function itemKindOf(name, kind) {
    var n = String(name || '').toLowerCase();
    if (/кроссов|ботин|сапог|туфл|кед/.test(n)) return 'shoe';
    if (/куртк|плащ|пальто|ветровк|пиджак/.test(n)) return 'coat';
    if (/платье|юбк|сарафан/.test(n)) return 'dress';
    if (/джинс|брюк|штан|лосин/.test(n)) return 'pants';
    if (/футболк|свитер|кофт|рубашк|толстовк/.test(n)) return 'shirt';
    if (/шапк|кепк|шляп|панам/.test(n)) return 'hat';
    if (/рюкзак/.test(n)) return 'backpack';
    if (/сумк|чемодан|портфель/.test(n)) return 'bag';
    if (/наушник|колонк|гарнитур/.test(n)) return 'headphones';
    if (/чайник/.test(n)) return 'kettle';
    if (/термос/.test(n)) return 'thermos';
    if (/кружк|чашк|стакан/.test(n)) return 'mug';
    if (/лампа|светильник|ночник/.test(n)) return 'lamp';
    if (/плед|одеял|подушк|носк|покрывал/.test(n)) return 'blanket';
    if (/игрушк|мишк|плюш|кукл/.test(n)) return 'toy';
    if (/чехол/.test(n)) return 'case';
    if (/коврик|ковер|ковёр/.test(n)) return 'mat';
    if (/пылесос/.test(n)) return 'vacuum';
    if (/кофемашин|кофевар|кофе/.test(n)) return 'coffee';
    if (/стол|стул|полк|шкаф|табурет|кресл/.test(n)) return 'chair';
    if (/книг|комикс|журнал/.test(n)) return 'book';
    if (/корм|витамин|лекарств|гриб|посуда|химическ/.test(n)) return 'jar';
    if (/гитар|скрипк|укулеле/.test(n)) return 'guitar';
    if (/самокат|велосипед|ролик/.test(n)) return 'scooter';
    if (/клавиатур/.test(n)) return 'keyboard';
    if (/монитор|телевизор|экран/.test(n)) return 'monitor';
    if (/меч|клинок|кинжал|сабл/.test(n)) return 'sword';
    if (/шлем|каск/.test(n)) return 'helmet';
    if (/лупа/.test(n)) return 'magnifier';
    if (/трость|посох/.test(n)) return 'cane';
    if (/часы|часов/.test(n)) return 'watch';
    if (/фейерверк|петард/.test(n)) return 'rocket';
    if (kind === 'clothes') return 'shirt';
    return 'box';
  }
  art.itemKindOf = itemKindOf;

  function drawItemSprite(ctx, key) {
    switch (key) {
      case 'shoe': {
        ctx.fillStyle = '#3d4249';
        fillRR(ctx, 8, 64, 84, 12, 6);
        ctx.fillStyle = '#f4f1ea';
        ctx.beginPath();
        ctx.moveTo(10, 66); ctx.lineTo(12, 42);
        ctx.quadraticCurveTo(20, 30, 36, 32); ctx.lineTo(50, 44);
        ctx.quadraticCurveTo(70, 50, 90, 60); ctx.lineTo(90, 66); ctx.closePath(); ctx.fill();
        // носок
        ctx.fillStyle = '#d9d5cc';
        ctx.beginPath();
        ctx.moveTo(64, 49); ctx.quadraticCurveTo(80, 55, 90, 60); ctx.lineTo(90, 66); ctx.lineTo(64, 66);
        ctx.closePath(); ctx.fill();
        // манжета
        ctx.fillStyle = '#d9d5cc';
        ctx.beginPath(); ctx.ellipse(24, 44, 10, 7, -0.25, 0, Math.PI * 2); ctx.fill();
        // контур
        ctx.strokeStyle = '#8a8278'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(10, 66); ctx.lineTo(12, 42);
        ctx.quadraticCurveTo(20, 30, 36, 32); ctx.lineTo(50, 44);
        ctx.quadraticCurveTo(70, 50, 90, 60);
        ctx.stroke();
        // шнуровка
        ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        [[34, 42, 46, 39], [38, 47, 50, 44], [42, 52, 54, 49]].forEach(function (p) {
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke();
        });
        // фирменная полоса
        ctx.strokeStyle = '#f2994a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(58, 52); ctx.quadraticCurveTo(74, 58, 87, 62); ctx.stroke();
        break;
      }
      case 'coat': {
        ctx.strokeStyle = '#6c757a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(50, 14, 7, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, 20); ctx.lineTo(50, 28); ctx.stroke();
        ctx.fillStyle = '#6f8fb5';
        ctx.beginPath();
        ctx.moveTo(38, 24); ctx.lineTo(18, 32); ctx.lineTo(10, 64); ctx.lineTo(25, 68);
        ctx.lineTo(30, 46); ctx.lineTo(30, 94); ctx.lineTo(70, 94); ctx.lineTo(70, 46);
        ctx.lineTo(75, 68); ctx.lineTo(90, 64); ctx.lineTo(82, 32); ctx.lineTo(62, 24);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5b7899';
        ctx.beginPath(); ctx.moveTo(38, 24); ctx.lineTo(50, 46); ctx.lineTo(44, 56); ctx.lineTo(34, 40); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(62, 24); ctx.lineTo(50, 46); ctx.lineTo(56, 56); ctx.lineTo(66, 40); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(50, 46); ctx.lineTo(50, 92); ctx.stroke();
        break;
      }
      case 'dress': {
        ctx.fillStyle = '#c46b8e';
        ctx.beginPath();
        ctx.moveTo(36, 20); ctx.lineTo(64, 20); ctx.lineTo(60, 44); ctx.lineTo(74, 90);
        ctx.lineTo(26, 90); ctx.lineTo(40, 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a9557a';
        ctx.beginPath(); ctx.moveTo(40, 44); ctx.lineTo(60, 44); ctx.lineTo(56, 58); ctx.lineTo(44, 58); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c46b8e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(38, 20); ctx.lineTo(34, 10); ctx.moveTo(62, 20); ctx.lineTo(66, 10); ctx.stroke();
        break;
      }
      case 'pants': {
        ctx.fillStyle = '#41556b';
        ctx.beginPath();
        ctx.moveTo(28, 14); ctx.lineTo(72, 14); ctx.lineTo(70, 86); ctx.lineTo(56, 86);
        ctx.lineTo(50, 46); ctx.lineTo(44, 86); ctx.lineTo(30, 86); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(48, 14, 4, 30);
        ctx.fillStyle = '#c9a26a';
        ctx.fillRect(28, 14, 44, 7);
        break;
      }
      case 'shirt': {
        ctx.fillStyle = '#5aa877';
        ctx.beginPath();
        ctx.moveTo(36, 18); ctx.lineTo(20, 24); ctx.lineTo(12, 44); ctx.lineTo(24, 50);
        ctx.lineTo(28, 36); ctx.lineTo(28, 90); ctx.lineTo(72, 90); ctx.lineTo(72, 36);
        ctx.lineTo(76, 50); ctx.lineTo(88, 44); ctx.lineTo(80, 24); ctx.lineTo(64, 18);
        ctx.quadraticCurveTo(50, 32, 36, 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath(); ctx.moveTo(36, 18); ctx.quadraticCurveTo(50, 32, 64, 18); ctx.lineTo(58, 26); ctx.quadraticCurveTo(50, 34, 42, 26); ctx.closePath(); ctx.fill();
        break;
      }
      case 'hat': {
        ctx.fillStyle = '#e7a05a';
        ctx.beginPath(); ctx.arc(50, 52, 26, Math.PI, 0); ctx.lineTo(76, 66); ctx.lineTo(24, 66); ctx.closePath(); ctx.fill();
        fillRR(ctx, 20, 62, 60, 10, 5, '#c9853f');
        ctx.fillStyle = '#f5ead4';
        ctx.beginPath(); ctx.arc(50, 22, 9, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'bag': {
        ctx.strokeStyle = '#7a4f28'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(50, 40, 18, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#a9713f';
        fillRR(ctx, 20, 40, 60, 44, 10);
        fillRR(ctx, 20, 40, 60, 10, 5, '#8a5a30');
        ctx.fillStyle = '#ffd479';
        fillRR(ctx, 44, 54, 12, 10, 3);
        break;
      }
      case 'backpack': {
        ctx.fillStyle = '#4a6a8e';
        fillRR(ctx, 24, 26, 52, 64, 12);
        ctx.fillStyle = '#3a5474';
        fillRR(ctx, 30, 34, 40, 22, 8);
        fillRR(ctx, 38, 62, 24, 18, 5, '#5f80a5');
        ctx.strokeStyle = '#2f4460'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(32, 30); ctx.lineTo(26, 66); ctx.moveTo(68, 30); ctx.lineTo(74, 66); ctx.stroke();
        break;
      }
      case 'headphones': {
        ctx.strokeStyle = '#3c444c'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(50, 46, 27, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.fillStyle = '#2f363d';
        fillRR(ctx, 14, 42, 18, 30, 8);
        fillRR(ctx, 68, 42, 18, 30, 8);
        ctx.fillStyle = '#f2994a';
        fillRR(ctx, 19, 48, 8, 18, 4);
        fillRR(ctx, 73, 48, 8, 18, 4);
        break;
      }
      case 'kettle': {
        ctx.fillStyle = '#b9c3c9';
        fillRR(ctx, 28, 40, 44, 44, 12);
        ctx.fillStyle = '#8f9aa1';
        fillRR(ctx, 24, 32, 52, 12, 6);
        ctx.strokeStyle = '#8f9aa1'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(72, 50); ctx.lineTo(86, 38); ctx.stroke();
        ctx.beginPath(); ctx.arc(30, 62, 13, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = '#f2994a';
        ctx.beginPath(); ctx.arc(50, 72, 5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'thermos': {
        ctx.fillStyle = '#3f6f8a';
        fillRR(ctx, 36, 24, 28, 62, 10);
        ctx.fillStyle = '#2c4a5e';
        fillRR(ctx, 38, 14, 24, 14, 6);
        ctx.fillStyle = '#9fd6c6';
        fillRR(ctx, 36, 46, 28, 12, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        fillRR(ctx, 40, 30, 6, 48, 3);
        break;
      }
      case 'mug': {
        ctx.fillStyle = '#f2e4d2';
        fillRR(ctx, 28, 34, 38, 46, 8);
        ctx.strokeStyle = '#f2e4d2'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(68, 56, 14, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();
        ctx.fillStyle = '#8a5a30';
        fillRR(ctx, 30, 34, 34, 8, 4);
        ctx.fillStyle = '#f2994a';
        ctx.beginPath(); ctx.arc(47, 60, 8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'lamp': {
        ctx.fillStyle = '#6c757a';
        fillRR(ctx, 34, 84, 32, 8, 4);
        ctx.fillRect(47, 46, 6, 40);
        ctx.fillStyle = '#ffd479';
        ctx.beginPath(); ctx.moveTo(50, 12); ctx.lineTo(80, 50); ctx.lineTo(20, 50); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,140,0.35)';
        ctx.beginPath(); ctx.arc(50, 54, 26, 0, Math.PI); ctx.fill();
        break;
      }
      case 'blanket': {
        ctx.fillStyle = '#8d6fa8';
        fillRR(ctx, 16, 48, 68, 38, 8);
        ctx.fillStyle = '#a785c4';
        fillRR(ctx, 20, 40, 60, 16, 6);
        ctx.fillStyle = '#f2e4d2';
        ctx.fillRect(16, 62, 68, 5);
        ctx.fillRect(16, 74, 68, 5);
        break;
      }
      case 'toy': {
        ctx.fillStyle = '#b98049';
        ctx.beginPath(); ctx.arc(34, 30, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(66, 30, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c98f5f';
        ctx.beginPath(); ctx.arc(50, 46, 24, 0, Math.PI * 2); ctx.fill();
        fillRR(ctx, 30, 60, 40, 28, 12);
        ctx.fillStyle = '#3a2a21';
        ctx.beginPath(); ctx.arc(42, 44, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(58, 44, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a21'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(50, 52, 4, 0, Math.PI); ctx.stroke();
        break;
      }
      case 'case': {
        ctx.fillStyle = '#3c444c';
        fillRR(ctx, 30, 12, 40, 76, 12);
        ctx.fillStyle = '#2b3137';
        ctx.beginPath(); ctx.arc(42, 28, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(58, 28, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7fb4c2';
        ctx.beginPath(); ctx.arc(42, 28, 6, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'mat': {
        ctx.fillStyle = '#5f8f74';
        fillRR(ctx, 16, 38, 68, 24, 12);
        ctx.strokeStyle = '#3f6b54'; ctx.lineWidth = 3;
        for (var mi = 0; mi < 3; mi++) {
          ctx.beginPath(); ctx.arc(76, 50, 6 + mi * 4, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#f2994a';
        ctx.fillRect(24, 38, 6, 24);
        break;
      }
      case 'vacuum': {
        ctx.fillStyle = '#8a5a34';
        fillRR(ctx, 20, 46, 54, 34, 14);
        ctx.fillStyle = '#c9a26a';
        fillRR(ctx, 26, 40, 42, 12, 6);
        ctx.strokeStyle = '#6c757a'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(74, 52); ctx.quadraticCurveTo(92, 62, 80, 84); ctx.stroke();
        fillRR(ctx, 68, 82, 26, 8, 4, '#6c757a');
        ctx.fillStyle = '#3c444c';
        ctx.beginPath(); ctx.arc(32, 84, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(62, 84, 8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'coffee': {
        ctx.fillStyle = '#3c444c';
        fillRR(ctx, 26, 18, 48, 62, 8);
        ctx.fillStyle = '#7fb4c2';
        fillRR(ctx, 32, 26, 36, 18, 4);
        ctx.fillStyle = '#f2e4d2';
        fillRR(ctx, 36, 52, 28, 20, 4);
        ctx.fillStyle = '#8a5a30';
        ctx.beginPath(); ctx.arc(50, 62, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e4572e';
        ctx.beginPath(); ctx.arc(56, 34, 4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'chair': {
        ctx.fillStyle = '#a9713f';
        fillRR(ctx, 30, 10, 40, 34, 8);
        fillRR(ctx, 20, 48, 60, 14, 6);
        ctx.fillStyle = '#7d4f2a';
        ctx.fillRect(24, 62, 7, 26);
        ctx.fillRect(69, 62, 7, 26);
        ctx.fillRect(48, 62, 7, 26);
        break;
      }
      case 'book': {
        ctx.fillStyle = '#e4572e';
        fillRR(ctx, 18, 16, 64, 70, 6);
        ctx.fillStyle = '#f2e4d2';
        fillRR(ctx, 30, 16, 52, 70, 4);
        ctx.fillStyle = '#c9a26a';
        ctx.fillRect(30, 30, 52, 3);
        ctx.fillRect(30, 40, 52, 3);
        ctx.fillStyle = '#3a2a21';
        ctx.fillRect(24, 16, 6, 70);
        break;
      }
      case 'jar': {
        ctx.fillStyle = '#cfe1d8';
        fillRR(ctx, 30, 24, 40, 58, 10);
        ctx.fillStyle = '#8a5a30';
        fillRR(ctx, 28, 16, 44, 12, 5);
        ctx.fillStyle = '#f5ead4';
        fillRR(ctx, 30, 46, 40, 20, 2);
        ctx.fillStyle = '#5aa877';
        ctx.beginPath(); ctx.arc(50, 56, 6, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'guitar': {
        ctx.fillStyle = '#c98f5f';
        ctx.beginPath(); ctx.arc(44, 66, 24, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(52, 44, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a5a30';
        fillRR(ctx, 50, 6, 8, 40, 3);
        ctx.beginPath(); ctx.arc(44, 66, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a21';
        ctx.beginPath(); ctx.arc(44, 66, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'scooter': {
        ctx.fillStyle = '#3c444c';
        ctx.beginPath(); ctx.arc(24, 80, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(76, 80, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e4572e';
        fillRR(ctx, 20, 64, 56, 10, 5);
        ctx.strokeStyle = '#9aa3a8'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(66, 64); ctx.lineTo(72, 24); ctx.stroke();
        fillRR(ctx, 62, 18, 28, 8, 4, '#3c444c');
        break;
      }
      case 'keyboard': {
        ctx.fillStyle = '#3c444c';
        fillRR(ctx, 10, 34, 80, 36, 6);
        ctx.fillStyle = '#d8dde0';
        for (var kr = 0; kr < 3; kr++) {
          for (var kc = 0; kc < 8; kc++) ctx.fillRect(16 + kc * 9, 40 + kr * 8, 6, 5);
        }
        ctx.fillRect(24, 62, 52, 4);
        break;
      }
      case 'monitor': {
        ctx.fillStyle = '#2f363d';
        fillRR(ctx, 10, 16, 80, 52, 6);
        ctx.fillStyle = '#7fb4c2';
        fillRR(ctx, 16, 22, 68, 40, 3);
        ctx.fillStyle = '#2f363d';
        ctx.fillRect(46, 68, 8, 14);
        fillRR(ctx, 30, 80, 40, 6, 3);
        break;
      }
      case 'sword': {
        ctx.fillStyle = '#d8dde0';
        ctx.beginPath(); ctx.moveTo(78, 8); ctx.lineTo(86, 16); ctx.lineTo(40, 62); ctx.lineTo(32, 54); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#9aa3a8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(36, 58); ctx.lineTo(80, 14); ctx.stroke();
        ctx.fillStyle = '#c9a227';
        fillRR(ctx, 24, 54, 24, 8, 3);
        ctx.save(); ctx.translate(26, 60); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#8a5a34'; fillRR(ctx, 0, 0, 7, 24, 3);
        ctx.restore();
        break;
      }
      case 'helmet': {
        ctx.fillStyle = '#2f363d';
        ctx.beginPath(); ctx.arc(50, 52, 30, Math.PI, 0); ctx.lineTo(80, 64); ctx.lineTo(20, 64); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e4572e';
        ctx.beginPath(); ctx.arc(50, 52, 30, Math.PI * 1.15, Math.PI * 1.85); ctx.lineTo(50, 52); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7fb4c2';
        fillRR(ctx, 30, 56, 40, 10, 4);
        break;
      }
      case 'magnifier': {
        ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(58, 58); ctx.lineTo(82, 84); ctx.stroke();
        ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(42, 42, 24, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(160,220,235,0.4)';
        ctx.beginPath(); ctx.arc(42, 42, 22, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'cane': {
        ctx.strokeStyle = '#6b4526'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(42, 90); ctx.lineTo(42, 30); ctx.quadraticCurveTo(42, 12, 60, 14); ctx.stroke();
        ctx.fillStyle = '#c9a227';
        ctx.beginPath(); ctx.arc(60, 14, 7, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'watch': {
        ctx.fillStyle = '#3c444c';
        fillRR(ctx, 38, 10, 24, 24, 6);
        fillRR(ctx, 38, 66, 24, 24, 6);
        ctx.fillStyle = '#c9a227';
        ctx.beginPath(); ctx.arc(50, 50, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5ead4';
        ctx.beginPath(); ctx.arc(50, 50, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a21'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(50, 40); ctx.moveTo(50, 50); ctx.lineTo(58, 54); ctx.stroke();
        break;
      }
      case 'rocket': {
        ctx.fillStyle = '#e4572e';
        fillRR(ctx, 42, 12, 16, 52, 6);
        ctx.fillStyle = '#ffd479';
        ctx.beginPath(); ctx.moveTo(42, 64); ctx.lineTo(50, 88); ctx.lineTo(58, 64); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3c444c';
        fillRR(ctx, 34, 78, 32, 6, 3);
        break;
      }
      default: {
        // обобщённая коробка с логотипом — для редких товаров
        ctx.fillStyle = '#c9a26a';
        fillRR(ctx, 16, 26, 68, 58, 6);
        ctx.fillStyle = '#e6d3a8';
        ctx.fillRect(44, 26, 12, 58);
        ctx.fillStyle = '#fffdf6';
        fillRR(ctx, 24, 56, 32, 20, 3);
        ctx.fillStyle = '#8a5a30';
        ctx.fillRect(28, 62, 24, 3);
        ctx.fillRect(28, 68, 16, 3);
        ctx.fillStyle = '#f2994a';
        ctx.beginPath(); ctx.arc(66, 44, 7, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
  }

  function drawCatalogItem(ctx, name, kind, x, y, w, h, opts) {
    opts = opts || {};
    var key = opts.key || itemKindOf(name, kind);
    var s = Math.min(w, h) / 100;
    var cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    if (opts.rot) {
      ctx.translate(cx, cy);
      ctx.rotate(opts.rot);
      ctx.translate(-cx, -cy);
    }
    if (opts.shadow !== false) {
      ctx.save();
      ctx.shadowColor = 'rgba(40,24,12,0.4)';
      ctx.shadowBlur = Math.max(6, w * 0.14);
      ctx.shadowOffsetY = Math.max(2, h * 0.05);
      ctx.fillStyle = 'rgba(0,0,0,0.01)';
      fillRR(ctx, x + w * 0.16, y + h * 0.16, w * 0.68, h * 0.68, 8);
      ctx.restore();
    }
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-50, -50);
    drawItemSprite(ctx, key);
    ctx.restore();
    if (opts.label) {
      txt(ctx, opts.label, cx, y + h + 18, 13, 'rgba(255,240,220,0.9)', 700, 'center');
    }
  }
  art.drawCatalogItem = drawCatalogItem;
  art.itemSpriteKey = function (name, kind) { return itemKindOf(name, kind); };

  /* ---------------- раскладки ---------------- */
  art.LAYOUT = {
    counter: {
      warehouseDoor: { x: 66, y: 128, w: 184, h: 344 },
      entrance: { x: 1090, y: 132, w: 168, h: 340 },
      // рабочий стол: ноутбук по центру, часы и фигурки рядом, кофе справа
      laptop: { x: 694, y: 336, w: 274, h: 286 },
      laptopScreen: { x: 722, y: 352, w: 218, h: 176 },
      scanner: { x: 534, y: 588, w: 126, h: 62 },
      printer: { x: 278, y: 478, w: 122, h: 82 },
      deskClock: { x: 630, y: 514, w: 66, h: 66 },
      figurines: { x: 1006, y: 536, w: 116, h: 64 },
      mug: { x: 1010, y: 610, w: 62, h: 58 },
      bell: { x: 740, y: 604, w: 52, h: 52 },
      cash: { x: 352, y: 624, w: 128, h: 74 },
      parcel: { x: 1136, y: 638, w: 92, h: 72 },
      // сюда кладут посылку из ячейки: свободное место слева от сканера
      parcelOnTable: { x: 430, y: 536, w: 96, h: 76 },
      customer: { x: 430, y: 110, w: 340, h: 360 }
    },
    hall: {
      door: { x: 540, y: 116, w: 250, h: 404 },
      counter: { x: 1120, y: 150, w: 150, h: 420 },
      bench: { x: 820, y: 430, w: 190, h: 120 },
      boxes: { x: 52, y: 540, w: 210, h: 150 },
      plant: { x: 1020, y: 372, w: 118, h: 180 },
      fitting: { x: 44, y: 150, w: 208, h: 306 },
      light: { x: 470, y: 300, w: 50, h: 66 }
    },
    warehouse: {
      rackA: { x: 130, y: 176, w: 260, h: 344 },
      rackB: { x: 430, y: 176, w: 260, h: 344 },
      rackC: { x: 730, y: 176, w: 260, h: 344 },
      back: { x: 1040, y: 150, w: 210, h: 380 },
      returns: { x: 900, y: 548, w: 250, h: 142 }
    }
  };

  /* ---------------- интерьер: стойка (вид от первого лица) ---------------- */
  function wallPanels(ctx, x, y, w, h, step) {
    ctx.strokeStyle = 'rgba(120,90,60,0.10)';
    ctx.lineWidth = 2;
    for (var i = x + step; i < x + w; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, y);
      ctx.lineTo(i, y + h);
      ctx.stroke();
    }
  }

  art.drawCounterScene = function (ctx, env) {
    env = env || {};
    var t = env.t || 0;
    var clock = env.clock || 480;
    var W = 1280, H = 720;

    // потолок
    var g = ctx.createLinearGradient(0, 0, 0, 76);
    g.addColorStop(0, '#d9c6a8');
    g.addColorStop(1, '#e8d8bd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 76);
    // светильники
    [260, 700, 1010].forEach(function (lx) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,238,190,0.85)';
      ctx.shadowBlur = 34;
      fillRR(ctx, lx, 20, 180, 26, 8, '#fff6dd');
      ctx.restore();
    });
    ctx.fillStyle = 'rgba(120,95,70,0.25)';
    ctx.fillRect(0, 74, W, 4);

    // стена
    g = ctx.createLinearGradient(0, 78, 0, 470);
    g.addColorStop(0, '#f2e5d1');
    g.addColorStop(0.65, '#ecdfc8');
    g.addColorStop(1, '#e0cfb2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 78, W, 394);
    wallPanels(ctx, 0, 78, W, 394, 172);
    // объём стены: мягкое затемнение по краям и под потолком
    edgeShade(ctx, 0, 78, W, 394, 0.18);
    var wallTop = ctx.createLinearGradient(0, 78, 0, 210);
    wallTop.addColorStop(0, 'rgba(52,34,20,0.24)');
    wallTop.addColorStop(1, 'rgba(52,34,20,0)');
    ctx.fillStyle = wallTop;
    ctx.fillRect(0, 78, W, 132);

    // плинтус
    ctx.fillStyle = '#cbb28d';
    ctx.fillRect(0, 452, W, 14);
    ctx.fillStyle = 'rgba(90,65,45,0.16)';
    ctx.fillRect(0, 466, W, 6);

    // дверь на склад
    var d = art.LAYOUT.counter.warehouseDoor;
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,25,0.22)';
    ctx.shadowBlur = 14;
    fillRR(ctx, d.x - 10, d.y - 10, d.w + 20, d.h + 20, 8, '#8d6a4a');
    ctx.restore();
    fillRR(ctx, d.x, d.y, d.w, d.h, 6, '#6f7d7a');
    var dg = ctx.createLinearGradient(d.x, d.y, d.x + d.w, d.y + d.h);
    dg.addColorStop(0, '#86948f');
    dg.addColorStop(1, '#5f6d6a');
    fillRR(ctx, d.x + 8, d.y + 8, d.w - 16, d.h - 16, 4, dg);
    // полосы склада на двери
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 8;
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(d.x + 14, d.y + 40 + i * 56);
      ctx.lineTo(d.x + d.w - 14, d.y + 26 + i * 56);
      ctx.stroke();
    }
    // ручка двери склада: металлическая планка с рычагом
    var hg = ctx.createLinearGradient(0, d.y + d.h * 0.5 - 20, 0, d.y + d.h * 0.5 + 28);
    hg.addColorStop(0, '#eef3f5');
    hg.addColorStop(0.45, '#b9c3c9');
    hg.addColorStop(1, '#727d84');
    softShadow(ctx, d.x + d.w - 30, d.y + d.h * 0.5 + 10, 26, 10, 0.26);
    fillRR(ctx, d.x + d.w - 64, d.y + d.h * 0.5 - 16, 10, 46, 5, hg);
    fillRR(ctx, d.x + d.w - 64, d.y + d.h * 0.5 + 2, 34, 9, 4.5, hg);
    // табличка СКЛАД
    fillRR(ctx, d.x + 16, d.y + d.h - 62, 96, 32, 6, '#f5efdf');
    txt(ctx, 'СКЛАД', d.x + 64, d.y + d.h - 38, 20, P.ink, 800, 'center');
    // лампа-индикатор склада в аккуратном корпусе
    var lampOn = !!env.warehouseLight;
    var lampX = d.x + d.w - 28, lampY = d.y + 24;
    ctx.save();
    ctx.shadowColor = lampOn ? 'rgba(127,224,160,0.85)' : 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = lampOn ? 18 : 5;
    fillRR(ctx, lampX - 13, lampY - 8, 26, 17, 6, '#2f3a38');
    ctx.restore();
    strokeRR(ctx, lampX - 13, lampY - 8, 26, 17, 6, 'rgba(20,26,25,0.8)', 1.5);
    ctx.beginPath();
    ctx.arc(lampX, lampY, 5, 0, Math.PI * 2);
    ctx.fillStyle = lampOn ? '#9ff5bd' : '#4f5a55';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lampX - 1.5, lampY - 1.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = lampOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)';
    ctx.fill();

    // фирменная вывеска
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,25,0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, 458, 96, 350, 86, 14, '#fff8ea');
    ctx.restore();
    strokeRR(ctx, 458, 96, 350, 86, 14, '#e0c9a4', 2);
    ctx.beginPath();
    ctx.arc(500, 139, 27, 0, Math.PI * 2);
    ctx.fillStyle = (PVZ.state && PVZ.state.brandColor) ? PVZ.state.brandColor() : P.accent;
    ctx.fill();
    // коробка в логотипе
    ctx.save();
    ctx.translate(500, 139);
    ctx.fillStyle = '#fff8ea';
    ctx.fillRect(-12, -3, 24, 15);
    ctx.beginPath();
    ctx.moveTo(-12, -3); ctx.lineTo(-4, -11); ctx.lineTo(4, -11); ctx.lineTo(12, -3); ctx.closePath();
    ctx.fillStyle = '#ffe9c9'; ctx.fill();
    ctx.restore();
    txt(ctx, 'ПУНКТ ВЫДАЧИ', 540, 132, 24, P.ink, 800);
    var brandName = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';
    var brandLine = fitTxt(ctx, 'заказов • ' + brandName, 250, 13, 600, 9);
    txt(ctx, brandLine.text, 541, 160, brandLine.size, P.inkSoft, 600);

    // постер «возврат» на стене справа
    fillRR(ctx, 846, 192, 158, 116, 6, '#fff8ec');
    strokeRR(ctx, 846, 192, 158, 116, 6, '#dcc7a6', 2);
    txt(ctx, 'ВОЗВРАТ', 925, 220, 15, P.ink, 800, 'center');
    txt(ctx, '14 дней', 925, 240, 13, P.inkSoft, 600, 'center');
    ctx.strokeStyle = 'rgba(90,70,50,0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(862, 252);
    ctx.lineTo(988, 252);
    ctx.stroke();
    ctx.strokeStyle = '#e4572e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(925, 278, 15, 0.6, Math.PI * 1.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(913, 266);
    ctx.lineTo(924, 261);
    ctx.lineTo(927, 273);
    ctx.stroke();

    // входная дверь справа
    var e = art.LAYOUT.counter.entrance;
    ctx.save();
    ctx.shadowColor = 'rgba(50,35,25,0.25)';
    ctx.shadowBlur = 16;
    fillRR(ctx, e.x - 12, e.y - 12, e.w + 24, e.h + 22, 10, '#8d6a4a');
    ctx.restore();
    fillRR(ctx, e.x, e.y, e.w, e.h, 8, '#bfe0e6');
    // улица за стеклом
    var gg = ctx.createLinearGradient(e.x, e.y, e.x, e.y + e.h);
    gg.addColorStop(0, env.night ? '#2c3a52' : '#bfe0e6');
    gg.addColorStop(1, env.night ? '#1e2838' : '#8fc4cf');
    fillRR(ctx, e.x + 6, e.y + 6, e.w - 12, e.h - 12, 4, gg);
    // здания
    ctx.fillStyle = env.night ? 'rgba(20,26,38,0.65)' : 'rgba(120,150,150,0.45)';
    ctx.fillRect(e.x + 12, e.y + 90, 60, e.h - 110);
    ctx.fillRect(e.x + 80, e.y + 130, 40, e.h - 150);
    ctx.fillRect(e.x + 128, e.y + 70, 46, e.h - 90);
    // окна
    for (var wy = 0; wy < 3; wy++) {
      for (var wx = 0; wx < 3; wx++) {
        ctx.fillStyle = env.night ? 'rgba(255,214,120,0.5)' : 'rgba(255,250,220,0.35)';
        ctx.fillRect(e.x + 18 + wx * 20, e.y + 100 + wy * 32, 10, 14);
      }
    }
    // деревo — за стеклом, не поверх двери
    ctx.save();
    ctx.beginPath();
    rr(ctx, e.x + 8, e.y + 8, e.w - 16, e.h - 16, 4);
    ctx.clip();
    ctx.fillStyle = env.night ? '#1d2a22' : '#6aa074';
    ctx.beginPath();
    ctx.arc(e.x + 36, e.y + 252, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + 52, e.y + 238, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = env.night ? '#101a14' : '#5a7f5f';
    ctx.fillRect(e.x + 34, e.y + 262, 5, 26);
    ctx.restore();
    // прохожие-силуэты
    if (env.passerby != null) {
      var pxp = e.x + 20 + ((t * 18 + env.passerby * 60) % (e.w - 40));
      drawPerson(ctx, { skin: 2, hair: '#2a2119', style: 'short', shirt: '#39465a', pants: '#2c3542', expr: 'neutral' }, pxp, e.y + e.h - 10, 70, { silhouette: env.night ? 'rgba(12,18,26,0.85)' : 'rgba(40,55,60,0.6)', noShadow: true });
    }
    // стекло блики
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(e.x + 20, e.y + 20); ctx.lineTo(e.x + 80, e.y + 20); ctx.lineTo(e.x + 20, e.y + 180); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // дверная ручка и табличка режима работы
    softShadow(ctx, e.x + e.w / 2, e.y + e.h * 0.62, 34, 14, 0.24);
    var ehg = ctx.createLinearGradient(e.x + 10, 0, e.x + 30, 0);
    ehg.addColorStop(0, '#f6fafb');
    ehg.addColorStop(0.5, '#c2ccd2');
    ehg.addColorStop(1, '#7d888f');
    fillRR(ctx, e.x + 16, e.y + e.h * 0.55, 9, 58, 4.5, ehg);
    fillRR(ctx, e.x + 18, e.y + e.h * 0.55 + 42, 26, 8, 4, ehg);
    // аккуратная табличка «открыто/закрыто» с индикатором
    var signX = e.x + e.w / 2 - 40, signY = e.y + 16;
    fillRR(ctx, signX, signY, 80, 26, 6, env.doorOpen ? '#eef8ef' : '#f7efe6');
    strokeRR(ctx, signX, signY, 80, 26, 6, env.doorOpen ? '#9fd6b0' : '#d8c4ae', 1.5);
    ctx.beginPath();
    ctx.arc(signX + 13, signY + 13, 4, 0, Math.PI * 2);
    ctx.fillStyle = env.doorOpen ? '#4fae72' : '#b8725c';
    ctx.fill();
    txt(ctx, env.doorOpen ? 'ОТКРЫТО' : 'ЗАКРЫТО', signX + 24, signY + 18, 11, env.doorOpen ? '#1e5a36' : P.ink, 800);

    // постер «как получить заказ» (настенных часов больше нет — время на столе и в ноутбуке)
    fillRR(ctx, 236, 236, 118, 168, 6, '#fff8ec');
    strokeRR(ctx, 236, 236, 118, 168, 6, '#dcc7a6', 2);
    txt(ctx, 'КАК ПОЛУЧИТЬ', 295, 262, 12, P.ink, 800, 'center');
    txt(ctx, 'ЗАКАЗ', 295, 278, 12, P.ink, 800, 'center');
    for (var pi = 0; pi < 3; pi++) {
      ctx.fillStyle = P.accent;
      ctx.beginPath();
      ctx.arc(258, 306 + pi * 30, 7, 0, Math.PI * 2);
      ctx.fill();
      txt(ctx, String(pi + 1), 258, 310 + pi * 30, 10, '#fff', 800, 'center');
      ctx.fillStyle = 'rgba(58,42,33,0.55)';
      ctx.fillRect(272, 301 + pi * 30, 62 - pi * 8, 5);
      ctx.fillRect(272, 310 + pi * 30, 48 - pi * 6, 4);
    }

    // декор на стене
    if (art.has('decor_poster')) {
      var pl = art.level('decor_poster');
      ctx.save();
      ctx.translate(690, 210);
      ctx.rotate(-0.02);
      fillRR(ctx, 0, 0, 148, 108, 5, '#fff6e2');
      strokeRR(ctx, 0, 0, 148, 108, 5, pl >= 3 ? '#d4a63c' : pl === 2 ? '#9aa8b4' : '#dcbf94', pl >= 2 ? 3 : 2);
      if (pl >= 3) {
        ctx.fillStyle = '#f2c14a';
        ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(140, 8, 4, 0, Math.PI * 2); ctx.fill();
      }
      txt(ctx, 'УЛЫБНИТЕСЬ!', 74, 30, 12, P.ink, 800, 'center');
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(74, 60, 26, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = P.ink;
      ctx.beginPath(); ctx.arc(62, 52, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(86, 52, 3.5, 0, Math.PI * 2); ctx.fill();
      txt(ctx, 'мы работаем для вас', 74, 98, 8, P.inkSoft, 600, 'center');
      ctx.restore();
    }
    if (art.has('decor_neon')) {
      var nl = art.level('decor_neon');
      var neonCol = nl >= 3 ? '#ffd479' : nl === 2 ? '#8fe6ff' : '#ff9dd0';
      ctx.save();
      ctx.shadowColor = nl >= 3 ? 'rgba(255,205,90,0.9)' : nl === 2 ? 'rgba(110,220,255,0.85)' : 'rgba(255,120,190,0.85)';
      ctx.shadowBlur = 24 + Math.sin(t * 2) * 6;
      txt(ctx, 'ПВЗ', 940, 152, 28, neonCol, 800, 'center');
      ctx.restore();
      txt(ctx, '24/7', 940, 176, 12, nl >= 3 ? 'rgba(255,225,150,0.85)' : nl === 2 ? 'rgba(160,235,255,0.8)' : 'rgba(255,170,215,0.75)', 700, 'center');
    }

    // очередь и уходящие покупатели (дальний план, за стойкой)
    var crowd = env.crowd || [];
    crowd.slice().sort(function (a, b) { return a.h - b.h; }).forEach(function (p) {
      // lift приподнимает фигуру над полом: у стойки стопы всё равно скрыты прилавком
      var gy = p.gy - p.h * (p.lift || 0);
      drawPerson(ctx, p.person, p.x, gy, p.h, {
        walk: p.walking ? t * 9.5 : 0,
        sway: p.walking ? 0 : t * 1.4,
        handsUp: p.person.expr === 'angry',
        alpha: p.alpha == null ? 1 : p.alpha
      });
      // привязки считаем по реальной макушке: у мультяшных голов она выше
      var pm = personMetrics(p.person, p.h);
      var headTopY = gy - pm.top;
      if (p.mood) drawMoodBadge(ctx, p.x + pm.headR * 1.3, headTopY + pm.headR * 0.42, p.h * 0.045, p.person, p.mood, t);
      if (p.person.bubble && (p.bubbleAlpha == null || p.bubbleAlpha > 0.02)) {
        ctx.save();
        ctx.globalAlpha = p.bubbleAlpha == null ? 1 : Math.min(1, p.bubbleAlpha);
        bubble(ctx, p.person.bubble, Math.max(210, Math.min(1070, p.x)), headTopY - pm.headR * 0.1 + 10, { size: p.small ? 16 : 21, maxW: p.small ? 300 : 430 });
        ctx.restore();
      }
      if (p.leaving) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        txt(ctx, '→', p.x + p.h * 0.22, p.gy - p.h * 0.5, 22, 'rgba(255,240,215,0.55)', 700, 'center');
        ctx.restore();
      }
    });

    /* --- стол --- */
    // столешница
    var deskG = ctx.createLinearGradient(0, 470, 0, 720);
    deskG.addColorStop(0, '#b98049');
    deskG.addColorStop(0.35, '#c78d55');
    deskG.addColorStop(1, '#a9713f');
    ctx.beginPath();
    ctx.moveTo(40, 470);
    ctx.lineTo(1240, 470);
    ctx.lineTo(1340, 720);
    ctx.lineTo(-60, 720);
    ctx.closePath();
    ctx.fillStyle = deskG;
    ctx.fill();
    // задняя кромка
    ctx.fillStyle = '#8b5a34';
    ctx.fillRect(40, 468, 1200, 7);
    // текстура дерева
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = '#4a2f1c';
    for (var li = 0; li < 12; li++) {
      ctx.lineWidth = 1 + (li % 3);
      ctx.beginPath();
      var yy = 500 + li * 19;
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(300, yy + 6, 900, yy - 6, 1280, yy + 2);
      ctx.stroke();
    }
    ctx.restore();
    // передняя кромка
    ctx.fillStyle = '#7d4f2a';
    ctx.fillRect(0, 700, 1280, 20);
    ctx.fillStyle = 'rgba(255,220,170,0.14)';
    ctx.fillRect(0, 700, 1280, 3);

    // объём столешницы: затемнение к дальней кромке и по краям
    var deskShade = ctx.createLinearGradient(0, 470, 0, 640);
    deskShade.addColorStop(0, 'rgba(58,33,16,0.32)');
    deskShade.addColorStop(0.32, 'rgba(58,33,16,0.07)');
    deskShade.addColorStop(1, 'rgba(58,33,16,0)');
    ctx.fillStyle = deskShade;
    ctx.fillRect(0, 470, 1280, 180);
    var deskSideG = ctx.createLinearGradient(0, 0, 1280, 0);
    deskSideG.addColorStop(0, 'rgba(50,28,14,0.22)');
    deskSideG.addColorStop(0.14, 'rgba(50,28,14,0.03)');
    deskSideG.addColorStop(0.5, 'rgba(0,0,0,0)');
    deskSideG.addColorStop(0.86, 'rgba(50,28,14,0.03)');
    deskSideG.addColorStop(1, 'rgba(50,28,14,0.22)');
    ctx.fillStyle = deskSideG;
    ctx.fillRect(0, 470, 1280, 250);

    // коврик под мышью
    softShadow(ctx, 932, 664, 52, 9, 0.24);
    fillRR(ctx, 876, 598, 120, 74, 14, 'rgba(56,64,72,0.5)');
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    rr(ctx, 876, 598, 120, 74, 14);
    ctx.stroke();

    // слева: принтер этикеток и лампа/растение (декор)
    softShadow(ctx, 339, 562, 64, 11, 0.24);
    drawPrinter(ctx, 278, 478, 122, 82);
    if (art.has('decor_lamp')) drawDeskLamp(ctx, 172, 470, t, art.level('decor_lamp'));
    if (art.has('decor_plant')) drawDeskPlant(ctx, 62, 500, 82, t, art.level('decor_plant'));

    // ноутбук — рабочий инструмент сотрудника
    softShadow(ctx, 831, 620, 158, 16, 0.26);
    drawLaptopOpen(ctx, 694, 336, 274, 286, env, t);
    // экран подсвечивает столешницу
    var scrGlow = ctx.createRadialGradient(831, 486, 24, 831, 486, 300);
    scrGlow.addColorStop(0, 'rgba(126,224,204,' + (0.11 + Math.sin(t * 1.6) * 0.02) + ')');
    scrGlow.addColorStop(1, 'rgba(126,224,204,0)');
    ctx.fillStyle = scrGlow;
    ctx.fillRect(560, 420, 560, 280);

    // рядом с ноутбуком: часы и фигурки появляются только после покупки декора
    var clockLvl = art.level('decor_clock');
    if (clockLvl) {
      softShadow(ctx, 663, 582, 36, 7, 0.22);
      drawDeskClock(ctx, 630, 514, 66, clock, clockLvl);
    }
    softShadow(ctx, 1064, 604, 58, 10, 0.22);
    drawFigurines(ctx, 1006, 538, t, art.level('decor_cat'));

    // кофе справа от ноутбука
    softShadow(ctx, 1042, 668, 36, 8, 0.24);
    drawMug(ctx, 1012, 612, 60, t);

    // мышь — вторая клавиатура убрана, рабочий стол стал чище
    softShadow(ctx, 920, 660, 24, 7, 0.26);
    drawMouse(ctx, 902, 616);

    // стаканчик с ручками — до посылки, чтобы не перекрывать её
    drawPenCup(ctx, 412, 508, 40);

    // сканер лежит слева, на краю стола — не мешает. Взяли в руку — со стола исчезает.
    if (!env.scannerHeld) {
      softShadow(ctx, 594, 652, 64, 11, 0.24);
      drawScannerGun(ctx, 528, 586, 132, 66, env, t);
    }
    // посылка, которую положили на стол перед сканированием
    if (env.parcel) {
      var pp = art.LAYOUT.counter.parcelOnTable;
      var place = env.parcel.place == null ? 1 : U.clamp(env.parcel.place, 0, 1);
      var rot = -0.03;
      if (place < 1) {
        // коробку «дотащили» из рук: плавно опускаем её на стол
        var ease = 1 - Math.pow(1 - place, 3);
        var fromP = { x: 548, y: 426, w: 184, h: 150 };
        pp = {
          x: fromP.x + (pp.x - fromP.x) * ease,
          y: fromP.y + (pp.y - fromP.y) * ease,
          w: fromP.w + (pp.w - fromP.w) * ease,
          h: fromP.h + (pp.h - fromP.h) * ease
        };
        rot = -0.03 + (1 - ease) * 0.06;
      }
      softShadow(ctx, pp.x + pp.w / 2, pp.y + pp.h - 2, pp.w * 0.52, 9, 0.24);
      drawParcel(ctx, pp.x, pp.y, pp.w, pp.h, { seed: 1, color: '#c9a26a', rot: rot, code: env.parcel.code });
      if (place >= 1 && env.parcel.unpacked) {
        // вскрытая коробка: тёмное нутро и отогнутые клапаны
        ctx.save();
        ctx.fillStyle = 'rgba(40,26,15,0.9)';
        fillRR(ctx, pp.x + 9, pp.y + 7, pp.w - 18, pp.h * 0.3, 3);
        ctx.fillStyle = '#dcb87f';
        ctx.beginPath();
        ctx.moveTo(pp.x + 6, pp.y + 8); ctx.lineTo(pp.x + 10, pp.y - 6);
        ctx.lineTo(pp.x + 22, pp.y - 4); ctx.lineTo(pp.x + 20, pp.y + 4); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pp.x + pp.w - 6, pp.y + 8); ctx.lineTo(pp.x + pp.w - 10, pp.y - 6);
        ctx.lineTo(pp.x + pp.w - 24, pp.y - 4); ctx.lineTo(pp.x + pp.w - 22, pp.y + 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (place >= 1 && env.parcel.scanned && !env.parcel.unpacked) {
        ctx.save();
        ctx.shadowColor = 'rgba(90,200,140,0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pp.x + pp.w - 8, pp.y + 8, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#5aa877';
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#eafff2';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pp.x + pp.w - 12, pp.y + 8);
        ctx.lineTo(pp.x + pp.w - 9, pp.y + 11);
        ctx.lineTo(pp.x + pp.w - 3, pp.y + 5);
        ctx.stroke();
      }
    }
    // звоночек переехал ближе к центру, между сканером и ноутбуком
    softShadow(ctx, 766, 633, 28, 7, 0.24);
    drawBell(ctx, 740, 604, t, env.bellRinging);

    // уличный кот, если его оставили на ПВЗ — сидит на подушке и заметно крупный
    if (env.cat) {
      softShadow(ctx, 1150, 714, 76, 12, 0.24);
      drawCatCushion(ctx, 1150, 706, 150);
      drawDeskCat(ctx, 1150, 700, 150, t, env.catAnim, env.cat);
    }

    // касса на время вечерней сверки
    if (env.showCash) drawCashRegister(ctx, art.LAYOUT.counter.cash, env.cashDone);

    /* --- то, что игрок держит в руках: рисуем поверх всего стола --- */
    // коробка в руках: несут со склада к столу
    if (env.carry && !env.parcel) {
      drawCarryBox(ctx, env.carry, t);
    }
    // товар уже достали из коробки — держим его в руках перед покупателем
    if (env.heldProduct) {
      var hp = { x: 846, y: 468, w: 194, h: 194 };
      softShadow(ctx, hp.x + hp.w / 2, hp.y + hp.h - 4, 72, 13, 0.3);
      drawHandsCradle(ctx, hp.x + 6, hp.y + hp.h - 8, hp.w - 12, t);
      drawCatalogItem(ctx, env.heldProduct.item, env.heldProduct.kind, hp.x, hp.y, hp.w, hp.h,
        { rot: Math.sin(t * 1.2) * 0.03 });
    }
    // передача товара покупателю: спрайт летит из рук к клиенту
    if (env.handoff) {
      var ht = U.clamp((env.handoff.t || 0) / 0.95, 0, 1);
      var easeH = 1 - Math.pow(1 - ht, 2.2);
      var hx2 = 930 + (630 - 930) * easeH;
      var hy2 = 590 + (404 - 590) * easeH - Math.sin(ht * Math.PI) * 90;
      var hsz = 160 * (1 - 0.35 * ht);
      ctx.save();
      ctx.globalAlpha = ht > 0.78 ? Math.max(0, 1 - (ht - 0.78) / 0.22) : 1;
      drawCatalogItem(ctx, env.handoff.item, env.handoff.kind, hx2 - hsz / 2, hy2 - hsz / 2, hsz, hsz);
      ctx.restore();
    }

    // тёплые пятна света от потолочных ламп
    [260, 700, 1010].forEach(function (lx) {
      var lg = ctx.createRadialGradient(lx + 90, 46, 8, lx + 90, 46, 320);
      lg.addColorStop(0, env.night ? 'rgba(255,214,150,0.15)' : 'rgba(255,247,216,0.19)');
      lg.addColorStop(1, 'rgba(255,247,216,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 230, 0, 640, 440);
    });
    // пылинки, плавающие в свете
    ctx.save();
    for (var mi = 0; mi < 16; mi++) {
      var mx = U.hash(mi * 3.1) * 1280;
      var my = 96 + U.hash(mi * 7.7) * 352 + Math.sin(t * 0.5 + mi) * 13;
      ctx.globalAlpha = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.9 + mi * 1.7));
      ctx.fillStyle = '#fff6dd';
      ctx.beginPath();
      ctx.arc(mx, my, 1.5 + U.hash(mi * 2.3) * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // мягкая цветокоррекция: тёплый верх, прохладный низ
    var grade = ctx.createLinearGradient(0, 0, 0, 720);
    grade.addColorStop(0, 'rgba(255,196,132,0.06)');
    grade.addColorStop(0.52, 'rgba(0,0,0,0)');
    grade.addColorStop(1, 'rgba(18,26,44,0.13)');
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, 1280, 720);

    // дымка/виньетка
    var vg = ctx.createRadialGradient(640, 380, 240, 640, 380, 760);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(35,20,10,0.12)');
    vg.addColorStop(1, 'rgba(35,20,10,0.36)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1280, 720);
  };

  /* --- реквизит стола --- */
  art.has = function (id) {
    try { return !!(PVZ.state && PVZ.state.owns && PVZ.state.owns(id)); } catch (e) { return false; }
  };
  art.level = function (id) {
    try {
      if (PVZ.state && PVZ.state.level) return PVZ.state.level(id);
      return art.has(id) ? 1 : 0;
    } catch (e) { return 0; }
  };

  /* Ноутбук сотрудника: экран + клавиатурная часть, открыт на столе */
  function drawLaptopOpen(ctx, x, y, w, h, env, t) {
    var screenW = w * 0.82, screenH = h * 0.63;
    var sx = x + (w - screenW) / 2, sy = y + 6;
    var baseY = y + h - 62;

    // тень на столе
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.26)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, baseY + 62, w * 0.48, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // петля
    fillRR(ctx, sx + 30, baseY - 8, screenW - 60, 14, 6, '#8d949a');

    // корпус экрана
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, sx - 8, sy - 8, screenW + 16, screenH + 20, 10, '#b9c0c5');
    ctx.restore();
    fillRR(ctx, sx, sy, screenW, screenH, 6, '#2b3037');

    // экран ноутбука
    ctx.save();
    rr(ctx, sx + 9, sy + 9, screenW - 18, screenH - 18, 3);
    ctx.clip();
    var sg = ctx.createLinearGradient(sx, sy, sx, sy + screenH);
    sg.addColorStop(0, '#223643');
    sg.addColorStop(1, '#152029');
    ctx.fillStyle = sg;
    ctx.fillRect(sx + 9, sy + 9, screenW - 18, screenH - 18);

    var app = env.laptopApp || 'home';
    // верхняя строка с временем — часы переехали сюда
    ctx.fillStyle = 'rgba(120,200,180,0.16)';
    ctx.fillRect(sx + 9, sy + 9, screenW - 18, 24);
    var scrName = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';
    var scrFit = fitTxt(ctx, scrName, 118, 10, 800, 7);
    txt(ctx, scrFit.text, sx + 18, sy + 26, scrFit.size, '#9fd6c6', 800);
    txt(ctx, U.fmtTime(env.clock || 480), sx + screenW - 18, sy + 26, 11, '#eafff8', 800, 'right');
    if (app === 'terminal') {
      txt(ctx, 'ТЕРМИНАЛ СМЕНЫ', sx + 22, sy + 54, 12, '#9fd6c6', 800);
      txt(ctx, 'смена: ' + (env.shiftOpen ? 'открыта' : 'закрыта'), sx + 22, sy + 76, 11, env.shiftOpen ? '#8fe0a8' : '#ffb27a', 700);
      txt(ctx, 'заказов на складе: ' + (env.storedCount || 0), sx + 22, sy + 96, 10, 'rgba(200,230,220,0.75)', 600);
      txt(ctx, 'план: ' + (env.planDone || 0) + '/' + (env.plan || 0), sx + 22, sy + 114, 10, 'rgba(200,230,220,0.75)', 600);
      txt(ctx, 'ENTER — открыть', sx + screenW - 18, sy + 134, 9, 'rgba(160,220,200,0.6)', 600, 'right');
    } else if (app === 'shop') {
      txt(ctx, 'МАРКЕТ ПВЗ', sx + 22, sy + 54, 12, '#ffd479', 800);
      txt(ctx, 'улучшения и декор', sx + 22, sy + 74, 10, 'rgba(255,240,210,0.7)', 600);
      txt(ctx, 'баланс: ' + U.fmtMoney(env.money || 0), sx + 22, sy + 100, 11, '#fff3e2', 700);
      txt(ctx, 'ENTER — открыть', sx + screenW - 18, sy + 134, 9, 'rgba(255,220,160,0.6)', 600, 'right');
    } else if (app === 'game') {
      txt(ctx, 'МИНИ-ИГРА «ПОСЫЛКИ»', sx + 22, sy + 54, 11, '#9fd6c6', 800);
      for (var b = 0; b < 3; b++) drawParcel(ctx, sx + 26 + b * 44, sy + 70, 34, 30, { seed: b + 1, shadow: false });
      txt(ctx, 'рекорд: ' + (env.bestScore || 0), sx + 22, sy + 128, 10, 'rgba(200,230,220,0.75)', 600);
      txt(ctx, 'ENTER — играть', sx + screenW - 18, sy + 134, 9, 'rgba(160,220,200,0.6)', 600, 'right');
    } else {
      // рабочий стол с ярлыками установленных приложений
      txt(ctx, 'РАБОЧИЙ СТОЛ', sx + 22, sy + 54, 11, '#cfe9e2', 800);
      var icons = null;
      try {
        if (PVZ.apps && PVZ.apps.desktopApps) {
          icons = PVZ.apps.desktopApps().slice(0, 4).map(function (a) {
            return { label: a.short || a.name, color: a.color, glyph: a.glyph, id: a.id };
          });
        }
      } catch (e) { icons = null; }
      if (!icons || !icons.length) {
        icons = [{ label: 'App Market', color: '#2fb894', glyph: '▦', id: 'appstore' }];
      }
      icons.forEach(function (ic, i) {
        var iw = 36, ih = 34, ix = sx + 26 + i * 47, iy = sy + 66;
        fillRR(ctx, ix, iy, iw, ih, 7, ic.color);
        var gl = ctx.createLinearGradient(ix, iy, ix, iy + ih);
        gl.addColorStop(0, 'rgba(255,255,255,0.24)');
        gl.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        gl.addColorStop(1, 'rgba(0,0,0,0.18)');
        fillRR(ctx, ix + 1, iy + 1, iw - 2, ih - 2, 6, gl);
        txt(ctx, ic.glyph, ix + iw / 2, iy + 23, 15, '#ffffff', 800, 'center');
        var fit = fitTxt(ctx, ic.label, 46, 7, 700, 5);
        txt(ctx, fit.text, ix + iw / 2, iy + 48, fit.size, 'rgba(225,242,238,0.82)', 700, 'center');
        if (ic.id === 'reviews' && env.reviewsFresh) {
          ctx.beginPath();
          ctx.arc(ix + iw - 4, iy + 4, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#e4572e';
          ctx.fill();
          txt(ctx, String(Math.min(9, env.reviewsFresh)), ix + iw - 4, iy + 7, 7, '#fff', 800, 'center');
        }
        if (ic.id === 'appstore') {
          var miss = 0;
          try { miss = PVZ.apps.missingCore().length; } catch (e2) { miss = 0; }
          if (miss) {
            ctx.beginPath();
            ctx.arc(ix + iw - 4, iy + 4, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#e4572e';
            ctx.fill();
            txt(ctx, String(miss), ix + iw - 4, iy + 7, 7, '#fff', 800, 'center');
          }
        }
      });
      var hint = 'App Market — установить приложения';
      try { if (PVZ.apps && PVZ.apps.coreReady && PVZ.apps.coreReady()) hint = 'Все приложения для смены готовы'; } catch (e3) { /* ignore */ }
      var hf = fitTxt(ctx, hint, screenW - 40, 8, 600, 6);
      txt(ctx, hf.text, sx + 22, sy + 148, hf.size, 'rgba(200,230,220,0.55)', 600);
    }

    // лёгкие сканлайны и блик — экран выглядит стеклянным
    ctx.fillStyle = 'rgba(255,255,255,0.022)';
    for (var sl = 0; sl < 14; sl++) ctx.fillRect(sx + 9, sy + 12 + sl * 11, screenW - 18, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(sx + 9, sy + 9); ctx.lineTo(sx + screenW * 0.5, sy + 9); ctx.lineTo(sx + 9, sy + screenH * 0.7); ctx.closePath();
    ctx.fill();
    var glow = 0.10 + Math.sin(t * 1.6) * 0.02;
    ctx.fillStyle = 'rgba(120,220,200,' + glow + ')';
    ctx.fillRect(sx + 9, sy + 9, screenW - 18, screenH - 18);
    ctx.restore();

    // камера
    ctx.beginPath();
    ctx.arc(x + w / 2, sy + 4, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#4a5560';
    ctx.fill();

    // клавиатурная часть
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.moveTo(x - 8, baseY);
    ctx.lineTo(x + w + 8, baseY);
    ctx.lineTo(x + w + 20, baseY + 34);
    ctx.lineTo(x - 20, baseY + 34);
    ctx.closePath();
    ctx.fillStyle = '#c3cace';
    ctx.fill();
    ctx.restore();
    // клавиши
    ctx.fillStyle = '#5b646b';
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 12; c++) {
        var kw = (w - 16) / 12;
        ctx.fillRect(x + 8 + c * kw + 1, baseY + 6 + r * 8, kw - 3, 6);
      }
    }
    // тачпад
    fillRR(ctx, x + w / 2 - 26, baseY + 20, 52, 10, 3, '#aeb6bb');
  }
  art.drawLaptopOpen = drawLaptopOpen;

  function drawFigurines(ctx, x, y, t, catLevel) {
    if (catLevel) drawFigurineCat(ctx, x, y + 8, 52, t, catLevel);
    drawFigurineBot(ctx, x + (catLevel ? 56 : 6), y + 18, 44, t);
  }

  function drawDeskPlant(ctx, x, y, w, t, level) {
    level = level || 1;
    var pot = level >= 3 ? '#d4a63c' : level === 2 ? '#b9c6d0' : '#d08a5a';
    var potEdge = level >= 3 ? '#a97c1e' : level === 2 ? '#8493a1' : '#a5593a';
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + w * 0.95, w * 0.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // кашпо
    ctx.beginPath();
    ctx.moveTo(x + w * 0.26, y + w * 0.58);
    ctx.lineTo(x + w * 0.74, y + w * 0.58);
    ctx.lineTo(x + w * 0.64, y + w * 0.94);
    ctx.lineTo(x + w * 0.36, y + w * 0.94);
    ctx.closePath();
    ctx.fillStyle = pot;
    ctx.fill();
    ctx.strokeStyle = potEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    // металлический ободок
    if (level >= 2) {
      ctx.fillStyle = level >= 3 ? '#ffe9a8' : '#eef6fa';
      ctx.fillRect(x + w * 0.27, y + w * 0.58, w * 0.46, 3);
    }
    // листья
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + (i - 2.5) * 0.42 + Math.sin(t * 0.8 + i) * 0.03;
      ctx.save();
      ctx.translate(x + w / 2, y + w * 0.56);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -w * 0.26, w * 0.12, w * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = (level >= 3 ? ['#6fbf7a', '#57a862', '#83cf8d'] : level === 2 ? ['#6fb89a', '#5aa383', '#82c7ab'] : ['#5fa36b', '#4f9159', '#6cb077'])[i % 3];
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawDeskLamp(ctx, x, y, t, level) {
    level = level || 1;
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 34, y + 132, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // основание и стойка
    fillRR(ctx, x + 12, y + 124, 46, 10, 5, '#5a6068');
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 34, y + 124);
    ctx.lineTo(x + 34, y + 66);
    ctx.stroke();
    // абажур
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 66);
    ctx.lineTo(x + 62, y + 66);
    ctx.lineTo(x + 50, y + 34);
    ctx.lineTo(x + 18, y + 34);
    ctx.closePath();
    ctx.fillStyle = level >= 3 ? '#ffd45e' : level === 2 ? '#e6edf1' : '#e8b96a';
    ctx.fill();
    ctx.strokeStyle = level >= 3 ? '#b8860b' : level === 2 ? '#8b98a4' : '#b98a44';
    ctx.lineWidth = 2;
    ctx.stroke();
    // тёплый свет
    ctx.save();
    ctx.globalAlpha = (level >= 3 ? 0.2 : level === 2 ? 0.15 : 0.10) + Math.sin(t * 1.3) * 0.02;
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 66);
    ctx.lineTo(x + 58, y + 66);
    ctx.lineTo(x + 100, y + 150);
    ctx.lineTo(x - 32, y + 150);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawMoodBadge(ctx, x, y, r, person, mood, t) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30,22,18,0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,180,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(ctx, mood, x, y + r * 0.35, r * 1.05, '#ffd8a8', 700, 'center');
    ctx.restore();
  }
  art.drawMoodBadge = drawMoodBadge;

  function drawCashRegister(ctx, r, done) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.24)';
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h + 4, r.w * 0.55, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    fillRR(ctx, r.x, r.y, r.w, r.h, 10, '#4a5560');
    fillRR(ctx, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 6, '#5c6a76');
    fillRR(ctx, r.x + 18, r.y + 16, r.w - 36, 20, 4, done ? '#8fc98f' : '#c9d18f');
    txt(ctx, done ? 'СВЕРЕНО' : 'КАССА', r.x + r.w / 2, r.y + 62, 13, '#eafff4', 800, 'center');
  }
  art.drawCashRegister = drawCashRegister;

  function drawPrinter(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    fillRR(ctx, x, y, w, h, 8, '#e7e2d6');
    ctx.restore();
    fillRR(ctx, x + 6, y + 6, w - 12, h * 0.4, 5, '#d5cfc1');
    fillRR(ctx, x + 12, y + 12, w - 24, 10, 3, '#b9b2a3');
    // этикетка
    fillRR(ctx, x + 18, y + h - 26, w - 36, 20, 2, '#fffdf6');
    ctx.fillStyle = '#333';
    for (var i = 0; i < 10; i++) ctx.fillRect(x + 22 + i * 4, y + h - 23, i % 3 ? 1 : 2, 12);
    txt(ctx, 'ZEBRA', x + w - 14, y + 22, 10, '#8a8276', 800, 'right');
  }

  function drawScannerGun(ctx, x, y, w, h, env, t) {
    var k = Math.min(1.25, w / 108);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    // рукоять
    ctx.fillStyle = '#3a3f45';
    rr(ctx, 44, 40, 26, 52, 10);
    ctx.fill();
    // корпус
    ctx.fillStyle = '#4b5259';
    rr(ctx, 8, 20, 96, 34, 12);
    ctx.fill();
    ctx.restore();
    // окно сканера
    ctx.fillStyle = env.scanGlow ? 'rgba(255,80,60,0.95)' : 'rgba(255,120,90,0.35)';
    rr(ctx, 14, 28, 22, 18, 4);
    ctx.fill();
    if (env.scanGlow) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,80,50,0.9)';
      ctx.shadowBlur = 26;
      ctx.fillStyle = 'rgba(255,80,50,0.8)';
      rr(ctx, 14, 28, 22, 18, 4);
      ctx.fill();
      ctx.restore();
    }
    // триггер
    ctx.fillStyle = '#e8a33d';
    rr(ctx, 40, 34, 12, 10, 3);
    ctx.fill();
    // кнопки
    ctx.fillStyle = '#6ad39a';
    ctx.beginPath();
    ctx.arc(78, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    txt(ctx, 'СКАНЕР', 56, 96, 11, 'rgba(48,32,20,0.65)', 700, 'center');
    ctx.restore();
  }

  function drawDeskClock(ctx, x, y, size, minutes, tier) {
    tier = typeof tier === 'number' ? tier : (tier ? 1 : 0);
    if (!tier) return;
    var metal = tier >= 3 ? { fill: '#f2c14a', edge: '#b8860b', pale: '#ffe9a8' }
      : tier === 2 ? { fill: '#d6dee4', edge: '#8b98a4', pale: '#f4f8fa' }
        : { fill: '#d9a35b', edge: '#a9713f', pale: '#f6dfb8' };
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 4, size * 0.55, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // корпус и ножки
    ctx.save();
    ctx.fillStyle = metal.edge;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 2, size * 0.2, size * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = metal.fill;
    ctx.fill();
    ctx.strokeStyle = metal.edge;
    ctx.lineWidth = tier >= 2 ? 3.5 : 2.5;
    ctx.stroke();
    // светлый ободок
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 3.5, Math.PI * 0.9, Math.PI * 1.7);
    ctx.strokeStyle = metal.pale;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // кнопка сверху
    ctx.beginPath();
    ctx.arc(x + size / 2, y + 1.5, size * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = metal.edge;
    ctx.fill();
    ctx.restore();
    clockFace(ctx, x + size / 2, y + size / 2, size / 2 - 8, minutes);
    // золотая звёздочка на третьем уровне
    if (tier >= 3) {
      ctx.save();
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin((minutes || 0) * 0.1);
      txt(ctx, '★', x + size - 4, y + 12, 9, '#fff3c4', 800, 'center');
      ctx.restore();
    }
  }

  function drawKeyboard(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + w - 10, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = '#2f3339';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 13; c++) {
        var kw = (w - 30) / 13;
        ctx.fillRect(x + 12 + c * kw + 1, y + 5 + r * ((h - 10) / 3), kw - 3, (h - 10) / 3 - 3);
      }
    }
  }

  function drawMouse(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,28,18,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 46, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    var mg = ctx.createLinearGradient(x, y, x + 36, y + 46);
    mg.addColorStop(0, '#e4e8ea');
    mg.addColorStop(1, '#b9c0c4');
    fillRR(ctx, x, y, 36, 44, 16, mg);
    ctx.strokeStyle = 'rgba(60,70,76,0.35)';
    ctx.lineWidth = 1.6;
    rr(ctx, x, y, 36, 44, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 6);
    ctx.lineTo(x + 18, y + 18);
    ctx.strokeStyle = 'rgba(60,70,76,0.45)';
    ctx.stroke();
    fillRR(ctx, x + 15, y + 10, 6, 12, 3, '#8a949a');
  }

  function drawMug(ctx, x, y, size, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.22)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    fillRR(ctx, x, y, size, size * 0.9, 6, '#e8e4da');
    ctx.restore();
    fillRR(ctx, x + 4, y + 4, size - 8, size * 0.28, 5, '#8a5a36');
    // ручка
    ctx.strokeStyle = '#d8d3c8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x + size, y + size * 0.45, size * 0.28, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // пар
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 3;
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      var px = x + size * 0.35 + i * 18;
      ctx.moveTo(px, y - 6);
      ctx.quadraticCurveTo(px + Math.sin(t * 2 + i) * 10, y - 26, px + 4, y - 44);
      ctx.stroke();
    }
    txt(ctx, 'ПВЗ', x + size / 2, y + size * 0.72, 15, '#8a5a36', 800, 'center');
  }

  function drawPenCup(ctx, x, y, w) {
    fillRR(ctx, x, y, w, w * 1.1, 6, '#b8563f');
    ctx.strokeStyle = '#3a3f45';
    ctx.lineWidth = 4;
    [[8, -26, -0.2], [20, -34, 0.15], [32, -22, 0.35]].forEach(function (p, i) {
      ctx.beginPath();
      ctx.moveTo(x + p[0], y + 4);
      ctx.lineTo(x + p[0] + p[2] * 20, y + p[1]);
      ctx.strokeStyle = ['#3a3f45', '#e8a33d', '#5aa877'][i];
      ctx.stroke();
    });
  }

  function drawFigurineCat(ctx, x, y, size, t, level) {
    level = Math.max(1, Math.min(3, level || 1));
    var pal = [
      { body: '#f0a04b', head: '#f6b168', line: '#c97a2c', base: '#b98a5a', trim: '#fff3d8' },
      { body: '#c6d0d8', head: '#e6edf1', line: '#8b98a4', base: '#aeb9c2', trim: '#ffffff' },
      { body: '#e8b93c', head: '#ffd86a', line: '#b8860b', base: '#c99a2e', trim: '#fff7c9' }
    ][level - 1];
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 3, size * 0.48, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // пьедестал для серебра и золота
    if (level >= 2) {
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.93, size * 0.42, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.base;
      ctx.fill();
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = pal.trim;
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.91, size * 0.3, size * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      // гравировка
      txt(ctx, level === 3 ? '★' : 'II', x + size * 0.5, y + size * 0.945, size * 0.11, pal.line, 800, 'center');
    }
    // тело
    fillRR(ctx, x + 8, y + size * 0.52, size * 0.68, size * 0.4, 10, pal.body);
    // полоски
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = Math.max(1.4, size * 0.035);
    ctx.globalAlpha = 0.55;
    [0.12, 0.24].forEach(function (o) {
      ctx.beginPath();
      ctx.moveTo(x + size * (0.18 + o), y + size * 0.58);
      ctx.quadraticCurveTo(x + size * (0.18 + o), y + size * 0.7, x + size * (0.16 + o), y + size * 0.82);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // голова
    ctx.beginPath();
    ctx.arc(x + size * 0.42, y + size * 0.42, size * 0.27, 0, Math.PI * 2);
    ctx.fillStyle = pal.head;
    ctx.fill();
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    // уши
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.42 + s * size * 0.16, y + size * 0.24);
      ctx.lineTo(x + size * 0.42 + s * size * 0.28, y + size * 0.08);
      ctx.lineTo(x + size * 0.42 + s * size * 0.04, y + size * 0.18);
      ctx.closePath();
      ctx.fillStyle = pal.head;
      ctx.fill();
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // внутреннее ухо
      ctx.beginPath();
      ctx.moveTo(x + size * 0.42 + s * size * 0.15, y + size * 0.22);
      ctx.lineTo(x + size * 0.42 + s * size * 0.24, y + size * 0.12);
      ctx.lineTo(x + size * 0.42 + s * size * 0.2, y + size * 0.19);
      ctx.closePath();
      ctx.fillStyle = level === 2 ? '#f4b8c4' : '#f39a8a';
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // глаза
    var blink = Math.sin(t * 1.7) > 0.92;
    ctx.fillStyle = '#33302c';
    [-1, 1].forEach(function (s) {
      var ex = x + size * 0.42 + s * size * 0.1, ey = y + size * 0.42;
      if (blink) {
        ctx.strokeStyle = '#33302c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ex - size * 0.045, ey);
        ctx.quadraticCurveTo(ex, ey + size * 0.02, ex + size * 0.045, ey);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, size * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex - size * 0.012, ey - size * 0.014, size * 0.015, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.fillStyle = '#33302c';
      }
    });
    // нос и улыбка
    ctx.beginPath();
    ctx.moveTo(x + size * 0.42, y + size * 0.48);
    ctx.lineTo(x + size * 0.4, y + size * 0.5);
    ctx.lineTo(x + size * 0.44, y + size * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#e06a72';
    ctx.fill();
    ctx.strokeStyle = '#6b4a3a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x + size * 0.37, y + size * 0.51, size * 0.05, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.47, y + size * 0.51, size * 0.05, 0.15, Math.PI - 0.15);
    ctx.stroke();
    // усы
    ctx.strokeStyle = 'rgba(80,60,50,0.55)';
    ctx.lineWidth = 1;
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.42 + s * size * 0.06, y + size * 0.5);
      ctx.lineTo(x + size * 0.42 + s * size * 0.22, y + size * 0.46);
      ctx.moveTo(x + size * 0.42 + s * size * 0.06, y + size * 0.52);
      ctx.lineTo(x + size * 0.42 + s * size * 0.22, y + size * 0.55);
      ctx.stroke();
    });
    // корона у золотого
    if (level === 3) {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.3, y + size * 0.16);
      ctx.lineTo(x + size * 0.34, y + size * 0.05);
      ctx.lineTo(x + size * 0.42, y + size * 0.12);
      ctx.lineTo(x + size * 0.5, y + size * 0.04);
      ctx.lineTo(x + size * 0.54, y + size * 0.16);
      ctx.closePath();
      ctx.fillStyle = '#ffd479';
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // ошейник с медальоном у серебряного
    if (level === 2) {
      ctx.strokeStyle = '#6f7f8c';
      ctx.lineWidth = Math.max(1.4, size * 0.03);
      ctx.beginPath();
      ctx.arc(x + size * 0.42, y + size * 0.5, size * 0.23, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + size * 0.42, y + size * 0.58, size * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = '#e6edf1';
      ctx.fill();
    }
    // хвост, машет
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = size * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.72, y + size * 0.82);
    ctx.quadraticCurveTo(x + size * 0.95 + Math.sin(t * 3) * 4, y + size * 0.6, x + size * 0.88, y + size * 0.42);
    ctx.stroke();
    // блеск у золотого
    if (level === 3) {
      for (var si = 0; si < 3; si++) {
        var a = t * 1.6 + si * 2.1;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 3 + si);
        ctx.fillStyle = '#fff7c9';
        ctx.beginPath();
        ctx.arc(x + size * (0.14 + si * 0.36), y + size * (0.3 + Math.sin(a) * 0.1), size * 0.025, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawFigurineBot(ctx, x, y, size, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size - 3, size * 0.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    fillRR(ctx, x + size * 0.2, y + size * 0.42, size * 0.6, size * 0.52, 8, '#7fb3c9');
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.32, size * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#a8d3e0';
    ctx.fill();
    // антенна
    ctx.strokeStyle = '#5f8a99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.06);
    ctx.lineTo(x + size * 0.5, y + size * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.05, size * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#e4572e';
    ctx.fill();
    // глаза
    ctx.fillStyle = '#2a3a42';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(x + size * 0.5 + s * size * 0.09, y + size * 0.3, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });
    // улыбка
    ctx.strokeStyle = '#2a3a42';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.36, size * 0.08, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlant(ctx, x, y, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,25,15,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + w * 0.95, w * 0.42, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // горшок
    ctx.beginPath();
    ctx.moveTo(x + w * 0.24, y + w * 0.62);
    ctx.lineTo(x + w * 0.76, y + w * 0.62);
    ctx.lineTo(x + w * 0.66, y + w * 0.94);
    ctx.lineTo(x + w * 0.34, y + w * 0.94);
    ctx.closePath();
    ctx.fillStyle = '#c9714a';
    ctx.fill();
    ctx.strokeStyle = '#a5593a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // листья
    ctx.fillStyle = '#5fa36b';
    [[-0.3, -0.1], [0.3, -0.12], [0, -0.3], [-0.15, -0.34], [0.18, -0.36]].forEach(function (o, i) {
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5 + o[0] * w, y + w * 0.5 + o[1] * w, w * 0.16, w * 0.28, o[0] * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = ['#5fa36b', '#4f9159', '#6cb077'][i % 3];
      ctx.fill();
    });
    ctx.restore();
  }

  function drawTape(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#e0c489';
    ctx.fill();
    ctx.strokeStyle = '#b99a5f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 5, 0, Math.PI * 2);
    ctx.fillStyle = '#a9713f';
    ctx.fill();
  }

  function drawBell(ctx, x, y, t, ringing) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,15,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 26);
    ctx.quadraticCurveTo(x + 26, y - 8, x + 52, y + 26);
    ctx.closePath();
    ctx.fillStyle = '#e8c46a';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#b8963f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 26);
    ctx.quadraticCurveTo(x + 26, y - 8, x + 52, y + 26);
    ctx.stroke();
    ctx.fillStyle = '#b8963f';
    ctx.beginPath();
    ctx.arc(x + 26, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    if (ringing) {
      ctx.strokeStyle = 'rgba(255,220,120,0.8)';
      ctx.lineWidth = 2;
      for (var i = 0; i < 3; i++) {
        var r = 12 + i * 10 + (t * 40 % 10);
        ctx.beginPath();
        ctx.arc(x + 26, y + 14, r, -2.4, -0.7);
        ctx.stroke();
      }
    }
  }

  /* ---------------- интерьер: зал ---------------- */
  /* Дверная ручка-рычаг: планка, рычаг и винты */
  function drawLeverHandle(ctx, x, y, dir) {
    ctx.save();
    var plate = ctx.createLinearGradient(x - 5, y, x + 5, y + 52);
    plate.addColorStop(0, '#f4f8fa');
    plate.addColorStop(0.4, '#c2cbd1');
    plate.addColorStop(1, '#77828a');
    fillRR(ctx, x - 5, y, 10, 52, 5, plate);
    ctx.strokeStyle = 'rgba(40,48,54,0.45)';
    ctx.lineWidth = 1.2;
    rr(ctx, x - 5, y, 10, 52, 5);
    ctx.stroke();
    var lever = ctx.createLinearGradient(0, y + 6, 0, y + 17);
    lever.addColorStop(0, '#ffffff');
    lever.addColorStop(0.45, '#cbd4d9');
    lever.addColorStop(1, '#7e8990');
    var lx = dir < 0 ? x - 32 : x;
    fillRR(ctx, lx, y + 6, 32, 9, 4.5, lever);
    ctx.strokeStyle = 'rgba(45,52,58,0.5)';
    ctx.lineWidth = 1.1;
    rr(ctx, lx, y + 6, 32, 9, 4.5);
    ctx.stroke();
    // винты
    ctx.fillStyle = 'rgba(70,80,86,0.75)';
    ctx.beginPath(); ctx.arc(x, y + 12, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + 40, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  art.drawHallScene = function (ctx, env) {
    env = env || {};
    var t = env.t || 0;
    var W = 1280, H = 720;
    // потолок
    var cg = ctx.createLinearGradient(0, 0, 0, 90);
    cg.addColorStop(0, '#dfcdb0');
    cg.addColorStop(1, '#ecdfc6');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, 90);
    ctx.fillStyle = 'rgba(120,95,70,0.12)';
    ctx.fillRect(0, 74, W, 14);
    // светильники и световые конусы
    [430, 810].forEach(function (lx) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,240,200,0.9)';
      ctx.shadowBlur = 44;
      fillRR(ctx, lx, 26, 190, 22, 8, '#fff8e6');
      ctx.restore();
      var lg = ctx.createLinearGradient(0, 48, 0, 470);
      lg.addColorStop(0, 'rgba(255,244,214,0.26)');
      lg.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(lx + 20, 48);
      ctx.lineTo(lx + 170, 48);
      ctx.lineTo(lx + 270, 470);
      ctx.lineTo(lx - 80, 470);
      ctx.closePath();
      ctx.fill();
    });
    // задняя стена
    var g = ctx.createLinearGradient(0, 90, 0, 470);
    g.addColorStop(0, '#f3e7d3');
    g.addColorStop(0.7, '#eadcc4');
    g.addColorStop(1, '#ddc9a9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 90, W, 380);
    wallPanels(ctx, 0, 90, W, 380, 214);
    // объём зала: углы и верх стены уходят в тень
    edgeShade(ctx, 0, 90, W, 380, 0.17);
    var hallTop = ctx.createLinearGradient(0, 90, 0, 230);
    hallTop.addColorStop(0, 'rgba(52,34,20,0.22)');
    hallTop.addColorStop(1, 'rgba(52,34,20,0)');
    ctx.fillStyle = hallTop;
    ctx.fillRect(0, 90, W, 140);
    // панель-буазери и плинтус
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(0, 392, W, 3);
    ctx.fillStyle = 'rgba(140,105,74,0.10)';
    ctx.fillRect(0, 395, W, 57);
    ctx.fillStyle = '#c3a37c';
    ctx.fillRect(0, 452, W, 18);
    ctx.fillStyle = 'rgba(90,65,45,0.18)';
    ctx.fillRect(0, 466, W, 5);
    // пол
    var fg = ctx.createLinearGradient(0, 470, 0, 720);
    fg.addColorStop(0, '#d3b78f');
    fg.addColorStop(0.5, '#c6a278');
    fg.addColorStop(1, '#a98a5c');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 470, W, 250);
    // плитка
    ctx.strokeStyle = 'rgba(120,90,60,0.15)';
    ctx.lineWidth = 1.6;
    for (var i = 1; i < 9; i++) {
      var yy = 470 + Math.pow(i / 9, 1.75) * 250;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    }
    for (var j = -9; j <= 9; j++) {
      ctx.beginPath();
      ctx.moveTo(640 + j * 46, 470);
      ctx.lineTo(640 + j * 240, 720);
      ctx.stroke();
    }
    var fgl = ctx.createRadialGradient(640, 580, 40, 640, 580, 330);
    fgl.addColorStop(0, 'rgba(255,248,225,0.20)');
    fgl.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = fgl;
    ctx.fillRect(0, 470, W, 250);
    // пол: тень у стены, блики от ламп и мягкое затемнение к краям
    var floorAO = ctx.createLinearGradient(0, 470, 0, 560);
    floorAO.addColorStop(0, 'rgba(60,38,20,0.30)');
    floorAO.addColorStop(1, 'rgba(60,38,20,0)');
    ctx.fillStyle = floorAO;
    ctx.fillRect(0, 470, W, 96);
    [430, 810].forEach(function (lx) {
      var lg2 = ctx.createRadialGradient(lx + 95, 520, 20, lx + 95, 610, 300);
      lg2.addColorStop(0, 'rgba(255,246,214,0.15)');
      lg2.addColorStop(1, 'rgba(255,246,214,0)');
      ctx.save();
      ctx.translate(lx + 95, 610);
      ctx.scale(1, 0.5);
      ctx.translate(-(lx + 95), -610);
      ctx.fillStyle = lg2;
      ctx.fillRect(lx - 220, 480, 640, 250);
      ctx.restore();
    });
    var floorSide = ctx.createLinearGradient(0, 0, W, 0);
    floorSide.addColorStop(0, 'rgba(50,30,16,0.24)');
    floorSide.addColorStop(0.16, 'rgba(50,30,16,0.03)');
    floorSide.addColorStop(0.5, 'rgba(0,0,0,0)');
    floorSide.addColorStop(0.84, 'rgba(50,30,16,0.03)');
    floorSide.addColorStop(1, 'rgba(50,30,16,0.24)');
    ctx.fillStyle = floorSide;
    ctx.fillRect(0, 470, W, 250);

    // входная дверь
    var d = art.LAYOUT.hall.door;
    ctx.save();
    ctx.shadowColor = 'rgba(50,35,25,0.3)';
    ctx.shadowBlur = 20;
    fillRR(ctx, d.x - 16, d.y - 16, d.w + 32, d.h + 30, 12, '#8d6a4a');
    ctx.restore();
    fillRR(ctx, d.x, d.y, d.w, d.h, 8, env.night ? '#26324a' : '#c8e6ec');
    // улица
    ctx.save();
    rr(ctx, d.x + 8, d.y + 8, d.w - 16, d.h - 16, 4);
    ctx.clip();
    var og = ctx.createLinearGradient(d.x, d.y, d.x, d.y + d.h);
    og.addColorStop(0, env.night ? '#1c2536' : '#d6eef2');
    og.addColorStop(0.6, env.night ? '#2a3a52' : '#a8d3da');
    og.addColorStop(1, env.night ? '#151d2a' : '#8fbfc2');
    ctx.fillStyle = og;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    // дома
    ctx.fillStyle = env.night ? '#10161f' : 'rgba(120,148,150,0.55)';
    ctx.fillRect(d.x + 10, d.y + 120, 70, d.h);
    ctx.fillRect(d.x + 86, d.y + 170, 60, d.h);
    ctx.fillRect(d.x + 150, d.y + 100, 80, d.h);
    for (var wy = 0; wy < 6; wy++) {
      for (var wx = 0; wx < 6; wx++) {
        var lit = U.hash(wx * 13.7 + wy * 7.3 + 4.1) > 0.45;
        ctx.fillStyle = env.night ? (lit ? 'rgba(255,205,110,0.55)' : 'rgba(30,40,55,0.6)') : 'rgba(255,252,235,0.35)';
        if ((wx * 7 + wy * 3) % 5 !== 0) ctx.fillRect(d.x + 18 + wx * 34, d.y + 130 + wy * 42, 14, 20);
      }
    }
    // дерево и машина
    ctx.fillStyle = env.night ? '#16211b' : '#69a176';
    ctx.beginPath(); ctx.arc(d.x + 34, d.y + 300, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = env.night ? '#0f1720' : 'rgba(90,110,120,0.7)';
    ctx.fillRect(d.x + 140, d.y + 320, 96, 34);
    // асфальт
    ctx.fillStyle = env.night ? '#141c26' : '#9fb0b4';
    ctx.fillRect(d.x, d.y + d.h - 110, d.w, 110);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y + d.h - 50);
    ctx.lineTo(d.x + d.w, d.y + d.h - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    // небо: ночью — луна, днём — солнце; без «круга непонятного цвета»
    var skyX = d.x + d.w - 54, skyY = d.y + 58;
    if (env.night) {
      var moonGlow = ctx.createRadialGradient(skyX, skyY, 4, skyX, skyY, 62);
      moonGlow.addColorStop(0, 'rgba(255,246,214,0.55)');
      moonGlow.addColorStop(0.35, 'rgba(255,240,196,0.16)');
      moonGlow.addColorStop(1, 'rgba(255,240,196,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath(); ctx.arc(skyX, skyY, 62, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(skyX, skyY, 17, 0, Math.PI * 2);
      ctx.fillStyle = '#f6ecc9'; ctx.fill();
      ctx.fillStyle = 'rgba(196,182,144,0.55)';
      ctx.beginPath(); ctx.arc(skyX - 5, skyY - 4, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(skyX + 5, skyY + 5, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(skyX + 2, skyY - 7, 2.1, 0, Math.PI * 2); ctx.fill();
      // звёзды
      for (var st = 0; st < 16; st++) {
        var sx2 = d.x + 16 + U.hash(st * 9.3) * (d.w - 32);
        var sy2 = d.y + 14 + U.hash(st * 4.7 + 2) * 120;
        ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + st));
        ctx.fillStyle = '#fff6d8';
        ctx.fillRect(sx2, sy2, 1.8, 1.8);
      }
      ctx.globalAlpha = 1;
    } else {
      var sunGlow = ctx.createRadialGradient(skyX, skyY, 6, skyX, skyY, 56);
      sunGlow.addColorStop(0, 'rgba(255,250,214,0.85)');
      sunGlow.addColorStop(1, 'rgba(255,250,214,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath(); ctx.arc(skyX, skyY, 56, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(skyX, skyY, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#fff3c0'; ctx.fill();
    }
    ctx.restore();
    // рама двери и ручки
    ctx.strokeStyle = '#7d5b3d';
    ctx.lineWidth = 6;
    rr(ctx, d.x + 8, d.y + 8, d.w - 16, d.h - 16, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d.x + d.w / 2, d.y + 8);
    ctx.lineTo(d.x + d.w / 2, d.y + d.h - 8);
    ctx.stroke();
    // металлические ручки-рычаги на обеих створках
    softShadow(ctx, d.x + d.w / 2, d.y + 392, 46, 12, 0.24);
    drawLeverHandle(ctx, d.x + d.w / 2 - 16, d.y + 288, -1);
    drawLeverHandle(ctx, d.x + d.w / 2 + 16, d.y + 288, 1);
    // замок на правой створке
    fillRR(ctx, d.x + d.w / 2 + 11, d.y + 350, 10, 10, 2, '#8a959c');
    ctx.beginPath();
    ctx.arc(d.x + d.w / 2 + 16, d.y + 355, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3a4247'; ctx.fill();
    // фирменная вывеска над входными дверями: цвет и название выбирает игрок
    var brand = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';
    var brandColor = (PVZ.state && PVZ.state.brandColor) ? PVZ.state.brandColor() : P.accent;
    // козырёк в цвет бренда
    ctx.save();
    ctx.shadowColor = 'rgba(50,35,20,0.35)';
    ctx.shadowBlur = 12;
    fillRR(ctx, d.x + 12, d.y - 18, d.w - 24, 22, 8, brandColor);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(d.x + 16, d.y - 16, d.w - 32, 4);
    // табличка с названием
    var nameW = Math.min(d.w - 26, Math.max(180, txtW(ctx, brand, 21, 900) + 46));
    var nameX = d.x + d.w / 2 - nameW / 2;
    var nameY = d.y + 2;
    ctx.save();
    ctx.shadowColor = 'rgba(30,20,12,0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    fillRR(ctx, nameX, nameY, nameW, 42, 8, brandColor);
    ctx.restore();
    strokeRR(ctx, nameX, nameY, nameW, 42, 8, 'rgba(255,248,232,0.55)', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(nameX + 8, nameY + 5, nameW - 16, 3);
    var nameFit = fitTxt(ctx, brand, nameW - 28, 21, 900, 12);
    txt(ctx, nameFit.text, d.x + d.w / 2, nameY + 29, nameFit.size, readableOn(brandColor), 900, 'center');
    // табличка режима работы — на вывеске справа от двери
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,25,0.25)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, d.x + d.w + 18, d.y + 6, 250, 96, 10, '#fff8ea');
    ctx.restore();
    strokeRR(ctx, d.x + d.w + 18, d.y + 6, 250, 96, 10, '#e0c9a4', 2);
    ctx.beginPath();
    ctx.arc(d.x + d.w + 60, d.y + 44, 20, 0, Math.PI * 2);
    ctx.fillStyle = brandColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,232,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(d.x + d.w + 60, d.y + 44);
    ctx.lineTo(d.x + d.w + 60, d.y + 32);
    ctx.moveTo(d.x + d.w + 60, d.y + 44);
    ctx.lineTo(d.x + d.w + 70, d.y + 49);
    ctx.stroke();
    txt(ctx, 'РЕЖИМ РАБОТЫ', d.x + d.w + 92, d.y + 38, 17, P.ink, 800);
    txt(ctx, 'ежедневно 09:00 — 21:00', d.x + d.w + 92, d.y + 60, 12, P.inkSoft, 600);
    txt(ctx, 'выдача заказов · возвраты', d.x + d.w + 92, d.y + 82, 10, 'rgba(90,70,55,0.65)', 600);
    // состояние двери
    if (!env.doorOpen) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,120,80,0.16)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.restore();
      fillRR(ctx, d.x + d.w / 2 - 40, d.y + d.h - 84, 80, 28, 6, '#e4572e');
      txt(ctx, 'ЗАКРЫТО', d.x + d.w / 2, d.y + d.h - 64, 14, '#fff', 800, 'center');
    }
    // коврик у входа
    ctx.save();
    ctx.translate(d.x + d.w / 2, 512);
    ctx.beginPath();
    ctx.moveTo(-124, -18);
    ctx.lineTo(124, -18);
    ctx.lineTo(112, 26);
    ctx.lineTo(-112, 26);
    ctx.closePath();
    ctx.fillStyle = '#7a5c40';
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,28,18,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,225,195,0.25)';
    ctx.lineWidth = 2;
    for (var mi = -100; mi <= 100; mi += 20) {
      ctx.beginPath();
      ctx.moveTo(mi, -14);
      ctx.lineTo(mi - 6, 22);
      ctx.stroke();
    }
    ctx.restore();
    // разметка дистанции на полу
    [[604, 588], [706, 626]].forEach(function (sp) {
      ctx.save();
      ctx.translate(sp[0], sp[1]);
      ctx.scale(1, 0.42);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,248,225,0.65)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,248,225,0.5)';
      ctx.beginPath();
      ctx.ellipse(-8, -6, 5, 10, 0.2, 0, Math.PI * 2);
      ctx.ellipse(9, -2, 5, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // камера под потолком
    ctx.beginPath();
    ctx.arc(120, 96, 15, 0, Math.PI);
    ctx.fillStyle = '#4a5560';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(120, 96, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22282c';
    ctx.fill();

    // примерочная кабинка
    var fr = art.LAYOUT.hall.fitting;
    ctx.save();
    ctx.shadowColor = 'rgba(50,35,25,0.28)';
    ctx.shadowBlur = 16;
    fillRR(ctx, fr.x - 8, fr.y - 10, fr.w + 16, fr.h + 18, 10, '#8d6a4a');
    ctx.restore();
    fillRR(ctx, fr.x, fr.y, fr.w, fr.h, 6, '#6f5744');
    // внутренняя тень
    var fg2 = ctx.createLinearGradient(fr.x, fr.y, fr.x, fr.y + fr.h);
    fg2.addColorStop(0, '#3a2f28');
    fg2.addColorStop(1, '#4d3f34');
    fillRR(ctx, fr.x + 8, fr.y + 8, fr.w - 16, fr.h - 16, 4, fg2);
    // зеркало внутри
    var mg = ctx.createLinearGradient(fr.x + 26, fr.y + 40, fr.x + fr.w - 26, fr.y + fr.h - 80);
    mg.addColorStop(0, 'rgba(205,232,236,0.75)');
    mg.addColorStop(0.5, 'rgba(160,196,204,0.55)');
    mg.addColorStop(1, 'rgba(206,228,232,0.7)');
    fillRR(ctx, fr.x + 24, fr.y + 36, fr.w - 48, fr.h - 110, 4, mg);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(fr.x + 30, fr.y + 42);
    ctx.lineTo(fr.x + 76, fr.y + 42);
    ctx.lineTo(fr.x + 34, fr.y + fr.h - 120);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // штанга и шторка
    ctx.fillStyle = '#c9b48d';
    ctx.fillRect(fr.x + 8, fr.y + 16, fr.w - 16, 7);
    var curtainX = fr.x + 8 + (fr.w - 16) * (env.fittingBusy ? 0.12 : 0.55);
    var grad = ctx.createLinearGradient(curtainX, 0, fr.x + fr.w, 0);
    grad.addColorStop(0, '#c98f7a');
    grad.addColorStop(1, '#a86f5c');
    ctx.fillStyle = grad;
    ctx.fillRect(curtainX, fr.y + 22, fr.x + fr.w - 8 - curtainX, fr.h - 32);
    ctx.strokeStyle = 'rgba(80,45,35,0.25)';
    ctx.lineWidth = 2;
    for (var ccx = curtainX + 10; ccx < fr.x + fr.w - 12; ccx += 14) {
      ctx.beginPath();
      ctx.moveTo(ccx, fr.y + 24);
      ctx.quadraticCurveTo(ccx + 4, fr.y + fr.h * 0.5, ccx, fr.y + fr.h - 12);
      ctx.stroke();
    }
    // табличка
    fillRR(ctx, fr.x + 18, fr.y - 40, fr.w - 36, 28, 6, '#fff8ec');
    strokeRR(ctx, fr.x + 18, fr.y - 40, fr.w - 36, 28, 6, '#dcc7a6', 2);
    txt(ctx, 'ПРИМЕРОЧНАЯ', fr.x + fr.w / 2, fr.y - 20, 12, P.ink, 800, 'center');
    if (env.fittingBusy) {
      fillRR(ctx, fr.x + fr.w - 70, fr.y + 10, 62, 22, 6, 'rgba(90,168,119,0.95)');
      txt(ctx, 'занято', fr.x + fr.w - 39, fr.y + 26, 11, '#0f2a1a', 800, 'center');
    }

    // стопка коробок у стены
    var bx = art.LAYOUT.hall.boxes;
    ctx.save();
    ctx.fillStyle = 'rgba(60,45,32,0.18)';
    ctx.beginPath();
    ctx.ellipse(bx.x + 105, bx.y + 138, 118, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawParcel(ctx, bx.x + 2, bx.y + 52, 100, 70, { seed: 1, rot: -0.02 });
    drawParcel(ctx, bx.x + 106, bx.y + 60, 92, 62, { seed: 4, rot: 0.025 });
    drawParcel(ctx, bx.x + 26, bx.y + 2, 88, 64, { seed: 2, rot: 0.01 });

    // мусорное ведро
    ctx.save();
    ctx.fillStyle = 'rgba(60,45,32,0.16)';
    ctx.beginPath();
    ctx.ellipse(372, 604, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(348, 540);
    ctx.lineTo(396, 540);
    ctx.lineTo(388, 602);
    ctx.lineTo(356, 602);
    ctx.closePath();
    ctx.fillStyle = '#7c8a8f';
    ctx.fill();
    ctx.strokeStyle = '#5d6a6e';
    ctx.lineWidth = 2;
    ctx.stroke();
    fillRR(ctx, 344, 528, 56, 14, 5, '#5d6a6e');

    // стойка со стороны зала
    var cs = art.LAYOUT.hall.counter;
    ctx.save();
    ctx.fillStyle = 'rgba(50,35,22,0.22)';
    ctx.beginPath();
    ctx.ellipse(cs.x + cs.w / 2, 522, cs.w * 0.56, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // корпус
    var cg2 = ctx.createLinearGradient(cs.x, 330, cs.x + cs.w, 520);
    cg2.addColorStop(0, '#b57c47');
    cg2.addColorStop(0.5, '#a9713f');
    cg2.addColorStop(1, '#8a5a34');
    fillRR(ctx, cs.x, 330, cs.w, 190, 6, cg2);
    // кант столешницы
    fillRR(ctx, cs.x - 6, 314, cs.w + 12, 20, 5, P.woodLight);
    ctx.fillStyle = 'rgba(255,225,180,0.25)';
    ctx.fillRect(cs.x - 4, 316, cs.w + 8, 4);
    // вертикальные каннелюры
    ctx.strokeStyle = 'rgba(90,60,35,0.22)';
    ctx.lineWidth = 2;
    for (var ci = 1; ci < 5; ci++) {
      ctx.beginPath();
      ctx.moveTo(cs.x + (cs.w / 5) * ci, 336);
      ctx.lineTo(cs.x + (cs.w / 5) * ci, 512);
      ctx.stroke();
    }
    // табличка выдачи на корпусе стойки
    fillRR(ctx, cs.x + 10, cs.y + 184, cs.w - 20, 34, 6, '#fff8ec');
    strokeRR(ctx, cs.x + 10, cs.y + 184, cs.w - 20, 34, 6, '#dcc7a6', 2);
    txt(ctx, 'ВЫДАЧА ЗАКАЗОВ', cs.x + cs.w / 2, cs.y + 207, 12, P.ink, 800, 'center');
    // монитор с обратной стороны
    ctx.fillStyle = '#2b2b31';
    ctx.fillRect(cs.x + cs.w / 2 - 6, 240, 12, 76);
    fillRR(ctx, cs.x + 26, 176, cs.w - 52, 70, 8, '#33333b');
    fillRR(ctx, cs.x + 32, 182, cs.w - 64, 58, 5, '#2b4a44');
    ctx.fillStyle = 'rgba(120,200,180,0.35)';
    ctx.fillRect(cs.x + 40, 196, cs.w - 80, 6);
    ctx.fillRect(cs.x + 40, 212, cs.w - 100, 5);
    // коробка на стойке
    drawParcel(ctx, cs.x - 46, 262, 66, 54, { seed: 3, rot: 0.04 });

    // лавка (если куплен диванчик — вместо неё рисуется диван ниже)
    var bn = art.LAYOUT.hall.bench;
    if (!art.has('decor_sofa')) {
      ctx.save();
      ctx.fillStyle = 'rgba(50,35,22,0.18)';
      ctx.beginPath();
      ctx.ellipse(bn.x + bn.w / 2, bn.y + 172, bn.w * 0.52, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // спинка
      fillRR(ctx, bn.x + 10, bn.y - 58, bn.w - 20, 62, 8, '#b57c47');
      ctx.strokeStyle = 'rgba(90,60,35,0.25)';
      ctx.lineWidth = 2;
      for (var bi = 1; bi < 4; bi++) {
        ctx.beginPath();
        ctx.moveTo(bn.x + 10 + ((bn.w - 20) / 4) * bi, bn.y - 52);
        ctx.lineTo(bn.x + 10 + ((bn.w - 20) / 4) * bi, bn.y - 2);
        ctx.stroke();
      }
      // сиденье
      fillRR(ctx, bn.x, bn.y + 8, bn.w, 22, 7, P.woodLight);
      ctx.fillStyle = 'rgba(90,60,35,0.2)';
      ctx.fillRect(bn.x, bn.y + 26, bn.w, 5);
      // ножки
      ctx.fillStyle = '#7d5533';
      ctx.fillRect(bn.x + 16, bn.y + 30, 11, 104);
      ctx.fillRect(bn.x + bn.w - 27, bn.y + 30, 11, 104);
    }

    // растение
    drawPlant(ctx, 988, 372, 122);

    // крючки с куртками
    ctx.strokeStyle = '#8a5a36';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(818, 214);
    ctx.lineTo(900, 214);
    ctx.stroke();
    [[832, '#4a5f7a'], [864, '#8a4a4a'], [892, '#5d6a4e']].forEach(function (jk) {
      ctx.strokeStyle = '#b8a27f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(jk[0], 214);
      ctx.lineTo(jk[0], 226);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(jk[0] - 14, 226);
      ctx.lineTo(jk[0] + 14, 226);
      ctx.lineTo(jk[0] + 18, 292);
      ctx.lineTo(jk[0] - 18, 292);
      ctx.closePath();
      ctx.fillStyle = jk[1];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // инфостенд
    fillRR(ctx, 286, 250, 170, 200, 8, '#fff8ec');
    strokeRR(ctx, 286, 250, 170, 200, 8, '#dcc7a6', 3);
    txt(ctx, 'ИНФОРМАЦИЯ', 371, 278, 14, P.ink, 800, 'center');
    for (var k = 0; k < 4; k++) {
      ctx.fillStyle = ['#f2994a', '#5aa877', '#4a86b8', '#e4572e'][k];
      ctx.beginPath();
      ctx.arc(306, 306 + k * 34, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(58,42,33,0.6)';
      ctx.fillRect(322, 300 + k * 34, 110 - k * 12, 6);
      ctx.fillRect(322, 312 + k * 34, 84 - k * 8, 5);
    }

    // выключатель света
    var ls = art.LAYOUT.hall.light;
    fillRR(ctx, ls.x, ls.y, ls.w, ls.h, 8, '#efe6d4');
    strokeRR(ctx, ls.x, ls.y, ls.w, ls.h, 8, '#b8a689', 2);
    fillRR(ctx, ls.x + 11, ls.y + (env.lightsOn === false ? 34 : 8), ls.w - 22, 24, 5,
      env.lightsOn === false ? '#8a8a8a' : '#f2c14a');

    // весы/курьерский стол
    ctx.fillStyle = '#8a5a36';
    ctx.fillRect(910, 600, 120, 12);
    ctx.fillRect(920, 612, 10, 40);
    ctx.fillRect(1010, 612, 10, 40);

    // декор, купленный в магазине
    if (art.has('decor_rug')) {
      var rl = art.level('decor_rug');
      var rugCol = rl >= 3 ? '#a8862e' : rl === 2 ? '#6f7f8c' : '#9a5f5a';
      ctx.save();
      ctx.translate(670, 600);
      ctx.beginPath();
      ctx.moveTo(-220, -30);
      ctx.lineTo(220, -30);
      ctx.lineTo(196, 46);
      ctx.lineTo(-196, 46);
      ctx.closePath();
      ctx.fillStyle = rugCol;
      ctx.fill();
      ctx.strokeStyle = rl >= 2 ? 'rgba(255,245,215,0.6)' : 'rgba(255,220,180,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,180,0.18)';
      ctx.lineWidth = 2;
      for (var rgi = -180; rgi <= 180; rgi += rl >= 3 ? 40 : 60) {
        ctx.beginPath();
        ctx.moveTo(rgi, -22);
        ctx.lineTo(rgi - 14, 38);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (art.has('decor_sofa')) {
      var sofl = art.level('decor_sofa');
      var sofaA = sofl >= 3 ? '#9a7a3a' : sofl === 2 ? '#9aa8b4' : '#6b7a8c';
      var sofaB = sofl >= 3 ? '#b8944a' : sofl === 2 ? '#b4c2cc' : '#7d8d9f';
      var sofaC = sofl >= 3 ? '#82662e' : sofl === 2 ? '#8493a1' : '#5f6e80';
      var sofx = 818, sofy = 430; // sofy — верх подушки сиденья
      var floorY = 548;
      // контактная тень строго под ножками — диван стоит на полу
      ctx.save();
      var sofaShadow = ctx.createRadialGradient(sofx + 100, floorY, 8, sofx + 100, floorY, 140);
      sofaShadow.addColorStop(0, 'rgba(44,28,16,0.34)');
      sofaShadow.addColorStop(0.6, 'rgba(44,28,16,0.16)');
      sofaShadow.addColorStop(1, 'rgba(44,28,16,0)');
      ctx.fillStyle = sofaShadow;
      ctx.beginPath();
      ctx.ellipse(sofx + 100, floorY, 142, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // ножки — до пола
      var legG = ctx.createLinearGradient(0, sofy + 42, 0, floorY);
      legG.addColorStop(0, '#8a5f38');
      legG.addColorStop(1, '#5d3c22');
      [sofx + 14, sofx + 172].forEach(function (lx) {
        fillRR(ctx, lx, sofy + 40, 14, floorY - (sofy + 40) - 2, 3, legG);
      });
      // задняя спинка
      fillRR(ctx, sofx + 4, sofy - 80, 192, 66, 12, sofaA);
      fillRR(ctx, sofx + 16, sofy - 72, 168, 50, 9, sofaB);
      // шов на спинке
      ctx.strokeStyle = 'rgba(30,26,24,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sofx + 100, sofy - 70);
      ctx.lineTo(sofx + 100, sofy - 22);
      ctx.stroke();
      // сиденье
      fillRR(ctx, sofx - 8, sofy - 22, 216, 48, 12, sofaC);
      fillRR(ctx, sofx + 2, sofy - 28, 196, 30, 9, sofaB);
      // передний фартук
      fillRR(ctx, sofx + 4, sofy + 14, 192, 28, 8, sofaC);
      // подлокотники
      fillRR(ctx, sofx - 26, sofy - 58, 30, 86, 13, sofaA);
      fillRR(ctx, sofx + 196, sofy - 58, 30, 86, 13, sofaA);
      // блики на подлокотниках
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      fillRR(ctx, sofx - 22, sofy - 54, 8, 72, 4, 'rgba(255,255,255,0.14)');
      fillRR(ctx, sofx + 200, sofy - 54, 8, 72, 4, 'rgba(255,255,255,0.14)');
      // подушки
      fillRR(ctx, sofx + 20, sofy - 30, 46, 34, 8, sofl >= 3 ? '#e8c46a' : '#d08a6a');
      fillRR(ctx, sofx + 136, sofy - 30, 46, 34, 8, sofl >= 2 ? '#eef6fa' : '#d0a06a');
      // тень от подушек
      ctx.strokeStyle = 'rgba(30,24,20,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sofx + 24, sofy + 2);
      ctx.lineTo(sofx + 62, sofy + 2);
      ctx.moveTo(sofx + 140, sofy + 2);
      ctx.lineTo(sofx + 178, sofy + 2);
      ctx.stroke();
    }
    if (art.has('decor_aquarium')) {
      var aql = art.level('decor_aquarium');
      var aqFt = aql >= 3 ? '#d4a63c' : aql === 2 ? '#9aa8b4' : '#7a5a3a';
      var aqFd = aql >= 3 ? '#eef6fa' : aql === 2 ? '#f4f8fa' : '#a9d3dd';
      var aq = { x: 946, y: 228, w: 148, h: 88 };
      fillRR(ctx, aq.x, aq.y + aq.h, aq.w, 16, 4, aqFt);
      fillRR(ctx, aq.x, aq.y, aq.w, aq.h, 6, 'rgba(150,215,230,0.75)');
      strokeRR(ctx, aq.x, aq.y, aq.w, aq.h, 6, aql >= 2 ? aqFt : '#5d7c8a', aql >= 3 ? 4 : 3);
      ctx.save();
      ctx.beginPath();
      ctx.rect(aq.x + 3, aq.y + 3, aq.w - 6, aq.h - 6);
      ctx.clip();
      ctx.fillStyle = 'rgba(90,170,200,0.35)';
      ctx.fillRect(aq.x, aq.y + 20, aq.w, aq.h);
      // рыбки
      for (var fi = 0; fi < 3; fi++) {
        var fx = aq.x + ((t * (22 + fi * 7) + fi * 50) % (aq.w - 30)) + 12;
        var fy = aq.y + 26 + fi * 20 + Math.sin(t * 2 + fi) * 4;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 9, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = (aql >= 3 ? ['#ffd479', '#ffb347', '#fff0a8'] : ['#f2994a', '#e4572e', '#f2c14a'])[fi % 3];
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx - 9, fy);
        ctx.lineTo(fx - 15, fy - 5);
        ctx.lineTo(fx - 15, fy + 5);
        ctx.closePath();
        ctx.fill();
      }
      // водоросли
      ctx.strokeStyle = '#4f9159';
      ctx.lineWidth = 4;
      for (var wi = 0; wi < 4; wi++) {
        var wx2 = aq.x + 20 + wi * 32;
        ctx.beginPath();
        ctx.moveTo(wx2, aq.y + aq.h - 6);
        ctx.quadraticCurveTo(wx2 + Math.sin(t * 1.4 + wi) * 8, aq.y + aq.h * 0.5, wx2 + 2, aq.y + 30);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (art.has('decor_shelf')) {
      var shl = art.level('decor_shelf');
      var shelfCol = shl >= 3 ? '#c99a2e' : shl === 2 ? '#aeb9c2' : '#a9713f';
      fillRR(ctx, 782, 300, 110, 10, 4, shelfCol);
      fillRR(ctx, 782, 362, 110, 10, 4, shelfCol);
      ctx.fillStyle = shl >= 3 ? '#a97c1e' : shl === 2 ? '#8493a1' : '#7d5533';
      ctx.fillRect(786, 310, 8, 82);
      ctx.fillRect(880, 310, 8, 82);
      drawDeskPlant(ctx, 796, 258, 44, t);
      drawDeskPlant(ctx, 846, 320, 40, t);
    }

    // мягкий тёплый свет и пылинки
    [430, 810].forEach(function (lx) {
      var wg = ctx.createRadialGradient(lx + 95, 40, 6, lx + 95, 40, 330);
      wg.addColorStop(0, 'rgba(255,248,220,0.17)');
      wg.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(lx - 220, 0, 640, 460);
    });
    ctx.save();
    for (var pi = 0; pi < 12; pi++) {
      var px2 = U.hash(pi * 4.7) * 1280;
      var py2 = 100 + U.hash(pi * 9.1) * 330 + Math.sin(t * 0.45 + pi) * 12;
      ctx.globalAlpha = 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.8 + pi * 1.4));
      ctx.fillStyle = '#fff6dd';
      ctx.beginPath();
      ctx.arc(px2, py2, 1.4 + U.hash(pi * 1.9) * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // мягкая цветокоррекция и глубокая виньетка
    var hallGrade = ctx.createLinearGradient(0, 0, 0, H);
    hallGrade.addColorStop(0, 'rgba(255,198,136,0.06)');
    hallGrade.addColorStop(0.5, 'rgba(0,0,0,0)');
    hallGrade.addColorStop(1, 'rgba(18,24,38,0.14)');
    ctx.fillStyle = hallGrade;
    ctx.fillRect(0, 0, W, H);

    // виньетка
    var vg = ctx.createRadialGradient(640, 380, 280, 640, 380, 800);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.68, 'rgba(35,20,10,0.12)');
    vg.addColorStop(1, 'rgba(35,20,10,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  };

  /* ---------------- интерьер: склад ---------------- */
  art.drawWarehouseScene = function (ctx, env) {
    env = env || {};
    var t = env.t || 0;
    var W = 1280, H = 720;
    // стены
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#b7bfc0');
    g.addColorStop(0.5, '#a8b2b3');
    g.addColorStop(1, '#8e999a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // бетонная стена
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var i = 0; i < 6; i++) ctx.fillRect(0, 120 + i * 90, W, 2);
    // потолок и лампы
    ctx.fillStyle = '#7d8a8c';
    ctx.fillRect(0, 0, W, 96);
    [180, 520, 860, 1160].forEach(function (lx) {
      ctx.save();
      ctx.shadowColor = 'rgba(230,255,240,0.8)';
      ctx.shadowBlur = 50;
      fillRR(ctx, lx - 70, 40, 140, 18, 8, '#eafff2');
      ctx.restore();
    });
    // пол
    var fg = ctx.createLinearGradient(0, 470, 0, H);
    fg.addColorStop(0, '#8d9698');
    fg.addColorStop(1, '#6f7a7c');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 470, W, H - 470);
    // разметка
    ctx.strokeStyle = 'rgba(240,210,90,0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 560); ctx.lineTo(W, 560);
    ctx.stroke();
    ctx.setLineDash([26, 20]);
    ctx.beginPath();
    ctx.moveTo(0, 640); ctx.lineTo(W, 640);
    ctx.stroke();
    ctx.setLineDash([]);

    // стеллажи A/B/C
    var racks = [
      { r: art.LAYOUT.warehouse.rackA, name: 'A' },
      { r: art.LAYOUT.warehouse.rackB, name: 'B' },
      { r: art.LAYOUT.warehouse.rackC, name: 'C' }
    ];
    racks.forEach(function (rk) { drawRack(ctx, rk.r, rk.name, env, t); });

    // дверь обратно на стойку
    var bd = art.LAYOUT.warehouse.back;
    ctx.save();
    ctx.shadowColor = 'rgba(30,25,20,0.3)';
    ctx.shadowBlur = 14;
    fillRR(ctx, bd.x - 8, bd.y - 8, bd.w + 16, bd.h + 16, 8, '#6f7d7a');
    ctx.restore();
    fillRR(ctx, bd.x, bd.y, bd.w, bd.h, 6, '#4f6a68');
    fillRR(ctx, bd.x + 8, bd.y + 8, bd.w - 16, bd.h - 16, 4, '#5d7d7a');
    fillRR(ctx, bd.x + 20, bd.y + 20, 120, 34, 6, '#e8f0e8');
    txt(ctx, 'НА СТОЙКУ', bd.x + 80, bd.y + 43, 15, '#2f4a48', 800, 'center');
    // окно в двери
    fillRR(ctx, bd.x + bd.w * 0.35, bd.y + 90, bd.w * 0.3, 90, 8, '#cfe6e2');
    ctx.fillStyle = 'rgba(255,240,200,0.35)';
    ctx.fillRect(bd.x + bd.w * 0.35 + 6, bd.y + 96, bd.w * 0.3 - 12, 78);

    // стол упаковки
    ctx.save();
    ctx.shadowColor = 'rgba(30,25,20,0.25)';
    ctx.shadowBlur = 12;
    fillRR(ctx, 24, 612, 268, 20, 6, P.woodMid);
    ctx.restore();
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(44, 632, 14, 56);
    ctx.fillRect(260, 632, 14, 56);
    // коробки на столе
    drawParcel(ctx, 40, 560, 78, 52, { seed: 1, rot: -0.04 });
    drawParcel(ctx, 122, 570, 68, 42, { seed: 4, rot: 0.03 });
    drawTape(ctx, 200, 568, 40);
    // ролик стретч-плёнки
    ctx.fillStyle = '#dfe6e8';
    ctx.beginPath();
    ctx.arc(250, 578, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#aab4b7';
    ctx.lineWidth = 3;
    ctx.stroke();

    // стремянка у левой стены
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(18, 690); ctx.lineTo(52, 520);
    ctx.moveTo(66, 690); ctx.lineTo(52, 520);
    ctx.stroke();
    for (var s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.moveTo(21 + s * 3, 664 - s * 44);
      ctx.lineTo(66 - s * 3, 664 - s * 44);
      ctx.stroke();
    }

    // зона возвратов
    var rz = art.LAYOUT.warehouse.returns;
    ctx.save();
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = 'rgba(228,87,46,0.75)';
    ctx.lineWidth = 4;
    rr(ctx, rz.x, rz.y, rz.w, rz.h, 10);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(228,87,46,0.10)';
    ctx.fillRect(rz.x, rz.y, rz.w, rz.h);
    fillRR(ctx, rz.x + 12, rz.y - 30, 130, 28, 6, '#e4572e');
    txt(ctx, 'ВОЗВРАТЫ', rz.x + 77, rz.y - 10, 12, '#fff', 800, 'center');
    if (env.returns) {
      drawParcel(ctx, rz.x + 20, rz.y + 56, 92, 68, { seed: 4, rot: -0.03 });
      if (env.returns > 1) drawParcel(ctx, rz.x + 118, rz.y + 60, 80, 60, { seed: 1, rot: 0.02 });
      txt(ctx, env.returns + ' шт.', rz.x + rz.w - 16, rz.y + 26, 13, 'rgba(255,220,200,0.95)', 800, 'right');
    } else {
      txt(ctx, 'пусто', rz.x + rz.w / 2, rz.y + rz.h / 2, 13, 'rgba(255,220,200,0.5)', 600, 'center');
    }

    // виньетка + холодный свет
    var vg = ctx.createRadialGradient(640, 340, 240, 640, 380, 800);
    vg.addColorStop(0, 'rgba(255,255,235,0.06)');
    vg.addColorStop(1, 'rgba(20,25,25,0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  };

  function drawRack(ctx, r, name, env, t) {
    // рама
    ctx.save();
    ctx.shadowColor = 'rgba(30,25,20,0.3)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, r.x, r.y, r.w, r.h, 6, '#5a6a6e');
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
    // полки
    for (var s = 0; s < 3; s++) {
      var sy = r.y + 22 + s * ((r.h - 30) / 3);
      ctx.fillStyle = '#7b8a8d';
      ctx.fillRect(r.x + 8, sy + (r.h - 40) / 3 - 8, r.w - 16, 9);
    }
    // коробки в стеллаже — столько, сколько реально лежит
    var shown = env.counts && env.counts[name] != null ? Math.min(7, Math.max(0, env.counts[name])) : 7;
    for (var i = 0; i < shown; i++) {
      var col = i % 3, row = Math.floor(i / 3);
      if (i === 6) { col = 0; row = 2; }
      var bw = 54 + (i % 3) * 8, bh = 44 + (i % 2) * 12;
      var px = r.x + 18 + col * ((r.w - 30) / 2.6);
      var py = r.y + 34 + row * ((r.h - 30) / 3);
      drawParcel(ctx, px, py, bw, bh, { seed: i + name.charCodeAt(0), shadow: false });
    }
    // табличка с именем
    var hov = env.hoverRack === name;
    fillRR(ctx, r.x + r.w / 2 - 34, r.y - 30, 68, 44, 8, hov ? '#f2994a' : '#e8eef0');
    txt(ctx, name, r.x + r.w / 2, r.y + 2, 30, hov ? '#2a1a10' : '#3c4a4e', 800, 'center');
    if (env.counts && env.counts[name] != null) {
      txt(ctx, env.counts[name] + ' шт.', r.x + r.w / 2, r.y + r.h - 12, 13, 'rgba(255,255,255,0.75)', 700, 'center');
    }
  }

  /* ---------------- телефон покупателя и штрихкод ---------------- */
  art.barcode = function (ctx, x, y, w, h, code) {
    var s = String(code || '0000');
    var seed = 7;
    for (var i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) & 0x7fffffff;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    ctx.save();
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#15110d';
    var cx = x + 5, end = x + w - 5;
    ctx.fillRect(cx, y + 5, 4, h - 10); cx += 9;
    var guard = 0;
    while (cx < end - 12 && guard++ < 200) {
      var bw = 1 + Math.floor(rnd() * 4);
      var gap = 1 + Math.floor(rnd() * 3);
      if (cx + bw > end - 12) break;
      ctx.fillRect(cx, y + 5, bw, h - 10);
      cx += bw + gap;
    }
    ctx.fillRect(end - 8, y + 5, 4, h - 10);
    ctx.restore();
  };

  art.phoneBody = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    var r = Math.min(28, w * 0.16);
    ctx.save();
    ctx.shadowColor = 'rgba(10,6,4,0.45)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, r, opts.body || '#1d1b20');
    ctx.restore();
    // рамка-корпус
    strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, r, 'rgba(255,255,255,0.14)', 2);
    // экран
    var sx = x + w * 0.045, sy = y + h * 0.035, sw = w - w * 0.09, sh = h - h * 0.07;
    var sg = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    sg.addColorStop(0, opts.screenTop || '#f4fbf8');
    sg.addColorStop(1, opts.screenBottom || '#dfeee8');
    fillRR(ctx, sx, sy, sw, sh, r * 0.55, sg);
    // «челка»
    fillRR(ctx, x + w * 0.40, y + h * 0.017, w * 0.2, h * 0.022, h * 0.011, 'rgba(20,18,22,0.85)');
    return { x: sx, y: sy, w: sw, h: sh };
  };

  /* Маленький телефон в руке покупателя */
  art.drawPhoneInHand = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    var sc = art.phoneBody(ctx, x, y, w, h, { body: '#25232a' });
    // фото штрихкода на экране
    var px = sc.x + sc.w * 0.1, py = sc.y + sc.h * 0.16, pw = sc.w * 0.8, ph = sc.h * 0.34;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(px, py, pw, ph);
    art.barcode(ctx, px + 3, py + 3, pw - 6, ph - 6, opts.code);
    ctx.restore();
    // строки «приложения»
    ctx.fillStyle = 'rgba(40,70,60,0.35)';
    ctx.fillRect(sc.x + sc.w * 0.12, py + ph + 10, sc.w * 0.76, 5);
    ctx.fillRect(sc.x + sc.w * 0.12, py + ph + 20, sc.w * 0.5, 4);
    // блик
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(sc.x, sc.y);
    ctx.lineTo(sc.x + sc.w * 0.45, sc.y);
    ctx.lineTo(sc.x, sc.y + sc.h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  /* ---------------- кот на столе ---------------- */
  var CAT_FURS = {
    ginger: { body: '#e8a15a', light: '#f6c48a', dark: '#c97a2c', belly: '#fbe0bd' },
    gray: { body: '#9aa6b0', light: '#c3ccd4', dark: '#6d7a86', belly: '#e6edf1' },
    black: { body: '#454750', light: '#60636d', dark: '#2c2e35', belly: '#747782' },
    white: { body: '#efe9dd', light: '#fffaf0', dark: '#d8cfc0', belly: '#ffffff' },
    /* Premium-пак скинов: открывается в Premium store */
    siam: { body: '#e9dcc4', light: '#fbf3e4', dark: '#6a4a36', belly: '#fffaf0', premium: true },
    tuxedo: { body: '#30323a', light: '#4a4d57', dark: '#191a1f', belly: '#f4f1ea', premium: true },
    calico: { body: '#e8b26a', light: '#f6d3a2', dark: '#8a5a3a', belly: '#fff1dc', premium: true },
    blue: { body: '#8e9aa8', light: '#b3bfcc', dark: '#5f6b78', belly: '#e3e9ef', premium: true }
  };
  art.CAT_FURS = CAT_FURS;
  art.CAT_FUR_LIST = ['ginger', 'gray', 'black', 'white', 'siam', 'tuxedo', 'calico', 'blue'];

  function catHead(ctx, cx, cy, r, pal, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(cx, cy);
    if (opts.tilt) ctx.rotate(opts.tilt);
    // уши
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.92, -r * 0.42);
      ctx.lineTo(s * r * 1.18, -r * 1.2);
      ctx.lineTo(s * r * 0.34, -r * 0.92);
      ctx.closePath();
      ctx.fillStyle = pal.body;
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * r * 0.8, -r * 0.55);
      ctx.lineTo(s * r * 1.03, -r * 1.02);
      ctx.lineTo(s * r * 0.46, -r * 0.82);
      ctx.closePath();
      ctx.fillStyle = '#e79a95';
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // голова
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.94, 0, 0, Math.PI * 2);
    ctx.fillStyle = pal.light;
    ctx.fill();
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.stroke();
    // полоски
    ctx.strokeStyle = pal.dark;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.86); ctx.lineTo(-r * 0.12, -r * 0.56);
    ctx.moveTo(r * 0.12, -r * 0.86); ctx.lineTo(r * 0.2, -r * 0.56);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // мордочка
    ctx.beginPath();
    ctx.ellipse(0, r * 0.26, r * 0.52, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = pal.belly;
    ctx.fill();
    // глаза
    var blink = opts.blink;
    [-1, 1].forEach(function (s) {
      var ex = s * r * 0.38, ey = -r * 0.08;
      if (opts.closed) {
        ctx.strokeStyle = pal.dark;
        ctx.lineWidth = Math.max(1.2, r * 0.075);
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.16, 0.15, Math.PI - 0.15);
        ctx.stroke();
      } else if (blink) {
        ctx.strokeStyle = pal.dark;
        ctx.lineWidth = Math.max(1.1, r * 0.065);
        ctx.beginPath();
        ctx.moveTo(ex - r * 0.15, ey);
        ctx.quadraticCurveTo(ex, ey + r * 0.05, ex + r * 0.15, ey);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(ex, ey, r * 0.14, r * 0.17, 0, 0, Math.PI * 2);
        ctx.fillStyle = opts.eye || '#6f9a4f';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex, ey, r * 0.055, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#211a16';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex - r * 0.05, ey - r * 0.06, r * 0.035, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      }
    });
    // нос
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(-r * 0.08, r * 0.3);
    ctx.lineTo(r * 0.08, r * 0.3);
    ctx.closePath();
    ctx.fillStyle = '#d9707a';
    ctx.fill();
    // рот
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = Math.max(1, r * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(0, r * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.14, r * 0.4, r * 0.14, 0.1, Math.PI - 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.14, r * 0.4, r * 0.14, 0.1, Math.PI - 0.3);
    ctx.stroke();
    // усы
    ctx.strokeStyle = 'rgba(70,50,40,0.5)';
    ctx.lineWidth = Math.max(0.8, r * 0.035);
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.28, r * 0.26);
      ctx.lineTo(s * r * 0.92, r * 0.12);
      ctx.moveTo(s * r * 0.3, r * 0.34);
      ctx.lineTo(s * r * 0.95, r * 0.38);
      ctx.stroke();
    });
    ctx.restore();
  }

  /* Лежанка кота: мягкая подушка на краю стола */
  function drawCatCushion(ctx, x, y, size) {
    var w = size * 0.62, h = size * 0.15;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8a4a5c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,25,35,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.28, w * 0.84, h * 0.58, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(196,110,128,0.55)';
    ctx.fill();
    // шов по краю
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.94, h * 0.8, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,215,225,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  art.drawCatCushion = drawCatCushion;

  /* Кот на столе: несколько поз и анимаций */
  function drawDeskCat(ctx, x, y, size, t, anim, cat) {
    var pal = CAT_FURS[(cat && cat.fur) || 'ginger'] || CAT_FURS.ginger;
    var s = size;
    var blink = Math.sin(t * 1.6) > 0.955;
    anim = anim || 'sit';
    ctx.save();
    ctx.translate(x, y);
    // тень
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.34, s * 0.055, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,25,15,0.22)';
    ctx.fill();

    function tail(sway, up) {
      ctx.save();
      ctx.strokeStyle = pal.body;
      ctx.lineWidth = s * 0.075;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (up) {
        ctx.moveTo(s * 0.18, -s * 0.28);
        ctx.quadraticCurveTo(s * (0.42 + sway * 0.04), -s * 0.58, s * (0.34 + sway * 0.05), -s * 0.9);
      } else {
        ctx.moveTo(s * 0.18, -s * 0.1);
        ctx.quadraticCurveTo(s * (0.48 + sway * 0.04), -s * 0.06, s * (0.44 + sway * 0.06), -s * 0.3);
      }
      ctx.stroke();
      // тёмный кончик
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      if (up) ctx.arc(s * (0.34 + sway * 0.05), -s * 0.9, s * 0.03, 0, Math.PI * 2);
      else ctx.arc(s * (0.44 + sway * 0.06), -s * 0.3, s * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = pal.dark;
      ctx.fill();
      ctx.restore();
    }

    function sitting(closed) {
      tail(Math.sin(t * 1.8), false);
      // тело
      var breathe = 1 + Math.sin(t * 2.1) * 0.012;
      ctx.save();
      ctx.translate(0, -s * 0.3);
      ctx.scale(breathe, 1 / breathe);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.23, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.body;
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1.1, s * 0.025);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, s * 0.04, s * 0.14, s * 0.19, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.belly;
      ctx.fill();
      ctx.restore();
      // передние лапы
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.ellipse(sd * s * 0.1, -s * 0.035, s * 0.055, s * 0.038, 0, 0, Math.PI * 2);
        ctx.fillStyle = pal.light;
        ctx.fill();
        ctx.strokeStyle = pal.dark;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.stroke();
      });
      catHead(ctx, 0, -s * 0.7, s * 0.2, pal, { closed: closed, blink: blink });
    }

    if (anim === 'sleep') {
      // свернулся калачиком
      tail(Math.sin(t * 0.8) * 0.6, false);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.15, s * 0.36, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.body;
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1.1, s * 0.025);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.14, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.belly;
      ctx.fill();
      catHead(ctx, -s * 0.18, -s * 0.27, s * 0.17, pal, { closed: true, tilt: -0.18 });
      // z-z-z
      ctx.save();
      ctx.fillStyle = '#fff3d8';
      ctx.strokeStyle = 'rgba(60,40,30,0.35)';
      ctx.lineWidth = 1;
      for (var zi = 0; zi < 3; zi++) {
        var zt = (t * 0.6 + zi * 0.33) % 1;
        ctx.globalAlpha = (1 - zt) * 0.85;
        txt(ctx, 'z', s * (0.12 + zt * 0.28), -s * (0.55 + zt * 0.4), s * (0.1 + zi * 0.02), '#fff3d8', 800, 'center');
      }
      ctx.restore();
    } else if (anim === 'groom') {
      // умывается: поднимает лапу к мордочке
      tail(Math.sin(t * 2.2) * 0.5, false);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.28, s * 0.22, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.body;
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1.1, s * 0.025);
      ctx.stroke();
      // поднятая лапа
      ctx.strokeStyle = pal.light;
      ctx.lineWidth = s * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.08, -s * 0.25);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.48, s * 0.1, -s * 0.58);
      ctx.stroke();
      // язык
      ctx.fillStyle = '#e88a90';
      ctx.beginPath();
      ctx.ellipse(s * 0.02, -s * 0.56, s * 0.035, s * 0.05, 0.2 + Math.sin(t * 8) * 0.15, 0, Math.PI * 2);
      ctx.fill();
      catHead(ctx, 0, -s * 0.68, s * 0.2, pal, { closed: Math.sin(t * 3) > 0, tilt: 0.12, blink: blink });
    } else if (anim === 'play') {
      // играет с клубочком
      tail(Math.sin(t * 4.2) * 1.2, true);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.18, s * 0.3, s * 0.17, -0.08, 0, Math.PI * 2);
      ctx.fillStyle = pal.body;
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1.1, s * 0.025);
      ctx.stroke();
      // вытянутые лапы
      [-1, 1].forEach(function (sd) {
        ctx.beginPath();
        ctx.ellipse(s * (0.14 + sd * 0.06), -s * 0.05, s * 0.07, s * 0.04, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = pal.light;
        ctx.fill();
      });
      // клубок
      var bx = s * (0.36 + Math.sin(t * 3.4) * 0.05);
      ctx.beginPath();
      ctx.arc(bx, -s * 0.06, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = '#d0577f';
      ctx.fill();
      ctx.strokeStyle = '#9c3f5d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, -s * 0.06, s * 0.045, 0.2, Math.PI * 1.6);
      ctx.stroke();
      catHead(ctx, s * 0.12, -s * 0.42, s * 0.19, pal, { blink: Math.sin(t * 2) > 0.8 });
    } else if (anim === 'happy') {
      // довольный, жмурится — его погладили
      sitting(true);
      // сердечки
      ctx.save();
      for (var hi = 0; hi < 3; hi++) {
        var ht = (t * 0.8 + hi * 0.36) % 1;
        ctx.globalAlpha = (1 - ht) * 0.9;
        var hx = s * (-0.25 + hi * 0.24) + Math.sin(t * 2 + hi) * s * 0.03;
        var hy = -s * (0.85 + ht * 0.5);
        ctx.fillStyle = '#ff8fa8';
        ctx.beginPath();
        ctx.moveTo(hx, hy + s * 0.05);
        ctx.bezierCurveTo(hx - s * 0.08, hy - s * 0.03, hx - s * 0.005, hy - s * 0.08, hx, hy - s * 0.02);
        ctx.bezierCurveTo(hx + s * 0.005, hy - s * 0.08, hx + s * 0.08, hy - s * 0.03, hx, hy + s * 0.05);
        ctx.fill();
      }
      ctx.restore();
    } else {
      sitting(false);
    }
    ctx.restore();
  }
  art.drawDeskCat = drawDeskCat;

  /* ---------------- кинематографичные фоны для пролога ---------------- */
  /* Кабинет мафии: стол, лампа, два силуэта и папка с долгом */
  art.drawNoirOffice = function (ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var W = 1280, H = 720;
    var tension = opts.tension || 0;

    // стены и потолок
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a090b');
    g.addColorStop(0.45, '#171114');
    g.addColorStop(1, '#0b0807');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // панель на стене
    ctx.fillStyle = 'rgba(48,36,30,0.35)';
    ctx.fillRect(0, 300, W, 4);
    for (var i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(30,22,18,0.5)';
      ctx.fillRect(i * 150 + 10, 120, 130, 430);
      ctx.fillStyle = 'rgba(255,225,190,0.025)';
      ctx.fillRect(i * 150 + 10, 120, 4, 430);
    }

    // окна с жалюзи
    [70, 880].forEach(function (wx) {
      ctx.save();
      ctx.fillStyle = '#0d1218';
      ctx.fillRect(wx, 96, 330, 300);
      ctx.strokeStyle = 'rgba(130,150,175,0.16)';
      ctx.lineWidth = 2;
      for (var s = 0; s < 15; s++) {
        ctx.beginPath();
        ctx.moveTo(wx + 6, 104 + s * 19);
        ctx.lineTo(wx + 324, 104 + s * 19);
        ctx.stroke();
        if (s % 2 === 0) {
          ctx.fillStyle = 'rgba(120,140,170,0.05)';
          ctx.fillRect(wx + 6, 104 + s * 19, 318, 9);
        }
      }
      // лунный свет из окна
      var moon = ctx.createLinearGradient(wx, 96, wx + 330, 400);
      moon.addColorStop(0, 'rgba(150,180,220,0.10)');
      moon.addColorStop(1, 'rgba(150,180,220,0)');
      ctx.fillStyle = moon;
      ctx.fillRect(wx, 96, 330, 300);
      ctx.strokeStyle = '#1c232c';
      ctx.lineWidth = 6;
      ctx.strokeRect(wx, 96, 330, 300);
      ctx.restore();
    });

    // свет лампы над столом
    var lampX = 640, lampY = 104;
    var cone = ctx.createLinearGradient(0, lampY, 0, 640);
    cone.addColorStop(0, 'rgba(255,226,170,0.30)');
    cone.addColorStop(1, 'rgba(255,226,170,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lampX - 26, lampY);
    ctx.lineTo(lampX + 26, lampY);
    ctx.lineTo(lampX + 300, 660);
    ctx.lineTo(lampX - 300, 660);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2a2620';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lampX, 0); ctx.lineTo(lampX, lampY - 12); ctx.stroke();
    ctx.fillStyle = '#23201b';
    ctx.beginPath();
    ctx.moveTo(lampX - 52, lampY + 6);
    ctx.lineTo(lampX + 52, lampY + 6);
    ctx.lineTo(lampX + 26, lampY - 16);
    ctx.lineTo(lampX - 26, lampY - 16);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(255,226,170,0.9)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.ellipse(lampX, lampY + 8, 22, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9b8';
    ctx.fill();
    ctx.restore();

    // зловещая красная подсветка из глубины кабинета
    var redBack = ctx.createRadialGradient(800, 430, 40, 800, 430, 520);
    redBack.addColorStop(0, 'rgba(150,26,38,0.32)');
    redBack.addColorStop(0.55, 'rgba(120,18,30,0.12)');
    redBack.addColorStop(1, 'rgba(120,18,30,0)');
    ctx.fillStyle = redBack;
    ctx.fillRect(180, 80, 1100, 640);

    // силуэты: босс за столом и охранник сбоку
    var boss = {
      skin: 1, hair: '#161412', style: 'short', shirt: '#f1e8d9', pants: '#191920',
      coat: '#8e2440', hat: 'fedora', hatColor: '#8e2440', tie: '#141014',
      beard: false, stubble: true, scar: true, cigar: true, evil: true,
      expr: 'angry', build: 1.3, headScale: 0.92
    };
    var goon = {
      skin: 3, hair: '#131110', style: 'bald', shirt: '#22222a', pants: '#17171c',
      coat: '#1e1e26', beard: true, shades: true, scar: true, stubble: true, evil: true,
      expr: 'snarl', build: 1.42, headScale: 0.8
    };
    drawPerson(ctx, boss, 640, 610, 470, { sway: Math.sin(t * 0.7) * 0.012 });
    drawPerson(ctx, goon, 960, 664, 540, { sway: Math.sin(t * 0.9 + 1) * 0.01 });

    // дым от сигары Босса
    var bm = personMetrics(boss, 470);
    var bmx = 640 + bm.headR * 0.86;
    var bmy = 610 - bm.headCY + bm.headR * 0.62;
    ctx.save();
    ctx.strokeStyle = 'rgba(215,210,200,0.16)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (var ds = 0; ds < 3; ds++) {
      var ph = t * 0.7 + ds * 1.9;
      ctx.beginPath();
      ctx.moveTo(bmx, bmy - 4);
      ctx.bezierCurveTo(
        bmx + 20 + Math.sin(ph) * 9, bmy - 60,
        bmx - 24 + Math.cos(ph) * 9, bmy - 130,
        bmx + 8 + Math.sin(ph * 0.7) * 12, bmy - 200 - ds * 26
      );
      ctx.stroke();
    }
    ctx.restore();

    // стол перед фигурами — поднят выше, чтобы кадр не резался кинополосами
    var desk = ctx.createLinearGradient(0, 500, 0, 720);
    desk.addColorStop(0, '#2a1b12');
    desk.addColorStop(0.35, '#1c120c');
    desk.addColorStop(1, '#0f0a07');
    ctx.fillStyle = desk;
    ctx.beginPath();
    ctx.moveTo(-30, 500);
    ctx.lineTo(W + 30, 500);
    ctx.lineTo(W + 80, 720);
    ctx.lineTo(-80, 720);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,170,0.12)';
    ctx.fillRect(-30, 500, W + 60, 3);
    // тень под краем стола
    var deskAO = ctx.createLinearGradient(0, 503, 0, 552);
    deskAO.addColorStop(0, 'rgba(0,0,0,0.55)');
    deskAO.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = deskAO;
    ctx.fillRect(-30, 503, W + 60, 60);

    // папка с долгом
    ctx.save();
    ctx.translate(500, 462);
    ctx.rotate(-0.045);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(6, 8, 214, 88);
    ctx.fillStyle = '#d9c39a';
    ctx.fillRect(0, 0, 214, 88);
    ctx.strokeStyle = '#a98d61';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 214, 88);
    txt(ctx, 'ДОЛГ', 16, 30, 19, '#8b2b1d', 900);
    txt(ctx, opts.debtLabel || '9 350 ₽', 16, 60, 25, '#3a2a21', 900);
    ctx.strokeStyle = 'rgba(139,43,29,0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 40, 160, 26);
    ctx.restore();

    // деньги на столе
    for (var m = 0; m < 3; m++) {
      var mx = 840 + m * 12, my = 512 - m * 9;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      fillRR(ctx, mx + 4, my + 5, 78, 20, 3, 'rgba(0,0,0,0.35)');
      fillRR(ctx, mx, my, 78, 20, 3, '#6d8a5c');
      fillRR(ctx, mx + 4, my + 3, 70, 14, 2, '#8aa877');
      ctx.fillStyle = 'rgba(40,60,35,0.55)';
      ctx.fillRect(mx + 30, my + 7, 16, 6);
    }

    // стакан и бутылка
    ctx.fillStyle = 'rgba(180,210,200,0.18)';
    fillRR(ctx, 1080, 462, 30, 44, 6, 'rgba(180,210,200,0.18)');
    ctx.fillStyle = 'rgba(180,210,200,0.35)';
    ctx.fillRect(1080, 484, 30, 22);
    ctx.fillStyle = '#1c221e';
    fillRR(ctx, 1124, 410, 26, 96, 6, '#1c221e');
    fillRR(ctx, 1132, 396, 10, 22, 3, '#1c221e');

    // дым сигареты
    ctx.save();
    ctx.strokeStyle = 'rgba(210,210,205,0.12)';
    ctx.lineWidth = 3;
    for (var d = 0; d < 3; d++) {
      ctx.beginPath();
      var dx = 700 + d * 10;
      ctx.moveTo(dx, 510);
      ctx.bezierCurveTo(dx + 14, 470, dx - 12, 430, dx + 8, 380 + d * 18);
      ctx.stroke();
    }
    ctx.restore();

    // виньетка и «красное» напряжение
    var vg = ctx.createRadialGradient(640, 340, 200, 640, 380, 820);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(8,4,4,0.25)');
    vg.addColorStop(1, 'rgba(5,2,2,0.85)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    if (tension > 0) {
      var red = ctx.createRadialGradient(640, 420, 180, 640, 420, 720);
      red.addColorStop(0, 'rgba(0,0,0,0)');
      red.addColorStop(1, 'rgba(120,20,12,' + (0.12 + tension * 0.18) + ')');
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, H);
    }
  };

  /* Ночная улица и витрина нового ПВЗ */
  art.drawShopExterior = function (ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var W = 1280, H = 720;
    var lit = opts.lit !== false;

    var sky = ctx.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, '#080d18');
    sky.addColorStop(0.55, '#152033');
    sky.addColorStop(1, '#2a2a36');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 470);

    // звёзды
    for (var s = 0; s < 60; s++) {
      var sx = U.hash(s * 7.7) * W;
      var sy = U.hash(s * 3.1 + 5) * 300;
      ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.2 + s));
      ctx.fillStyle = '#e8f0ff';
      ctx.fillRect(sx, sy, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;

    // луна
    var mg = ctx.createRadialGradient(1080, 110, 6, 1080, 110, 90);
    mg.addColorStop(0, 'rgba(230,238,255,0.45)');
    mg.addColorStop(1, 'rgba(230,238,255,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(1080, 110, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef3ff';
    ctx.beginPath(); ctx.arc(1080, 110, 26, 0, Math.PI * 2); ctx.fill();

    // дальний город
    ctx.fillStyle = '#0b1220';
    for (var b = 0; b < 14; b++) {
      var bx = b * 96 - 20, bh = 90 + U.hash(b * 5.1) * 150;
      ctx.fillRect(bx, 360 - bh, 82, bh);
      for (var wy = 0; wy < 5; wy++) {
        for (var wx = 0; wx < 3; wx++) {
          if (U.hash(b * 31 + wy * 7 + wx * 3) > 0.55) {
            ctx.fillStyle = 'rgba(255,205,120,0.35)';
            ctx.fillRect(bx + 12 + wx * 22, 372 - bh + wy * 26, 9, 12);
            ctx.fillStyle = '#0b1220';
          }
        }
      }
    }

    // фасад дома
    var facade = ctx.createLinearGradient(0, 250, 0, 720);
    facade.addColorStop(0, '#2b2a33');
    facade.addColorStop(0.55, '#22212a');
    facade.addColorStop(1, '#17161d');
    ctx.fillStyle = facade;
    ctx.fillRect(0, 280, W, 440);
    // кирпичная фактура
    ctx.strokeStyle = 'rgba(255,255,255,0.028)';
    ctx.lineWidth = 2;
    for (var ry = 0; ry < 12; ry++) {
      for (var rx = 0; rx < 16; rx++) {
        ctx.strokeRect(rx * 84 + (ry % 2) * 42, 320 + ry * 30, 78, 26);
      }
    }

    // витрина ПВЗ
    var winX = 300, winY = 302, winW = 620, winH = 250;
    ctx.save();
    ctx.shadowColor = lit ? 'rgba(255,196,110,0.55)' : 'rgba(120,140,170,0.25)';
    ctx.shadowBlur = lit ? 46 : 18;
    var winG = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    winG.addColorStop(0, lit ? '#f6d9a4' : '#3a4354');
    winG.addColorStop(0.55, lit ? '#e8b574' : '#2c3444');
    winG.addColorStop(1, lit ? '#a86f3e' : '#1c2430');
    fillRR(ctx, winX, winY, winW, winH, 6, winG);
    ctx.restore();
    // рама витрины
    ctx.strokeStyle = '#4f4034';
    ctx.lineWidth = 10;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,235,205,0.18)';
    ctx.strokeRect(winX + 10, winY + 10, winW - 20, winH - 20);
    // силуэты внутри
    ctx.fillStyle = lit ? 'rgba(90,58,30,0.55)' : 'rgba(10,14,20,0.55)';
    ctx.fillRect(winX + 60, winY + 120, 90, 130);
    ctx.fillRect(winX + 190, winY + 90, 70, 160);
    ctx.fillRect(winX + 330, winY + 130, 120, 120);
    // блик на стекле
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(winX + 30, winY + 20);
    ctx.lineTo(winX + 210, winY + 20);
    ctx.lineTo(winX + 30, winY + 210);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // дверь
    var dx = 950, dy = 330, dw = 120, dh = 220;
    fillRR(ctx, dx - 8, dy - 8, dw + 16, dh + 16, 8, '#3a2f27');
    fillRR(ctx, dx, dy, dw, dh, 5, lit ? '#f0cf9a' : '#33404f');
    ctx.strokeStyle = '#4a3a2d';
    ctx.lineWidth = 5;
    ctx.strokeRect(dx + 4, dy + 4, dw - 8, dh - 8);
    fillRR(ctx, dx + dw - 28, dy + 120, 7, 50, 3.5, '#c9d0d4');
    fillRR(ctx, dx + dw - 28, dy + 152, 24, 7, 3.5, '#c9d0d4');

    // вывеска
    var sx2 = 300, sy2 = 248, sw = 500, sh = 62;
    ctx.save();
    ctx.shadowColor = lit ? 'rgba(242,153,74,0.65)' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = lit ? 30 : 8;
    fillRR(ctx, sx2, sy2, sw, sh, 8, lit ? '#f2994a' : '#3a3a44');
    ctx.restore();
    strokeRR(ctx, sx2, sy2, sw, sh, 8, lit ? '#ffd8a0' : '#4a4a56', 2);
    var extName = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';
    var extFit = fitTxt(ctx, extName, 296, 34, 900, 15);
    txt(ctx, extFit.text, sx2 + 110, sy2 + 43, extFit.size, lit ? '#2a1a10' : 'rgba(230,236,245,0.55)', 900);
    txt(ctx, 'пункт выдачи заказов', sx2 + 320, sy2 + 42, 13, lit ? 'rgba(42,26,16,0.7)' : 'rgba(220,230,240,0.4)', 700);

    // бумажка «аренда» на двери
    ctx.save();
    ctx.translate(dx + 22, dy + 58);
    ctx.rotate(0.05);
    fillRR(ctx, 0, 0, 78, 54, 3, '#fffaf0');
    txt(ctx, 'АРЕНДА', 39, 22, 12, '#8b2b1d', 800, 'center');
    txt(ctx, 'ПВЗ · 14', 39, 38, 9, '#5a4636', 700, 'center');
    ctx.restore();

    // фонарь
    var lpX = 1160;
    ctx.fillStyle = '#1b1f27';
    ctx.fillRect(lpX - 4, 250, 8, 430);
    ctx.fillRect(lpX - 4, 250, 70, 8);
    var lampGlow = ctx.createRadialGradient(lpX + 66, 264, 4, lpX + 66, 264, 220);
    lampGlow.addColorStop(0, 'rgba(255,224,150,0.75)');
    lampGlow.addColorStop(0.35, 'rgba(255,214,130,0.20)');
    lampGlow.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath(); ctx.arc(lpX + 66, 264, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lpX + 66, 264, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9b8'; ctx.fill();

    // мокрый асфальт и отражения
    var road = ctx.createLinearGradient(0, 600, 0, 720);
    road.addColorStop(0, '#1c2029');
    road.addColorStop(1, '#0c0e13');
    ctx.fillStyle = road;
    ctx.fillRect(0, 600, W, 120);
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (var rr2 = 0; rr2 < 8; rr2++) {
      ctx.fillStyle = rr2 % 2 ? '#f2b45e' : 'rgba(160,200,230,0.6)';
      ctx.fillRect(320 + rr2 * 78, 640 + (rr2 % 3) * 18, 20, 3);
    }
    ctx.restore();
    // лужа
    ctx.save();
    ctx.globalAlpha = 0.22;
    var puddle = ctx.createLinearGradient(0, 650, 0, 712);
    puddle.addColorStop(0, 'rgba(255,205,140,0.55)');
    puddle.addColorStop(1, 'rgba(255,205,140,0)');
    ctx.fillStyle = puddle;
    ctx.fillRect(360, 650, 420, 62);
    ctx.restore();

    // герой спиной к нам
    var hero = { skin: 2, hair: '#1c1712', style: 'short', shirt: '#3b4656', pants: '#252c36', coat: '#2e3746' };
    drawPerson(ctx, hero, 190, 700, 360, { silhouette: 'rgba(8,10,14,0.92)', noShadow: true });
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(190, 700, 52, 9, 0, 0, Math.PI * 2); ctx.fill();

    // дождь
    ctx.save();
    ctx.strokeStyle = 'rgba(180,210,240,0.16)';
    ctx.lineWidth = 1.4;
    for (var rn = 0; rn < 70; rn++) {
      var rx2 = (U.hash(rn * 4.3) * 1400 + t * 220) % 1400 - 60;
      var ry2 = (U.hash(rn * 9.7) * 760 + t * 680) % 760;
      ctx.beginPath();
      ctx.moveTo(rx2, ry2);
      ctx.lineTo(rx2 - 5, ry2 + 18);
      ctx.stroke();
    }
    ctx.restore();

    // виньетка
    var vg = ctx.createRadialGradient(640, 380, 260, 640, 380, 820);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.66, 'rgba(4,6,12,0.18)');
    vg.addColorStop(1, 'rgba(2,3,7,0.8)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  };

  /* ---------------- руки, инструменты и сцена вскрытия посылки ---------------- */
  var SLEEVE = '#3f5f7d', SLEEVE_DARK = '#31506c', HAND_SKIN = '#f0c39a';

  /* Рука от нижнего края экрана: игрок «наклоняется» и тянется к коробке */
  function drawArmHand(ctx, fromX, fromY, toX, toY, opt) {
    opt = opt || {};
    var ang = Math.atan2(toY - fromY, toX - fromX) - Math.PI / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = SLEEVE;
    ctx.lineWidth = 46;
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY + 26); ctx.stroke();
    ctx.strokeStyle = SLEEVE_DARK;
    ctx.lineWidth = 50;
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(fromX + (toX - fromX) * 0.4, fromY + (toY - fromY) * 0.4 + 26); ctx.stroke();
    ctx.translate(toX, toY);
    ctx.rotate(ang);
    // манжета
    fillRR(ctx, -25, 14, 50, 24, 9, '#2c4760');
    // ладонь
    ctx.fillStyle = opt.skin || HAND_SKIN;
    ctx.beginPath(); ctx.ellipse(0, -2, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    // большой палец
    ctx.beginPath(); ctx.ellipse(-21, -5, 10, 15, -0.45, 0, Math.PI * 2); ctx.fill();
    // пальцы
    ctx.strokeStyle = opt.skin || HAND_SKIN;
    ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (var fi = 0; fi < 3; fi++) {
      ctx.beginPath();
      ctx.moveTo(8, -16 + fi * 11);
      ctx.lineTo(24, -19 + fi * 11);
      ctx.stroke();
    }
    ctx.restore();
  }
  art.drawArmHand = drawArmHand;

  function drawKnifeTool(ctx, x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.scale(scale || 1, scale || 1);
    // лезвие
    ctx.fillStyle = '#dbe1e4';
    ctx.beginPath();
    ctx.moveTo(-12, -5); ctx.lineTo(-108, -13); ctx.lineTo(-108, 5); ctx.lineTo(-12, 9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#aab4ba'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-108, 3); ctx.lineTo(-16, 7); ctx.stroke();
    // лезвие-«щёчка»
    ctx.fillStyle = '#c3cbd0';
    ctx.beginPath(); ctx.moveTo(-108, -13); ctx.lineTo(-78, -18); ctx.lineTo(-40, -9); ctx.lineTo(-108, -4); ctx.closePath(); ctx.fill();
    // обойма
    ctx.fillStyle = '#c9a227';
    fillRR(ctx, -20, -12, 24, 24, 5);
    // корпус
    ctx.fillStyle = '#3c444c';
    fillRR(ctx, 4, -15, 74, 30, 8);
    ctx.fillStyle = '#2b3137';
    fillRR(ctx, 10, -9, 10, 7, 2);
    ctx.fillStyle = '#e4572e';
    fillRR(ctx, 30, -5, 30, 7, 3);
    ctx.restore();
  }
  art.drawKnifeTool = drawKnifeTool;

  function drawScissorsTool(ctx, x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.scale(scale || 1, scale || 1);
    ctx.lineCap = 'round';
    // лезвия
    ctx.strokeStyle = '#c3cbd0'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(-86, -24); ctx.lineTo(14, 6); ctx.stroke();
    ctx.strokeStyle = '#aab4ba'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(-86, 24); ctx.lineTo(14, -6); ctx.stroke();
    // винт
    ctx.fillStyle = '#8f9aa1';
    ctx.beginPath(); ctx.arc(2, 0, 6, 0, Math.PI * 2); ctx.fill();
    // кольца
    ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(46, -20, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(46, 20, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  art.drawScissorsTool = drawScissorsTool;

  function drawCarryBox(ctx, held, t) {
    var bob = Math.sin(t * 3.2) * 3;
    var bx = 548, by = 426 + bob, bw = 184, bh = 150;
    var holdY = by + bh * 0.62;
    softShadow(ctx, 640, 690, 110, 13, 0.28);
    drawArmHand(ctx, 438, 790, bx - 4, holdY);
    drawArmHand(ctx, 842, 790, bx + bw + 4, holdY);
    drawParcel(ctx, bx, by, bw, bh, { seed: 3, rot: -0.02, code: held.code });
    // ладони поверх боковых граней: коробку действительно держат
    ctx.save();
    ctx.fillStyle = HAND_SKIN;
    ctx.beginPath(); ctx.ellipse(bx + 1, holdY, 22, 27, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx + bw - 1, holdY, 22, 27, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,50,0.25)';
    ctx.lineWidth = 2;
    for (var cf = 0; cf < 3; cf++) {
      ctx.beginPath();
      ctx.moveTo(bx + 7, holdY - 10 + cf * 9); ctx.lineTo(bx + 20, holdY - 9 + cf * 9);
      ctx.moveTo(bx + bw - 7, holdY - 10 + cf * 9); ctx.lineTo(bx + bw - 20, holdY - 9 + cf * 9);
      ctx.stroke();
    }
    ctx.restore();
    if (held.scanned) {
      ctx.save();
      ctx.shadowColor = 'rgba(90,200,140,0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(bx + bw - 12, by + 12, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#5aa877'; ctx.fill();
      ctx.restore();
    }
  }

  function drawHandsCradle(ctx, x, y, w, t) {
    var bob = Math.sin(t * 2.4) * 2;
    drawArmHand(ctx, x - 30, 790, x + 6, y + bob);
    drawArmHand(ctx, x + w + 30, 790, x + w - 6, y + bob);
  }

  /* Сцена вскрытия: крупный план коробки на столе, руки с ножом и ножницами.
     Состояние u готовит сцена смены, здесь — только отрисовка. */
  art.drawUnpackScene = function (ctx, u) {
    u = u || {};
    var t = u.t || 0;
    var phase = u.phase || 'lean';
    var lean = U.clamp(u.lean || 0, 0, 1);
    var open = U.clamp(u.open || 0, 0, 1);
    var bagT = U.clamp(u.bagShow == null ? 1 : u.bagShow, 0, 1);
    var bagCut = U.clamp((u.snips || 0) / 3, 0, 1);
    var progress = U.clamp(u.progress || 0, 0, 1);

    // фон: тёплый крупный план столешницы
    var bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, '#2c1d13');
    bg.addColorStop(0.45, '#412b1b');
    bg.addColorStop(1, '#241710');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1280, 720);
    // древесные волокна
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#1b1009';
    for (var wi = 0; wi < 16; wi++) {
      ctx.lineWidth = 1 + (wi % 3);
      ctx.beginPath();
      var wy = 60 + wi * 44;
      ctx.moveTo(0, wy);
      ctx.bezierCurveTo(360, wy + 9, 900, wy - 7, 1280, wy + 4);
      ctx.stroke();
    }
    ctx.restore();
    // свет сверху
    var sp = ctx.createRadialGradient(640, 330, 40, 640, 380, 620);
    sp.addColorStop(0, 'rgba(255,226,180,0.3)');
    sp.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = sp;
    ctx.fillRect(0, 0, 1280, 720);

    // коробка с наклоном игрока
    ctx.save();
    ctx.translate(640, 480);
    ctx.scale(1 + 0.14 * lean, 1 + 0.14 * lean);
    ctx.rotate(-0.012 * lean);
    ctx.translate(-640, -480 - 26 * lean);

    // тень под коробкой
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#120b06';
    ctx.beginPath();
    ctx.ellipse(640, 604, 300, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // передняя грань
    var fg = ctx.createLinearGradient(0, 380, 0, 600);
    fg.addColorStop(0, '#d4ac72');
    fg.addColorStop(0.55, '#c69c62');
    fg.addColorStop(1, '#a67f4c');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(350, 372); ctx.lineTo(890, 372); ctx.lineTo(872, 600); ctx.lineTo(368, 600);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(74,48,24,0.55)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // скотч по центру передней грани
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ecd9ab';
    ctx.beginPath();
    ctx.moveTo(624, 372); ctx.lineTo(664, 372); ctx.lineTo(660, 600); ctx.lineTo(628, 600);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // наклейка с кодом
    ctx.save();
    ctx.translate(716, 470);
    ctx.rotate(-0.02);
    fillRR(ctx, 0, 0, 132, 82, 6, '#fffdf6');
    ctx.fillStyle = '#2a2a2a';
    for (var bi = 0; bi < 34; bi++) {
      ctx.fillRect(10 + bi * 3.2, 8, bi % 3 === 0 ? 2 : 1, 22);
    }
    txt(ctx, 'ПВЗ · ' + (u.code || '----'), 12, 48, 12, '#2a2a2a', 800);
    txt(ctx, 'ХРУПКОЕ', 12, 66, 10, '#8a5a30', 700);
    ctx.restore();
    // рёбра жёсткости
    ctx.strokeStyle = 'rgba(90,60,30,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(368, 500); ctx.lineTo(872, 500); ctx.stroke();

    // открытая коробка: тёмное нутро
    if (open > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, open * 2);
      ctx.fillStyle = '#2a1a0f';
      ctx.beginPath();
      ctx.moveTo(350, 372); ctx.lineTo(890, 372); ctx.lineTo(842, 318); ctx.lineTo(398, 318);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // дальний клапан (уходит назад)
    ctx.save();
    ctx.translate(0, -46 * open);
    ctx.fillStyle = '#d2ab72';
    ctx.beginPath();
    ctx.moveTo(398, 318); ctx.lineTo(842, 318); ctx.lineTo(788, 258); ctx.lineTo(452, 258);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(74,48,24,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // скотч и линия разреза
    if (open < 0.5) {
      ctx.save();
      ctx.fillStyle = 'rgba(236,217,171,0.78)';
      ctx.beginPath();
      ctx.moveTo(386, 332); ctx.lineTo(854, 332); ctx.lineTo(829, 304); ctx.lineTo(411, 304);
      ctx.closePath(); ctx.fill();
      // прорезанная часть
      if (progress > 0.01) {
        var cutTo = 430 + 420 * progress;
        // тень разреза и светлая кромка картона
        ctx.strokeStyle = 'rgba(30,18,8,0.55)';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(430, 321);
        ctx.quadraticCurveTo(640, 318 + Math.sin(t * 8) * 1.5, cutTo, 321);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(60,38,20,0.95)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(430, 318);
        ctx.quadraticCurveTo(640, 315 + Math.sin(t * 8) * 1.5, cutTo, 318);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,210,0.7)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(430, 312); ctx.lineTo(cutTo, 312);
        ctx.stroke();
      }
      ctx.restore();
    }

    // пакет внутри
    if (open > 0.4 && !(u.product > 0.25)) {
      var ba = U.clamp((open - 0.4) / 0.45, 0, 1) * bagT;
      var lift = 44 * ba;
      ctx.save();
      // пакет лежит внутри коробки: не даём ему «протечь» на переднюю грань
      ctx.beginPath();
      ctx.rect(360, 0, 640, 338);
      ctx.clip();
      ctx.globalAlpha = ba * (u.product > 0.02 ? 0.5 : 0.9);
      ctx.translate(0, -lift);
      // тело пакета
      ctx.fillStyle = 'rgba(222,236,240,0.38)';
      strokeRR(ctx, 512, 214, 256, 150, 26, 'rgba(255,255,255,0.55)', 2.5);
      ctx.fill();
      // содержимое (силуэт товара)
      if (!(u.product > 0.02)) {
        ctx.globalAlpha = ba * 0.5;
        drawCatalogItem(ctx, u.item, u.kind, 552, 234, 176, 120, { shadow: false });
      }
      ctx.globalAlpha = ba * 0.9;
      // горловина
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(560, 220); ctx.lineTo(720, 220); ctx.stroke();
      ctx.fillStyle = 'rgba(200,220,230,0.5)';
      ctx.fillRect(612, 202, 56, 22);
      // разрезы
      if (bagCut > 0.01) {
        ctx.strokeStyle = 'rgba(40,30,20,0.75)';
        ctx.lineWidth = 3;
        var segs = Math.ceil(bagCut * 7);
        ctx.beginPath();
        for (var si = 0; si <= segs; si++) {
          var sx = 560 + (160 / 7) * si;
          var sy = 224 + (si % 2 ? 8 : -6) * bagCut;
          if (si === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ближний клапан поверх пакета: он отогнут к игроку и скрывает низ пакета
    ctx.save();
    ctx.translate(0, 26 * open);
    var lg2 = ctx.createLinearGradient(0, 318, 0, 372);
    lg2.addColorStop(0, '#e2bd86');
    lg2.addColorStop(1, '#cba469');
    ctx.fillStyle = lg2;
    ctx.beginPath();
    ctx.moveTo(398, 318); ctx.lineTo(842, 318); ctx.lineTo(890, 372); ctx.lineTo(350, 372);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(74,48,24,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // товар достают
    if (u.product > 0.01) {
      var pr = U.clamp(u.product, 0, 1);
      var pScale = 1 + 0.08 * Math.sin(t * 3) * (1 - pr);
      var px = 640, py = 308;
      var pw = 286 * pr * pScale, phh = 286 * pr * pScale;
      ctx.save();
      if (phase === 'pull') {
        var pp2 = U.clamp(u.pull || 0, 0, 1);
        px = 640 - 420 * pp2;
        py = 308 + 200 * pp2;
        pw *= (1 - 0.45 * pp2);
        phh *= (1 - 0.45 * pp2);
        ctx.globalAlpha = 1 - pp2 * 0.5;
      }
      // мягкий ореол
      ctx.save();
      ctx.globalAlpha *= 0.5;
      var halo = ctx.createRadialGradient(px, py, 20, px, py, 210);
      halo.addColorStop(0, 'rgba(255,220,150,0.5)');
      halo.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(px - 200, py - 200, 400, 400);
      ctx.restore();
      drawCatalogItem(ctx, u.item, u.kind, px - pw / 2, py - phh / 2, pw, phh, { shadow: true });
      ctx.restore();
    }

    // рука с инструментом — внутри «наклона», чтобы нож шёл точно по скотчу
    if ((phase === 'cut' || phase === 'bagCut') && u.tool) {
      var hx = u.hx == null ? 640 : u.hx;
      var hy = u.hy == null ? 318 : u.hy;
      drawArmHand(ctx, hx + 150, 800, hx, hy);
      if (u.tool === 'knife') drawKnifeTool(ctx, hx - 4, hy, -0.16, 1.05);
      else drawScissorsTool(ctx, hx - 6, hy, 0.1, 1.0);
    }
    ctx.restore(); // конец наклона

    // инструменты на столе
    if (phase === 'knifeIdle') {
      var kp = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save();
      ctx.globalAlpha = 0.35 + kp * 0.4;
      ctx.strokeStyle = '#ffd479';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath(); ctx.ellipse(1000, 470, 118, 66, -0.12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      drawKnifeTool(ctx, 1000, 470, -0.32, 1.25);
      txt(ctx, 'Возьмите нож', 1000, 560, 14, '#ffd479', 800, 'center');
    }
    if (phase === 'scissorsIdle') {
      var scp = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save();
      ctx.globalAlpha = 0.35 + scp * 0.4;
      ctx.strokeStyle = '#ffd479';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.beginPath(); ctx.ellipse(270, 470, 118, 66, 0.14, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      drawScissorsTool(ctx, 270, 470, 0.3, 1.15);
      txt(ctx, 'Возьмите ножницы', 270, 560, 14, '#ffd479', 800, 'center');
    }

    // рука с инструментом
    // (рисуется внутри группы наклона)

    // верхняя панель с шагами
    art.panel(ctx, 372, 18, 536, 92, { bg: 'rgba(16,11,8,0.93)', r: 14, border: 'rgba(255,200,150,0.28)' });
    txt(ctx, 'ВСКРЫТИЕ ПОСЫЛКИ', 640, 42, 15, '#ffc27a', 800, 'center');
    txt(ctx, 'заказ ' + (u.code || '—'), 640, 60, 11.5, 'rgba(255,235,215,0.55)', 700, 'center');
    var steps = ['Нож', 'Пакет', 'Товар'];
    var stepIdx = phase === 'cut' || phase === 'opening' || phase === 'knifeIdle' || phase === 'lean' ? 0
      : phase === 'bagCut' ? 1 : 2;
    for (var st2 = 0; st2 < 3; st2++) {
      var sx2 = 412 + st2 * 152;
      var on = st2 === stepIdx;
      fillRR(ctx, sx2, 70, 136, 26, 13, on ? '#f2994a' : 'rgba(255,255,255,0.08)');
      txt(ctx, (st2 + 1) + ' · ' + steps[st2], sx2 + 68, 88, 11.5, on ? '#2a1a10' : 'rgba(255,240,220,0.6)', 800, 'center');
    }

    // инструкция
    var tip = '';
    if (phase === 'lean') tip = 'Наклонитесь к коробке…';
    else if (phase === 'knifeIdle') tip = 'Возьмите нож со стола — он справа.';
    else if (phase === 'cut') tip = 'Зажмите и проведите ножом по скотчу слева направо.';
    else if (phase === 'opening') tip = 'Коробка вскрыта. Внутри пакет.';
    else if (phase === 'scissorsIdle') tip = 'Теперь возьмите ножницы слева.';
    else if (phase === 'bagCut') tip = 'Разрежьте пакет ножницами: ' + Math.min(3, u.snips || 0) + ' / 3 надреза.';
    else if (phase === 'product') tip = 'Достаньте «' + (u.item || 'товар') + '» — нажмите на него.';
    else if (phase === 'pull') tip = 'Товар у вас в руках.';
    if (tip) {
      var tw = Math.min(900, txtW(ctx, tip, 16, 700) + 56);
      ctx.save();
      ctx.globalAlpha = 0.96;
      art.panel(ctx, 640 - tw / 2, 120, tw, 42, { bg: 'rgba(16,11,8,0.72)', r: 21, border: 'rgba(255,200,150,0.16)' });
      txt(ctx, tip, 640, 147, 16, '#ffe9cd', 700, 'center');
      ctx.restore();
    }

    // прогресс разреза
    if (phase === 'cut' || (phase === 'opening' && progress > 0)) {
      art.bar(ctx, 420, 626, 440, 12, progress, '#f2994a', 'rgba(0,0,0,0.45)');
    }
    if (phase === 'bagCut') {
      art.bar(ctx, 420, 626, 440, 12, (u.snips || 0) / 3, '#7fb4c2', 'rgba(0,0,0,0.45)');
    }

    // закрыть — в левом верхнем углу, чтобы не спорить с кнопками звука и полного экрана
    var closeR = { x: 24, y: 24, w: 44, h: 44 };
    var closeHov = U.hit(closeR, PVZ.input.x, PVZ.input.y);
    fillRR(ctx, closeR.x, closeR.y, closeR.w, closeR.h, 10, closeHov ? 'rgba(242,153,74,0.95)' : 'rgba(16,11,8,0.8)');
    txt(ctx, '✕', closeR.x + 22, closeR.y + 30, 18, closeHov ? '#2a1a10' : 'rgba(255,240,220,0.75)', 800, 'center');

    // виньетка
    var vg = ctx.createRadialGradient(640, 380, 260, 640, 380, 800);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,6,3,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1280, 720);
  };

  /* ---------------- HUD ---------------- */
  /* Компактный HUD для телефона: две-три крупные строки вместо семи мелких панелей. */
  function drawHUDCompact(ctx, o) {
    var W = 1280;
    var phaseNames = { morning: 'УТРО', day: 'ДЕНЬ', evening: 'ВЕЧЕР' };
    var lowRating = o.rating < (o.ratingWarn || 3.5);
    var hudName = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';

    panel(ctx, 16, 12, 1248, 88, {
      bg: lowRating ? 'rgba(84,32,24,0.92)' : 'rgba(24,17,13,0.9)', r: 20,
      border: lowRating ? 'rgba(255,120,90,0.55)' : 'rgba(255,235,210,0.16)'
    });

    // день и место
    txt(ctx, 'ДЕНЬ ' + o.day + (o.winDay ? ' / ' + o.winDay : ''), 36, 52, 26, '#fff3e2', 800);
    if (o.endless) txt(ctx, '∞', 292, 52, 24, '#ffd479', 800, 'right');
    var sub = fitTxt(ctx, (phaseNames[o.phase] || '') + ' · ' + hudName, 250, 17, 700, 12);
    txt(ctx, sub.text, 36, 78, sub.size, 'rgba(255,236,214,0.68)', 700);

    ctx.fillStyle = 'rgba(255,235,210,0.1)';
    [306, 462, 646, 812, 1128].forEach(function (x) { ctx.fillRect(x, 26, 1, 60); });

    // выручка
    txt(ctx, 'ВЫРУЧКА', 322, 38, 14, 'rgba(255,236,214,0.6)', 800);
    txt(ctx, U.fmtMoney(o.revenue || 0), 322, 72, 25, '#ffd479', 800);

    // рейтинг
    txt(ctx, 'РЕЙТИНГ', 478, 38, 14, lowRating ? '#ffb59d' : 'rgba(255,236,214,0.6)', 800);
    stars(ctx, 486, 62, o.rating, 11);
    txt(ctx, o.rating.toFixed(2), 570, 70, 21, lowRating ? '#ffb59d' : '#fff3e2', 800);
    if (lowRating) {
      var pulse = 0.55 + 0.45 * Math.sin((o.t || 0) * 5);
      ctx.save();
      ctx.globalAlpha = pulse;
      txt(ctx, 'риск', 632, 70, 15, '#ffc2a8', 800, 'right');
      ctx.restore();
    }

    // план
    if (o.plan) {
      var pct = Math.min(1, o.plan.done / Math.max(1, o.plan.plan));
      txt(ctx, 'ПЛАН', 662, 38, 14, 'rgba(255,236,214,0.6)', 800);
      txt(ctx, o.plan.done + ' / ' + o.plan.plan, 662, 70, 24, pct >= 1 ? '#8fe0a8' : '#fff3e2', 800);
      bar(ctx, 662, 78, 130, 8, pct, pct >= 1 ? '#5aa877' : '#f2994a', 'rgba(0,0,0,0.4)');
    }

    // событие дня или час пик
    if (o.rush) {
      txt(ctx, 'ЧАС ПИК · ' + Math.ceil(Math.max(0, o.rush.left)) + ' с', 828, 48, 19, '#ffb27a', 900);
      bar(ctx, 828, 62, 280, 12, Math.max(0, o.rush.left / Math.max(1, o.rush.total)), '#ff7a4a', 'rgba(0,0,0,0.45)');
      txt(ctx, 'чаевые +40%', 828, 90, 13, 'rgba(255,225,205,0.72)', 700);
    } else if (o.dayMod) {
      var ev = fitTxt(ctx, (o.dayMod.icon || '☀') + ' ' + String(o.dayMod.label || '').toUpperCase(), 280, 19, 900, 14);
      txt(ctx, ev.text, 828, 46, ev.size, o.dayMod.color || '#9fd6c6', 900);
      txt(ctx, 'событие дня', 828, 86, 13, 'rgba(255,236,214,0.68)', 600);
    }

    // серия
    if (o.streak) {
      txt(ctx, 'СЕРИЯ', 1244, 38, 14, 'rgba(255,236,214,0.6)', 800, 'right');
      txt(ctx, '×' + o.streak, 1244, 70, 24, o.streak >= 5 ? '#ffd479' : '#fff3e2', 800, 'right');
    }

    // карточка покупателя
    if (o.customer) {
      var cc = o.customer;
      panel(ctx, 16, 116, 560, 176, { bg: 'rgba(28,20,16,0.94)', r: 18, border: 'rgba(255,235,210,0.14)' });
      txt(ctx, cc.walking ? 'ПОДХОДИТ · ТАЛОН ' + (cc.talon || '—') : 'У СТОЙКИ · ТАЛОН ' + (cc.talon || '—'),
        36, 142, 14, 'rgba(255,236,214,0.62)', 800);
      var nm = fitTxt(ctx, cc.name || 'Покупатель', 500, 25, 700, 16);
      txt(ctx, nm.text, 36, 176, nm.size, '#fff3e2', 700);
      if (cc.moodLabel) {
        var moodW = txtW(ctx, cc.moodLabel, 17, 700) + 44;
        fillRR(ctx, 36, 188, moodW, 30, 15, 'rgba(242,153,74,0.18)');
        txt(ctx, cc.moodIcon || '🙂', 52, 209, 16, '#ffd8a8', 700, 'center');
        txt(ctx, cc.moodLabel, 66, 209, 17, '#ffd8a8', 700);
      }
      if (cc.parcels > 1) txt(ctx, cc.parcels + ' посылки', 552, 209, 15, '#9fd6c6', 700, 'right');
      if (cc.code) txt(ctx, cc.masked ? 'код ••••' : 'код ' + cc.code, 36, 246, 22, '#ffd479', 800);
      else {
        var kindName = { return: 'возврат', question: 'вопрос', resolve: 'претензия', 'fitting-back': 'из примерочной', late: 'опоздавший', courier: 'курьер', guest: 'гость', shady: 'странный тип' }[cc.kind] || '';
        if (kindName) txt(ctx, kindName, 36, 246, 19, 'rgba(255,236,214,0.7)', 600);
      }
      txt(ctx, 'ТЕРПЕНИЕ', 36, 268, 13, 'rgba(255,236,214,0.68)', 800);
      var pc = cc.patience > 0.6 ? '#5aa877' : cc.patience > 0.3 ? '#f2c14a' : '#e4572e';
      bar(ctx, 140, 261, 416, 13, cc.patience, pc, 'rgba(0,0,0,0.4)');
    }

    // очередь
    if (o.queue) {
      var qy = o.customer ? 302 : 116;
      panel(ctx, 16, qy, 208, 46, { bg: 'rgba(28,20,16,0.82)', r: 16 });
      txt(ctx, 'В ОЧЕРЕДИ: ' + o.queue, 34, qy + 30, 19, '#f7ead8', 700);
    }

    // задачи смены (крупно, справа; в обучении их заменяет панель обучения)
    if (o.objectives && o.objectives.length && !o.tutorial) {
      var ow = 424, oh = 38 + o.objectives.length * 34;
      var ox = W - ow - 16, oy = 116;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      fillRR(ctx, ox, oy, ow, oh, 18, 'rgba(26,18,14,0.97)');
      ctx.restore();
      strokeRR(ctx, ox, oy, ow, oh, 18, 'rgba(255,235,210,0.18)', 1.4);
      txt(ctx, 'ЗАДАЧИ СМЕНЫ', ox + 20, oy + 26, 15, 'rgba(255,236,214,0.68)', 800);
      o.objectives.forEach(function (ob, i) {
        var y = oy + 58 + i * 34;
        ctx.beginPath();
        ctx.arc(ox + 28, y - 6, 9, 0, Math.PI * 2);
        ctx.fillStyle = ob.done ? P.green : 'rgba(255,255,255,0.14)';
        ctx.fill();
        if (ob.done) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ox + 23, y - 6);
          ctx.lineTo(ox + 27, y - 2);
          ctx.lineTo(ox + 34, y - 11);
          ctx.stroke();
        }
        var label = ob.progress && !ob.done ? ob.text + ' · ' + ob.progress : ob.text;
        var ft = fitTxt(ctx, label, ow - 60, 17, 600, 12);
        txt(ctx, ft.text, ox + 48, y, ft.size, ob.done ? 'rgba(180,230,200,0.8)' : '#f7ead8', 600);
      });
    }

    // удерживаемая посылка
    if (o.held && !o.dialog) {
      panel(ctx, 16, 580, 392, 84, { bg: 'rgba(28,20,16,0.9)', r: 16 });
      if (o.held.unpacked) {
        drawCatalogItem(ctx, o.held.item, o.held.kind, 30, 590, 56, 56);
      } else {
        drawParcel(ctx, 32, 592, 54, 50, { seed: 2 });
      }
      txt(ctx, o.held.unpacked ? 'ТОВАР В РУКАХ' : (o.held.onTable ? 'НА СТОЛЕ' : 'В РУКАХ'), 100, 606, 14, 'rgba(255,236,214,0.62)', 800);
      txt(ctx, o.held.code, 100, 634, 23, '#ffd479', 800);
      txt(ctx, o.held.unpacked ? o.held.item : o.held.scanned ? 'вскройте коробку' : (o.held.onTable ? 'нужно сканировать' : 'положите на стол'), 100, 656, 13,
        o.held.unpacked ? '#8fe0a8' : o.held.scanned ? '#ffd479' : '#ffb27a', 600);
    }

    // подсказка
    if (o.hint && !o.dialog) {
      var hw = Math.min(1180, txtW(ctx, o.hint, 18, 600) + 64);
      panel(ctx, (W - hw) / 2, 662, hw, 46, { bg: 'rgba(24,17,13,0.86)', r: 23, border: 'rgba(255,235,210,0.14)' });
      txt(ctx, o.hint, W / 2, 690, 18, '#f6ead9', 600, 'center');
    }
  }

  art.drawHUD = function (ctx, o) {
    if (art.compact) { drawHUDCompact(ctx, o); return; }
    var W = 1280;
    var phaseNames = { morning: 'УТРО', day: 'ДЕНЬ', evening: 'ВЕЧЕР' };

    // день и фаза (часы переехали на рабочий стол и в ноутбук)
    panel(ctx, 20, 16, 236, 84, { bg: 'rgba(28,20,16,0.82)', r: 18, border: 'rgba(255,235,210,0.14)' });
    txt(ctx, 'ДЕНЬ ' + o.day + (o.winDay ? ' / ' + o.winDay : ''), 40, 52, o.winDay && o.day > 9 ? 24 : 27, '#fff3e2', 800);
    if (o.endless) txt(ctx, '∞', 240, 56, 24, '#ffd479', 800, 'right');
    var hudName = (PVZ.state && PVZ.state.title) ? PVZ.state.title() : 'ПВЗ №14';
    var hudNameFit = fitTxt(ctx, (phaseNames[o.phase] || '') + ' · ' + hudName, 200, 12, 700, 8);
    txt(ctx, hudNameFit.text, 40, 78, hudNameFit.size, 'rgba(255,236,214,0.6)', 700);

    // выручка смены + рейтинг; низкий рейтинг подсвечиваем
    var lowRating = o.rating < (o.ratingWarn || 3.5);
    panel(ctx, 272, 16, 292, 84, {
      bg: lowRating ? 'rgba(84,32,24,0.86)' : 'rgba(28,20,16,0.82)',
      r: 18,
      border: lowRating ? 'rgba(255,120,90,0.55)' : 'rgba(255,235,210,0.14)'
    });
    txt(ctx, 'ВЫРУЧКА СМЕНЫ', 292, 40, 10, lowRating ? 'rgba(255,196,170,0.75)' : 'rgba(255,236,214,0.68)', 800);
    txt(ctx, U.fmtMoney(o.revenue || 0), 292, 66, 20, '#ffd479', 800);
    stars(ctx, 292, 84, o.rating, 10);
    txt(ctx, o.rating.toFixed(2), 292 + 5 * 13 + 6, 89, 11, lowRating ? '#ffb59d' : 'rgba(255,240,220,0.85)', 800);
    if (lowRating) {
      var pulse = 0.55 + 0.45 * Math.sin((o.t || 0) * 5);
      ctx.save();
      ctx.globalAlpha = pulse;
      txt(ctx, 'риск закрытия', 546, 40, 10.5, '#ffc2a8', 800, 'right');
      ctx.restore();
    }
    // последние оценки клиентов: видно, куда едет рейтинг и почему
    var rlog = Array.isArray(o.ratingLog) ? o.ratingLog.slice(-5) : [];
    if (rlog.length) {
      rlog.forEach(function (e, i) {
        var sc = e && e.s != null ? e.s : (typeof e === 'number' ? e : 3);
        var col = sc >= 5 ? '#8fe0a8' : sc >= 4 ? '#c8e08a' : sc >= 3 ? '#f2c14a' : '#e4572e';
        ctx.beginPath();
        ctx.arc(408 + i * 13, 86, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });
      var trend = o.ratingTrend || 0;
      if (trend > 0.15) txt(ctx, '▲', 494, 90, 10, '#8fe0a8', 800);
      else if (trend < -0.15) txt(ctx, '▼', 494, 90, 10, '#ff8a5c', 800);
      else txt(ctx, '·', 494, 90, 10, 'rgba(255,236,214,0.4)', 800);
    }

    // план дня
    if (o.plan) {
      var pw = 176;
      panel(ctx, 580, 16, pw, 84, { bg: 'rgba(28,20,16,0.82)', r: 18, border: 'rgba(255,235,210,0.14)' });
      txt(ctx, 'ПЛАН ДНЯ', 600, 40, 10, 'rgba(255,236,214,0.68)', 800);
      var pct = Math.min(1, o.plan.done / Math.max(1, o.plan.plan));
      txt(ctx, o.plan.done + ' / ' + o.plan.plan, 600, 67, 19, pct >= 1 ? '#8fe0a8' : '#fff3e2', 800);
      bar(ctx, 600, 78, pw - 40, 8, pct, pct >= 1 ? '#5aa877' : '#f2994a', 'rgba(0,0,0,0.4)');
    }

    // серия выдач: сколько клиентов подряд обслужено без жалоб
    if (o.streak != null && o.streak > 0) {
      var hot = o.streak >= 5;
      var pulse = 0.5 + 0.5 * Math.sin((o.t || 0) * 4);
      ctx.save();
      if (hot) { ctx.shadowColor = 'rgba(242,153,74,' + (0.3 + pulse * 0.35) + ')'; ctx.shadowBlur = 18; }
      panel(ctx, 772, 16, 178, 84, {
        bg: hot ? 'rgba(64,32,16,0.9)' : 'rgba(28,20,16,0.82)', r: 18,
        border: hot ? 'rgba(255,170,90,' + (0.35 + pulse * 0.35) + ')' : 'rgba(255,235,210,0.14)'
      });
      ctx.restore();
      txt(ctx, 'СЕРИЯ', 790, 40, 10, 'rgba(255,236,214,0.68)', 800);
      txt(ctx, '×' + o.streak, 790, 72, 28, hot ? '#ffd479' : '#fff3e2', 800);
      txt(ctx, o.streak >= 8 ? 'бонус максимальный' : '+' + Math.min(8, o.streak) * 5 + ' ₽ за выдачу',
        858, 64, 10, hot ? 'rgba(255,214,150,0.9)' : 'rgba(255,236,214,0.5)', 700);
      bar(ctx, 858, 74, 74, 7, (o.streak % 5) / 5, hot ? '#f2994a' : '#5aa877', 'rgba(0,0,0,0.4)');
    }

    // событие дня и час пик
    if (o.dayMod || o.rush) {
      var rx = 962, ry = 16, rw = 298, rh = 84;
      var rushOn = !!o.rush;
      ctx.save();
      if (rushOn) { ctx.shadowColor = 'rgba(255,90,50,0.55)'; ctx.shadowBlur = 20; }
      panel(ctx, rx, ry, rw, rh, {
        bg: rushOn ? 'rgba(74,26,16,0.92)' : 'rgba(28,20,16,0.82)', r: 18,
        border: rushOn ? 'rgba(255,120,80,0.6)' : 'rgba(255,235,210,0.14)'
      });
      ctx.restore();
      if (rushOn) {
        txt(ctx, 'ЧАС ПИК', rx + 18, ry + 30, 13, '#ffb27a', 900);
        txt(ctx, 'чаевые +40% · поток ×2', rx + 18, ry + 48, 10, 'rgba(255,225,205,0.7)', 700);
        var left = Math.max(0, o.rush.left);
        txt(ctx, Math.ceil(left) + ' с', rx + rw - 18, ry + 30, 13, '#ffd8c8', 800, 'right');
        bar(ctx, rx + 18, ry + 62, rw - 36, 12, Math.max(0, o.rush.left / Math.max(1, o.rush.total)), '#ff7a4a', 'rgba(0,0,0,0.45)');
        txt(ctx, 'Держите темп!', rx + rw / 2, ry + 80, 9, 'rgba(255,225,205,0.55)', 700, 'center');
      } else if (o.dayMod) {
        txt(ctx, (o.dayMod.icon || '☀') + ' ' + String(o.dayMod.label || '').toUpperCase(), rx + 18, ry + 30, 13, o.dayMod.color || '#9fd6c6', 900);
        var lines = U.wrapLines(ctx, o.dayMod.desc || '', rw - 36, 10.5, 600);
        lines.slice(0, 2).forEach(function (ln, i) {
          txt(ctx, ln, rx + 18, ry + 50 + i * 14, 10.5, 'rgba(255,236,214,0.62)', 600);
        });
        txt(ctx, 'день ' + o.day, rx + rw - 18, ry + 30, 11, 'rgba(255,236,214,0.6)', 700, 'right');
      }
    }

    // карточка текущего покупателя
    if (o.customer) {
      var cc = o.customer;
      panel(ctx, 20, 116, 348, 154, { bg: 'rgba(28,20,16,0.94)', r: 16, border: 'rgba(255,235,210,0.12)' });
      txt(ctx, cc.walking ? 'ПОДХОДИТ К СТОЙКЕ · ТАЛОН ' + (cc.talon || '—') : 'У СТОЙКИ · ТАЛОН ' + (cc.talon || '—'), 38, 138, 10, 'rgba(255,236,214,0.5)', 800);
      txt(ctx, cc.name || 'Покупатель', 38, 164, 18, '#fff3e2', 700);
      // настроение
      if (cc.moodLabel) {
        var moodW = txtW(ctx, cc.moodLabel, 12, 700) + 34;
        fillRR(ctx, 38, 174, moodW, 22, 11, 'rgba(242,153,74,0.16)');
        txt(ctx, cc.moodIcon || '🙂', 50, 190, 12, '#ffd8a8', 700, 'center');
        txt(ctx, cc.moodLabel, 62, 190, 12, '#ffd8a8', 700);
      }
      // телефон и оплата
      var tagX = cc.moodLabel ? 38 + txtW(ctx, cc.moodLabel, 12, 700) + 46 : 38;
      if (cc.phone) {
        txt(ctx, '📱 ' + cc.phone, tagX, 190, 11, 'rgba(200,235,225,0.7)', 600);
        tagX += txtW(ctx, '📱 ' + cc.phone, 11, 600) + 12;
      }
      if (cc.pay) {
        txt(ctx, cc.pay, tagX, 190, 11, 'rgba(255,214,150,0.8)', 600);
      }
      if (cc.code) {
        txt(ctx, cc.masked ? 'код ••••' : 'код ' + cc.code, 38, 216, 15, '#ffd479', 700);
      } else {
        var kindName = { return: 'возврат', question: 'вопрос', resolve: 'претензия', 'fitting-back': 'из примерочной', late: 'опоздавший', courier: 'курьер', guest: 'гость из другого мира', shady: 'странный тип' }[cc.kind] || '';
        if (kindName) txt(ctx, kindName, 38, 216, 13, 'rgba(255,236,214,0.65)', 600);
      }
      if (cc.parcels > 1) txt(ctx, cc.parcels + ' посылки', 230, 216, 12, '#9fd6c6', 700);
      txt(ctx, 'ТЕРПЕНИЕ', 38, 237, 9, 'rgba(255,236,214,0.6)', 800);
      var pc = cc.patience > 0.6 ? '#5aa877' : cc.patience > 0.3 ? '#f2c14a' : '#e4572e';
      bar(ctx, 38, 244, 312, 9, cc.patience, pc, 'rgba(0,0,0,0.35)');
    }

    // очередь
    if (o.queue) {
      var qy = o.customer ? 278 : 116;
      panel(ctx, 20, qy, 132, 38, { bg: 'rgba(28,20,16,0.8)', r: 14 });
      txt(ctx, 'В ОЧЕРЕДИ: ' + o.queue, 38, qy + 25, 13, '#f7ead8', 700);
    }

    // сканер
    if (o.scannerHeld !== undefined && !o.dialog) {
      var sy2 = o.held ? 548 : 604;
      panel(ctx, 20, sy2, 208, 32, { bg: o.scannerHeld ? 'rgba(40,80,60,0.85)' : 'rgba(28,20,16,0.75)', r: 12 });
      ctx.beginPath();
      ctx.arc(38, sy2 + 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = o.scannerHeld ? '#7fe0a0' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      txt(ctx, o.scannerHeld ? 'СКАНЕР В РУКЕ' : 'СКАНЕР НА СТОЛЕ', 52, sy2 + 21, 12,
        o.scannerHeld ? '#c9f5d8' : 'rgba(255,240,225,0.55)', 700);
    }

    // задачи смены
    if (o.objectives && o.objectives.length) {
      var ow = 322, oh = 34 + o.objectives.length * 30;
      var ox = W - ow - 20, oy = 108;
      // плотная подложка и тень: панель читается как отдельное окно, а не как «дырка» в стене
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      fillRR(ctx, ox, oy, ow, oh, 16, 'rgba(26,18,14,0.97)');
      ctx.restore();
      strokeRR(ctx, ox, oy, ow, oh, 16, 'rgba(255,235,210,0.16)', 1.4);
      txt(ctx, 'ЗАДАЧИ СМЕНЫ', ox + 18, oy + 24, 12, 'rgba(255,236,214,0.6)', 800);
      o.objectives.forEach(function (ob, i) {
        var y = oy + 52 + i * 30;
        ctx.beginPath();
        ctx.arc(ox + 24, y - 5, 8, 0, Math.PI * 2);
        ctx.fillStyle = ob.done ? P.green : 'rgba(255,255,255,0.14)';
        ctx.fill();
        if (ob.done) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox + 20, y - 5);
          ctx.lineTo(ox + 23, y - 2);
          ctx.lineTo(ox + 29, y - 9);
          ctx.stroke();
        }
        var label = ob.progress && !ob.done ? ob.text + ' · ' + ob.progress : ob.text;
        txt(ctx, label, ox + 42, y, 13, ob.done ? 'rgba(180,230,200,0.75)' : '#f7ead8', 600);
      });
    }

    // удерживаемая посылка
    if (o.held && !o.dialog) {
      panel(ctx, 20, 588, 280, 62, { bg: 'rgba(28,20,16,0.88)', r: 14 });
      if (o.held.unpacked) drawCatalogItem(ctx, o.held.item, o.held.kind, 32, 596, 52, 52, { shadow: false });
      else drawParcel(ctx, 34, 598, 48, 44, { seed: 2 });
      txt(ctx, o.held.unpacked ? 'Товар в руках:' : (o.held.onTable ? 'На столе:' : 'В руках:'), 94, 612, 11, 'rgba(255,236,214,0.6)', 700);
      txt(ctx, o.held.code, 94, 634, 17, '#ffd479', 800);
      txt(ctx, o.held.unpacked ? o.held.item : o.held.scanned ? 'вскройте коробку' : (o.held.onTable ? 'нужно сканировать' : 'положите на стол'), 94, 648, 10,
        o.held.unpacked ? '#8fe0a8' : o.held.scanned ? '#ffd479' : '#ffb27a', 600);
    }

    // подсказка
    if (o.hint && !o.dialog) {
      var hw = Math.min(860, txtW(ctx, o.hint, 14, 600) + 48);
      panel(ctx, (W - hw) / 2, 676, hw, 36, { bg: 'rgba(28,20,16,0.82)', r: 18, border: 'rgba(255,235,210,0.12)' });
      txt(ctx, o.hint, W / 2, 699, 14, '#f3e6d5', 600, 'center');
    }
  };

  /* ======================================================================
     СЦЕНА ВЫДАЧИ И ОСОБОГО ГОСТЯ
     ======================================================================
     Небольшая «сцена в рамке» над диалогом: покупатель показывает вещь,
     примеряет её у зеркала, слушает наушники; злой гость буянит среди
     разбросанных коробок; проверяющая листает папку. Диалог рисуется поверх,
     поэтому рамка занимает верхнюю половину экрана. */
  function momentSparkles(ctx, x, y, r, t, color) {
    for (var i = 0; i < 7; i++) {
      var a = t * 1.6 + i * 0.9;
      var rr = r * (0.5 + 0.5 * Math.sin(t * 2.2 + i));
      var sx = x + Math.cos(a) * rr;
      var sy = y + Math.sin(a * 1.3) * rr * 0.55;
      var al = 0.18 + 0.6 * Math.abs(Math.sin(t * 2.5 + i * 1.7));
      ctx.save();
      ctx.globalAlpha = al;
      ctx.fillStyle = color || '#ffd479';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 2.4, sy);
      ctx.lineTo(sx, sy + 4);
      ctx.lineTo(sx - 2.4, sy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  art.drawMomentScene = function (ctx, o) {
    if (!o || art.compact) return;
    o = o || {};
    var t = o.t || 0;
    var kind = o.kind || 'item';
    var x = 268, y = 40, w = 744, h = 452;
    var rage = kind === 'rage';
    var accent = rage ? '#e4572e' : kind === 'tryon' ? '#ffd479' : '#8fd0c0';

    ctx.save();
    // мягкое затемнение сцены, чтобы рамка читалась
    ctx.fillStyle = 'rgba(8,5,4,0.38)';
    ctx.fillRect(0, 0, 1280, 720);

    // рамка
    panel(ctx, x, y, w, h, {
      bg: rage ? 'rgba(38,14,10,0.97)' : 'rgba(22,16,12,0.96)',
      r: 22,
      border: rage ? 'rgba(228,87,46,0.5)' : 'rgba(255,225,190,0.22)'
    });

    var ix = x + 22, iy = y + 24, iw = w - 44, ih = h - 46;
    var stageTop = iy + 58;

    // цветной градиент сцены
    var g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    if (rage) {
      g.addColorStop(0, 'rgba(120,30,18,0.42)');
      g.addColorStop(0.55, 'rgba(60,18,12,0.26)');
      g.addColorStop(1, 'rgba(16,8,6,0.5)');
    } else if (kind === 'tryon') {
      g.addColorStop(0, 'rgba(255,214,150,0.14)');
      g.addColorStop(1, 'rgba(255,214,150,0.02)');
    } else {
      g.addColorStop(0, 'rgba(120,200,180,0.1)');
      g.addColorStop(1, 'rgba(20,40,40,0.02)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(ix, stageTop, iw, ih - 58);

    // фон сцены
    if (kind === 'tryon') {
      // примерочная: шторы и зеркало
      for (var s = 0; s < 9; s++) {
        ctx.fillStyle = s % 2 ? 'rgba(190,140,110,0.22)' : 'rgba(150,105,80,0.16)';
        ctx.fillRect(ix + s * (iw / 9), stageTop, iw / 9, ih - 58);
      }
      fillRR(ctx, ix + 34, stageTop + 24, 150, ih - 122, 14, 'rgba(150,190,200,0.14)');
      strokeRR(ctx, ix + 34, stageTop + 24, 150, ih - 122, 14, 'rgba(220,240,245,0.42)', 2);
      ctx.fillStyle = 'rgba(240,250,255,0.08)';
      ctx.fillRect(ix + 44, stageTop + 34, 24, ih - 142);
      txt(ctx, 'ЗЕРКАЛО', ix + 109, stageTop + ih - 78, 11, 'rgba(220,240,245,0.4)', 700, 'center');
    } else if (rage) {
      // трещины на стене и разбросанные коробки
      ctx.strokeStyle = 'rgba(255,150,110,0.35)';
      ctx.lineWidth = 2;
      for (var c = 0; c < 5; c++) {
        var cx0 = ix + 40 + c * (iw / 6);
        ctx.beginPath();
        ctx.moveTo(cx0, stageTop + 10);
        ctx.lineTo(cx0 + 22, stageTop + 90);
        ctx.lineTo(cx0 + 4, stageTop + 150);
        ctx.lineTo(cx0 + 34, stageTop + 220);
        ctx.stroke();
      }
      for (var b = 0; b < 4; b++) {
        var bx = ix + 46 + b * 74;
        var by = stageTop + ih - 118 + (b % 2) * 16;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate((b % 2 ? 1 : -1) * 0.22);
        drawParcel(ctx, -30, -24, 62, 48, { seed: b, color: b % 2 ? '#b98f57' : '#c9a26a' });
        ctx.restore();
      }
    } else if (kind === 'camera') {
      // кольцевая лампа и штатив
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#ffd479';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(ix + 110, stageTop + 68, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,200,170,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ix + 110, stageTop + 108);
      ctx.lineTo(ix + 110, stageTop + 210);
      ctx.stroke();
      fillRR(ctx, ix + 74, stageTop + 44, 22, 34, 5, 'rgba(30,26,24,0.9)');
    } else if (kind === 'inspect') {
      // папка с галочками
      fillRR(ctx, ix + 44, stageTop + 30, 152, 196, 10, 'rgba(240,232,214,0.9)');
      fillRR(ctx, ix + 60, stageTop + 56, 120, 10, 4, 'rgba(120,100,80,0.55)');
      fillRR(ctx, ix + 60, stageTop + 80, 92, 8, 4, 'rgba(120,100,80,0.4)');
      for (var ch = 0; ch < 3; ch++) {
        ctx.strokeStyle = '#4a8a5a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ix + 62, stageTop + 120 + ch * 30);
        ctx.lineTo(ix + 72, stageTop + 131 + ch * 30);
        ctx.lineTo(ix + 88, stageTop + 110 + ch * 30);
        ctx.stroke();
      }
    } else if (kind === 'money') {
      for (var m = 0; m < 6; m++) {
        ctx.save();
        ctx.translate(ix + 70 + (m % 3) * 44, stageTop + 120 + Math.floor(m / 3) * 34 + Math.sin(t * 2 + m) * 4);
        fillRR(ctx, -16, -10, 34, 22, 4, m % 2 ? '#d8c07a' : '#c9a95a');
        ctx.strokeStyle = 'rgba(90,70,30,0.5)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-16, -10, 34, 22);
        ctx.restore();
      }
    } else if (kind === 'family') {
      // трое малышей — простые силуэты, чтобы сцена не «мигала» случайными лицами
      var kidCols = ['#e4572e', '#3f7fae', '#5aa877'];
      for (var f = 0; f < 3; f++) {
        var kx = ix + 74 + f * 48;
        var ky = stageTop + 196 + Math.sin(t * 3 + f) * 4;
        ctx.fillStyle = kidCols[f];
        fillRR(ctx, kx - 13, ky - 52, 26, 44, 10);
        ctx.beginPath();
        ctx.arc(kx, ky - 64, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,230,200,0.9)';
        ctx.beginPath();
        ctx.arc(kx, ky - 66, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'mystery') {
      txt(ctx, '?', ix + 120, stageTop + 150, 150, 'rgba(255,214,150,0.25)', 800, 'center');
    }

    // обжитая сцена: полки, тёплый свет и линия прилавка
    if (kind !== 'tryon' && kind !== 'rage' && kind !== 'camera') {
      for (var sh = 0; sh < 4; sh++) {
        ctx.fillStyle = 'rgba(255,225,190,0.055)';
        ctx.fillRect(ix + iw - 190, stageTop + 44 + sh * 42, 170, 5);
        ctx.fillStyle = 'rgba(160,130,100,0.12)';
        ctx.fillRect(ix + iw - 186, stageTop + 49 + sh * 42, 4, 30);
        ctx.fillRect(ix + iw - 28, stageTop + 49 + sh * 42, 4, 30);
      }
      var warm = ctx.createRadialGradient(x + 150, stageTop + ih - 190, 20, x + 150, stageTop + ih - 190, 190);
      warm.addColorStop(0, 'rgba(255,210,150,0.16)');
      warm.addColorStop(1, 'rgba(255,210,150,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(ix, stageTop, iw, ih - 58);
      ctx.fillStyle = 'rgba(120,90,65,0.22)';
      ctx.fillRect(ix + 22, stageTop + ih - 74, iw - 44, 4);
    }

    // подставка
    ctx.beginPath();
    ctx.ellipse(x + w * 0.58, stageTop + ih - 78, 180, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    // покупатель
    var ph = kind === 'duo' ? 300 : rage ? 348 : 322;
    var px = rage ? x + w * 0.66 : x + w * 0.58;
    var pgy = stageTop + ih - 52;
    var person = o.person || null;
    if (person) {
      if (kind === 'duo' && o.person2) {
        drawPerson(ctx, o.person2, x + w * 0.37, pgy, ph - 20, { noShadow: true, sway: t * 1.2 });
        drawPerson(ctx, person, x + w * 0.61, pgy, ph, { noShadow: true, sway: t * 1.4 + 1 });
      } else {
        drawPerson(ctx, person, px, pgy, ph, { noShadow: false, sway: kind === 'tryon' ? t * 2.4 : t * 1.2 });
      }
    }

    // наушники — прямо на голове покупателя: сценка «слушает»
    if (o.item) {
      var pk = itemKindOf(o.item.item, o.item.kind);
      if (pk === 'headphones' && person) {
        var PM2 = personMetrics(person, ph);
        var hy2 = pgy - PM2.headCY;
        ctx.save();
        ctx.strokeStyle = '#2f2a2a';
        ctx.lineWidth = Math.max(4, ph * 0.026);
        ctx.beginPath();
        ctx.arc(px, hy2, PM2.headR * 1.2, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
        [-1, 1].forEach(function (sd) {
          ctx.beginPath();
          ctx.arc(px + sd * PM2.headR * 1.18, hy2 + PM2.headR * 0.08, PM2.headR * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = '#3a3230';
          ctx.fill();
          ctx.strokeStyle = '#f2994a';
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        ctx.restore();
      }
    }

    // предмет / вешалка / товар
    if (o.item) {
      if (kind === 'tryon') {
        // вешалка с вещью и подпись
        fillRR(ctx, ix + 44, stageTop + 24, 152, 8, 4, 'rgba(190,160,120,0.65)');
        ctx.strokeStyle = 'rgba(220,200,170,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix + 120, stageTop + 32);
        ctx.lineTo(ix + 120, stageTop + 52);
        ctx.stroke();
        drawCatalogItem(ctx, o.item.item, o.item.kind, ix + 82, stageTop + 54, 78, 78, { shadow: false });
      } else if (kind !== 'duo') {
        drawCatalogItem(ctx, o.item.item, o.item.kind, x + 74, stageTop + ih - 250, 120, 120);
        txt(ctx, '«' + o.item.item + '»', x + 134, stageTop + ih - 116, 14, 'rgba(255,236,210,0.8)', 700, 'center');
      }
      if (kind === 'tryon') {
        momentSparkles(ctx, px, pgy - ph * 0.55, 120, t, '#ffd479');
      }
    }
    if (rage) {
      momentSparkles(ctx, x + w * 0.4, stageTop + 120, 150, t, '#ff8a5c');
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.12 * Math.sin(t * 8);
      ctx.fillStyle = '#e4572e';
      ctx.fillRect(ix, stageTop, iw, ih - 58);
      ctx.restore();
    }

    // заголовок и подпись
    txt(ctx, (o.title || 'Выдача').toUpperCase(), x + w / 2, y + 34, 17, rage ? '#ffb27a' : '#ffc27a', 800, 'center');
    if (o.subtitle) txt(ctx, o.subtitle, x + w / 2, y + 55, 12, 'rgba(255,236,214,0.6)', 600, 'center');

    // уголки рамки
    ctx.strokeStyle = rage ? 'rgba(255,120,80,0.6)' : 'rgba(255,214,150,0.4)';
    ctx.lineWidth = 2;
    [[x + 14, y + 14, 1, 1], [x + w - 14, y + 14, -1, 1], [x + 14, y + h - 14, 1, -1], [x + w - 14, y + h - 14, -1, -1]]
      .forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] + 14 * c[3]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0] + 14 * c[2], c[1]);
        ctx.stroke();
      });
    ctx.restore();
  };

  /* Осколки и обломки: короткая вспышка, когда злой гость сносит коробку. */
  art.drawSmash = function (ctx, s) {
    if (!s) return;
    var t = s.t || 0;
    if (t > 1.2) return;
    var a = Math.max(0, 1 - t / 1.2);
    var cx = s.x || 980, cy = s.y || 470;
    ctx.save();
    ctx.globalAlpha = a;
    // вспышка
    ctx.beginPath();
    ctx.arc(cx, cy, 40 + t * 90, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,90,' + (0.22 * a) + ')';
    ctx.fill();
    // осколки
    for (var i = 0; i < 9; i++) {
      var ang = -1.2 + i * 0.32 + (s.seed || 0) * 0.1;
      var dist = 18 + t * (120 + i * 9);
      var fx = cx + Math.cos(ang) * dist;
      var fy = cy + Math.sin(ang) * dist + t * t * 90;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang + t * 5);
      ctx.fillStyle = i % 2 ? '#c9a26a' : '#e3d3b6';
      ctx.fillRect(-5, -3, 10 + (i % 3) * 3, 6);
      ctx.restore();
    }
    // пыль
    for (var d = 0; d < 5; d++) {
      ctx.beginPath();
      ctx.arc(cx - 30 + d * 16, cy + 10 + Math.sin(t * 4 + d) * 8, 14 + t * 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160,130,100,' + (0.16 * a) + ')';
      ctx.fill();
    }
    ctx.restore();
  };

  art.fade = function (ctx, a, color) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = color || '#000';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  };

  art.vignette = function (ctx, strength) {
    var vg = ctx.createRadialGradient(640, 360, 300, 640, 360, 800);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,10,5,' + (strength || 0.3) + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 1280, 720);
  };
})();
