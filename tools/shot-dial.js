(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  const st = s.debug.st;
  const phone = st.laptop.phone;
  phone.tap(868, 445); // «Набрать номер»
  await sleep(200);
  phone.tap(232 + 430 + 53, 196 + 40 + 27); // 1
  phone.tap(232 + 430 + 169, 196 + 102 + 27); // 5
  phone.tap(232 + 430 + 285, 196 + 40 + 27); // 3
  await sleep(250);
  return { screen: phone.screen, num: phone.num };
})()
