' Запуск игры «ПВЗ: Смена» в отдельном оконном режиме (без браузерной обвязки).
Option Explicit
Dim sh, fso, chrome, args, profile, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(chrome) Then
  chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If
If Not fso.FileExists(chrome) Then
  chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
End If
If Not fso.FileExists(chrome) Then
  chrome = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If
If Not fso.FileExists(chrome) Then
  MsgBox "Не найден Chrome или Edge. Установите браузер либо соберите Windows-версию игры.", 48, "ПВЗ: Смена"
  WScript.Quit 1
End If

profile = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\PVZ-Smena\app-profile"
args = " --app=""file:///C:/Projects/PVZ/game/index.html""" & _
       " --user-data-dir=""" & profile & """" & _
       " --window-size=1280,760" & _
       " --no-first-run --no-default-browser-check --disable-features=Translate" & _
       " --autoplay-policy=no-user-gesture-required" & _
       " --force-device-scale-factor=1"

cmd = """" & chrome & """" & args
sh.Run cmd, 1, False
