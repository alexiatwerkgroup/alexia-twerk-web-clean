# Script to fix sitemap URLs to match actual file structure

$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$sitemapPath = "$projectRoot\sitemap.xml"

Write-Host "Fixing sitemap.xml..." -ForegroundColor Cyan
Write-Host ""

# Read the sitemap
$sitemapContent = Get-Content -Path $sitemapPath -Raw

# Count original entries
$originalCount = ([regex]::Matches($sitemapContent, '<url>')).Count
Write-Host "Original sitemap entries: $originalCount" -ForegroundColor Yellow

# Fix 1: Change /hot-models-influencers.html to /hot-models-influencers/
$sitemapContent = $sitemapContent -replace 'https://alexiatwerkgroup\.com/hot-models-influencers\.html', 'https://alexiatwerkgroup.com/hot-models-influencers/'
Write-Host "Fixed: /hot-models-influencers.html -> /hot-models-influencers/" -ForegroundColor Green

# Fix 2: Add /creator/alexia/ if it doesn't exist
if ($sitemapContent -notmatch 'https://alexiatwerkgroup\.com/creator/alexia/') {
    Write-Host "Adding: /creator/alexia/" -ForegroundColor Green

    # Find the closing </urlset> tag and add the new entry before it
    $creatorAlexiaEntry = @"
  <url>
    <loc>https://alexiatwerkgroup.com/creator/alexia/</loc>
    <lastmod>2026-05-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
"@

    $sitemapContent = $sitemapContent -replace '(</urlset>)', "$creatorAlexiaEntry`n`$1"
} else {
    Write-Host "Entry /creator/alexia/ already exists" -ForegroundColor Yellow
}

# Count final entries
$finalCount = ([regex]::Matches($sitemapContent, '<url>')).Count
Write-Host ""
Write-Host "Final sitemap entries: $finalCount" -ForegroundColor Cyan
Write-Host "Added entries: $($finalCount - $originalCount)" -ForegroundColor Green

# Save the fixed sitemap
$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($sitemapPath, $sitemapContent, $utf8NoBOM)

Write-Host ""
Write-Host "Sitemap fixed and saved!" -ForegroundColor Green
