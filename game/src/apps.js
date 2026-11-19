/* ПВЗ: Смена — App Market: каталог приложений для ноутбука, установка и экраны */
(function () {
  'use strict';
  var PVZ = window.PVZ;
  var U = PVZ.util, art = PVZ.art, sys = PVZ.sys;
  var apps = (PVZ.apps = {});

  /* Категории витрины */
  apps.CATEGORIES = [
    { id: 'work', label: 'Работа' },
    { id: 'games', label: 'Игры' },
    { id: 'utils', label: 'Утилиты' },
    { id: 'fun', label: 'Развлечения' }
  ];

  /* Приложения, без которых смену не открыть */
  apps.CORE = ['terminal', 'market', 'reviews'];

  /* ---------------- каталог ---------------- */
  /* price: 0 — бесплатно. core — обязательное. builtin — уже стоит в системе. */
  apps.CATALOG = [
    {
      id: 'appstore', name: 'App Market', short: 'App Market', glyph: '▦', color: '#2fb894',
      cat: 'utils', price: 0, size: '18 МБ', rating: 4.9, builtin: true,
      desc: 'Магазин приложений: игры и программы для ноутбука.',
      info: ['Магазин приложений для ноутбука ПВЗ.', 'Здесь можно установить всё: от рабочих программ до игр на перемене.', 'Установка бесплатная или за деньги пункта.']
    },
    {
      id: 'phone', name: 'Телефон', short: 'Телефон', glyph: '☎', color: '#7a64b0',
      cat: 'utils', price: 0, size: 'система', rating: 4.7, builtin: true,
      desc: 'Звонки в полицию, скорую и пожарным.',
      info: ['Служебный телефон ноутбука.', '101 — пожарные, 102 — полиция, 103 — скорая.', 'Открывается и из ноутбука, и по событиям в зале.']
    },
    {
      id: 'premium', name: 'Premium store', short: 'Premium', glyph: '✦', color: '#c9a227',
      cat: 'utils', price: 0, size: 'система', rating: 4.9, builtin: true, hidden: true,
      desc: 'Официальный магазин: реклама, монеты, скины и паки.',
      info: [
        'Магазин премиальных покупок.',
        'Монеты зарабатываются за просмотр рекламы, а вещи можно купить за монеты или настоящие деньги.',
        'Здесь же отключается реклама и открывается DEV-доступ.'
      ]
    },
    {
      id: 'terminal', name: 'Терминал ПВЗ', short: 'Терминал', glyph: '>_', color: '#4a86b8',
      cat: 'work', price: 0, size: '24 МБ', rating: 4.6, core: true,
      desc: 'Открытие смены, поиск заказа по коду, касса.',
      info: ['Рабочее приложение пункта.', 'Открывает и закрывает смену, ищет заказы по коду получения.', 'Без него смену начать нельзя.']
    },
    {
      id: 'market', name: 'Маркет ПВЗ', short: 'Маркет', glyph: '₽', color: '#f2994a',
      cat: 'work', price: 0, size: '31 МБ', rating: 4.5, core: true,
      desc: 'Улучшения и декор для пункта выдачи.',
      info: ['Каталог улучшений и декора.', 'Покупки действуют сразу: техника, форма, уют в зале.', 'Без него смену не открыть — нужен для работы пункта.']
    },
    {
      id: 'reviews', name: 'Отзывы', short: 'Отзывы', glyph: '★', color: '#d0577f',
      cat: 'work', price: 0, size: '19 МБ', rating: 4.4, core: true,
      desc: 'Отзывы покупателей и ответы на них.',
      info: ['Отзывы покупателей после смены.', 'Можно ответить на отзыв и поднять рейтинг.', 'Без него смену начать нельзя.']
    },
    {
      id: 'game', name: 'Посылки', short: 'Посылки', glyph: '▣', color: '#5aa877',
      cat: 'games', price: 0, size: '46 МБ', rating: 4.2,
      desc: 'Мини-игра «Поймай посылки» — доход в свободную минуту.',
      info: ['Аркада на 20 секунд: ловите коробки, получайте премию.', 'Необязательное приложение — можно не устанавливать.']
    },
    {
      id: 'snake', name: 'Змейка', short: 'Змейка', glyph: '⌁', color: '#6fbf73',
      cat: 'games', price: 150, size: '12 МБ', rating: 4.0,
      desc: 'Классика на стрелках и свайпах. Собирайте посылки.',
      info: ['Классическая змейка.', 'Управление: стрелки или свайпы. Ешьте коробки, не врезайтесь.']
    },
    {
      id: 'memory', name: 'Найди пару', short: 'Пары', glyph: '◫', color: '#d08b57',
      cat: 'games', price: 120, size: '9 МБ', rating: 4.1,
      desc: 'Карточки на память: откройте две одинаковые.',
      info: ['Игра на память 4×4.', 'Открывайте по две карточки и ищите пары.']
    },
    {
      id: 'calc', name: 'Калькулятор', short: 'Калькулятор', glyph: '=', color: '#8e9aa6',
      cat: 'utils', price: 0, size: '4 МБ', rating: 4.3,
      desc: 'Считает сдачу, скидки и долг мафии.',
      info: ['Обычный калькулятор.', 'Пригодится, если сомневаетесь в кассе.']
    },
    {
      id: 'notes', name: 'Заметки смены', short: 'Заметки', glyph: '✎', color: '#c9a227',
      cat: 'utils', price: 0, size: '6 МБ', rating: 4.2,
      desc: 'Список задач и подсказки на день.',
      info: ['Показывает текущие задачи смены.', 'Если что-то забыли — загляните сюда.']
    },
    {
      id: 'weather', name: 'Погода', short: 'Погода', glyph: '☁', color: '#4a90b8',
      cat: 'utils', price: 0, size: '8 МБ', rating: 4.4,
      desc: 'Прогноз на смену: дождь или солнце.',
      info: ['Погода за окном на текущий день.']
    },
    {
      id: 'schedule', name: 'График смен', short: 'График', glyph: '▤', color: '#7c8fa3',
      cat: 'work', price: 200, size: '5 МБ', rating: 4.1,
      desc: 'Сколько смен позади и сколько осталось.',
      info: ['Календарь забега: продержитесь ' + PVZ.balance.WIN_DAY + ' смен.']
    },
    {
      id: 'bank', name: 'Банк ПВЗ', short: 'Банк', glyph: '₽', color: '#3f9c6a',
      cat: 'work', price: 350, size: '22 МБ', rating: 4.5,
      desc: 'Долг мафии, выплаты и остаток по сменам.',
      info: ['Личный кабинет пункта: долг, выплаты, история визитов.']
    },
    {
      id: 'debt', name: 'Долги', short: 'Долги', glyph: '♠', color: '#8a3b3b',
      cat: 'work', price: 0, size: '4 МБ', rating: 2.1, hidden: true,
      desc: 'Сколько вы должны и что уже натворили.',
      info: ['Учёт долга перед Боссом.', 'Доверие, грязь и улики для полиции.', 'Появляется после знакомства с куратором.']
    },
    {
      id: 'crm', name: 'CRM «Клиент»', short: 'CRM', glyph: '◎', color: '#4aa0a8',
      cat: 'work', price: 900, size: '38 МБ', rating: 4.6,
      desc: 'Помнит покупателей: чаевые +3%.',
      info: ['Карточки покупателей и история выдач.', 'Чаевые довольных клиентов растут на 3%.']
    },
    {
      id: 'cctv', name: 'Камеры ПВЗ', short: 'Камеры', glyph: '◉', color: '#6a7a8a',
      cat: 'utils', price: 700, size: '27 МБ', rating: 4.3,
      desc: 'Показывает обстановку в зале и складе.',
      info: ['Видеонаблюдение в зале и на складе.', 'Показывает очередь, примерочную и остаток посылок.']
    },
    {
      id: 'map', name: 'Карта города', short: 'Карта', glyph: '⌖', color: '#5a8f5f',
      cat: 'utils', price: 250, size: '15 МБ', rating: 4.0,
      desc: 'Где ваш ПВЗ и где офис мафии.',
      info: ['Небольшая карта города: пункт выдачи и нехороший район.']
    },
    {
      id: 'chat', name: 'Мессенджер', short: 'Чат', glyph: '✉', color: '#5b7fd0',
      cat: 'fun', price: 0, size: '11 МБ', rating: 4.2,
      desc: 'Переписка с Артёмом из соседнего пункта.',
      info: ['Чат с Артёмом.']
    },
    {
      id: 'radio', name: 'Радио ПВЗ', short: 'Радио', glyph: '♪', color: '#b05a8a',
      cat: 'fun', price: 300, size: '7 МБ', rating: 4.4,
      desc: 'Фоновая музыка в пункте: выбирайте громкость эфира.',
      info: ['Плеер фоновой музыки.', 'Нажмите на станцию, чтобы сменить эфир.']
    },
    {
      id: 'catcam', name: 'Котокамера', short: 'Кот', glyph: '🐈', color: '#b98a4a',
      cat: 'fun', price: 0, size: '3 МБ', rating: 4.8,
      desc: 'Наблюдение за котом, если он живёт в ПВЗ.',
      info: ['Камера на лежанку кота.']
    },
    {
      id: 'antivirus', name: 'Антивирус «Щит»', short: 'Антивирус', glyph: '✚', color: '#3f7fae',
      cat: 'utils', price: 450, size: '41 МБ', rating: 3.9,
      desc: 'Проверяет ноутбук и ругается на торренты.',
      info: ['Проверка ноутбука на вирусы.', 'Нажмите «Проверить», чтобы запустить сканирование.']
    },
    {
      id: 'taxi', name: 'Такси домой', short: 'Такси', glyph: '◈', color: '#c49b2a',
      cat: 'fun', price: 150, size: '13 МБ', rating: 4.1,
      desc: 'Машина до дома после смены. Просто для настроения.',
      info: ['Заказ машины после смены.', 'Кнопка «Вызвать» показывает время ожидания.']
    },
    {
      id: 'banana', name: 'Banana store', short: 'Banana', glyph: '🍌', color: '#c9a227',
      cat: 'utils', price: 0, size: '13 МБ', rating: 1.8, hidden: true,
      desc: 'Чёрный рынок: оружие, яды и скупка краденого.',
      info: [
        'Магазин без правил и без чеков.',
        'Здесь покупают то, чего не бывает в обычных магазинах: травмат, яды, липовые документы.',
        'И сюда же можно сбыть залежавшийся товар со склада — пока полиция не заинтересовалась.'
      ]
    },
    {
      id: 'secrets', name: 'Секреты', short: 'Секреты', glyph: '★', color: '#b05a8a',
      cat: 'fun', price: 0, size: '1 МБ', rating: 5.0, builtin: true, hidden: true,
      desc: 'Коллекция пасхалок: кого вы уже встретили и кого ещё можно встретить.',
      info: ['Здесь собираются все найденные пасхалки.', 'Подсказки подскажут, где искать остальные.']
    }
  ];

  apps.byId = function (id) {
    for (var i = 0; i < apps.CATALOG.length; i++) if (apps.CATALOG[i].id === id) return apps.CATALOG[i];
    return null;
  };

  apps.storeApps = function () {
    return apps.CATALOG.filter(function (a) { return !a.builtin; });
  };

  apps.byCat = function (cat) {
    return apps.CATALOG.filter(function (a) {
      if (a.builtin || a.hidden) return false;
      return cat === 'all' || a.cat === cat;
    });
  };

  /* Пропущенные обязательные приложения */
  apps.missingCore = function () {
    return apps.CORE.filter(function (id) { return !PVZ.state.hasApp(id); });
  };

  apps.coreReady = function () {
    return apps.missingCore().length === 0;
  };

  apps.coreNames = function () {
    return apps.CORE.map(function (id) {
      var a = apps.byId(id);
      return a ? a.short : id;
    });
  };

  /* Установленные ярлыки для рабочего стола (в порядке каталога) */
  apps.desktopApps = function () {
    if (!PVZ.state.data) return [];
    var order = [];
    apps.CATALOG.forEach(function (a) { order.push(a.id); });
    var installed = (PVZ.state.data.apps || []).slice();
    installed.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    return installed.map(apps.byId).filter(Boolean);
  };

  /* ---------------- мелкие помощники для экранов ---------------- */
  function weekWeather(day) {
    var seed = U.hash((day || 1) * 7.31 + 3.7);
    var list = [
      { icon: '☀', name: 'ясно', temp: '+21°', note: 'Люди гуляют — поток ровный.' },
      { icon: '☁', name: 'облачно', temp: '+17°', note: 'Обычный день, обычная очередь.' },
      { icon: '☂', name: 'дождь', temp: '+12°', note: 'Мокрые покупатели — терпение ниже.' },
      { icon: '❄', name: 'снег', temp: '−4°', note: 'Холодно. Люди спешат домой.' },
      { icon: '⚡', name: 'гроза', temp: '+19°', note: 'Гроза. Возможны перебои со светом.' }
    ];
    return list[Math.floor(seed * list.length) % list.length];
  }
  apps.weatherFor = weekWeather;

  /* ---------------- калькулятор ---------------- */
  function Calculator() {
    this.display = '0';
    this.acc = null;
    this.op = null;
    this.fresh = true;
  }
  Calculator.prototype.press = function (label) {
    if (label === 'C') { this.display = '0'; this.acc = null; this.op = null; this.fresh = true; return; }
    if (label === '⌫') { this.display = this.display.length > 1 ? this.display.slice(0, -1) : '0'; return; }
    if (label === '=') { this.compute(); return; }
    if (label === '+' || label === '−' || label === '×' || label === '÷') {
      this.acc = this.display === '0' && !this.fresh ? 0 : parseFloat(this.display);
      this.op = label;
      this.fresh = true;
      return;
    }
    if (label === '.') {
      if (this.display.indexOf('.') >= 0) return;
      this.display += '.';
      this.fresh = false;
      return;
    }
    if (this.fresh) { this.display = label; this.fresh = false; }
    else this.display = this.display === '0' ? label : (this.display.replace('-', '').length < 12 ? this.display + label : this.display);
    PVZ.audio.key();
  };
  Calculator.prototype.compute = function () {
    if (this.acc == null || !this.op) return;
    var b = parseFloat(this.display);
    var r = this.acc;
    if (this.op === '+') r += b;
    else if (this.op === '−') r -= b;
    else if (this.op === '×') r *= b;
    else if (this.op === '÷') r = b === 0 ? NaN : r / b;
    this.display = isFinite(r) ? String(Math.round(r * 1000) / 1000) : 'Ошибка';
    this.acc = null;
    this.op = null;
    this.fresh = true;
    PVZ.audio.ok();
  };
  Calculator.prototype.keyRects = function (win) {
    var labels = ['7', '8', '9', 'C', '4', '5', '6', '÷', '1', '2', '3', '×', '0', '.', '=', '+', '⌫', '−'];
    var out = [];
    var gw = Math.min(300, (win.w - 120) / 4 - 10);
    var gh = 48;
    var gx = win.x + win.w / 2 - (gw * 4 + 10 * 3) / 2;
    var gy = win.y + win.h - 58 - gh * 5 - 10 * 4;
    labels.forEach(function (l, i) {
      out.push({ label: l, rect: { x: gx + (i % 4) * (gw + 10), y: gy + Math.floor(i / 4) * (gh + 10), w: gw, h: gh } });
    });
    return out;
  };
  Calculator.prototype.tap = function (win, x, y) {
    var keys = this.keyRects(win);
    for (var i = 0; i < keys.length; i++) {
      if (U.hit(keys[i].rect, x, y)) { this.press(keys[i].label); return true; }
    }
    return false;
  };
  Calculator.prototype.draw = function (ctx, win) {
    art.txt(ctx, 'КАЛЬКУЛЯТОР', win.x + 26, win.y + 40, 18, '#dbe9f4', 800);
    art.fillRR(ctx, win.x + 26, win.y + 58, win.w - 52, 78, 12, 'rgba(10,20,28,0.9)');
    art.txt(ctx, this.display, win.x + win.w - 40, win.y + 118, 42, '#eafff8', 700, 'right');
    var self = this;
    this.keyRects(win).forEach(function (k) {
      var hot = U.hit(k.rect, PVZ.input.x, PVZ.input.y);
      var accent = k.label === '=' || k.label === 'C';
      art.fillRR(ctx, k.rect.x, k.rect.y, k.rect.w, k.rect.h, 12,
        accent ? (hot ? '#ffd479' : 'rgba(242,153,74,0.85)') : hot ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, k.label, k.rect.x + k.rect.w / 2, k.rect.y + k.rect.h / 2 + 9, 22,
        accent ? '#2a1a10' : '#eafff8', 700, 'center');
    });
  };
  apps.Calculator = Calculator;

  /* ---------------- змейка ---------------- */
  function Snake() {
    this.cell = 22;
    this.cols = 18;
    this.rows = 13;
    this.reset();
  }
  Snake.prototype.reset = function () {
    this.snake = [{ x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }];
    this.dir = { x: 1, y: 0 };
    this.next = { x: 1, y: 0 };
    this.food = { x: 12, y: 6 };
    this.score = 0;
    this.over = false;
    this.acc = 0;
    this.stepTime = 0.14;
    this.placeFood();
  };
  Snake.prototype.placeFood = function () {
    for (var i = 0; i < 200; i++) {
      var p = { x: U.ri(0, this.cols - 1), y: U.ri(0, this.rows - 1) };
      var busy = this.snake.some(function (s) { return s.x === p.x && s.y === p.y; });
      if (!busy) { this.food = p; return; }
    }
  };
  Snake.prototype.turn = function (dx, dy) {
    if (this.over) return;
    if (dx === -this.dir.x && dy === -this.dir.y) return;
    this.next = { x: dx, y: dy };
  };
  Snake.prototype.update = function (dt) {
    if (this.over) return;
    this.acc += dt;
    if (this.acc < this.stepTime) return;
    this.acc = 0;
    this.dir = this.next;
    var head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (head.x < 0) head.x = this.cols - 1;
    if (head.y < 0) head.y = this.rows - 1;
    if (head.x >= this.cols) head.x = 0;
    if (head.y >= this.rows) head.y = 0;
    for (var i = 0; i < this.snake.length; i++) {
      if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
        this.over = true;
        PVZ.audio.bad();
        return;
      }
    }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      PVZ.audio.coin();
      this.stepTime = Math.max(0.07, 0.14 - this.score * 0.004);
      this.placeFood();
    } else {
      this.snake.pop();
    }
  };
  Snake.prototype.key = function (k) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'ф') this.turn(-1, 0);
    else if (k === 'ArrowRight' || k === 'd' || k === 'в') this.turn(1, 0);
    else if (k === 'ArrowUp' || k === 'w' || k === 'ц') this.turn(0, -1);
    else if (k === 'ArrowDown' || k === 's' || k === 'ы') this.turn(0, 1);
    else if (k === ' ' && this.over) this.reset();
  };
  Snake.prototype.area = function (win) {
    var size = Math.min((win.w - 80) / this.cols, (win.h - 190) / this.rows);
    return {
      x: win.x + (win.w - this.cols * size) / 2,
      y: win.y + 86,
      size: size
    };
  };
  Snake.prototype.tap = function (win, x, y) {
    var a = this.area(win);
    if (!U.hit({ x: a.x, y: a.y, w: this.cols * a.size, h: this.rows * a.size }, x, y)) return false;
    if (this.over) { this.reset(); return true; }
    var cx = x - (a.x + this.snake[0].x * a.size) - a.size / 2;
    var cy = y - (a.y + this.snake[0].y * a.size) - a.size / 2;
    if (Math.abs(cx) > Math.abs(cy)) this.turn(cx > 0 ? 1 : -1, 0);
    else this.turn(0, cy > 0 ? 1 : -1);
    return true;
  };
  Snake.prototype.draw = function (ctx, win) {
    var a = this.area(win);
    art.txt(ctx, 'ЗМЕЙКА', win.x + 26, win.y + 40, 18, '#bff0c8', 800);
    art.txt(ctx, 'Очки: ' + this.score, win.x + win.w - 26, win.y + 40, 14, '#ffd479', 800, 'right');
    art.fillRR(ctx, a.x - 6, a.y - 6, this.cols * a.size + 12, this.rows * a.size + 12, 10, 'rgba(10,26,18,0.92)');
    ctx.save();
    ctx.strokeStyle = 'rgba(120,220,150,0.2)';
    ctx.lineWidth = 2;
    for (var i = 0; i <= this.cols; i++) {
      ctx.beginPath(); ctx.moveTo(a.x + i * a.size, a.y); ctx.lineTo(a.x + i * a.size, a.y + this.rows * a.size); ctx.stroke();
    }
    for (var j = 0; j <= this.rows; j++) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y + j * a.size); ctx.lineTo(a.x + this.cols * a.size, a.y + j * a.size); ctx.stroke();
    }
    ctx.restore();
    art.fillRR(ctx, a.x + this.food.x * a.size + 3, a.y + this.food.y * a.size + 3, a.size - 6, a.size - 6, 4, '#ffd479');
    this.snake.forEach(function (s, idx) {
      art.fillRR(ctx, a.x + s.x * a.size + 2, a.y + s.y * a.size + 2, a.size - 4, a.size - 4, 5,
        idx === 0 ? '#9fe0a8' : 'rgba(120,190,140,' + Math.max(0.35, 1 - idx * 0.06) + ')');
    });
    if (this.over) {
      art.fillRR(ctx, win.x + win.w / 2 - 170, win.y + win.h / 2 - 46, 340, 96, 14, 'rgba(14,24,18,0.94)');
      art.txt(ctx, 'ИГРА ОКОНЧЕНА', win.x + win.w / 2, win.y + win.h / 2 - 8, 20, '#ffd8a8', 800, 'center');
      art.txt(ctx, 'Тап — заново · очки: ' + this.score, win.x + win.w / 2, win.y + win.h / 2 + 24, 13, 'rgba(230,255,235,0.65)', 600, 'center');
    }
    art.txt(ctx, 'Стрелки / свайпы/ тапы — поворот', win.x + win.w / 2, win.y + win.h - 16, 11, 'rgba(200,235,215,0.4)', 600, 'center');
  };
  apps.Snake = Snake;

  /* ---------------- найди пару ---------------- */
  function Memory() {
    this.size = 4;
    this.reset();
  }
  Memory.prototype.reset = function () {
    var icons = ['📦', '✂', '☕', '★', '☎', '♪', '🐈', '₽'];
    var deck = [];
    icons.forEach(function (ic, i) { deck.push({ id: i, icon: ic, open: false, done: false }); deck.push({ id: i, icon: ic, open: false, done: false }); });
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    this.deck = deck;
    this.open = [];
    this.lock = 0;
    this.moves = 0;
    this.win = false;
  };
  Memory.prototype.area = function (win) {
    var size = 78, gap = 10;
    var total = this.size * size + (this.size - 1) * gap;
    return { x: win.x + (win.w - total) / 2, y: win.y + 92, size: size, gap: gap };
  };
  Memory.prototype.cardRect = function (win, i) {
    var a = this.area(win);
    return { x: a.x + (i % this.size) * (a.size + a.gap), y: a.y + Math.floor(i / this.size) * (a.size + a.gap), w: a.size, h: a.size };
  };
  Memory.prototype.update = function (dt) {
    if (this.lock > 0) {
      this.lock -= dt;
      if (this.lock <= 0) {
        this.open.forEach(function (i) { if (!this.deck[i].done) this.deck[i].open = false; }, this);
        this.open = [];
      }
    }
  };
  Memory.prototype.tap = function (win, x, y) {
    if (this.win) { this.reset(); return true; }
    if (this.lock > 0) return false;
    for (var i = 0; i < this.deck.length; i++) {
      var c = this.deck[i];
      if (c.done || c.open) continue;
      if (U.hit(this.cardRect(win, i), x, y)) {
        c.open = true;
        this.open.push(i);
        PVZ.audio.tap();
        if (this.open.length === 2) {
          this.moves++;
          var a = this.deck[this.open[0]], b = this.deck[this.open[1]];
          if (a.id === b.id) {
            a.done = b.done = true;
            this.open = [];
            PVZ.audio.ok();
            if (this.deck.every(function (d) { return d.done; })) { this.win = true; PVZ.audio.level(); }
          } else {
            this.lock = 0.7;
            PVZ.audio.bad();
          }
        }
        return true;
      }
    }
    return false;
  };
  Memory.prototype.draw = function (ctx, win) {
    art.txt(ctx, 'НАЙДИ ПАРУ', win.x + 26, win.y + 40, 18, '#ffd8b0', 800);
    art.txt(ctx, 'Ходы: ' + this.moves, win.x + win.w - 26, win.y + 40, 14, '#ffd479', 800, 'right');
    for (var i = 0; i < this.deck.length; i++) {
      var c = this.deck[i], r = this.cardRect(win, i);
      var shown = c.open || c.done;
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 10,
        shown ? (c.done ? 'rgba(120,190,140,0.24)' : 'rgba(255,255,255,0.16)') : 'rgba(90,120,150,0.35)');
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 10, shown ? 'rgba(180,230,200,0.5)' : 'rgba(180,210,235,0.18)', 1.5);
      if (shown) art.txt(ctx, c.icon, r.x + r.w / 2, r.y + r.h / 2 + 16, 34, '#fff', 700, 'center');
      else art.txt(ctx, '?', r.x + r.w / 2, r.y + r.h / 2 + 14, 26, 'rgba(220,240,255,0.4)', 800, 'center');
    }
    if (this.win) {
      art.fillRR(ctx, win.x + win.w / 2 - 170, win.y + win.h / 2 - 50, 340, 100, 14, 'rgba(20,18,14,0.94)');
      art.txt(ctx, 'ВСЕ ПАРЫ НАЙДЕНЫ!', win.x + win.w / 2, win.y + win.h / 2 - 10, 19, '#ffd8a8', 800, 'center');
      art.txt(ctx, 'Ходов: ' + this.moves + ' · тап — ещё раз', win.x + win.w / 2, win.y + win.h / 2 + 22, 12, 'rgba(255,240,220,0.7)', 600, 'center');
    }
  };
  apps.Memory = Memory;

  /* ---------------- App Market: витрина ---------------- */
  var STORE = { x: 180, y: 96, w: 920, h: 540 };
  var STORE_CLOSE = { x: 180 + 920 - 46, y: 96 + 12, w: 34, h: 34 };

  function AppStore() {
    this.tab = 'all';
    this.page = 0;
    this.downloads = {};
    this.msg = '';
    this.msgT = 0;
    this.installedFlash = null;
    this.t = 0;
  }
  AppStore.STORE = STORE;
  AppStore.CLOSE = STORE_CLOSE;

  AppStore.prototype.items = function () {
    return apps.byCat(this.tab);
  };
  AppStore.prototype.perPage = function () { return 6; };
  AppStore.prototype.pages = function () { return Math.max(1, Math.ceil(this.items().length / this.perPage())); };
  AppStore.prototype.pageItems = function () {
    var p = this.perPage();
    return this.items().slice(this.page * p, this.page * p + p);
  };
  AppStore.prototype.tabRects = function () {
    var p = STORE;
    var tabs = [{ id: 'all', label: 'Все' }].concat(apps.CATEGORIES);
    return tabs.map(function (tb, i) {
      return { id: tb.id, label: tb.label, rect: { x: p.x + 26 + i * 132, y: p.y + 68, w: 124, h: 34 } };
    });
  };
  AppStore.prototype.cardRects = function () {
    var p = STORE;
    var gap = 12;
    var cw = (p.w - 52 - gap) / 2;
    var ch = 96;
    return this.pageItems().map(function (a, i) {
      return {
        app: a,
        rect: {
          x: p.x + 26 + (i % 2) * (cw + gap),
          y: p.y + 118 + Math.floor(i / 2) * (ch + 8),
          w: cw, h: ch
        }
      };
    });
  };
  AppStore.prototype.notify = function (text) { this.msg = text; this.msgT = 0; };
  AppStore.prototype.update = function (dt) {
    this.t += dt;
    if (this.msg) { this.msgT += dt; if (this.msgT > 4) { this.msg = ''; this.msgT = 0; } }
    var self = this;
    Object.keys(this.downloads).forEach(function (id) {
      self.downloads[id] += dt / 1.15;
      if (self.downloads[id] >= 1) {
        delete self.downloads[id];
        var res = PVZ.state.installApp(id);
        if (res.ok) {
          PVZ.audio.level();
          var a = apps.byId(id);
          self.notify('Установлено: ' + (a ? a.name : id));
          self.installedFlash = id;
          if (id === 'radio') apps.applyRadio(PVZ.state.data.radioStation || 0);
        } else {
          PVZ.audio.bad();
          self.notify(res.reason || 'Не удалось установить приложение.');
        }
      }
    });
  };
  AppStore.prototype.tap = function (x, y) {
    if (U.hit(STORE_CLOSE, x, y)) return { action: 'close' };
    var tabs = this.tabRects();
    for (var i = 0; i < tabs.length; i++) {
      if (U.hit(tabs[i].rect, x, y)) {
        if (this.tab !== tabs[i].id) { this.tab = tabs[i].id; this.page = 0; PVZ.audio.ui(); }
        return { action: 'tab' };
      }
    }
    var cards = this.cardRects();
    for (var c = 0; c < cards.length; c++) {
      if (U.hit(cards[c].rect, x, y)) return { action: 'install', id: cards[c].app.id };
    }
    if (this.pages() > 1) {
      var p = STORE;
      var py = p.y + p.h - 46;
      var prev = { x: p.x + p.w / 2 - 110, y: py, w: 90, h: 30 };
      var next = { x: p.x + p.w / 2 + 20, y: py, w: 90, h: 30 };
      if (U.hit(prev, x, y)) { this.page = (this.page + this.pages() - 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
      if (U.hit(next, x, y)) { this.page = (this.page + 1) % this.pages(); PVZ.audio.ui(); return { action: 'page' }; }
    }
    return null;
  };
  AppStore.prototype.install = function (id) {
    var a = apps.byId(id);
    if (!a) return;
    if (PVZ.state.hasApp(id)) { this.notify(a.name + ' уже установлено.'); return; }
    if (this.downloads[id] != null) return;
    if (PVZ.state.data.money < a.price) {
      PVZ.audio.bad();
      this.notify('Не хватает ' + U.fmtMoney(a.price - PVZ.state.data.money) + ' на ' + a.name + '.');
      return;
    }
    this.downloads[id] = 0;
    PVZ.audio.ui();
    this.notify('Загрузка: ' + a.name + '…');
  };
  AppStore.prototype.draw = function (ctx) {
    var p = STORE;
    var money = PVZ.state.data ? PVZ.state.data.money : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(8,5,4,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    art.panel(ctx, p.x, p.y, p.w, p.h, { bg: 'rgba(18,40,38,0.98)', r: 20, border: 'rgba(120,230,200,0.32)' });
    art.fillRR(ctx, p.x, p.y, p.w, 58, 20, 'rgba(24,76,66,0.95)');

    art.txt(ctx, 'APP MARKET', p.x + 26, p.y + 34, 22, '#9ff0d8', 800);
    art.txt(ctx, 'магазин приложений · ноутбук ПВЗ', p.x + 26 + art.txtW(ctx, 'APP MARKET', 22, 800) + 14, p.y + 35, 12, 'rgba(200,245,230,0.55)', 600);
    art.txt(ctx, 'Баланс', p.x + p.w - 74, p.y + 20, 10, 'rgba(210,245,235,0.5)', 800, 'right');
    art.txt(ctx, U.fmtMoney(money), p.x + p.w - 74, p.y + 42, 18, '#ffd479', 800, 'right');

    var hovX = U.hit(STORE_CLOSE, PVZ.input.x, PVZ.input.y);
    art.fillRR(ctx, STORE_CLOSE.x, STORE_CLOSE.y, STORE_CLOSE.w, STORE_CLOSE.h, 8, hovX ? '#e4572e' : 'rgba(255,255,255,0.1)');
    art.txt(ctx, '✕', STORE_CLOSE.x + 17, STORE_CLOSE.y + 23, 18, '#fff', 700, 'center');

    var self = this;
    this.tabRects().forEach(function (tb) {
      var active = tb.id === self.tab;
      var hov = U.hit(tb.rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, tb.rect.x, tb.rect.y, tb.rect.w, tb.rect.h, 9,
        active ? 'rgba(47,184,148,0.95)' : hov ? 'rgba(60,110,100,0.95)' : 'rgba(255,255,255,0.07)');
      art.txt(ctx, tb.label, tb.rect.x + tb.rect.w / 2, tb.rect.y + 23, 14,
        active ? '#08221c' : '#dff6ee', 700, 'center');
    });

    this.cardRects().forEach(function (c) {
      var a = c.app, r = c.rect;
      var installed = PVZ.state.hasApp(a.id);
      var dl = self.downloads[a.id];
      var core = !!a.core;
      var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 14, hov ? 'rgba(48,84,78,0.98)' : 'rgba(255,255,255,0.05)');
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 14,
        installed ? 'rgba(140,230,190,0.5)' : core ? 'rgba(255,200,120,0.55)' : hov ? 'rgba(150,240,215,0.4)' : 'rgba(255,255,255,0.1)', 1.5);
      // иконка приложения
      art.fillRR(ctx, r.x + 14, r.y + 14, 64, 64, 16, a.color);
      art.txt(ctx, a.glyph, r.x + 46, r.y + 58, 28, '#ffffff', 800, 'center');
      art.txt(ctx, a.name, r.x + 92, r.y + 28, 16, '#eafff8', 700);
      var desc = a.desc;
      var descW = r.w - 92 - 132;
      while (desc.length > 4 && art.txtW(ctx, desc, 10, 600) > descW) desc = desc.slice(0, -2);
      if (desc !== a.desc) desc = desc.slice(0, -1) + '…';
      art.txt(ctx, desc, r.x + 92, r.y + 48, 10, 'rgba(205,240,232,0.6)', 600);
      art.txt(ctx, a.size + ' · ★ ' + a.rating.toFixed(1) + (core ? ' · обязательно' : ''), r.x + 92, r.y + 72, 9.5,
        core ? 'rgba(255,210,150,0.8)' : 'rgba(190,235,225,0.42)', 700);
      // кнопка
      var bw = installed ? 118 : a.price > 0 ? 104 : 118;
      var btn = { x: r.x + r.w - bw - 14, y: r.y + 30, w: bw, h: 36 };
      if (installed) {
        art.fillRR(ctx, btn.x, btn.y, btn.w, btn.h, 9, 'rgba(120,220,180,0.16)');
        art.txt(ctx, 'Установлено', btn.x + btn.w / 2, btn.y + 24, 12, '#9ff0d0', 800, 'center');
      } else if (dl != null) {
        art.fillRR(ctx, btn.x, btn.y, btn.w, btn.h, 9, 'rgba(10,30,26,0.8)');
        art.bar(ctx, btn.x + 8, btn.y + 16, btn.w - 16, 7, U.clamp(dl, 0, 1), '#2fb894');
        art.txt(ctx, Math.round(U.clamp(dl, 0, 1) * 100) + '%', btn.x + btn.w / 2, btn.y + 11, 9, 'rgba(210,250,240,0.75)', 700, 'center');
      } else {
        var afford = money >= a.price;
        art.fillRR(ctx, btn.x, btn.y, btn.w, btn.h, 9,
          afford ? (hov ? '#7fe6c8' : 'rgba(47,184,148,0.92)') : 'rgba(255,255,255,0.08)');
        art.txt(ctx, a.price > 0 ? U.fmtMoney(a.price) : 'Установить', btn.x + btn.w / 2, btn.y + 24, 13,
          afford ? '#08221c' : 'rgba(255,170,150,0.8)', 800, 'center');
      }
    });

    if (this.pages() > 1) {
      var py = p.y + p.h - 46;
      var prev = { x: p.x + p.w / 2 - 110, y: py, w: 90, h: 30 };
      var next = { x: p.x + p.w / 2 + 20, y: py, w: 90, h: 30 };
      var ph = U.hit(prev, PVZ.input.x, PVZ.input.y), nh = U.hit(next, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, prev.x, prev.y, prev.w, prev.h, 8, ph ? '#2fb894' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '◀', prev.x + 45, prev.y + 21, 15, ph ? '#08221c' : '#dff6ee', 700, 'center');
      art.fillRR(ctx, next.x, next.y, next.w, next.h, 8, nh ? '#2fb894' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, '▶', next.x + 45, next.y + 21, 15, nh ? '#08221c' : '#dff6ee', 700, 'center');
      art.txt(ctx, (this.page + 1) + ' / ' + this.pages(), p.x + p.w / 2, py + 20, 12, 'rgba(210,245,235,0.6)', 700, 'center');
    }

    var miss = apps.missingCore().length;
    art.txt(ctx, miss
      ? 'Для открытия смены установите: ' + apps.missingCore().map(function (id) { var a = apps.byId(id); return a ? a.short : id; }).join(', ')
      : 'Все приложения для смены установлены. Смена откроется в терминале.',
      p.x + 26, p.y + p.h - 8, 11, miss ? 'rgba(255,205,150,0.8)' : 'rgba(160,240,210,0.7)', 700);

    if (this.msg) {
      ctx.save();
      ctx.globalAlpha = U.clamp(this.msgT, 0, 1);
      art.txt(ctx, this.msg, p.x + p.w - 26, p.y + p.h - 8, 12, '#ffd8a8', 700, 'right');
      ctx.restore();
    }
    ctx.restore();
  };
  apps.AppStore = AppStore;

  /* ---------------- общие экраны программ ---------------- */
  apps.infoPanelRect = function (win) {
    // ниже шапки ноутбука: раньше заголовок программы наезжал на «НОУТБУК СОТРУДНИКА»
    return { x: win.x + 26, y: win.y + 96, w: win.w - 52, h: win.h - 120 };
  };

  apps.liveLines = function (app, env) {
    var st = env && env.st;
    var d = PVZ.state.data || {};
    var out = [];
    if (app.id === 'notes') {
      var objs = (st && st.objectives) || [];
      out.push(objs.length ? 'Задачи текущей фазы:' : 'Активных задач нет.');
      objs.forEach(function (o) { out.push((o.done ? '✓ ' : '• ') + o.text + (o.progress ? '  (' + o.progress + ')' : '')); });
      out.push('');
      out.push('Ключи: T — терминал, L — ноутбук, Esc — пауза.');
    } else if (app.id === 'weather') {
      var w = apps.weatherFor(d.day || 1);
      out.push(w.icon + '  ' + w.name + ', ' + w.temp);
      out.push('День ' + (d.day || 1) + ' · ' + w.note);
      out.push('');
      out.push('Завтра: ' + apps.weatherFor((d.day || 1) + 1).icon + ' ' + apps.weatherFor((d.day || 1) + 1).name);
    } else if (app.id === 'schedule') {
      if (PVZ.state.endless && PVZ.state.endless()) {
        out.push('Бесконечный режим · смена ' + (d.day || 1));
        out.push('Отработано смен: ' + (d.totals ? d.totals.days : 0));
        out.push('Рекорд: ' + ((d.endlessBest && d.endlessBest.day) || d.day || 1) + ' смен');
        out.push('');
        out.push('Рейтинг: ' + (d.rating || 0).toFixed(2) + ' / 5,00');
        out.push('План на смену: ' + (st ? st.plan : 0) + ' выдач');
      } else {
        out.push('Забег: день ' + (d.day || 1) + ' из ' + PVZ.balance.WIN_DAY);
        out.push('Отработано смен: ' + (d.totals ? d.totals.days : 0));
        out.push('Осталось: ' + Math.max(0, PVZ.balance.WIN_DAY - (d.day || 1)) + ' смен');
        out.push('');
        out.push('Рейтинг: ' + (d.rating || 0).toFixed(2) + ' / 5,00');
        out.push('План на смену: ' + (st ? st.plan : 0) + ' выдач');
      }
    } else if (app.id === 'bank') {
      if (PVZ.state.endless && PVZ.state.endless()) {
        var rp = sys.rentParts(d.day || 1, st ? st.stats.revenue : 0);
        out.push('Аренда помещения: ' + U.fmtMoney(rp.fixed) + ' за смену');
        out.push('Доля выручки владельцу: ' + Math.round(rp.share * 100) + '%');
        out.push('Долг по аренде: ' + U.fmtMoney((d.rent && d.rent.unpaid) || 0));
        out.push('Всего заплачено: ' + U.fmtMoney((d.rent && d.rent.paidTotal) || 0));
        out.push('В кошельке: ' + U.fmtMoney(d.money || 0));
        out.push('');
        out.push('Не оплачено ' + PVZ.balance.rentUnpaidLimit + ' смен подряд — выселяют.');
      } else {
        out.push('Долг мафии: ' + U.fmtMoney(d.debt || 0));
        out.push('Всего отдано: ' + U.fmtMoney(d.mafiaPaid || 0));
        out.push('Визитов было: ' + (d.mafiaVisits || 0));
        out.push('В кошельке: ' + U.fmtMoney(d.money || 0));
        out.push('');
        out.push('Требование на следующий вечер: ' + U.fmtMoney(sys.mafiaDemand(d.day || 1)));
      }
    } else if (app.id === 'debt') {
      var mf = PVZ.state.mafiaState ? PVZ.state.mafiaState() : null;
      var debtNow = d.debt || 0;
      out.push('Долг мафии: ' + U.fmtMoney(debtNow));
      out.push('Всего отдано: ' + U.fmtMoney(d.mafiaPaid || 0) + ' · визитов: ' + (d.mafiaVisits || 0));
      if (debtNow > 0) out.push('Следующий вечер: ' + U.fmtMoney(sys.mafiaDemand(d.day || 1)));
      out.push('');
      var trust = mf ? mf.trust : 0;
      out.push('Доверие Босса: ' + (trust > 0 ? '+' : '') + trust + ' из 100' +
        (trust < -30 ? '  — вас не любят' : trust > 40 ? '  — вам верят' : ''));
      var dirt = mf ? mf.dirt : 0;
      out.push('Грязь: ' + dirt + '%' + (dirt > 70 ? '  — вы уже часть схемы' : dirt > 40 ? '  — уже есть что предъявить' : ''));
      out.push('Улики для полиции: ' + (mf ? mf.proof : 0) + ' / 3');
      if (mf && mf.task) {
        out.push('');
        out.push('Услуга: обслужено ' + (mf.task.need - mf.task.remaining) + ' из ' + mf.task.need);
        out.push('Спишут ' + U.fmtMoney(mf.task.reward) + ' долга');
      }
      if (mf && mf.path === 'family') {
        out.push('');
        out.push('Статус: свой человек в сети Босса.');
      }
      if (debtNow <= 0) {
        out.push('');
        out.push('Долг закрыт. По вечерам больше никто не приходит.');
      }
    } else if (app.id === 'cctv') {
      var line = st ? (st.queue.length + (st.customer ? 1 : 0)) : 0;
      out.push('Зал: ' + line + ' чел. в очереди' + (st && st.customer ? ' · покупатель у стойки' : ''));
      out.push('Свет: ' + (st && st.lightsOn ? 'включён' : 'выключен') + ' · Дверь: ' + (st && st.doorOpen ? 'открыта' : 'закрыта'));
      out.push('Примерочная: ' + (st && st.fitting.length ? 'занята' : 'свободна'));
      out.push('На складе: ' + (st ? st.orders.filter(function (o) { return o.state === 'stored'; }).length : 0) + ' посылок');
      out.push('Возвраты: ' + (st ? st.orders.filter(function (o) { return o.state === 'return'; }).length : 0));
    } else if (app.id === 'chat') {
      out.push('Артём, соседний ПВЗ:');
      out.push('«Слышал, у тебя опять гости вечером? Держись.»');
      out.push('«Совет: откладывай на оброк заранее, они не любят ждать.»');
      if ((d.debt || 0) > 0) out.push('«Долг у тебя ' + U.fmtMoney(d.debt) + '. Не тяни.»');
      out.push('');
      if (PVZ.state.eggCount && PVZ.state.eggCount() > 0) {
        out.push('«И это… у тебя вчера был клиент с мечом? Серьёзно?»');
        out.push('«Мне тоже заходил один в шлеме. Я думал, у меня температура.»');
      } else {
        out.push('«Говорят, к тебе иногда заходят очень странные люди. Присмотрись.»');
      }
      out.push('Вы: «Спасибо. Работаю.»');
    } else if (app.id === 'map') {
      out.push('Ваш ПВЗ: ' + PVZ.state.title() + ' · центр района');
      out.push('Склад поставщика: 3 км · курьер приезжает утром');
      out.push('Офис мафии: старый завод за рекой');
      out.push('');
      out.push('Дорога до дома — 25 минут пешком.');
    } else if (app.id === 'catcam') {
      if (d.cat) {
        out.push('В кадре: ' + d.cat.name + ' (' + (d.cat.kind || 'кот') + ')');
        out.push('Состояние: спит на лежанке. Охраняет ПВЗ.');
      } else {
        out.push('Камера направлена на пустую лежанку.');
        out.push('Кот ещё не живёт в пункте — история впереди.');
      }
    } else if (app.id === 'antivirus') {
      var hasBanana = PVZ.state.hasApp('banana');
      out.push('Антивирус «Щит» · базы от сегодня');
      out.push('Последняя проверка: ' + (d.antivirusAt ? 'день ' + d.antivirusAt : 'не проводилась'));
      if (d.banana && d.banana.removedDay) out.push('Banana store удалён с ноутбука (день ' + d.banana.removedDay + ').');
      if (hasBanana) {
        out.push('⚠ Угроза: PUA.Banana.Store — магазин запрещённых товаров.');
        out.push(d.banana && d.banana.avFound
          ? 'Статус: карантин. Приложение можно удалить кнопкой справа.'
          : 'Приложение прячется в автозапуске. Нажмите «Проверить ноутбук».');
      } else {
        out.push('Угроз не обнаружено. Ноутбук работает штатно.');
      }
      out.push('');
      out.push('Тап — проверить ноутбук.');
    } else if (app.id === 'taxi') {
      out.push('Такси «Городок» · машина у входа через 5 минут');
      out.push('Стоимость поездки: 240 ₽ (списывается не из кассы).');
      out.push('');
      out.push('Тап — вызвать машину.');
    } else if (app.id === 'radio') {
      var stations = apps.RADIO;
      var cur = (PVZ.state.data && PVZ.state.data.radioStation != null) ? PVZ.state.data.radioStation : 2;
      out.push('Эфир: ' + stations[cur % stations.length].name);
      out.push('Нажмите на станцию, чтобы сменить громкость фона.');
      out.push('');
      stations.forEach(function (s, i) { out.push((i === cur % stations.length ? '● ' : '○ ') + s.name + ' — ' + s.desc); });
    }
    if (!out.length) out = app.info.slice();
    return out;
  };

  /* ---------------- радио: меню эфиров ---------------- */
  /* Первая строка — тишина, дальше шесть живых музыкальных тем. */
  apps.RADIO = [
    { id: 'off', name: 'Тишина', desc: 'радио выключено', gain: 0.15, track: -1, color: '#7a7a7a' },
    { id: 'lofi', name: 'Lo-Fi', desc: 'тихий спокойный фон', gain: 0.7, track: 0, color: '#8fa2c9' },
    { id: 'pvz', name: 'Радио ПВЗ', desc: 'обычная громкость', gain: 1, track: 1, color: '#f2994a' },
    { id: 'night', name: 'Ночной эфир', desc: 'синтвейв и неон', gain: 1.15, track: 2, color: '#b05ad0' },
    { id: 'jazz', name: 'Джаз-кафе', desc: 'тёплый ламповый джаз', gain: 0.9, track: 3, color: '#c9a227' },
    { id: 'chip', name: '8-бит смена', desc: 'быстрый чиптюн', gain: 0.85, track: 4, color: '#6fbf73' },
    { id: 'classic', name: 'Классика', desc: 'мягкое фортепиано', gain: 0.8, track: 5, color: '#d6c7a8' }
  ];

  apps.radioInfo = function (i) {
    var list = apps.RADIO;
    return list[((i % list.length) + list.length) % list.length];
  };

  /* Включить эфир: тема, громкость и «тишина» — одним движением */
  apps.applyRadio = function (index) {
    var stn = apps.radioInfo(index == null ? 2 : index);
    if (PVZ.music) {
      if (PVZ.music.setTrack) PVZ.music.setTrack(stn.track < 0 ? 1 : stn.track);
      if (PVZ.music.setSilent) PVZ.music.setSilent(stn.track < 0);
      if (PVZ.music.setGain) PVZ.music.setGain(stn.gain * (PVZ.state.data ? (PVZ.state.data.radioVolume == null ? 1 : PVZ.state.data.radioVolume) : 1));
    }
    if (PVZ.state.data) {
      PVZ.state.data.radioStation = apps.RADIO.indexOf(stn);
      PVZ.state.save();
    }
    return stn;
  };

  apps.radioVolume = function (v) {
    var d = PVZ.state.data;
    if (!d) return;
    d.radioVolume = U.clamp(v, 0, 1);
    apps.applyRadio(d.radioStation || 0);
  };


  apps.drawGeneric = function (ctx, app, win, env) {
    var lines = apps.liveLines(app, env);
    art.txt(ctx, app.name.toUpperCase(), win.x + 26, win.y + 82, 18, '#e6fbf4', 800);
    art.txt(ctx, app.size + ' · ★ ' + app.rating.toFixed(1), win.x + win.w - 26, win.y + 82, 11, 'rgba(200,240,230,0.5)', 700, 'right');
    var box = apps.infoPanelRect(win);
    art.fillRR(ctx, box.x, box.y, box.w, box.h, 12, 'rgba(10,26,24,0.55)');
    art.strokeRR(ctx, box.x, box.y, box.w, box.h, 12, 'rgba(140,230,205,0.16)', 1.2);
    var y = box.y + 30;
    lines.forEach(function (line) {
      if (y > box.y + box.h - 12) return;
      if (line === '') { y += 12; return; }
      var color = /^●/.test(line) ? '#ffd479' : /^✓/.test(line) ? '#8fe0a8' : /^[•○]/.test(line) ? 'rgba(230,250,244,0.8)' : '#dff6ee';
      art.txt(ctx, line, box.x + 20, y, 13, color, 600);
      y += 24;
    });
    if (app.id === 'radio') {
      // кнопки станций перекрывают строки списка
      var stations = apps.RADIO;
      var cur = (PVZ.state.data && PVZ.state.data.radioStation != null) ? PVZ.state.data.radioStation : 2;
      stations.forEach(function (s, i) {
        var r = { x: box.x + 20 + i * ((box.w - 40) / 4), y: box.y + box.h - 54, w: (box.w - 40) / 4 - 8, h: 36 };
        var active = i === cur % stations.length;
        var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, r.x, r.y, r.w, r.h, 9, active ? 'rgba(47,184,148,0.9)' : hov ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)');
        art.txt(ctx, s.name, r.x + r.w / 2, r.y + 23, 11, active ? '#08221c' : '#dff6ee', 700, 'center');
      });
    }
    if (app.id === 'antivirus' || app.id === 'taxi') {
      art.button(ctx, { x: box.x + 20, y: box.y + box.h - 56, w: 240, h: 40 },
        app.id === 'antivirus' ? 'Проверить ноутбук' : 'Вызвать машину',
        { hover: U.hit({ x: box.x + 20, y: box.y + box.h - 56, w: 240, h: 40 }, PVZ.input.x, PVZ.input.y), size: 14 });
      if (app.id === 'antivirus' && PVZ.state.hasApp('banana')) {
        var delR = { x: box.x + 20, y: box.y + box.h - 106, w: 300, h: 40 };
        art.button(ctx, delR, 'Удалить Banana store', {
          hover: U.hit(delR, PVZ.input.x, PVZ.input.y), size: 14,
          bg: 'rgba(180,60,40,0.9)', hoverBg: '#e4572e', fg: '#fff1e6'
        });
        art.txt(ctx, 'Удаление закроет доступ к чёрному рынку навсегда.',
          delR.x + delR.w + 14, delR.y + 25, 10, 'rgba(255,190,165,0.75)', 600);
      }
    }
    art.txt(ctx, env && env.hint ? env.hint : 'Esc — на рабочий стол · ✕ — закрыть ноутбук',
      win.x + win.w / 2, win.y + win.h - 12, 11, 'rgba(200,235,225,0.4)', 600, 'center');
  };

  /* =========================================================
     ЭКРАНЫ ПРИЛОЖЕНИЙ
     У каждой программы свой характер: бумажный блокнот, карта,
     камеры, плеер, досье. Общая шапка только держит рамку.
     ========================================================= */
  function screenBox(win) {
    return { x: win.x + 26, y: win.y + 98, w: win.w - 52, h: win.h - 128 };
  }
  apps.screenBox = screenBox;

  function screenShell(ctx, app, win, subtitle) {
    var b = screenBox(win);
    art.fillRR(ctx, win.x + 26, win.y + 62, 30, 30, 9, app.color);
    art.txt(ctx, app.glyph, win.x + 41, win.y + 84, 16, '#fff', 900, 'center');
    art.txt(ctx, app.name.toUpperCase(), win.x + 66, win.y + 84, 17, '#eafff8', 800);
    if (subtitle) {
      var nx = win.x + 66 + art.txtW(ctx, app.name.toUpperCase(), 17, 800) + 12;
      art.txt(ctx, subtitle, nx, win.y + 84, 10.5, 'rgba(205,240,232,0.5)', 600);
    }
    var fit = art.fitTxt(ctx, app.size + ' · ★ ' + app.rating.toFixed(1), 150, 10.5, 700, 8);
    art.txt(ctx, fit.text, win.x + win.w - 26, win.y + 84, fit.size, 'rgba(200,240,230,0.45)', 700, 'right');
    return b;
  }

  function toneCard(ctx, r, base, border) {
    art.fillRR(ctx, r.x, r.y, r.w, r.h, 12, base || 'rgba(255,255,255,0.05)');
    art.strokeRR(ctx, r.x, r.y, r.w, r.h, 12, border || 'rgba(255,255,255,0.1)', 1.2);
  }
  function pill(ctx, x, y, text, color, fg) {
    var w = art.txtW(ctx, text, 10, 800) + 18;
    art.fillRR(ctx, x, y, w, 20, 10, color || 'rgba(255,255,255,0.1)');
    art.txt(ctx, text, x + w / 2, y + 14, 10, fg || '#eafff8', 800, 'center');
    return w;
  }

  /* ---------------- заметки ---------------- */
  function drawNotes(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'бумажный блокнот смены');
    var st = env.st || {};
    var d = PVZ.state.data || {};
    var objs = st.objectives || [];
    var left = { x: b.x, y: b.y, w: b.w * 0.62, h: b.h };
    var right = { x: left.x + left.w + 14, y: b.y, w: b.w - left.w - 14, h: b.h };
    // лист блокнота
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    art.fillRR(ctx, left.x, left.y, left.w, left.h, 10, '#fbf3df');
    ctx.restore();
    ctx.save();
    art.rr(ctx, left.x, left.y, left.w, left.h, 10); ctx.clip();
    ctx.strokeStyle = 'rgba(120,150,190,0.28)'; ctx.lineWidth = 1;
    for (var ly = left.y + 46; ly < left.y + left.h; ly += 26) {
      ctx.beginPath(); ctx.moveTo(left.x, ly); ctx.lineTo(left.x + left.w, ly); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,90,80,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left.x + 42, left.y); ctx.lineTo(left.x + 42, left.y + left.h); ctx.stroke();
    ctx.restore();
    // спираль
    for (var sy = left.y + 14; sy < left.y + left.h; sy += 30) {
      ctx.beginPath();
      ctx.arc(left.x + 8, sy, 5, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = 'rgba(90,70,50,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    }
    art.txt(ctx, 'ЗАМЕТКИ СМЕНЫ', left.x + 58, left.y + 30, 15, '#3a2a21', 800);
    art.txt(ctx, 'день ' + (d.day || 1) + ' · ' + (PHASE_RU[st.phase] || 'утро') + ' · ' + U.fmtTime(st.clock || 0),
      left.x + 58, left.y + 48, 10, 'rgba(70,50,35,0.55)', 700);
    var done = objs.filter(function (o) { return o.done; }).length;
    art.bar(ctx, left.x + 58, left.y + 58, left.w - 80, 8, objs.length ? done / objs.length : 0, '#5aa877', 'rgba(60,40,25,0.15)');
    art.txt(ctx, objs.length ? done + ' из ' + objs.length : 'задач пока нет', left.x + left.w - 18, left.y + 65, 10,
      'rgba(70,50,35,0.55)', 700, 'right');

    var yy = left.y + 92;
    if (!objs.length) {
      art.txt(ctx, 'Смена ещё не началась.', left.x + 58, yy, 14, 'rgba(60,45,32,0.7)', 700);
      art.txt(ctx, 'Откройте смену в терминале — список задач появится здесь.', left.x + 58, yy + 22, 11, 'rgba(60,45,32,0.45)', 600);
    }
    objs.slice(0, 8).forEach(function (o) {
      var ry = yy;
      ctx.strokeStyle = o.done ? '#5aa877' : 'rgba(60,45,32,0.35)';
      ctx.lineWidth = 1.6;
      art.strokeRR(ctx, left.x + 58, ry - 13, 16, 16, 4, o.done ? '#5aa877' : 'rgba(60,45,32,0.35)', 1.6);
      if (o.done) art.txt(ctx, '✓', left.x + 66, ry - 1, 13, '#3f8659', 900, 'center');
      art.txt(ctx, o.text || '', left.x + 84, ry, 12.5, o.done ? 'rgba(60,45,32,0.45)' : '#3a2a21', o.done ? 600 : 700);
      if (o.progress) art.txt(ctx, o.progress, left.x + left.w - 18, ry, 10.5, 'rgba(60,45,32,0.55)', 800, 'right');
      yy += 30;
    });

    // стикеры справа
    ctx.save();
    ctx.translate(right.x + right.w / 2, right.y + 96);
    ctx.rotate(-0.025);
    art.fillRR(ctx, -right.w / 2, -84, right.w, 176, 4, '#ffe9a8');
    ctx.restore();
    art.txt(ctx, 'ПОДСКАЗКИ', right.x + 20, right.y + 34, 12, '#8a5a1a', 800);
    var tips = [
      'T — терминал, L — ноутбук, Esc — пауза.',
      'Сканер сначала взять со стола.',
      'Посылка: взять → на стол → сканер → клиент.',
      'Отзывы отвечать в ноутбуке → Отзывы.'
    ];
    tips.slice(0, 4).forEach(function (line, i) {
      var lines = U.wrapLines(ctx, line, right.w - 40, 10.5, 600);
      lines.slice(0, 2).forEach(function (t, li) {
        art.txt(ctx, t, right.x + 20, right.y + 54 + i * 32 + li * 13, 10.5, 'rgba(90,60,20,0.8)', 600);
      });
    });
    // след кота
    art.txt(ctx, '🐾', right.x + right.w - 26, right.y + 36, 16, 'rgba(140,100,50,0.5)', 700, 'center');
    art.fillRR(ctx, right.x, right.y + right.h - 44, right.w, 44, 8, 'rgba(255,233,168,0.18)');
    art.txt(ctx, d.cat ? ('Кот ' + d.cat.name + ' на посту.') : 'Кот ещё не пришёл.',
      right.x + 12, right.y + right.h - 18, 10.5, 'rgba(255,240,190,0.85)', 700);
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  var PHASE_RU = { morning: 'утро', day: 'день', evening: 'вечер' };

  /* ---------------- погода ---------------- */
  function drawWeather(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'прогноз на смену');
    var d = PVZ.state.data || {};
    var day = d.day || 1;
    var w = apps.weatherFor(day);
    var left = { x: b.x, y: b.y, w: b.w * 0.6 - 8, h: b.h };
    var right = { x: b.x + b.w * 0.6 + 6, y: b.y, w: b.w * 0.4 - 6, h: b.h };
    var g = ctx.createLinearGradient(left.x, left.y, left.x, left.y + left.h);
    g.addColorStop(0, w.name === 'дождь' || w.name === 'гроза' ? '#3d5168' : w.name === 'снег' ? '#7288a0' : '#4a86b8');
    g.addColorStop(1, w.name === 'дождь' || w.name === 'гроза' ? '#9fb0c2' : '#e7d9b8');
    art.fillRR(ctx, left.x, left.y, left.w, left.h, 14, g);
    // солнце/туча
    if (w.name === 'ясно') {
      ctx.save();
      ctx.shadowColor = 'rgba(255,230,140,0.9)'; ctx.shadowBlur = 40;
      ctx.beginPath(); ctx.arc(left.x + left.w - 110, left.y + 74, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdf7a'; ctx.fill(); ctx.restore();
    } else {
      [[-30, 0], [10, 14], [40, -4]].forEach(function (o, i) {
        art.fillRR(ctx, left.x + left.w - 190 + o[0], left.y + 46 + o[1], 90, 36, 20, 'rgba(255,255,255,' + (0.8 - i * 0.15) + ')');
      });
      if (w.name === 'дождь' || w.name === 'гроза') {
        for (var r = 0; r < 14; r++) {
          var rx = left.x + left.w - 200 + (r * 17) % 150;
          var ry = left.y + 86 + ((env.t || 0) * 120 + r * 23) % 170;
          ctx.strokeStyle = 'rgba(220,240,255,0.45)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 12); ctx.stroke();
        }
      }
    }
    art.txt(ctx, 'ДЕНЬ ' + day, left.x + 24, left.y + 32, 11, 'rgba(255,255,255,0.6)', 800);
    art.txt(ctx, w.icon, left.x + 24, left.y + 112, 54, '#fff8e6', 800);
    art.txt(ctx, w.temp, left.x + 24 + 64, left.y + 102, 40, '#fff8e6', 800);
    art.txt(ctx, w.name.toUpperCase(), left.x + 24, left.y + 142, 16, '#fff8e6', 800);
    art.txt(ctx, w.note, left.x + 24, left.y + 166, 11.5, 'rgba(255,248,230,0.75)', 600);
    var mod = env.st && env.st.dayMod;
    if (mod) {
      art.fillRR(ctx, left.x + 24, left.y + 190, left.w - 48, 62, 12, 'rgba(20,30,40,0.35)');
      art.txt(ctx, mod.icon + '  ' + mod.label, left.x + 40, left.y + 216, 15, '#fff3dc', 800);
      var lines = U.wrapLines(ctx, mod.text || mod.desc || 'Событие дня меняет правила смены.', left.w - 80, 10.5, 600);
      art.txt(ctx, lines[0] || '', left.x + 40, left.y + 236, 10.5, 'rgba(255,243,220,0.7)', 600);
    }
    art.txt(ctx, 'За окном ' + U.fmtTime(env.st ? env.st.clock : 8 * 60 + 30), left.x + left.w - 24, left.y + left.h - 18, 10, 'rgba(255,255,255,0.55)', 700, 'right');

    // правая колонка: прогноз
    art.txt(ctx, 'БЛИЖАЙШИЕ ДНИ', right.x + 6, right.y + 18, 11, 'rgba(200,240,230,0.6)', 800);
    [1, 2, 3].forEach(function (off, i) {
      var ww = apps.weatherFor(day + off);
      var r = { x: right.x, y: right.y + 30 + i * 86, w: right.w, h: 76 };
      toneCard(ctx, r, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.09)');
      art.txt(ctx, ww.icon, r.x + 22, r.y + 44, 26, '#fff3dc', 800);
      art.txt(ctx, 'день ' + (day + off), r.x + 60, r.y + 28, 11, 'rgba(200,240,230,0.55)', 700);
      art.txt(ctx, ww.name + ', ' + ww.temp, r.x + 60, r.y + 48, 14, '#fff3dc', 700);
      var desc = U.wrapLines(ctx, ww.note, r.w - 72, 9.5, 600);
      art.txt(ctx, desc[0] || '', r.x + 60, r.y + 65, 9.5, 'rgba(200,235,225,0.45)', 600);
    });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- график смен ---------------- */
  function drawSchedule(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'календарь забега');
    var d = PVZ.state.data || {};
    var endless = PVZ.state.endless && PVZ.state.endless();
    var today = d.day || 1;
    var total = endless ? Math.max(10, today + 5) : PVZ.balance.WIN_DAY;
    var first = endless ? Math.max(1, today - 4) : 1;
    var count = endless ? 10 : total;
    var cols = 5, gap = 10;
    var cw = (b.w - gap * (cols - 1)) / cols;
    var ch = 106;
    for (var i = 0; i < count; i++) {
      var dayN = first + i;
      var r = { x: b.x + (i % cols) * (cw + gap), y: b.y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch };
      var past = dayN < today || (dayN <= (d.totals ? d.totals.days : 0));
      var now = dayN === today;
      toneCard(ctx, r, now ? 'rgba(242,153,74,0.18)' : past ? 'rgba(90,168,119,0.10)' : 'rgba(255,255,255,0.04)',
        now ? 'rgba(242,153,74,0.7)' : past ? 'rgba(90,168,119,0.28)' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, 'ДЕНЬ', r.x + 12, r.y + 20, 8.5, 'rgba(200,235,225,0.45)', 800);
      art.txt(ctx, String(dayN), r.x + 12, r.y + 54, 28, now ? '#ffd479' : past ? '#9fe0b0' : '#eafff8', 900);
      if (now) pill(ctx, r.x + 12, r.y + 62, 'СЕГОДНЯ', 'rgba(242,153,74,0.9)', '#2a1a10');
      else if (past) pill(ctx, r.x + 12, r.y + 62, 'СМЕНА СДАНА', 'rgba(90,168,119,0.22)', '#9fe0b0');
      else pill(ctx, r.x + 12, r.y + 62, 'ВПЕРЕДИ', 'rgba(255,255,255,0.07)', 'rgba(210,235,228,0.55)');
      art.txt(ctx, now ? (env.st ? (PHASE_RU[env.st.phase] || '—') : '—') : past ? 'закрыта' : 'план ' + Math.max(6, planForApp(dayN)),
        r.x + 12, r.y + r.h - 12, 9.5, 'rgba(200,235,225,0.45)', 600);
    }
    // итоговая строка
    var sy = b.y + ch * 2 + gap + 14;
    if (sy + 60 < b.y + b.h) {
      art.fillRR(ctx, b.x, sy, b.w, 56, 12, 'rgba(255,255,255,0.045)');
      var stats = [
        ['РЕЙТИНГ', (d.rating || 0).toFixed(2) + ' / 5,00'],
        ['ОТРАБОТАНО', (d.totals ? d.totals.days : 0) + ' смен'],
        [endless ? 'РЕКОРД' : 'ОСТАЛОСЬ', endless ? ((d.endlessBest && d.endlessBest.day) || today) + ' смен' : Math.max(0, total - today) + ' смен'],
        ['ПЛАН НА СЕГОДНЯ', (env.st ? env.st.plan : planForApp(today)) + ' выдач']
      ];
      stats.forEach(function (s, si) {
        var sx = b.x + 18 + si * (b.w - 36) / 4;
        art.txt(ctx, s[0], sx, sy + 22, 8.5, 'rgba(200,235,225,0.45)', 800);
        art.txt(ctx, s[1], sx, sy + 44, 14, '#fff3e2', 800);
      });
    }
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }
  function planForApp(day) { return Math.min(20, 8 + Math.max(1, day || 1) * 2) + (PVZ.state.level ? PVZ.state.level('ad') * 2 : 0); }

  /* ---------------- банк ---------------- */
  function drawBank(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'счёт пункта выдачи');
    var d = PVZ.state.data || {};
    var endless = PVZ.state.endless && PVZ.state.endless();
    var st = env.st || {};
    var card = { x: b.x, y: b.y, w: 380, h: b.h };
    var g = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
    g.addColorStop(0, '#1f4a3c'); g.addColorStop(0.55, '#2f6b52'); g.addColorStop(1, '#173a30');
    art.fillRR(ctx, card.x, card.y, card.w, card.h, 16, g);
    art.strokeRR(ctx, card.x, card.y, card.w, card.h, 16, 'rgba(150,240,210,0.25)', 1.4);
    art.txt(ctx, 'БАНК ПВЗ', card.x + 22, card.y + 30, 12, 'rgba(180,240,220,0.75)', 800);
    art.txt(ctx, '••••  ••••  ••••  1408', card.x + 22, card.y + 54, 11, 'rgba(180,240,220,0.35)', 700);
    art.txt(ctx, 'ДОСТУПНО', card.x + 22, card.y + 100, 10, 'rgba(180,240,220,0.55)', 800);
    art.txt(ctx, U.fmtMoney(d.money || 0), card.x + 22, card.y + 142, 34, '#eafff8', 800);
    // чип
    art.fillRR(ctx, card.x + card.w - 90, card.y + 92, 54, 40, 7, '#e6c15a');
    ctx.strokeStyle = 'rgba(120,90,20,0.4)'; ctx.lineWidth = 1;
    for (var ci = 1; ci < 4; ci++) { ctx.beginPath(); ctx.moveTo(card.x + card.w - 90, card.y + 92 + ci * 10); ctx.lineTo(card.x + card.w - 36, card.y + 92 + ci * 10); ctx.stroke(); }
    art.txt(ctx, PVZ.state.title(), card.x + 22, card.y + card.h - 54, 13, 'rgba(220,250,238,0.8)', 700);
    art.txt(ctx, PVZ.state.address(), card.x + 22, card.y + card.h - 34, 10, 'rgba(180,240,220,0.45)', 600);
    art.txt(ctx, 'ВЛАДЕЛЕЦ КАРТЫ', card.x + card.w - 22, card.y + card.h - 54, 8, 'rgba(180,240,220,0.45)', 800, 'right');

    var right = { x: card.x + card.w + 14, y: b.y, w: b.w - card.w - 14, h: b.h };
    var target = endless ? ((d.rent && d.rent.unpaid) || 0) : (d.debt || 0);
    var title = endless ? 'АРЕНДА ПОМЕЩЕНИЯ' : 'ДОЛГ МАФИИ';
    toneCard(ctx, { x: right.x, y: right.y, w: right.w, h: 92 }, 'rgba(228,87,46,0.10)', 'rgba(228,87,46,0.28)');
    art.txt(ctx, title, right.x + 18, right.y + 24, 10, 'rgba(255,190,170,0.7)', 800);
    art.txt(ctx, U.fmtMoney(target), right.x + 18, right.y + 58, 26, '#ffd8a8', 800);
    art.txt(ctx, endless ? 'неоплачено' : 'остаток долга', right.x + 18, right.y + 78, 9.5, 'rgba(255,210,180,0.5)', 600);
    var paid = endless ? ((d.rent && d.rent.paidTotal) || 0) : (d.mafiaPaid || 0);
    art.bar(ctx, right.x + 18, right.y + 86, right.w - 36, 6, target <= 0 ? 1 : Math.min(1, paid / Math.max(1, paid + target)), '#8fe0a8', 'rgba(0,0,0,0.3)');
    var rows = endless ? [
      ['Выручка смены', U.fmtMoney(st.stats ? st.stats.revenue : 0)],
      ['Доля владельцу', Math.round((sys.rentParts ? sys.rentParts(d.day || 1, st.stats ? st.stats.revenue : 0).share : 0) * 100) + '%'],
      ['Заплачено всего', U.fmtMoney(paid)],
      ['Пропущено смен', String((d.rent && d.rent.strikes) || 0) + ' из ' + PVZ.balance.rentUnpaidLimit]
    ] : [
      ['Выручка смены', U.fmtMoney(st.stats ? st.stats.revenue : 0)],
      ['Отдано мафии', U.fmtMoney(paid)],
      ['Визитов было', String(d.mafiaVisits || 0)],
      ['Следующий вечер', U.fmtMoney(sys.mafiaDemand ? sys.mafiaDemand(d.day || 1) : 0)]
    ];
    rows.forEach(function (row, i) {
      var yy = right.y + 116 + i * 42;
      art.txt(ctx, row[0], right.x + 18, yy, 11, 'rgba(200,235,225,0.5)', 600);
      art.txt(ctx, row[1], right.x + right.w - 18, yy, 14, '#eafff8', 700, 'right');
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(right.x + 18, yy + 14); ctx.lineTo(right.x + right.w - 18, yy + 14); ctx.stroke();
    });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- долги (досье) ---------------- */
  function drawDebt(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'досье: доверие, грязь, улики');
    var d = PVZ.state.data || {};
    var m = PVZ.state.mafiaState ? (PVZ.state.mafiaState() || {}) : {};
    var left = { x: b.x, y: b.y, w: 340, h: b.h };
    var g = ctx.createLinearGradient(left.x, left.y, left.x + left.w, left.y + left.h);
    g.addColorStop(0, '#241b1b'); g.addColorStop(1, '#120e0e');
    art.fillRR(ctx, left.x, left.y, left.w, left.h, 16, g);
    art.strokeRR(ctx, left.x, left.y, left.w, left.h, 16, 'rgba(200,70,50,0.28)', 1.4);
    art.txt(ctx, '♠', left.x + 24, left.y + 62, 46, 'rgba(228,87,46,0.85)', 900);
    art.txt(ctx, 'ДЕЛО №' + String((d.day || 1)).padStart(3, '0'), left.x + 24, left.y + 96, 11, 'rgba(255,190,170,0.55)', 800);
    art.txt(ctx, 'ДОЛГ', left.x + 24, left.y + 138, 10, 'rgba(255,200,180,0.5)', 800);
    art.txt(ctx, U.fmtMoney(d.debt || 0), left.x + 24, left.y + 178, 30, '#ffd8a8', 800);
    if ((d.debt || 0) <= 0) {
      ctx.save(); ctx.translate(left.x + 190, left.y + 250); ctx.rotate(-0.18);
      art.strokeRR(ctx, -80, -22, 160, 44, 6, 'rgba(140,230,190,0.8)', 3);
      art.txt(ctx, 'СВОБОДЕН', 0, 9, 20, 'rgba(140,230,190,0.9)', 900, 'center');
      ctx.restore();
    }
    art.txt(ctx, 'КУРАТОР: КОСТЯ', left.x + 24, left.y + left.h - 52, 10, 'rgba(255,200,180,0.45)', 700);
    art.txt(ctx, 'Доверие Босса: ' + ((m.trust > 0 ? '+' : '') + (m.trust || 0)) + ' / 100', left.x + 24, left.y + left.h - 30, 10, 'rgba(255,200,180,0.55)', 600);

    var right = { x: left.x + left.w + 14, y: b.y, w: b.w - left.w - 14, h: b.h };
    var bars = [
      { label: 'ДОВЕРИЕ', v: ((m.trust || 0) + 100) / 200, col: '#8fe0a8', note: (m.trust || 0) >= 40 ? 'вам верят' : (m.trust || 0) <= -30 ? 'вас не любят' : 'держат дистанцию' },
      { label: 'ГРЯЗЬ', v: (m.dirt || 0) / 100, col: '#e0a04a', note: (m.dirt || 0) >= 70 ? 'вы уже часть схемы' : (m.dirt || 0) >= 40 ? 'есть что предъявить' : 'пока чисто' },
      { label: 'УЛИКИ', v: (m.proof || 0) / 3, col: '#7fb4ea', note: (m.proof || 0) >= 3 ? 'можно идти в полицию' : (m.proof || 0) >= 2 ? 'хватит на сделку' : 'мало для сделки' }
    ];
    bars.forEach(function (bar, i) {
      var y = right.y + 20 + i * 70;
      art.txt(ctx, bar.label, right.x, y, 10, 'rgba(255,220,200,0.55)', 800);
      art.txt(ctx, bar.note, right.x + right.w, y, 9.5, 'rgba(255,220,200,0.4)', 600, 'right');
      art.bar(ctx, right.x, y + 10, right.w, 12, bar.v, bar.col, 'rgba(255,255,255,0.06)');
      art.txt(ctx, bar.label === 'УЛИКИ' ? (m.proof || 0) + ' / 3' : Math.round(bar.v * 100) + '%',
        right.x + right.w - 4, y + 34, 11, '#fff3e2', 700, 'right');
    });
    var task = m.task;
    var ty = right.y + 236;
    if (task) {
      toneCard(ctx, { x: right.x, y: ty, w: right.w, h: 62 }, 'rgba(228,87,46,0.12)', 'rgba(228,87,46,0.32)');
      art.txt(ctx, 'УСЛУГА: ОБСЛУЖИТЬ ' + task.need + ' КЛИЕНТОВ', right.x + 16, ty + 22, 10.5, '#ffd8a8', 800);
      art.bar(ctx, right.x + 16, ty + 32, right.w - 32, 8, (task.need - task.remaining) / task.need, '#e4572e', 'rgba(0,0,0,0.35)');
      art.txt(ctx, 'Спишут ' + U.fmtMoney(task.reward) + ' · осталось ' + task.remaining, right.x + 16, ty + 54, 9.5, 'rgba(255,210,180,0.6)', 600);
    } else {
      toneCard(ctx, { x: right.x, y: ty, w: right.w, h: 62 }, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)');
      art.txt(ctx, (m.path === 'family') ? 'СТАТУС: СВОЙ ЧЕЛОВЕК' : 'АКТИВНОЙ УСЛУГИ НЕТ', right.x + 16, ty + 24, 11, '#eafff8', 800);
      art.txt(ctx, (m.path === 'family') ? 'Босс считает вас частью команды.' : 'Вечером придут за деньгами.', right.x + 16, ty + 44, 10, 'rgba(200,235,225,0.5)', 600);
    }
    var ending = sys.mafiaEnding ? sys.mafiaEnding() : null;
    if (ending && ending.title) {
      art.txt(ctx, 'ПРОГНОЗ: ' + ending.title, right.x, b.y + b.h - 12, 11, 'rgba(255,210,150,0.7)', 800);
    }
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- CRM ---------------- */
  function drawCRM(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'карточки покупателей');
    var d = PVZ.state.data || {};
    var list = (d.reviews || []).slice(-7).reverse();
    var box = { x: b.x, y: b.y, w: 300, h: b.h };
    var right = { x: b.x + 312, y: b.y, w: b.w - 312, h: b.h };
    art.txt(ctx, 'КЛИЕНТЫ', box.x, box.y + 16, 10, 'rgba(200,240,230,0.55)', 800);
    if (!list.length) {
      art.txt(ctx, 'База пуста.', box.x, box.y + 46, 13, '#eafff8', 700);
      art.txt(ctx, 'Обслужите первого покупателя —', box.x, box.y + 70, 10.5, 'rgba(200,235,225,0.45)', 600);
      art.txt(ctx, 'карточка появится здесь.', box.x, box.y + 86, 10.5, 'rgba(200,235,225,0.45)', 600);
    }
    var sel = (env.laptop && env.laptop.crmSel) || 0;
    if (sel >= list.length) sel = 0;
    list.forEach(function (rv, i) {
      var r = { x: box.x, y: box.y + 26 + i * 44, w: box.w, h: 38 };
      var on = i === sel;
      toneCard(ctx, r, on ? 'rgba(74,160,168,0.22)' : 'rgba(255,255,255,0.04)', on ? 'rgba(120,220,220,0.55)' : 'rgba(255,255,255,0.07)');
      var initial = (rv.author || 'П')[0];
      art.fillRR(ctx, r.x + 6, r.y + 5, 28, 28, 14, 'rgba(74,160,168,0.35)');
      art.txt(ctx, initial, r.x + 20, r.y + 25, 13, '#eafff8', 800, 'center');
      art.txt(ctx, rv.author || 'Покупатель', r.x + 42, r.y + 17, 11.5, '#eafff8', 700);
      art.txt(ctx, 'день ' + (rv.day || 1) + ' · ' + (rv.score || 3) + '★', r.x + 42, r.y + 31, 9, 'rgba(200,235,225,0.45)', 600);
      art.txt(ctx, rv.score >= 4 ? '🙂' : rv.score <= 2 ? '😠' : '😐', r.x + r.w - 22, r.y + 26, 12, '#fff', 700, 'center');
    });
    var cur = list[sel];
    if (!cur) {
      art.fillRR(ctx, right.x, right.y, right.w, right.h, 14, 'rgba(74,160,168,0.06)');
      art.txt(ctx, '👤', right.x + right.w / 2, right.y + 110, 66, 'rgba(120,200,210,0.25)', 700, 'center');
      art.txt(ctx, 'Пока никого нет в базе', right.x + right.w / 2, right.y + 160, 16, 'rgba(220,245,240,0.6)', 700, 'center');
    } else {
      art.fillRR(ctx, right.x, right.y, right.w, 132, 14, 'rgba(74,160,168,0.12)');
      art.strokeRR(ctx, right.x, right.y, right.w, 132, 14, 'rgba(120,220,220,0.3)', 1.2);
      art.txt(ctx, 'КАРТОЧКА КЛИЕНТА', right.x + 18, right.y + 24, 9.5, 'rgba(160,235,230,0.7)', 800);
      art.txt(ctx, cur.author || 'Покупатель', right.x + 18, right.y + 52, 22, '#eafff8', 800);
      art.txt(ctx, 'Последний визит: день ' + (cur.day || 1), right.x + 18, right.y + 74, 10.5, 'rgba(200,235,225,0.5)', 600);
      art.stars(ctx, right.x + 18, right.y + 96, cur.score || 3, 9);
      art.txt(ctx, (cur.score >= 4 ? 'ЛОЯЛЬНЫЙ' : cur.score <= 2 ? 'РИСК ОТТОКА' : 'НЕЙТРАЛЬНЫЙ'),
        right.x + right.w - 18, right.y + 100, 10, cur.score >= 4 ? '#9fe0b0' : cur.score <= 2 ? '#ff9d7a' : '#ffd479', 800, 'right');
      var wrapped = U.wrapLines(ctx, '«' + (cur.text || '') + '»', right.w - 36, 12.5, 600);
      wrapped.slice(0, 3).forEach(function (line, li) {
        art.txt(ctx, line, right.x + 18, right.y + 158 + li * 19, 12.5, '#dff6ee', 600);
      });
      var rows = [
        ['Средняя оценка клиента', (cur.score || 3) + ' / 5'],
        ['Чаевые', '+3% к чаевым'],
        ['Статус', cur.score >= 4 ? 'можно предложить пакет' : cur.score <= 2 ? 'нужен ответ на отзыв' : 'держим нейтрально']
      ];
      rows.forEach(function (row, i) {
        var yy = right.y + 236 + i * 30;
        art.txt(ctx, row[0], right.x + 18, yy, 10.5, 'rgba(200,235,225,0.5)', 600);
        art.txt(ctx, row[1], right.x + right.w - 18, yy, 11, '#fff3e2', 700, 'right');
      });
    }
    art.txt(ctx, 'Тап по клиенту — открыть карточку · Esc — на рабочий стол', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }
  apps.crmRects = function (win) {
    var b = screenBox(win), list = (PVZ.state.data && PVZ.state.data.reviews || []).slice(-7).reverse();
    var box = { x: b.x, y: b.y, w: 300, h: b.h };
    return list.map(function (rv, i) { return { x: box.x, y: box.y + 26 + i * 44, w: box.w, h: 38 }; });
  };

  /* ---------------- камеры ---------------- */
  function drawCCTV(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'видеонаблюдение');
    var st = env.st || {};
    var cam = (env.laptop && env.laptop.cctvCam) || 0;
    var names = ['ЗАЛ', 'СКЛАД', 'ПРИМЕРОЧНАЯ', 'СТОЙКА'];
    var cw = (b.w - 10) / 2, chh = (b.h - 42) / 2;
    for (var i = 0; i < 4; i++) {
      var r = { x: b.x + (i % 2) * (cw + 10), y: b.y + Math.floor(i / 2) * (chh + 10), w: cw, h: chh };
      ctx.save();
      art.rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.clip();
      var g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      g.addColorStop(0, '#1c2624'); g.addColorStop(1, '#0d1312');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      // сцена камеры
      if (i === 0) {
        ctx.fillStyle = 'rgba(240,235,220,0.08)'; ctx.fillRect(r.x, r.y + r.h * 0.55, r.w, 4);
        var people = st.queue || [];
        people.slice(0, 4).forEach(function (p, pi) {
          art.drawPerson(ctx, p, r.x + 70 + pi * 52, r.y + r.h - 24, 76, { noShadow: true, walk: 0 });
        });
        art.txt(ctx, (people.length + (st.customer ? 1 : 0)) + ' чел.', r.x + 12, r.y + r.h - 10, 10, 'rgba(180,240,210,0.85)', 800);
      } else if (i === 1) {
        for (var sh = 0; sh < 3; sh++) {
          art.fillRR(ctx, r.x + 30 + sh * (r.w - 60) / 3, r.y + 44, (r.w - 80) / 3, r.h - 80, 4, 'rgba(180,190,200,0.1)');
          for (var pp = 0; pp < 2; pp++) art.fillRR(ctx, r.x + 36 + sh * (r.w - 60) / 3, r.y + 60 + pp * 22, (r.w - 92) / 3, 14, 2, 'rgba(220,190,140,0.3)');
        }
        var stored = st.orders ? st.orders.filter(function (o) { return o.state === 'stored'; }).length : 0;
        art.txt(ctx, stored + ' посылок', r.x + 12, r.y + r.h - 10, 10, 'rgba(180,240,210,0.85)', 800);
      } else if (i === 2) {
        art.fillRR(ctx, r.x + r.w * 0.2, r.y + 24, r.w * 0.6, r.h - 48, 6, 'rgba(200,120,120,0.18)');
        ctx.strokeStyle = 'rgba(230,180,160,0.2)'; ctx.lineWidth = 1;
        for (var cu = 0; cu < 6; cu++) { ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.2 + cu * r.w * 0.1, r.y + 24); ctx.lineTo(r.x + r.w * 0.2 + cu * r.w * 0.1, r.y + r.h - 24); ctx.stroke(); }
        art.txt(ctx, st.fitting && st.fitting.length ? 'ЗАНЯТА' : 'СВОБОДНА', r.x + 12, r.y + r.h - 10, 10, 'rgba(180,240,210,0.85)', 800);
      } else {
        art.fillRR(ctx, r.x + 20, r.y + r.h - 50, r.w - 40, 18, 4, 'rgba(200,170,120,0.35)');
        art.fillRR(ctx, r.x + r.w - 110, r.y + r.h - 86, 70, 40, 4, 'rgba(120,180,160,0.30)');
        art.txt(ctx, 'касса', r.x + r.w - 75, r.y + r.h - 62, 9, 'rgba(180,240,210,0.6)', 700, 'center');
        art.txt(ctx, st.cashDone ? 'СВЕРЕНА' : (st.phase === 'evening' ? 'ЖДЁТ СВЕРКИ' : 'РАБОТАЕТ'), r.x + 12, r.y + r.h - 10, 10, 'rgba(180,240,210,0.85)', 800);
      }
      // шум и развёртка
      ctx.fillStyle = 'rgba(120,230,190,0.035)';
      for (var sl = 0; sl < r.h; sl += 4) ctx.fillRect(r.x, r.y + sl, r.w, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(r.x, r.y, r.w, 26);
      ctx.restore();
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 10, i === cam ? 'rgba(120,240,190,0.8)' : 'rgba(255,255,255,0.1)', i === cam ? 2 : 1);
      art.fillRR(ctx, r.x + 10, r.y + 7, 8, 8, 4, i === 0 ? '#e4572e' : 'rgba(120,240,190,0.6)');
      art.txt(ctx, names[i], r.x + 24, r.y + 17, 10, '#eafff8', 800);
      art.txt(ctx, 'CAM ' + (i + 1) + ' · LIVE', r.x + r.w - 10, r.y + 17, 8.5, 'rgba(180,240,210,0.55)', 700, 'right');
      if (i === cam) art.txt(ctx, '●', r.x + r.w - 52, r.y + 17, 9, '#ff6a4a', 700);
    }
    art.txt(ctx, 'Тап по камере — крупный план · ' + U.fmtTime(st.clock || 0) + ' · запись идёт', b.x, b.y + b.h - 10, 9.5, 'rgba(200,235,225,0.45)', 600);
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }
  apps.cctvRects = function (win) {
    var b = screenBox(win), cw = (b.w - 10) / 2, chh = (b.h - 42) / 2, out = [];
    for (var i = 0; i < 4; i++) out.push({ x: b.x + (i % 2) * (cw + 10), y: b.y + Math.floor(i / 2) * (chh + 10), w: cw, h: chh });
    return out;
  };

  /* ---------------- карта города ---------------- */
  function drawMap(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'где вы и где вас ищут');
    var d = PVZ.state.data || {};
    var g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, '#1e2f2a'); g.addColorStop(1, '#121d1a');
    art.fillRR(ctx, b.x, b.y, b.w, b.h, 14, g);
    ctx.save();
    art.rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.clip();
    // кварталы
    var blocks = [[40, 40, 180, 90], [260, 20, 140, 120], [450, 50, 120, 80], [620, 30, 170, 110], [60, 200, 160, 110], [280, 210, 200, 90], [540, 190, 120, 140], [700, 200, 100, 100]];
    blocks.forEach(function (bl, i) {
      art.fillRR(ctx, b.x + bl[0], b.y + bl[1], bl[2], bl[3], 6, i % 2 ? 'rgba(120,160,140,0.10)' : 'rgba(100,140,125,0.07)');
    });
    // река
    ctx.strokeStyle = 'rgba(90,150,190,0.35)'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x - 10, b.y + 300); ctx.bezierCurveTo(b.x + 220, b.y + 250, b.x + 420, b.y + 360, b.x + b.w + 10, b.y + 300); ctx.stroke();
    // дороги
    ctx.strokeStyle = 'rgba(210,220,210,0.16)'; ctx.lineWidth = 12;
    [[0, 0.5, 1, 0.46], [0.32, 0, 0.36, 1], [0.72, 0, 0.66, 1], [0, 0.18, 1, 0.2]].forEach(function (ln) {
      ctx.beginPath(); ctx.moveTo(b.x + ln[0] * b.w, b.y + ln[1] * b.h); ctx.lineTo(b.x + ln[2] * b.w, b.y + ln[3] * b.h); ctx.stroke();
    });
    // маршрут от склада к ПВЗ
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(242,153,74,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x + 120, b.y + 90); ctx.quadraticCurveTo(b.x + 260, b.y + 180, b.x + 420, b.y + 190); ctx.stroke();
    ctx.setLineDash([]);
    // маркеры
    function marker(x, y, color, glyph, title, sub) {
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(b.x + x, b.y + y, 14, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.restore();
      art.txt(ctx, glyph, b.x + x, b.y + y + 5, 13, '#12100c', 900, 'center');
      art.txt(ctx, title, b.x + x, b.y + y - 22, 11, '#fff3e2', 800, 'center');
      if (sub) art.txt(ctx, sub, b.x + x, b.y + y + 30, 9, 'rgba(220,240,230,0.6)', 600, 'center');
    }
    marker(420, 190, '#f2994a', '▣', PVZ.state.title(), 'ваш пункт');
    marker(120, 90, '#5aa877', '▤', 'Склад', '3 км');
    marker(700, 240, 'rgba(228,87,46,0.95)', '♠', 'Старый завод', 'офис мафии');
    marker(300, 320, '#7fb4ea', '⌂', 'Дом', '25 минут');
    // компас
    art.txt(ctx, 'N', b.x + b.w - 34, b.y + 34, 13, 'rgba(220,240,230,0.7)', 800, 'center');
    ctx.strokeStyle = 'rgba(220,240,230,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x + b.w - 34, b.y + 40); ctx.lineTo(b.x + b.w - 34, b.y + 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x + b.w - 34, b.y + 40); ctx.lineTo(b.x + b.w - 39, b.y + 48); ctx.lineTo(b.x + b.w - 29, b.y + 48); ctx.closePath(); ctx.fillStyle = 'rgba(220,240,230,0.5)'; ctx.fill();
    ctx.restore();
    // легенда
    var lg = { x: b.x + b.w - 214, y: b.y + b.h - 92, w: 198, h: 76 };
    art.fillRR(ctx, lg.x, lg.y, lg.w, lg.h, 10, 'rgba(10,16,14,0.75)');
    art.txt(ctx, 'ЛЕГЕНДА', lg.x + 12, lg.y + 18, 8.5, 'rgba(200,235,225,0.5)', 800);
    [['#f2994a', 'ПВЗ'], ['#5aa877', 'поставщик'], ['#e4572e', 'мафия'], ['#7fb4ea', 'дом']].forEach(function (it, i) {
      var yy = lg.y + 32 + i * 12;
      art.fillRR(ctx, lg.x + 12, yy, 8, 8, 2, it[0]);
      art.txt(ctx, it[1], lg.x + 26, yy + 8, 8.5, 'rgba(220,240,230,0.6)', 600);
    });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- мессенджер ---------------- */
  var CHAT_CONTACTS = [
    { id: 'artem', name: 'Артём', note: 'друг, соседний ПВЗ', color: '#4a86b8' },
    { id: 'mom', name: 'Мама', note: 'просто позвонить', color: '#d0577f' },
    { id: 'support', name: 'Поддержка ПВЗ', note: 'помощь по смене', color: '#3f9c6a' }
  ];
  apps.CHAT_CONTACTS = CHAT_CONTACTS;
  apps.chatRects = function (win) {
    var b = screenBox(win);
    var left = { x: b.x, y: b.y, w: 220, h: b.h };
    var rows = CHAT_CONTACTS.map(function (c, i) { return { x: left.x, y: left.y + 26 + i * 48, w: left.w, h: 42, id: c.id }; });
    var qy = b.y + b.h - 40;
    var quick = [
      { x: b.x + 246, y: qy, w: 138, h: 30, text: 'Привет!' },
      { x: b.x + 392, y: qy, w: 162, h: 30, text: 'Как дела?' },
      { x: b.x + 562, y: qy, w: 138, h: 30, text: 'Держись.' }
    ];
    return { left: left, rows: rows, quick: quick, right: { x: b.x + 232, y: b.y, w: b.w - 232, h: b.h } };
  };
  function chatThread(contactId) {
    var d = PVZ.state.data || {};
    var log = (d.chatLog || []).filter(function (m) {
      var to = m.to || (m.from === 'me' ? 'artem' : m.from);
      return to === contactId;
    });
    if (contactId === 'artem') {
      var base = [];
      if (!log.length) {
        base.push({ from: 'artem', text: 'Здорово! Ты как там? Слышал, у тебя теперь свой ПВЗ.' });
        base.push({ from: 'me', text: 'Держусь. Коробки сами себя не выдадут.' });
        base.push({ from: 'artem', text: (d.debt || 0) > 0 ? 'Слушай, если вечером опять «гости» — не геройствуй. Лучше отдай и живи спокойно.' : 'Если что — я рядом, через два квартала.' });
      }
      if (d.cat) base.push({ from: 'artem', text: 'Кот у тебя уже командует? Мой вчера лёг на принтер.' });
      if ((d.eggs || []).length > 2) base.push({ from: 'artem', text: 'К тебе опять приходил кто-то в шлеме? Мне тоже. Я уже не удивляюсь.' });
      return log.concat(base).slice(-8);
    }
    if (contactId === 'mom') {
      return [{ from: 'mom', text: 'Сынок, ты поел? Не сиди до ночи с этими коробками.' }, { from: 'me', text: 'Мам, у меня смена. Всё хорошо.' }];
    }
    return [{ from: 'support', text: 'Здравствуйте! По вопросам поставок, возвратов и рейтинга — пишите сюда.' }, { from: 'support', text: 'Совет дня: отвечайте на плохие отзывы в приложении «Отзывы».' }];
  }
  function drawChat(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'переписка и контакты');
    var R = apps.chatRects(win);
    var d = PVZ.state.data || {};
    var withId = (env.laptop && env.laptop.chatWith) || 'artem';
    art.fillRR(ctx, R.left.x, R.left.y, R.left.w, R.left.h, 12, 'rgba(255,255,255,0.035)');
    art.txt(ctx, 'КОНТАКТЫ', R.left.x + 12, R.left.y + 18, 9, 'rgba(200,235,225,0.5)', 800);
    CHAT_CONTACTS.forEach(function (c, i) {
      var r = R.rows[i], on = c.id === withId;
      toneCard(ctx, r, on ? 'rgba(91,127,208,0.22)' : 'rgba(255,255,255,0.03)', on ? 'rgba(120,170,240,0.6)' : 'rgba(255,255,255,0.07)');
      art.fillRR(ctx, r.x + 6, r.y + 5, 32, 32, 16, c.color);
      art.txt(ctx, c.name[0], r.x + 22, r.y + 27, 14, '#fff', 900, 'center');
      art.txt(ctx, c.name, r.x + 46, r.y + 18, 11.5, '#eafff8', 700);
      art.txt(ctx, c.note, r.x + 46, r.y + 32, 8.5, 'rgba(200,235,225,0.45)', 600);
      if (c.id === 'artem') art.txt(ctx, '●', r.x + r.w - 14, r.y + 18, 9, '#6fdc9a', 700);
    });
    var right = R.right;
    toneCard(ctx, right, 'rgba(8,18,28,0.5)', 'rgba(120,170,240,0.16)');
    var cur = CHAT_CONTACTS.filter(function (c) { return c.id === withId; })[0] || CHAT_CONTACTS[0];
    art.fillRR(ctx, right.x, right.y, right.w, 44, 12, 'rgba(30,50,74,0.6)');
    art.fillRR(ctx, right.x + 10, right.y + 8, 28, 28, 14, cur.color);
    art.txt(ctx, cur.name[0], right.x + 24, right.y + 28, 12, '#fff', 900, 'center');
    art.txt(ctx, cur.name, right.x + 46, right.y + 21, 13, '#eafff8', 800);
    art.txt(ctx, 'в сети · ' + cur.note, right.x + 46, right.y + 35, 8.5, 'rgba(160,220,200,0.55)', 600);
    var msgs = chatThread(withId);
    var my = 0;
    var startY = right.y + 56;
    var space = right.h - 56 - 52;
    var show = msgs.slice(-6);
    var heights = show.map(function (m) {
      var lines = U.wrapLines(ctx, m.text, right.w - 100, 11, 600);
      return Math.max(34, 22 + lines.length * 15);
    });
    var totalH = heights.reduce(function (a, b2) { return a + b2 + 8; }, 0);
    var yy = startY + Math.max(0, space - totalH);
    show.forEach(function (m, i) {
      var mine = m.from === 'me';
      var lines = U.wrapLines(ctx, m.text, right.w - 100, 11, 600);
      var bh = heights[i];
      var bw = Math.min(right.w - 70, Math.max(92, lines.reduce(function (mx, l) { return Math.max(mx, art.txtW(ctx, l, 11, 600)); }, 0) + 26));
      var bx = mine ? right.x + right.w - bw - 14 : right.x + 48;
      art.fillRR(ctx, bx, yy, bw, bh, 10, mine ? 'rgba(74,134,184,0.85)' : 'rgba(255,255,255,0.09)');
      lines.slice(0, 4).forEach(function (line, li) {
        art.txt(ctx, line, bx + 12, yy + 18 + li * 15, 11, mine ? '#f2fbff' : '#e6f3ee', 600);
      });
      if (!mine) {
        art.fillRR(ctx, right.x + 12, yy + 4, 28, 28, 14, cur.color);
        art.txt(ctx, cur.name[0], right.x + 26, yy + 23, 11, '#fff', 900, 'center');
      }
      yy += bh + 8;
    });
    // поле быстрых ответов
    R.quick.forEach(function (q) {
      var hov = U.hit(q, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, q.x, q.y, q.w, q.h, 9, hov ? 'rgba(91,127,208,0.9)' : 'rgba(91,127,208,0.35)');
      art.txt(ctx, q.text, q.x + q.w / 2, q.y + 20, 11, hov ? '#fff' : '#dce9ff', 700, 'center');
    });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- радио ---------------- */
  apps.radioStationRect = function (win, i) {
    var b = screenBox(win);
    return { x: b.x, y: b.y + 26 + i * 34, w: 352, h: 30 };
  };
  apps.radioRects = function (win) {
    var b = screenBox(win);
    var panel = { x: b.x + 368, y: b.y, w: b.w - 368, h: b.h };
    var cy = panel.y + panel.h - 96;
    return {
      list: apps.RADIO.map(function (s, i) { return apps.radioStationRect(win, i); }),
      panel: panel,
      prev: { x: panel.x + 56, y: cy, w: 56, h: 50 },
      play: { x: panel.x + 122, y: cy, w: 92, h: 50 },
      next: { x: panel.x + 224, y: cy, w: 56, h: 50 },
      vol: { x: panel.x + 18, y: panel.y + panel.h - 28, w: panel.w - 36, h: 18 }
    };
  };
  function drawRadio(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'меню эфиров');
    var d = PVZ.state.data || {};
    var cur = (d.radioStation == null ? 2 : d.radioStation) % apps.RADIO.length;
    var R = apps.radioRects(win);
    art.txt(ctx, 'СТАНЦИИ', b.x, b.y + 16, 9.5, 'rgba(200,240,230,0.5)', 800);
    apps.RADIO.forEach(function (s, i) {
      var r = R.list[i], on = i === cur;
      toneCard(ctx, r, on ? 'rgba(176,90,138,0.22)' : 'rgba(255,255,255,0.035)', on ? 'rgba(240,150,200,0.55)' : 'rgba(255,255,255,0.07)');
      art.fillRR(ctx, r.x + 7, r.y + 6, 18, 18, 9, s.color);
      art.txt(ctx, i === 0 ? '∅' : '♪', r.x + 16, r.y + 20, 10, '#fff', 800, 'center');
      art.txt(ctx, s.name, r.x + 34, r.y + 20, 11.5, on ? '#fff3e2' : '#dff6ee', on ? 800 : 600);
      art.txt(ctx, s.desc, r.x + r.w - 10, r.y + 20, 8.5, 'rgba(200,235,225,0.4)', 600, 'right');
      if (on) art.txt(ctx, '●', r.x + r.w - 10, r.y + 11, 8, '#ff8fbf', 700, 'right');
    });
    var p = R.panel;
    var g = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
    g.addColorStop(0, 'rgba(120,50,90,0.45)'); g.addColorStop(1, 'rgba(30,20,40,0.5)');
    art.fillRR(ctx, p.x, p.y, p.w, p.h, 14, g);
    art.strokeRR(ctx, p.x, p.y, p.w, p.h, 14, 'rgba(240,150,200,0.25)', 1.2);
    // обложка с эквалайзером
    var artR = { x: p.x + 20, y: p.y + 20, w: 130, h: 130 };
    art.fillRR(ctx, artR.x, artR.y, artR.w, artR.h, 10, 'rgba(20,12,24,0.8)');
    var t = env.t || 0;
    for (var i = 0; i < 7; i++) {
      var hh = 22 + Math.abs(Math.sin(t * 2.4 + i * 0.9)) * 62;
      art.fillRR(ctx, artR.x + 14 + i * 15, artR.y + artR.h - 16 - hh, 9, hh, 4, apps.RADIO[cur].color);
    }
    art.txt(ctx, '♪', artR.x + artR.w - 18, artR.y + 24, 18, 'rgba(255,255,255,0.5)', 800, 'center');
    art.txt(ctx, 'СЕЙЧАС В ЭФИРЕ', p.x + 170, p.y + 34, 9, 'rgba(255,220,240,0.55)', 800);
    var stn = apps.RADIO[cur];
    art.txt(ctx, stn.name, p.x + 170, p.y + 68, 24, '#fff3e2', 800);
    art.txt(ctx, stn.track < 0 ? 'фон выключен' : stn.desc, p.x + 170, p.y + 90, 11, 'rgba(255,220,240,0.55)', 600);
    if (stn.track >= 0) {
      var track = PVZ.music.TRACKS && PVZ.music.TRACKS[stn.track];
      if (track) art.txt(ctx, 'темп ' + track.bpm + ' bpm · ' + track.id, p.x + 170, p.y + 112, 10, 'rgba(255,220,240,0.4)', 600);
    }
    // кнопки
    var btn = function (r, label, primary) {
      var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 10, primary ? (hov ? '#ffd2e6' : 'rgba(224,120,170,0.9)') : hov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)');
      art.txt(ctx, label, r.x + r.w / 2, r.y + 32, primary ? 15 : 16, primary ? '#2a1020' : '#fff3e2', 800, 'center');
    };
    btn(R.prev, '◀', false);
    btn(R.play, stn.track < 0 ? 'Тишина' : 'Пауза', true);
    btn(R.next, '▶', false);
    // громкость
    art.txt(ctx, 'ГРОМКОСТЬ', R.vol.x, R.vol.y - 4, 8.5, 'rgba(255,220,240,0.5)', 800);
    var vol = d.radioVolume == null ? 1 : d.radioVolume;
    for (var vi = 0; vi < 10; vi++) {
      var vr = { x: R.vol.x + vi * (R.vol.w / 10), y: R.vol.y + 4, w: R.vol.w / 10 - 4, h: 10 };
      var on = (vi + 1) / 10 <= vol + 0.001;
      art.fillRR(ctx, vr.x, vr.y, vr.w, vr.h, 3, on ? 'rgba(240,150,200,0.9)' : 'rgba(255,255,255,0.1)');
    }
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- котокамера ---------------- */
  function drawCatCam(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'наблюдение за котом');
    var d = PVZ.state.data || {};
    var cat = d.cat;
    var feed = { x: b.x, y: b.y, w: b.w * 0.64 - 6, h: b.h };
    var right = { x: b.x + b.w * 0.64 + 8, y: b.y, w: b.w * 0.36 - 8, h: b.h };
    var g = ctx.createLinearGradient(feed.x, feed.y, feed.x, feed.y + feed.h);
    g.addColorStop(0, '#231e18'); g.addColorStop(1, '#0e0c0a');
    art.fillRR(ctx, feed.x, feed.y, feed.w, feed.h, 12, g);
    ctx.save();
    art.rr(ctx, feed.x, feed.y, feed.w, feed.h, 12); ctx.clip();
    // пол и лежанка
    ctx.fillStyle = 'rgba(150,120,80,0.12)'; ctx.fillRect(feed.x, feed.y + feed.h * 0.55, feed.w, feed.h * 0.45);
    if (cat) {
      art.drawCatCushion(ctx, feed.x + feed.w / 2, feed.y + feed.h - 48, 190);
      var anim = (env.laptop && env.laptop.catHappyUntil && Date.now() < env.laptop.catHappyUntil) ? 'happy' : (env.st ? (env.st.catAnim && env.st.catAnim.anim) : 'sit');
      art.drawDeskCat(ctx, feed.x + feed.w / 2, feed.y + feed.h - 48, 200, env.t || 0, anim, cat);
    } else {
      art.txt(ctx, '🐾', feed.x + feed.w / 2, feed.y + feed.h / 2 + 18, 60, 'rgba(255,240,220,0.12)', 700, 'center');
      art.txt(ctx, 'Лежанка пуста', feed.x + feed.w / 2, feed.y + feed.h / 2 + 66, 15, 'rgba(255,240,220,0.35)', 700, 'center');
    }
    // видоискатель
    art.txt(ctx, '● REC', feed.x + 16, feed.y + 24, 10, '#ff6a5a', 800);
    art.txt(ctx, 'КОТОКАМЕРА · 01', feed.x + 78, feed.y + 24, 9, 'rgba(255,240,220,0.5)', 700);
    art.txt(ctx, U.fmtTime(env.st ? env.st.clock : 8 * 60) + ' · ДЕНЬ ' + (d.day || 1), feed.x + feed.w - 16, feed.y + 24, 9, 'rgba(255,240,220,0.5)', 700, 'right');
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (var sy = feed.y + 40; sy < feed.y + feed.h; sy += 6) { ctx.beginPath(); ctx.moveTo(feed.x, sy); ctx.lineTo(feed.x + feed.w, sy); ctx.stroke(); }
    ctx.restore();
    art.strokeRR(ctx, feed.x, feed.y, feed.w, feed.h, 12, 'rgba(255,240,220,0.14)', 1.2);

    art.txt(ctx, 'ПИТОМЕЦ', right.x + 6, right.y + 18, 9.5, 'rgba(200,240,230,0.55)', 800);
    if (cat) {
      art.txt(ctx, cat.name, right.x + 6, right.y + 50, 24, '#fff3e2', 800);
      var furName = { ginger: 'рыжий', gray: 'серый', black: 'чёрный', white: 'белый', siam: 'сиамский', tuxedo: 'смокинг', calico: 'трёхцветный', blue: 'голубой' }[cat.fur] || 'домашний';
      art.txt(ctx, furName + ' · ' + (cat.kind || 'кот'), right.x + 6, right.y + 68, 10.5, 'rgba(200,235,225,0.5)', 600);
      toneCard(ctx, { x: right.x, y: right.y + 84, w: right.w, h: 76 }, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)');
      art.txt(ctx, 'ПОГЛАЖИВАНИЙ', right.x + 12, right.y + 104, 8.5, 'rgba(200,235,225,0.45)', 800);
      art.txt(ctx, String(d.eggPets || 0), right.x + 12, right.y + 134, 26, '#ffd479', 800);
      art.txt(ctx, 'настроение: ' + ((d.eggPets || 0) > 10 ? 'отличное' : 'спокойное'), right.x + 96, right.y + 126, 10, 'rgba(200,235,225,0.55)', 600);
      var pet = { x: right.x, y: right.y + 174, w: right.w, h: 42 };
      var hov = U.hit(pet, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, pet.x, pet.y, pet.w, pet.h, 10, hov ? '#ffb0c8' : 'rgba(224,120,150,0.5)');
      art.txt(ctx, 'Погладить', pet.x + pet.w / 2, pet.y + 27, 13, hov ? '#2a1018' : '#fff3e2', 800, 'center');
      art.txt(ctx, 'Кот повышает терпение покупателей и чаевые.', right.x, right.y + 244, 9.5, 'rgba(200,235,225,0.45)', 600);
      art.txt(ctx, (d.eggPets || 0) > 10 ? '«Мррр. Продолжай.»' : '«Мур.»', right.x, right.y + 264, 10, 'rgba(255,220,190,0.6)', 600);
    } else {
      art.txt(ctx, 'Кота ещё нет', right.x + 6, right.y + 52, 18, 'rgba(255,240,220,0.5)', 700);
      art.txt(ctx, 'Приютите кота из истории', right.x + 6, right.y + 76, 10.5, 'rgba(255,240,220,0.4)', 600);
      art.txt(ctx, 'покупателя — и камера', right.x + 6, right.y + 92, 10.5, 'rgba(255,240,220,0.4)', 600);
      art.txt(ctx, 'оживёт.', right.x + 6, right.y + 108, 10.5, 'rgba(255,240,220,0.4)', 600);
    }
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }
  apps.catPetRect = function (win) {
    var b = screenBox(win), right = { x: b.x + b.w * 0.64 + 8, y: b.y, w: b.w * 0.36 - 8, h: b.h };
    return { x: right.x, y: right.y + 174, w: right.w, h: 42 };
  };

  /* ---------------- антивирус ---------------- */
  apps.avRects = function (win) {
    var b = screenBox(win);
    return {
      scan: { x: b.x + b.w - 250, y: b.y + b.h - 54, w: 236, h: 42 },
      del: { x: b.x + b.w - 250, y: b.y + b.h - 104, w: 236, h: 42 },
      radar: { x: b.x + 150, y: b.y + 140, r: 100 }
    };
  };
  function drawAntivirus(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'проверка ноутбука');
    var d = PVZ.state.data || {};
    var hasBanana = PVZ.state.hasApp('banana');
    var found = d.banana && d.banana.avFound;
    var R = apps.avRects(win);
    var cx = R.radar.x, cy = R.radar.y;
    // радар
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R.radar.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,80,100,0.18)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,220,0.25)'; ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach(function (k) { ctx.beginPath(); ctx.arc(cx, cy, R.radar.r * k, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - R.radar.r, cy); ctx.lineTo(cx + R.radar.r, cy); ctx.moveTo(cx, cy - R.radar.r); ctx.lineTo(cx, cy + R.radar.r); ctx.stroke();
    var ang = ((env.t || 0) * 1.7) % (Math.PI * 2);
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R.radar.r);
    grad.addColorStop(0, 'rgba(120,240,190,0.38)'); grad.addColorStop(1, 'rgba(120,240,190,0)');
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R.radar.r, ang, ang + 0.9); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
    art.txt(ctx, hasBanana ? '⚠' : '✓', cx, cy + 18, hasBanana ? 48 : 54, hasBanana ? '#ff9d7a' : '#8fe0a8', 800, 'center');
    art.txt(ctx, hasBanana ? 'ОБНАРУЖЕНА УГРОЗА' : 'УГРОЗ НЕ НАЙДЕНО', b.x + 286, b.y + 52, 16, hasBanana ? '#ff9d7a' : '#9fe0b0', 800);
    var lines = hasBanana ? [
      'PUA.Banana.Store — магазин запрещённых товаров.',
      found ? 'Статус: карантин. Можно удалить приложение.' : 'Приложение прячется в автозапуске.',
      'Рекомендуется удалить и сменить пароли.'
    ] : [
      'Базы обновлены сегодня.',
      'Последняя проверка: ' + (d.antivirusAt ? 'день ' + d.antivirusAt : 'не проводилась') + '.',
      'Ноутбук работает штатно.'
    ];
    lines.forEach(function (line, i) {
      art.txt(ctx, '• ' + line, b.x + 286, b.y + 82 + i * 22, 11, hasBanana ? 'rgba(255,200,180,0.8)' : 'rgba(190,235,220,0.7)', 600);
    });
    // список файлов
    var files = ['terminal_pvz.exe', 'market.pvz', 'reviews.pvz', 'photo/3021.jpg', 'temp/supply.csv'];
    art.txt(ctx, 'ПРОВЕРЕННЫЕ ОБЪЕКТЫ', b.x + 22, b.y + 268, 9, 'rgba(190,235,220,0.45)', 800);
    files.forEach(function (f, i) {
      var x = b.x + 22 + (i % 2) * 280, y = b.y + 286 + Math.floor(i / 2) * 18;
      art.txt(ctx, '✓ ' + f, x, y, 9.5, 'rgba(160,230,200,0.55)', 600);
    });
    // кнопки
    var scanHov = U.hit(R.scan, PVZ.input.x, PVZ.input.y);
    art.button(ctx, R.scan, 'Проверить ноутбук', { hover: scanHov, size: 13, bg: 'rgba(63,127,174,0.9)', hoverBg: '#7fc0f0', hoverFg: '#0d2233' });
    if (hasBanana) {
      var delHov = U.hit(R.del, PVZ.input.x, PVZ.input.y);
      art.button(ctx, R.del, 'Удалить Banana store', { hover: delHov, size: 13, bg: 'rgba(180,60,40,0.9)', hoverBg: '#e4572e', fg: '#fff1e6' });
      art.txt(ctx, 'Удаление закроет доступ к чёрному рынку навсегда.', R.del.x - 10, R.del.y + 52, 9, 'rgba(255,190,165,0.6)', 600, 'right');
    }
    if (d.banana && d.banana.removedDay) art.txt(ctx, 'Banana store удалён в день ' + d.banana.removedDay + '.', b.x + 286, b.y + 156, 10, 'rgba(160,230,200,0.55)', 600);
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- такси ---------------- */
  apps.taxiRects = function (win) {
    var b = screenBox(win);
    return { call: { x: b.x + b.w - 240, y: b.y + b.h - 56, w: 226, h: 44 } };
  };
  function drawTaxi(ctx, app, win, env) {
    var b = screenShell(ctx, app, win, 'машина до дома');
    var d = PVZ.state.data || {};
    var R = apps.taxiRects(win);
    var g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    g.addColorStop(0, '#1a2230'); g.addColorStop(1, '#0e131b');
    art.fillRR(ctx, b.x, b.y, b.w, b.h, 14, g);
    ctx.save(); art.rr(ctx, b.x, b.y, b.w, b.h, 14); ctx.clip();
    // дорога
    ctx.fillStyle = 'rgba(70,80,95,0.5)';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + 180); ctx.lineTo(b.x + b.w * 0.42, b.y + 120); ctx.lineTo(b.x + b.w * 0.58, b.y + 240); ctx.lineTo(b.x + b.w, b.y + 200);
    ctx.lineTo(b.x + b.w, b.y + 270); ctx.lineTo(b.x + b.w * 0.55, b.y + 300); ctx.lineTo(b.x + b.w * 0.38, b.y + 180); ctx.lineTo(b.x, b.y + 240);
    ctx.closePath(); ctx.fill();
    ctx.setLineDash([12, 14]); ctx.strokeStyle = 'rgba(255,220,150,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + 210); ctx.lineTo(b.x + b.w * 0.42, b.y + 148); ctx.lineTo(b.x + b.w * 0.58, b.y + 268); ctx.lineTo(b.x + b.w, b.y + 234); ctx.stroke();
    ctx.setLineDash([]);
    // дом и ПВЗ
    art.fillRR(ctx, b.x + 40, b.y + 70, 150, 90, 8, 'rgba(90,168,119,0.25)');
    art.txt(ctx, 'ПВЗ', b.x + 115, b.y + 122, 20, 'rgba(160,240,200,0.8)', 800, 'center');
    art.fillRR(ctx, b.x + b.w - 200, b.y + 78, 150, 90, 8, 'rgba(120,160,220,0.22)');
    art.txt(ctx, 'ДОМ', b.x + b.w - 125, b.y + 66, 15, 'rgba(190,220,255,0.85)', 800, 'center');
    // машина
    var started = !!d.taxiAt;
    var elapsed = started ? (Date.now() - d.taxiAt) / 1000 : 0;
    var prog = started ? Math.min(1, elapsed / 25) : 0;
    var carX = b.x + b.w - 125 + (b.x + 115 - (b.x + b.w - 125)) * prog;
    var carY = b.y + 130 + Math.sin(prog * Math.PI) * 70;
    ctx.save();
    ctx.translate(carX, carY);
    art.fillRR(ctx, -30, -16, 60, 26, 8, '#ffd479');
    art.fillRR(ctx, -18, -27, 36, 14, 6, 'rgba(180,220,255,0.7)');
    ctx.beginPath(); ctx.arc(-16, 12, 7, 0, Math.PI * 2); ctx.arc(16, 12, 7, 0, Math.PI * 2); ctx.fillStyle = '#1a1a1a'; ctx.fill();
    ctx.restore();
    ctx.restore();
    var eta = started ? Math.max(0, 25 - Math.floor(elapsed)) : 0;
    art.txt(ctx, started ? (eta > 0 ? 'МАШИНА В ПУТИ' : 'МАШИНА У ВХОДА') : 'МАШИНА У ВХОДА ЧЕРЕЗ 5 МИНУТ',
      b.x + 18, b.y + b.h - 78, 10, started ? '#ffd479' : 'rgba(200,220,240,0.5)', 800);
    art.txt(ctx, 'Такси «Городок» · 240 ₽ (не из кассы)', b.x + 18, b.y + b.h - 58, 10.5, 'rgba(200,220,240,0.55)', 600);
    art.txt(ctx, started ? 'Ожидание: ' + eta + ' мин' : 'Поездка домой — 25 минут', b.x + 18, b.y + b.h - 38, 11, '#e6f0ff', 700);
    var hov = U.hit(R.call, PVZ.input.x, PVZ.input.y);
    art.button(ctx, R.call, started ? 'Отменить машину' : 'Вызвать машину', { hover: hov, size: 13, bg: started ? 'rgba(228,87,46,0.85)' : 'rgba(196,155,42,0.9)', hoverBg: started ? '#ff8a5c' : '#ffd479', hoverFg: '#2a1a10' });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 10, 'rgba(200,235,225,0.4)', 600, 'center');
  }

  /* ---------------- диспетчер экранов ---------------- */
  apps.drawScreen = function (ctx, app, win, env) {
    if (!app) return;
    switch (app.id) {
      case 'notes': drawNotes(ctx, app, win, env); return;
      case 'weather': drawWeather(ctx, app, win, env); return;
      case 'schedule': drawSchedule(ctx, app, win, env); return;
      case 'bank': drawBank(ctx, app, win, env); return;
      case 'debt': drawDebt(ctx, app, win, env); return;
      case 'crm': drawCRM(ctx, app, win, env); return;
      case 'cctv': drawCCTV(ctx, app, win, env); return;
      case 'map': drawMap(ctx, app, win, env); return;
      case 'chat': drawChat(ctx, app, win, env); return;
      case 'radio': drawRadio(ctx, app, win, env); return;
      case 'catcam': drawCatCam(ctx, app, win, env); return;
      case 'antivirus': drawAntivirus(ctx, app, win, env); return;
      case 'taxi': drawTaxi(ctx, app, win, env); return;
      default: apps.drawGeneric(ctx, app, win, env); return;
    }
  };

  /* Тапы по нарисованным экранам. Возвращает true, если клик обработан. */
  apps.tapScreen = function (id, win, x, y, env) {
    var L = env && env.laptop;
    if (id === 'radio') {
      var R = apps.radioRects(win);
      for (var i = 0; i < R.list.length; i++) {
        if (U.hit(R.list[i], x, y)) { apps.applyRadio(i); PVZ.audio.ui(); return true; }
      }
      var d = PVZ.state.data || {};
      var cur = d.radioStation == null ? 2 : d.radioStation;
      if (U.hit(R.play, x, y)) {
        // пауза возможна только в эфир; повторный тап возвращает последнюю станцию
        if (apps.RADIO[cur].track < 0) apps.applyRadio(cur === 0 ? 2 : cur);
        else apps.applyRadio(0);
        PVZ.audio.ui(); return true;
      }
      if (U.hit(R.prev, x, y)) { apps.applyRadio((cur + apps.RADIO.length - 1) % apps.RADIO.length); PVZ.audio.ui(); return true; }
      if (U.hit(R.next, x, y)) { apps.applyRadio((cur + 1) % apps.RADIO.length); PVZ.audio.ui(); return true; }
      if (U.hit(R.vol, x, y)) {
        apps.radioVolume(U.clamp((x - R.vol.x) / R.vol.w, 0, 1)); PVZ.audio.ui(); return true;
      }
      return true;
    }
    if (id === 'crm') {
      var rows = apps.crmRects(win);
      for (var r = 0; r < rows.length; r++) if (U.hit(rows[r], x, y)) { L.crmSel = r; PVZ.audio.ui(); return true; }
      return false;
    }
    if (id === 'cctv') {
      var cams = apps.cctvRects(win);
      for (var c = 0; c < cams.length; c++) if (U.hit(cams[c], x, y)) { L.cctvCam = c; PVZ.audio.ui(); return true; }
      return false;
    }
    if (id === 'chat') {
      var CR = apps.chatRects(win);
      for (var ci = 0; ci < CR.rows.length; ci++) {
        if (U.hit(CR.rows[ci], x, y)) { L.chatWith = CR.rows[ci].id; PVZ.audio.ui(); return true; }
      }
      for (var q = 0; q < CR.quick.length; q++) {
        if (U.hit(CR.quick[q], x, y)) {
          var text = CR.quick[q].text;
          var withId = (L && L.chatWith) || 'artem';
          PVZ.state.chatAdd('me', text, withId);
          var replies = {
            'Привет!': 'Привет-привет! Как смена?',
            'Как дела?': 'Да как обычно: коробки, кофе, коробки. А у тебя?',
            'Держись.': 'Стараюсь. Ты тоже держись, слышишь?'
          };
          if (withId === 'artem') {
            PVZ.state.chatAdd('artem', replies[text] || 'Ага!', 'artem');
          } else if (withId === 'mom') {
            PVZ.state.chatAdd('mom', 'Спасибо, сынок. Ты только поешь вовремя.', 'mom');
          } else {
            PVZ.state.chatAdd('support', 'Ваш запрос принят. Оператор ответит в течение смены.', 'support');
          }
          PVZ.state.save();
          PVZ.audio.ui();
          return true;
        }
      }
      return false;
    }
    if (id === 'catcam') {
      var pet = apps.catPetRect(win);
      if (U.hit(pet, x, y) && PVZ.state.data && PVZ.state.data.cat) {
        PVZ.state.data.eggPets = (PVZ.state.data.eggPets || 0) + 1;
        if (L) L.catHappyUntil = Date.now() + 2500;
        PVZ.state.addRating(0.005);
        PVZ.state.save();
        PVZ.audio.ok();
        return true;
      }
      return false;
    }
    if (id === 'antivirus') {
      var AR = apps.avRects(win);
      if (PVZ.state.hasApp('banana') && U.hit(AR.del, x, y)) {
        PVZ.state.data.apps = (PVZ.state.data.apps || []).filter(function (a) { return a !== 'banana'; });
        var b = PVZ.state.banana();
        b.avFound = false;
        b.removedDay = PVZ.state.data.day || 1;
        b.heat = Math.max(0, b.heat - 30);
        PVZ.state.save();
        PVZ.audio.ok();
        return true;
      }
      if (U.hit(AR.scan, x, y)) {
        PVZ.state.data.antivirusAt = (PVZ.state.data.day || 1);
        if (PVZ.state.hasApp('banana')) { PVZ.state.banana().avFound = true; PVZ.audio.bad(); }
        else PVZ.audio.scanOk();
        PVZ.state.save();
        return true;
      }
      return false;
    }
    if (id === 'taxi') {
      var TR = apps.taxiRects(win);
      if (U.hit(TR.call, x, y)) {
        if (PVZ.state.data.taxiAt) PVZ.state.data.taxiAt = 0;
        else PVZ.state.data.taxiAt = Date.now();
        PVZ.audio.ok();
        return true;
      }
      return false;
    }
    return false;
  };


  /* =========================================================
     PREMIUM STORE — витрина доната (ноутбук → Premium)
     Три полки: наборы (лучшая цена), товары навсегда и паки монет.
     Платить можно монетами (реклама) или рублями через PVZ.pay.
     По умолчанию платёж демонстрационный: деньги не списываются.
     ========================================================= */
  apps.PREMIUM_TABS = [
    { id: 'bundles', label: 'Наборы' },
    { id: 'items', label: 'Товары' },
    { id: 'coins', label: 'Монеты' }
  ];

  /* Витрина. rub — цена, oldRub — «зачёркнутая» цена по частям,
     coins — цена в монетах, grants — что открывает покупка.
     repeat — товар можно брать снова (подписка), hidden — не в витрине. */
  apps.PREMIUM_ITEMS = [
    /* ---- наборы: главная витрина ---- */
    {
      id: 'starter', tab: 'bundles', kind: 'bundle',
      name: 'Стартовый набор', glyph: '🎁', color: '#e4572e',
      rub: 249, oldRub: 1595, badge: 'ХИТ', badgeColor: '#e4572e', featured: true, once: true,
      grants: ['adFree', 'catSkins', 'appPack'], coinBonus: 400,
      desc: 'Без рекламы, скины кота, пак приложений и 400 монет. Дешевле, чем по отдельности.'
    },
    {
      id: 'plus30', tab: 'bundles', kind: 'sub',
      name: 'ПВЗ Плюс · 30 дней', glyph: '✦', color: '#c9a227',
      rub: 299, oldRub: 599, badge: '−50%', badgeColor: '#c9a227', repeat: true,
      plusDays: 30, coinBonus: 150,
      desc: '−20% на товары за монеты, ×2 монеты за рекламу и подарок 15 монет каждый день.'
    },
    {
      id: 'pro', tab: 'bundles', kind: 'bundle',
      name: 'Набор «Профи»', glyph: '👑', color: '#7a5cc0',
      rub: 799, oldRub: 2984, badge: 'ЛУЧШАЯ ЦЕНА', badgeColor: '#3f9c6a', featured: true, once: true,
      grants: ['adFree', 'catSkins', 'appPack'], coinBonus: 1200, plusDays: 30,
      desc: 'Всё из стартового набора, 1 200 монет и месяц ПВЗ Плюса в подарок.'
    },
    {
      id: 'mega', tab: 'bundles', kind: 'bundle',
      name: 'Всё навсегда', glyph: '💎', color: '#3f9c6a',
      rub: 1990, oldRub: 7637, badge: '−74%', badgeColor: '#9b59b6', once: true,
      grants: ['adFree', 'catSkins', 'appPack'], coinBonus: 5000, plusForever: true,
      desc: 'Все товары, ПВЗ Плюс навсегда и 5 000 монет. Самое выгодное предложение.'
    },

    /* ---- товары навсегда ---- */
    {
      id: 'adFree', tab: 'items', kind: 'item',
      name: 'Без рекламы', glyph: '✕', color: '#e4572e',
      rub: 149, oldRub: 299, coins: 135, once: true, badge: '−50%', badgeColor: '#c9a227',
      desc: 'Ролик не показывается: бонусные монеты выдаются сразу, одной кнопкой.'
    },
    {
      id: 'catSkins', tab: 'items', kind: 'item',
      name: 'Пак скинов на кота', glyph: '🐈', color: '#d08b57',
      rub: 199, oldRub: 399, coins: 180, once: true, badge: '−50%', badgeColor: '#c9a227',
      desc: 'Четыре окраса: сиамский, смокинг, трёхцветный и голубой.'
    },
    {
      id: 'appPack', tab: 'items', kind: 'item',
      name: 'Пак приложений', glyph: '▦', color: '#2fb894',
      rub: 249, oldRub: 499, coins: 225, once: true, badge: '−50%', badgeColor: '#c9a227',
      desc: 'Сразу ставит все приложения App Market на ноутбук.'
    },
    {
      id: 'plus7', tab: 'items', kind: 'sub',
      name: 'Плюс на 7 дней', glyph: '✦', color: '#c9a227',
      coins: 300, repeat: true, plusDays: 7,
      desc: 'Пробный ПВЗ Плюс за монеты: те же −20%, ×2 за рекламу и подарок.'
    },
    /* отладочный доступ: в витрине не показывается, живёт для DEV-режима */
    {
      id: 'dev', tab: 'items', kind: 'item', hidden: true,
      name: 'DEV-доступ', glyph: '⚙', color: '#c9a227',
      rub: 0, coins: 0, once: true, free: true,
      desc: 'Отладочный доступ. В витрине не продаётся.'
    },

    /* ---- монеты ---- */
    {
      id: 'coins100', tab: 'coins', kind: 'coins',
      name: '100 монет', glyph: '🪙', color: '#c9a227',
      rub: 99, coins: 100,
      desc: 'Стартовый пак: хватит на пару мелких покупок.'
    },
    {
      id: 'coins550', tab: 'coins', kind: 'coins',
      name: '550 монет', glyph: '🪙', color: '#d9b24a',
      rub: 449, coins: 550, bonus: '+21%',
      desc: 'Оптимальный пак: скидка на каждую монету.'
    },
    {
      id: 'coins1500', tab: 'coins', kind: 'coins',
      name: '1 500 монет', glyph: '🪙', color: '#e0c063',
      rub: 999, coins: 1500, bonus: '+49%', badge: 'ВЫГОДНО', badgeColor: '#3f9c6a',
      desc: 'Хватит на весь пак скинов и ещё останется.'
    },
    {
      id: 'coins4000', tab: 'coins', kind: 'coins',
      name: '4 000 монет', glyph: '🪙', color: '#ffd479',
      rub: 1990, coins: 4000, bonus: '+100%', badge: 'ЛУЧШАЯ ЦЕНА', badgeColor: '#e4572e', featured: true,
      desc: 'Максимальная выгода: каждая монета вдвое дешевле.'
    }
  ];

  apps.premiumItem = function (id) {
    for (var i = 0; i < apps.PREMIUM_ITEMS.length; i++) if (apps.PREMIUM_ITEMS[i].id === id) return apps.PREMIUM_ITEMS[i];
    return null;
  };

  apps.premiumTab = function (id) {
    for (var i = 0; i < apps.PREMIUM_TABS.length; i++) if (apps.PREMIUM_TABS[i].id === id) return id;
    return 'bundles';
  };

  apps.premiumTabItems = function (tab) {
    var t = apps.premiumTab(tab);
    return apps.PREMIUM_ITEMS.filter(function (it) { return it.tab === t && !it.hidden; });
  };

  /* Скидка подписки «ПВЗ Плюс» на цены в монетах: −20% */
  apps.premiumDiscount = function () { return PVZ.state.premiumHasPlus() ? 0.8 : 1; };

  apps.premiumCoins = function (it) {
    if (!it || !it.coins) return 0;
    return Math.max(1, Math.round(it.coins * apps.premiumDiscount()));
  };

  apps.premiumSaved = function (it) {
    if (!it || !it.oldRub || !it.rub) return 0;
    return Math.max(0, it.oldRub - it.rub);
  };

  apps.premiumPercent = function (it) {
    if (!it || !it.oldRub || !it.rub || it.oldRub <= it.rub) return 0;
    return Math.round((1 - it.rub / it.oldRub) * 100);
  };

  apps.premiumOwned = function (it) {
    if (!it || it.repeat || it.kind === 'coins') return false;
    return !!(it.id && PVZ.state.premiumHas(it.id));
  };

  apps.premiumToday = function () {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };

  apps.premiumRects = function (win, tabId, ui) {
    var b = screenBox(win);
    var tab = apps.premiumTab(tabId);
    var top = { x: b.x, y: b.y, w: b.w, h: 40 };
    var adBtn = { x: b.x + b.w - 300, y: b.y + 5, w: 142, h: 30 };
    var topBtn = { x: b.x + b.w - 152, y: b.y + 5, w: 142, h: 30 };
    var giftBtn = { x: b.x + 170, y: b.y + 5, w: 168, h: 30 };
    var tabY = b.y + 48, tabH = 24;
    var tabs = apps.PREMIUM_TABS.map(function (tb, i) {
      return { id: tb.id, label: tb.label, rect: { x: b.x + i * 128, y: tabY, w: 120, h: tabH } };
    });
    var plusPill = { x: b.x + b.w - 252, y: b.y + 48, w: 252, h: 24 };
    var gridTop = b.y + 80;
    var gridH = b.y + b.h - gridTop - 16; // 16 px внизу под подпись и «демо-оплата»
    var items = apps.premiumTabItems(tab);
    var gap = 10, cols = 2;
    var rows = Math.max(1, Math.ceil(items.length / cols));
    var cw = (b.w - gap) / cols;
    var ch = (gridH - (rows - 1) * gap) / rows;
    var cards = items.map(function (it, i) {
      var r = {
        x: b.x + (i % cols) * (cw + gap),
        y: gridTop + Math.floor(i / cols) * (ch + gap),
        w: cw, h: ch
      };
      var card = { item: it, rect: r, buttons: [], coinBtn: null, rubBtn: null, buyBtn: null };
      var by = r.y + r.h - 42;
      if (it.kind === 'coins') {
        card.buyBtn = { kind: 'rub', x: r.x + 14, y: by, w: r.w - 28, h: 30 };
        card.buttons.push(card.buyBtn);
        card.rubBtn = card.buyBtn;
        return card;
      }
      var hasCoins = !!it.coins;
      var hasRub = !!(it.rub && it.rub > 0);
      if (hasCoins && hasRub) {
        card.coinBtn = { kind: 'coins', x: r.x + 14, y: by, w: 112, h: 30 };
        card.rubBtn = { kind: 'rub', x: r.x + 136, y: by, w: 112, h: 30 };
        card.buttons.push(card.coinBtn, card.rubBtn);
      } else if (hasRub) {
        card.rubBtn = { kind: 'rub', x: r.x + 14, y: by, w: r.w - 28, h: 30 };
        card.buttons.push(card.rubBtn);
      } else if (hasCoins) {
        card.coinBtn = { kind: 'coins', x: r.x + 14, y: by, w: r.w - 28, h: 30 };
        card.buttons.push(card.coinBtn);
      }
      return card;
    });
    return { box: b, top: top, adBtn: adBtn, topBtn: topBtn, giftBtn: giftBtn, tabs: tabs, tab: tab, cards: cards, plusPill: plusPill };
  };

  apps.premiumModalRects = function (win, ui) {
    var b = screenBox(win);
    var out = {};
    if (ui && ui.modal) {
      var m = { x: b.x + b.w / 2 - 250, y: b.y + 30, w: 500, h: 268 };
      out.panel = m;
      out.ok = { x: m.x + 24, y: m.y + m.h - 58, w: 200, h: 42 };
      out.cancel = { x: m.x + m.w - 224, y: m.y + m.h - 58, w: 200, h: 42 };
      out.close = { x: m.x + m.w - 42, y: m.y + 10, w: 30, h: 30 };
      if (ui.modal.type === 'skins') {
        out.skins = apps.CAT_SKINS.map(function (s, i) {
          return {
            x: m.x + 24 + (i % 4) * 112, y: m.y + 84 + Math.floor(i / 4) * 62,
            w: 104, h: 54, skin: s.id, label: s.name
          };
        });
        out.ok = { x: m.x + m.w / 2 - 90, y: m.y + m.h - 54, w: 180, h: 40 };
      }
    }
    if (ui && ui.ad) {
      out.adBox = { x: b.x + 80, y: b.y + 30, w: b.w - 160, h: b.h - 60 };
    }
    return out;
  };

  apps.CAT_SKINS = [
    { id: 'ginger', name: 'Рыжий' },
    { id: 'gray', name: 'Серый' },
    { id: 'black', name: 'Чёрный' },
    { id: 'white', name: 'Белый' },
    { id: 'siam', name: 'Сиамский' },
    { id: 'tuxedo', name: 'Смокинг' },
    { id: 'calico', name: 'Трёхцветный' },
    { id: 'blue', name: 'Голубой' }
  ];

  apps.premiumNotify = function (ui, text) { if (ui) { ui.msg = text; ui.msgT = 0; } };

  /* Установить все платные и бесплатные приложения App Market без денег */
  apps.installAppPack = function () {
    var added = [];
    apps.CATALOG.forEach(function (a) {
      if (a.builtin || a.hidden) return;
      if (PVZ.state.hasApp(a.id)) return;
      PVZ.state.data.apps.push(a.id);
      added.push(a.short || a.name);
    });
    PVZ.state.save();
    if (added.indexOf('Радио') >= 0 || added.indexOf('Радио ПВЗ') >= 0) apps.applyRadio(PVZ.state.data.radioStation || 0);
    return added;
  };

  /* Выдать покупку: начислить монеты, открыть товары, продлить Плюс */
  apps.premiumGrant = function (id, ui) {
    var it = apps.premiumItem(id);
    if (!it) return 'Товар не найден.';
    var msg = '';
    if (it.kind === 'coins') {
      PVZ.state.premiumCoins(it.coins);
      msg = 'Зачислено ' + it.coins + ' ' + apps.premiumCoinsWord(it.coins) + '. Баланс: ' + PVZ.state.premium().coins + '.';
    } else {
      (it.grants || []).forEach(function (gid) { PVZ.state.premiumMark(gid); });
      if (it.plusDays) PVZ.state.premiumPlus(it.plusDays);
      if (it.plusForever) PVZ.state.premiumPlusForever();
      if (it.coinBonus) PVZ.state.premiumCoins(it.coinBonus);
      if (it.free || !it.repeat) PVZ.state.premiumMark(id);

      if (id === 'appPack' || (it.grants || []).indexOf('appPack') >= 0) {
        var added = apps.installAppPack();
        msg = added.length ? 'Пак установлен: ' + added.length + ' приложений.' : 'Все приложения уже установлены.';
      }
      if (id === 'adFree') msg = 'Реклама отключена: бонусные монеты — сразу, без ролика.';
      if (id === 'dev') msg = 'DEV-доступ активирован.';
      if (id === 'starter') msg = 'Стартовый набор активирован: +' + it.coinBonus + ' монет, скины кота, приложения, без рекламы.';
      if (id === 'plus30') msg = 'ПВЗ Плюс на 30 дней: −20% на монеты, ×2 за рекламу, подарок 15 монет в день.';
      if (id === 'plus7') msg = 'ПВЗ Плюс на 7 дней активирован: −20% на монеты и ×2 за рекламу.';
      if (id === 'pro') msg = '«Профи» активирован: всё из стартового, +' + it.coinBonus + ' монет и 30 дней Плюса.';
      if (id === 'mega') msg = '«Всё навсегда»: все товары, Плюс навсегда и +' + it.coinBonus + ' монет.';
      if (id === 'catSkins') {
        if (ui) ui.modal = { type: 'skins' };
        msg = 'Скины открыты! Выберите окрас кота.';
      }
    }
    PVZ.state.save();
    PVZ.audio.level();
    if (ui) apps.premiumNotify(ui, msg);
    return msg;
  };

  /* Покупка из витрины. currency: 'coins' | 'rub'.
     Для рублей это уже подтверждённый платёж (см. premiumCheckout). */
  apps.premiumBuy = function (id, currency, ui) {
    var it = apps.premiumItem(id);
    if (!it) return { ok: false, msg: 'Товар не найден.' };
    if (!it.repeat && apps.premiumOwned(it)) {
      if (id === 'catSkins') { if (ui) ui.modal = { type: 'skins' }; return { ok: true, msg: 'Выберите окрас кота.' }; }
      return { ok: false, msg: 'Уже куплено.' };
    }
    var p = PVZ.state.premium();
    if (currency === 'coins' && !it.free) {
      var price = apps.premiumCoins(it);
      if (!price) return { ok: false, msg: 'Этот товар нельзя купить за монеты.' };
      if (p.coins < price) return { ok: false, msg: 'Не хватает монет: нужно ' + price + ', есть ' + p.coins + '.' };
      PVZ.state.premiumCoins(-price);
    } else if (currency !== 'coins') {
      p.rubSpent = (p.rubSpent || 0) + (it.rub || 0);
    }
    var msg = apps.premiumGrant(id, ui);
    PVZ.state.save();
    return { ok: true, msg: msg };
  };

  /* Покупка за рубли: сначала платёж (PVZ.pay), потом выдача товара */
  apps.premiumCheckout = function (id, ui) {
    var it = apps.premiumItem(id);
    if (!it) return { ok: false, msg: 'Товар не найден.' };
    if (!PVZ.pay || !PVZ.pay.buy) return apps.premiumBuy(id, 'rub', ui);
    PVZ.pay.buy({ sku: 'premium.' + id, title: it.name, price: it.rub, currency: 'RUB' }, function (res) {
      if (!res || !res.ok) {
        PVZ.audio.bad();
        apps.premiumNotify(ui, (res && (res.error || res.message)) || 'Платёж не прошёл.');
        return;
      }
      var out = apps.premiumBuy(id, 'rub', ui);
      if (!out.ok) { PVZ.audio.bad(); apps.premiumNotify(ui, out.msg); return; }
      if (res.demo) apps.premiumNotify(ui, out.msg + ' (демо-оплата, деньги не списаны)');
      else apps.premiumNotify(ui, out.msg + ' Спасибо за поддержку!');
    });
    return { ok: true, pending: true };
  };

  apps.premiumCoinsWord = function (n) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return 'монет';
    if (b === 1) return 'монета';
    if (b >= 2 && b <= 4) return 'монеты';
    return 'монет';
  };

  /* Бонус за «рекламный ролик»: с Плюсом +1, с «Без рекламы» +1 */
  apps.premiumAdGain = function () {
    var p = PVZ.state.premium();
    if (!p) return 1;
    return 1 + (PVZ.state.premiumHasPlus() ? 1 : 0) + (p.adFree ? 1 : 0);
  };

  /* Без рекламы ролик не смотрят, но кнопка не бесконечная: 6 секунд отката */
  apps.premiumAdCooldown = function () {
    var p = PVZ.state.premium();
    if (!p || !p.adFree) return 0;
    var left = (p.lastAdAt || 0) + 6000 - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  };

  apps.premiumClaimAd = function (ui) {
    var p = PVZ.state.premium();
    if (!p) return;
    if (p.adFree) {
      var wait = apps.premiumAdCooldown();
      if (wait > 0) { apps.premiumNotify(ui, 'Бонус будет через ' + wait + ' с.'); return; }
      var gain = apps.premiumAdGain();
      p.lastAdAt = Date.now();
      PVZ.state.premiumCoins(gain);
      p.adsWatched = (p.adsWatched || 0) + 1;
      PVZ.state.save();
      PVZ.audio.coin();
      apps.premiumNotify(ui, 'Бонус без рекламы: +' + gain + ' ' + apps.premiumCoinsWord(gain) + '.');
      return;
    }
    if (ui) ui.ad = { t: 4.5 };
  };

  /* Ежедневный подарок ПВЗ Плюса */
  apps.premiumClaimDaily = function (ui) {
    var p = PVZ.state.premium();
    if (!p) return { ok: false, msg: '' };
    if (!PVZ.state.premiumHasPlus()) return { ok: false, msg: 'Подарок доступен с ПВЗ Плюсом.' };
    if (p.dailyClaim === apps.premiumToday()) return { ok: false, msg: 'Подарок уже получен сегодня.' };
    p.dailyClaim = apps.premiumToday();
    PVZ.state.premiumCoins(15);
    PVZ.state.save();
    PVZ.audio.coin();
    apps.premiumNotify(ui, 'Подарок ПВЗ Плюса: +15 монет. Возвращайтесь завтра!');
    return { ok: true, msg: 'ok' };
  };

  apps.updatePremium = function (ui, dt) {
    if (!ui) return;
    if (ui.msg) { ui.msgT = (ui.msgT || 0) + dt; if (ui.msgT > 5) { ui.msg = ''; ui.msgT = 0; } }
    if (ui.ad) {
      ui.ad.t -= dt;
      if (ui.ad.t <= 0) {
        ui.ad = null;
        var gain = apps.premiumAdGain();
        PVZ.state.premiumCoins(gain);
        var p = PVZ.state.premium();
        p.adsWatched = (p.adsWatched || 0) + 1;
        PVZ.state.save();
        PVZ.audio.coin();
        apps.premiumNotify(ui, 'Реклама просмотрена: +' + gain + ' ' + apps.premiumCoinsWord(gain) + '.');
      }
    }
  };

  /* ---------------- отрисовка витрины ---------------- */
  function premiumBadge(ctx, x, y, text, color, size) {
    var s = size || 9.5;
    var w = art.txtW(ctx, text, s, 900) + 16;
    art.fillRR(ctx, x - w, y, w, 19, 9, color || '#c9a227');
    art.txt(ctx, text, x - w / 2, y + 13, s, '#fff', 900, 'center');
    return w;
  }

  function strikePrice(ctx, text, x, y, size) {
    var w = art.txtW(ctx, text, size, 700);
    art.txt(ctx, text, x, y, size, 'rgba(255,240,210,0.5)', 700);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,120,90,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.32);
    ctx.lineTo(x + w, y - size * 0.32);
    ctx.stroke();
    ctx.restore();
  }

  function premiumButton(ctx, b, label, opts) {
    opts = opts || {};
    var hover = !opts.disabled && U.hit(b, PVZ.input.x, PVZ.input.y);
    var bg = opts.disabled ? 'rgba(255,255,255,0.06)'
      : hover ? (opts.hoverBg || '#ffe27a') : (opts.bg || 'rgba(255,212,121,0.92)');
    art.fillRR(ctx, b.x, b.y, b.w, b.h, 9, bg);
    if (opts.border) art.strokeRR(ctx, b.x, b.y, b.w, b.h, 9, opts.border, 1.4);
    art.txt(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 4, opts.size || 11,
      opts.disabled ? 'rgba(255,240,200,0.35)' : (opts.fg || '#241d08'), 800, 'center');
  }

  function drawPremiumCard(ctx, c, t) {
    var it = c.item, r = c.rect;
    var owned = apps.premiumOwned(it);
    var hov = U.hit(r, PVZ.input.x, PVZ.input.y);
    if (it.featured) {
      var g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, 'rgba(255,186,70,0.24)');
      g.addColorStop(0.6, 'rgba(228,87,46,0.10)');
      g.addColorStop(1, 'rgba(201,162,39,0.12)');
      ctx.save();
      ctx.shadowColor = 'rgba(255,190,90,' + (0.35 + 0.18 * Math.sin(t * 2.6)).toFixed(2) + ')';
      ctx.shadowBlur = 20;
      art.fillRR(ctx, r.x, r.y, r.w, r.h, 14, g);
      ctx.restore();
      art.strokeRR(ctx, r.x, r.y, r.w, r.h, 14, hov ? '#ffe9a8' : 'rgba(255,210,110,0.8)', 2);
    } else {
      toneCard(ctx, r, owned ? 'rgba(90,168,119,0.10)' : 'rgba(255,255,255,0.045)',
        owned ? 'rgba(140,230,190,0.32)' : hov ? 'rgba(255,212,121,0.45)' : 'rgba(255,212,121,0.18)');
    }

    // иконка
    art.fillRR(ctx, r.x + 14, r.y + 14, 44, 44, 12, it.color);
    art.txt(ctx, it.glyph, r.x + 36, r.y + 43, it.glyph.length > 1 ? 20 : 24, '#fff', 900, 'center');

    // бейдж-выгода
    var badgeW = 0;
    if (it.badge) badgeW = premiumBadge(ctx, r.x + r.w - 14, r.y + 10, it.badge, it.badgeColor, 9.5);

    // название и описание
    var nameFit = art.fitTxt(ctx, it.name, r.w - 84 - (badgeW ? badgeW + 12 : 0), 15, 800, 11);
    art.txt(ctx, nameFit.text, r.x + 68, r.y + 30, nameFit.size, '#fff3e2', 800);
    var desc = U.wrapLines(ctx, it.desc, r.w - 84, 9.8, 600);
    desc.slice(0, 2).forEach(function (line, li) {
      art.txt(ctx, line, r.x + 68, r.y + 49 + li * 12, 9.8, 'rgba(220,240,230,0.55)', 600);
    });

    // «было / выгода»
    if (it.oldRub && it.oldRub > it.rub && it.rub) {
      strikePrice(ctx, it.oldRub + ' ₽', r.x + 14, r.y + r.h - 50, 9.5);
      var saved = apps.premiumSaved(it);
      art.txt(ctx, 'выгода ' + saved + ' ₽', r.x + r.w - 14, r.y + r.h - 50, 10, '#9fe0b0', 800, 'right');
    } else if (it.kind === 'coins') {
      var per = (it.rub / it.coins).toFixed(2).replace('.', ',');
      art.txt(ctx, per + ' ₽ за монету', r.x + 14, r.y + r.h - 50, 9.5, 'rgba(220,240,230,0.55)', 700);
      if (it.bonus) art.txt(ctx, it.bonus + ' бонус', r.x + r.w - 14, r.y + r.h - 50, 10, '#9fe0b0', 800, 'right');
    }

    if (owned) {
      art.txt(ctx, '✓ Куплено', r.x + 14, r.y + r.h - 18, 11, '#9fe0b0', 800);
      if (it.id === 'catSkins') {
        var sw = { x: r.x + 14, y: r.y + r.h - 42, w: 140, h: 30 };
        premiumButton(ctx, sw, 'Выбрать скин', { bg: 'rgba(208,139,87,0.7)', fg: '#fff3e2', size: 10 });
      }
      return;
    }

    // кнопки покупки
    c.buttons.forEach(function (btn) {
      if (btn.kind === 'coins') {
        var price = apps.premiumCoins(it);
        var can = PVZ.state.premium().coins >= price;
        premiumButton(ctx, btn, '🪙 ' + price, {
          disabled: !can,
          bg: 'rgba(255,212,121,0.92)',
          border: can ? 'rgba(255,240,190,0.75)' : null
        });
      } else if (it.kind === 'coins') {
        premiumButton(ctx, btn, it.rub + ' ₽', { bg: 'rgba(255,212,121,0.95)', size: 13 });
      } else {
        var solo = c.buttons.length === 1;
        premiumButton(ctx, btn, it.rub + ' ₽', {
          bg: solo ? '#ffd479' : 'rgba(255,255,255,0.12)',
          fg: solo ? '#241d08' : '#fff3e2',
          hoverBg: solo ? '#ffe9a8' : 'rgba(255,255,255,0.24)',
          border: solo ? 'rgba(255,240,190,0.75)' : 'rgba(255,240,190,0.45)',
          size: solo ? 13 : 11
        });
      }
    });
  }

  apps.drawPremium = function (ctx, win, env) {
    var app = apps.byId('premium');
    var b = screenShell(ctx, app, win, 'магазин премиальных покупок');
    var L = env && env.laptop;
    var ui = (L && L.premium) || { modal: null, ad: null };
    var tab = apps.premiumTab(ui.tab);
    var p = PVZ.state.premium();
    var R = apps.premiumRects(win, tab, ui);
    var t = (env && env.t) || 0;
    var gold = '#ffd479';

    // ---- верхняя панель: баланс, подарок, реклама, пополнение ----
    art.fillRR(ctx, R.top.x, R.top.y, R.top.w, R.top.h, 12, 'rgba(201,162,39,0.14)');
    art.strokeRR(ctx, R.top.x, R.top.y, R.top.w, R.top.h, 12, 'rgba(255,212,121,0.35)', 1.4);
    art.txt(ctx, 'МОНЕТЫ', b.x + 14, b.y + 15, 8.5, 'rgba(255,235,180,0.6)', 800);
    art.txt(ctx, String(p.coins), b.x + 14, b.y + 33, 20, gold, 900);
    art.txt(ctx, '🪙', b.x + 14 + art.txtW(ctx, String(p.coins), 20, 900) + 8, b.y + 32, 13, gold, 700);

    var plusDays = PVZ.state.premiumPlusDays();
    if (plusDays > 0) {
      var canClaim = p.dailyClaim !== apps.premiumToday();
      premiumButton(ctx, R.giftBtn, canClaim ? (art.compact ? '🎁 +15 монет' : '🎁 Забрать 15 монет') : '🎁 Завтра', {
        disabled: !canClaim,
        bg: 'rgba(90,168,119,0.9)', fg: '#0f2a1a', hoverBg: '#8fe0a8'
      });
    } else {
      premiumButton(ctx, R.giftBtn, art.compact ? '🎁 Подарок' : '🎁 Подарок с Плюсом', {
        bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,235,180,0.8)',
        hoverBg: 'rgba(255,212,121,0.25)', border: 'rgba(255,212,121,0.35)'
      });
    }

    var adWait = apps.premiumAdCooldown();
    var adHov = U.hit(R.adBtn, PVZ.input.x, PVZ.input.y);
    art.fillRR(ctx, R.adBtn.x, R.adBtn.y, R.adBtn.w, R.adBtn.h, 9,
      adWait ? 'rgba(255,255,255,0.08)' : adHov ? '#ffe27a' : 'rgba(255,212,121,0.9)');
    var adLabel = adWait ? '🎁 Через ' + adWait + ' с'
      : (p.adFree ? '🎁 Бонус +' : (art.compact ? '▶ Реклама +' : '▶ Смотреть рекламу +')) + apps.premiumAdGain();
    art.txt(ctx, adLabel, R.adBtn.x + R.adBtn.w / 2, R.adBtn.y + 20, 10,
      adWait ? 'rgba(255,240,200,0.45)' : '#241d08', 800, 'center');

    var topHov = U.hit(R.topBtn, PVZ.input.x, PVZ.input.y);
    art.fillRR(ctx, R.topBtn.x, R.topBtn.y, R.topBtn.w, R.topBtn.h, 9,
      topHov ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.1)');
    art.txt(ctx, art.compact ? 'Пополнить' : 'Пополнить монеты',
      R.topBtn.x + R.topBtn.w / 2, R.topBtn.y + 20, 10, '#fff3e2', 800, 'center');

    var promo = 'СКИДКИ −84%';
    var promoW = art.txtW(ctx, promo, 9, 900) + 16;
    art.fillRR(ctx, b.x + 346, b.y + 9, promoW, 22, 11, 'rgba(228,87,46,0.9)');
    art.txt(ctx, promo, b.x + 346 + promoW / 2, b.y + 24, 9, '#fff', 900, 'center');

    // ---- табы ----
    R.tabs.forEach(function (tb) {
      var active = tb.id === tab;
      var hov = U.hit(tb.rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, tb.rect.x, tb.rect.y, tb.rect.w, tb.rect.h, 8,
        active ? 'rgba(255,212,121,0.95)' : hov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)');
      art.txt(ctx, tb.label, tb.rect.x + tb.rect.w / 2, tb.rect.y + 17, 11,
        active ? '#241d08' : '#fff3e2', 800, 'center');
    });
    var pp = R.plusPill;
    if (plusDays > 0) {
      var pl = plusDays > 9000 ? '✦ ПВЗ ПЛЮС НАВСЕГДА · −20%'
        : '✦ ПВЗ ПЛЮС · ' + plusDays + ' дн. · −20% на монеты';
      var plFit = art.fitTxt(ctx, pl, pp.w - 14, 10, 800, 8);
      art.fillRR(ctx, pp.x, pp.y, pp.w, pp.h, 10, 'rgba(201,162,39,0.2)');
      art.strokeRR(ctx, pp.x, pp.y, pp.w, pp.h, 10, 'rgba(255,212,121,0.4)', 1);
      art.txt(ctx, plFit.text, pp.x + pp.w / 2, pp.y + 16, plFit.size, '#ffd479', 800, 'center');
    } else {
      var pulse = 0.45 + 0.35 * Math.sin(t * 2.2);
      var upsell = '✦ ПВЗ Плюс −20% · 299 ₽';
      var upFit = art.fitTxt(ctx, upsell, pp.w - 14, 10, 800, 8);
      art.fillRR(ctx, pp.x, pp.y, pp.w, pp.h, 10, 'rgba(201,162,39,0.14)');
      art.strokeRR(ctx, pp.x, pp.y, pp.w, pp.h, 10, 'rgba(255,212,121,' + pulse.toFixed(2) + ')', 1.4);
      art.txt(ctx, upFit.text, pp.x + pp.w / 2, pp.y + 16, upFit.size,
        'rgba(255,212,121,' + Math.min(1, pulse + 0.3).toFixed(2) + ')', 800, 'center');
    }

    // ---- карточки ----
    R.cards.forEach(function (c) { drawPremiumCard(ctx, c, t); });

    // ---- подвал ----
    if (ui.msg) {
      art.txt(ctx, ui.msg, b.x, b.y + b.h - 2, 10, '#9fe0b0', 700);
    } else {
      art.txt(ctx, 'Монеты — за рекламу, товары — навсегда. Оплата демонстрационная: деньги не списываются.',
        b.x, b.y + b.h - 2, 9.5, 'rgba(200,235,225,0.35)', 600);
    }
    var payLabel = (PVZ.pay && PVZ.pay.isLive())
      ? 'оплата: ' + (PVZ.pay.provider() === 'rustore' ? 'RuStore' : 'платёжная страница')
      : 'демо-оплата';
    art.txt(ctx, payLabel, win.x + win.w - 26, b.y + b.h - 2, 9, 'rgba(200,235,225,0.35)', 600, 'right');

    // ---- модальные окна ----
    if (ui.modal) {
      var MR = apps.premiumModalRects(win, ui);
      var m = MR.panel;
      ctx.save();
      ctx.fillStyle = 'rgba(5,4,3,0.72)'; ctx.fillRect(win.x, win.y, win.w, win.h);
      art.panel(ctx, m.x, m.y, m.w, m.h, { bg: 'rgba(26,22,16,0.99)', r: 16, border: 'rgba(255,212,121,0.4)' });
      ctx.restore();
      var closeHov = U.hit(MR.close, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, MR.close.x, MR.close.y, MR.close.w, MR.close.h, 7, closeHov ? '#e4572e' : 'rgba(255,255,255,0.1)');
      art.txt(ctx, '✕', MR.close.x + 15, MR.close.y + 20, 14, '#fff', 700, 'center');

      if (ui.modal.type === 'skins') {
        art.txt(ctx, 'СКИНЫ КОТА', m.x + 24, m.y + 34, 16, '#ffd479', 800);
        art.txt(ctx, 'Выберите окрас — он применится, если кот уже живёт в пункте.', m.x + 24, m.y + 54, 9.5, 'rgba(255,240,210,0.5)', 600);
        var curFur = (PVZ.state.data.cat && PVZ.state.data.cat.fur) || 'ginger';
        MR.skins.forEach(function (sw) {
          var sh = U.hit(sw, PVZ.input.x, PVZ.input.y);
          var pal = PVZ.art.CAT_FURS[sw.skin] || PVZ.art.CAT_FURS.ginger;
          var locked = sw.skin === 'siam' || sw.skin === 'tuxedo' || sw.skin === 'calico' || sw.skin === 'blue';
          art.fillRR(ctx, sw.x, sw.y, sw.w, sw.h, 9, sh ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)');
          art.strokeRR(ctx, sw.x, sw.y, sw.w, sw.h, 9, curFur === sw.skin ? '#ffd479' : 'rgba(255,255,255,0.1)', curFur === sw.skin ? 2 : 1);
          art.fillRR(ctx, sw.x + 8, sw.y + 8, 28, 28, 14, pal.body);
          art.txt(ctx, '🐾', sw.x + 22, sw.y + 28, 12, pal.belly, 700, 'center');
          art.txt(ctx, sw.label, sw.x + 42, sw.y + 24, 9.5, locked ? '#ffd479' : '#fff3e2', 700);
          art.txt(ctx, locked ? 'premium' : 'базовый', sw.x + 42, sw.y + 38, 7.5, 'rgba(255,255,255,0.35)', 600);
        });
        premiumButton(ctx, MR.ok, 'Готово', { fg: '#241d08', size: 13 });
        return;
      }

      // подтверждение покупки за рубли
      var it = apps.premiumItem(ui.modal.id);
      if (it) {
        art.txt(ctx, 'ПОДТВЕРДИТЬ ПОКУПКУ', m.x + 24, m.y + 36, 15, '#ffd479', 800);
        art.txt(ctx, it.name, m.x + 24, m.y + 72, 22, '#fff3e2', 800);
        var disc = apps.premiumPercent(it);
        var lineY = m.y + 98;
        if (it.oldRub && disc) {
          strikePrice(ctx, it.oldRub + ' ₽', m.x + 24, lineY, 12);
          art.txt(ctx, '−' + disc + '%', m.x + 24 + art.txtW(ctx, it.oldRub + ' ₽', 12, 700) + 14, lineY, 13, '#ffd479', 900);
        }
        art.txt(ctx, 'Списать ' + it.rub + ' ₽ · выгода ' + apps.premiumSaved(it) + ' ₽', m.x + 24, m.y + 124, 12, '#9fe0b0', 800);
        art.txt(ctx, it.desc, m.x + 24, m.y + 148, 10, 'rgba(255,240,210,0.55)', 600);
        art.txt(ctx, (PVZ.pay && PVZ.pay.isLive())
          ? 'Оплата через ' + (PVZ.pay.provider() === 'rustore' ? 'RuStore Billing' : 'платёжную страницу магазина') + '. Чек придёт на почту.'
          : 'Демо-оплата: настоящие деньги не списываются, товар выдаётся сразу.',
          m.x + 24, m.y + 168, 10, 'rgba(255,240,210,0.45)', 600);
        art.txt(ctx, 'Покупка останется навсегда и сохранится в сейве.', m.x + 24, m.y + 188, 10, 'rgba(255,240,210,0.4)', 600);
        premiumButton(ctx, MR.ok, 'Оплатить ' + it.rub + ' ₽', { bg: 'rgba(90,168,119,0.9)', fg: '#0f2a1a', hoverBg: '#8fe0a8', size: 12 });
        premiumButton(ctx, MR.cancel, 'Отмена', { bg: 'rgba(255,255,255,0.08)', fg: '#fff3e2', hoverBg: 'rgba(255,255,255,0.2)', size: 12 });
      }
      return;
    }

    // ---- рекламный ролик ----
    if (ui.ad) {
      var ab = apps.premiumModalRects(win, ui).adBox;
      ctx.save();
      ctx.fillStyle = 'rgba(5,4,3,0.82)'; ctx.fillRect(win.x, win.y, win.w, win.h);
      art.panel(ctx, ab.x, ab.y, ab.w, ab.h, { bg: 'rgba(20,26,24,0.99)', r: 16, border: 'rgba(255,212,121,0.35)' });
      art.txt(ctx, 'РЕКЛАМА · ДЕМО', ab.x + 24, ab.y + 30, 11, 'rgba(255,240,210,0.55)', 800);
      art.txt(ctx, 'ПВЗ-КОФЕ', ab.x + ab.w / 2, ab.y + 96, 34, '#ffd479', 900, 'center');
      art.txt(ctx, 'Бодрость на всю смену. Пейте, пока коробки не остыли.', ab.x + ab.w / 2, ab.y + 130, 13, '#eafff8', 600, 'center');
      art.txt(ctx, '☕', ab.x + ab.w / 2, ab.y + 196, 54, '#e8c08a', 700, 'center');
      art.bar(ctx, ab.x + 30, ab.y + ab.h - 40, ab.w - 60, 10, 1 - Math.max(0, ui.ad.t) / 4.5, '#ffd479');
      art.txt(ctx, 'До награды: ' + Math.max(0, Math.ceil(ui.ad.t)) + ' с · +' + apps.premiumAdGain() + ' ' + apps.premiumCoinsWord(apps.premiumAdGain()),
        ab.x + ab.w / 2, ab.y + ab.h - 14, 10, 'rgba(255,240,210,0.55)', 600, 'center');
      ctx.restore();
    }
  };

  apps.tapPremium = function (win, x, y, env) {
    var L = env && env.laptop;
    var ui = L && L.premium;
    if (!ui) return false;
    if (!ui.tab) ui.tab = 'bundles';
    var tab = apps.premiumTab(ui.tab);
    var R = apps.premiumRects(win, tab, ui);
    if (ui.ad) return true;

    if (ui.modal) {
      var MR = apps.premiumModalRects(win, ui);
      if (U.hit(MR.close, x, y)) { ui.modal = null; PVZ.audio.click(); return true; }
      if (ui.modal.type === 'skins') {
        (MR.skins || []).forEach(function (sw) {
          if (U.hit(sw, x, y)) {
            if (PVZ.state.data.cat) {
              PVZ.state.data.cat.fur = sw.skin;
              PVZ.state.save();
              PVZ.audio.ok();
              apps.premiumNotify(ui, 'Окрас кота: ' + sw.label + '.');
            } else {
              apps.premiumNotify(ui, 'Скин сохранён. Кот появится — применим.');
            }
          }
        });
        if (U.hit(MR.ok, x, y)) { ui.modal = null; PVZ.audio.click(); }
        return true;
      }
      if (ui.modal.type === 'buy') {
        if (U.hit(MR.ok, x, y)) {
          var id = ui.modal.id;
          ui.modal = null;
          PVZ.audio.click();
          apps.premiumCheckout(id, ui);
        } else if (U.hit(MR.cancel, x, y)) {
          ui.modal = null; PVZ.audio.click();
        }
        return true;
      }
      return true;
    }

    // верхняя панель
    if (U.hit(R.adBtn, x, y)) { apps.premiumClaimAd(ui); PVZ.audio.ui(); return true; }
    if (U.hit(R.topBtn, x, y)) { ui.tab = 'coins'; PVZ.audio.click(); return true; }
    if (U.hit(R.giftBtn, x, y)) {
      if (PVZ.state.premiumHasPlus()) apps.premiumClaimDaily(ui);
      else { ui.tab = 'bundles'; apps.premiumNotify(ui, 'Подарок и −20% — в ПВЗ Плюсе. Он на вкладке «Наборы».'); }
      PVZ.audio.click();
      return true;
    }

    // табы
    for (var ti = 0; ti < R.tabs.length; ti++) {
      if (U.hit(R.tabs[ti].rect, x, y)) {
        if (ui.tab !== R.tabs[ti].id) { ui.tab = R.tabs[ti].id; PVZ.audio.click(); }
        return true;
      }
    }
    // плашка ПВЗ Плюса — прямое предложение подписки
    if (U.hit(R.plusPill, x, y)) {
      ui.tab = 'bundles';
      ui.modal = { type: 'buy', id: 'plus30' };
      PVZ.audio.click();
      return true;
    }

    // карточки
    for (var i = 0; i < R.cards.length; i++) {
      var c = R.cards[i];
      var owned = apps.premiumOwned(c.item);
      if (owned && c.item.id === 'catSkins' &&
        U.hit({ x: c.rect.x + 14, y: c.rect.y + c.rect.h - 42, w: 140, h: 30 }, x, y)) {
        ui.modal = { type: 'skins' }; PVZ.audio.click(); return true;
      }
      if (owned) continue;
      for (var bi = 0; bi < c.buttons.length; bi++) {
        var btn = c.buttons[bi];
        if (!U.hit(btn, x, y)) continue;
        if (btn.kind === 'coins') {
          var res = apps.premiumBuy(c.item.id, 'coins', ui);
          if (!res.ok) { PVZ.audio.bad(); apps.premiumNotify(ui, res.msg); }
          else PVZ.audio.cash();
          return true;
        }
        ui.modal = { type: 'buy', id: c.item.id };
        PVZ.audio.click();
        return true;
      }
    }
    return false;
  };

  /* ---------------- «Секреты»: коллекция пасхалок ---------------- */
  apps.drawSecrets = function (ctx, win, env) {
    var eggs = (PVZ.sys && PVZ.sys.EGGS) || [];
    var found = (PVZ.state.data && PVZ.state.data.eggs) || [];
    var box = { x: win.x + 26, y: win.y + 88, w: win.w - 52, h: win.h - 106 };
    art.txt(ctx, 'СЕКРЕТЫ ПВЗ', win.x + 26, win.y + 74, 18, '#f3d7e6', 800);
    art.txt(ctx, 'Найдено ' + found.length + ' из ' + eggs.length, win.x + win.w - 70, win.y + 74, 13, '#ffd479', 800, 'right');
    art.fillRR(ctx, box.x, box.y, box.w, box.h, 12, 'rgba(28,14,24,0.55)');
    art.strokeRR(ctx, box.x, box.y, box.w, box.h, 12, 'rgba(240,180,215,0.18)', 1.2);
    art.txt(ctx, 'Пасхалки прячутся в смене: редкие гости, предметы на столе, кот и даже клавиатура.',
      box.x + 18, box.y + 22, 11, 'rgba(245,215,235,0.6)', 600);

    var cols = 3;
    var rows = Math.ceil(eggs.length / cols);
    var cardW = (box.w - 36) / cols - 8;
    var top = box.y + 38;
    var rowH = Math.min(58, (box.h - 52) / rows);
    eggs.forEach(function (e, i) {
      var col = Math.floor(i / rows);
      var row = i % rows;
      var x = box.x + 18 + col * ((box.w - 36) / cols);
      var y = top + row * rowH;
      var isFound = found.indexOf(e.id) >= 0;
      art.fillRR(ctx, x, y, cardW, rowH - 7, 10, isFound ? 'rgba(255,212,121,0.16)' : 'rgba(255,255,255,0.04)');
      art.strokeRR(ctx, x, y, cardW, rowH - 7, 10, isFound ? 'rgba(255,212,121,0.45)' : 'rgba(255,255,255,0.08)', 1.2);
      if (isFound) {
        art.txt(ctx, '✓', x + 15, y + 23, 15, '#8fe0a8', 900, 'center');
        art.txt(ctx, e.name + (e.last ? ' ' + e.last : ''), x + 30, y + 21, 12.5, '#fff3e2', 800);
        art.txt(ctx, e.from, x + 30, y + 36, 9.5, 'rgba(255,235,215,0.5)', 600);
      } else {
        art.txt(ctx, '?', x + 15, y + 23, 15, 'rgba(255,255,255,0.25)', 900, 'center');
        var lines = PVZ.util.wrapLines(ctx, e.hint || 'Секрет', cardW - 44, 9.5, 600);
        lines.slice(0, 2).forEach(function (line, li) {
          art.txt(ctx, line, x + 30, y + 19 + li * 12, 9.5, 'rgba(255,240,225,0.55)', 600);
        });
      }
    });
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 11, 'rgba(200,235,225,0.4)', 600, 'center');
  };

  apps.tapGeneric = function (id, win, x, y) {
    if (id === 'radio') return false;
    if (id === 'antivirus') {
      var box = apps.infoPanelRect(win);
      if (PVZ.state.hasApp('banana')) {
        var del = { x: box.x + 20, y: box.y + box.h - 106, w: 300, h: 40 };
        if (U.hit(del, x, y)) {
          PVZ.state.data.apps = (PVZ.state.data.apps || []).filter(function (a) { return a !== 'banana'; });
          var b = PVZ.state.banana();
          b.avFound = false;
          b.removedDay = PVZ.state.data.day || 1;
          b.heat = Math.max(0, b.heat - 30);
          PVZ.state.save();
          PVZ.audio.ok();
          return true;
        }
      }
      if (U.hit({ x: box.x + 20, y: box.y + box.h - 56, w: 240, h: 40 }, x, y)) {
        PVZ.state.data.antivirusAt = (PVZ.state.data.day || 1);
        if (PVZ.state.hasApp('banana')) {
          var bb = PVZ.state.banana();
          bb.avFound = true;
          PVZ.audio.bad();
        } else {
          PVZ.audio.scanOk();
        }
        PVZ.state.save();
        return true;
      }
    }
    if (id === 'taxi') {
      var box2 = apps.infoPanelRect(win);
      if (U.hit({ x: box2.x + 20, y: box2.y + box2.h - 56, w: 240, h: 40 }, x, y)) {
        PVZ.state.data.taxiAt = Date.now();
        PVZ.audio.ok();
        return true;
      }
    }
    return false;
  };

  /* =========================================================
     «BANANA STORE» — чёрный рынок
     Покупки дают пассивные бонусы и добавляют подозрение полиции.
     Сбыт товара со склада даёт быстрые деньги и много подозрения.
     ========================================================= */
  apps.BANANA_ITEMS = [
    {
      id: 'gun', name: 'Травмат', glyph: '▮', color: '#8a9098', price: 1500,
      desc: 'Грабители и воры дважды подумают, прежде чем заходить в ПВЗ.',
      sold: 'Грабители обходят пункт стороной.'
    },
    {
      id: 'poison', name: 'Яд от насекомых', glyph: '☠', color: '#7fa05a', price: 900,
      desc: 'В зале не заводятся насекомые: терпение покупателей +2%.',
      sold: 'Насекомых в зале больше нет.'
    },
    {
      id: 'docs', name: 'Липовые документы', glyph: '✎', color: '#b08a4a', price: 1400,
      desc: 'Жалобы бьют по рейтингу на 40% слабее.',
      sold: 'Документы прикрывают от жалоб.'
    },
    {
      id: 'jammer', name: 'Глушилка', glyph: '⌁', color: '#6a7a8a', price: 1800,
      desc: 'Полиция успевает быстрее: +5 секунд на вызов при грабеже.',
      sold: 'Полиция приезжает быстрее.'
    },
    {
      id: 'bribe', name: 'Взятка инспектору', glyph: '₽', color: '#3f9c6a', price: 600,
      desc: 'Сбивает подозрение полиции на 30 единиц.', repeat: true,
      sold: 'Инспектор обещал «не заметить».'
    }
  ];

  apps.bananaItem = function (id) {
    for (var i = 0; i < apps.BANANA_ITEMS.length; i++) if (apps.BANANA_ITEMS[i].id === id) return apps.BANANA_ITEMS[i];
    return null;
  };

  /* Сколько скупщик даст за посылку: половина цены плюс накидка.
     Чем выше подозрение, тем нервнее скупщик и тем меньше даёт. */
  apps.bananaPrice = function (order) {
    var b = PVZ.state.banana();
    var base = Math.round((order.price || 1000) * 0.5 / 10) * 10 + 150;
    if (b && b.heat >= 60) base = Math.round(base * 0.8 / 10) * 10;
    return base;
  };

  function bananaSellable(st) {
    var list = (st && st.orders) || [];
    return list.filter(function (o) { return o.state === 'stored' && !o.customer; }).slice(0, 5);
  }

  function bananaRects(win, tab, st) {
    var pad = 26;
    var x = win.x + pad, w = win.w - pad * 2;
    var tabs = [
      { id: 'buy', label: 'Купить', rect: { x: x, y: win.y + 100, w: 116, h: 32 } },
      { id: 'sell', label: 'Сбыть товар', rect: { x: x + 126, y: win.y + 100, w: 164, h: 32 } }
    ];
    var rows = [];
    var y0 = win.y + 148;
    if (tab === 'sell') {
      bananaSellable(st).forEach(function (o, i) {
        rows.push({
          order: o,
          rect: { x: x, y: y0 + i * 56, w: w, h: 50 },
          btn: { x: x + w - 196, y: y0 + i * 56 + 8, w: 184, h: 34 }
        });
      });
    } else {
      apps.BANANA_ITEMS.forEach(function (it, i) {
        rows.push({
          item: it,
          rect: { x: x, y: y0 + i * 56, w: w, h: 50 },
          btn: { x: x + w - 196, y: y0 + i * 56 + 8, w: 184, h: 34 }
        });
      });
    }
    return { tabs: tabs, rows: rows };
  }

  apps.bananaRects = bananaRects;

  apps.tapBanana = function (win, x, y, env) {
    var L = env && env.laptop;
    var ui = (L && L.banana) || { tab: 'buy' };
    var R = bananaRects(win, ui.tab, env && env.st);
    for (var i = 0; i < R.tabs.length; i++) {
      if (U.hit(R.tabs[i].rect, x, y)) {
        if (ui.tab !== R.tabs[i].id) { ui.tab = R.tabs[i].id; return { action: 'tab' }; }
        return { action: 'tab' };
      }
    }
    for (var r = 0; r < R.rows.length; r++) {
      if (U.hit(R.rows[r].btn, x, y)) {
        if (ui.tab === 'sell') return { action: 'sell', id: R.rows[r].order.id };
        return { action: 'buy', id: R.rows[r].item.id };
      }
    }
    return null;
  };

  apps.drawBanana = function (ctx, win, env) {
    var L = env && env.laptop;
    var ui = (L && L.banana) || (env && env.bananaUI) || { tab: 'buy' };
    var b = PVZ.state.banana() || { heat: 0, bought: [], soldToday: 0, soldDay: 0, totalSold: 0 };
    var money = PVZ.state.data ? PVZ.state.data.money : 0;
    var R = bananaRects(win, ui.tab, env && env.st);
    var heat = b.heat || 0;
    var heatCol = heat >= 80 ? '#e4572e' : heat >= 50 ? '#ffb347' : '#8fe0a8';

    // шапка магазина (не перекрывает крестик ноутбука в правом верхнем углу)
    art.fillRR(ctx, win.x + 12, win.y + 12, win.w - 66, 74, 14, 'rgba(18,16,10,1)');
    art.strokeRR(ctx, win.x + 12, win.y + 12, win.w - 66, 74, 14, 'rgba(255,214,110,0.35)', 1.4);
    art.txt(ctx, 'BANANA STORE', win.x + 28, win.y + 48, 26, '#ffd95e', 900);
    art.txt(ctx, 'чёрный рынок · без чеков и вопросов', win.x + 28 + art.txtW(ctx, 'BANANA STORE', 26, 900) + 14,
      win.y + 47, 11, 'rgba(255,232,170,0.55)', 600);

    // подозрение полиции
    art.txt(ctx, 'ПОДОЗРЕНИЕ ПОЛИЦИИ', win.x + win.w - 300, win.y + 30, 10, 'rgba(255,236,180,0.6)', 800);
    art.txt(ctx, Math.round(heat) + '%', win.x + win.w - 60, win.y + 31, 13, heatCol, 800, 'right');
    art.bar(ctx, win.x + win.w - 300, win.y + 40, 240, 11, heat / 100, heatCol, 'rgba(0,0,0,0.5)');
    var risk = heat >= 90 ? 'арест на следующей сделке' : heat >= 70 ? 'полиция уже наводит справки'
      : heat >= 40 ? 'участковый что-то подозревает' : 'тихо';
    art.txt(ctx, risk, win.x + win.w - 300, win.y + 74, 10.5, heatCol, 700);

    // вкладки
    R.tabs.forEach(function (tb) {
      var active = tb.id === ui.tab;
      var hov = U.hit(tb.rect, PVZ.input.x, PVZ.input.y);
      art.fillRR(ctx, tb.rect.x, tb.rect.y, tb.rect.w, tb.rect.h, 9,
        active ? 'rgba(255,214,94,0.95)' : hov ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)');
      art.txt(ctx, tb.label, tb.rect.x + tb.rect.w / 2, tb.rect.y + 22, 14,
        active ? '#241d08' : '#ffeec2', 800, 'center');
    });

    if (ui.tab === 'sell') {
      var today = (env && env.st && env.st.day) || (PVZ.state.data && PVZ.state.data.day) || 1;
      var soldToday = b.soldDay === today && b.soldToday >= 1;
      if (!R.rows.length) {
        art.txt(ctx, 'На складе нет свободных посылок для сбыта.', win.x + win.w / 2, win.y + 260, 15,
          'rgba(255,232,180,0.5)', 700, 'center');
      }
      R.rows.forEach(function (row) {
        var o = row.order;
        var disabled = soldToday;
        art.fillRR(ctx, row.rect.x, row.rect.y, row.rect.w, row.rect.h, 10, 'rgba(255,255,255,0.05)');
        art.strokeRR(ctx, row.rect.x, row.rect.y, row.rect.w, row.rect.h, 10, 'rgba(255,214,94,0.18)', 1.1);
        art.fillRR(ctx, row.rect.x + 12, row.rect.y + 10, 30, 30, 8, 'rgba(255,214,94,0.16)');
        art.txt(ctx, '▣', row.rect.x + 27, row.rect.y + 32, 16, '#ffd95e', 700, 'center');
        art.txt(ctx, o.code + ' · ' + o.item, row.rect.x + 54, row.rect.y + 22, 14, '#fff6df', 700);
        art.txt(ctx, 'поставка день ' + o.day + ' · ячейка ' + (o.cell || '—'), row.rect.x + 54, row.rect.y + 39, 10,
          'rgba(255,236,180,0.45)', 600);
        var price = apps.bananaPrice(o);
        art.txt(ctx, '+' + U.fmtMoney(price), row.btn.x - 14, row.rect.y + 32, 16, '#8fe0a8', 800, 'right');
        var hovS = U.hit(row.btn, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, row.btn.x, row.btn.y, row.btn.w, row.btn.h, 9,
          disabled ? 'rgba(255,255,255,0.06)' : hovS ? '#ffe27a' : 'rgba(255,214,94,0.9)');
        art.txt(ctx, disabled ? 'завтра' : 'Продать', row.btn.x + row.btn.w / 2, row.btn.y + 23, 14,
          disabled ? 'rgba(255,240,200,0.4)' : '#241d08', 800, 'center');
      });
    } else {
      R.rows.forEach(function (row) {
        var it = row.item;
        var owned = !it.repeat && PVZ.state.bananaHas(it.id);
        var afford = money >= it.price;
        var canBribe = it.id !== 'bribe' || b.heat > 0;
        var disabled = owned || !afford || !canBribe;
        art.fillRR(ctx, row.rect.x, row.rect.y, row.rect.w, row.rect.h, 10, 'rgba(255,255,255,0.05)');
        art.strokeRR(ctx, row.rect.x, row.rect.y, row.rect.w, row.rect.h, 10,
          owned ? 'rgba(140,230,190,0.28)' : 'rgba(255,214,94,0.18)', 1.1);
        art.fillRR(ctx, row.rect.x + 12, row.rect.y + 9, 32, 32, 8, it.color);
        art.txt(ctx, it.glyph, row.rect.x + 28, row.rect.y + 32, 17, '#1c1a12', 900, 'center');
        art.txt(ctx, it.name, row.rect.x + 56, row.rect.y + 21, 14.5, '#fff6df', 800);
        art.txt(ctx, it.desc, row.rect.x + 56, row.rect.y + 38, 10, 'rgba(255,236,180,0.55)', 600);
        var hovB = U.hit(row.btn, PVZ.input.x, PVZ.input.y);
        art.fillRR(ctx, row.btn.x, row.btn.y, row.btn.w, row.btn.h, 9,
          owned ? 'rgba(120,220,180,0.16)' : disabled ? 'rgba(255,255,255,0.06)' : hovB ? '#ffe27a' : 'rgba(255,214,94,0.9)');
        var label = owned ? 'Куплено' : it.id === 'bribe' && b.heat <= 0 ? 'нет смысла' : U.fmtMoney(it.price);
        art.txt(ctx, label, row.btn.x + row.btn.w / 2, row.btn.y + 23, 13,
          owned ? '#9ff0d0' : disabled ? 'rgba(255,200,170,0.55)' : '#241d08', 800, 'center');
      });
    }

    var tip = ui.tab === 'sell'
      ? (soldToday ? 'Сегодня уже сбывали товар — скупщик просит не наглеть.' : 'Сбыт: рейтинг −0,12 · подозрение +22 · одна сделка в день')
      : 'Покупка: подозрение +4 · товары начинают работать сразу';
    art.txt(ctx, tip, win.x + 26, win.y + win.h - 38, 10.5, 'rgba(255,236,180,0.45)', 600);
    art.txt(ctx, 'В кошельке: ' + U.fmtMoney(money), win.x + win.w - 26, win.y + win.h - 38, 11, '#ffd479', 800, 'right');
    art.txt(ctx, 'Esc — на рабочий стол · ✕ — закрыть ноутбук', win.x + win.w / 2, win.y + win.h - 12, 11,
      'rgba(255,236,180,0.4)', 600, 'center');
  };
})();
