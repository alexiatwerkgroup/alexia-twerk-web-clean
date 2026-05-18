$PlaylistDir = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\playlist"
$UTF8NoBOM = [System.Text.UTF8Encoding]::new($false)
$Fixed = 0; $Skipped = 0

Get-ChildItem -Path $PlaylistDir -Filter "*.html" | ForEach-Object {
    $file = $_.FullName
    $bytes = [System.IO.File]::ReadAllBytes($file)
    # Check for UTF-8 BOM: 0xEF 0xBB 0xBF
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $noBOM = $bytes[3..($bytes.Length-1)]
        [System.IO.File]::WriteAllBytes($file, $noBOM)
        Write-Host "BOM removed: $($_.Name)" -ForegroundColor Green
        $Fixed++
    } else {
        $Skipped++
    }
}
Write-Host ""
Write-Host "DONE: $Fixed BOM removed, $Skipped already clean" -ForegroundColor Cyan
