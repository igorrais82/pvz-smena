/* Полная сборка проекта: статика, одиночный HTML, ПК-архив и APK.
   node tools/build-all.js */
const path = require('path');
const { execFileSync } = require('child_process');

const steps = [
  'build.js',
  'build-single.js',
  'build-pc.js',
  'build-android.js'
];

for (const step of steps) {
  console.log('\n=== ' + step + ' ===');
  execFileSync(process.execPath, [path.join(__dirname, step)], { stdio: 'inherit' });
}

console.log('\nГотово: dist/game, dist/PVZ-Smena.html, dist/PVZ-Smena-win64.zip, dist/PVZ-Smena.apk');
