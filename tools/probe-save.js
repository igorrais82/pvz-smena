/* Сохранение/загрузка покупок + пауза */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  const log = [];
  const ok = (c, t) => { log.push((c ? 'OK  ' : 'FAIL') + ' ' + t); return c; };
  PVZ.state.data.money = 5000;
  PVZ.state.buy('decor_plant');
  PVZ.state.buy('scanner_pro');
  PVZ.state.data.day = 4;
  PVZ.game.persist();
  const raw = JSON.parse(localStorage.getItem(PVZ.state.SAVE_KEY));
  ok(raw.version === 3, 'версия сохранения 3');
  ok(raw.owned.indexOf('decor_plant') >= 0, 'покупки в сохранении');
  PVZ.state.data = null;
  const loaded = PVZ.state.load();
  ok(loaded && loaded.owned.length === 2, 'покупки загрузились: ' + (loaded ? loaded.owned.join(',') : '—'));
  ok(loaded && loaded.day === 4, 'день сохранился');
  ok(PVZ.state.mods().scanZone > 1, 'модификатор сканера активен: ' + PVZ.state.mods().scanZone);
  await sleep(200);
  PVZ.game.togglePause();
  await sleep(300);
  return { ok: true, log, paused: PVZ.game.paused };
})()
