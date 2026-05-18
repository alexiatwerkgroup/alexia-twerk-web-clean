$PlaylistDir = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\playlist"
$GenericSnippet = "premium choreography, professional dancers, and exclusive content"
$Fixed = 0; $Skipped = 0

Get-ChildItem -Path $PlaylistDir -Filter "*.html" | Sort-Object Name | ForEach-Object {
    $file = $_.FullName; $name = $_.Name
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    if ($content -notmatch [regex]::Escape($GenericSnippet)) { $Skipped++; return }

    $titleMatch = [regex]::Match($content, '<title>([^<]+)</title>')
    $titleRaw = if ($titleMatch.Success) { $titleMatch.Groups[1].Value } else { "" }
    $subject = ($titleRaw -replace '\s*[|—]\s*(Replay.*|Twerkhub.*)$', '').Trim()
    if ($subject.Length -gt 80) { $subject = $subject.Substring(0, 80).TrimEnd() }
    if (-not $subject) { $subject = $name.Replace('.html','').Replace('-',' ') }

    $newDesc = "$subject — twerk choreography reference cut on Twerkhub. Watch the full performance, browse related videos and curated playlists."
    if ($newDesc.Length -gt 158) { $newDesc = $newDesc.Substring(0,155).TrimEnd() + "..." }

    $descPattern = '(<meta\s+name="description"\s+content=")([^"]*?)(")'
    $newContent = [regex]::Replace($content, $descPattern, { param($m) $m.Groups[1].Value + $newDesc + $m.Groups[3].Value })

    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "FIXED: $name" -ForegroundColor Green; $Fixed++
    } else { $Skipped++ }
}
Write-Host ""; Write-Host "DONE: $Fixed fixed, $Skipped skipped" -ForegroundColor Cyan
