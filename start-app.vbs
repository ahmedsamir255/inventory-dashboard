Dim objShell
Set objShell = CreateObject("WScript.Shell")

' Check if backend running on 3005
Dim oExec, output
Set oExec = objShell.Exec("cmd /c netstat -ano | findstr :3005")
output = oExec.StdOut.ReadAll()

' Start backend if not running
If InStr(output, "3005") = 0 Then
    objShell.Run "cmd /c start /min node ""C:\Users\User\.verdent\verdent-projects\inventory-system\server.js""", 0, False
    WScript.Sleep 3000
End If

' Check if frontend running on 3004
Dim oExec2, output2
Set oExec2 = objShell.Exec("cmd /c netstat -ano | findstr :3004")
output2 = oExec2.StdOut.ReadAll()

' Start frontend if not running
If InStr(output2, "3004") = 0 Then
    objShell.Run "cmd /c start /min node ""C:\Users\User\.verdent\verdent-projects\inventory-system\node_modules\vite\bin\vite.js"" preview --port 3004 --host", 0, False
    WScript.Sleep 4000
End If

' Open in Chrome
objShell.Run "chrome.exe http://localhost:3004", 1, False