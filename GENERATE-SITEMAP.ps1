$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$domain = "https://alexiatwerkgroup.com"
$today = (Get-Date).ToString("yyyy-MM-dd")

$xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' + "`n"
$xmlContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n"

# URLs base
$baseUrls = @(
    @{url = "/"; priority = "1.0"}
    @{url = "/en/"; priority = "0.9"}
    @{url = "/es/playlist/"; priority = "0.9"}
)

foreach ($item in $baseUrls) {
    $xmlContent += "  <url>`n"
    $xmlContent += "    <loc>$domain$($item.url)</loc>`n"
    $xmlContent += "    <lastmod>$today</lastmod>`n"
    $xmlContent += "    <changefreq>weekly</changefreq>`n"
    $xmlContent += "    <priority>$($item.priority)</priority>`n"
    $xmlContent += "  </url>`n"
}

# Encontrar todos los HTML
Get-ChildItem -Path $projectRoot -Filter "*.html" -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Replace($projectRoot, "").Replace("\", "/")

    if ($relativePath -ne "/index.html") {
        $urlPath = $relativePath.Replace("/index.html", "/")
        $priority = "0.7"

        if ($urlPath -match "^/[^/]+\.html$") { $priority = "0.8" }
        if ($urlPath -match "creator|playlist") { $priority = "0.6" }

        $xmlContent += "  <url>`n"
        $xmlContent += "    <loc>$domain$urlPath</loc>`n"
        $xmlContent += "    <lastmod>$today</lastmod>`n"
        $xmlContent += "    <changefreq>weekly</changefreq>`n"
        $xmlContent += "    <priority>$priority</priority>`n"
        $xmlContent += "  </url>`n"
    }
}

$xmlContent += "</urlset>"

$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$projectRoot\sitemap.xml", $xmlContent, $utf8NoBOM)

Write-Host "Sitemap creado exitosamente"
