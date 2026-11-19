/* Портативная сборка для Windows: папка с игрой, лаунчером в отдельном окне
   и короткой инструкцией + ZIP-архив для скачивания.
   node tools/build-pc.js */
const fs = require('fs');
const path = require('path');
const { zipDir } = require('./lib/zip');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PC = path.join(DIST, 'pc');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
const folder = 'PVZ-Smena-' + version + '-win64';
const outDir = path.join(PC, folder);

function writeUtf16(file, text) {
  const crlf = text.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(crlf, 'utf16le')]));
}
function writeUtf8Bom(file, text) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(text, 'utf8')]));
}

const VBS = `' ПВЗ: Смена — запуск игры в отдельном окне (без адресной строки браузера).
Option Explicit
Dim sh, fso, dir, target, profile, candidates, chrome, i, url, args, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
target = dir & "\\game\\index.html"
If Not fso.FileExists(target) Then
  MsgBox "Не найден файл game\\index.html." & vbCrLf & "Распакуйте архив целиком и запустите ярлык из папки игры.", 48, "ПВЗ: Смена"
  WScript.Quit 1
End If
candidates = Array( _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\\Google\\Chrome\\Application\\chrome.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\\Google\\Chrome\\Application\\chrome.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\\Microsoft\\Edge\\Application\\msedge.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\\Microsoft\\Edge\\Application\\msedge.exe")
chrome = ""
For i = 0 To UBound(candidates)
  If fso.FileExists(candidates(i)) Then chrome = candidates(i)
Next
url = "file:///" & Replace(target, "\\", "/")
If chrome = "" Then
  ' Chrome и Edge не найдены — открываем игру в браузере по умолчанию.
  sh.Run """" & target & """", 1, False
  WScript.Quit 0
End If
profile = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\PVZ-Smena\\app-profile"
args = " --app=""" & url & """" & _
       " --user-data-dir=""" & profile & """" & _
       " --window-size=1280,800" & _
       " --no-first-run --no-default-browser-check --disable-features=Translate" & _
       " --autoplay-policy=no-user-gesture-required"
cmd = """" & chrome & """" & args
sh.Run cmd, 1, False
`;

const CMD = `@echo off
rem ПВЗ: Смена — запасной запуск в браузере по умолчанию.
start "" "%~dp0game\\index.html"
`.replace(/\n/g, '\r\n');

const README = `ПВЗ: Смена ${version}
Симулятор пункта выдачи заказов

КАК ЗАПУСТИТЬ
  1. Распакуйте архив в любую папку (например, на рабочий стол).
  2. Дважды щёлкните «Запустить ПВЗ.vbs» — игра откроется в отдельном окне.
     Если лаунчер не сработал, запустите «Запустить ПВЗ.cmd»: игра откроется
     в браузере по умолчанию.

УСТАНОВКА НЕ НУЖНА
  Игра работает офлайн, без интернета и без установки. Все данные (прогресс,
  покупки, настройки) хранятся в локальном хранилище браузера. При переносе
  игры в другую папку прогресс может начаться заново — это ограничение
  localStorage, а не игры.

УПРАВЛЕНИЕ
  ← / →        склад и зал (или мышь/тап по дверям)
  T            терминал
  L            ноутбук
  Enter        положить посылку на стол
  Пробел       сканировать штрихкод
  1–4          выбор варианта в диалоге
  Esc          пауза

СИСТЕМНЫЕ ТРЕБОВАНИЯ
  Windows 10/11, Chrome или Edge, 4 ГБ ОЗУ, ~10 МБ на диске.

ССЫЛКИ
  Исходники и новые версии: https://github.com/igorrais82/pvz-smena
  Веб-версия: https://igorrais82.github.io/pvz-smena/

Лицензия: код и графика — собственная работа автора.
`;

fs.rmSync(PC, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(path.join(ROOT, 'game'), path.join(outDir, 'game'), { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
writeUtf16(path.join(outDir, 'Запустить ПВЗ.vbs'), VBS);
fs.writeFileSync(path.join(outDir, 'Запустить ПВЗ.cmd'), CMD, 'utf8');
writeUtf8Bom(path.join(outDir, 'README.txt'), README);

const zip1 = path.join(DIST, 'PVZ-Smena-' + version + '-win64.zip');
const zip2 = path.join(DIST, 'PVZ-Smena-win64.zip');
const info = zipDir(outDir, zip1, folder);
fs.copyFileSync(zip1, zip2);
console.log('PC: ' + folder + ' (' + info.files + ' файлов) → dist/' + path.basename(zip1) +
  ' (' + Math.round(info.bytes / 1024) + ' КБ)');
