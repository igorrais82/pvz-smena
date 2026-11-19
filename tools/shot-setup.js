(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  s.onKey('Escape'); // пролог → оформление
  await sleep(350);
  const inp = document.getElementById('pvz-name-input');
  if (inp) {
    inp.value = 'ПВЗ «Уютный»';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  PVZ.state.data.pvzColor = '#5b6fb0';
  PVZ.state.save();
  s.onTap(262, 574); // фиолетовый образец
  await sleep(250);
  return { name: PVZ.state.data.pvzName, color: PVZ.state.data.pvzColor, input: !!inp };
})()
