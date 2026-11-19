/* Проверка страшной музыкальной темы на фейковом WebAudio.
   Запуск: node tools/probe-music.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const errors = [];
const calls = [];

function node(name) {
  return {
    connect() { calls.push(name + '.connect'); },
    disconnect() {}
  };
}
class FakeParam {
  constructor(name, v) { this.name = name; this.value = v; this.events = 0; }
  setValueAtTime(v) { this.value = v; this.events++; }
  linearRampToValueAtTime(v) { this.value = v; this.events++; }
  exponentialRampToValueAtTime(v) { this.value = v; this.events++; }
  setTargetAtTime(v) { this.value = v; this.events++; }
}
class FakeAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = node('destination');
    calls.push('ctx');
  }
  createGain() {
    return { gain: new FakeParam('gain', 1), connect: () => calls.push('gain.connect') };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: new FakeParam('freq', 440),
      connect() {},
      start(t) { calls.push('osc.start@' + (t || 0).toFixed(2)); },
      stop() {}
    };
  }
  createBuffer(ch, len) {
    return { getChannelData: () => new Float32Array(len) };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start(t) { calls.push('buf.start@' + (t || 0).toFixed(2)); } };
  }
  createBiquadFilter() {
    return { type: 'highpass', frequency: new FakeParam('bf', 1000), Q: new FakeParam('q', 1), connect() {} };
  }
}

global.window = global;
global.AudioContext = FakeAudioContext;
global.setInterval = () => 1;
global.clearInterval = () => {};
global.PVZ = {};
global.document = { addEventListener() {} };

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'game', 'src', 'core.js'), 'utf8'), { filename: 'core.js' });
const PVZ = global.PVZ;

try {
  PVZ.state.data = PVZ.state.fresh();
  PVZ.audio.init();
  PVZ.music.ensure();

  // спокойная тема
  for (let i = 0; i < 120; i++) {
    PVZ.music.update(1 / 60, 0.2, 'calm');
    PVZ.music.schedule();
    PVZ.music.ctx.currentTime += 1 / 60;
  }
  const calmOsc = calls.filter((c) => c.startsWith('osc.start')).length;
  const calmNoise = calls.filter((c) => c.startsWith('buf.start')).length;

  // визит мафии
  PVZ.music.snapMood('scary');
  if (PVZ.music.dark < 0.99) errors.push('snapMood не включает страшную тему');
  for (let i = 0; i < 600; i++) {
    PVZ.music.update(1 / 60, 0.9, 'scary');
    PVZ.music.schedule();
    PVZ.music.ctx.currentTime += 1 / 60;
  }
  const scaryOsc = calls.filter((c) => c.startsWith('osc.start')).length - calmOsc;
  const scaryNoise = calls.filter((c) => c.startsWith('buf.start')).length - calmNoise;
  if (scaryOsc < 40) errors.push('в страшной теме мало нот: ' + scaryOsc);
  if (scaryNoise < 5) errors.push('в страшной теме нет шумовых ударов: ' + scaryNoise);
  if (PVZ.music.tension < 0.5) errors.push('напряжение не растёт');

  // возврат к спокойствию
  PVZ.music.setMood('calm');
  for (let i = 0; i < 240; i++) {
    PVZ.music.update(1 / 60, 0.2, 'calm');
    PVZ.music.schedule();
    PVZ.music.ctx.currentTime += 1 / 60;
  }
  if (PVZ.music.dark > 0.01) errors.push('страшная тема не выключается: dark=' + PVZ.music.dark);

  // мгновенный тихий фон не должен гасить страх
  PVZ.state.data.apps.push('radio');
  PVZ.music.setGain(0.15);
  PVZ.music.snapMood('scary');
  PVZ.music.update(1 / 60, 0.9, 'scary');
  if (!(PVZ.music.gainScale === 0.15)) errors.push('громкость радио потерялась');

  console.log(errors.length ? 'ОШИБКИ:\n' + errors.join('\n') : 'МУЗЫКА ОК: спокойная ' + calmOsc + ' нот / ' + calmNoise + ' шумов, страшная ' + scaryOsc + ' нот / ' + scaryNoise + ' шумов');
} catch (e) {
  console.error('EXCEPTION: ' + (e.stack || e));
  process.exit(1);
}
if (errors.length) process.exit(1);
