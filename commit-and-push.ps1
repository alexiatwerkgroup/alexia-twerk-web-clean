#!/usr/bin/env powershell
# -*- coding: utf-8 -*-

Set-Location "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

Write-Host "Git status actual:" -ForegroundColor Cyan
git status

Write-Host "`nAgregando TODOS los cambios..." -ForegroundColor Green
git add -A

Write-Host "`nVerificando cambios staged:" -ForegroundColor Cyan
git status

Write-Host "`nHaciendo commit con los 4 tiers (TIER 03 VIP $39.99 / 15,000 tokens)..." -ForegroundColor Green
git commit -m "Fix: Restore all 4 membership tiers to #playlists - TIER 03 VIP now displays with 39.99/15000 tokens"

Write-Host "`nPusheando a GitHub main..." -ForegroundColor Green
git push origin main

Write-Host "`n========================" -ForegroundColor Yellow
Write-Host "Deploy en progreso!" -ForegroundColor Green
Write-Host "Cloudflare Pages re-buildendo automáticamente..." -ForegroundColor Cyan
Write-Host "Verifica https://alexiatwerkgroup.com/#playlists en 2-3 minutos" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow
