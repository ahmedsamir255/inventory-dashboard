@echo off
cd /d "C:\Users\User\.verdent\verdent-projects\inventory-system"
start /min "" "C:\Program Files\nodejs\node.exe" server.js
timeout /t 3 /nobreak >nul
start /min "" "C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js preview --port 3004 --host