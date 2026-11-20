/* Проверка музыкального движка: темы фаз, тема мафии и эфиры радио.
   Запуск: node tools/probe-music.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const errors = [];
const starts = { osc: [], noise: [] };

function fakeParam(name, value) {
  return {
    name: name,
    value: value,
    setValueAtTime(v) { this.value = v; return this; },
    linearRampToValueAtTime(v) { this.value = v; return this; },
    exponentialRampToValueAtTime(v) { this.value = v; return this; },
    setTargetAtTime(v) { this.value = v; return this; },
    cancelScheduledValues() { return this; }
  };
}
function connectable(extra) {
  return Object.assign({
    connect() { return this; },
    disconnect() { return this; }
  }, extra || {});
}
class FakeAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = connectable();
  }
  createGain() {
    return connectable({ gain: fakeParam('gain', 1) });
  }
  createOscillator() {
    const o = connectable({
      type: 'sine',
      frequency: fakeParam('frequency', 440),
      detune: fakeParam('detune', 0),
      start(when) { starts.osc.push(when || 0); },
      stop() {}
    });
    return o;
  }
  createBuffer(channels, len) {
    const data = [];
    for (let i = 0; i < channels; i++) data.push(new Float32Array(len));
    return { length: len, numberOfChannels: channels, getChannelData: (i) => data[i] };
  }
  createBufferSource() {
    return connectable({
      buffer: null,
      start(when) { starts.noise.push(when || 0); },
      stop() {}
    });
  }
  createBiquadFilter() {
    return connectable({
      type: 'lowpass',
      frequency: fakeParam('frequency', 1000),
      Q: fakeParam('Q', 1)
    });
  }
  createConvolver() {
    return connectable({ buffer: null, normalize: true });
  }
  createDynamicsCompressor() {
    return connectable({
      threshold: fakeParam('threshold', -24),
      knee: fakeParam('knee', 30),
      ratio: fakeParam('ratio', 12),
      attack: fakeParam('attack', 0.003),
      release: fakeParam('release', 0.25)
    });
  }
}

global.window = global;
global.AudioContext = FakeAudioContext;
global.setInterval = () => 1;
global.clearInterval = () => {};
global.PVZ = {};
global.document = { addEventListener() {} };

const root = path.join(__dirname, '..', 'game', 'src');
for (const f of ['core.js', 'music.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
}
const PVZ = global.PVZ;

function step(seconds, tension, mood, phase) {
  const n = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < n; i++) {
    try {
      PVZ.music.update(1 / 60, tension, mood, phase);
      PVZ.music.schedule();
    } catch (e) {
      errors.push('такт: ' + (e.stack || e));
      return;
    }
    PVZ.audio.ctx.currentTime += 1 / 60;
  }
}

try {
  PVZ.state.data = PVZ.state.fresh();
  PVZ.audio.init();
  PVZ.music.ensure();
  if (!PVZ.music.ctx) throw new Error('музыкальный контекст не создан');

  const names = Object.keys(PVZ.music.THEMES);
  for (const need of ['morning', 'day', 'evening', 'mafia', 'menu', 'lofi', 'night', 'jazz', 'chip', 'classic']) {
    if (names.indexOf(need) < 0) errors.push('нет темы ' + need);
  }
  names.forEach((id) => {
    const th = PVZ.music.THEMES[id];
    if (!th.bpm || th.bpm < 40) errors.push(id + ': плохой темп');
    if (!th.chords || !th.chords.length) errors.push(id + ': нет аккордов');
    if (!th.melody && !th.onBar) errors.push(id + ': нет мелодии');
    (th.melody || []).forEach((bar, bi) => bar.forEach((ev) => {
      if (ev.length < 4) errors.push(id + ': событие без громкости, такт ' + bi);
      if (ev[1] < 20 || ev[1] > 100) errors.push(id + ': нота вне диапазона ' + ev[1]);
      if (ev[0] < 0 || ev[0] > 15) errors.push(id + ': шаг вне такта ' + ev[0]);
    }));
  });
  const bpm = (id) => PVZ.music.THEMES[id].bpm;
  if (!(bpm('morning') < bpm('day'))) errors.push('день должен быть быстрее утра');
  if (!(bpm('evening') < bpm('morning'))) errors.push('вечер должен быть медленнее утра');
  if (PVZ.music.TRACKS.length < 6) errors.push('мало эфиров радио');
  PVZ.music.TRACKS.forEach((tr) => {
    if (tr.theme && !PVZ.music.THEMES[tr.theme]) errors.push('эфир ссылается на несуществующую тему: ' + tr.theme);
  });

  // утро
  let osc0 = starts.osc.length;
  let noise0 = starts.noise.length;
  step(3.5, 0.2, 'calm', 'morning');
  const morningOsc = starts.osc.length - osc0;
  const morningNoise = starts.noise.length - noise0;
  if (PVZ.music.themeId !== 'morning') errors.push('утром играет не утренняя тема: ' + PVZ.music.themeId);
  if (morningOsc < 40) errors.push('утренняя тема слишком пустая: ' + morningOsc + ' нот');

  // день
  osc0 = starts.osc.length;
  step(3.5, 0.3, 'calm', 'day');
  const dayOsc = starts.osc.length - osc0;
  if (PVZ.music.themeId !== 'day') errors.push('днём играет не дневная тема: ' + PVZ.music.themeId);
  if (dayOsc < 50) errors.push('дневная тема слишком пустая: ' + dayOsc + ' нот');

  // вечер
  osc0 = starts.osc.length;
  step(4, 0.5, 'calm', 'evening');
  const eveningOsc = starts.osc.length - osc0;
  if (PVZ.music.themeId !== 'evening') errors.push('вечером играет не вечерняя тема: ' + PVZ.music.themeId);
  if (eveningOsc < 30) errors.push('вечерняя тема слишком пустая: ' + eveningOsc + ' нот');

  // визит мафии: страшная тема включается мгновенно
  osc0 = starts.osc.length;
  noise0 = starts.noise.length;
  PVZ.music.snapMood('scary');
  if (PVZ.music.dark < 0.99) errors.push('snapMood не включает страшную тему');
  step(8, 0.9, 'scary', 'evening');
  const mafiaOsc = starts.osc.length - osc0;
  const mafiaNoise = starts.noise.length - noise0;
  if (PVZ.music.themeId !== 'mafia') errors.push('мафия не перебила тему: ' + PVZ.music.themeId);
  if (mafiaOsc < 60) errors.push('в теме мафии мало нот: ' + mafiaOsc);
  if (mafiaNoise < 4) errors.push('в теме мафии нет шумовых ударов: ' + mafiaNoise);

  // возврат к спокойствию
  step(5, 0.2, 'calm', 'day');
  if (PVZ.music.dark > 0.01) errors.push('страшная тема не выключается: dark=' + PVZ.music.dark);
  if (PVZ.music.themeId !== 'day') errors.push('после мафии не вернулась дневная тема: ' + PVZ.music.themeId);

  // радио: эфир перебивает фазу, «Радио ПВЗ» возвращает музыку смены
  PVZ.music.setTrack(2);
  step(2.5, 0.2, 'calm', 'morning');
  if (PVZ.music.themeId !== 'night') errors.push('«Ночной эфир» не включился: ' + PVZ.music.themeId);
  PVZ.music.setTrack(1);
  step(2.5, 0.2, 'calm', 'morning');
  if (PVZ.music.themeId !== 'morning') errors.push('«Радио ПВЗ» не вернуло музыку смены: ' + PVZ.music.themeId);

  // «Тишина» гасит музыку
  PVZ.music.setSilent(true);
  step(1, 0.2, 'calm', 'morning');
  if (PVZ.music.themeId !== '') errors.push('«Тишина» не выключила тему: ' + PVZ.music.themeId);
  PVZ.music.setSilent(false);
  step(2, 0.2, 'calm', 'morning');
  if (PVZ.music.themeId !== 'morning') errors.push('после «Тишины» музыка не вернулась');

  // громкость радио не теряется во время страшной сцены
  PVZ.music.setGain(0.15);
  PVZ.music.snapMood('scary');
  step(1, 0.9, 'scary', 'evening');
  if (PVZ.music.gainScale !== 0.15) errors.push('громкость радио потерялась');

  if (!errors.length) {
    console.log('МУЗЫКА ОК: утро ' + morningOsc + ' нот, день ' + dayOsc + ' нот, вечер ' + eveningOsc +
      ' нот, мафия ' + mafiaOsc + ' нот / ' + mafiaNoise + ' шумов; тем ' + names.length);
  }
} catch (e) {
  console.error('EXCEPTION: ' + (e.stack || e));
  process.exit(1);
}
if (errors.length) {
  console.error('ОШИБКИ:\n' + errors.join('\n'));
  process.exit(1);
}
