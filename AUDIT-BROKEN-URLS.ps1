# Script de AUDIT para encontrar URLs rotas y faltantes

$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

Write-Host "AUDIT DE URLs ROTAS Y FALTANTES" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. BUSCAR /best-twerk-dancers.html
Write-Host "1) Buscando /best-twerk-dancers.html..." -ForegroundColor Yellow
$bestTwerkFile = Get-Item -Path "$projectRoot\best-twerk-dancers.html" -ErrorAction SilentlyContinue
if ($bestTwerkFile) {
    Write-Host "   OK - EXISTE: $($bestTwerkFile.FullName)" -ForegroundColor Green
    $content = Get-Content -Path $bestTwerkFile.FullName -Raw
    if ($content -match 'redirect|location\.href|http-equiv.*refresh') {
        Write-Host "   WARNING: Archivo contiene redirección" -ForegroundColor Red
    }
} else {
    Write-Host "   ERROR - NO EXISTE" -ForegroundColor Red
}
Write-Host ""

# 2. BUSCAR /hot-models-influencers.html
Write-Host "2) Buscando /hot-models-influencers.html..." -ForegroundColor Yellow
$hotModelsFile = Get-Item -Path "$projectRoot\hot-models-influencers.html" -ErrorAction SilentlyContinue
if ($hotModelsFile) {
    Write-Host "   OK - EXISTE: $($hotModelsFile.FullName)" -ForegroundColor Green
} else {
    Write-Host "   ERROR - NO EXISTE" -ForegroundColor Red
}
Write-Host ""

# 3. BUSCAR /creator/alexia
Write-Host "3) Buscando /creator/alexia..." -ForegroundColor Yellow
$creatorAlexiaHtml = Get-Item -Path "$projectRoot\creator\alexia.html" -ErrorAction SilentlyContinue
$creatorAlexiaFolder = Get-Item -Path "$projectRoot\creator\alexia" -ErrorAction SilentlyContinue
if ($creatorAlexiaHtml) {
    Write-Host "   OK - EXISTE: $($creatorAlexiaHtml.FullName)" -ForegroundColor Green
} elseif ($creatorAlexiaFolder) {
    Write-Host "   OK - EXISTE (CARPETA): $($creatorAlexiaFolder.FullName)" -ForegroundColor Green
    $indexFile = Get-Item -Path "$($creatorAlexiaFolder.FullName)\index.html" -ErrorAction SilentlyContinue
    if ($indexFile) {
        Write-Host "      Contiene: index.html" -ForegroundColor Green
    }
} else {
    Write-Host "   ERROR - NO EXISTE" -ForegroundColor Red
}
Write-Host ""

# 4. BUSCAR canonicals rotos
Write-Host "4) Buscando canonicals a s-alexiatwerkgroup.com..." -ForegroundColor Yellow
$brokenCanonicalFiles = Get-ChildItem -Path $projectRoot -Filter "*.html" -Recurse | Where-Object {
    $content = Get-Content -Path $_.FullName -Raw
    $content -match 's-alexiatwerkgroup\.com'
}

if ($brokenCanonicalFiles.Count -gt 0) {
    Write-Host "   ERROR - ENCONTRADOS $($brokenCanonicalFiles.Count) archivos con canonicals rotos:" -ForegroundColor Red
    foreach ($file in $brokenCanonicalFiles) {
        Write-Host "      - $($file.Name)" -ForegroundColor Red
    }
} else {
    Write-Host "   OK - No hay canonicals rotos" -ForegroundColor Green
}
Write-Host ""

# 5. Verificar sitemap
Write-Host "5) Verificando sitemap.xml..." -ForegroundColor Yellow
$sitemapFile = Get-Item -Path "$projectRoot\sitemap.xml" -ErrorAction SilentlyContinue
if ($sitemapFile) {
    $sitemapContent = Get-Content -Path $sitemapFile.FullName
    Write-Host "   OK - Sitemap existe" -ForegroundColor Green

    # Contar URLs
    $urlCount = ($sitemapContent | Select-String -Pattern '<loc>' | Measure-Object).Count
    Write-Host "   Total URLs en sitemap: $urlCount" -ForegroundColor Cyan

    # Buscar URLs críticas en el sitemap
    $criticalUrls = @(
        "best-twerk-dancers",
        "hot-models-influencers",
        "creator/alexia",
        "creators-russia"
    )

    Write-Host "   URLs criticas:" -ForegroundColor Cyan
    foreach ($url in $criticalUrls) {
        if ($sitemapContent -match [regex]::Escape($url)) {
            Write-Host "      OK - $url en sitemap" -ForegroundColor Green
        } else {
            Write-Host "      ERROR - $url FALTA en sitemap" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ERROR - No existe sitemap.xml" -ForegroundColor Red
}
Write-Host ""

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "AUDIT COMPLETADO" -ForegroundColor Green
