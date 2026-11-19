/* Подготовка кадра: мини-игра в ноутбуке */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 16 * 60; st.doorOpen = true; st.lightsOn = true;
  PVZ.state.data.money = 3400;
  st.customer = null; st.queue.length = 0;
  s.debug.laptop();
  st.laptop.mode = 'game';
  st.laptop.game = { t: 0, boxes: [], score: 7, over: false, spawn: 0.05, best: 12, earned: 0 };
  await sleep(1400);
  return { mode: st.laptop && st.laptop.mode, boxes: st.laptop && st.laptop.game ? st.laptop.game.boxes.length : 0 };
})()
