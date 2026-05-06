# =====================================================
# Logo PNG -> WebP conversion · 2026-05-06
# Usa cwebp (de WebP utils, Google) o ImageMagick si esta instalado.
# Si no tenes ninguno: instalar webp tools rapido con winget:
#   winget install Google.Webp
# =====================================================

$src = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\logo-twerkhub.png"
$dst = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\logo-twerkhub.webp"

if (!(Test-Path $src)) {
    Write-Host "ERROR: no encuentro $src" -ForegroundColor Red
    exit 1
}

$origMb = [math]::Round((Get-Item $src).Length / 1KB, 1)
Write-Host "Original PNG: $origMb KB" -ForegroundColor Yellow

# Probar cwebp primero
$cwebp = Get-Command cwebp -ErrorAction SilentlyContinue
if ($cwebp) {
    & cwebp -q 90 -m 6 $src -o $dst
} else {
    # Fallback: ImageMagick
    $magick = Get-Command magick -ErrorAction SilentlyContinue
    if ($magick) {
        & magick $src -quality 90 -define webp:method=6 $dst
    } else {
        Write-Host "ERROR: ni cwebp ni ImageMagick instalados." -ForegroundColor Red
        Write-Host "Instalar con: winget install Google.Webp" -ForegroundColor Yellow
        Write-Host "O alternativa online: https://squoosh.app" -ForegroundColor Yellow
        exit 1
    }
}

if (!(Test-Path $dst)) {
    Write-Host "ERROR: conversion fallo, no se creo $dst" -ForegroundColor Red
    exit 1
}

$newMb = [math]::Round((Get-Item $dst).Length / 1KB, 1)
$saved = [math]::Round($origMb - $newMb, 1)
$pct = [math]::Round((1 - ($newMb / $origMb)) * 100, 0)

Write-Host "WebP creado: $newMb KB" -ForegroundColor Green
Write-Host "Ahorro: $saved KB ($pct%)" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: el PNG queda como fallback. Para usar el WebP en HTMLs:" -ForegroundColor Yellow
Write-Host "  Reemplazar referencias 'logo-twerkhub.png' por 'logo-twerkhub.webp'" -ForegroundColor Yellow
Write-Host "  o usar <picture><source srcset='logo.webp'><img src='logo.png'></picture>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para mantener compatibilidad con OG/Twitter (que requieren PNG/JPG)," -ForegroundColor Yellow
Write-Host "dejar OG/Twitter apuntando al .png — solo cambiar img tags HTML al .webp." -ForegroundColor Yellow
