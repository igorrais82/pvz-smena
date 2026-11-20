/* Кадры сцены вскрытия посылки. Режим — в хэше: #knife / #cut / #bag / #product */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  if (!s || !s.debug) return 'no shift scene';
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.doorOpen = true; st.lightsOn = true;
  st.clock = 14 * 60; st.tut = null; st.customer = null; st.queue.length = 0;
  st.view = 'counter';
  s.debug.unpack();
  if (!st.unpack) return 'unpack did not start';
  const u = st.unpack;
  u.lean = 1;
  const mode = (location.hash || '#knife').slice(1);
  if (mode === 'knife') {
    u.phase = 'knifeIdle';
  } else if (mode === 'cut') {
    u.phase = 'cut'; u.tool = 'knife'; u.progress = 0.52;
    u.hx = 430 + 420 * u.progress; u.hy = 318;
    PVZ.input.x = u.hx; PVZ.input.y = 318;
  } else if (mode === 'bag') {
    u.phase = 'bagCut'; u.tool = 'scissors'; u.open = 1; u.bagShow = 1;
    u.snips = 1; u.hx = 640; u.hy = 285;
    PVZ.input.x = 640; PVZ.input.y = 285;
  } else if (mode === 'product') {
    u.item = 'Кроссовки'; u.kind = 'clothes';
    u.phase = 'product'; u.open = 1; u.bagShow = 1; u.snips = 3; u.product = 1;
  }
  await sleep(700);
  return { phase: u.phase, code: u.code, item: u.item, progress: u.progress };
})()
