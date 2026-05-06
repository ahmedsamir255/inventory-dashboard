# Auto-restart frontend script
$nodePath = "C:\Program Files\nodejs\node.exe"
$frontendPath = "C:\Users\User\.verdent\verdent-projects\inventory-system\frontend-server.mjs"
$workDir = "C:\Users\User\.verdent\verdent-projects\inventory-system"

while ($true) {
    Write-Host "Starting frontend..." -ForegroundColor Green
    
    $process = Start-Process -FilePath $nodePath -ArgumentList $frontendPath -WorkingDirectory $workDir -PassThru -WindowStyle Hidden
    
    $process.WaitForExit()
    
    Write-Host "Frontend crashed! Restarting in 3 seconds..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
