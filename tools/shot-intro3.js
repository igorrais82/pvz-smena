/* Пролог: перейти к третьему кадру */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  for (let i = 0; i < 4; i++) { s.onKey('Enter'); await sleep(140); }
  await sleep(300);
  return { frame: 'exterior', scene: !!s };
})()
