#!/usr/bin/env powershell

# Script para commitear y pushear los cambios del index.html con los 4 tiers a GitHub

Set-Location "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

Write-Host "📋 Verificando estado de Git..." -ForegroundColor Cyan
git status

Write-Host "`n✅ Añadiendo cambios..." -ForegroundColor Green
git add index.html

Write-Host "`n📝 Creando commit..." -ForegroundColor Green
git commit -m "fix: restore TIER 03 VIP ($39.99/15,000 tokens) - 4 tiers now display on #playlists"

Write-Host "`n🚀 Pusheando a GitHub..." -ForegroundColor Green
git push origin main

Write-Host "`n✨ Deploy completado!" -ForegroundColor Yellow
Write-Host "Cloudflare Pages está re-buildendo automáticamente..." -ForegroundColor Cyan
