Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & Chr(34) & "C:\Users\User\AppData\Roaming\npm\pm2.cmd" & Chr(34) & " resurrect""", 0, False
