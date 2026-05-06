Dim objShell
Set objShell = CreateObject("WScript.Shell")

' Check & start backend
Dim oExec, output
Set oExec = objShell.Exec("cmd /c netstat -ano")
output = oExec.StdOut.ReadAll()

If InStr(output, ":3005") = 0 Then
    objShell.Run "cmd /c start """" /min ""C:\Program Files\nodejs\node.exe"" ""C:\Users\User\.verdent\verdent-projects\inventory-system\server.js""", 0, False
End If

WScript.Sleep 4000

' Check & start frontend
If InStr(output, ":3004") = 0 Then
    objShell.Run "cmd /c start """" /min ""C:\Program Files\nodejs\node.exe"" ""C:\Users\User\.verdent\verdent-projects\inventory-system\node_modules\vite\bin\vite.js"" preview --port 3004 --host", 0, False
End If