(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  for (let i = 0; i < 12; i++) { s.onTap(640, 500); await sleep(80); }
  await sleep(300);
  return { line: s.debug ? 'ok' : 'no' };
})()
