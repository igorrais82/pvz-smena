# Android / RuStore

Игра — статический сайт (`dist/game/index.html`), для Android она заворачивается в WebView-контейнер. Проект лежит в этой папке и собирается Gradle:

```bash
npm run build:android
# ≡ node tools/build-android.js
```

Скрипт копирует свежую сборку игры в `app/src/main/assets/game`, создаёт `local.properties`, при первом запуске генерирует ключ подписи в `android/keystore/` (в git не попадает) и собирает подписанный release-APK:

```
android/app/build/outputs/apk/release/app-release.apk
dist/PVZ-Smena.apk
dist/PVZ-Smena-<версия>.apk
```

Требования: JDK 17+, Android SDK (platform 35, build-tools 35), Gradle 8.9+. SDK ищется в `ANDROID_HOME`, `ANDROID_SDK_ROOT` или `%LOCALAPPDATA%\Android\Sdk`.

## Что важно в контейнере

- `WebView` открывает `file:///android_asset/game/index.html` — интернет не нужен.
- Ориентация — **landscape**, fullscreen без статус-бара (immersive).
- Включены `javaScriptEnabled`, `domStorageEnabled` (сохранение прогресса в `localStorage`), `mediaPlaybackRequiresUserGesture = false` (музыка синтезируется и стартует по тапу).
- Системная кнопка «Назад» пробрасывается в игру: `window.PVZ.game.onAndroidBack()` возвращает `resume` / `paused` / `exit`; на `exit` Activity закрывается.
- Игра не ходит в сеть: из разрешений только вибрация.

Перед публикацией в RuStore/Google Play уберите отладочные точки входа:

- кнопка `DEV ⚙` и меню читов в `game/src/scenes.js` (функции `drawDev`, `handleDevTap`, объект `api.debug`);
- `applyDevQuery()` в `game/src/main.js` (входы `?dev=…`) — или оставьте только для внутренних сборок.

## Подпись и обновления

Ключ `android/keystore/pvz-release.jks` и пароль `android/keystore.properties` создаются один раз и **не коммитятся**. Сохраните их: обновление APK должно быть подписано тем же ключом, иначе Android не установит новую версию поверх старой.

Для сборки в CI положите содержимое keystore и пароль в секреты репозитория и передайте их Gradle через `ORG_GRADLE_PROJECT_*` или файл `keystore.properties` перед запуском.
