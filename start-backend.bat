@echo off
taskkill /F /IM node.exe /FI "WINDOWTITLE eq backend" 2>nul
start "" /B "C:\Program Files\nodejs\node.exe" "C:\Users\User\.verdent\verdent-projects\inventory-system\server.js"