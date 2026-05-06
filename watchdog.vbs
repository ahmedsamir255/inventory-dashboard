Set objShell = CreateObject("WScript.Shell")
Set objHTTP = CreateObject("MSXML2.XMLHTTP")

nodePath = "C:\Program Files\nodejs\node.exe"
backendPath = "C:\Users\User\.verdent\verdent-projects\inventory-system\server.js"
frontendPath = "C:\Users\User\.verdent\verdent-projects\inventory-system\frontend-server.mjs"

Do While True
    ' Check backend on port 3005
    backendOK = False
    On Error Resume Next
    objHTTP.Open "GET", "http://localhost:3005/api/ping", False
    objHTTP.setRequestHeader "Connection", "close"
    objHTTP.Send
    If Err.Number = 0 And objHTTP.Status = 200 Then backendOK = True
    Err.Clear
    On Error GoTo 0

    If Not backendOK Then
        objShell.Run """" & nodePath & """ """ & backendPath & """", 0, False
    End If

    ' Check frontend on port 4173
    frontendOK = False
    On Error Resume Next
    objHTTP.Open "GET", "http://localhost:4173", False
    objHTTP.setRequestHeader "Connection", "close"
    objHTTP.Send
    If Err.Number = 0 And objHTTP.Status = 200 Then frontendOK = True
    Err.Clear
    On Error GoTo 0

    If Not frontendOK Then
        objShell.Run """" & nodePath & """ """ & frontendPath & """", 0, False
    End If

    WScript.Sleep 8000
Loop
