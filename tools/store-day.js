/* Кадр для карточки RuStore: день, кот на столе, очередь.
   node tools/cdp.js "file:///.../game/index.html?dev=day&clean=1" shots/store-day.png \
     --evalfile=tools/store-day.js */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 80; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await sleep(100);
  }
  PVZ.state.data.money = 2140;
  PVZ.state.data.rating = 4.62;
  PVZ.state.data.ratingLog = [{ s: 5 }, { s: 5 }, { s: 4 }, { s: 5 }, { s: 4 }];
  // без сюжетных диалогов мафии — кадр должен показывать игру, а не окно
  PVZ.state.mafiaState().seen = PVZ.sys.MAFIA_STORIES.map((s) => s.id);
  PVZ.game.trans = null;
  PVZ.game.setScene(PVZ.scenes.shift({ day: 4, phase: 'day' }));
  const s = PVZ.game.scene;
  const st = s.debug.st;
  st.shiftOpen = true;
  st.doorOpen = true;
  st.lightsOn = true;
  st.clock = 14 * 60;
  st.stats.served = 6;
  st.stats.revenue = 1860;
  st.combo = 4;
  st.queue.length = 0;
  st.customer = null;
  s.debug.spawn('pickup');
  s.debug.spawn('return');
  s.debug.step();
  await sleep(900);
  return { ok: true };
})()
