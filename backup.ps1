$src = "C:\Users\User\.verdent\verdent-projects\inventory-system\db.json"
$dst = "C:\Users\User\Desktop\Alsaif-Backup"
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$file = "$dst\db_backup_$date.json"

if (Test-Path $src) {
    Copy-Item $src $file
    # Keep only last 30 backups
    $files = Get-ChildItem $dst -Filter "db_backup_*.json" | Sort-Object LastWriteTime -Descending
    if ($files.Count -gt 30) { $files | Select-Object -Skip 30 | Remove-Item -Force }
    Write-Host "Backup saved: $file"
} else {
    Write-Host "db.json not found!"
}
