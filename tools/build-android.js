/* Сборка Android APK: копирует игру в assets, при необходимости создаёт
   ключ подписи и запускает Gradle. node tools/build-android.js */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ANDROID = path.join(ROOT, 'android');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
const parts = version.split('.').map(Number);
const versionCode = parts[0] * 10000 + parts[1] * 100 + parts[2];

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    'C:\\Android\\Sdk'
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'platforms'))) return dir;
  }
  throw new Error('Android SDK не найден. Задайте ANDROID_HOME.');
}

function findGradle() {
  if (process.env.GRADLE_HOME) {
    const bat = path.join(process.env.GRADLE_HOME, 'bin', 'gradle.bat');
    if (fs.existsSync(bat)) return bat;
  }
  const wrapperRoot = path.join(os.homedir(), '.gradle', 'wrapper', 'dists');
  if (fs.existsSync(wrapperRoot)) {
    for (const dist of fs.readdirSync(wrapperRoot)) {
      if (!dist.startsWith('gradle-')) continue;
      const stack = [path.join(wrapperRoot, dist)];
      while (stack.length) {
        const dir = stack.pop();
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.name === 'gradle.bat') return full;
        }
      }
    }
  }
  throw new Error('Gradle не найден. Установите Gradle 8.9+ или запустите впервые с интернетом.');
}

function ensureKeystore() {
  const keyDir = path.join(ANDROID, 'keystore');
  const keystore = path.join(keyDir, 'pvz-release.jks');
  const propsFile = path.join(ANDROID, 'keystore.properties');
  if (fs.existsSync(keystore) && fs.existsSync(propsFile)) return;
  fs.mkdirSync(keyDir, { recursive: true });
  const password = crypto.randomBytes(16).toString('hex');
  console.log('Создаю ключ подписи Android (хранится локально, в git не попадает)…');
  execFileSync('keytool', [
    '-genkeypair', '-noprompt',
    '-keystore', keystore,
    '-alias', 'pvz',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-storepass', password, '-keypass', password,
    '-dname', 'CN=PVZ Smena, OU=Games, O=Igor Rais, L=Moscow, C=RU'
  ], { stdio: 'inherit' });
  fs.writeFileSync(propsFile,
    'storeFile=keystore/pvz-release.jks\n' +
    'storePassword=' + password + '\n' +
    'keyAlias=pvz\n' +
    'keyPassword=' + password + '\n', 'utf8');
}

const sdk = findSdk();
console.log('Android SDK:', sdk);

// 1. свежая статическая сборка игры
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });

// 2. игра в assets
const assetsGame = path.join(ANDROID, 'app', 'src', 'main', 'assets', 'game');
fs.rmSync(assetsGame, { recursive: true, force: true });
fs.cpSync(path.join(DIST, 'game'), assetsGame, { recursive: true });

// 3. local.properties и ключ
fs.writeFileSync(path.join(ANDROID, 'local.properties'),
  'sdk.dir=' + sdk.replace(/\\/g, '/') + '\n', 'utf8');
ensureKeystore();

// 4. синхронизируем версию в build.gradle.kts
const gradleFile = path.join(ANDROID, 'app', 'build.gradle.kts');
let gradle = fs.readFileSync(gradleFile, 'utf8');
gradle = gradle.replace(/versionCode = \d+/, 'versionCode = ' + versionCode)
               .replace(/versionName = "[^"]+"/, 'versionName = "' + version + '"');
fs.writeFileSync(gradleFile, gradle);

// 5. Gradle
const gradleBat = findGradle();
console.log('Gradle:', gradleBat);
// GRADLE_OFFLINE=1 — сборка без сети, на уже скачанных зависимостях
const offline = process.env.GRADLE_OFFLINE === '1' ? ' --offline' : '';
const command = '"' + gradleBat + '" -p "' + ANDROID + '" assembleRelease --no-daemon --console=plain' + offline;
const result = spawnSync(command, [], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
});
if (result.status !== 0) throw new Error('Gradle завершился с кодом ' + result.status);

const apkDir = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'release');
const apks = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
if (!apks.length) throw new Error('APK не найден в ' + apkDir);
const apk = path.join(apkDir, apks.find(f => !f.includes('unsigned')) || apks[0]);

const out1 = path.join(DIST, 'PVZ-Smena-' + version + '.apk');
const out2 = path.join(DIST, 'PVZ-Smena.apk');
fs.copyFileSync(apk, out1);
fs.copyFileSync(apk, out2);
console.log('Android: ' + path.basename(apk) + ' → dist/' + path.basename(out1) +
  ' (' + Math.round(fs.statSync(out1).size / 1024) + ' КБ)');
