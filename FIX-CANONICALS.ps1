# Script para encontrar y arreglar canonicals rotos
# Busca todas las URLs con canonical a "s-alexiatwerkgroup.com" y las cambia a "alexiatwerkgroup.com"

$projectRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

# Arrays para tracking
$filesWithBrokenCanonicals = @()
$filesFixed = @()

Write-Host "Buscando canonicals rotos en: $projectRoot" -ForegroundColor Cyan
Write-Host ""

# Buscar todos los archivos HTML
$htmlFiles = Get-ChildItem -Path $projectRoot -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw

    # Buscar canonicals rotos (s-alexiatwerkgroup.com)
    if ($content -match 's-alexiatwerkgroup\.com') {
        $filesWithBrokenCanonicals += $file.FullName

        # Mostrar el archivo y la línea del canonical
        $lines = Get-Content -Path $file.FullName
        $lineNumber = 0
        foreach ($line in $lines) {
            $lineNumber++
            if ($line -match 's-alexiatwerkgroup\.com') {
                Write-Host "BROKEN CANONICAL FOUND:" -ForegroundColor Red
                Write-Host "   File: $($file.FullName)" -ForegroundColor Yellow
                Write-Host "   Line $lineNumber : $line" -ForegroundColor White
                Write-Host ""

                # Arreglar la línea
                $newContent = $content -replace 's-alexiatwerkgroup\.com', 'alexiatwerkgroup.com'

                # Guardar el archivo arreglado
                $utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
                [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8NoBOM)

                $filesFixed += $file.FullName
                Write-Host "FIXED!" -ForegroundColor Green
                Write-Host "   Changed: s-alexiatwerkgroup.com to alexiatwerkgroup.com" -ForegroundColor Green
                Write-Host ""
            }
        }
    }
}

# Resumen
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Archivos con canonicals rotos encontrados: $($filesWithBrokenCanonicals.Count)" -ForegroundColor Yellow
Write-Host "Archivos arreglados: $($filesFixed.Count)" -ForegroundColor Green
Write-Host ""

if ($filesFixed.Count -gt 0) {
    Write-Host "CANONICALS ARREGLADOS:" -ForegroundColor Green
    foreach ($file in $filesFixed) {
        Write-Host "   - $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Todos los canonicals rotos han sido arreglados!" -ForegroundColor Green
