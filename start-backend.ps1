# Auto-restart backend script
$nodePath = "C:\Program Files\nodejs\node.exe"
$serverPath = "C:\Users\User\.verdent\verdent-projects\inventory-system\server.js"
$workDir = "C:\Users\User\.verdent\verdent-projects\inventory-system"

while ($true) {
    Write-Host "Starting backend..." -ForegroundColor Green
    
    $process = Start-Process -FilePath $nodePath -ArgumentList $serverPath -WorkingDirectory $workDir -PassThru -WindowStyle Hidden
    
    # Wait for process to exit
    $process.WaitForExit()
    
    Write-Host "Backend crashed! Restarting in 3 seconds..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
