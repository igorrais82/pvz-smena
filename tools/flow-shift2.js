/* Сквозной тест смены: утро -> день -> вечер -> отчёт */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = [];
  const g = PVZ.game;
  const s = g.scene;
  const st = s.debug.st;
  const tap = (x, y) => PVZ.input.dispatch('tap', x, y);
  const obDone = (id) => {
    const o = st.objectives.find(x => x.id === id);
    return o ? o.done : false;
  };
  const view = async (v) => { s.debug.view(v); await sleep(180); log.push('вид=' + st.view); };
  const closeDlg = async () => {
    if (st.dlg) {
      const r = st.dlg.choiceRects[0];
      tap(r.x + r.w / 2, r.y + r.h / 2);
      await sleep(220);
    }
  };

  try {
    await view('counter');
    log.push('старт: фаза ' + st.phase + ', ' + PVZ.util.fmtTime(st.clock));

    tap(762, 505); await sleep(160);
    log.push('терминал: ' + obDone('terminal'));

    await view('warehouse');
    for (let i = 0; i < 3; i++) { tap(350, 600); await sleep(220); }
    log.push('коробки: ' + st.placedBoxes + ', цель=' + obDone('stock'));

    await view('hall');
    tap(479, 335); await sleep(160);
    log.push('свет: ' + obDone('light'));
    tap(855, 430); await sleep(260);
    await closeDlg();
    log.push('разговор: ' + obDone('talk'));
    tap(643, 300); await sleep(300);
    log.push('после двери фаза: ' + st.phase);

    if (st.phase !== 'day') return { ok: false, reason: 'день не начался', log };

    st.clock = 19 * 60 - 1;
    await sleep(2800);
    log.push('вечер: фаза=' + st.phase + ', ' + PVZ.util.fmtTime(st.clock));
    if (st.phase !== 'evening') return { ok: false, reason: 'вечер не начался', log };

    await closeDlg();
    await view('hall');
    tap(643, 300); await sleep(260);
    log.push('дверь закрыта: ' + obDone('closeDoor'));

    const spots = st.dust.slice();
    for (const d of spots) { tap(d.x, d.y); await sleep(280); }
    log.push('уборка: ' + st.dust.filter(d => d.done).length + '/3, цель=' + obDone('clean'));

    await view('counter');
    for (let i = 0; i < 3; i++) { tap(625, 670); await sleep(220); }
    log.push('касса: кликов=' + st.cashClicks + ', цель=' + obDone('cash'));

    tap(762, 505); await sleep(1500);
    log.push('после закрытия смены сцена: ' + (g.scene === s ? 'смена' : 'отчёт'));

    return {
      ok: g.scene !== s,
      scene: g.scene === s ? 'shift' : 'report',
      totals: PVZ.state.data.totals,
      log
    };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e), log };
  }
})()
