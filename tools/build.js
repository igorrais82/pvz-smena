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

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(SRC, path.join(OUT, 'game'));
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const name of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, name), path.join(OUT, 'assets', name));
}
fs.writeFileSync(path.join(OUT, 'build.json'), JSON.stringify({
  version,
  built: new Date().toISOString(),
  entry: 'game/index.html'
}, null, 2) + '\n');

console.log('dist/ собран: версия ' + version + ' → dist/game/index.html');
