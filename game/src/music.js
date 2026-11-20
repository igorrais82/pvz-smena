/* ПВЗ: Смена — музыка: синтезированный саундтрек смены, мафии и радио.
   Отдельный модуль: движок, инструменты, темы утра/дня/вечера, мафии и эфиров. */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util;

  /* Саундтрек синтезируется в WebAudio: ни файлов, ни загрузок.
     У утра, дня и вечера — свои пьесы; у визита мафии — отдельная тревожная
     тема; у каждой радиостанции — свой эфир. Тема — это не набор случайных
     пиков, а аккордовая сетка, бас, мелодия, арпеджио и ритм. */
  var M = (PVZ.music = {
    ctx: null,
    bus: null,        // общая громкость музыки
    comp: null,
    spaceIn: null,    // вход в ревербератор
    slots: [],        // два канала: плавный переход между темами
    active: 0,
    themeId: '',
    pendingTheme: 'day',
    forceNow: false,
    bar: 0,
    nextBarTime: 0,
    timer: null,
    tension: 0.16,
    target: 0.16,
    mood: 'calm',     // 'calm' | 'scary'
    dark: 0,          // 0 — обычная тема, 1 — тема мафии
    gainScale: 1,     // громкость радио
    track: 1,         // индекс эфира в TRACKS (1 — «Радио ПВЗ», музыка смены)
    trackName: 'Радио ПВЗ',
    silent: false,    // «Тишина» в радио
    phase: 'day',     // 'morning' | 'day' | 'evening' | 'menu'
    noiseBuf: null,
    level: 1.3,       // общий уровень нот (звук интерфейса не должен тонуть)

    /* ---------------- граф ---------------- */
    ensure: function () {
      var a = PVZ.audio;
      a.init();
      if (!a.ctx) return false;
      if (this.ctx === a.ctx) return true;
      var c = a.ctx;
      this.ctx = c;
      this.bus = c.createGain();
      this.bus.gain.value = 0.0001;
      this.bus.connect(a.master);
      if (c.createDynamicsCompressor) {
        this.comp = c.createDynamicsCompressor();
        this.comp.threshold.value = -20;
        this.comp.knee.value = 22;
        this.comp.ratio.value = 3;
        this.comp.attack.value = 0.008;
        this.comp.release.value = 0.28;
        this.bus.disconnect();
        this.bus.connect(this.comp);
        this.comp.connect(a.master);
      }
      // общий «воздух»: короткий реверб на всю музыку
      this.spaceIn = c.createGain();
      this.spaceIn.gain.value = 1;
      var hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 220;
      var conv = c.createConvolver();
      conv.buffer = this.impulse(1.7, 2.6);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4200;
      var wet = c.createGain();
      wet.gain.value = 0.75;
      this.spaceIn.connect(hp);
      hp.connect(conv);
      conv.connect(lp);
      lp.connect(wet);
      wet.connect(this.bus);
      // шумовой буфер для перкуссии и шорохов
      var len = Math.floor(c.sampleRate * 4);
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var nd = this.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
      // два канала-слота для перекрёстного затухания тем
      this.slots = [];
      for (var s = 0; s < 2; s++) {
        var g = c.createGain();
        g.gain.value = 0.0001;
        var send = c.createGain();
        send.gain.value = 0.2;
        g.connect(this.bus);
        g.connect(send);
        send.connect(this.spaceIn);
        this.slots.push({ gain: g, send: send, theme: '' });
      }
      this.active = 0;
      this.themeId = '';
      this.bar = 0;
      this.nextBarTime = c.currentTime + 0.12;
      if (!this.timer) {
        this.timer = setInterval(function () {
          try { M.schedule(); } catch (e) { /* музыка не должна ломать игру */ }
        }, 45);
      }
      return true;
    },
    impulse: function (dur, decay) {
      var c = this.ctx;
      var len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) {
          var t = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return buf;
    },

    /* ---------------- настройки ---------------- */
    setTrack: function (index) {
      var n = this.TRACKS.length;
      var i = Math.round(Number(index) || 0);
      if (isNaN(i) || i < 0 || i >= n) i = 1;
      if (i !== this.track) {
        this.track = i;
        // переключение станции — как поворот ручки: сразу, а не с нового такта
        this.forceNow = true;
        this.forceFade = 0.5;
      }
      this.trackName = this.TRACKS[i].name;
      this.pendingTheme = this.wantedTheme();
    },
    setSilent: function (v) {
      var silent = !!v;
      if (silent !== this.silent) {
        this.silent = silent;
        this.forceNow = true;
        this.forceFade = 0.5;
      }
      this.pendingTheme = this.wantedTheme();
    },
    setGain: function (v) { this.gainScale = U.clamp(v == null ? 1 : v, 0.12, 1.2); },
    setTension: function (v) { this.target = U.clamp(v, 0, 1); },
    setMood: function (m) { this.mood = m === 'scary' ? 'scary' : 'calm'; },
    setPhase: function (p) {
      if (p === 'morning' || p === 'evening' || p === 'menu') this.phase = p;
      else this.phase = 'day';
    },
    /* Мгновенно включить страшную тему — для визита мафии */
    snapMood: function (m) {
      this.setMood(m);
      this.dark = this.mood === 'scary' ? 1 : 0;
      this.forceNow = true;
      this.pendingTheme = this.wantedTheme();
    },
    currentTrack: function () { return this.TRACKS[this.track] || this.TRACKS[0]; },
    channelTheme: function () {
      var t = this.TRACKS[this.track];
      return t && t.theme ? t.theme : null;
    },
    /* Что должно играть прямо сейчас: мафия важнее радио, радио важнее фазы */
    wantedTheme: function () {
      if (this.silent) return null;
      if (this.mood === 'scary') return 'mafia';
      var ch = this.channelTheme();
      if (ch) return ch;
      var ph = this.phase;
      if (ph === 'morning' || ph === 'evening' || ph === 'menu') return ph;
      return 'day';
    },

    /* ---------------- переключение тем ---------------- */
    fadeFor: function (id) {
      if (id === 'mafia') return 0.45;
      if (this.themeId === 'mafia') return 2.2;
      return 1.4;
    },
    beginSwitch: function (id, fade) {
      if (!this.ctx) return;
      var now = this.ctx.currentTime;
      var old = this.slots[this.active];
      if (!id) {
        old.gain.gain.cancelScheduledValues(now);
        old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
        old.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
        this.themeId = '';
        this.pendingTheme = null;
        return;
      }
      var next = this.slots[1 - this.active];
      var theme = this.THEMES[id];
      next.theme = id;
      next.gain.gain.cancelScheduledValues(now);
      next.gain.gain.setValueAtTime(0.0001, now);
      next.gain.gain.linearRampToValueAtTime(1, now + Math.max(0.18, fade * 0.55));
      if (next.send) {
        next.send.gain.setTargetAtTime(theme && theme.reverb != null ? theme.reverb : 0.22, now, 0.25);
      }
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
      this.active = 1 - this.active;
      this.themeId = id;
      this.bar = 0;
      this.nextBarTime = now + 0.05;
    },

    /* ---------------- каждый кадр ---------------- */
    update: function (dt, tension, mood, phase) {
      if (tension != null) this.target = U.clamp(tension, 0, 1);
      if (mood) this.mood = mood === 'scary' ? 'scary' : 'calm';
      if (phase) this.setPhase(phase);
      var k = 1 - Math.exp(-dt * 0.55);
      this.tension += (this.target - this.tension) * k;
      var wantedDark = this.mood === 'scary' ? 1 : 0;
      this.dark += (wantedDark - this.dark) * (1 - Math.exp(-dt * (wantedDark ? 6 : 1.3)));
      if (this.dark < 0.002) this.dark = 0;
      this.pendingTheme = this.wantedTheme();
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      // во время страшной сцены фон не должен оказаться слишком тихим
      var gain = this.mood === 'scary' ? Math.max(this.gainScale, 0.8) : this.gainScale;
      var wanted = (PVZ.audio.muted || this.silent) ? 0.0001 : 0.95 * gain;
      this.bus.gain.setTargetAtTime(wanted, t, 0.25);
    },

    /* ---------------- сетка и такты ---------------- */
    schedule: function () {
      if (!this.ctx || this.ctx.state !== 'running') {
        if (this.ctx) this.nextBarTime = this.ctx.currentTime + 0.12;
        return;
      }
      var now = this.ctx.currentTime;
      if (PVZ.audio.muted) { this.nextBarTime = now + 0.12; return; }
      if (this.silent) {
        if (this.themeId) this.beginSwitch(null, 0.8);
        this.nextBarTime = now + 0.2;
        return;
      }
      if (this.forceNow && this.pendingTheme !== this.themeId) {
        this.forceNow = false;
        var ff = this.forceFade || this.fadeFor(this.pendingTheme);
        this.forceFade = 0;
        this.beginSwitch(this.pendingTheme, ff);
      }
      if (this.nextBarTime < now - 0.5) this.nextBarTime = now + 0.05;
      var guard = 0;
      while (this.nextBarTime < now + 0.55 && guard++ < 4) {
        if (this.pendingTheme !== this.themeId) {
          this.beginSwitch(this.pendingTheme, this.fadeFor(this.pendingTheme));
        }
        if (!this.themeId) { this.nextBarTime = now + 0.2; break; }
        var theme = this.THEMES[this.themeId];
        if (!theme) { this.themeId = ''; break; }
        this.playBar(theme, this.bar, this.nextBarTime);
        this.bar++;
        var bpm = theme.bpm + this.tension * (theme.tempoLift || 0);
        this.nextBarTime += 16 * (60 / Math.max(40, bpm) / 4);
      }
    },
    swingTime: function (step, sd, sw) {
      if (!sw) return 0;
      if (step % 4 === 2) return sw * sd * 2;
      if (step % 2 === 1) return sw * sd * 0.7;
      return 0;
    },
    playBar: function (theme, bar, when) {
      if (!this.ctx) return;
      var sd = 60 / Math.max(40, theme.bpm + this.tension * (theme.tempoLift || 0)) / 4;
      var sw = (theme.swing || 0.5) - 0.5;
      var chord = theme.chords[bar % theme.chords.length];
      var slot = this.slots[this.active];
      if (!slot) return;
      var out = slot.gain;
      var vscale = (theme.vol == null ? 1 : theme.vol) * (1 + this.tension * 0.12) * this.level;
      var i, e, ev;
      // «вдох»: раз в несколько фраз один такт без ритма — петля не приедается
      var breakEvery = theme.breakEvery || 0;
      var breakdown = breakEvery > 0 && bar % breakEvery === breakEvery - 1;
      if (breakEvery > 0 && bar > 0 && bar % breakEvery === 0 && theme.drums) {
        this.openhat(out, when, 0.018 * vscale);
      }

      // подложка: один аккорд на такт (или на несколько тактов)
      if (theme.pad) {
        var p = theme.pad;
        if (!p.everyBars || bar % p.everyBars === 0) {
          var pdur = sd * 16 * (p.bars || 1);
          for (i = 0; i < chord.length; i++) {
            this.voice(p.inst || 'pad', out, when, pdur, chord[i] + (p.octave || 0),
              (p.vol || 0.02) * vscale, p);
          }
        }
      }

      // басовая линия
      if (theme.bass) {
        ev = theme.bass[bar % theme.bass.length] || [];
        for (i = 0; i < ev.length; i++) {
          e = ev[i];
          this.voice(theme.bassInst || 'bass', out,
            when + e[0] * sd + this.swingTime(e[0], sd, sw),
            sd * (e[2] || 2), e[1], e[3] * (theme.bassVol || 0.06) * vscale, theme.bassOpt);
        }
      }

      // мелодия: своя фраза на каждые несколько тактов
      if (theme.melody) {
        var section = Math.floor(bar / 8);
        var melInst = (theme.melodyInst2 && section % 2 === 1)
          ? theme.melodyInst2
          : (theme.melodyInst || 'piano');
        ev = theme.melody[bar % theme.melody.length] || [];
        for (i = 0; i < ev.length; i++) {
          e = ev[i];
          this.voice(melInst, out,
            when + e[0] * sd + this.swingTime(e[0], sd, sw),
            sd * (e[2] || 2), e[1], e[3] * (theme.melodyVol || 0.06) * vscale, theme.melodyOpt);
        }
      }

      // второй голос
      if (theme.counter) {
        ev = theme.counter[bar % theme.counter.length] || [];
        for (i = 0; i < ev.length; i++) {
          e = ev[i];
          this.voice(theme.counterInst || 'piano', out,
            when + e[0] * sd + this.swingTime(e[0], sd, sw),
            sd * (e[2] || 2), e[1], e[3] * (theme.counterVol || 0.04) * vscale, theme.counterOpt);
        }
      }

      // арпеджио / аккордовые выстрелы
      if (theme.arp && !breakdown) {
        var a = theme.arp;
        if (!a.everyBars || bar % a.everyBars === 0) {
          for (i = 0; i < a.steps.length; i++) {
            var st = a.steps[i];
            var ci = a.notes ? a.notes[i % a.notes.length] : i % chord.length;
            var n = chord[ci % chord.length] + (a.octave == null ? 12 : a.octave);
            this.voice(a.inst || 'pluck', out,
              when + st * sd + this.swingTime(st, sd, sw),
              sd * (a.dur || 1.4), n, (a.vol || 0.014) * vscale, a.opt);
          }
        }
      }

      // ритм
      if (theme.drums && !breakdown) this.playDrums(theme, bar, when, sd, sw, vscale, out);

      // винил в Lo-Fi
      if (theme.vinyl) {
        var kk = 2 + Math.floor(U.hash(bar * 7.3) * 3);
        for (i = 0; i < kk; i++) {
          var vs = Math.floor(U.hash(bar * 3.1 + i * 5.7) * 16);
          this.noiseHit(out, when + vs * sd, 0.016, 0.006 * vscale,
            2200 + U.hash(i + bar) * 2600, 'highpass');
        }
      }

      // уникальные штрихи темы (мафия)
      if (theme.onBar) theme.onBar(this, out, when, bar, sd, this.tension);
    },
    playDrums: function (theme, bar, when, sd, sw, vol, out) {
      var d = theme.drums;
      var self = this;
      // значения в темах заданы «как у инструментов», здесь приводим их
      // к общей громкости микса, чтобы барабаны не забивали мелодию
      var mix = 0.16;
      function hits(list, base, fn) {
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
          var s = list[i], v = base;
          if (Object.prototype.toString.call(s) === '[object Array]') { v = base * s[1]; s = s[0]; }
          fn(self, out, when + self.swingTime(s, sd, sw), v * vol * mix);
        }
      }
      hits(d.kick, d.kickVol == null ? 0.5 : d.kickVol, function (m, o, t, v) { m.kick(o, t, v); });
      hits(d.snare, d.snareVol == null ? 0.32 : d.snareVol, function (m, o, t, v) { m.snare(o, t, v); });
      hits(d.hat, d.hatVol == null ? 0.1 : d.hatVol, function (m, o, t, v) { m.hat(o, t, v); });
      hits(d.openhat, d.openhatVol == null ? 0.09 : d.openhatVol, function (m, o, t, v) { m.openhat(o, t, v); });
      hits(d.ride, d.rideVol == null ? 0.08 : d.rideVol, function (m, o, t, v) { m.ride(o, t, v); });
      hits(d.shaker, d.shakerVol == null ? 0.08 : d.shakerVol, function (m, o, t, v) { m.shaker(o, t, v); });
      hits(d.clap, d.clapVol == null ? 0.14 : d.clapVol, function (m, o, t, v) { m.clap(o, t, v); });
      hits(d.rim, d.rimVol == null ? 0.1 : d.rimVol, function (m, o, t, v) { m.rim(o, t, v); });
      if (d.crash && bar % 8 === 0) this.crash(out, when, 0.05 * vol);
      // лёгкая «заправка» в конце четырёхтактовой фразы
      if (d.fill && bar % 4 === 3) {
        this.snare(out, when + 14 * sd, 0.02 * vol);
        this.snare(out, when + 15 * sd, 0.03 * vol);
      }
    },

    /* ---------------- инструменты ---------------- */
    midi: function (n) { return 440 * Math.pow(2, (n - 69) / 12); },
    voice: function (inst, out, when, dur, midi, vol, opt) {
      if (!this.ctx || !(vol > 0)) return;
      switch (inst) {
        case 'pad': this.pad(out, when, dur, midi, vol, opt); break;
        case 'strings': this.strings(out, when, dur, midi, vol, opt); break;
        case 'piano': this.piano(out, when, dur, midi, vol, opt); break;
        case 'rhodes': this.rhodes(out, when, dur, midi, vol, opt); break;
        case 'bell': this.bell(out, when, dur, midi, vol, opt); break;
        case 'bass': this.bass(out, when, dur, midi, vol, opt); break;
        case 'squarebass': this.squarebass(out, when, dur, midi, vol, opt); break;
        case 'pluck': this.pluck(out, when, dur, midi, vol, opt); break;
        case 'lead': this.lead(out, when, dur, midi, vol, opt); break;
        case 'chip': this.chip(out, when, dur, midi, vol, opt); break;
        case 'sub': this.sub(out, when, dur, midi, vol, opt); break;
        case 'heart': this.heart(out, when, dur, midi, vol, opt); break;
        case 'siren': this.siren(out, when, dur, midi, vol, opt); break;
        default: this.tone(out, when, dur, midi, 'sine', vol, opt);
      }
    },
    tone: function (out, when, dur, midi, type, vol, opt) {
      opt = opt || {};
      var c = this.ctx;
      if (!c) return;
      var f = this.midi(midi);
      var atk = opt.attack == null ? 0.008 : opt.attack;
      dur = Math.max(dur, atk + 0.06);
      var o = c.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, when);
      if (opt.bend) o.frequency.exponentialRampToValueAtTime(Math.max(16, f * opt.bend), when + (opt.bendDur || dur));
      if (opt.detune) o.detune.setValueAtTime(opt.detune, when);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), when + atk);
      if (opt.hold) g.gain.setValueAtTime(Math.max(0.0002, vol), when + atk + opt.hold);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      var node = o;
      if (opt.cutoff) {
        var filt = c.createBiquadFilter();
        filt.type = opt.filter || 'lowpass';
        filt.frequency.setValueAtTime(opt.cutoff, when);
        if (opt.cutoffTo) filt.frequency.exponentialRampToValueAtTime(Math.max(80, opt.cutoffTo), when + dur);
        filt.Q.value = opt.q == null ? 0.7 : opt.q;
        o.connect(filt);
        node = filt;
      }
      node.connect(g);
      g.connect(out);
      if (opt.vibrato) {
        var lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = opt.vibrato;
        lg.gain.value = f * (opt.depth || 0.006);
        lfo.connect(lg);
        lg.connect(o.frequency);
        lfo.start(when);
        lfo.stop(when + dur + 0.04);
      }
      o.start(when);
      o.stop(when + dur + 0.06);
    },
    pad: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      var c = this.ctx;
      if (!c) return;
      var f = this.midi(midi);
      var atk = opt.attack == null ? 0.6 : opt.attack;
      dur = Math.max(dur, atk + 0.3);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), when + atk);
      g.gain.setValueAtTime(Math.max(0.0002, vol), when + dur * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = opt.cutoff || 1200;
      filt.Q.value = 0.6;
      var o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = opt.wave || 'triangle';
      o1.frequency.value = f;
      o1.detune.value = -5;
      o2.type = opt.wave2 || opt.wave || 'triangle';
      o2.frequency.value = f;
      o2.detune.value = 7;
      var mix = c.createGain();
      mix.gain.value = 0.55;
      o1.connect(filt);
      o2.connect(mix);
      mix.connect(filt);
      if (opt.tremolo) {
        var trem = c.createGain();
        trem.gain.value = 1;
        var lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = opt.tremolo;
        lg.gain.value = opt.tremDepth == null ? 0.3 : opt.tremDepth;
        lfo.connect(lg);
        lg.connect(trem.gain);
        filt.connect(g);
        g.connect(trem);
        trem.connect(out);
        lfo.start(when);
        lfo.stop(when + dur + 0.06);
      } else {
        filt.connect(g);
        g.connect(out);
      }
      o1.start(when); o2.start(when);
      o1.stop(when + dur + 0.08); o2.stop(when + dur + 0.08);
    },
    strings: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      opt.wave = opt.wave || 'sawtooth';
      opt.wave2 = opt.wave2 || 'sawtooth';
      opt.cutoff = opt.cutoff || 900;
      opt.attack = opt.attack == null ? 1.1 : opt.attack;
      this.pad(out, when, dur, midi, vol, opt);
    },
    piano: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      dur = Math.max(0.28, dur);
      var f = this.midi(midi);
      this.tone(out, when, dur, midi, opt.wave || 'triangle', vol, {
        attack: 0.005,
        cutoff: Math.min(6200, f * 7),
        cutoffTo: Math.max(480, f * 2.1),
        q: 0.5
      });
      this.tone(out, when, dur * 0.8, midi + 12, 'sine', vol * 0.16, { attack: 0.004 });
      if (opt.warm) this.tone(out, when, dur, midi - 12, 'sine', vol * 0.12, { attack: 0.01 });
    },
    rhodes: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      dur = Math.max(0.3, dur);
      this.tone(out, when, dur, midi, 'sine', vol, {
        attack: 0.012,
        cutoff: 1900,
        cutoffTo: 900,
        q: 0.4
      });
      this.tone(out, when, dur * 0.7, midi + 12, 'triangle', vol * 0.2, { attack: 0.008 });
      this.tone(out, when, dur * 0.5, midi + 19, 'sine', vol * 0.06, { attack: 0.01 });
    },
    bell: function (out, when, dur, midi, vol, opt) {
      dur = Math.max(0.4, dur);
      this.tone(out, when, dur, midi, 'sine', vol, { attack: 0.004 });
      this.tone(out, when, dur * 0.7, midi + 12, 'sine', vol * 0.22, { attack: 0.003 });
      this.tone(out, when, Math.min(dur, 0.5), midi + 24, 'sine', vol * 0.08, { attack: 0.002 });
    },
    bass: function (out, when, dur, midi, vol) {
      dur = Math.max(0.12, dur);
      var f = this.midi(midi);
      this.tone(out, when, dur, midi, 'triangle', vol, {
        attack: 0.012, cutoff: Math.max(260, f * 4.5), q: 0.9, bend: 0.992
      });
      this.tone(out, when, dur * 0.94, midi - 12, 'sine', vol * 0.5, { attack: 0.01 });
    },
    squarebass: function (out, when, dur, midi, vol) {
      this.tone(out, when, dur, midi, 'square', vol, {
        attack: 0.006, cutoff: 520, q: 1.2
      });
    },
    pluck: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      dur = Math.max(0.12, dur);
      var f = this.midi(midi);
      this.tone(out, when, dur, midi, opt.wave || 'triangle', vol, {
        attack: 0.006, cutoff: Math.min(5200, f * 6), cutoffTo: Math.max(600, f * 1.8), q: 0.6
      });
      this.tone(out, when, dur * 0.6, midi + 12, 'sine', vol * 0.14, { attack: 0.004 });
    },
    lead: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      dur = Math.max(0.2, dur);
      this.tone(out, when, dur, midi, opt.wave || 'triangle', vol, {
        attack: opt.attack == null ? 0.02 : opt.attack,
        cutoff: opt.cutoff || 2200,
        cutoffTo: opt.cutoffTo || 1500,
        q: 0.5,
        vibrato: opt.vibrato || 0,
        depth: 0.004
      });
    },
    chip: function (out, when, dur, midi, vol) {
      this.tone(out, when, Math.max(0.08, dur), midi, 'square', vol, {
        attack: 0.004, cutoff: 3400, q: 0.4
      });
    },
    sub: function (out, when, dur, midi, vol, opt) {
      opt = opt || {};
      dur = Math.max(0.6, dur);
      this.tone(out, when, dur, midi, 'sine', vol, { attack: opt.attack || 0.5 });
      this.tone(out, when, dur, midi + 12, 'sawtooth', vol * 0.12, {
        attack: opt.attack || 0.7, cutoff: 130
      });
      // слышимый на телефоне «корпус» низкого дрона
      this.tone(out, when, dur, midi + 24, 'triangle', vol * 0.16, {
        attack: (opt.attack || 0.5) * 1.4, cutoff: 320
      });
    },
    heart: function (out, when, dur, midi, vol) {
      this.tone(out, when, 0.32, midi, 'sine', vol, {
        attack: 0.004, bend: 0.55, bendDur: 0.24, cutoff: 190
      });
      // тело удара: без него сердцебиение теряется в динамике телефона
      this.tone(out, when, 0.14, midi + 24, 'triangle', vol * 0.32, {
        attack: 0.003, bend: 0.72, bendDur: 0.1, cutoff: 340
      });
      this.noiseHit(out, when, 0.06, vol * 0.18, 240, 'lowpass');
    },
    siren: function (out, when, dur, midi, vol) {
      var f = this.midi(midi || 62);
      var c = this.ctx;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, when);
      o.frequency.exponentialRampToValueAtTime(f * 0.62, when + dur);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      var filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 900;
      var lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5.2;
      lg.gain.value = f * 0.02;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(filt); filt.connect(g); g.connect(out);
      o.start(when); lfo.start(when);
      o.stop(when + dur + 0.05); lfo.stop(when + dur + 0.05);
    },

    /* ---------------- перкуссия ---------------- */
    noiseHit: function (out, when, dur, vol, freq, type, q) {
      var c = this.ctx;
      if (!c || !this.noiseBuf) return;
      dur = Math.max(0.02, dur);
      var src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      var f = c.createBiquadFilter();
      f.type = type || 'highpass';
      f.frequency.setValueAtTime(freq || 4000, when);
      f.Q.value = q == null ? 1 : q;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      src.connect(f); f.connect(g); g.connect(out);
      var maxOffset = Math.max(0, 4 - dur - 0.1);
      src.start(when, Math.random() * maxOffset, dur + 0.03);
    },
    kick: function (out, when, vol) {
      this.tone(out, when, 0.3, 36, 'sine', vol, {
        attack: 0.003, bend: 0.45, bendDur: 0.18, cutoff: 220
      });
      this.noiseHit(out, when, 0.03, vol * 0.22, 1200, 'lowpass');
    },
    snare: function (out, when, vol) {
      this.noiseHit(out, when, 0.17, vol, 1900, 'bandpass', 0.8);
      this.tone(out, when, 0.1, 50, 'triangle', vol * 0.3, { attack: 0.002, bend: 0.7, bendDur: 0.08 });
    },
    hat: function (out, when, vol) {
      this.noiseHit(out, when, 0.035, vol, 7800, 'highpass');
    },
    openhat: function (out, when, vol) {
      this.noiseHit(out, when, 0.2, vol, 7600, 'highpass');
    },
    ride: function (out, when, vol) {
      this.noiseHit(out, when, 0.4, vol, 5900, 'highpass');
      this.tone(out, when, 0.28, 84, 'sine', vol * 0.22, { attack: 0.003 });
    },
    shaker: function (out, when, vol) {
      this.noiseHit(out, when, 0.06, vol, 4800, 'bandpass', 2.2);
    },
    clap: function (out, when, vol) {
      this.noiseHit(out, when, 0.07, vol, 1700, 'bandpass', 1.2);
      this.noiseHit(out, when + 0.012, 0.06, vol * 0.8, 1900, 'bandpass', 1.2);
      this.noiseHit(out, when + 0.026, 0.08, vol * 0.6, 2100, 'bandpass', 1.2);
    },
    rim: function (out, when, vol) {
      this.noiseHit(out, when, 0.045, vol, 2400, 'bandpass', 2.5);
      this.tone(out, when, 0.05, 62, 'triangle', vol * 0.4, { attack: 0.002 });
    },
    crash: function (out, when, vol) {
      this.noiseHit(out, when, 1.1, vol, 5200, 'highpass');
      this.noiseHit(out, when, 0.5, vol * 0.5, 8000, 'highpass');
    },

    /* ---------------- радио-помеха при входе мафии ---------------- */
    cutRadio: function () {
      var a = PVZ.audio;
      if (!a.ready || !a.ctx || a.muted) return;
      var c = a.ctx, t = c.currentTime;
      var len = Math.floor(c.sampleRate * 0.45);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        var k = i / len;
        d[i] = (Math.random() * 2 - 1) * (1 - k) * (0.4 + (i % 97 < 12 ? 0.6 : 0));
      }
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.4);
      f.Q.value = 0.6;
      var g = c.createGain();
      g.gain.setValueAtTime(0.13, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(f); f.connect(g); g.connect(a.master);
      src.start(t);
    }
  });

  /* Эфиры радио: индекс совпадает с apps.RADIO */
  M.TRACKS = [
    { id: 'lofi', name: 'Lo-Fi', bpm: 76, theme: 'lofi' },
    { id: 'pvz', name: 'Радио ПВЗ', bpm: 0, theme: null },
    { id: 'night', name: 'Ночной эфир', bpm: 100, theme: 'night' },
    { id: 'jazz', name: 'Джаз-кафе', bpm: 108, theme: 'jazz' },
    { id: 'chip', name: '8-бит смена', bpm: 124, theme: 'chip' },
    { id: 'classic', name: 'Классика', bpm: 66, theme: 'classic' }
  ];

  /* ---------------- визит мафии: слои поверх темы ---------------- */
  /* Никакой мелодии — только давление: суб-дрон, сердцебиение, металл,
     шёпот, скрипящий кластер малой секунды и редкий вой. */
  function mafiaBar(engine, out, when, bar, sd, t) {
    engine.voice('sub', out, when, sd * 16, 26 - (bar % 4 === 3 ? 2 : 0), 0.085 + t * 0.05, { attack: 0.6 });
    // сердцебиение: «луб-даб»; с ростом напряжения бьётся чаще
    var period = t > 0.55 ? 4 : 8;
    for (var hb = 0; hb < 16; hb += period) {
      engine.voice('heart', out, when + hb * sd, 0.3, 31, 0.14 + t * 0.05, {});
      engine.voice('heart', out, when + (hb + 1.5) * sd, 0.26, 31, 0.09 + t * 0.04, {});
    }
    // скрежет по металлу
    if (bar % 2 === 1) engine.noiseHit(out, when + 6 * sd, 0.5, 0.02 + t * 0.012, 1800, 'bandpass', 9);
    // кластер малой секунды в высоком регистре — «неправильная» нота
    if (bar % 4 === 2) {
      engine.voice('strings', out, when, sd * 15, 74, 0.016, { attack: 1.3, cutoff: 2500, tremolo: 6.4, tremDepth: 0.5 });
      engine.voice('strings', out, when, sd * 15, 75, 0.012, { attack: 1.5, cutoff: 2500, tremolo: 6.9, tremDepth: 0.5 });
    }
    // шёпот из подсобки
    if (bar % 2 === 0 && t > 0.4) {
      engine.noiseHit(out, when + (11 + bar % 3) * sd, 0.6, 0.012 + 0.01 * t, 4200, 'highpass');
    }
    // редкий вой
    if (bar % 8 === 5) engine.voice('siren', out, when, sd * 12, 62, 0.018, {});
    // далёкий грохот
    if (bar % 8 === 7) {
      engine.voice('sub', out, when, sd * 8, 22, 0.07, { attack: 0.08 });
      engine.noiseHit(out, when, 1.2, 0.028, 200, 'lowpass');
    }
    // шаги по складу
    if (bar % 4 === 1) {
      engine.noiseHit(out, when + 13 * sd, 0.18, 0.03, 2600, 'bandpass', 6);
      engine.voice('bell', out, when + 13 * sd, 0.4, 50, 0.018, {});
    }
  }

  /* ---------------- сами темы ---------------- */
  /* Формат события: [шаг 1/16, нота MIDI, длительность в шагах, громкость 0..1].
     Аккорды записаны по тактам, поэтому тему легко читать и править. */
  M.THEMES = {
    /* МЕНЮ: тёплая, немного загадочная тема пункта */
    menu: {
      id: 'menu', bpm: 76, swing: 0.55, reverb: 0.38, breakEvery: 32,
      chords: [[50, 53, 57, 60], [46, 50, 53, 57], [41, 45, 48, 52], [48, 52, 55, 59]],
      pad: { inst: 'pad', vol: 0.026, attack: 0.9, cutoff: 1200, wave: 'triangle', bars: 1 },
      bass: [
        [[0, 38, 10, 0.8], [10, 45, 3, 0.45]],
        [[0, 34, 10, 0.75], [10, 41, 3, 0.4]],
        [[0, 41, 10, 0.75], [10, 48, 3, 0.4]],
        [[0, 36, 10, 0.8], [10, 43, 3, 0.45]]
      ],
      bassVol: 0.055,
      melody: [
        [[0, 74, 4, 0.75], [6, 77, 2, 0.5], [8, 81, 4, 0.6], [14, 77, 2, 0.45]],
        [[0, 74, 4, 0.65], [6, 70, 2, 0.45], [8, 69, 6, 0.55]],
        [[0, 72, 2, 0.5], [2, 77, 4, 0.6], [8, 81, 3, 0.55], [12, 79, 2, 0.45]],
        [[0, 76, 4, 0.55], [6, 74, 2, 0.45], [8, 72, 6, 0.5]],
        [[0, 74, 3, 0.6], [4, 77, 2, 0.5], [6, 81, 4, 0.6], [12, 79, 2, 0.45]],
        [[0, 77, 4, 0.55], [6, 74, 2, 0.45], [8, 70, 6, 0.5]],
        [[0, 72, 2, 0.45], [2, 76, 2, 0.5], [4, 79, 3, 0.55], [8, 81, 3, 0.5], [12, 84, 3, 0.55]],
        [[0, 79, 2, 0.5], [2, 77, 2, 0.45], [4, 74, 8, 0.55]]
      ],
      melodyInst: 'piano', melodyVol: 0.07, melodyInst2: 'rhodes',
      arp: { steps: [12], notes: [2], octave: 24, vol: 0.012, inst: 'bell', everyBars: 2 }
    },

    /* УТРО: светлое, неспешное, с колокольчиками */
    morning: {
      id: 'morning', bpm: 84, swing: 0.57, reverb: 0.3, tempoLift: 5, breakEvery: 16,
      chords: [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 60]],
      pad: { inst: 'pad', vol: 0.027, attack: 0.8, cutoff: 1500, wave: 'triangle', bars: 1 },
      bass: [
        [[0, 43, 5, 0.9], [6, 50, 2, 0.55], [8, 43, 4, 0.8], [12, 47, 3, 0.5]],
        [[0, 40, 5, 0.9], [6, 47, 2, 0.55], [8, 40, 4, 0.8], [12, 43, 3, 0.5]],
        [[0, 36, 5, 0.9], [6, 43, 2, 0.55], [8, 36, 4, 0.8], [12, 40, 3, 0.5]],
        [[0, 38, 5, 0.9], [6, 45, 2, 0.55], [8, 38, 4, 0.8], [12, 42, 3, 0.5]]
      ],
      bassVol: 0.06,
      melody: [
        [[0, 74, 3, 0.7], [4, 76, 2, 0.55], [6, 79, 4, 0.65], [12, 76, 3, 0.5]],
        [[0, 74, 2, 0.6], [2, 71, 2, 0.5], [4, 74, 4, 0.65], [10, 76, 2, 0.5], [12, 74, 3, 0.45]],
        [[0, 72, 3, 0.65], [4, 76, 2, 0.55], [6, 79, 4, 0.68], [12, 81, 3, 0.55]],
        [[0, 79, 2, 0.6], [2, 76, 2, 0.5], [4, 74, 6, 0.65], [12, 71, 3, 0.45]],
        [[0, 74, 3, 0.7], [4, 76, 2, 0.55], [6, 79, 2, 0.6], [8, 81, 4, 0.7], [12, 79, 3, 0.5]],
        [[0, 76, 3, 0.6], [4, 74, 2, 0.5], [6, 71, 6, 0.65], [12, 74, 3, 0.45]],
        [[0, 72, 3, 0.65], [4, 76, 2, 0.55], [6, 79, 2, 0.58], [8, 84, 4, 0.7], [12, 83, 3, 0.5]],
        [[0, 81, 2, 0.55], [2, 79, 2, 0.5], [4, 76, 4, 0.6], [8, 74, 6, 0.6]]
      ],
      melodyInst: 'piano', melodyVol: 0.065, melodyInst2: 'rhodes',
      arp: { steps: [4, 10, 14], notes: [2, 1, 2], octave: 24, vol: 0.011, inst: 'bell', everyBars: 2 },
      drums: {
        kick: [0, 10], kickVol: 0.4,
        hat: [2, 6, 10, 14], hatVol: 0.09,
        shaker: [4, 12], shakerVol: 0.07,
        rim: [8], rimVol: 0.06
      }
    },

    /* ДЕНЬ: бодрая рабочая тема, но без суеты */
    day: {
      id: 'day', bpm: 108, swing: 0.53, reverb: 0.2, tempoLift: 10, breakEvery: 16,
      chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]],
      pad: { inst: 'pad', vol: 0.018, attack: 0.6, cutoff: 1700, wave: 'triangle', bars: 1 },
      bass: [
        [[0, 36, 2, 0.85], [2, 36, 1, 0.45], [4, 43, 2, 0.75], [7, 36, 1, 0.45], [8, 36, 2, 0.8], [10, 43, 1, 0.45], [12, 48, 2, 0.65], [14, 43, 1, 0.4]],
        [[0, 45, 2, 0.85], [2, 45, 1, 0.45], [4, 52, 2, 0.75], [7, 45, 1, 0.45], [8, 45, 2, 0.8], [10, 52, 1, 0.45], [12, 57, 2, 0.65], [14, 52, 1, 0.4]],
        [[0, 41, 2, 0.85], [2, 41, 1, 0.45], [4, 48, 2, 0.75], [7, 41, 1, 0.45], [8, 41, 2, 0.8], [10, 48, 1, 0.45], [12, 53, 2, 0.65], [14, 48, 1, 0.4]],
        [[0, 43, 2, 0.85], [2, 43, 1, 0.45], [4, 50, 2, 0.75], [7, 43, 1, 0.45], [8, 43, 2, 0.8], [10, 50, 1, 0.45], [12, 55, 2, 0.65], [14, 50, 1, 0.4]]
      ],
      bassVol: 0.055,
      melody: [
        [[0, 72, 2, 0.65], [2, 76, 2, 0.6], [4, 79, 3, 0.75], [8, 76, 2, 0.55], [10, 72, 2, 0.5], [12, 74, 3, 0.55]],
        [[0, 76, 2, 0.65], [2, 72, 2, 0.5], [4, 69, 3, 0.65], [8, 72, 2, 0.55], [10, 76, 2, 0.6], [12, 79, 4, 0.65]],
        [[0, 77, 2, 0.65], [2, 81, 2, 0.65], [4, 84, 4, 0.75], [8, 81, 2, 0.55], [10, 77, 2, 0.5], [12, 76, 3, 0.55]],
        [[0, 74, 2, 0.6], [2, 79, 2, 0.65], [4, 83, 3, 0.7], [8, 79, 2, 0.55], [10, 74, 2, 0.5], [12, 71, 3, 0.5]],
        [[0, 84, 2, 0.75], [2, 81, 2, 0.55], [4, 79, 3, 0.65], [8, 76, 2, 0.55], [10, 74, 2, 0.5], [12, 76, 2, 0.55]],
        [[0, 72, 2, 0.65], [2, 76, 2, 0.6], [4, 79, 4, 0.7], [12, 76, 2, 0.5]],
        [[0, 77, 2, 0.65], [2, 81, 2, 0.65], [4, 84, 3, 0.75], [8, 86, 2, 0.6], [10, 84, 2, 0.55], [12, 81, 3, 0.55]],
        [[0, 79, 2, 0.6], [2, 76, 2, 0.55], [4, 74, 2, 0.5], [6, 72, 6, 0.65]]
      ],
      melodyInst: 'pluck', melodyVol: 0.055, melodyInst2: 'piano',
      arp: { steps: [2, 6, 10, 14], notes: [1, 2, 3, 2], octave: 12, vol: 0.012, inst: 'piano', everyBars: 1 },
      drums: {
        kick: [0, 8], kickVol: 0.5,
        snare: [4, 12], snareVol: 0.3,
        hat: [0, 2, 4, 6, 8, 10, 12, 14], hatVol: 0.1,
        openhat: [6, 14], openhatVol: 0.08,
        shaker: [2, 6, 10, 14], shakerVol: 0.08
      }
    },

    /* ВЕЧЕР: тёплый, усталый, с ноткой грусти */
    evening: {
      id: 'evening', bpm: 72, swing: 0.56, reverb: 0.38, tempoLift: 4, breakEvery: 16,
      chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [52, 56, 59, 62]],
      pad: { inst: 'strings', vol: 0.022, attack: 1.2, cutoff: 900, tremolo: 4.2, tremDepth: 0.22, bars: 1 },
      bass: [
        [[0, 45, 6, 0.8], [6, 45, 2, 0.5], [8, 52, 4, 0.55], [12, 48, 3, 0.4]],
        [[0, 41, 6, 0.75], [6, 41, 2, 0.45], [8, 48, 4, 0.5], [12, 45, 3, 0.4]],
        [[0, 36, 6, 0.75], [6, 36, 2, 0.45], [8, 43, 4, 0.5], [12, 40, 3, 0.4]],
        [[0, 40, 6, 0.8], [6, 40, 2, 0.45], [8, 47, 4, 0.5], [12, 44, 3, 0.4]]
      ],
      bassVol: 0.06,
      melody: [
        [[0, 76, 4, 0.7], [6, 72, 2, 0.5], [8, 69, 4, 0.55], [14, 71, 2, 0.4]],
        [[0, 72, 4, 0.6], [6, 69, 2, 0.45], [8, 65, 6, 0.5]],
        [[0, 67, 2, 0.5], [2, 72, 4, 0.6], [8, 76, 4, 0.55], [12, 74, 2, 0.45]],
        [[0, 71, 4, 0.55], [6, 68, 2, 0.45], [8, 64, 6, 0.5]],
        [[0, 76, 3, 0.6], [4, 79, 4, 0.65], [10, 76, 2, 0.45], [12, 72, 4, 0.5]],
        [[0, 69, 4, 0.55], [6, 72, 2, 0.5], [8, 65, 6, 0.5]],
        [[0, 67, 2, 0.45], [2, 72, 3, 0.55], [6, 76, 2, 0.5], [8, 79, 4, 0.6], [12, 81, 3, 0.5]],
        [[0, 80, 2, 0.5], [2, 76, 2, 0.45], [4, 71, 8, 0.55]]
      ],
      melodyInst: 'rhodes', melodyVol: 0.075, melodyInst2: 'piano',
      drums: {
        kick: [0, 8], kickVol: 0.38,
        snare: [4, 12], snareVol: 0.13,
        ride: [0, 2, 4, 6, 8, 10, 12, 14], rideVol: 0.065,
        fill: true
      }
    },

    /* МАФИЯ: медленно, низко, неудобно. Тритон и малая секунда вместо мелодии */
    mafia: {
      id: 'mafia', bpm: 56, swing: 0.5, reverb: 0.5, tempoLift: 9,
      chords: [[50, 53, 57, 62], [51, 54, 58, 63], [50, 53, 57, 62], [46, 50, 53, 58]],
      pad: { inst: 'strings', vol: 0.022, attack: 1.6, cutoff: 620, tremolo: 5.2, tremDepth: 0.45, bars: 1 },
      bass: [
        [[0, 38, 12, 0.9]],
        [[0, 39, 12, 0.85]],
        [[0, 38, 12, 0.9]],
        [[0, 46, 12, 0.8]]
      ],
      bassVol: 0.055,
      melody: [
        [[8, 86, 6, 0.35]],
        [[4, 87, 4, 0.3], [12, 84, 4, 0.25]],
        [[8, 86, 6, 0.3], [14, 82, 2, 0.25]],
        [[4, 81, 8, 0.3]],
        [[8, 86, 4, 0.35], [12, 85, 4, 0.3]],
        [[4, 87, 4, 0.28], [10, 86, 2, 0.22]],
        [[8, 84, 6, 0.3], [14, 80, 2, 0.2]],
        [[4, 82, 8, 0.28]]
      ],
      melodyInst: 'bell', melodyVol: 0.05,
      onBar: mafiaBar
    },

    /* RADIO: Lo-Fi — ленивые септаккорды и винил */
    lofi: {
      id: 'lofi', bpm: 76, swing: 0.56, reverb: 0.3, tempoLift: 4, vinyl: true, vol: 1.2, breakEvery: 16,
      chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55]],
      pad: { inst: 'rhodes', vol: 0.02, attack: 0.5, cutoff: 1500, bars: 1 },
      bass: [
        [[0, 38, 6, 0.7], [8, 38, 4, 0.5], [12, 45, 3, 0.35]],
        [[0, 43, 6, 0.65], [8, 43, 4, 0.5], [12, 50, 3, 0.35]],
        [[0, 36, 6, 0.65], [8, 36, 4, 0.5], [12, 43, 3, 0.35]],
        [[0, 45, 6, 0.7], [8, 45, 4, 0.5], [12, 52, 3, 0.35]]
      ],
      bassVol: 0.06,
      melody: [
        [[0, 77, 4, 0.55], [8, 74, 2, 0.4], [10, 72, 4, 0.45], [14, 69, 2, 0.35]],
        [[0, 74, 4, 0.5], [8, 71, 4, 0.4], [12, 67, 4, 0.35]],
        [[0, 76, 4, 0.5], [8, 72, 2, 0.4], [10, 76, 4, 0.45], [14, 79, 2, 0.35]],
        [[0, 81, 6, 0.5], [8, 76, 4, 0.4], [12, 72, 4, 0.35]],
        [[0, 77, 4, 0.5], [8, 81, 2, 0.4], [10, 79, 2, 0.35], [12, 76, 4, 0.4]],
        [[0, 74, 4, 0.45], [8, 71, 2, 0.35], [10, 74, 4, 0.4], [14, 77, 2, 0.3]],
        [[0, 72, 4, 0.45], [8, 69, 2, 0.35], [10, 72, 4, 0.4], [14, 76, 2, 0.3]],
        [[0, 74, 8, 0.5], [12, 72, 4, 0.35]]
      ],
      melodyInst: 'rhodes', melodyVol: 0.06, melodyInst2: 'piano',
      arp: { steps: [2, 6, 10, 14], notes: [1, 2, 3, 1], octave: 0, vol: 0.02, inst: 'rhodes', dur: 1.6 },
      drums: {
        kick: [0, 6, 10], kickVol: 0.42,
        snare: [4, 12], snareVol: 0.24,
        hat: [2, 6, 10, 14], hatVol: 0.07
      }
    },

    /* RADIO: Ночной эфир — синтвейв */
    night: {
      id: 'night', bpm: 100, swing: 0.5, reverb: 0.28, tempoLift: 8, breakEvery: 16,
      chords: [[45, 48, 52, 55], [41, 45, 48, 52], [48, 52, 55, 59], [43, 47, 50, 53]],
      pad: { inst: 'strings', vol: 0.018, attack: 0.8, cutoff: 1600, bars: 1 },
      bass: [
        [[0, 45, 2, 0.8], [2, 45, 1, 0.4], [4, 45, 2, 0.65], [6, 45, 1, 0.4], [8, 45, 2, 0.75], [10, 45, 1, 0.4], [12, 45, 2, 0.65], [14, 52, 1, 0.45]],
        [[0, 41, 2, 0.8], [2, 41, 1, 0.4], [4, 41, 2, 0.65], [6, 41, 1, 0.4], [8, 41, 2, 0.75], [10, 41, 1, 0.4], [12, 41, 2, 0.65], [14, 48, 1, 0.45]],
        [[0, 36, 2, 0.8], [2, 36, 1, 0.4], [4, 36, 2, 0.65], [6, 36, 1, 0.4], [8, 36, 2, 0.75], [10, 36, 1, 0.4], [12, 36, 2, 0.65], [14, 43, 1, 0.45]],
        [[0, 43, 2, 0.8], [2, 43, 1, 0.4], [4, 43, 2, 0.65], [6, 43, 1, 0.4], [8, 43, 2, 0.75], [10, 43, 1, 0.4], [12, 43, 2, 0.65], [14, 50, 1, 0.45]]
      ],
      bassInst: 'squarebass', bassVol: 0.045,
      melody: [
        [[0, 69, 4, 0.55], [8, 72, 4, 0.5], [12, 76, 2, 0.45]],
        [[0, 74, 4, 0.5], [8, 69, 4, 0.45], [12, 67, 2, 0.4]],
        [[0, 72, 4, 0.5], [8, 76, 4, 0.5], [12, 79, 2, 0.45]],
        [[0, 74, 6, 0.45], [8, 71, 4, 0.4], [12, 67, 4, 0.4]],
        [[0, 69, 4, 0.55], [4, 72, 2, 0.4], [8, 76, 4, 0.5], [12, 74, 2, 0.4]],
        [[0, 72, 4, 0.5], [8, 74, 4, 0.45], [12, 77, 2, 0.4]],
        [[0, 76, 4, 0.5], [8, 79, 4, 0.5], [12, 84, 2, 0.45]],
        [[0, 81, 4, 0.5], [8, 79, 2, 0.4], [10, 76, 6, 0.45]]
      ],
      melodyInst: 'lead', melodyVol: 0.045, melodyInst2: 'piano',
      melodyOpt: { wave: 'sawtooth', cutoff: 1900, vibrato: 4.8, attack: 0.04 },
      arp: { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 1, 2, 3, 2, 1, 0, 1], octave: 24, vol: 0.011, inst: 'lead', dur: 1.3 },
      drums: {
        kick: [0, 8], kickVol: 0.5,
        snare: [4, 12], snareVol: 0.28,
        hat: [0, 2, 4, 6, 8, 10, 12, 14], hatVol: 0.06,
        openhat: [14], openhatVol: 0.07,
        crash: true
      }
    },

    /* RADIO: Джаз-кафе — свинг, контрабас, щётки */
    jazz: {
      id: 'jazz', bpm: 108, swing: 0.62, reverb: 0.3, tempoLift: 6, vol: 1.45, breakEvery: 16,
      chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]],
      pad: { inst: 'rhodes', vol: 0.014, attack: 0.4, cutoff: 1700, bars: 1 },
      bass: [
        [[0, 38, 4, 0.8], [4, 41, 4, 0.7], [8, 45, 4, 0.75], [12, 48, 4, 0.6]],
        [[0, 43, 4, 0.8], [4, 47, 4, 0.7], [8, 50, 4, 0.75], [12, 53, 4, 0.6]],
        [[0, 36, 4, 0.8], [4, 40, 4, 0.7], [8, 43, 4, 0.75], [12, 47, 4, 0.6]],
        [[0, 45, 4, 0.8], [4, 49, 4, 0.7], [8, 52, 4, 0.75], [12, 55, 4, 0.6]]
      ],
      bassVol: 0.055,
      melody: [
        [[0, 72, 3, 0.55], [4, 71, 2, 0.45], [6, 72, 2, 0.5], [8, 76, 4, 0.55], [14, 74, 2, 0.4]],
        [[0, 72, 2, 0.45], [2, 69, 2, 0.4], [4, 67, 4, 0.5], [8, 71, 2, 0.45], [10, 74, 2, 0.5], [12, 72, 3, 0.45]],
        [[0, 76, 4, 0.55], [6, 74, 2, 0.45], [8, 72, 6, 0.55]],
        [[0, 69, 4, 0.5], [6, 72, 2, 0.4], [8, 76, 4, 0.5], [12, 79, 3, 0.45]],
        [[0, 81, 4, 0.55], [6, 79, 2, 0.45], [8, 76, 4, 0.5], [12, 74, 2, 0.4]],
        [[0, 72, 4, 0.5], [6, 71, 2, 0.4], [8, 69, 4, 0.45], [12, 67, 4, 0.4]],
        [[0, 69, 2, 0.4], [2, 72, 2, 0.45], [4, 76, 2, 0.5], [6, 79, 2, 0.5], [8, 81, 6, 0.55]],
        [[0, 79, 2, 0.45], [2, 76, 2, 0.4], [4, 72, 8, 0.5]]
      ],
      melodyInst: 'lead', melodyVol: 0.05, melodyInst2: 'piano',
      melodyOpt: { wave: 'triangle', cutoff: 1900, vibrato: 5.2, attack: 0.03 },
      arp: { steps: [2, 6, 10, 14], notes: [0, 2, 1, 3], octave: 0, vol: 0.02, inst: 'piano', dur: 2 },
      drums: {
        kick: [0, 8], kickVol: 0.22,
        snare: [4, 12], snareVol: 0.1,
        ride: [0, 2, 4, 6, 8, 10, 12, 14], rideVol: 0.07,
        hat: [2, 6, 10, 14], hatVol: 0.035,
        fill: true
      }
    },

    /* RADIO: 8-бит смена — чиптюн */
    chip: {
      id: 'chip', bpm: 124, swing: 0.5, reverb: 0.14, tempoLift: 10, breakEvery: 16,
      chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]],
      pad: { inst: 'pad', vol: 0.012, attack: 0.3, cutoff: 2400, wave: 'square', bars: 1 },
      bass: [
        [[0, 36, 2, 0.7], [2, 36, 1, 0.4], [4, 43, 2, 0.6], [6, 36, 1, 0.4], [8, 36, 2, 0.65], [10, 43, 1, 0.4], [12, 48, 2, 0.55], [14, 43, 1, 0.4]],
        [[0, 45, 2, 0.7], [2, 45, 1, 0.4], [4, 52, 2, 0.6], [6, 45, 1, 0.4], [8, 45, 2, 0.65], [10, 52, 1, 0.4], [12, 57, 2, 0.55], [14, 52, 1, 0.4]],
        [[0, 41, 2, 0.7], [2, 41, 1, 0.4], [4, 48, 2, 0.6], [6, 41, 1, 0.4], [8, 41, 2, 0.65], [10, 48, 1, 0.4], [12, 53, 2, 0.55], [14, 48, 1, 0.4]],
        [[0, 43, 2, 0.7], [2, 43, 1, 0.4], [4, 50, 2, 0.6], [6, 43, 1, 0.4], [8, 43, 2, 0.65], [10, 50, 1, 0.4], [12, 55, 2, 0.55], [14, 50, 1, 0.4]]
      ],
      bassInst: 'squarebass', bassVol: 0.04,
      melody: [
        [[0, 72, 2, 0.6], [2, 76, 2, 0.5], [4, 79, 2, 0.55], [6, 76, 2, 0.45], [8, 84, 4, 0.6], [12, 79, 2, 0.45]],
        [[0, 76, 2, 0.55], [2, 72, 2, 0.45], [4, 69, 4, 0.5], [8, 72, 2, 0.45], [10, 76, 2, 0.5], [12, 79, 2, 0.45]],
        [[0, 77, 2, 0.55], [2, 81, 2, 0.5], [4, 84, 4, 0.6], [8, 81, 2, 0.45], [10, 77, 2, 0.45], [12, 76, 2, 0.4]],
        [[0, 74, 2, 0.5], [2, 79, 2, 0.5], [4, 83, 4, 0.55], [8, 79, 2, 0.45], [10, 74, 2, 0.4], [12, 71, 4, 0.45]],
        [[0, 84, 2, 0.6], [2, 81, 2, 0.5], [4, 79, 2, 0.5], [6, 76, 2, 0.45], [8, 79, 4, 0.55], [12, 84, 2, 0.45]],
        [[0, 81, 2, 0.5], [2, 76, 2, 0.45], [4, 72, 4, 0.5], [8, 76, 2, 0.45], [10, 79, 2, 0.5], [12, 84, 2, 0.45]],
        [[0, 86, 2, 0.55], [2, 84, 2, 0.5], [4, 81, 2, 0.5], [6, 79, 2, 0.45], [8, 77, 4, 0.5], [12, 81, 2, 0.45]],
        [[0, 79, 2, 0.5], [2, 76, 2, 0.45], [4, 72, 6, 0.5]]
      ],
      melodyInst: 'chip', melodyVol: 0.045,
      arp: { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 1, 2, 3, 2, 1, 2, 3], octave: 24, vol: 0.007, inst: 'chip', dur: 1 },
      drums: {
        kick: [0, 8], kickVol: 0.45,
        snare: [4, 12], snareVol: 0.22,
        hat: [0, 2, 4, 6, 8, 10, 12, 14], hatVol: 0.06,
        crash: true
      }
    },

    /* RADIO: Классика — фортепианные арпеджио и струнные */
    classic: {
      id: 'classic', bpm: 66, swing: 0.5, reverb: 0.48, tempoLift: 4, vol: 1.18, breakEvery: 24,
      chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]],
      pad: { inst: 'strings', vol: 0.023, attack: 1.4, cutoff: 1300, bars: 1 },
      bass: [
        [[0, 36, 14, 0.7]],
        [[0, 45, 14, 0.65]],
        [[0, 41, 14, 0.65]],
        [[0, 43, 14, 0.65]]
      ],
      bassVol: 0.05,
      melody: [
        [[0, 76, 4, 0.55], [6, 79, 2, 0.45], [8, 84, 6, 0.55]],
        [[0, 81, 4, 0.5], [6, 76, 2, 0.45], [8, 72, 6, 0.5]],
        [[0, 77, 4, 0.5], [6, 81, 2, 0.45], [8, 84, 4, 0.55], [12, 81, 2, 0.4]],
        [[0, 79, 4, 0.5], [6, 74, 2, 0.4], [8, 71, 6, 0.45]],
        [[0, 76, 3, 0.5], [4, 79, 2, 0.45], [6, 84, 4, 0.55], [12, 83, 2, 0.4]],
        [[0, 81, 4, 0.5], [6, 77, 2, 0.4], [8, 72, 6, 0.45]],
        [[0, 74, 2, 0.4], [2, 77, 2, 0.45], [4, 81, 3, 0.5], [8, 84, 3, 0.5], [12, 86, 3, 0.5]],
        [[0, 83, 2, 0.45], [2, 81, 2, 0.4], [4, 79, 8, 0.5]]
      ],
      melodyInst: 'piano', melodyVol: 0.055,
      arp: { steps: [0, 2, 4, 6, 8, 10, 12, 14], notes: [0, 1, 2, 3, 2, 1, 2, 1], octave: 12, vol: 0.014, inst: 'piano', dur: 1.2 }
    }
  };
})();
