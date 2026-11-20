/* Проверка: закрыл сцену вскрытия и открыл снова — прогресс сохраняется */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.tut = null; st.customer = null; st.queue.length = 0; st.view = 'counter';
  const o = st.orders.find((x) => x.state === 'stored');
  st.held = { id: o.id, code: o.code, item: o.item, kind: o.kind, scanned: true, onTable: true, unpacked: false, placeT: 1 };
  await sleep(300);
  s.debug.unpack();
  await sleep(1200);
  PVZ.input.dispatch('tap', 1000, 470);
  await sleep(300);
  PVZ.input.down = true;
  PVZ.input.dispatch('down', 500, 318);
  for (let x = 500; x <= 760; x += 30) { PVZ.input.dispatch('move', x, 318); await sleep(12); }
  PVZ.input.down = false;
  PVZ.input.dispatch('up', 760, 318);
  await sleep(300);
  const p1 = st.unpack && st.unpack.progress;
  s.onEscape();
  await sleep(200);
  ok(!st.unpack, 'сцена закрылась по Esc');
  ok(st.held && st.held.unpackState && st.held.unpackState.progress > 0, 'прогресс сохранён: ' + (st.held.unpackState && st.held.unpackState.progress));
  s.debug.unpack();
  await sleep(300);
  ok(st.unpack && st.unpack.phase === 'knifeIdle', 'повторно открылась на ноже: ' + (st.unpack && st.unpack.phase));
  ok(st.unpack && Math.abs(st.unpack.progress - p1) < 0.01, 'разрез продолжается с ' + p1.toFixed(2));
  return log;
})()
