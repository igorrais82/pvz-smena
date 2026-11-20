/* Стресс-кадр диалога: 6 длинных вариантов и длинная реплика */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const s = PVZ.game.scene;
  if (!s || !s.debug) return 'no shift scene';
  const st = s.debug.st;
  st.phase = 'day'; st.shiftOpen = true; st.clock = 21 * 60; st.doorOpen = true; st.lightsOn = true;
  st.view = 'counter';
  if (!st.customer) { s.debug.spawn('pickup'); s.debug.step(); }
  const c = st.customer;
  if (c) {
    c.vx = 625; c.vgy = 800; c.vh = 580 * (c.height || 1);
    c.moving = false; c.arrived = true; c.arrivedT = 1;
  }
  await sleep(500);
  st.dlg = new PVZ.sys.Dialogue({
    name: 'Босс',
    person: null,
    icon: '♠',
    role: 'вечерний визит',
    mood: '⚠ они не шутят',
    text: 'День десятый. Мы принесли четыре тысячи двести. В кассе три тысячи сто. ' +
      'Ты знаешь, что бывает с теми, кто задерживает оброк. У тебя есть время до полуночи, ' +
      'и это не предложение, а условие. Решай, пока мы добрые.',
    choices: [
      { label: 'Отдать всё, что есть, и попросить отсрочку до завтра', hint: 'деньги · проценты · они недовольны' },
      { label: 'Сказать, что денег нет, и предложить отработать услугу', hint: 'грязно · долг тает' },
      { label: 'Показать накладные и сказать, что касса уже закрыта', hint: 'риск · −терпение' },
      { label: 'Намекнуть, что у нас есть улики на их человека в участке', hint: 'улики · они запомнят' },
      { label: 'Молча достать всю наличность из-под стола', hint: 'быстро · без слов' },
      { label: 'Отказаться платить и выйти из-за стойки', hint: 'очень плохая идея' }
    ]
  });
  await sleep(1500);
  return { choices: st.dlg.choiceRects, icon: 'drawn' };
})()
