@echo off
cd /d "C:\Users\User\.verdent\verdent-projects\inventory-system"
start "" /min "C:\Program Files\nodejs\node.exe" server.js
timeout /t 3 /nobreak >nul
start "" /min "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run preview -- --host --port 3003
timeout /t 4 /nobreak >nul
start "" "http://localhost:3003"
