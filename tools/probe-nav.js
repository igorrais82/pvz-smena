/* Навигация без стрелок: двери, стойка, кнопка возврата */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  const L = PVZ.art.LAYOUT;
  try {
    tap(L.counter.warehouseDoor.x + 20, L.counter.warehouseDoor.y + 200);
    await sleep(300);
    ok(st.view === 'warehouse', 'дверь слева ведёт на склад');
    tap(1140, 300);
    await sleep(400);
    ok(st.view === 'counter', 'дверь «на стойку» ведёт обратно');
    tap(L.counter.entrance.x + 40, L.counter.entrance.y + 200);
    await sleep(400);
    ok(st.view === 'hall', 'правая дверь ведёт в зал');
    tap(1200, 350);
    await sleep(400);
    ok(st.view === 'counter', 'стойка в зале ведёт к стойке');
    s.debug.view('rack');
    await sleep(300);
    tap(95, 362);
    await sleep(400);
    ok(st.view === 'warehouse', 'кнопка «На склад» из стеллажа работает');
    return { ok: true, log };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
