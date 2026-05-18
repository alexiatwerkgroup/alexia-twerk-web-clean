# Deep audit para encontrar el problema real

$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

Write-Host "DEEP AUDIT - Investigando problemas" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Analizar /best-twerk-dancers.html
Write-Host "1) Analizando /best-twerk-dancers.html..." -ForegroundColor Yellow
$file = "$projectRoot\best-twerk-dancers.html"
if (Test-Path $file) {
    $content = Get-Content -Path $file -Raw

    # Buscar redirecciones
    if ($content -match 'window\.location|document\.location|<meta.*refresh') {
        Write-Host "   WARNING: ENCONTRADA REDIRECCION!" -ForegroundColor Red
        $lines = Get-Content -Path $file
        $lineNum = 0
        foreach ($line in $lines) {
            $lineNum++
            if ($line -match 'window\.location|document\.location|<meta.*refresh') {
                Write-Host "   Line $lineNum : $line" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   OK - No hay redirecciones" -ForegroundColor Green
    }

    # Verificar si tiene contenido
    if ($content.Length -lt 100) {
        Write-Host "   WARNING: Archivo muy pequeno ($($content.Length) bytes)" -ForegroundColor Red
    } else {
        Write-Host "   OK - Archivo normal ($($content.Length) bytes)" -ForegroundColor Green
    }
}
Write-Host ""

# 2. Ver si /hot-models-influencers.html deberia existir
Write-Host "2) Buscando archivos con 'hot-models' o 'influencers'..." -ForegroundColor Yellow
$hotFiles = Get-ChildItem -Path $projectRoot -Filter "*hot*" -Recurse -ErrorAction SilentlyContinue
$influencerFiles = Get-ChildItem -Path $projectRoot -Filter "*influencer*" -Recurse -ErrorAction SilentlyContinue

if ($hotFiles) {
    Write-Host "   Archivos con 'hot':" -ForegroundColor Cyan
    foreach ($f in $hotFiles) {
        Write-Host "      - $($f.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "   No hay archivos con 'hot'" -ForegroundColor Red
}

if ($influencerFiles) {
    Write-Host "   Archivos con 'influencer':" -ForegroundColor Cyan
    foreach ($f in $influencerFiles) {
        Write-Host "      - $($f.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "   No hay archivos con 'influencer'" -ForegroundColor Red
}
Write-Host ""

# 3. Ver si /creator/alexia deberia existir
Write-Host "3) Buscando archivos con 'alexia' en /creator..." -ForegroundColor Yellow
$creatorPath = "$projectRoot\creator"
if (Test-Path $creatorPath) {
    $creatorFiles = Get-ChildItem -Path $creatorPath -Filter "*alexia*" -ErrorAction SilentlyContinue
    if ($creatorFiles) {
        Write-Host "   Encontrados:" -ForegroundColor Cyan
        foreach ($f in $creatorFiles) {
            Write-Host "      - $($f.Name)" -ForegroundColor White
        }
    } else {
        Write-Host "   No hay archivos con 'alexia'" -ForegroundColor Red
    }

    # Listar todos los archivos en creator/
    Write-Host "   Todos los archivos en /creator/:" -ForegroundColor Cyan
    $allCreators = Get-ChildItem -Path $creatorPath -Filter "*.html" | Select-Object -First 10
    foreach ($f in $allCreators) {
        Write-Host "      - $($f.Name)" -ForegroundColor White
    }
    $totalCreators = (Get-ChildItem -Path $creatorPath -Filter "*.html").Count
    Write-Host "   Total creator files: $totalCreators" -ForegroundColor Cyan
} else {
    Write-Host "   Carpeta /creator no existe!" -ForegroundColor Red
}
Write-Host ""

# 4. Ver si las URLs estan en sitemap
Write-Host "4) Verificando sitemap.xml..." -ForegroundColor Yellow
$sitemap = "$projectRoot\sitemap.xml"
if (Test-Path $sitemap) {
    $sitemapContent = Get-Content -Path $sitemap -Raw

    $urls = @(
        ("best-twerk-dancers.html", "/best-twerk-dancers.html"),
        ("hot-models-influencers.html", "/hot-models-influencers.html"),
        ("creator/alexia", "/creator/alexia")
    )

    foreach ($url in $urls) {
        $name = $url[0]
        $pattern = $url[1]
        if ($sitemapContent -match [regex]::Escape($pattern)) {
            Write-Host "   OK - $name ESTA EN SITEMAP" -ForegroundColor Green
        } else {
            Write-Host "   ERROR - $name FALTA EN SITEMAP" -ForegroundColor Red
        }
    }
}
Write-Host ""

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Investigacion completada" -ForegroundColor Green
