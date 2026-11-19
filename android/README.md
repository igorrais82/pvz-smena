# Android / RuStore

Игра — статический сайт (`dist/game/index.html`), поэтому для RuStore её нужно завернуть в WebView-контейнер.

Что важно в контейнере:

- `WebView` открывает `file:///android_asset/game/index.html` (или локальный сервер из assets — манифест PWA требует http, но игра работает и без него).
- Ориентация — **landscape**, fullscreen без статус-бара.
- Включены `javaScriptEnabled`, `domStorageEnabled` (сохранение прогресса в `localStorage`), `mediaPlaybackRequiresUserGesture = false` (музыка синтезируется и стартует по тапу).
- Системная кнопка «Назад» пробрасывается в игру: `window.PVZ.game.onAndroidBack()` уже реализован (возвращает `resume` / `paused` / `exit`).
- Игра не ходит в сеть: достаточно разрешений на вибрацию/аудио, интернет не нужен.

Перед сборкой релиза уберите отладочные точки входа:

- кнопка `DEV ⚙` и меню читов в `game/src/scenes.js` (функции `drawDev`, `handleDevTap`, объект `api.debug`);
- `applyDevQuery()` в `game/src/main.js` (входы `?dev=…`) — или оставьте только для внутренних сборок.

Статическую папку удобно собирать командой `npm run build` — она положит игру в `dist/game/`.
