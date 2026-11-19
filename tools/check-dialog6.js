/* Проверка мобильного диалога на 6 вариантов (самый плотный случай).
   node tools/cdp.js "file:///.../game/index.html?dev=day&clean=1" shots/check-dialog6.png \
     --size=800x360 --evalfile=tools/check-dialog6.js */
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 60; i++) {
    if (typeof PVZ !== 'undefined' && PVZ.game && PVZ.game.scene) break;
    await wait(100);
  }
  const s = PVZ.game.scene;
  const c = s.debug.st.customer || { name: 'Ирина', last: 'Соколова', moodIcon: '🙂', moodLabel: 'спокоен' };
  s.debug.st.dlg = new PVZ.sys.Dialogue({
    name: 'Ирина Соколова',
    person: c.person || PVZ.art.makePerson({ skin: 1, hair: '#4a3020', style: 'long', female: true }),
    role: 'покупатель',
    mood: '🙂 спокоен',
    text: 'Заказ 4821 — «Кроссовки», 3 290 ₽. К оплате при получении: 1 200 ₽ (наша комиссия 45 ₽). Нужно сверить документ. Осталось посылок: 2. Проверьте, пожалуйста.',
    choices: [
      { label: 'Выдать посылку и взяться за следующую', hint: '+45 ₽ · 1 мин' },
      { label: 'Сверить паспорт с заказом', hint: '2 мин · +репутация' },
      { label: 'Сверить имя и адрес в заказе', hint: '2 мин · +репутация' },
      { label: 'Поболтать с покупателем', hint: '3 мин · +репутация' },
      { label: 'Предложить пакет за 30 ₽', hint: '+30 ₽ · 1 мин' },
      { label: 'Отмена — клиент подождёт', hint: '−терпение' }
    ]
  });
  await wait(700);
  return { ok: true, choices: s.debug.st.dlg.choices.length };
})()
