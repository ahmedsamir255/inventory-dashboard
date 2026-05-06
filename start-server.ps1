$nodePath = "C:\Program Files\nodejs\node.exe"
$projPath = "C:\Users\User\.verdent\verdent-projects\inventory-system"

# Start backend
Start-Process -FilePath $nodePath -ArgumentList "server.js" -WorkingDirectory $projPath -WindowStyle Hidden

Start-Sleep -Seconds 3

# Start frontend
Start-Process -FilePath $nodePath -ArgumentList "`"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`" run dev -- --port 3003 --host" -WorkingDirectory $projPath -WindowStyle Hidden
