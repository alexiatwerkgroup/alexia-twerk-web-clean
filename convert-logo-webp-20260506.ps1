# =====================================================
# Logo PNG -> WebP conversion - 2026-05-06
# Requires cwebp (winget install Google.Webp) or ImageMagick.
# =====================================================

$src = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\logo-twerkhub.png"
$dst = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\logo-twerkhub.webp"

if (!(Test-Path $src)) {
    Write-Host "ERROR: source not found: $src" -ForegroundColor Red
    exit 1
}

$origKb = [math]::Round((Get-Item $src).Length / 1KB, 1)
Write-Host "Original PNG: $origKb KB" -ForegroundColor Yellow

$cwebp = Get-Command cwebp -ErrorAction SilentlyContinue
if ($cwebp) {
    & cwebp -q 90 -m 6 $src -o $dst
} else {
    $magick = Get-Command magick -ErrorAction SilentlyContinue
    if ($magick) {
        & magick $src -quality 90 -define webp:method=6 $dst
    } else {
        Write-Host "ERROR: neither cwebp nor ImageMagick installed." -ForegroundColor Red
        Write-Host "Install via: winget install Google.Webp" -ForegroundColor Yellow
        Write-Host "Or use online tool: https://squoosh.app" -ForegroundColor Yellow
        exit 1
    }
}

if (!(Test-Path $dst)) {
    Write-Host "ERROR: conversion failed, $dst not created." -ForegroundColor Red
    exit 1
}

$newKb = [math]::Round((Get-Item $dst).Length / 1KB, 1)
$saved = [math]::Round($origKb - $newKb, 1)
$pct = [math]::Round((1 - ($newKb / $origKb)) * 100, 0)

Write-Host "WebP created: $newKb KB" -ForegroundColor Green
Write-Host "Saved: $saved KB ($pct%)" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: PNG kept as fallback. To use WebP in HTMLs:" -ForegroundColor Yellow
Write-Host "  Replace 'logo-twerkhub.png' with 'logo-twerkhub.webp' in <img> tags" -ForegroundColor Yellow
Write-Host "  KEEP og:image and twitter:image pointing to .png (Facebook/Twitter need PNG/JPG)" -ForegroundColor Yellow
