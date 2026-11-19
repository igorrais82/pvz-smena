/* ПВЗ: Смена — ядро: утилиты, звук, ввод, состояние */
(function () {
  'use strict';
  var PVZ = (window.PVZ = window.PVZ || {});

  /* ---------------- утилиты ---------------- */
  var U = (PVZ.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    // плавное приближение, независимое от частоты кадров
    approach: function (a, b, speed, dt) { return a + (b - a) * (1 - Math.exp(-speed * dt)); },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    ri: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    chance: function (p) { return Math.random() < p; },
    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    easeOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    fmtTime: function (minutes) {
      var m = Math.round(minutes) % (24 * 60);
      if (m < 0) m += 24 * 60;
      var h = Math.floor(m / 60), mm = Math.floor(m % 60);
      return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    },
    fmtMoney: function (n) {
      var s = Math.round(n).toString();
      return s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009') + ' \u20BD';
    },
    fmtNum: function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009'); },
    pad2: function (n) { return (n < 10 ? '0' : '') + n; },
    plural: function (n, one, few, many) {
      var a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    },
    hit: function (r, x, y) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; },
    uid: function () { return Math.random().toString(36).slice(2, 9); },
    // стабильный «шум» — для декораций, которые не должны мерцать по кадрам
    hash: function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },
    wrapLines: function (ctx, text, maxW, size, weight) {
      var words = String(text).split(' ');
      var lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + ' ' + words[i] : words[i];
        if (PVZ.art.txtW(ctx, t, size, weight) > maxW && cur) { lines.push(cur); cur = words[i]; }
        else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
  });

  /* ---------------- звук (синтез, без файлов) ---------------- */
  var A = (PVZ.audio = {
    ctx: null,
    master: null,
    muted: false,
    ready: false,
    init: function () {
      if (this.ready) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.42;
        this.master.connect(this.ctx.destination);
        this.ready = true;
      } catch (e) { this.ready = false; }
    },
    resume: function () {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone: function (freq, dur, type, vol, slideTo, delay) {
      if (this.muted || !this.ready) return;
      var c = this.ctx, t = c.currentTime + (delay || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol == null ? 0.3 : vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (dur, vol, filterFreq, delay) {
      if (this.muted || !this.ready) return;
      var c = this.ctx, t = c.currentTime + (delay || 0);
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource(); src.buffer = buf;
      var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq || 1200; f.Q.value = 0.8;
      var g = c.createGain(); g.gain.value = vol == null ? 0.18 : vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },
    click: function () { this.tone(720, 0.045, 'triangle', 0.11); },
    tap: function () { this.tone(480, 0.05, 'sine', 0.1); },
    key: function () { this.tone(880, 0.03, 'square', 0.055); },
    ok: function () { this.tone(660, 0.09, 'sine', 0.15); this.tone(990, 0.13, 'sine', 0.12, null, 0.07); },
    coin: function () { this.tone(1180, 0.07, 'square', 0.07); this.tone(1560, 0.12, 'square', 0.06, null, 0.055); },
    bad: function () { this.tone(210, 0.2, 'sawtooth', 0.12, 120); },
    beep: function () { this.tone(2100, 0.06, 'square', 0.11); this.tone(2600, 0.05, 'square', 0.07, null, 0.05); },
    scanOk: function () { this.beep(); },
    scanFail: function () { this.tone(240, 0.12, 'square', 0.1, 160); },
    printer: function () { this.noise(0.18, 0.16, 2000); this.noise(0.12, 0.1, 1400, 0.16); },
    bell: function () { this.tone(1320, 0.4, 'sine', 0.09); this.tone(1760, 0.5, 'sine', 0.07, null, 0.09); },
    knock: function () { this.noise(0.07, 0.3, 220); this.noise(0.07, 0.22, 200, 0.13); },
    sweep: function () { this.noise(0.22, 0.12, 2600); },
    step: function () { this.noise(0.05, 0.05, 700); },
    ui: function () { this.tone(560, 0.05, 'triangle', 0.08); },
    cash: function () { this.tone(1040, 0.08, 'triangle', 0.12); this.noise(0.12, 0.08, 3000, 0.04); },
    level: function () { [520, 660, 790, 1040].forEach(function (f, i) { PVZ.audio.tone(f, 0.16, 'sine', 0.1, null, i * 0.09); }); },
    /* низкий удар — вход мафии, страшные сцены */
    boom: function () {
      this.tone(58, 0.9, 'sine', 0.34, 32);
      this.noise(0.5, 0.16, 240, 0.02);
      this.tone(41, 1.2, 'triangle', 0.18, 28, 0.12);
    },
    heartbeat: function () {
      this.tone(52, 0.18, 'sine', 0.22, 34);
      this.tone(48, 0.16, 'sine', 0.14, 30, 0.19);
    }
  });

  /* ---------------- адаптивная музыка ---------------- */
  /* Синтез без файлов: спокойная подложка, которая становится плотнее и быстрее
     по мере роста напряжения (очередь, терпение, рейтинг, вечер). */
  var M = (PVZ.music = {
    ctx: null,
    bus: null,
    timer: null,
    nextTime: 0,
    step: 0,
    tension: 0.16,
    target: 0.16,
    mood: 'calm',   // 'calm' | 'scary'
    dark: 0,        // 0 — обычная музыка, 1 — страшная ночная тема
    gainScale: 1,   // общая громкость фона (приложение «Радио ПВЗ»)
    track: 1,       // индекс музыкальной темы в TRACKS
    trackName: 'Радио ПВЗ',
    silent: false,  // «Тишина» в радио: фон не играет
    noiseBuf: null,

    /* ---------------- музыкальные темы радио ---------------- */
    /* Каждая тема — свой лад, темп, тембры и рисунок. Всё синтезируется
       на лету: никаких файлов, но шесть узнаваемо разных эфиров. */
    TRACKS: [
      {
        id: 'lofi', name: 'Lo-Fi', bpm: 68, wave: 'sine', padWave: 'triangle',
        chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],
        lead: [76, null, 79, null, 81, null, 79, null],
        arp: false, kick: 0.5, hat: 0.3, swing: 0.55, padVol: 1.15, bassVol: 0.8
      },
      {
        id: 'pvz', name: 'Радио ПВЗ', bpm: 78, wave: 'triangle', padWave: 'sine',
        chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]],
        lead: [76, 79, 81, 84, 88, 84, 81, 79],
        arp: true, kick: 0.8, hat: 0.6, swing: 0.5, padVol: 1, bassVol: 1
      },
      {
        id: 'night', name: 'Ночной эфир', bpm: 92, wave: 'sawtooth', padWave: 'sawtooth',
        chords: [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 59], [45, 48, 52, 55]],
        lead: [74, null, 77, 81, null, 84, 81, 77],
        arp: true, kick: 1, hat: 0.85, swing: 0.48, padVol: 0.7, bassVol: 1.3
      },
      {
        id: 'jazz', name: 'Джаз-кафе', bpm: 84, wave: 'triangle', padWave: 'sine',
        chords: [[55, 59, 62, 65], [53, 57, 60, 64], [50, 54, 57, 60], [48, 52, 55, 59]],
        lead: [72, 76, null, 79, 77, null, 74, 72],
        arp: true, kick: 0.65, hat: 0.7, swing: 0.62, padVol: 0.9, bassVol: 1.05
      },
      {
        id: 'chip', name: '8-бит смена', bpm: 104, wave: 'square', padWave: 'square',
        chords: [[57, 60, 64, 67], [59, 62, 66, 69], [52, 55, 59, 62], [55, 59, 62, 65]],
        lead: [81, 84, 88, 84, 81, 79, 76, 79],
        arp: true, kick: 0.9, hat: 1, swing: 0.5, padVol: 0.55, bassVol: 1.15
      },
      {
        id: 'classic', name: 'Классика', bpm: 72, wave: 'sine', padWave: 'triangle',
        chords: [[52, 55, 59, 64], [50, 53, 57, 62], [48, 52, 55, 60], [53, 57, 60, 65]],
        lead: [76, 79, 83, 88, 83, 79, 76, 72],
        arp: true, kick: 0.35, hat: 0.2, swing: 0.5, padVol: 1.1, bassVol: 0.75
      }
    ],

    setTrack: function (index) {
      var n = this.TRACKS.length;
      var i = Math.round(Number(index) || 0);
      if (i < 0 || i >= n) i = 1;
      this.track = i;
      this.trackName = this.TRACKS[i].name;
    },
    setSilent: function (v) { this.silent = !!v; },
    trackAt: function () { return this.TRACKS[this.track] || this.TRACKS[0]; },
    ensure: function () {
      var a = PVZ.audio;
      a.init();
      if (!a.ctx) return false;
      if (this.ctx === a.ctx) return true;
      this.ctx = a.ctx;
      this.bus = a.ctx.createGain();
      this.bus.gain.value = 0.0001;
      this.bus.connect(a.master);
      this.nextTime = a.ctx.currentTime + 0.12;
      this.step = 0;
      if (!this.timer) {
        this.timer = setInterval(function () { M.schedule(); }, 60);
      }
      return true;
    },
    setTension: function (v) { this.target = U.clamp(v, 0, 1); },
    setMood: function (m) { this.mood = m === 'scary' ? 'scary' : 'calm'; },
    /* Мгновенно включить тему (без плавного въезда) — для визита мафии */
    snapMood: function (m) {
      this.setMood(m);
      this.dark = this.mood === 'scary' ? 1 : 0;
    },
    setGain: function (v) { this.gainScale = U.clamp(v == null ? 1 : v, 0.12, 1.2); },
    update: function (dt, tension, mood) {
      if (tension != null) this.target = U.clamp(tension, 0, 1);
      if (mood) this.mood = mood === 'scary' ? 'scary' : 'calm';
      var k = 1 - Math.exp(-dt * 0.55);
      this.tension += (this.target - this.tension) * k;
      // страшная тема включается плавно, но быстро
      var wantedDark = this.mood === 'scary' ? 1 : 0;
      this.dark += (wantedDark - this.dark) * (1 - Math.exp(-dt * 1.4));
      if (this.dark < 0.002) this.dark = 0;
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      // во время страшной сцены фон не должен оказаться слишком тихим
      var gain = this.mood === 'scary' ? Math.max(this.gainScale, 0.8) : this.gainScale;
      var wanted = (PVZ.audio.muted || this.silent) ? 0.0001 : 0.55 * gain;
      this.bus.gain.setTargetAtTime(wanted, t, 0.25);
    },
    midi: function (n) { return 440 * Math.pow(2, (n - 69) / 12); },
    note: function (freq, when, dur, type, vol, opts) {
      if (!this.ctx) return;
      opts = opts || {};
      var c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, when);
      if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), when + dur);
      var atk = opts.attack == null ? 0.01 : opts.attack;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g);
      g.connect(this.bus);
      o.start(when);
      o.stop(when + dur + 0.05);
    },
    noise: function (when, dur, vol, freq, kind) {
      if (!this.ctx) return;
      var c = this.ctx;
      if (!this.noiseBuf) {
        var len = Math.floor(c.sampleRate * 0.5);
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        var d = this.noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      var src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      var f = c.createBiquadFilter();
      f.type = kind || 'highpass';
      f.frequency.value = freq || 5000;
      var g = c.createGain();
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.bus);
      src.start(when);
    },
    schedule: function () {
      if (!this.ctx || PVZ.audio.muted || this.ctx.state !== 'running') {
        if (this.ctx) this.nextTime = this.ctx.currentTime + 0.12;
        return;
      }
      if (this.silent) {
        if (this.ctx) this.nextTime = this.ctx.currentTime + 0.2;
        return;
      }
      if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
      var ahead = 0.35;
      while (this.nextTime < this.ctx.currentTime + ahead) {
        this.playStep(this.step, this.nextTime, this.tension, this.dark);
        var tr = this.trackAt();
        var bpm = (tr.bpm + this.tension * 24) * (1 - this.dark * 0.42);
        this.nextTime += 60 / bpm / 2; // восьмая
        this.step++;
      }
    },
    playStep: function (step, when, tension, dark) {
      var d = U.clamp(dark || 0, 0, 1);
      if (d < 0.995) this.playCalmStep(step, when, tension, 1 - d);
      if (d > 0.005) this.playScaryStep(step, when, d);
    },
    /* ---------------- спокойная/рабочая тема ---------------- */
    /* Один движок — шесть характеров: тема задаёт темп, тембры, аккорды,
       мелодию и плотность ритма. Напряжение в зале подмешивает тревожные
       ноты и ускоряет эфир, но не ломает узнаваемость станции. */
    playCalmStep: function (step, when, tension, gain) {
      var tr = this.trackAt();
      var b = step % 8;
      var bar = Math.floor(step / 8);
      var t = tension || 0;
      gain = gain == null ? 1 : gain;
      var bpm = tr.bpm + t * 24;
      var eighth = 60 / bpm / 2;
      var chord = tr.chords[bar % 4];
      var swing = (b % 2 === 1) ? eighth * ((tr.swing || 0.5) - 0.5) * 0.28 : 0;

      // подложка-пад раз в такт
      if (b === 0) {
        var padVol = (0.026 + t * 0.018) * gain * (tr.padVol || 1);
        for (var pi = 1; pi < chord.length; pi++) {
          M.note(M.midi(chord[pi] + 12), when, eighth * 7.6, tr.padWave || 'sine',
            padVol * (pi === 1 ? 1 : 0.78), { attack: 0.75 });
        }
        M.note(M.midi(chord[0] - 12), when, eighth * 7.2, 'sine',
          (0.045 + t * 0.02) * gain * (tr.bassVol || 1), { attack: 0.18 });
      }

      // бас: у каждой темы свой рисунок
      var bassSteps = tr.id === 'chip' ? [0, 2, 4, 6] : tr.id === 'jazz' ? [0, 3, 4, 6] : [0, 3, 4, 6];
      if (bassSteps.indexOf(b) >= 0) {
        var root = chord[0] - (b >= 4 ? 12 : 24);
        M.note(M.midi(root), when + swing, b === 0 ? eighth * 1.5 : eighth * 0.9,
          tr.id === 'night' ? 'sawtooth' : 'triangle',
          (0.033 + t * 0.022) * gain * (tr.bassVol || 1), { attack: 0.02 });
      }

      // арпеджио — у большинства тем
      if (tr.arp) {
        var an = chord[(b + bar) % chord.length] + 12;
        M.note(M.midi(an), when + swing, eighth * 0.9, tr.wave || 'triangle',
          (0.007 + t * 0.010) * gain, { attack: 0.008 });
      }

      // мелодия станции
      var lead = tr.lead && tr.lead[b];
      if (lead != null) {
        var leadVol = (tr.id === 'lofi' ? 0.020 : tr.id === 'classic' ? 0.022 : 0.017) * gain;
        M.note(M.midi(lead), when + swing, eighth * (tr.id === 'classic' ? 2.2 : 1.25),
          tr.wave || 'sine', leadVol, { attack: tr.id === 'lofi' ? 0.08 : 0.02 });
      }

      // тревожный мотив поверх спокойного эфира
      if (t > 0.7 && b % 2 === 1 && (bar + b) % 4 === 1) {
        M.note(M.midi(chord[2] + 12), when, eighth * 0.8, 'square', 0.011 * gain, { attack: 0.005 });
      }

      // ритм: у каждой станции своя плотность
      if (tr.kick && (b === 0 || b === 4)) {
        M.note(M.midi(chord[0] - 24), when, 0.18, 'sine', 0.06 * gain * tr.kick,
          { slide: M.midi(chord[0] - 30), attack: 0.004 });
      }
      if (tr.hat && (b % 2 === 1)) {
        M.noise(when + 0.01, 0.03, 0.012 * gain * tr.hat, 7600);
      }
      if (t > 0.7 && (b === 2 || b === 6)) {
        M.noise(when, 0.09, 0.022 * gain, 1900, 'bandpass');
      }
    },
    /* ---------------- страшная тема: визит мафии ---------------- */
    /* Медленный низкий дрон, тритоны, сердцебиение и скрипящие струны.
       Никакой мелодии — только давление. */
    playScaryStep: function (step, when, d) {
      var b = step % 8;
      var bar = Math.floor(step / 8);
      var roots = [45, 44, 43, 41];       // A2, G#2, G2, F2 — сползание вниз
      var root = roots[bar % roots.length];
      var beat = 60 / (52 - d * 6) / 2;   // ~52 bpm, восьмые

      // низкий гудящий дрон и тритон — раз в такт
      if (b === 0) {
        M.note(M.midi(root - 12), when, beat * 7.6, 'sine', 0.115 * d, { attack: 0.9 });
        M.note(M.midi(root - 6), when, beat * 7.2, 'triangle', 0.035 * d, { attack: 1.5 });
        M.note(M.midi(root - 11), when, beat * 7.4, 'sine', 0.022 * d, { attack: 1.2 });
        // редкий вдох-шум, как сквозняк
        M.noise(when, 2.4, 0.028 * d, 700, 'lowpass');
      }

      // сердцебиение: два удара
      if (b === 0 || b === 4) {
        M.note(M.midi(root - 24), when, 0.34, 'sine', 0.17 * d, { slide: M.midi(root - 31), attack: 0.004 });
        M.note(M.midi(root - 24), when + beat * 0.55, 0.26, 'sine', 0.1 * d, { slide: M.midi(root - 31), attack: 0.004 });
      }
      if (b === 6) {
        M.note(M.midi(root - 24), when, 0.2, 'sine', 0.06 * d, { slide: M.midi(root - 30), attack: 0.004 });
      }

      // скрипящие струны: малая секунда в высоком регистре
      if (b === 1 || b === 5) {
        var hi = root + 37;
        M.note(M.midi(hi), when, 0.9, 'sawtooth', 0.016 * d, { attack: 0.35 });
        M.note(M.midi(hi + 1), when + 0.04, 0.8, 'sawtooth', 0.012 * d, { attack: 0.4 });
      }

      // металлический удар — как шаги по складу
      if (b === 3 || b === 6) {
        M.noise(when, 0.16, 0.06 * d, 2100, 'bandpass');
        M.note(M.midi(root + 12), when, 0.5, 'triangle', 0.014 * d, { attack: 0.005 });
      }

      // шёпот на каждом втором такте
      if (d > 0.5 && b === 7 && bar % 2 === 1) {
        M.noise(when, 0.55, 0.028 * d, 5200, 'highpass');
        M.note(M.midi(root + 25), when, 0.32, 'square', 0.008 * d, { attack: 0.02 });
      }

      // далёкий грохот раз в 4 такта
      if (b === 0 && bar % 4 === 3) {
        M.note(M.midi(28), when, 1.4, 'sine', 0.09 * d, { slide: M.midi(20), attack: 0.06 });
        M.noise(when, 1.1, 0.05 * d, 300, 'lowpass');
      }
    }
  });

  /* ---------------- ввод: мышь / тач / клавиатура ---------------- */
  var I = (PVZ.input = {
    x: 640, y: 360,
    down: false,
    downX: 0, downY: 0,
    moved: 0,
    touch: false,
    keys: {},
    canvas: null,
    init: function (canvas) {
      this.canvas = canvas;
      var self = this;

      function toLogical(clientX, clientY) {
        var r = canvas.getBoundingClientRect();
        var L = PVZ.logical || { w: 1280, h: 720 };
        return {
          x: (clientX - r.left) * (L.w / r.width),
          y: (clientY - r.top) * (L.h / r.height)
        };
      }

      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        canvas.focus && canvas.focus();
        PVZ.audio.resume();
        var p = toLogical(e.clientX, e.clientY);
        self.touch = e.pointerType !== 'mouse';
        self.x = p.x; self.y = p.y;
        self.downX = p.x; self.downY = p.y;
        self.down = true; self.moved = 0;
        self.dispatch('down', p.x, p.y);
      }, { passive: false });

      canvas.addEventListener('pointermove', function (e) {
        var p = toLogical(e.clientX, e.clientY);
        if (self.down) self.moved += Math.abs(p.x - self.x) + Math.abs(p.y - self.y);
        self.x = p.x; self.y = p.y;
        self.dispatch('move', p.x, p.y);
      }, { passive: true });

      function endPointer(e) {
        if (!self.down) return;
        var p = toLogical(e.clientX, e.clientY);
        self.down = false;
        self.x = p.x; self.y = p.y;
        var dx = p.x - self.downX, dy = p.y - self.downY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          self.dispatch('swipe', p.x, p.y, dx > 0 ? 'right' : 'left');
        } else if (dist > 55 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          self.dispatch('swipe', p.x, p.y, dy > 0 ? 'down' : 'up');
        } else if (dist < 30) {
          self.dispatch('tap', p.x, p.y);
        }
        self.dispatch('up', p.x, p.y);
      }

      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', function () { self.down = false; self.dispatch('up', self.x, self.y); });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      window.addEventListener('keydown', function (e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Tab'].indexOf(e.key) >= 0) e.preventDefault();
        PVZ.audio.resume();
        self.keys[e.key] = true;
        if (!e.repeat) self.dispatch('key', 0, 0, e.key);
      });
      window.addEventListener('keyup', function (e) { self.keys[e.key] = false; });
      window.addEventListener('blur', function () { self.keys = {}; });
    },
    dispatch: function (type, x, y, extra) {
      var g = PVZ.game;
      if (!g || !g.scene) return;
      if (g.paused) {
        if (type === 'move') { if (g.scene.onMove) g.scene.onMove(x, y); return; }
        if (type === 'tap') { if (g.onTapPause) g.onTapPause(x, y); return; }
        if (type === 'key' && extra === 'Escape') { g.togglePause(); return; }
        return;
      }
      if (type === 'key' && extra === 'Escape') {
        // сцена может перехватить Esc (закрыть ноутбук, терминал, телефон)
        if (g.scene.onEscape && g.scene.onEscape()) return;
        g.togglePause();
        return;
      }
      if (type === 'move') { if (g.scene.onMove) g.scene.onMove(x, y); return; }
      if (type === 'down') { if (g.scene.onDown) g.scene.onDown(x, y); return; }
      if (type === 'up') { if (g.scene.onUp) g.scene.onUp(x, y); return; }
      if (type === 'tap') { if (g.scene.onTap) g.scene.onTap(x, y); return; }
      if (type === 'swipe') { if (g.scene.onSwipe) g.scene.onSwipe(extra); return; }
      if (type === 'key') { if (g.scene.onKey) g.scene.onKey(extra); return; }
    }
  });

  /* ---------------- правила забега ---------------- */
  /* Цель: продержаться WIN_DAY дней. Рейтинг ниже ratingFail — пункт закрывают. */
  var B = (PVZ.balance = {
    WIN_DAY: 10,          // последний день забега
    ratingWarn: 3.5,      // с этого значения начинаем предупреждать
    ratingFail: 3.0,      // на этом значении пункт закрывают
    targetRating: 4.4,    // для лучшей концовки
    targetEarned: 12000,  // и по суммарной выручке за забег
    /* «Живой» рейтинг: каждый обслуженный клиент тянет оценку к своей.
       Вверх тянем мягко, вниз — резко: игрок должен видеть цену ошибки. */
    visitUp: 0.055,
    visitDown: 0.14,
    ratingLogMax: 24,     // сколько последних визитов помним

    /* Бесконечный режим: мафии нет, но есть аренда. Она собирается каждый
       вечер и состоит из растущей ставки и доли выручки — так она остаётся
       посильной и на 10-й смене, и на 10 000-й. */
    rentBase: 160,
    rentPerDay: 18,
    rentMaxBase: 4200,
    rentShare: 0.09,      // доля выручки смены
    rentShareStep: 0.01,  // +1% каждые 10 смен
    rentShareMax: 0.25,
    rentReviewEvery: 10,  // раз в 10 смен арендодатель поднимает ставку
    rentUnpaidLimit: 3,   // столько неоплат подряд — и выселяют
    decorPatience: 0.025, // уют от каждого уровня предмета декора
    decorMax: 0.4,        // но не больше +40% к терпению
    maxLevel: 3,          // обычный → серебряный → золотой
    upgradeCost: [0, 0, 1.25, 2.4] // множитель цены при переходе на уровень
  });

  /* Ступени улучшения предметов магазина */
  var TIERS = (PVZ.tiers = [
    { level: 1, name: 'обычный', short: 'I', color: '#c9b8a2', metal: '#b9a68c' },
    { level: 2, name: 'серебряный', short: 'II', color: '#d6dee4', metal: '#b9c6d0' },
    { level: 3, name: 'золотой', short: 'III', color: '#ffd479', metal: '#f2c14a' }
  ]);
  PVZ.tier = function (level) {
    return TIERS[Math.max(0, Math.min(TIERS.length - 1, (level || 1) - 1))];
  };

  /* ---------------- состояние и сохранение ---------------- */
  var SAVE_KEY = 'pvz_smena_save_v3';
  var LEGACY_KEY = 'pvz_smena_save_v2';

  /* Тарифы ПВЗ: сколько пункт получает за операцию (условные рубли) */
  /* Тарифы ПВЗ: сколько пункт получает за операцию (условные рубли).
     Наложенный платёж — это деньги продавца: пункт получает только комиссию
     за приём и передачу денег, а не всю сумму заказа. */
  var TARIFF = (PVZ.tariff = {
    issue: 55,        // выдача заказа
    issueFast: 15,    // надбавка за быструю выдачу
    receive: 14,      // приёмка единицы поставки
    ret: 40,          // оформленный возврат
    fitting: 10,      // примерка
    tip: 35,          // чаевые довольного клиента
    cod: 60,          // комиссия за приём наложенного платежа
    consult: 15,      // консультация
    complaint: 250    // списание за жалобу
  });

  var S = (PVZ.state = {
    data: null,
    SAVE_KEY: SAVE_KEY,

    fresh: function () {
      return {
        version: 3,
        mode: 'story',   // 'story' — 10 смен и долг мафии, 'endless' — бесконечные смены и аренда
        day: 1,
        phase: 'morning',
        clock: 8 * 60,
        money: 0,
        rating: 4.65,
        // оценки последних визитов (1..5): из них видно, куда едет рейтинг
        ratingLog: [],
        // отложенные последствия решений: { id, day, payload }
        pending: [],
        owned: [],
        levels: {},      // id предмета → 1..3 (серебро/золото)
        stats: { served: 0, complaints: 0, earned: 0, returns: 0 },
        totals: { days: 0, served: 0, complaints: 0, earned: 0, returns: 0, bestRating: 0, minigame: 0 },
        settings: { sound: true, hints: true },
        shift: null,
        // приложения на ноутбуке: магазин, телефон и Premium store стоят сразу
        apps: ['appstore', 'phone', 'premium'],
        radioStation: 2,
        radioVolume: 1,
        // Premium store: монеты за рекламу и покупки, подписка «ПВЗ Плюс»,
        // косметика и DEV-доступ. Покупки — мета-прогресс, живут вне забега.
        premium: {
          coins: 0,
          adsWatched: 0,
          adFree: false,
          catSkins: false,
          appPack: false,
          dev: false,
          plusUntil: 0,    // «ПВЗ Плюс» действует до (мс, реальное время)
          plusEver: false, // Плюс куплен навсегда
          dailyClaim: '',  // дата последнего ежедневного подарка (YYYY-M-D)
          lastAdAt: 0,     // когда последний раз забирали бонус без рекламы
          bought: [],
          rubSpent: 0,
          purchases: 0
        },
        // переписка в «Мессенджере»: Артём и рабочие чаты
        chatLog: [],
        // Артём приходит через смену: какие дни уже навестил
        friendDays: [],
        bossCallDay: 0,
        over: false,     // пункт закрыли из-за рейтинга
        won: false,      // забег пройден до конца
        finale: null,    // итог последнего забега
        cat: null,       // уличный кот, оставшийся жить на ПВЗ
        catStory: null,  // 'taken' | 'refused' — чем закончилась история с котом
        // чёрный рынок «Banana store»: открывается мутным типом на 5-й смене
        banana: {
          met: false,        // тип уже приходил
          heat: 0,           // подозрение полиции 0..100
          soldDay: 0,        // день последней продажи
          soldToday: 0,      // продаж за этот день
          totalSold: 0,      // продано всего
          bought: [],        // купленные товары чёрного рынка
          avFound: false,    // антивирус нашёл приложение
          removedDay: 0      // день, когда приложение удалили
        },
        reviews: [],     // отзывы покупателей
        reviewSeq: 0,
        // сюжет: долг мафии
        debt: 9350,     // сумма долга (закрывается вечерними платежами)
        mafiaPaid: 0,    // всего отдано мафии
        mafiaVisits: 0,  // сколько раз они приходили
        mafiaTaken: [],  // что забрали вместо денег
        // сюжет мафии: доверие, грязь, улики и выбранный путь
        mafia: {
          trust: 0,        // -100..100 — насколько Босс вам доверяет
          dirt: 0,         // 0..100 — сколько грязных дел на вас
          proof: 0,        // 0..3 — улики для полиции
          path: null,      // 'family' — согласились работать на них
          task: null,      // услуга: { remaining, need, reward, day }
          seen: [],        // прошедшие сюжетные сцены
          hidden: false,   // громилу прятали на складе
          visits: 0
        },
        // бесконечный режим: вместо оброка — аренда, вместо финала — рекорд
        rent: { unpaid: 0, paidTotal: 0, lastDemand: 0, strikes: 0 },
        endlessBest: { day: 0, money: 0, served: 0 },
        // пасхалки: какие секреты уже находили (по id)
        eggs: [],
        eggPets: 0,      // сколько раз погладили кота
        eggTaps: {},     // счётчики нажатий на предметы в интерьере
        freed: false,    // долг закрыт — пункт свободен
        // оформление ПВЗ (выбирается в прологе)
        pvzName: 'ПВЗ №14',
        pvzColor: '#f2994a',
        address: 'ул. Ленина, 3',
        tutorialSeen: false
      };
    },

    newGame: function (mode) {
      var keepPremium = this.data && this.data.premium ? JSON.parse(JSON.stringify(this.data.premium)) : null;
      var keepApps = this.data && Array.isArray(this.data.apps) ? this.data.apps.filter(function (id) {
        return id === 'premium' || id === 'appstore' || id === 'phone';
      }) : null;
      this.data = this.fresh();
      // Premium-покупки — мета-прогресс: не теряются при новом забеге
      if (keepPremium) this.data.premium = keepPremium;
      if (keepApps) {
        keepApps.forEach(function (id) { if (this.data.apps.indexOf(id) < 0) this.data.apps.push(id); }, this);
      }
      if (mode === 'endless') {
        this.data.mode = 'endless';
        this.data.debt = 0;
        this.data.freed = true;
      }
      this.save();
      return this.data;
    },

    /* Бесконечный режим: новый забег без мафии и без последнего дня.
       Оформление, настройки и коллекция секретов переходят из прошлого
       забега — это мета-прогресс, ради которого хочется сыграть ещё раз. */
    startEndless: function () {
      var prev = this.data;
      var keep = prev ? {
        pvzName: prev.pvzName,
        pvzColor: prev.pvzColor,
        address: prev.address,
        settings: prev.settings,
        tutorialSeen: prev.tutorialSeen,
        eggs: Array.isArray(prev.eggs) ? prev.eggs.slice() : [],
        eggTaps: Object.assign({}, prev.eggTaps || {}),
        eggPets: prev.eggPets || 0,
        cat: prev.cat || null,
        catStory: prev.catStory || null,
        premium: prev.premium ? JSON.parse(JSON.stringify(prev.premium)) : null,
        endlessBest: Object.assign({ day: 0, money: 0, served: 0 }, prev.endlessBest || {})
      } : null;
      this.data = this.fresh();
      this.data.mode = 'endless';
      this.data.debt = 0;
      this.data.freed = true;
      if (keep) Object.assign(this.data, keep);
      if (!this.data.premium) this.data.premium = this.fresh().premium;
      this.save();
      return this.data;
    },

    endless: function () { return !!(this.data && this.data.mode === 'endless'); },

    /* Сюжет мафии: доверие, грязь и улики. Создаём поля для старых сейвов. */
    mafiaState: function () {
      var d = this.data;
      if (!d) return null;
      if (!d.mafia || typeof d.mafia !== 'object') {
        d.mafia = { trust: 0, dirt: 0, proof: 0, path: null, task: null, seen: [], hidden: false, visits: 0 };
      }
      var m = d.mafia;
      if (!Array.isArray(m.seen)) m.seen = [];
      if (typeof m.trust !== 'number') m.trust = 0;
      if (typeof m.dirt !== 'number') m.dirt = 0;
      if (typeof m.proof !== 'number') m.proof = 0;
      if (typeof m.visits !== 'number') m.visits = d.mafiaVisits || 0;
      return m;
    },

    /* Доверие/грязь/улики меняются с ограничениями, чтобы сюжет не ушёл в крайности */
    mafiaAdd: function (field, delta) {
      var m = this.mafiaState();
      if (!m) return 0;
      if (field === 'dirt') m.dirt = U.clamp((m.dirt || 0) + delta, 0, 100);
      else if (field === 'proof') m.proof = U.clamp((m.proof || 0) + delta, 0, 3);
      else if (field === 'trust') m.trust = U.clamp((m.trust || 0) + delta, -100, 100);
      return m[field];
    },

    load: function () {
      try {
        var raw = localStorage.getItem(SAVE_KEY);
        var d = raw ? JSON.parse(raw) : null;
        if (!d) {
          // мягкая миграция со второй версии: прогресс сохраняем, смену — нет
          var old = localStorage.getItem(LEGACY_KEY);
          if (old) {
            var o = JSON.parse(old);
            if (o && o.version === 2) {
              d = this.fresh();
              d.day = o.day || 1;
              d.money = o.money || 0;
              d.rating = o.rating || 4.65;
              d.totals = Object.assign(d.totals, o.totals || {});
              d.settings = Object.assign(d.settings, o.settings || {});
            }
          }
        }
        if (!d || (d.version !== 3 && d.version !== 2)) return null;
        this.data = Object.assign(this.fresh(), d);
        this.data.version = 3;
        this.data.settings = Object.assign({ sound: true, hints: true }, d.settings || {});
        this.data.totals = Object.assign({ days: 0, served: 0, complaints: 0, earned: 0, returns: 0, bestRating: 0, minigame: 0 }, d.totals || {});
        this.data.stats = Object.assign({ served: 0, complaints: 0, earned: 0, returns: 0 }, d.stats || {});
        if (!Array.isArray(this.data.owned)) this.data.owned = [];
        var hadApps = Array.isArray(d.apps);
        if (!hadApps) this.data.apps = ['appstore', 'phone', 'premium'];
        if (this.data.apps.indexOf('appstore') < 0) this.data.apps.push('appstore');
        if (this.data.apps.indexOf('phone') < 0) this.data.apps.push('phone');
        if (this.data.apps.indexOf('premium') < 0) this.data.apps.push('premium');
        // старые сохранения: если забег уже идёт, приложения считаются установленными
        if (!hadApps && ((this.data.day || 1) > 1 || this.data.shift)) {
          var legacyApps = ['terminal', 'market', 'reviews', 'game'];
          for (var la = 0; la < legacyApps.length; la++) {
            if (this.data.apps.indexOf(legacyApps[la]) < 0) this.data.apps.push(legacyApps[la]);
          }
        }
        if (!this.data.levels || typeof this.data.levels !== 'object') this.data.levels = {};
        if (!Array.isArray(this.data.reviews)) this.data.reviews = [];
        if (!Array.isArray(this.data.ratingLog)) this.data.ratingLog = [];
        if (!Array.isArray(this.data.pending)) this.data.pending = [];
        if (this.data.mode !== 'endless') this.data.mode = 'story';
        this.mafiaState();
        if (!this.data.rent || typeof this.data.rent !== 'object') {
          this.data.rent = { unpaid: 0, paidTotal: 0, lastDemand: 0, strikes: 0 };
        }
        if (!this.data.endlessBest || typeof this.data.endlessBest !== 'object') {
          this.data.endlessBest = { day: 0, money: 0, served: 0 };
        }
        // Premium store и новые поля появились позже: досоздаём у старых сохранений
        if (!this.data.premium || typeof this.data.premium !== 'object') {
          this.data.premium = this.fresh().premium;
        }
        var pr = this.data.premium;
        pr.coins = Math.max(0, pr.coins || 0);
        if (!Array.isArray(pr.bought)) pr.bought = [];
        if (typeof pr.adsWatched !== 'number') pr.adsWatched = 0;
        if (typeof pr.rubSpent !== 'number') pr.rubSpent = 0;
        if (typeof pr.purchases !== 'number') pr.purchases = pr.bought.length || 0;
        if (typeof pr.plusUntil !== 'number') pr.plusUntil = 0;
        if (typeof pr.plusEver !== 'boolean') pr.plusEver = false;
        if (typeof pr.dailyClaim !== 'string') pr.dailyClaim = '';
        if (typeof pr.lastAdAt !== 'number') pr.lastAdAt = 0;
        if (!Array.isArray(this.data.chatLog)) this.data.chatLog = [];
        if (!Array.isArray(this.data.friendDays)) this.data.friendDays = [];
        if (typeof this.data.bossCallDay !== 'number') this.data.bossCallDay = 0;
        if (typeof this.data.radioVolume !== 'number') this.data.radioVolume = 1;
        if (typeof this.data.radioStation !== 'number') this.data.radioStation = 2;
        if (!this.data.reviewSeq) this.data.reviewSeq = this.data.reviews.length;
        // пасхалки и оформление появились позже: досоздаём поля у старых сохранений
        if (!Array.isArray(this.data.eggs)) this.data.eggs = [];
        if (!this.data.eggTaps || typeof this.data.eggTaps !== 'object') this.data.eggTaps = {};
        if (typeof this.data.eggPets !== 'number') this.data.eggPets = 0;
        if (!this.data.address) this.data.address = 'ул. Ленина, 3';
        // старый долг 46 000 был неподъёмным: приводим к закрываемой сумме
        if ((this.data.debt || 0) > 9350) this.data.debt = 9350;
        if (d.version === 2) { this.data.shift = null; this.save(); }
        return this.data;
      } catch (e) { return null; }
    },

    save: function () {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* приватный режим */ }
    },

    wipe: function () {
      try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
      this.data = null;
    },

    addMoney: function (v) {
      this.data.money += v;
      if (v > 0) { this.data.stats.earned += v; this.data.totals.earned += v; }
    },

    addRating: function (v) {
      this.data.rating = U.clamp(this.data.rating + v, 1, 5);
    },

    /* Оценка визита: клиент поставил 1..5, рейтинг едет к этой оценке.
       5 — довольный и обслуженный быстро, 4 — просто обслужен, 3 — с замечанием,
       2 — ушёл недовольным, 1 — ушёл, не дождавшись.
       Сдвиг ограничен: похвала тянет мягко, жалоба бьёт заметно, но не убивает
       с одного раза. harsh усиливает удар (день проверки, «липовые документы»
       наоборот смягчают). */
    rateVisit: function (score, harsh) {
      var d = this.data;
      if (!d) return 0;
      var s = U.clamp(Number(score) || 3, 1, 5);
      var k = s >= d.rating ? PVZ.balance.visitUp : PVZ.balance.visitDown * (harsh || 1);
      var delta = (s - d.rating) * k;
      var maxDown = -0.22 * (harsh || 1);
      if (delta > 0.1) delta = 0.1;
      if (delta < maxDown) delta = maxDown;
      d.rating = U.clamp(d.rating + delta, 1, 5);
      if (!Array.isArray(d.ratingLog)) d.ratingLog = [];
      d.ratingLog.push({ s: Math.round(s), day: d.day || 1 });
      while (d.ratingLog.length > PVZ.balance.ratingLogMax) d.ratingLog.shift();
      return d.rating;
    },

    /* Последние оценки клиентов — для HUD, отчёта и финала */
    ratingTail: function (n) {
      var log = this.data && Array.isArray(this.data.ratingLog) ? this.data.ratingLog : [];
      var count = Math.max(1, n || log.length || 1);
      return log.slice(-count);
    },

    ratingAvg: function (n) {
      var tail = this.ratingTail(n);
      if (!tail.length) return 0;
      var sum = 0;
      for (var i = 0; i < tail.length; i++) sum += tail[i].s;
      return sum / tail.length;
    },

    /* Куда едет рейтинг: сравнение последних визитов с теми, что были до них */
    ratingTrend: function () {
      var log = this.data && Array.isArray(this.data.ratingLog) ? this.data.ratingLog : [];
      if (log.length < 4) return 0;
      var tail = log.slice(-4);
      var prev = log.slice(-8, -4);
      var avg = function (arr) { var s = 0; arr.forEach(function (e) { s += e.s; }); return arr.length ? s / arr.length : 0; };
      if (!prev.length) return 0;
      return avg(tail) - avg(prev);
    },

    /* ---------------- отложенные последствия ---------------- */
    /* Решение на смене N возвращается на смене N+2: игрок учится думать
       не на один клик вперёд, а на пару дней. Одно и то же последствие
       не дублируется, чтобы не превратиться в штрафную очередь. */
    scheduleConsequence: function (id, inDays, payload) {
      var d = this.data;
      if (!d) return null;
      if (!Array.isArray(d.pending)) d.pending = [];
      for (var i = 0; i < d.pending.length; i++) if (d.pending[i].id === id) return null;
      var item = { id: id, day: (d.day || 1) + Math.max(1, Math.round(inDays || 2)), payload: payload || null };
      d.pending.push(item);
      return item;
    },

    /* Забирает все последствия, срок которых наступил */
    dueConsequences: function () {
      var d = this.data;
      if (!d || !Array.isArray(d.pending)) return [];
      var today = d.day || 1;
      var due = d.pending.filter(function (p) { return (p.day || 0) <= today; });
      if (due.length) d.pending = d.pending.filter(function (p) { return (p.day || 0) > today; });
      return due;
    },

    /* Сколько дней осталось до каждого отложенного последствия — для блокнота */
    pendingList: function () {
      var d = this.data;
      return d && Array.isArray(d.pending) ? d.pending.slice() : [];
    },

    addMinutes: function (m) { this.data.clock += m; },

    hasShift: function () {
      return !!(this.data && this.data.shift && this.data.shift.day);
    },

    /* Название и цвет вывески ПВЗ (выбираются в прологе) */
    title: function () {
      var n = this.data && this.data.pvzName;
      return (n && String(n).trim()) || 'ПВЗ №14';
    },

    brandColor: function () {
      var c = this.data && this.data.pvzColor;
      return (c && /^#[0-9a-fA-F]{6}$/.test(c)) ? c : '#f2994a';
    },

    address: function () {
      var a = this.data && this.data.address;
      return (a && String(a).trim()) || 'ул. Ленина, 3';
    },

    /* ---------------- пасхалки ---------------- */
    hasEgg: function (id) {
      return !!(this.data && Array.isArray(this.data.eggs) && this.data.eggs.indexOf(id) >= 0);
    },

    /* Отметить найденный секрет. Возвращает true, если он новый. */
    addEgg: function (id) {
      if (!this.data || !id) return false;
      if (!Array.isArray(this.data.eggs)) this.data.eggs = [];
      if (this.data.eggs.indexOf(id) >= 0) return false;
      this.data.eggs.push(id);
      this.save();
      return true;
    },

    eggCount: function () {
      return (this.data && Array.isArray(this.data.eggs)) ? this.data.eggs.length : 0;
    },

    /* ---------------- приложения ноутбука ---------------- */
    hasApp: function (id) {
      return !!(this.data && Array.isArray(this.data.apps) && this.data.apps.indexOf(id) >= 0);
    },

    /* Установка приложения из App Market. Возвращает { ok, reason } */
    installApp: function (id) {
      var app = null;
      (PVZ.apps && PVZ.apps.CATALOG || []).forEach(function (a) { if (a.id === id) app = a; });
      if (!app) return { ok: false, reason: 'Приложение не найдено в магазине.' };
      if (!this.data) return { ok: false, reason: 'Нет сохранения.' };
      if (this.hasApp(id)) return { ok: false, reason: app.name + ' уже установлено.' };
      if (this.data.money < app.price) {
        return { ok: false, reason: 'Не хватает ' + U.fmtMoney(app.price - this.data.money) + '.' };
      }
      this.data.money -= app.price;
      this.data.apps.push(id);
      this.save();
      return { ok: true, app: app };
    },

    /* ---------------- Premium store ---------------- */
    premium: function () {
      if (!this.data) return null;
      if (!this.data.premium || typeof this.data.premium !== 'object') {
        this.data.premium = this.fresh().premium;
      }
      var p = this.data.premium;
      if (!Array.isArray(p.bought)) p.bought = [];
      if (typeof p.coins !== 'number') p.coins = 0;
      if (typeof p.plusUntil !== 'number') p.plusUntil = 0;
      if (typeof p.plusEver !== 'boolean') p.plusEver = false;
      if (typeof p.dailyClaim !== 'string') p.dailyClaim = '';
      if (typeof p.lastAdAt !== 'number') p.lastAdAt = 0;
      if (typeof p.rubSpent !== 'number') p.rubSpent = 0;
      if (typeof p.purchases !== 'number') p.purchases = p.bought.length || 0;
      return p;
    },

    premiumHas: function (id) {
      var p = this.premium();
      if (!p) return false;
      if (id === 'plus') return this.premiumHasPlus();
      return !!(p[id] === true || (p.bought && p.bought.indexOf(id) >= 0));
    },

    /* «ПВЗ Плюс»: подписка. Считаем по реальному времени, чтобы срок не
       растягивался от новых забегов и переходов дня. */
    premiumHasPlus: function () {
      var p = this.premium();
      if (!p) return false;
      if (p.plusEver) return true;
      return (p.plusUntil || 0) > Date.now();
    },

    /* Сколько дней Плюса осталось (9999 — навсегда) */
    premiumPlusDays: function () {
      var p = this.premium();
      if (!p) return 0;
      if (p.plusEver) return 9999;
      var left = (p.plusUntil || 0) - Date.now();
      return left > 0 ? Math.ceil(left / 86400000) : 0;
    },

    /* Продлить Плюс на days дней (складывается с остатком) */
    premiumPlus: function (days) {
      var p = this.premium();
      if (!p || !days) return 0;
      var base = Math.max(Date.now(), p.plusUntil || 0);
      p.plusUntil = base + days * 86400000;
      this.save();
      return this.premiumPlusDays();
    },

    premiumPlusForever: function () {
      var p = this.premium();
      if (!p) return false;
      p.plusEver = true;
      p.plusUntil = 0;
      this.save();
      return true;
    },

    premiumCoins: function (delta) {
      var p = this.premium();
      if (!p) return 0;
      p.coins = Math.max(0, Math.round((p.coins || 0) + (delta || 0)));
      this.save();
      return p.coins;
    },

    /* Пометка покупки Premium store. Возвращает true, если покупка новая. */
    premiumMark: function (id) {
      var p = this.premium();
      if (!p || !id) return false;
      if (p.bought.indexOf(id) < 0) p.bought.push(id);
      if (id === 'adFree') p.adFree = true;
      if (id === 'catSkins') p.catSkins = true;
      if (id === 'appPack') p.appPack = true;
      if (id === 'dev') p.dev = true;
      p.purchases = (p.purchases || 0) + 1;
      this.save();
      return true;
    },

    /* Сообщения мессенджера: храним последние 40, чтобы сейв не разрастался */
    chatAdd: function (from, text, to) {
      if (!this.data) return null;
      if (!Array.isArray(this.data.chatLog)) this.data.chatLog = [];
      var m = { from: from || 'artem', to: to || 'artem', text: String(text || ''), day: this.data.day || 1 };
      this.data.chatLog.push(m);
      while (this.data.chatLog.length > 40) this.data.chatLog.shift();
      return m;
    },

    /* ---------------- чёрный рынок ---------------- */
    /* Ленивая инициализация: старые сохранения не знают про Banana store */
    banana: function () {
      if (!this.data) return null;
      if (!this.data.banana || typeof this.data.banana !== 'object') {
        this.data.banana = {
          met: false, heat: 0, soldDay: 0, soldToday: 0, totalSold: 0,
          bought: [], avFound: false, removedDay: 0
        };
      }
      var b = this.data.banana;
      if (!Array.isArray(b.bought)) b.bought = [];
      if (b.heat == null) b.heat = 0;
      if (b.soldToday == null) b.soldToday = 0;
      if (b.totalSold == null) b.totalSold = 0;
      return b;
    },

    bananaHas: function (id) {
      var b = this.banana();
      return !!(b && b.bought && b.bought.indexOf(id) >= 0);
    },

    /* Подозрение полиции: меняется продажами, взятками и временем */
    bananaHeat: function (delta) {
      var b = this.banana();
      if (!b) return 0;
      b.heat = Math.max(0, Math.min(100, Math.round((b.heat || 0) + delta)));
      this.save();
      return b.heat;
    },

    /* ---------------- покупки ---------------- */
    owns: function (id) {
      return !!(this.data && Array.isArray(this.data.owned) && this.data.owned.indexOf(id) >= 0);
    },

    /* Уровень предмета: 0 — не куплен, 1 — обычный, 2 — серебряный, 3 — золотой */
    level: function (id) {
      if (!this.owns(id)) return 0;
      var lv = this.data.levels ? this.data.levels[id] : 1;
      return Math.max(1, Math.min(PVZ.balance.maxLevel, lv || 1));
    },

    item: function (id) {
      var found = null;
      (PVZ.sys && PVZ.sys.SHOP || []).forEach(function (it) { if (it.id === id) found = it; });
      return found;
    },

    upgradeCost: function (id) {
      var item = this.item(id);
      var lv = this.level(id);
      if (!item || lv < 1 || lv >= PVZ.balance.maxLevel) return 0;
      var mult = PVZ.balance.upgradeCost[lv + 1] || 1.5;
      return Math.max(10, Math.round(item.price * mult / 10) * 10);
    },

    buy: function (id) {
      var item = this.item(id);
      if (!item || !this.data || this.owns(id)) return false;
      if (this.data.money < item.price) return false;
      this.data.money -= item.price;
      this.data.owned.push(id);
      if (!this.data.levels) this.data.levels = {};
      this.data.levels[id] = 1;
      this.save();
      return true;
    },

    /* Улучшение купленного предмета на следующую ступень */
    upgrade: function (id) {
      var lv = this.level(id);
      var cost = this.upgradeCost(id);
      if (!cost || !this.data || this.data.money < cost) return false;
      this.data.money -= cost;
      if (!this.data.levels) this.data.levels = {};
      this.data.levels[id] = lv + 1;
      this.save();
      return true;
    },

    /* Модификаторы от купленных улучшений и декора */
    mods: function () {
      var self = this;
      var lvl = function (id) { return self.level(id); };
      // декор теперь честный: каждый уровень предмета реально повышает терпение покупателей
      var decor = 0;
      (PVZ.sys && PVZ.sys.SHOP || []).forEach(function (it) {
        if (it.cat === 'decor') decor += lvl(it.id);
      });
      var comfort = Math.min(PVZ.balance.decorMax, decor * PVZ.balance.decorPatience);
      var at = function (id, arr) { var l = lvl(id); return l ? arr[l - 1] : arr[0]; };
      var cat = !!(this.data && this.data.cat);
      var crm = this.hasApp('crm');
      return {
        decor: decor,
        comfort: comfort,
        cat: cat,
        scanZone: lvl('scanner_pro') ? at('scanner_pro', [1.65, 1.85, 2.05]) : 1,
        scanSpeed: lvl('scanner_pro') ? at('scanner_pro', [0.78, 0.68, 0.58]) : 1,
        patience: (lvl('coffee') ? at('coffee', [0.76, 0.70, 0.64]) : 1) *
          (lvl('music') ? at('music', [0.88, 0.83, 0.78]) : 1) * (1 - comfort) * (cat ? 0.97 : 1) *
          (self.bananaHas('poison') ? 0.98 : 1),
        tip: (lvl('uniform') ? at('uniform', [1.15, 1.25, 1.35]) : 1) *
          (lvl('premium') ? at('premium', [1.3, 1.5, 1.7]) : 1) * (cat ? 1.08 : 1) * (crm ? 1.03 : 1),
        rating: lvl('courses') ? at('courses', [1.35, 1.6, 1.85]) : 1,
        spawn: lvl('ad') ? at('ad', [0.82, 0.74, 0.66]) : 1,
        time: lvl('terminal_pro') ? at('terminal_pro', [0.72, 0.65, 0.58]) : 1,
        cashier: lvl('terminal_pro') ? at('terminal_pro', [1.25, 1.4, 1.55]) : 1,
        /* автоматизация выдачи: убирает по одному ручному шагу за уровень */
        autoCarry: lvl('automation') >= 1,
        autoScan: lvl('automation') >= 2,
        autoCode: lvl('automation') >= 3,
        /* чёрный рынок: «документы» смягчают удар по рейтингу от жалоб,
           «глушилка» тянет время до приезда полиции */
        complaint: self.bananaHas('docs') ? 0.6 : 1,
        policeTime: self.bananaHas('jammer') ? 5 : 0
      };
    },

    /* Итог забега: рейтинг, выручка за всё время, сколько дней продержались */
    result: function () {
      var d = this.data || this.fresh();
      var bal = PVZ.balance;
      var days = d.totals.days || 0;
      var endless = d.mode === 'endless';
      return {
        mode: endless ? 'endless' : 'story',
        days: days,
        won: !endless && days >= bal.WIN_DAY,
        bestDay: endless ? Math.max((d.endlessBest && d.endlessBest.day) || 0, d.day || 0) : 0,
        rating: d.rating,
        avgScore: this.ratingAvg(0),
        earned: d.totals.earned || 0,
        served: d.totals.served || 0,
        complaints: d.totals.complaints || 0,
        money: d.money,
        debt: d.debt || 0,
        mafiaPaid: d.mafiaPaid || 0,
        eggs: (d.eggs || []).length,
        freed: !!(d.debt <= 0),
        mafia: {
          trust: (d.mafia && d.mafia.trust) || 0,
          dirt: (d.mafia && d.mafia.dirt) || 0,
          proof: (d.mafia && d.mafia.proof) || 0,
          path: (d.mafia && d.mafia.path) || null
        },
        ending: (PVZ.sys && PVZ.sys.mafiaEnding) ? PVZ.sys.mafiaEnding() : null,
        topTier: d.rating >= bal.targetRating && (d.totals.earned || 0) >= bal.targetEarned
      };
    }
  });
})();
