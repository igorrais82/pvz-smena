/* ПВЗ: Смена — домен: каталог, заказы, ячейки, покупатели, диалоги, мини-игры, магазин */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util;
  var art = PVZ.art;
  var sys = (PVZ.sys = {});

  /* ---------------- люди ---------------- */
  var NAMES_F = ['Анна', 'Елена', 'Ольга', 'Мария', 'Светлана', 'Юлия', 'Татьяна', 'Наталья', 'Ирина', 'Дарья', 'Ксения', 'Полина', 'Вероника', 'Алина', 'Людмила', 'Валентина', 'Софья', 'Милана'];
  var NAMES_M = ['Дмитрий', 'Сергей', 'Игорь', 'Павел', 'Артём', 'Максим', 'Владимир', 'Роман', 'Алексей', 'Никита', 'Егор', 'Кирилл', 'Андрей', 'Тимур', 'Виктор', 'Геннадий', 'Михаил', 'Антон'];
  var LAST_F = ['Иванова', 'Петрова', 'Смирнова', 'Кузнецова', 'Соколова', 'Попова', 'Лебедева', 'Новикова', 'Морозова', 'Волкова', 'Зайцева', 'Павлова', 'Семёнова', 'Голубева'];
  var LAST_M = ['Иванов', 'Петров', 'Смирнов', 'Кузнецов', 'Соколов', 'Попов', 'Лебедев', 'Новиков', 'Морозов', 'Волков', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев'];
  sys.NAMES_F = NAMES_F;
  sys.NAMES_M = NAMES_M;

  /* ---------------- каталог товаров ---------------- */
  /* kind: clothes — можно примерить; size: S/M/L (L — только нижняя полка) */
  sys.CATALOG = [
    { name: 'Кроссовки', kind: 'clothes', size: 'M', price: 3290 },
    { name: 'Ботинки', kind: 'clothes', size: 'M', price: 4590 },
    { name: 'Куртка', kind: 'clothes', size: 'M', price: 7990 },
    { name: 'Платье', kind: 'clothes', size: 'S', price: 3490 },
    { name: 'Джинсы', kind: 'clothes', size: 'M', price: 2790 },
    { name: 'Футболка', kind: 'clothes', size: 'S', price: 990 },
    { name: 'Свитер', kind: 'clothes', size: 'M', price: 2190 },
    { name: 'Шапка', kind: 'clothes', size: 'S', price: 790 },
    { name: 'Плащ', kind: 'clothes', size: 'M', price: 5490 },
    { name: 'Брюки', kind: 'clothes', size: 'M', price: 2990 },
    { name: 'Сумка', kind: 'other', size: 'S', price: 2490 },
    { name: 'Рюкзак', kind: 'other', size: 'M', price: 3190 },
    { name: 'Наушники', kind: 'other', size: 'S', price: 2990 },
    { name: 'Чайник', kind: 'other', size: 'S', price: 1690 },
    { name: 'Термос', kind: 'other', size: 'S', price: 1290 },
    { name: 'Лампа', kind: 'other', size: 'M', price: 1890 },
    { name: 'Плед', kind: 'other', size: 'L', price: 2290 },
    { name: 'Игрушка', kind: 'other', size: 'S', price: 890 },
    { name: 'Чехол', kind: 'other', size: 'S', price: 590 },
    { name: 'Кружка', kind: 'other', size: 'S', price: 490 },
    { name: 'Коврик', kind: 'other', size: 'M', price: 1190 },
    { name: 'Пылесос', kind: 'other', size: 'L', price: 12990 },
    { name: 'Кофемашина', kind: 'other', size: 'L', price: 15990 },
    { name: 'Стол', kind: 'other', size: 'L', price: 6490 },
    { name: 'Стул', kind: 'other', size: 'L', price: 3990 },
    { name: 'Книга', kind: 'other', size: 'S', price: 690 },
    { name: 'Корм для кота', kind: 'other', size: 'M', price: 1490 },
    { name: 'Витамины', kind: 'other', size: 'S', price: 890 },
    { name: 'Гитара', kind: 'other', size: 'L', price: 8990 },
    { name: 'Самокат', kind: 'other', size: 'L', price: 5790 },
    { name: 'Клавиатура', kind: 'other', size: 'M', price: 3990 },
    { name: 'Монитор', kind: 'other', size: 'L', price: 11990 }
  ];

  /* ---------------- ячейки склада ---------------- */
  sys.RACKS = ['A', 'B', 'C'];
  sys.ROWS = 3;
  sys.COLS = 3;
  sys.CELL_TOTAL = sys.RACKS.length * sys.ROWS * sys.COLS;

  sys.cellId = function (rack, row, col) { return rack + '-' + (row + 1) + '-' + (col + 1); };
  sys.parseCell = function (id) {
    if (!id) return null;
    var m = /^([A-C])-(\d)-(\d)$/.exec(id);
    if (!m) return null;
    return { rack: m[1], row: parseInt(m[2], 10) - 1, col: parseInt(m[3], 10) - 1 };
  };

  sys.allCells = function () {
    var out = [];
    sys.RACKS.forEach(function (r) {
      for (var row = 0; row < sys.ROWS; row++) {
        for (var col = 0; col < sys.COLS; col++) out.push({ rack: r, row: row, col: col, id: sys.cellId(r, row, col) });
      }
    });
    return out;
  };

  sys.CELL_STATES = { stored: 1, placing: 1, fitting: 1, return: 1, reserved: 1 };

  sys.orderAtCell = function (orders, id) {
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      if (o.cell === id && sys.CELL_STATES[o.state]) return o;
    }
    return null;
  };

  /* Крупный товар — только на нижнюю полку */
  sys.cellAllowsSize = function (cell, size) {
    var p = sys.parseCell(cell);
    if (!p) return false;
    return size === 'L' ? p.row === sys.ROWS - 1 : true;
  };

  sys.freeCells = function (orders, size) {
    var busy = {};
    orders.forEach(function (o) {
      if (o.cell && sys.CELL_STATES[o.state]) busy[o.cell] = true;
    });
    return sys.allCells().filter(function (c) {
      return !busy[c.id] && sys.cellAllowsSize(c.id, size);
    });
  };

  sys.assignCell = function (orders, size) {
    var free = sys.freeCells(orders, size);
    if (!free.length) {
      free = sys.allCells().filter(function (c) {
        return !orders.some(function (o) { return o.cell === c.id && sys.CELL_STATES[o.state]; });
      });
      if (!free.length) return null;
    }
    // нижний ряд приберегаем под крупногабарит
    free.sort(function (a, b) {
      if (size !== 'L') {
        var ab = a.row === sys.ROWS - 1 ? 1 : 0, bb = b.row === sys.ROWS - 1 ? 1 : 0;
        if (ab !== bb) return ab - bb;
      }
      if (a.rack !== b.rack) return sys.RACKS.indexOf(a.rack) - sys.RACKS.indexOf(b.rack);
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    return free[0].id;
  };

  /* ---------------- заказы ---------------- */
  sys.newCode = function (orders) {
    var used = {};
    orders.forEach(function (o) { used[o.code] = true; });
    for (var i = 0; i < 200; i++) {
      var c = String(U.ri(1000, 9999));
      if (!used[c]) return c;
    }
    return String(U.ri(1000, 9999));
  };

  sys.makeOrder = function (opts) {
    opts = opts || {};
    var item = opts.item || U.pick(sys.CATALOG);
    var price = item.price + U.ri(-3, 3) * 100;
    return {
      id: U.uid(),
      code: opts.code || String(U.ri(1000, 9999)),
      item: item.name,
      kind: item.kind,
      size: opts.size || item.size,
      price: price,
      cell: opts.cell || null,
      day: opts.day || 1,
      storage: opts.storage || 15,
      state: opts.state || 'new',
      customer: opts.customer || null,
      // наложенный платёж — за него нужно будет принять деньги
      cod: opts.cod == null ? U.chance(0.26) : opts.cod,
      codSum: opts.codSum || (Math.round(price * U.rand(0.3, 0.8) / 10) * 10),
      fragile: opts.fragile == null ? U.chance(0.14) : opts.fragile,
      docs: opts.docs == null ? U.chance(0.18) : opts.docs
    };
  };

  /* Заказы, которые уже лежат на складе к утру */
  sys.generateStored = function (day, count) {
    var orders = [];
    for (var i = 0; i < count; i++) {
      var o = sys.makeOrder({ day: day - U.ri(0, 4) });
      o.code = sys.newCode(orders);
      o.cell = sys.assignCell(orders, o.size);
      if (!o.cell) continue;
      o.state = 'stored';
      orders.push(o);
    }
    return orders;
  };

  /* Поставка: коробки, которые нужно принять и разложить */
  sys.generateSupply = function (day, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var o = sys.makeOrder({ day: day });
      o.code = sys.newCode(out);
      o.state = 'new';
      o.cell = null;
      out.push(o);
    }
    return out;
  };

  sys.storageLeft = function (order, day) {
    return order.storage - (day - order.day);
  };

  sys.isOverdue = function (order, day) {
    return sys.storageLeft(order, day) <= 0;
  };

  /* ---------------- характеры покупателей ---------------- */
  /* Каждый покупатель получает настроение: от него зависит терпение, чаевые и реплики */
  sys.MOODS = [
    {
      id: 'calm', label: 'спокоен', icon: '🙂', patience: 1.0, tip: 1.0, weight: 5,
      greet: ['Здравствуйте!', 'Добрый день!', 'Здравствуйте, подскажите…'],
      talk: ['Спасибо, не тороплюсь.', 'Хорошая у вас погода за окном.']
    },
    {
      id: 'hurry', label: 'спешит', icon: '⏱', patience: 0.66, tip: 1.7, weight: 4,
      greet: ['Здравствуйте, я очень быстро!', 'Добрый день, у меня минута.'],
      talk: ['Давайте быстрее, пожалуйста.', 'Мне на автобус через пять минут!']
    },
    {
      id: 'chatty', label: 'разговорчив', icon: '💬', patience: 1.22, tip: 0.9, weight: 4,
      greet: ['Ой, здравствуйте! Наконец-то я до вас дошла.', 'Добрый день! А я к вам с посылочкой.'],
      talk: ['А вы давно тут работаете?', 'Внучка заказала, а я даже не знаю, что внутри.']
    },
    {
      id: 'grumpy', label: 'недоволен', icon: '😠', patience: 0.76, tip: 0.4, weight: 3,
      greet: ['Ну наконец-то. Я стою уже десять минут.', 'Добрый день. Или не добрый.'],
      talk: ['В прошлый раз было быстрее.', 'Надеюсь, сейчас без сюрпризов.']
    },
    {
      id: 'vip', label: 'постоянный', icon: '★', patience: 1.08, tip: 1.9, weight: 2,
      greet: ['Здравствуйте! Снова я.', 'Добрый день, как всегда — к вам.'],
      talk: ['Всё у вас аккуратно, приятно заходить.', 'Передайте привет администратору.']
    },
    {
      id: 'elder', label: 'пожилой', icon: '👴', patience: 1.35, tip: 0.7, weight: 3,
      greet: ['Здравствуйте, милая! Ой, то есть молодой человек…', 'Добрый день, помогите, пожалуйста.'],
      talk: ['Очки забыл дома, прочитайте, будьте добры.', 'А вы мне всё прямо в руки дадите?']
    },
    {
      id: 'kid', label: 'с ребёнком', icon: '🧒', patience: 1.12, tip: 0.8, weight: 2,
      greet: ['Здравствуйте! Мы за игрушкой.', 'Добрый день, малыш, поздоровайся.'],
      talk: ['Сынок, не трогай коробки!', 'Ребёнок уже весь магазин обошёл.']
    }
  ];

  sys.mood = function (id) {
    for (var i = 0; i < sys.MOODS.length; i++) if (sys.MOODS[i].id === id) return sys.MOODS[i];
    return sys.MOODS[0];
  };

  function weightedPick(list) {
    var sum = 0;
    list.forEach(function (m) { sum += m.weight; });
    var r = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { r -= list[i].weight; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* Телефоны: от них зависит, как получить код */
  sys.PHONES = [
    { id: 'smart', label: 'смартфон', weight: 5 },
    { id: 'old', label: 'кнопочный', weight: 2 },
    { id: 'cracked', label: 'с трещиной', weight: 2 },
    { id: 'watch', label: 'часы', weight: 1 },
    { id: 'paper', label: 'бумажка', weight: 1 },
    { id: 'none', label: 'без телефона', weight: 1 }
  ];

  function pickPhone() {
    var sum = 0; sys.PHONES.forEach(function (p) { sum += p.weight; });
    var r = Math.random() * sum;
    for (var i = 0; i < sys.PHONES.length; i++) { r -= sys.PHONES[i].weight; if (r <= 0) return sys.PHONES[i].id; }
    return 'smart';
  }

  /* ---------------- покупатели ---------------- */
  sys.makeCustomer = function (opts) {
    opts = opts || {};
    var female = opts.female == null ? U.chance(0.55) : opts.female;
    var mood = opts.mood ? sys.mood(opts.mood) : weightedPick(sys.MOODS);
    var style = female
      ? U.pick(['long', 'bob', 'bun', 'curly', 'ponytail', 'long', 'bob', 'short'])
      : U.pick(['short', 'bald', 'short', 'curly', 'bun', 'short']);
    var p = art.makePerson({
      expr: 'neutral',
      shirt: U.pick(art.P.shirtColors),
      pants: U.pick(art.P.pantsColors),
      style: style,
      hair: U.pick(art.P.hairColors),
      female: female,
      hat: U.chance(female ? 0.08 : 0.16) ? U.pick(['cap', 'beanie']) : null,
      glasses: U.chance(female ? 0.2 : 0.26),
      beard: !female && U.chance(0.16),
      bangs: U.chance(female ? 0.6 : 0.3)
    });
    p.name = opts.name || (female ? U.pick(NAMES_F) : U.pick(NAMES_M));
    p.last = opts.last || (female ? U.pick(LAST_F) : U.pick(LAST_M));
    p.female = female;
    p.mood = mood.id;
    p.moodLabel = mood.label;
    p.moodIcon = mood.icon;
    p.expr = opts.expr || 'neutral';
    p.bag = U.chance(0.4) ? U.pick(['bag', 'backpack']) : 'none';
    p.phone = opts.phone || pickPhone();
    p.phoneLabel = (sys.PHONES.find(function (x) { return x.id === p.phone; }) || {}).label || 'смартфон';
    p.coat = U.chance(0.45) ? U.pick(['#4a5f7a', '#7a4a4a', '#5d6a4e', '#3e4a5a', '#8a6a4a']) : null;
    p.height = U.rand(0.93, 1.08);
    p.bubble = null;
    p.bubbleAlpha = 0;
    return p;
  };

  /* Вопросы покупателей: у каждого ответа есть цена — временем, деньгами или репутацией */
  sys.QUESTIONS = [
    {
      q: 'А сколько у вас заказ хранится?',
      opts: [
        { t: '15 дней, потом уедет обратно продавцу', ok: true, reply: 'Понятно, успею забрать.', fx: { time: 1, rating: 0.03 } },
        { t: 'Три дня и всё', ok: false, reply: 'Всего три дня? Так не бывает.', fx: { time: 1, rating: -0.06 } },
        { t: 'Хранится сколько угодно', ok: false, reply: 'Что-то не верится.', fx: { time: 1, rating: -0.05 } }
      ]
    },
    {
      q: 'Где у вас примерочная?',
      opts: [
        { t: 'Слева от входа, за информационным стендом', ok: true, reply: 'Спасибо!', fx: { time: 1, rating: 0.03 } },
        { t: 'У нас нет примерочной', ok: false, reply: 'В приложении написано, что есть.', fx: { time: 2, rating: -0.07 } },
        { t: 'Провожу вас и покажу сам', ok: true, reply: 'Вот спасибо, а то я не разберусь.', fx: { time: 3, rating: 0.06, tip: 30 } }
      ]
    },
    {
      q: 'Можно вернуть, если не подошло?',
      opts: [
        { t: 'Да, 14 дней с момента получения — оформим здесь', ok: true, reply: 'Отлично, спасибо.', fx: { time: 1, rating: 0.04 } },
        { t: 'Нет, возврата нет', ok: false, reply: 'Это нарушение прав потребителя.', fx: { time: 1, rating: -0.08 } },
        { t: 'Только через суд', ok: false, reply: 'Вы серьёзно?', fx: { time: 2, rating: -0.09 } }
      ]
    },
    {
      q: 'Я забыл код получения, что делать?',
      opts: [
        { t: 'Откройте приложение → «Мои заказы» → код получения', ok: true, reply: 'А, точно, вижу. Спасибо!', fx: { time: 2, rating: 0.03 } },
        { t: 'Код я вам не скажу, ищите сами', ok: false, reply: 'Но вы же сотрудник…', fx: { time: 1, rating: -0.07 } },
        { t: 'Сейчас найдём по вашему номеру телефона', ok: true, reply: 'О, так можно было?', fx: { time: 3, money: -20, rating: 0.05 } }
      ]
    },
    {
      q: 'А если товар с браком?',
      opts: [
        { t: 'Оформим возврат по браку, деньги вернутся на карту', ok: true, reply: 'Хорошо, так и сделаю.', fx: { time: 2, rating: 0.04 } },
        { t: 'Брак не возвращаем', ok: false, reply: 'Это вообще-то незаконно.', fx: { time: 1, rating: -0.09 } },
        { t: 'Пишите продавцу, мы ни при чём', ok: false, reply: 'Вы же пункт выдачи…', fx: { time: 1, rating: -0.08 } }
      ]
    },
    {
      q: 'Можно получить заказ за другого человека?',
      opts: [
        { t: 'Да, если назовёте код получения', ok: true, reply: 'Тогда продиктую.', fx: { time: 1, rating: 0.02 } },
        { t: 'Только лично владельцу', ok: false, reply: 'Но он в другом городе.', fx: { time: 1, rating: -0.05 } },
        { t: 'Нужна нотариальная доверенность', ok: false, reply: 'Из-за посылки?', fx: { time: 3, rating: -0.06 } }
      ]
    },
    {
      q: 'А вы работаете в воскресенье?',
      opts: [
        { t: 'Да, с 9 до 21 каждый день', ok: true, reply: 'Отлично, значит зайду.', fx: { time: 1, rating: 0.02 } },
        { t: 'В воскресенье закрыто', ok: false, reply: 'Странно, в приложении другое.', fx: { time: 1, rating: -0.05 } }
      ]
    },
    {
      q: 'Можно оплатить заказ картой при получении?',
      opts: [
        { t: 'Да, терминал у нас на стойке', ok: true, reply: 'Хорошо, спасибо.', fx: { time: 1, rating: 0.03 } },
        { t: 'Только наличными, без сдачи', ok: false, reply: 'Без сдачи — это как?', fx: { time: 1, rating: -0.06 } }
      ]
    },
    {
      q: 'А можно оставить посылку у вас до следующей недели?',
      opts: [
        { t: 'Да, заказ хранится 15 дней', ok: true, reply: 'Отлично, тогда не спешу.', fx: { time: 1, rating: 0.03 } },
        { t: 'Нет, забирайте сегодня', ok: false, reply: 'Но я же оплатил доставку…', fx: { time: 1, rating: -0.05 } },
        { t: 'Можем продлить хранение за небольшую плату', ok: true, reply: 'Сколько это будет стоить?', fx: { time: 2, rating: 0.04 } }
      ]
    },
    {
      q: 'А вы можете вскрыть посылку и проверить, что там?',
      opts: [
        { t: 'Вскрывать можно только после оплаты и оформления', ok: true, reply: 'Понятно, тогда оформляем.', fx: { time: 1, rating: 0.03 } },
        { t: 'Конечно, вскрывайте прямо здесь', ok: false, reply: 'А если я потом откажусь?', fx: { time: 2, rating: -0.03 } },
        { t: 'Давайте оформим возврат, если товар не подойдёт', ok: true, reply: 'Так даже спокойнее.', fx: { time: 2, rating: 0.05 } }
      ]
    },
    {
      q: 'Можно получить заказ без паспорта?',
      opts: [
        { t: 'Да, достаточно кода получения', ok: true, reply: 'Отлично, код у меня есть.', fx: { time: 1, rating: 0.03 } },
        { t: 'Нет, только с паспортом', ok: false, reply: 'Но я его никогда с собой не ношу.', fx: { time: 1, rating: -0.05 } },
        { t: 'Если код есть, паспорт обычно не нужен', ok: true, reply: 'Вот и славно.', fx: { time: 1, rating: 0.02 } }
      ]
    },
    {
      q: 'А где можно оставить жалобу на курьера?',
      opts: [
        { t: 'В приложении, в разделе «Поддержка»', ok: true, reply: 'Спасибо, сейчас напишу.', fx: { time: 2, rating: 0.03 } },
        { t: 'Мы жалобы не принимаем', ok: false, reply: 'Странно, а куда тогда обращаться?', fx: { time: 1, rating: -0.06 } },
        { t: 'Запишите номер заказа, я передам администратору', ok: true, reply: 'Хорошо, диктую.', fx: { time: 3, rating: 0.05 } }
      ]
    }
  ];

  sys.makeQuestion = function () { return U.pick(sys.QUESTIONS); };

  /* Причины возврата */
  sys.RETURN_REASONS = [
    'Не подошёл размер',
    'Товар не понравился',
    'Брак / повреждение',
    'Пришёл не тот товар',
    'Передумал(а)'
  ];

  /* ---------------- подписи выбора без цифр ---------------- */
  /* Раньше у варианта было написано «5 мин · +репутация», и решение
     превращалось в арифметику: почти всегда есть очевидно выгодный ответ.
     Теперь цена решения описывается качественно — игрок должен думать,
     а не сверять числа. Инструкции (номера служб, «ноутбук → Телефон»)
     остаются как есть: это не цена, а подсказка, куда нажать. */
  function hintMinutes(min) {
    if (!(min > 0)) return 'быстро';
    if (min <= 1) return 'быстро';
    if (min <= 3) return 'недолго';
    return 'долго';
  }

  sys.hintLabel = function (hint) {
    var s = String(hint == null ? '' : hint).trim();
    if (!s) return '';
    if (!/[₽]|мин|сек|репутац|терпен|%/i.test(s)) return s;
    var out = [];
    s.split(/\s*·\s*/).forEach(function (raw) {
      var p = raw.trim();
      if (!p) return;
      if (p.indexOf('₽') >= 0) {
        out.push(/^[-−]/.test(p) ? 'потеря денег' : 'прибыль');
        return;
      }
      if (/\d\s*(мин|сек)/.test(p)) {
        var n = parseFloat(p.replace(/[^\d.]/g, '')) || 0;
        out.push(/сек/.test(p) ? 'меньше времени' : hintMinutes(n));
        return;
      }
      if (/репутац/i.test(p)) { out.push(/^[-−]/.test(p) ? 'плохой отзыв' : 'хороший отзыв'); return; }
      if (/терпен/i.test(p)) { out.push(/^[-−]/.test(p) ? 'клиент нервничает' : 'клиент подождёт'); return; }
      if (/%/.test(p)) { out.push('риск'); return; }
      if (/\d/.test(p)) { out.push('как повезёт'); return; }
      out.push(p);
    });
    var uniq = [];
    out.forEach(function (x) { if (uniq.indexOf(x) < 0) uniq.push(x); });
    return uniq.slice(0, 3).join(' · ');
  };

  /* ---------------- диалог ---------------- */
  function Dialogue(opts) {
    opts = opts || {};
    this.name = opts.name || '';
    this.person = opts.person || null;
    this.role = opts.role || '';
    this.text = opts.text || '';
    this.mood = opts.mood || null;
    this.icon = opts.icon || null;
    this.choices = opts.choices || [];
    this.revealed = 0;
    this.full = this.text.length;
    this.tt = 0;
    this.onClose = opts.onClose || null;
    this.panel = { x: 120, y: 240, w: 1040, h: 426 };
    this.portrait = { x: 214, y: 330, r: 70 };
    this.choiceRects = [];
    var n = this.choices.length;
    var top = 372;
    var gap = Math.min(60, 300 / Math.max(1, n));
    for (var i = 0; i < n; i++) {
      this.choiceRects.push({ x: 316, y: top + i * gap, w: 790, h: 46 });
    }
  }
  Dialogue.prototype.update = function (dt) {
    this.tt += dt;
    if (this.revealed < this.full) this.revealed = Math.min(this.full, this.revealed + dt * 90);
  };
  Dialogue.prototype.draw = function (ctx) {
    var W = 1280, H = 720;
    var compact = !!art.compact;
    var p = compact ? { x: 24, y: 48, w: 1232, h: 624 } : this.panel;
    var pr = compact ? { x: 150, y: 158, r: 82 } : this.portrait;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.tt * 6);
    ctx.fillStyle = 'rgba(10,7,5,0.6)';
    ctx.fillRect(0, 0, W, H);
    art.panel(ctx, p.x, p.y, p.w, p.h, { bg: 'rgba(30,22,18,0.975)', r: 20, border: 'rgba(255,230,200,0.18)' });

    // портрет
    ctx.save();
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(242,153,74,0.14)';
    ctx.fill();
    ctx.clip();
    if (this.person) {
      ctx.translate(pr.x, pr.y + 250);
      art.drawPerson(ctx, this.person, 0, 0, compact ? 320 : 300, { noShadow: true, noBag: true, sway: this.tt * 1.2 });
    } else {
      art.txt(ctx, this.icon || '☎', pr.x, pr.y + 20, 64, 'rgba(255,220,180,0.7)', 700, 'center');
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242,153,74,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // имя и роль
    var nx0 = compact ? 270 : 316;
    art.txt(ctx, this.name, nx0, compact ? 118 : 286, compact ? 26 : 18, '#ffc27a', 800);
    var nx = nx0 + art.txtW(ctx, this.name, compact ? 26 : 18, 800) + 14;
    if (this.role) art.txt(ctx, this.role, nx, compact ? 118 : 286, compact ? 16 : 13, 'rgba(255,235,215,0.6)', 600);
    if (this.mood) {
      var mx = nx + (this.role ? art.txtW(ctx, this.role, compact ? 16 : 13, 600) + 16 : 0);
      art.txt(ctx, this.mood, mx, compact ? 118 : 286, compact ? 16 : 12, 'rgba(255,200,140,0.8)', 600);
    }

    // текст с проявлением (до 3 строк)
    var shown = this.text.slice(0, Math.floor(this.revealed));
    var textW = compact ? 940 : 860;
    var textSize = compact ? 24 : 19;
    var lineH = compact ? 34 : 27;
    var textTop = compact ? 168 : 320;
    var lines = U.wrapLines(ctx, shown, textW, textSize, 600);
    var fullLines = U.wrapLines(ctx, this.text, textW, textSize, 600);
    // если текст не влез в три строки — честное многоточие вместо обрыва на полуслове
    if (fullLines.length > 3 && lines.length >= 3 && this.revealed >= this.full) {
      lines[2] = lines[2].replace(/\s+\S*$/, '') + '…';
    }
    lines.slice(0, 3).forEach(function (l, idx) {
      art.txt(ctx, l, nx0, textTop + idx * lineH, textSize, '#f6e9d8', 600);
    });
    // Варианты не должны наезжать на длинный текст и вылезать за панель:
    // раскладываем их после последней строки и поджимаем шаг под их число.
    var n = this.choices.length;
    var choiceH = compact ? 56 : 46;
    var bottom = p.y + p.h - (compact ? 14 : 14);
    if (n) {
      var top = compact
        ? Math.max(300, textTop + (Math.min(3, fullLines.length) - 1) * lineH + 30)
        : Math.max(372, textTop + (Math.min(3, fullLines.length) - 1) * lineH + 28);
      var gap = n > 1 ? Math.min(compact ? 64 : 60, (bottom - choiceH - top) / (n - 1)) : 60;
      if (gap < (compact ? 46 : 30)) gap = compact ? 46 : 30;
      for (var ci = 0; ci < n; ci++) {
        this.choiceRects[ci] = {
          x: compact ? 44 : 316, y: top + ci * gap,
          w: compact ? 1192 : 790, h: choiceH
        };
      }
    }

    // варианты: слева действие, справа — цена решения
    this.choices.forEach(function (c, i) {
      var r = this.choiceRects[i];
      var hover = U.hit(r, PVZ.input.x, PVZ.input.y) && PVZ.input.touch === false;
      var bg = hover ? '#f2994a' : 'rgba(56,41,33,0.94)';
      var fg = hover ? '#2a1a10' : '#f7ead8';
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 10, bg);
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 10, hover ? '#ffdcb0' : 'rgba(255,235,210,0.16)', 1.4);
      var label = (i + 1) + '. ' + c.label;
      var lsize = compact ? 20 : 16;
      var maxL = r.w - (c.hint ? 260 : 32);
      var fit = art.fitTxt(ctx, label, maxL, lsize, 700, compact ? 14 : 12);
      art.txt(ctx, fit.text, r.x + 18, r.y + r.h / 2 + (compact ? 7 : 6), fit.size, fg, 700);
      if (c.hint) {
        art.txt(ctx, sys.hintLabel(c.hint), r.x + r.w - 18, r.y + r.h / 2 + 6, compact ? 16 : 13, hover ? 'rgba(42,26,16,0.85)' : 'rgba(255,214,150,0.85)', 700, 'right');
      }
    }, this);
    if (!compact) art.txt(ctx, '1–' + this.choices.length + ' — быстрый выбор · Esc — пауза', 640, 652, 12, 'rgba(255,240,220,0.55)', 600, 'center');
    ctx.restore();
  };
  Dialogue.prototype.hitChoice = function (x, y) {
    for (var i = 0; i < this.choiceRects.length; i++) {
      if (U.hit(this.choiceRects[i], x, y)) return i;
    }
    return -1;
  };
  sys.Dialogue = Dialogue;

  /* ---------------- мини-игры / QTE ---------------- */
  function QTE(opts) {
    opts = opts || {};
    this.type = opts.type || 'rapid';
    this.title = opts.title || 'Быстро!';
    this.sub = opts.sub || '';
    this.onDone = opts.onDone || null;
    this.done = false;
    this.success = false;
    this.t = 0;
    this.tt = 0;
    this.closeDelay = 0.6;
    this.panel = { x: 300, y: 200, w: 680, h: 360 };
    this.hard = !!opts.hard;
    this.mods = (PVZ.state && PVZ.state.mods) ? PVZ.state.mods() : {};

    if (this.type === 'timing' || this.type === 'scan') {
      this.pos = 0;
      this.dir = 1;
      this.speed = (this.hard ? 1.15 : 0.8) * (this.type === 'scan' ? (this.mods.scanSpeed || 1) : 1);
      this.zoneW = (this.type === 'scan' ? 0.3 : 0.22) * (this.type === 'scan' ? (this.mods.scanZone || 1) : 1);
      this.zoneW = Math.min(0.6, this.zoneW);
      this.zone = U.rand(0.34, 0.66);
      this.limit = 8;
      this.code = opts.code || '0000';
    } else if (this.type === 'rapid') {
      this.need = this.hard ? 12 : 8;
      this.taps = 0;
      this.limit = 4.6;
      this.left = this.limit;
    } else if (this.type === 'wipe') {
      this.spots = [];
      for (var s = 0; s < 3; s++) {
        this.spots.push({ x: U.rand(0.15, 0.85), y: U.rand(0.2, 0.8), r: 34, done: false });
      }
      this.limit = 7;
      this.left = this.limit;
    } else if (this.type === 'trace') {
      this.progress = 0;
      this.need = 0.92;
      this.limit = 9;
      this.left = this.limit;
      this.wave = U.rand(0, Math.PI * 2);
    } else if (this.type === 'hold') {
      this.progress = 0;
      this.need = 1.7;
      this.limit = 8;
      this.left = this.limit;
      this.targetY = U.rand(0.35, 0.65);
      this.posY = 0.15;
      this.dir = 1;
    } else if (this.type === 'calm') {
      this.pos = 0;
      this.dir = 1;
      this.speed = this.hard ? 0.74 : 0.58;
      this.zoneW = this.hard ? 0.14 : 0.18;
      this.zone = U.rand(0.32, 0.68);
      this.rounds = 0;
      this.need = 3;
      this.stabs = 0;
      this.limit = 14;
      this.left = this.limit;
      this.flash = 0;
    } else if (this.type === 'cashier') {
      this.change = Math.round(U.ri(2, 9) * 10 + U.ri(0, 9) * 1);
      var coins = [50, 20, 10, 5, 2, 1];
      var good = this.coinSet(this.change, coins);
      this.options = [{ coins: good, ok: true }];
      var tries = 0;
      while (this.options.length < 3 && tries++ < 80) {
        var other = Math.max(1, this.change + U.pick([-30, -20, -10, 10, 20, 30]));
        if (other === this.change) continue;
        var set = this.coinSet(other, coins);
        if (!set) continue;
        if (this.options.some(function (o) { return o.sum === other; })) continue;
        this.options.push({ coins: set, sum: other, ok: false });
      }
      this.options.forEach(function (o) {
        o.sum = o.coins.reduce(function (a, b) { return a + b; }, 0);
      });
      this.options = U.shuffle(this.options);
      this.limit = 10;
      this.left = this.limit;
      this.tries = 0;
    } else if (this.type === 'count') {
      var target = opts.code || '0000';
      this.target = target;
      this.boxes = [];
      var n = 6;
      var hit = U.ri(2, 3);
      for (var i = 0; i < n; i++) {
        this.boxes.push({
          code: i < hit ? target : String(U.ri(1000, 9999)),
          x: 0.12 + (i % 3) * 0.28,
          y: 0.22 + Math.floor(i / 3) * 0.3,
          w: 0.2, h: 0.24,
          done: false,
          correct: i < hit
        });
      }
      this.boxes = U.shuffle(this.boxes);
      this.needCount = hit;
      this.found = 0;
      this.misses = 0;
      this.limit = 12;
      this.left = this.limit;
    } else if (this.type === 'sort') {
      this.round = 0;
      this.rounds = U.shuffle([
        { code: 'A-2-1', rack: 'A' }, { code: 'B-1-3', rack: 'B' },
        { code: 'C-3-2', rack: 'C' }, { code: 'B-2-2', rack: 'B' },
        { code: 'A-1-1', rack: 'A' }
      ]).slice(0, 4);
      this.limit = 12;
      this.left = this.limit;
      this.flash = 0;
    } else if (this.type === 'swipe') {
      this.need = 3;
      this.count = 0;
      this.limit = 8;
      this.left = this.limit;
      this.dir = opts.dir || 'right';
    }
  }

  QTE.prototype.coinSet = function (sum, coins) {
    var left = sum, set = [];
    for (var i = 0; i < coins.length && left > 0; i++) {
      while (left >= coins[i] && set.length < 8) { set.push(coins[i]); left -= coins[i]; }
    }
    return left === 0 ? set : null;
  };

  QTE.prototype.finish = function (ok) {
    if (this.done) return;
    this.success = ok;
    this.done = true;
    this.closeDelay = 0.75;
    if (ok) PVZ.audio.ok(); else PVZ.audio.bad();
    if (this.onDone) this.onDone(ok);
  };

  QTE.prototype.update = function (dt) {
    this.tt += dt;
    if (this.done) return;
    this.t += dt;
    var P = this.panel;
    var self = this;

    if (this.type === 'timing' || this.type === 'scan') {
      this.pos += this.dir * this.speed * dt;
      if (this.pos >= 1) { this.pos = 1; this.dir = -1; }
      if (this.pos <= 0) { this.pos = 0; this.dir = 1; }
      if (this.t > this.limit) this.finish(false);
    } else if (this.type === 'rapid') {
      this.left -= dt;
      if (this.left <= 0) this.finish(false);
    } else if (this.type === 'wipe') {
      this.left -= dt;
      if (this.spots.every(function (sp) { return sp.done; })) { this.finish(true); return; }
      if (this.left <= 0) { this.finish(false); return; }
      this.spots.forEach(function (sp) {
        if (sp.done) return;
        var sx = P.x + sp.x * P.w;
        var sy = P.y + 66 + sp.y * (P.h - 100);
        var dx = PVZ.input.x - sx, dy = PVZ.input.y - sy;
        if (PVZ.input.down && dx * dx + dy * dy < sp.r * sp.r * 2.4) sp.done = true;
      });
    } else if (this.type === 'trace') {
      this.left -= dt;
      if (this.left <= 0) { this.finish(false); return; }
      var x0 = P.x + 40, x1 = P.x + P.w - 40;
      var u = (PVZ.input.x - x0) / (x1 - x0);
      var py = this.pathY(PVZ.input.x);
      var near = Math.abs(PVZ.input.y - py) < 40;
      if (PVZ.input.down && u >= 0 && u <= 1 && near) {
        this.progress = Math.max(this.progress, u);
      }
      if (this.progress >= this.need) this.finish(true);
    } else if (this.type === 'hold') {
      this.left -= dt;
      if (this.left <= 0) { this.finish(false); return; }
      this.posY += this.dir * dt * 0.42;
      if (this.posY > 0.82) { this.posY = 0.82; this.dir = -1; }
      if (this.posY < 0.16) { this.posY = 0.16; this.dir = 1; }
      var bandTop = P.y + 90 + this.posY * (P.h - 150);
      var inBand = PVZ.input.down && PVZ.input.y > bandTop && PVZ.input.y < bandTop + 52 &&
        PVZ.input.x > P.x + 50 && PVZ.input.x < P.x + P.w - 50;
      if (inBand) this.progress = Math.min(this.need, this.progress + dt); else this.progress = Math.max(0, this.progress - dt * 1.4);
      this.inBand = inBand;
      if (this.progress >= this.need) this.finish(true);
    } else if (this.type === 'calm') {
      this.pos += this.dir * this.speed * dt;
      if (this.pos >= 1) { this.pos = 1; this.dir = -1; }
      if (this.pos <= 0) { this.pos = 0; this.dir = 1; }
      this.left -= dt;
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2);
      if (this.left <= 0) this.finish(false);
    } else if (this.type === 'cashier' || this.type === 'sort' || this.type === 'swipe') {
      this.left -= dt;
      if (this.left <= 0) this.finish(false);
    } else if (this.type === 'count') {
      this.left -= dt;
      if (this.left <= 0) this.finish(false);
    } else if (this.type === 'sort') {
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
    }
  };

  QTE.prototype.pathY = function (x) {
    var P = this.panel;
    var u = (x - (P.x + 40)) / (P.w - 80);
    return P.y + P.h * 0.55 + Math.sin(u * Math.PI * 2 + this.wave) * 48;
  };

  QTE.prototype.onTap = function (x, y) {
    if (this.done) return;
    var P = this.panel;
    if (this.type === 'timing' || this.type === 'scan') {
      this.finish(Math.abs(this.pos - this.zone) <= this.zoneW / 2);
    } else if (this.type === 'calm') {
      if (Math.abs(this.pos - this.zone) <= this.zoneW / 2) {
        this.rounds++;
        this.flash = 1;
        PVZ.audio.ok();
        this.pos = 0;
        this.dir = 1;
        this.zone = U.rand(0.3, 0.7);
        this.zoneW = Math.max(0.11, this.zoneW - 0.018);
        if (this.rounds >= this.need) this.finish(true);
      } else {
        this.stabs++;
        PVZ.audio.bad();
        this.left = Math.max(0.5, this.left - 2);
        if (this.stabs >= 3) this.finish(false);
      }
    } else if (this.type === 'rapid') {
      this.taps++;
      PVZ.audio.tap();
      if (this.taps >= this.need) this.finish(true);
    } else if (this.type === 'cashier') {
      var cw = (P.w - 80) / 3;
      for (var i = 0; i < this.options.length; i++) {
        var r = { x: P.x + 40 + i * cw, y: P.y + 190, w: cw - 12, h: 96 };
        if (U.hit(r, x, y)) {
          this.tries++;
          if (this.options[i].ok) { PVZ.audio.cash(); this.finish(true); }
          else {
            PVZ.audio.bad(); this.tries++;
            this.left = Math.max(0.5, this.left - 2);
            if (this.tries >= 3) this.finish(false);
          }
          return;
        }
      }
    } else if (this.type === 'sort') {
      var bw = (P.w - 80) / 3;
      for (var k = 0; k < 3; k++) {
        var br = { x: P.x + 40 + k * bw, y: P.y + P.h - 96, w: bw - 14, h: 66 };
        if (U.hit(br, x, y) && this.rounds[this.round]) {
          var want = sys.RACKS[k];
          if (this.rounds[this.round].rack === want) {
            this.round++;
            this.flash = 1;
            PVZ.audio.beep();
            if (this.round >= this.rounds.length) this.finish(true);
          } else {
            PVZ.audio.bad();
            this.left = Math.max(0.5, this.left - 2.5);
          }
          return;
        }
      }
    } else if (this.type === 'swipe') {
      // подсказка: свайп не тапом, но разрешаем и тап для доступности
      this.count += 1;
      if (this.count >= this.need) this.finish(true);
    } else if (this.type === 'count') {
      var self = this;
      this.boxes.forEach(function (b) {
        if (b.done) return;
        var bx = P.x + b.x * P.w, by = P.y + 68 + b.y * (P.h - 110);
        var bw = b.w * P.w, bh = b.h * P.h;
        if (U.hit({ x: bx, y: by, w: bw, h: bh }, x, y)) {
          b.done = true;
          b.clicked = true;
          if (b.correct) {
            self.found++;
            PVZ.audio.beep();
            if (self.found >= self.needCount) self.finish(true);
          } else {
            self.misses++;
            PVZ.audio.bad();
            self.left = Math.max(0.5, self.left - 1.5);
          }
        }
      });
    }
  };

  QTE.prototype.onSwipe = function (dir) {
    if (this.done || this.type !== 'swipe') return;
    if (dir === this.dir) {
      this.count++;
      PVZ.audio.ui();
      if (this.count >= this.need) this.finish(true);
    } else {
      PVZ.audio.bad();
      this.left = Math.max(0.5, this.left - 1.2);
    }
  };

  QTE.prototype.onKey = function (key) {
    if (this.done) return;
    if (key === ' ' || key === 'Enter') this.onTap(PVZ.input.x, PVZ.input.y);
    if (key === 'ArrowLeft') this.onSwipe('left');
    if (key === 'ArrowRight') this.onSwipe('right');
  };

  QTE.prototype.draw = function (ctx) {
    var W = 1280, H = 720;
    var P = this.panel;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (this.tt || 0) * 6);
    ctx.fillStyle = 'rgba(8,5,4,0.66)';
    ctx.fillRect(0, 0, W, H);
    art.panel(ctx, P.x, P.y, P.w, P.h, { bg: 'rgba(34,24,19,0.97)', r: 20, border: 'rgba(255,200,150,0.22)' });
    art.txt(ctx, this.title, P.x + P.w / 2, P.y + 46, 25, '#ffc27a', 800, 'center');
    if (this.sub) art.txt(ctx, this.sub, P.x + P.w / 2, P.y + 74, 14, 'rgba(255,235,215,0.7)', 600, 'center');

    if (this.type === 'scan') {
      var sx = P.x + 54, sw = P.w - 108, sy = P.y + 104, sh = 140;
      art.fillRR(ctx, sx - 8, sy - 8, sw + 16, sh + 16, 8, '#fdfaf3');
      art.barcode(ctx, sx, sy, sw, sh, this.code);
      var zx2 = sx + (this.zone - this.zoneW / 2) * sw;
      ctx.save();
      ctx.fillStyle = 'rgba(90,200,140,0.42)';
      ctx.fillRect(zx2, sy, this.zoneW * sw, sh);
      ctx.strokeStyle = 'rgba(120,240,175,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(zx2, sy, this.zoneW * sw, sh);
      ctx.restore();
      var lx = sx + this.pos * sw;
      ctx.save();
      ctx.shadowColor = 'rgba(255,70,50,0.95)';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#ff4a32';
      ctx.fillRect(lx - 2, sy - 12, 4, sh + 24);
      ctx.restore();
      art.txt(ctx, '↔ ' + this.code, sx + sw / 2, sy - 14, 14, 'rgba(255,240,220,0.55)', 700, 'center');
      art.txt(ctx, 'Нажмите, когда линия в зелёной зоне', P.x + P.w / 2, P.y + P.h - 28, 14, 'rgba(255,240,220,0.8)', 600, 'center');
    } else if (this.type === 'timing') {
      var bx = P.x + 60, bw = P.w - 120, by = P.y + 130, bh = 60;
      art.fillRR(ctx, bx, by, bw, bh, 12, 'rgba(0,0,0,0.4)');
      var zx = bx + (this.zone - this.zoneW / 2) * bw;
      art.fillRR(ctx, zx, by, this.zoneW * bw, bh, 8, 'rgba(90,200,140,0.45)');
      art.strokeRR(ctx, zx, by, this.zoneW * bw, bh, 8, 'rgba(140,240,180,0.9)', 2);
      var mx = bx + this.pos * bw;
      ctx.fillStyle = '#fff3e2';
      ctx.beginPath();
      ctx.moveTo(mx, by - 6); ctx.lineTo(mx - 11, by - 25); ctx.lineTo(mx + 11, by - 25);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2994a';
      ctx.fillRect(mx - 3, by - 4, 6, bh + 8);
      art.txt(ctx, 'Тапните / Space, когда бегунок в зелёной зоне', P.x + P.w / 2, P.y + P.h - 38, 15, 'rgba(255,240,220,0.8)', 600, 'center');
    } else if (this.type === 'calm') {
      var cbx = P.x + 60, cbw = P.w - 120, cby = P.y + 136, cbh = 52;
      art.fillRR(ctx, cbx, cby, cbw, cbh, 12, 'rgba(0,0,0,0.4)');
      var czx = cbx + (this.zone - this.zoneW / 2) * cbw;
      art.fillRR(ctx, czx, cby, this.zoneW * cbw, cbh, 8, 'rgba(90,200,140,0.42)');
      art.strokeRR(ctx, czx, cby, this.zoneW * cbw, cbh, 8, 'rgba(140,240,180,0.9)', 2);
      var cmx = cbx + this.pos * cbw;
      ctx.save();
      ctx.strokeStyle = this.flash > 0 ? '#9fe0c0' : '#ff8a5c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var cpx = 0; cpx <= 26; cpx += 2) {
        var ratio = cpx / 26;
        var amp = 18 * Math.sin(ratio * Math.PI * 2) * (ratio < 0.15 || ratio > 0.85 ? 0.4 : 1);
        if (cpx === 0) ctx.moveTo(cmx - 13 + cpx, cby + cbh / 2 + amp);
        else ctx.lineTo(cmx - 13 + cpx, cby + cbh / 2 + amp);
      }
      ctx.stroke();
      ctx.restore();
      art.fillRR(ctx, cmx - 2, cby - 8, 4, cbh + 16, 2, '#ffd479');
      for (var ri = 0; ri < this.need; ri++) {
        ctx.beginPath();
        ctx.arc(P.x + P.w / 2 - (this.need - 1) * 16 + ri * 32, cby + cbh + 30, 7, 0, Math.PI * 2);
        ctx.fillStyle = ri < this.rounds ? '#7fe0a0' : 'rgba(255,255,255,0.16)';
        ctx.fill();
      }
      art.txt(ctx, 'Дышите ровно. Нажимайте, когда пульс в зелёной зоне.', P.x + P.w / 2, cby + cbh + 62, 14, 'rgba(255,240,220,0.8)', 600, 'center');
      art.txt(ctx, this.rounds + ' / ' + this.need, P.x + P.w / 2, cby + cbh + 92, 16, '#ffd479', 800, 'center');
      art.bar(ctx, P.x + 60, P.y + P.h - 30, P.w - 120, 9, this.left / this.limit, '#e4572e');
    } else if (this.type === 'rapid') {
      art.bar(ctx, P.x + 60, P.y + 130, P.w - 120, 34, this.taps / this.need, '#5aa877');
      art.txt(ctx, this.taps + ' / ' + this.need, P.x + P.w / 2, P.y + 156, 20, '#fff', 800, 'center');
      art.txt(ctx, 'Тапайте по экрану как можно быстрее!', P.x + P.w / 2, P.y + 202, 16, 'rgba(255,240,220,0.85)', 600, 'center');
      art.bar(ctx, P.x + 60, P.y + 236, P.w - 120, 9, this.left / this.limit, '#e4572e');
    } else if (this.type === 'wipe') {
      this.spots.forEach(function (sp) {
        if (sp.done) return;
        var x = P.x + sp.x * P.w, y = P.y + 66 + sp.y * (P.h - 100);
        ctx.save();
        ctx.globalAlpha = 0.6;
        for (var i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(i * 2.1) * 16, y + Math.sin(i * 2.7) * 14, 12 + (i % 3) * 4, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 ? '#6b5a44' : '#7d6a52';
          ctx.fill();
        }
        ctx.restore();
      });
      art.txt(ctx, 'Проведите зажатой мышью/пальцем по пятнам', P.x + P.w / 2, P.y + P.h - 26, 15, 'rgba(255,240,220,0.8)', 600, 'center');
      art.bar(ctx, P.x + 60, P.y + 86, P.w - 120, 8, this.left / this.limit, '#e4572e');
    } else if (this.type === 'trace') {
      var x0 = P.x + 40, x1 = P.x + P.w - 40;
      // дорожка
      ctx.save();
      ctx.setLineDash([9, 9]);
      ctx.strokeStyle = 'rgba(255,220,180,0.35)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (var px = x0; px <= x1; px += 6) {
        var py = this.pathY(px);
        if (px === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      // прогресс
      ctx.save();
      ctx.strokeStyle = '#7fe0a0';
      ctx.lineWidth = 9;
      ctx.beginPath();
      var lim = x0 + (x1 - x0) * this.progress;
      for (var px2 = x0; px2 <= lim; px2 += 6) {
        var py2 = this.pathY(px2);
        if (px2 === x0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      ctx.stroke();
      ctx.restore();
      art.txt(ctx, 'Поставьте закорючку: ведите зажатой мышью по пунктиру', P.x + P.w / 2, P.y + P.h - 26, 14, 'rgba(255,240,220,0.8)', 600, 'center');
      art.bar(ctx, P.x + 60, P.y + 86, P.w - 120, 8, 1 - this.left / this.limit, '#e4572e');
    } else if (this.type === 'hold') {
      var barX = P.x + 70, barW = P.w - 140, barY = P.y + 110, barH = P.h - 190;
      art.fillRR(ctx, barX, barY, barW, barH, 12, 'rgba(0,0,0,0.28)');
      var bandTop = P.y + 90 + this.posY * (P.h - 150);
      var bandCol = this.inBand ? 'rgba(120,230,160,0.55)' : 'rgba(242,153,74,0.35)';
      art.fillRR(ctx, barX, bandTop, barW, 52, 10, bandCol);
      art.strokeRR(ctx, barX, bandTop, barW, 52, 10, this.inBand ? '#9df0bb' : 'rgba(255,210,150,0.7)', 2);
      art.txt(ctx, 'ДЕРЖИТЕ', barX + barW / 2, bandTop + 34, 18, '#20140c', 800, 'center');
      art.bar(ctx, P.x + 60, P.y + P.h - 52, P.w - 120, 12, this.progress / this.need, '#5aa877');
      art.txt(ctx, 'Зажмите мышь/палец внутри полосы и удержите', P.x + P.w / 2, P.y + P.h - 16, 14, 'rgba(255,240,220,0.75)', 600, 'center');
    } else if (this.type === 'cashier') {
      art.txt(ctx, 'Сдача: ' + this.change + ' ₽', P.x + P.w / 2, P.y + 118, 26, '#ffd479', 800, 'center');
      art.txt(ctx, 'Выберите точный набор монет и купюр', P.x + P.w / 2, P.y + 146, 14, 'rgba(255,240,220,0.7)', 600, 'center');
      var cw = (P.w - 80) / 3;
      this.options.forEach(function (o, i) {
        var r = { x: P.x + 40 + i * cw, y: P.y + 190, w: cw - 12, h: 96 };
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? 'rgba(242,153,74,0.9)' : 'rgba(255,255,255,0.07)');
        art.strokeRR(ctx, r.x, r.y, r.w, r.h, 12, hov ? '#ffdcb0' : 'rgba(255,235,210,0.2)', 1.5);
        var tx = r.x + r.w / 2;
        art.txt(ctx, o.coins.join(' + '), tx, r.y + 40, 15, hov ? '#2a1a10' : '#f7ead8', 700, 'center');
        art.txt(ctx, '= ' + o.sum + ' ₽', tx, r.y + 70, 19, hov ? '#2a1a10' : '#ffd479', 800, 'center');
      }, this);
      art.bar(ctx, P.x + 60, P.y + P.h - 46, P.w - 120, 8, this.left / this.limit, '#e4572e');
    } else if (this.type === 'count') {
      art.txt(ctx, 'Найдите посылки покупателя · ' + this.found + '/' + this.needCount, P.x + P.w / 2, P.y + 108, 17, '#ffd8a8', 700, 'center');
      this.boxes.forEach(function (b) {
        var bx = P.x + b.x * P.w, by = P.y + 68 + b.y * (P.h - 110);
        var bw = b.w * P.w, bh = b.h * P.h;
        if (b.done && b.clicked) {
          art.fillRR(ctx, bx, by, bw, bh, 8, b.correct ? 'rgba(90,168,119,0.25)' : 'rgba(228,87,46,0.2)');
          art.strokeRR(ctx, bx, by, bw, bh, 8, b.correct ? 'rgba(127,224,160,0.5)' : 'rgba(228,87,46,0.4)', 2);
          return;
        }
        art.drawParcel(ctx, bx, by, bw, bh, { code: b.code, seed: parseInt(b.code.charAt(0), 10) % 6 });
      });
      art.bar(ctx, P.x + 60, P.y + P.h - 46, P.w - 120, 8, this.left / this.limit, '#e4572e');
    } else if (this.type === 'sort') {
      var cur = this.rounds[this.round];
      art.txt(ctx, 'Разложите посылку на стеллаж', P.x + P.w / 2, P.y + 106, 17, '#ffd8a8', 700, 'center');
      if (cur) {
        art.drawParcel(ctx, P.x + P.w / 2 - 70, P.y + 126, 140, 96, { code: cur.code, seed: 2 });
        art.txt(ctx, cur.code, P.x + P.w / 2, P.y + 252, 24, '#fff3e2', 800, 'center');
      }
      var bw2 = (P.w - 80) / 3;
      sys.RACKS.forEach(function (r, i) {
        var br = { x: P.x + 40 + i * bw2, y: P.y + P.h - 96, w: bw2 - 14, h: 66 };
        var hov = U.hit(br, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, br.x, br.y, br.w, br.h, 12, hov ? 'rgba(242,153,74,0.92)' : 'rgba(255,255,255,0.08)');
        art.txt(ctx, 'СТЕЛЛАЖ ' + r, br.x + br.w / 2, br.y + 41, 17, hov ? '#2a1a10' : '#f7ead8', 800, 'center');
      });
      art.bar(ctx, P.x + 60, P.y + P.h - 46, P.w - 120, 8, this.left / this.limit, '#e4572e');
    } else if (this.type === 'swipe') {
      art.txt(ctx, 'Проведите карту', P.x + P.w / 2, P.y + 150, 24, '#ffd8a8', 800, 'center');
      var ax = P.x + P.w / 2 + Math.sin(this.tt * 4) * 40;
      var ay = P.y + 210;
      art.fillRR(ctx, ax - 70, ay, 140, 90, 10, '#3e6a8a');
      art.fillRR(ctx, ax - 60, ay + 12, 40, 26, 5, '#e8c46a');
      art.txt(ctx, this.dir === 'right' ? '→ →' : '← ←', P.x + P.w / 2, P.y + 330, 22, 'rgba(255,240,220,0.8)', 700, 'center');
      art.txt(ctx, this.count + ' / ' + this.need, P.x + P.w / 2, P.y + 368, 18, '#ffd479', 800, 'center');
      art.txt(ctx, 'Свайп вправо или тап', P.x + P.w / 2, P.y + P.h - 22, 14, 'rgba(255,240,220,0.7)', 600, 'center');
    }
    if (this.done) {
      art.txt(ctx, this.success ? '✓' : '✕', P.x + P.w / 2, P.y + P.h / 2 + 60, 64,
        this.success ? '#7fe0a0' : '#ff8a5c', 900, 'center');
    }
    ctx.restore();
  };
  sys.QTE = QTE;

  /* ---------------- магазин ---------------- */
  /* Улучшения влияют на процесс, декор — на вид ПВЗ и настроение покупателей.
     У каждого предмета три уровня: обычный → серебряный → золотой. */
  sys.SHOP = [
    { id: 'scanner_pro', cat: 'up', name: 'Сканер-про', price: 1800, icon: '▮', desc: 'Зелёная зона шире, луч медленнее', eff: ['зона +65%', 'зона +85%', 'зона +105%'], effect: { scanZone: 1.65, scanSpeed: 0.78 } },
    /* Единственное улучшение, которое не ускоряет таймеры, а убирает ручную рутину:
       лента → браслет → камера. Именно оно спасает от «работы» на длинной дистанции. */
    { id: 'automation', cat: 'up', name: 'Автоматизация выдачи', price: 3200, icon: '⚙', desc: 'Меньше беготни за каждым заказом', eff: ['лента: посылка сама на столе', 'браслет: штрихкод считан сам', 'камера: код с телефона сам'] },
    { id: 'coffee', cat: 'up', name: 'Кофемашина', price: 1500, icon: '☕', desc: 'Покупатели ждут спокойнее', eff: ['терпение +24%', 'терпение +30%', 'терпение +36%'] },
    { id: 'music', cat: 'up', name: 'Колонка с музыкой', price: 1200, icon: '♪', desc: 'Добрая музыка в зале', eff: ['терпение +12%', 'терпение +17%', 'терпение +22%'] },
    { id: 'uniform', cat: 'up', name: 'Фирменная форма', price: 1400, icon: '👕', desc: 'Аккуратный вид сотрудника', eff: ['чаевые +15%', 'чаевые +25%', 'чаевые +35%'] },
    { id: 'courses', cat: 'up', name: 'Курсы сервиса', price: 2000, icon: '🎓', desc: 'Репутация растёт быстрее', eff: ['репутация +35%', 'репутация +60%', 'репутация +85%'] },
    { id: 'ad', cat: 'up', name: 'Реклама ПВЗ', price: 1600, icon: '📣', desc: 'Покупатели приходят чаще', eff: ['план +2 · поток +18%', 'план +4 · поток +26%', 'план +6 · поток +34%'] },
    { id: 'terminal_pro', cat: 'up', name: 'Быстрый терминал', price: 2200, icon: '⌨', desc: 'Операции занимают меньше времени', eff: ['операции −28%', 'операции −35%', 'операции −42%'] },
    { id: 'premium', cat: 'up', name: 'Премиум-сервис', price: 2800, icon: '★', desc: 'Постоянные клиенты и щедрые чаевые', eff: ['чаевые +30%', 'чаевые +50%', 'чаевые +70%'] },

    /* Декор — уют: каждый уровень предмета даёт +2,5% к терпению */
    { id: 'decor_plant', cat: 'decor', name: 'Фикус на стойку', price: 600, icon: '🌿', desc: 'Зелёный уголок на столе', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_cat', cat: 'decor', name: 'Фигурка кота', price: 700, icon: '🐈', desc: 'Талисман ПВЗ', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_lamp', cat: 'decor', name: 'Лампа-гриб', price: 900, icon: '💡', desc: 'Тёплый свет на столе', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_poster', cat: 'decor', name: 'Постер «Улыбнитесь»', price: 500, icon: '🖼', desc: 'Настроение в зале', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_rug', cat: 'decor', name: 'Ковёр в зал', price: 1100, icon: '▦', desc: 'Мягко и тепло', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_sofa', cat: 'decor', name: 'Диванчик', price: 1800, icon: '🛋', desc: 'Есть где подождать', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_aquarium', cat: 'decor', name: 'Аквариум', price: 2200, icon: '🐠', desc: 'Успокаивает и радует', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_neon', cat: 'decor', name: 'Неоновая вывеска', price: 1600, icon: '◍', desc: 'Видно с улицы', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_shelf', cat: 'decor', name: 'Полка с растениями', price: 1300, icon: '🪴', desc: 'Зелень в зале', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] },
    { id: 'decor_clock', cat: 'decor', name: 'Настольные часы', price: 800, icon: '🕰', desc: 'Красивые часы на столе', eff: ['уют +2,5%', 'уют +5%', 'уют +7,5%'] }
  ];

  sys.shopItem = function (id) {
    for (var i = 0; i < sys.SHOP.length; i++) if (sys.SHOP[i].id === id) return sys.SHOP[i];
    return null;
  };

  sys.shopByCat = function (cat) {
    return sys.SHOP.filter(function (it) { return it.cat === cat; });
  };

  /* ---------------- мафия: вечерний «оброк» ---------------- */
  /* Сумма растёт каждую смену, но она посильна: за 10 смен оброк в сумме
     ровно равен долгу, поэтому аккуратный игрок может закрыть долг и стать
     свободным. Если денег не хватает — забирают предмет из улучшений
     или декора и говорят об этом вслух. */
  sys.MAFIA_BASE = 350;
  sys.MAFIA_STEP = 130;
  sys.DEBT_TOTAL = 9350; // 350+480+…+1520 за десять смен

  sys.mafiaDemand = function (day) {
    return sys.MAFIA_BASE + (Math.max(1, day || 1) - 1) * sys.MAFIA_STEP;
  };

  sys.MAFIA_ITEM_LINES = {
    decor_cat: 'У тебя нет денег, чтобы расплатиться с нами? Тогда этот кот поможет. *собирает фигурку кота со стола*',
    decor_sofa: 'Тогда диванчик поедет к нам. Неплохо устроился за наши деньги.',
    decor_aquarium: 'Аквариум заберём. Рыбки тоже должны отрабатывать долг.',
    decor_rug: 'Ковёр сойдёт за часть долга. Не спорь.',
    decor_neon: 'Неоновая вывеска? Теперь будет светить у нас.',
    decor_poster: 'Постер «Улыбнитесь»? Сейчас улыбнёшься ты.',
    decor_plant: 'Фикус поедет в офис. Будешь вспоминать, кому обязан.',
    decor_lamp: 'Лампу забираем — нам тоже нужен свет.',
    decor_shelf: 'Полку с растениями завернём. Не благодари.',
    decor_clock: 'Часы заберём. Твоё время теперь наше.',
    scanner_pro: 'Сканер-про? Пригодится нам. Ищи код вручную.',
    coffee: 'Кофемашину — на склад. Кофе будешь пить, когда долг закроешь.',
    music: 'Колонку заберём. Тишина лучше воспитывает.',
    uniform: 'Фирменную форму снимай. Теперь это наша униформа.',
    courses: 'Курсы сервиса? Мы сами научим тебя вежливости.',
    ad: 'Рекламу отключаем. Клиентов тебе найдём мы.',
    terminal_pro: 'Быстрый терминал поедет к нам. Считай в уме.',
    premium: 'Премиум-сервис? Премиум здесь только мы.',
    automation: 'Автоматизацию отключаем. Сами будете бегать за каждой коробкой.'
  };

  /* Самый дорогой по уровню предмет: сначала золото, потом серебро */
  sys.mafiaPickItem = function () {
    var d = PVZ.state.data;
    if (!d || !Array.isArray(d.owned)) return null;
    var list = d.owned.map(function (id) {
      var item = sys.shopItem(id);
      if (!item) return null;
      return { id: id, item: item, level: PVZ.state.level(id) };
    }).filter(Boolean);
    if (!list.length) return null;
    list.sort(function (a, b) {
      if (b.level !== a.level) return b.level - a.level;
      return b.item.price - a.item.price;
    });
    return list[0];
  };

  sys.mafiaCollect = function () {
    var d = PVZ.state.data;
    if (!d) return null;
    // в бесконечном режиме мафии нет — вечером приходит арендодатель
    if (d.mode === 'endless') return null;
    // долг закрыт — мафия больше не приходит
    if ((d.debt || 0) <= 0) {
      d.freed = true;
      return null;
    }
    var demand = sys.mafiaDemand(d.day || 1);
    var res = {
      day: d.day || 1,
      demand: demand,
      paid: 0,
      short: false,
      moneyBefore: d.money || 0,
      moneyAfter: d.money || 0,
      debtBefore: d.debt || 0,
      debtAfter: d.debt || 0,
      taken: [],
      rage: false
    };
    if (res.moneyBefore >= demand) {
      d.money -= demand;
      res.paid = demand;
      d.debt = Math.max(0, (d.debt || 0) - demand);
      if (d.debt <= 0) d.freed = true;
    } else {
      res.short = true;
      // отдаём всё, что есть
      res.paid = Math.max(0, res.moneyBefore);
      d.money = 0;
      d.debt = Math.max(0, (d.debt || 0) - res.paid);
      if (d.debt <= 0) d.freed = true;
      // и забираем предмет
      var pick = sys.mafiaPickItem();
      if (pick) {
        var tier = PVZ.tier(pick.level);
        d.owned = d.owned.filter(function (id) { return id !== pick.id; });
        if (d.levels) delete d.levels[pick.id];
        if (!Array.isArray(d.mafiaTaken)) d.mafiaTaken = [];
        d.mafiaTaken.push({ id: pick.id, day: res.day });
        res.taken.push({
          id: pick.id,
          name: pick.item.name,
          icon: pick.item.icon || '▣',
          level: pick.level,
          tier: tier ? tier.name : 'обычный',
          price: pick.item.price,
          line: sys.MAFIA_ITEM_LINES[pick.id] || ('Тогда заберём вот это: ' + pick.item.name + '. В счёт долга.')
        });
      } else {
        // брать нечего — только угроза и удар по репутации
        d.rating = U.clamp((d.rating || 4) - 0.12, 1, 5);
        res.rage = true;
      }
    }
    d.mafiaVisits = (d.mafiaVisits || 0) + 1;
    d.mafiaPaid = (d.mafiaPaid || 0) + res.paid;
    res.moneyAfter = d.money;
    res.debtAfter = d.debt;
    res.visits = d.mafiaVisits;
    PVZ.state.save();
    return res;
  };

  /* ---------------- бесконечный режим: аренда ---------------- */
  /* Мафии здесь нет. Вместо неё каждый вечер приходит арендодатель:
     фиксированная ставка (растёт с каждой сменой) плюс доля выручки.
     Доля выручки держит аренду посильной и на 10-й смене, и на 10 000-й,
     а фиксированная часть растёт линейно и упирается в потолок —
     иначе числа улетели бы в бесконечность. */
  sys.rentParts = function (day, revenue) {
    var bal = PVZ.balance;
    var d = Math.max(1, day || 1);
    var reviews = Math.floor((d - 1) / bal.rentReviewEvery);
    var fixed = Math.min(bal.rentMaxBase, bal.rentBase + (d - 1) * bal.rentPerDay);
    var mult = 1 + Math.min(3.5, reviews * 0.12);
    var share = Math.min(bal.rentShareMax, bal.rentShare + reviews * bal.rentShareStep);
    return {
      fixed: Math.round(fixed * mult),
      percent: Math.round(Math.max(0, revenue || 0) * share),
      share: share,
      reviews: reviews
    };
  };

  sys.rentDue = function (day, revenue) {
    var p = sys.rentParts(day, revenue);
    return p.fixed + p.percent;
  };

  sys.rentCollect = function (shiftRevenue) {
    var d = PVZ.state.data;
    if (!d) return null;
    if (!d.rent || typeof d.rent !== 'object') d.rent = { unpaid: 0, paidTotal: 0, lastDemand: 0, strikes: 0 };
    var parts = sys.rentParts(d.day || 1, shiftRevenue);
    var due = parts.fixed + parts.percent + (d.rent.unpaid || 0);
    var paid = Math.min(Math.max(0, d.money || 0), due);
    d.money = Math.max(0, (d.money || 0) - paid);
    var unpaid = Math.max(0, due - paid);
    d.rent.unpaid = unpaid;
    d.rent.lastDemand = due;
    d.rent.paidTotal = (d.rent.paidTotal || 0) + paid;
    d.rent.strikes = unpaid > 0 ? (d.rent.strikes || 0) + 1 : 0;
    var evicted = unpaid > 0 && d.rent.strikes >= PVZ.balance.rentUnpaidLimit;
    return {
      due: due,
      paid: paid,
      short: unpaid > 0,
      unpaid: unpaid,
      strikes: d.rent.strikes,
      evicted: evicted,
      fixed: parts.fixed,
      percent: parts.percent,
      share: parts.share,
      day: d.day || 1
    };
  };

  /* ---------------- сюжет мафии ---------------- */
  /* Куратор, ящик «мимо кассы», рейд, предложение работать на них и сделка
     с участковым. Каждая сцена даёт доверие, грязь или улику — из этой
     троицы к финалу складывается один из пяти концов. */
  var KOSTYA = { skin: 2, hair: '#3a2a1e', style: 'short', shirt: '#4b5a66', pants: '#2a2f36', coat: '#34424c', expr: 'neutral' };
  var GOON = { skin: 3, hair: '#15110e', style: 'short', shirt: '#24242e', pants: '#1b1b21', coat: '#181820', beard: true, expr: 'angry' };
  var BOSS = { skin: 1, hair: '#161412', style: 'short', shirt: '#1b1b22', pants: '#141418', coat: '#101014', beard: true, expr: 'angry', glasses: true };
  var COP = { skin: 1, hair: '#2a2420', style: 'short', shirt: '#3c5a7a', pants: '#22303f', coat: '#2a3a4a', expr: 'neutral' };

  sys.MAFIA_STORIES = [
    {
      id: 'curator', day: 2, name: 'Костя', role: 'куратор от Босса', person: KOSTYA, install: 'debt',
      text: 'Здравствуйте. Я Костя, буду заходить и смотреть, как вы работаете. Босс не любит сюрпризов. Пока — просто знакомимся.',
      choices: [
        { label: 'Спросить, как всё устроено', hint: 'информация', trust: 0, dirt: 0, proof: 0,
          note: 'Костя: «Работайте чисто — и никто вас не тронет. Долг — это просто цифра в блокноте».' },
        { label: 'Держаться предельно вежливо', hint: 'они это ценят', trust: 8, note: 'Костя довольно кивнул: «С вами приятно иметь дело».' },
        { label: 'Ответить дерзко', hint: 'они это запомнят', trust: -12, dirt: 3,
          note: 'Костя усмехнулся и записал что-то в блокнот. Ничего хорошего это не значит.' }
      ]
    },
    {
      id: 'parcel', day: 3, name: 'Костя', role: 'куратор от Босса', person: KOSTYA,
      text: 'Тут такое дело. Один ящик нужно подержать у вас до утра. Не сканировать, в отчёт не писать. Босс закроет часть долга.',
      choices: [
        { label: 'Взять ящик', hint: 'деньги · грязно', trust: 10, dirt: 12, money: 400,
          note: 'Ящик ушёл на склад. В накладных его нет — как и не было.' },
        { label: 'Отказаться', hint: 'они недовольны', trust: -12,
          note: 'Костя забрал ящик и ушёл, не попрощавшись.' },
        { label: 'Взять и записать в журнал смены', hint: 'улика', trust: 6, dirt: 6, proof: 1, money: 400,
          note: 'Ящик на складе, а в журнале — аккуратная запись с датой. Такое иногда пригождается.' }
      ]
    },
    {
      id: 'raid', day: 6, name: 'Громила', role: 'человек Босса', person: GOON,
      text: 'Полиция у соседей, по району идут. Мне надо переждать. Пустишь на склад на полчаса?',
      choices: [
        { label: 'Спрятать его на складе', hint: 'доверие · грязь', trust: 16, dirt: 10, hidden: true,
          note: 'Полчаса тишины на складе. Потом он ушёл и хлопнул дверью так, что звякнул колокольчик.' },
        { label: 'Сказать, что не видел', hint: 'нейтрально', trust: -6,
          note: 'Он ушёл, но запомнил, что вы «не видели».' },
        { label: 'Позвонить участковому, пока он на складе', hint: 'улика · опасно', proof: 1, trust: -25, dirt: -3,
          note: 'Через десять минут подъехала машина. Громилу увели. Вам этого не забудут.' }
      ]
    },
    {
      id: 'offer', day: 7, name: 'Босс', role: 'глава района', person: BOSS,
      text: 'Ты умеешь работать. Закроем долг — и работаешь на нас: точка в сети, доля с оборота, охрана. Откажешься — доработаешь по общим правилам.',
      choices: [
        { label: 'Согласиться', hint: 'путь «свой человек»', trust: 25, dirt: 10, path: 'family',
          note: 'Босс протянул руку. Теперь у вас есть покровитель — и начальник.' },
        { label: 'Отказаться', hint: 'они запомнят', trust: -10,
          note: 'Босс кивнул: «Как хочешь. Пока».' },
        { label: 'Спросить, что будет с пунктом', hint: 'информация',
          note: 'Босс: «С пунктом будет то, что скажу я. Пока — работай».' }
      ]
    },
    {
      id: 'deal', day: 8, name: 'Участковый', role: 'полиция', person: COP, needProof: 1,
      text: 'У нас на вас ничего нет. Но если принесёте бумаги на этих людей — пункт останется ваш. Подумайте, я не тороплю.',
      choices: [
        { label: 'Согласиться помогать', hint: 'улика', proof: 1,
          note: 'Участковый дал номер и попросил «вспомнить всё, что записывали».' },
        { label: 'Отказаться', hint: 'тишина', trust: 5,
          note: 'Участковый пожал плечами: «Ну, как знаете».' }
      ]
    }
  ];

  sys.mafiaStory = function (id) {
    for (var i = 0; i < sys.MAFIA_STORIES.length; i++) if (sys.MAFIA_STORIES[i].id === id) return sys.MAFIA_STORIES[i];
    return null;
  };

  /* Какая сюжетная сцена ждёт игрока: первая непройденная, срок которой наступил */
  sys.mafiaStoryNext = function (day) {
    if (!PVZ.state || !PVZ.state.data) return null;
    var m = PVZ.state.mafiaState();
    var d = Math.max(1, day || 1);
    for (var i = 0; i < sys.MAFIA_STORIES.length; i++) {
      var s = sys.MAFIA_STORIES[i];
      if (m.seen.indexOf(s.id) >= 0) continue;
      if (s.day > d) continue;
      if (s.needProof && (m.proof || 0) < s.needProof) continue;
      return s;
    }
    return null;
  };

  sys.mafiaStoryApply = function (id, index) {
    var story = sys.mafiaStory(id);
    var ch = story && story.choices[index];
    if (!ch || !PVZ.state || !PVZ.state.data) return null;
    var m = PVZ.state.mafiaState();
    if (ch.trust) PVZ.state.mafiaAdd('trust', ch.trust);
    if (ch.dirt) PVZ.state.mafiaAdd('dirt', ch.dirt);
    if (ch.proof) PVZ.state.mafiaAdd('proof', ch.proof);
    if (ch.money) PVZ.state.addMoney(ch.money);
    if (ch.path) m.path = ch.path;
    if (ch.hidden !== undefined) m.hidden = !!ch.hidden;
    if (story.install) PVZ.state.installApp(story.install);
    if (m.seen.indexOf(id) < 0) m.seen.push(id);
    PVZ.state.save();
    return {
      note: ch.note || '',
      install: story.install || null,
      trust: m.trust, dirt: m.dirt, proof: m.proof
    };
  };

  /* Вечерний визит: теперь это разговор, а не катсцена.
     pay — отдать, defer — отсрочка под проценты, favor — отработать услугой,
     threat — намекнуть на улики (только если они есть). */
  sys.MAFIA_VISIT_CHOICES = [
    { id: 'pay', label: 'Отдать как просили', hint: 'деньги · без последствий' },
    { id: 'defer', label: 'Попросить отсрочку', hint: 'проценты · они недовольны' },
    { id: 'favor', label: 'Отработать услугой', hint: 'грязно · долг тает' },
    { id: 'threat', label: 'Намекнуть на полицию', hint: 'улики · они запомнят' }
  ];

  sys.mafiaVisit = function (mode) {
    var d = PVZ.state.data;
    if (!d) return null;
    if (d.mode === 'endless') return null;
    if ((d.debt || 0) <= 0) { d.freed = true; return null; }
    var m = PVZ.state.mafiaState();
    mode = mode || 'pay';

    if (mode === 'pay') {
      var paidRes = sys.mafiaCollect();
      if (paidRes) {
        paidRes.mode = 'pay';
        paidRes.trust = m.trust;
        paidRes.dirt = m.dirt;
        paidRes.proof = m.proof;
      }
      return paidRes;
    }
    if (mode === 'threat' && (m.proof || 0) < 2) return { blocked: true, mode: mode };

    var demand = sys.mafiaDemand(d.day || 1);
    var res = {
      mode: mode,
      day: d.day || 1,
      demand: demand,
      paid: 0,
      short: false,
      moneyBefore: d.money || 0,
      moneyAfter: d.money || 0,
      debtBefore: d.debt || 0,
      debtAfter: d.debt || 0,
      taken: [],
      rage: false,
      visits: 0
    };
    if (mode === 'defer') {
      var interest = Math.max(50, Math.round(demand * 0.2));
      d.debt = (d.debt || 0) + interest;
      res.interest = interest;
      res.deferred = true;
      PVZ.state.mafiaAdd('trust', -8);
    } else if (mode === 'favor') {
      PVZ.state.mafiaAdd('dirt', 12);
      PVZ.state.mafiaAdd('trust', 10);
      m.task = {
        need: 8,
        remaining: 8,
        reward: Math.max(200, Math.round(demand * 1.5)),
        day: d.day || 1
      };
      res.favor = true;
      res.task = { need: m.task.need, remaining: m.task.remaining, reward: m.task.reward };
    } else if (mode === 'threat') {
      PVZ.state.mafiaAdd('trust', -30);
      PVZ.state.mafiaAdd('dirt', -4);
      res.threat = true;
      if ((m.proof || 0) >= 3) m.path = 'snitch';
    }
    d.mafiaVisits = (d.mafiaVisits || 0) + 1;
    m.visits = (m.visits || 0) + 1;
    res.visits = m.visits;
    res.debtAfter = d.debt;
    res.trust = m.trust;
    res.dirt = m.dirt;
    res.proof = m.proof;
    res.task = m.task || null;
    PVZ.state.save();
    return res;
  };

  /* Услуга: смена «под присмотром» — надо обслужить 8 покупателей.
     Когда счётчик дошёл до нуля, долг тает, а грязи прибавляется. */
  sys.mafiaTaskServe = function () {
    var d = PVZ.state.data;
    if (!d || d.mode === 'endless') return null;
    var m = PVZ.state.mafiaState();
    if (!m.task || m.task.remaining <= 0) return null;
    m.task.remaining--;
    if (m.task.remaining > 0) return { remaining: m.task.remaining, need: m.task.need, done: false };
    var reward = m.task.reward || 500;
    d.debt = Math.max(0, (d.debt || 0) - reward);
    m.task = null;
    PVZ.state.mafiaAdd('dirt', 8);
    PVZ.state.mafiaAdd('trust', 8);
    if (d.debt <= 0) d.freed = true;
    PVZ.state.save();
    return { done: true, reward: reward, debt: d.debt };
  };

  /* Итог забега по сюжету мафии */
  sys.mafiaEnding = function () {
    var d = PVZ.state.data;
    if (!d) return null;
    var m = d.mafia || {};
    var proof = m.proof || 0;
    var dirt = m.dirt || 0;
    var debt = d.debt || 0;
    var path = m.path || null;
    if (proof >= 3) {
      return {
        id: 'snitch', title: 'СТУКАЧ', color: '#8fb8e0',
        line: 'Папка с уликами ушла в отдел. Район стал тише, пункт — целее.',
        epilogue: 'Вас не любят, зато боятся. Пункт ' + PVZ.state.title() + ' работает, а вечером у двери больше никто не стоит.'
      };
    }
    if (path === 'family') {
      return {
        id: 'family', title: 'СВОЙ ЧЕЛОВЕК', color: '#ffd479',
        line: 'Долг закрыт работой на них. У вас есть доля, охрана и очень внимательный куратор.',
        epilogue: 'Пункт стал частью сети. Вы больше не хозяин — вы управляющий. Зато сытый.'
      };
    }
    if (debt <= 0) {
      return {
        id: 'free', title: 'СВОБОДЕН', color: '#8fe0a8',
        line: 'Вы закрыли долг до копейки. Босс ушёл, не попрощавшись.',
        epilogue: 'Пункт ваш. По вечерам у двери никого, и это лучшая новость за десять смен.'
      };
    }
    if (dirt >= 70) {
      return {
        id: 'dirty', title: 'ПО УШИ В ГРЯЗИ', color: '#c9a2e8',
        line: 'Долг остался, зато вы стали удобным. Половина склада — уже не ваша.',
        epilogue: 'Пункт работает, но приходит всё больше людей без накладных. Вы давно не задаёте вопросов.'
      };
    }
    return {
      id: 'debt', title: 'ДОЛГ ОСТАЛСЯ', color: '#ffb07a',
      line: 'Вы продержались десять смен. Босс недоволен, но даёт ещё время.',
      epilogue: 'Вы слишком полезны, чтобы вас терять. Значит, будут приходить снова.'
    };
  };

  /* ---------------- отложенные последствия ---------------- */
  /* Решение, принятое на смене N, возвращается на смене N+2. Игрок видит
     не только мгновенную цену выбора («недолго · плохой отзыв»), но и то,
     что из этого выросло. Пока последствий немного и они привязаны
     к конкретным бытовым историям — так их легко связать с причиной. */
  sys.CONSEQUENCES = {
    vlogger_bad: {
      title: 'Ролик про ваш пункт',
      text: 'Блогер всё-таки выложил «Худший ПВЗ района». К утру — 40 тысяч просмотров, злые комментарии и один очень плохой отзыв. Клиенты заходят уже с настроением.',
      apply: function () {
        PVZ.state.addRating(-0.22);
        sys.addReview(null, 1, {
          author: 'Блогер',
          text: 'Показал всё как есть — тут не любят камеры и людей. Заходите на свой страх и риск.'
        });
        return { kind: 'bad' };
      }
    },
    vlogger_good: {
      title: 'Ролик про ваш пункт',
      text: 'Ролик блогера собрал 12 тысяч просмотров: «Вот как надо работать в ПВЗ». Утром у двери ждут новые клиенты, а в сети хвалят.',
      apply: function () {
        PVZ.state.addRating(0.14);
        PVZ.state.addMoney(260);
        sys.addReview(null, 5, {
          author: 'Зритель',
          text: 'Пришёл после ролика — и правда быстро и по-человечески. Спасибо!'
        });
        return { kind: 'good' };
      }
    },
    kid_saved: {
      title: 'Родители того мальчика',
      text: 'Мама потерявшегося мальчика зашла поблагодарить: принесла коробку конфет и конверт «на чай». Такие истории в районе помнят дольше рекламы.',
      apply: function () {
        PVZ.state.addMoney(320);
        PVZ.state.addRating(0.06);
        sys.addReview(null, 5, {
          author: 'Мама Миши',
          text: 'Спасибо, что не прошли мимо ребёнка. Побольше бы таких пунктов.'
        });
        return { kind: 'good' };
      }
    },
    neighbor_rude: {
      title: 'Жалоба из соседнего магазина',
      text: 'Сосед написал в управу: «Очередь из ПВЗ перекрывает вход, сотрудник хамит». Пришла бумага — пришлось заплатить штраф и извиняться.',
      apply: function () {
        PVZ.state.addRating(-0.09);
        PVZ.state.addMoney(-220);
        return { kind: 'bad' };
      }
    },
    courier_help: {
      title: 'Курьер вернулся',
      text: 'Тот самый курьер привёз благодарность: у него на складе завалялась «ничейная» коробка, и он оставил её вам. Мелочь, а приятно.',
      apply: function () {
        PVZ.state.addMoney(180);
        PVZ.state.addRating(0.03);
        return { kind: 'good' };
      }
    },
    review_missed: {
      title: 'Отзыв без ответа',
      text: 'Покупатель, которому вы не ответили в «Отзывах», написал в поддержку маркетплейса. Разбор шёл неделю, пункту выписали штраф.',
      apply: function () {
        PVZ.state.addMoney(-250);
        PVZ.state.addRating(-0.05);
        return { kind: 'bad' };
      }
    }
  };

  sys.consequenceTitle = function (id) {
    var def = sys.CONSEQUENCES[id];
    return def ? def.title : 'Новость пункта';
  };

  /* Применяет последствие к состоянию и возвращает текст для игрока */
  sys.applyConsequence = function (id) {
    var def = sys.CONSEQUENCES[id];
    if (!def || !PVZ.state || !PVZ.state.data) return null;
    var res = def.apply(PVZ.state.data) || {};
    PVZ.state.save();
    return { title: def.title, text: def.text, kind: res.kind || 'info', id: id };
  };

  /* ---------------- отзывы покупателей ---------------- */
  sys.REVIEW_TEXT = {
    good: [
      'Быстро выдали заказ, сотрудник вежливый. Спасибо!',
      'Всё аккуратно, посылка целая. Приятно заходить.',
      'Очереди почти не было, оформили за минуту.',
      'Помогли разобраться с приложением, большое спасибо.',
      'Чисто, светло, есть где подождать. Рекомендую.',
      'Заказ нашли сразу, ещё и пакет предложили.',
      'Отличный пункт: вежливо, быстро, без нервов.',
      'Спасибо за терпение, у меня был сложный возврат.',
      'Сотрудник сказал «ты не пройдёшь» — и всё равно выдал заказ. Уважаю.',
      'В пункте пахло фейерверками. Не спрашивайте, я просто забрал посылку.'
    ],
    neutral: [
      'Заказ получил, но пришлось подождать.',
      'В целом нормально, хотя очередь двигалась медленно.',
      'Всё выдали, но сотрудник был занят и не сразу заметил.',
      'Нормальный пункт, но хотелось бы быстрее.',
      'Ждал в очереди рядом с человеком в шлеме. Очередь двигалась медленно.'
    ],
    bad: [
      'Ждал пятнадцать минут, никто не подошёл.',
      'Нахамили и отказались помочь с возвратом.',
      'Заказ искали очень долго, в итоге выдали не тот.',
      'Очередь, душно, сотрудник разговаривал по телефону.',
      'Пришёл повторно — заказ так и не нашли. Безобразие.',
      'Не приняли оплату картой, хотя терминал есть.'
    ],
    fake: [
      'УЖАС! Никогда не приходите сюда!!!',
      'Заказ не выдали, деньги не вернули, всё сломано!',
      'Худший пункт в городе. Ставлю одну звезду.',
      'Сотрудник грубит и кидается коробками!!!',
      'Здесь вообще ничего не работает, проверено.',
      'Не советую, обман и хамство!!!'
    ],
    fakeNames: ['Аноним', 'Покупатель123', 'user_1337', 'Отзыв-бот', 'Гость', 'xXx_клиент', 'А.А.', 'Наблюдатель']
  };

  sys.reviewAuthor = function (c) {
    if (!c) return 'Покупатель';
    var first = c.name || 'Покупатель';
    var last = (c.last || '').replace(/[^А-Яа-яA-Za-z]/g, '');
    return first + (last ? ' ' + last.charAt(0).toUpperCase() + '.' : '');
  };

  sys.addReview = function (c, score, opts) {
    opts = opts || {};
    if (!PVZ.state || !PVZ.state.data) return null;
    var d = PVZ.state.data;
    if (!Array.isArray(d.reviews)) d.reviews = [];
    var bucket = score >= 4 ? 'good' : score === 3 ? 'neutral' : 'bad';
    var text = opts.text || U.pick(sys.REVIEW_TEXT[bucket]);
    d.reviewSeq = (d.reviewSeq || 0) + 1;
    var review = {
      id: 'rv' + d.reviewSeq,
      author: opts.author || sys.reviewAuthor(c),
      score: U.clamp(score, 1, 5),
      text: text,
      day: d.day || 1,
      fake: !!opts.fake,
      replied: false,
      reply: null,
      replyResult: null
    };
    d.reviews.push(review);
    if (d.reviews.length > 60) d.reviews.splice(0, d.reviews.length - 60);
    PVZ.state.save();
    return review;
  };

  /* Накрутка: несколько фальшивых плохих отзывов за раз */
  sys.addFakeReviews = function (n) {
    var d = PVZ.state.data;
    if (!d) return 0;
    var count = Math.max(1, n || 2);
    for (var i = 0; i < count; i++) {
      sys.addReview(null, U.chance(0.7) ? 1 : 2, {
        author: U.pick(sys.REVIEW_TEXT.fakeNames),
        text: U.pick(sys.REVIEW_TEXT.fake),
        fake: true
      });
    }
    PVZ.state.addRating(-0.015 * count);
    return count;
  };

  sys.reviewStats = function () {
    var list = (PVZ.state.data && PVZ.state.data.reviews) || [];
    var sum = 0, counts = [0, 0, 0, 0, 0], fake = 0, fresh = 0;
    list.forEach(function (r) {
      sum += r.score;
      counts[5 - r.score] = (counts[5 - r.score] || 0) + 1;
      if (r.fake) fake++;
      if (!r.replied && (r.fake || r.score <= 2)) fresh++;
    });
    return {
      count: list.length,
      avg: list.length ? sum / list.length : 0,
      counts: counts,
      fake: fake,
      fresh: fresh
    };
  };


  /* ---------------- цели смены ---------------- */
  sys.morningObjectives = function (supplyCount) {
    var missing = (PVZ.apps && PVZ.apps.CORE || []).filter(function (id) { return !PVZ.state.hasApp(id); });
    return [
      { id: 'apps', text: 'Установить приложения', done: missing.length === 0, progress: ((PVZ.apps ? PVZ.apps.CORE.length : 3) - missing.length) + '/' + (PVZ.apps ? PVZ.apps.CORE.length : 3) },
      { id: 'light', text: 'Включить свет в зале', done: false },
      { id: 'terminal', text: 'Открыть смену в терминале', done: false },
      { id: 'receive', text: 'Принять поставку (' + supplyCount + ' шт.)', done: false, progress: '0/' + supplyCount },
      { id: 'door', text: 'Открыть входную дверь', done: false }
    ];
  };

  sys.eveningObjectives = function () {
    return [
      { id: 'closeDoor', text: 'Закрыть входную дверь', done: false },
      { id: 'clean', text: 'Убрать мусор в зале', done: false },
      { id: 'returns', text: 'Сдать зону возвратов', done: false },
      { id: 'cash', text: 'Сверить кассу за смену', done: false },
      { id: 'shift', text: 'Закрыть смену в терминале', done: false }
    ];
  };

  sys.comment = function (kind) {
    var list = {
      done: ['Готово.', 'Сделано.', 'Порядок.'],
      wrong: ['Хм, не то.', 'Не тот заказ.', 'Это не он.', 'Промах.'],
      money: ['Деньги в кассу.', 'Принято.', 'Отлично.']
    };
    return U.pick(list[kind] || list.done);
  };

  /* ---------------- пасхалки: редкие покупатели ---------------- */
  /* Раз в несколько смен в ПВЗ заходит кто-то «не из этого мира»: герой игры,
     сериала или фильма. У каждого свой заказ, свои реплики и своя награда.
     Найденные секреты собираются в приложении «Секреты» на ноутбуке. */
  sys.EGG_CHANCE = 0.12;      // шанс на «звёздного» гостя при появлении покупателя
  sys.EGGS = [
    {
      id: 'witcher', name: 'Геральт', last: 'из Ривии', from: 'Ведьмак', item: 'Серебряный меч',
      mood: 'grumpy', hint: 'Ищите того, кто пришёл за серебряным мечом и жалуется на ветер.',
      person: { shirt: '#3a3a42', coat: '#22222a', hair: '#c9c1b6', female: false, beard: true, glasses: false, hat: null, expr: 'neutral' },
      greet: 'Ветер… как же он воет. У вас тут теплее, чем в Вызиме.',
      ask: 'Заказ на серебряный меч. Надеюсь, он не погнулся в дороге. И да — у меня нет кода, у меня есть медальон.',
      choices: [
        { label: 'Выдать по медальону волка', hint: '+репутация · 2 мин', reply: 'Медальон дрогнул. Значит, не соврал. Спасибо.', fx: { time: 2, rating: 0.06 } },
        { label: 'Спросить, как убивать чудовищ', hint: '3 мин · чаевые', reply: 'Серебро для чудовищ, сталь для людей. Всё, иди работай.', fx: { time: 3, money: 250 } },
        { label: 'Попросить код из приложения', hint: '1 мин', reply: 'Приложение? У меня ведьмачий медальон, а не смартфон.', fx: { time: 1 } }
      ],
      reward: { money: 400, rating: 0.03 },
      findMsg: 'Пасхалка: в ПВЗ заходил Геральт из Ривии.'
    },
    {
      id: 'vader', name: 'Тёмный лорд', last: '', from: 'Звёздные войны', item: 'Шлем с системой дыхания',
      mood: 'grumpy', hint: 'Тяжёлое дыхание у стойки — это к нему.',
      person: { shirt: '#1c1c22', coat: '#0d0d12', hair: '#101014', female: false, beard: false, glasses: false, hat: null, expr: 'angry' },
      greet: 'Я нахожу вашу пункт выдачи… внушительным. Особенно стеллажи.',
      ask: 'Мне нужен шлем. Тот, что с системой жизнеобеспечения. И не советую задерживать доставку.',
      choices: [
        { label: 'Сказать: «Да пребудет с вами сила»', hint: '+репутация · 2 мин', reply: 'Сила с тобой, сотрудник. Не разочаруй меня.', fx: { time: 2, rating: 0.07 } },
        { label: 'Проверить шлем на прочность', hint: '3 мин · чаевые', reply: 'Он выдержал. Ты — тоже. Впечатляет.', fx: { time: 3, money: 300 } },
        { label: 'Просто выдать заказ по коду', hint: '1 мин', reply: 'Код. Конечно. Всегда эти формальности.', fx: { time: 1 } }
      ],
      reward: { money: 450, rating: 0.04 },
      findMsg: 'Пасхалка: в ПВЗ заходил Тёмный лорд.'
    },
    {
      id: 'sherlock', name: 'Шерлок', last: 'Холмс', from: 'Шерлок', item: 'Лупа (возврат)',
      mood: 'chatty', hint: 'Кто-то возвращает лупу и слишком внимательно смотрит на стеллажи.',
      person: { shirt: '#8a7a5a', coat: '#5a4a34', hair: '#2e2119', female: false, beard: false, glasses: false, hat: 'cap', expr: 'neutral' },
      greet: 'Добрый день. Вижу, у вас третья коробка на полке B стоит не по алфавиту.',
      ask: 'Это возврат лупы. Она мне больше не нужна: я и так вижу всё, что нужно.',
      choices: [
        { label: 'Попросить подсказать, где беспорядок', hint: '+репутация · 3 мин', reply: 'Уже подсказал. Ты не слушал. Элементарно.', fx: { time: 3, rating: 0.08 } },
        { label: 'Спросить, что он понял про вас', hint: '2 мин · чаевые', reply: 'Ты не выспался, пьёшь третий кофе и боишься вечернего визита. Держи за наблюдательность.', fx: { time: 2, money: 420 } },
        { label: 'Принять возврат по-быстрому', hint: '1 мин', reply: 'Быстро — не значит правильно. Но ладно.', fx: { time: 1 } }
      ],
      reward: { money: 300, rating: 0.05 },
      findMsg: 'Пасхалка: в ПВЗ заходил Шерлок Холмс.'
    },
    {
      id: 'house', name: 'Доктор', last: 'Хаус', from: 'Доктор Хаус', item: 'Трость с наконечником',
      mood: 'grumpy', hint: 'Хромает, но уверен, что прав.',
      person: { shirt: '#5a6a7a', coat: '#3a4a5a', hair: '#4a4a52', female: false, beard: true, glasses: false, hat: null, expr: 'neutral' },
      greet: 'Мне не нужен код. У меня есть боль и трость. Этого достаточно.',
      ask: 'Трость. И не говорите «все врут» — это моя фраза.',
      choices: [
        { label: 'Сказать: «Все врут»', hint: '+репутация · 2 мин', reply: 'Ха. Наконец-то кто-то читал Диагноз. Держи чаевые за диагностику.', fx: { time: 2, money: 200, rating: 0.05 } },
        { label: 'Уточнить код из приложения', hint: '2 мин', reply: 'Люди всегда врут про коды. Особенно про коды.', fx: { time: 2 } },
        { label: 'Предложить кофе из кофемашины', hint: '3 мин · чаевые', reply: 'Кофе — это не лекарство. Но пусть будет.', fx: { time: 3, money: 260 } }
      ],
      reward: { money: 300, rating: 0.04 },
      findMsg: 'Пасхалка: в ПВЗ заходил доктор Хаус.'
    },
    {
      id: 'heisenberg', name: 'Уолтер', last: 'Уайт', from: 'Во все тяжкие', item: 'Химическая посуда',
      mood: 'vip', hint: 'Заказ — колбы и реактивы. Не задавайте лишних вопросов.',
      person: { shirt: '#3f6a52', coat: '#2a4a3a', hair: '#4a4a42', female: false, beard: true, glasses: true, hat: 'cap', expr: 'neutral' },
      greet: 'Я не в опасности. Я и есть опасность. А теперь — где моя посылка?',
      ask: 'Колбы, реактивы, маска. Обычный заказ. Ничего интересного, ясно?',
      choices: [
        { label: 'Выдать без лишних вопросов', hint: '1 мин · чаевые', reply: 'Разумно. Держи. Скажем так — за молчание.', fx: { time: 1, money: 600 } },
        { label: 'Поинтересоваться, что внутри', hint: '3 мин · −терпение', reply: 'Ты уверен, что хочешь знать? Нет. Не уверен.', fx: { time: 3, patience: -0.05 } },
        { label: 'Предложить пакет за 30 ₽', hint: '+30 ₽', reply: 'Пакет? Я варю то, что не протекает.', fx: { time: 1, money: 30 } }
      ],
      reward: { money: 550, rating: 0.02 },
      findMsg: 'Пасхалка: в ПВЗ заходил Уолтер Уайт.'
    },
    {
      id: 'gandalf', name: 'Гэндальф', last: 'Серый', from: 'Властелин колец', item: 'Коробка фейерверков',
      mood: 'elder', hint: 'Длинная борода, посох и коробка, из которой пахнет порохом.',
      person: { shirt: '#7a7a7a', coat: '#5a5a5a', hair: '#d8d8d8', female: false, beard: true, glasses: false, hat: 'beanie', expr: 'neutral' },
      greet: 'Ты не пройдёшь… мимо моей посылки, я надеюсь.',
      ask: 'Фейерверки для хоббитов. Внутри — дракон. Не трясите.',
      choices: [
        { label: 'Провести гостя в зал и показать полку', hint: '+репутация · 3 мин', reply: 'Магия — это не заклинания. Это вежливость. Спасибо.', fx: { time: 3, rating: 0.09 } },
        { label: 'Пошутить про «ты не пройдёшь»', hint: '2 мин · чаевые', reply: 'Наслышан. Тебе бы в Средиземье — там ценят тех, кто держит оборону.', fx: { time: 2, money: 300 } },
        { label: 'Выдать по коду', hint: '1 мин', reply: 'Код? В моё время хватало слова. Но пусть будет.', fx: { time: 1 } }
      ],
      reward: { money: 350, rating: 0.06 },
      findMsg: 'Пасхалка: в ПВЗ заходил Гэндальф.'
    },
    {
      id: 'mario', name: 'Марио', last: '', from: 'Super Mario', item: 'Грибы в коробке',
      mood: 'hurry', hint: 'Красная кепка и коробка, из которой что-то растёт.',
      person: { shirt: '#e4572e', coat: '#c94a26', hair: '#2e2119', female: false, beard: false, glasses: false, hat: 'cap', expr: 'happy' },
      greet: 'Wahoo! Здравствуйте! У вас тут нет труб? Я хотел зайти через трубу.',
      ask: 'Грибы! Три штуки. Один маленький, один большой, один… светящийся.',
      choices: [
        { label: 'Спросить, не водопроводчик ли он', hint: '+репутация · 2 мин', reply: 'Ага! Но в ваш пункт я зашёл через дверь. Впервые за 40 лет.', fx: { time: 2, rating: 0.05 } },
        { label: 'Помочь донести коробку', hint: '3 мин · чаевые', reply: 'Вот спасибо! Держи монетки. У нас они вместо денег.', fx: { time: 3, money: 270 } },
        { label: 'Проверить грибы на прочность', hint: '1 мин', reply: 'Не прыгай на них! Хотя… ладно, прыгай.', fx: { time: 1 } }
      ],
      reward: { money: 320, rating: 0.03 },
      findMsg: 'Пасхалка: в ПВЗ заходил Марио.'
    },
    {
      id: 'sonic', name: 'Соник', last: '', from: 'Sonic the Hedgehog', item: 'Кроссовки',
      mood: 'hurry', hint: 'Синий ёж, которому вечно некогда.',
      person: { shirt: '#3f7fae', coat: '#2f6a94', hair: '#4a86b8', female: false, beard: false, glasses: false, hat: null, expr: 'happy' },
      greet: 'Привет! Где заказ? У меня минута, и та уже прошла!',
      ask: 'Кроссовки. Красные. Мне нужно быстрее, чем вы открываете ящик.',
      choices: [
        { label: 'Ускориться и выдать за минуту', hint: '+репутация · быстро', reply: 'Вот это скорость! Почти как моя, но не как моя.', fx: { time: 0.5, rating: 0.06 } },
        { label: 'Спросить, куда он так спешит', hint: '2 мин', reply: 'За кольцами! Или от доктора Роботника. Одно из двух.', fx: { time: 2, money: 150 } },
        { label: 'Сначала проверить документы', hint: '2 мин · −терпение', reply: 'Документы?! Я же синий ёж, меня все знают!', fx: { time: 2, patience: -0.05 } }
      ],
      reward: { money: 280, rating: 0.03 },
      findMsg: 'Пасхалка: в ПВЗ забегал Соник.'
    },
    {
      id: 'batman', name: 'Тёмный', last: 'рыцарь', from: 'DC', item: 'Плащ с креплением',
      mood: 'calm', hint: 'Ночной гость в плаще, который не любит свет.',
      person: { shirt: '#2a2a34', coat: '#14141a', hair: '#101014', female: false, beard: false, glasses: false, hat: null, expr: 'neutral' },
      greet: 'Я не за заказом. Я за справедливостью. Но заказ тоже отдайте.',
      ask: 'Плащ. И чтобы без камер — я тут не был.',
      choices: [
        { label: 'Обещать, что камеры ничего не увидят', hint: '+репутация · 2 мин', reply: 'Хорошо. Город запомнит это.', fx: { time: 2, rating: 0.06 } },
        { label: 'Сказать, что камеры всё видят', hint: '3 мин · чаевые', reply: 'Тогда я заберу и записи. Держи за молчание.', fx: { time: 3, money: 520 } },
        { label: 'Попросить код получения', hint: '1 мин', reply: 'Код. Разумеется. Никто не верит в ночное правосудие.', fx: { time: 1 } }
      ],
      reward: { money: 400, rating: 0.04 },
      findMsg: 'Пасхалка: в ПВЗ заходил Тёмный рыцарь.'
    },
    {
      id: 'sheldon', name: 'Шелдон', last: 'Купер', from: 'Теория Большого взрыва', item: 'Комикс в жёсткой упаковке',
      mood: 'grumpy', hint: 'Требует, чтобы его посылку положили на полку №1.',
      person: { shirt: '#c9a227', coat: '#a9861a', hair: '#4a3020', female: false, beard: false, glasses: false, hat: null, expr: 'neutral' },
      greet: 'Здравствуйте. Я заранее извиняюсь за то, что сейчас будет.',
      ask: 'В каком порядке вы храните посылки? По алфавиту? По дате? По очерёдности вселенной?',
      choices: [
        { label: 'Ответить: «По очерёдности вселенной»', hint: '+репутация · 3 мин', reply: 'Наконец-то компетентный сотрудник. Я запишу это в блокнот.', fx: { time: 3, rating: 0.09 } },
        { label: 'Сказать, что по дате поступления', hint: '2 мин', reply: 'Приемлемо. Не идеально. Но приемлемо.', fx: { time: 2, money: 120 } },
        { label: 'Спросить, это сарказм?', hint: '1 мин', reply: 'Сарказм — это мой второй язык. Первый — сарказм.', fx: { time: 1 } }
      ],
      reward: { money: 260, rating: 0.05 },
      findMsg: 'Пасхалка: в ПВЗ заходил Шелдон Купер.'
    },
    {
      id: 'bond', name: 'Бонд', last: 'Джеймс Бонд', from: '007', item: 'Часы с гаджетами',
      mood: 'vip', hint: 'Представится дважды. Заказ — часы.',
      person: { shirt: '#1c1c22', coat: '#101014', hair: '#2e2119', female: false, beard: false, glasses: false, hat: null, expr: 'neutral' },
      greet: 'Бонд. Джеймс Бонд. У вас есть посылка на моё имя.',
      ask: 'Часы. Внутри — лазер и гарнитура. Внешне — просто часы.',
      choices: [
        { label: 'Спросить, настоящий ли он агент', hint: '2 мин · чаевые', reply: 'Если бы я сказал «да», мне пришлось бы вас… поблагодарить.', fx: { time: 2, money: 480 } },
        { label: 'Ответить «Бонд. ПВЗ. Выдача»', hint: '+репутация · 2 мин', reply: 'Впервые за 60 лет кто-то ответил достойно. Уважаю.', fx: { time: 2, rating: 0.07 } },
        { label: 'Попросить код из приложения', hint: '1 мин', reply: 'Код — это скучно. Но регламент есть регламент.', fx: { time: 1 } }
      ],
      reward: { money: 420, rating: 0.04 },
      findMsg: 'Пасхалка: в ПВЗ заходил Джеймс Бонд.'
    },
    {
      id: 'santa', name: 'Дед', last: 'Мороз', from: 'Новый год', item: 'Плед и три пары носков',
      mood: 'elder', hint: 'Шуба, мешок и подозрительно знакомый голос.',
      person: { shirt: '#c0392b', coat: '#a52a1e', hair: '#e8e8e8', female: false, beard: true, glasses: false, hat: 'beanie', expr: 'happy' },
      greet: 'Здравствуй, милок! Я ненадолго — у меня ещё 1,4 миллиарда адресов.',
      ask: 'Плед, носки и подарок для одного сотрудника пункта выдачи. Это ты.',
      choices: [
        { label: 'Спросить, есть ли подарок для мафии', hint: '+репутация · 2 мин', reply: 'Этим — уголь. Двадцать тонн. Сам принесёшь?', fx: { time: 2, rating: 0.06 } },
        { label: 'Принять подарок и пожелать хорошей смены', hint: '3 мин · чаевые', reply: 'Держи. И не работай в праздники. Хотя… кто тебя спрашивает.', fx: { time: 3, money: 700 } },
        { label: 'Проверить код получения', hint: '1 мин', reply: 'Код? Я же сам принёс! Ладно-ладно, вот, смотри.', fx: { time: 1 } }
      ],
      reward: { money: 500, rating: 0.05 },
      findMsg: 'Пасхалка: в ПВЗ заходил Дед Мороз.'
    },

    /* --- скрытые секреты интерьера: их не встретить «случайно», надо трогать предметы --- */
    {
      id: 'coffee', hidden: true, name: 'Кофейный ритуал', from: 'секрет интерьера', noReview: true,
      hint: 'На столе стоит кружка. Нажмите на неё несколько раз.',
      how: 'Нажать на кружку 7 раз',
      findMsg: 'Секрет: вы выпили семь кружек кофе. Пункт выдач никогда не спал.',
      reward: { money: 150, rating: 0.02 }
    },
    {
      id: 'figurine', hidden: true, name: 'Фигурка на удачу', from: 'секрет интерьера', noReview: true,
      hint: 'На стойке есть фигурки. Потрогайте их — вдруг повезёт.',
      how: 'Нажать на фигурки 7 раз',
      findMsg: 'Секрет: фигурка на удачу приносит +1 к репутации пункта.',
      reward: { money: 100, rating: 0.05 }
    },
    {
      id: 'catfriend', hidden: true, name: 'Кот-напарник', from: 'секрет интерьера', noReview: true,
      hint: 'Кот приходит не сразу. Если он уже живёт у вас — погладьте его 10 раз.',
      how: 'Погладить кота 10 раз',
      findMsg: 'Секрет: кот мурчит так, что покупатели становятся добрее.',
      reward: { money: 300, rating: 0.06 }
    },
    {
      id: 'konami', hidden: true, name: 'Код из детства', from: 'секрет игрока', noReview: true,
      hint: 'Каждый, кто держал геймпад, знает: ↑ ↑ ↓ ↓ ← → ← → B A.',
      how: 'Ввести Konami-код на клавиатуре',
      findMsg: 'Секрет: Konami-код работает даже в ПВЗ. +300 ₽ на удачу.',
      reward: { money: 300, rating: 0.03 }
    }
  ];

  sys.eggById = function (id) {
    for (var i = 0; i < sys.EGGS.length; i++) if (sys.EGGS[i].id === id) return sys.EGGS[i];
    return null;
  };

  /* Случайный ещё не найденный гость. null — если всех уже встретили. */
  sys.pickEgg = function () {
    var pool = sys.EGGS.filter(function (e) { return !e.hidden && !PVZ.state.hasEgg(e.id); });
    if (!pool.length) return null;
    return U.pick(pool);
  };

  sys.sizeRu = function (s) {
    return { S: 'малый', M: 'средний', L: 'крупный' }[s] || 'средний';
  };
})();
