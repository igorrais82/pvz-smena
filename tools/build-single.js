/* Сборка игры в один автономный HTML-файл.
   Вся графика рисуется на canvas, звук синтезируется в WebAudio, внешних
   файлов нет — поэтому игру можно упаковать в один .html и открыть с флешки.
   node tools/build-single.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME = path.join(ROOT, 'game');
const OUT = path.join(ROOT, 'dist');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

function dataUri(file, mime) {
  return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}

let html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');

// стили и скрипты — внутрь файла
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, function (_, href) {
  const css = fs.readFileSync(path.join(GAME, href), 'utf8');
  return '<style>\n' + css + '\n</style>';
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, function (_, src) {
  const js = fs.readFileSync(path.join(GAME, src), 'utf8');
  return '<script>\n/* ' + src + ' */\n' + js + '\n</script>';
});

// иконки — data URI, чтобы файл был полностью автономным
html = html.replace(/<link rel="manifest" href="[^"]+">\s*/, '');
html = html.replace(/<link rel="icon" href="([^"]+)" sizes="any">/g, function (_, href) {
  const file = path.resolve(GAME, href);
  return '<link rel="icon" href="' + dataUri(file, 'image/x-icon') + '" sizes="any">';
});
html = html.replace(/<link rel="apple-touch-icon" href="([^"]+)">/g, function (_, href) {
  const file = path.resolve(GAME, href);
  return '<link rel="apple-touch-icon" href="' + dataUri(file, 'image/png') + '">';
});

html = html.replace('<head>', '<head>\n<!-- ПВЗ: Смена ' + version + ' — автономная сборка, ' + new Date().toISOString().slice(0, 10) + ' -->');

if (/<script src=|<link rel="stylesheet"/.test(html)) {
  throw new Error('в сборке остались внешние ссылки на стили или скрипты');
}
fs.mkdirSync(OUT, { recursive: true });
const stable = path.join(OUT, 'PVZ-Smena.html');
const versioned = path.join(OUT, 'PVZ-Smena-' + version + '.html');
fs.writeFileSync(stable, html);
fs.writeFileSync(versioned, html);

const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log('single-file: dist/PVZ-Smena.html (' + kb + ' КБ, версия ' + version + ')');
