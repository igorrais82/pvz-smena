/* Грубая проверка плавности: сколько кадров рисуется за 2 секунды */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.money = 30000;
  PVZ.sys.SHOP.forEach(it => PVZ.state.buy(it.id));
  st.phase = 'day'; st.shiftOpen = true; st.clock = 13 * 60; st.doorOpen = true; st.lightsOn = true;
  st.queue.length = 0; st.customer = null;
  for (let i = 0; i < 3; i++) s.debug.spawn();
  s.debug.step();
  await sleep(1500);
  let frames = 0;
  const t0 = performance.now();
  await new Promise(resolve => {
    function tick() {
      frames++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
  const fps = frames / ((performance.now() - t0) / 1000);
  return { fps: Math.round(fps), error: PVZ.game.lastError || null, owned: PVZ.state.data.owned.length, crowd: st.crowd.length };
})()
