(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  const st = s.debug.st;
  s.debug.threat('bandit');
  await sleep(150);
  s.debug.phone();
  await sleep(150);
  st.laptop.phone.startCall({ id: 'police', name: 'Полиция', num: '102', icon: '🚓' });
  await sleep(400);
  return { qte: st.qte && st.qte.type };
})()
