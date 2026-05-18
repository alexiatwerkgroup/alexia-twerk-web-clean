$PlaylistDir = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\playlist"
$Fixed = 0; $Skipped = 0
$pattern = '\s*<link rel="alternate" hreflang="es" href="https://alexiatwerkgroup\.com/es/playlist/[^"]*">\r?\n?'

Get-ChildItem -Path $PlaylistDir -Filter "*.html" | Sort-Object Name | ForEach-Object {
    $file = $_.FullName; $name = $_.Name
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -notmatch 'hreflang="es".*es/playlist/') { $Skipped++; return }

    $newContent = [regex]::Replace($content, $pattern, '')

    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "FIXED: $name" -ForegroundColor Green; $Fixed++
    } else { Write-Host "SKIP: $name" -ForegroundColor Yellow; $Skipped++ }
}
Write-Host ""; Write-Host "DONE: $Fixed fixed, $Skipped skipped" -ForegroundColor Cyan
