/* Подготовка кадра: мини-игры QTE (сдача/пересчёт/сортировка/подпись) */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene, st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 15 * 60; st.doorOpen = true; st.lightsOn = true;
  st.customer = null; st.queue.length = 0;
  const type = new URLSearchParams(location.search).get('qte') || 'cashier';
  st.qte = new PVZ.sys.QTE({ type: type, title: 'Мини-игра: ' + type, sub: 'проверка отрисовки', code: '4821' });
  await sleep(700);
  return { type: type, done: st.qte && st.qte.done };
})()
