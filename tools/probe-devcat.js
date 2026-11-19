/* Проверка кнопки DEV «Спавн кота».
   node tools/cdp.js "file:///.../game/index.html?dev=day" shots/probe-devcat.png \
     --evalfile=tools/probe-devcat.js */
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await wait(100);
  }
  const s = PVZ.game.scene;
  const st = s.debug.st;
  st.queue.length = 0;
  st.customer = null;
  st.dev.open = true;
  // ряд действий: +1 час, +1000, рейтинг, фаза, спавн, событие, мутный тип, кот
  PVZ.input.dispatch('tap', 1000, 372);
  await wait(300);
  return {
    devOpen: st.dev.open,
    catStorySpawned: st.catStorySpawned,
    queueKinds: st.queue.map((c) => c.kind),
    customerKind: st.customer && st.customer.kind,
    catOwner: !!(PVZ.state.data && PVZ.state.data.cat),
    err: PVZ.game.lastError || null
  };
})()
