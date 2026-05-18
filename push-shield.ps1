#!/usr/bin/env pwsh
Set-Location $PSScriptRoot
Write-Host "Actualizando Video Shield en GitHub..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Paso 1: Estado actual" -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Paso 2: Agregando cambios..." -ForegroundColor Yellow
git add playlist/index.html
Write-Host "OK - Archivo agregado"

Write-Host ""
Write-Host "Paso 3: Realizando commit..." -ForegroundColor Yellow
git commit -m "Update video shield script version to v20260516-clean - Force reload from CDN"

Write-Host ""
Write-Host "Paso 4: Haciendo push a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "COMPLETADO!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Los cambios se han publicado a GitHub."
Write-Host "Cloudflare iniciara la reconstruccion automaticamente."
Write-Host ""
Write-Host "Espera 1-2 minutos y luego recarga la pagina."
Write-Host ""
pause
