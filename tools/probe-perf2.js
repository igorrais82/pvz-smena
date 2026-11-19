(async function () {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  PVZ.state.data.money = 30000;
  PVZ.sys.SHOP.forEach(it => PVZ.state.buy(it.id));
  st.phase = 'day'; st.shiftOpen = true; st.clock = 13 * 60; st.doorOpen = true; st.lightsOn = true;
  st.queue.length = 0; st.customer = null;
  for (let i = 0; i < 3; i++) s.debug.spawn();
  s.debug.step();
  await wait(800);
  const origDraw = s.draw;
  let drawMs = 0, frames = 0;
  s.draw = function (ctx) {
    const t0 = performance.now();
    origDraw.call(s, ctx);
    drawMs += performance.now() - t0;
    frames++;
  };
  await wait(2000);
  const avg = frames ? drawMs / frames : 0;
  return {
    frames: frames,
    fps: Math.round(frames / 2),
    avgDrawMs: Math.round(avg * 10) / 10,
    scale: PVZ.game.scale,
    textScale: PVZ.art.textScale,
    canvas: PVZ.game.canvas.width + 'x' + PVZ.game.canvas.height,
    decor: PVZ.state.data.owned.length
  };
})()
