/* Кадр диалога: раскладка вариантов в стиле The Walking Dead */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  if (!s || !s.debug) return 'no shift scene';
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 14 * 60; st.doorOpen = true; st.lightsOn = true;
  st.view = 'counter';
  if (!st.customer) { s.debug.spawn('pickup'); s.debug.step(); }
  const c = st.customer;
  if (c) {
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    c.moving = false; c.arrived = true; c.arrivedT = 1; c.patience = 0.72;
  }
  await sleep(700);
  st.dlg = new PVZ.sys.Dialogue({
    name: (c.name || 'Анна') + ' ' + (c.last || 'Петрова'),
    person: c,
    role: 'покупатель',
    mood: (c.moodIcon || '🙂') + ' ' + (c.moodLabel || 'спокойна'),
    text: 'Здравствуйте! Заказ ' + (c.code || '4821') + ' — «' + (c.item || 'Кроссовки') + '». Проверьте, пожалуйста, всё в порядке?',
    choices: [
      { label: 'Выдать заказ и попрощаться', hint: '+120 ₽ · 1 мин', fx: { time: 1 } },
      { label: 'Сверить имя и адрес в заказе', hint: '2 мин · +репутация', fx: { time: 2 } },
      { label: 'Предложить пакет за 30 ₽', hint: '+30 ₽ · 1 мин' },
      { label: 'Поболтать с покупателем', hint: '3 мин · +репутация' }
    ]
  });
  await sleep(1400);
  return { dlg: !!st.dlg, choices: st.dlg ? st.dlg.choices.length : 0, rects: st.dlg ? st.dlg.choiceRects : null };
})()
