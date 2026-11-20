/* Сборка статической версии игры в dist/: копия game/ + иконки.
   node tools/build.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'game');
const ASSETS = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

const version = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; }
  catch (e) { return '0.0.0'; }
})();

fs.rmSync(path.join(OUT, 'game'), { recursive: true, force: true });
fs.rmSync(path.join(OUT, 'assets'), { recursive: true, force: true });
copyDir(SRC, path.join(OUT, 'game'));
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const name of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, name), path.join(OUT, 'assets', name));
}

/* Релизная точка входа: включает PVZ_RELEASE (без DEV-кнопки, ?dev= и демо-оплаты).
   Оригинал в game/index.html остаётся отладочным для скриншотов и прогонов. */
const entry = path.join(OUT, 'game', 'index.html');
let html = fs.readFileSync(entry, 'utf8');

/* Проверка целостности: каждый <script src="src/…"> существует, и наоборот.
   Именно эта проверка ловит ситуацию «в сборке забыли serve.js/ads.js». */
const refs = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map(m => m[1]);
const files = fs.existsSync(path.join(SRC, 'src'))
  ? fs.readdirSync(path.join(SRC, 'src')).filter(f => f.endsWith('.js')).map(f => 'src/' + f)
  : [];
for (const ref of refs) {
  if (!fs.existsSync(path.join(OUT, 'game', ref))) {
    throw new Error('в index.html подключён несуществующий файл: ' + ref);
  }
}
for (const file of files) {
  if (!refs.includes(file)) {
    throw new Error('файл game/' + file + ' не подключён в game/index.html');
  }
}

if (!html.includes('window.PVZ_RELEASE')) {
  html = html.replace('<head>', '<head>\n<script>window.PVZ_RELEASE = true;</script>');
}
fs.writeFileSync(entry, html);

fs.writeFileSync(path.join(OUT, 'build.json'), JSON.stringify({
  version,
  release: true,
  built: new Date().toISOString(),
  entry: 'game/index.html'
}, null, 2) + '\n');

console.log('dist/ собран: версия ' + version + ' → dist/game/index.html (релиз, DEV выключен)');
