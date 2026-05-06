@echo off
cd /d "C:\Users\User\.verdent\verdent-projects\inventory-system"
start "" "C:\Program Files\nodejs\node.exe" server.js
timeout /t 3 /nobreak > nul
start "" "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev -- --port 3003 --host

