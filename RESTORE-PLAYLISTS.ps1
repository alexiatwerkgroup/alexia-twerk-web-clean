# Script para restaurar playlists desde backup v6.0
# Preserva todos los cambios en otros archivos

$backupZip = "C:\Users\Claudio\AppData\Roaming\Claude\local-agent-mode-sessions\da4bbc4b-095a-4544-a6aa-aab44ac1ed2b\5a901b8b-f30d-481b-b397-e0cffc5cf462\local_b1286b60-c39f-4500-9c7e-09bbfce970c4\uploads\alexia-twerk-web-clean-v6.0-2026-05-14.zip"
$extractPath = "$env:TEMP\backup-v6-extract"
$projectPath = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$playlistDataDir = "$projectPath\_playlist_data"

Write-Host "[*] Restaurando playlists desde backup v6.0..." -ForegroundColor Cyan

# 1. Crear carpeta temporal y extraer backup
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
New-Item -ItemType Directory -Path $extractPath | Out-Null

Write-Host "[+] Extrayendo backup..." -ForegroundColor Yellow
Expand-Archive -Path $backupZip -DestinationPath $extractPath -Force

# 2. Buscar carpeta raiz dentro del ZIP
$contents = Get-ChildItem $extractPath
if ($contents.Count -eq 1 -and $contents[0].PSIsContainer) {
    $rootFolder = $contents[0].FullName
} else {
    $rootFolder = $extractPath
}

Write-Host "[OK] Backup extraido en: $rootFolder" -ForegroundColor Green

# 3. Buscar archivos de playlists en el backup
$backupPlaylistDataDir = Get-ChildItem -Path $rootFolder -Filter "_playlist_data" -Directory -Recurse | Select-Object -First 1

if ($backupPlaylistDataDir) {
    Write-Host "[OK] Encontrado directorio de playlists en backup" -ForegroundColor Green

    # 4. Copiar todos los JSON de playlists del backup
    $playlistFiles = Get-ChildItem -Path $backupPlaylistDataDir.FullName -Filter "playlist-data-*.json"

    Write-Host "[*] Restaurando $($playlistFiles.Count) playlists..." -ForegroundColor Yellow

    foreach ($file in $playlistFiles) {
        $destPath = Join-Path $playlistDataDir $file.Name
        Copy-Item -Path $file.FullName -Destination $destPath -Force
        Write-Host "    [OK] $($file.Name)" -ForegroundColor Green
    }

    Write-Host "`n[SUCCESS] Playlists restauradas exitosamente" -ForegroundColor Green

    # 5. Si existe playlist-data.js en el backup, tambien lo restauramos
    $backupAssets = Get-ChildItem -Path $rootFolder -Filter "assets" -Directory -Recurse | Select-Object -First 1
    if ($backupAssets) {
        $backupPlaylistDataJs = Join-Path $backupAssets.FullName "playlist-data.js"
        if (Test-Path $backupPlaylistDataJs) {
            $destJs = "$projectPath\assets\playlist-data.js"
            Copy-Item -Path $backupPlaylistDataJs -Destination $destJs -Force
            Write-Host "    [OK] assets/playlist-data.js" -ForegroundColor Green
        }
    }

    # 6. Limpiar carpeta temporal
    Remove-Item $extractPath -Recurse -Force

    Write-Host "`n[DONE] Restauracion completada" -ForegroundColor Green
    Write-Host "`n[INFO] Proximos pasos:" -ForegroundColor Cyan
    Write-Host "  1. git add _playlist_data/" -ForegroundColor Gray
    Write-Host "  2. git commit -m 'Restore all playlists from v6.0 backup'" -ForegroundColor Gray
    Write-Host "  3. git push" -ForegroundColor Gray

} else {
    Write-Host "[ERROR] No se encontro carpeta _playlist_data en el backup" -ForegroundColor Red
}
