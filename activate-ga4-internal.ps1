# activate-ga4-internal.ps1 - 2026-05-08
# Activa el flag de internal traffic + push del código.
#
# Lo que hace:
#   1. Push del cambio de index.html (gtag con detección de flag)
#   2. Imprime el bookmarklet listo para copy-paste
#   3. Imprime los 5 clicks exactos en GA4 con TU IP ya rellenada

$ErrorActionPreference = "Continue"
$IP = "181.21.19.236"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  GA4 INTERNAL TRAFFIC · auto-setup" -ForegroundColor Cyan
Write-Host "  IP: $IP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1) Push código
Write-Host "[1/3] Pushing code (index.html + GA4 docs)..." -ForegroundColor Yellow
git add index.html GA4-INTERNAL-TRAFFIC-SETUP.md activate-ga4-internal.ps1
git commit -m "feat(ga4): internal traffic detection - localStorage/cookie flag in gtag config + setup docs with IP 181.21.19.236"
git push
Write-Host ""

# 2) Bookmarklet
Write-Host "[2/3] BOOKMARKLET para flagear tu browser:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Abrí tu browser → barra de favoritos → click derecho → Add bookmark" -ForegroundColor White
Write-Host "  2. Name: 'GA4 Internal ON'" -ForegroundColor White
Write-Host "  3. URL: pegá EXACTAMENTE este código (incluye 'javascript:' al inicio):" -ForegroundColor White
Write-Host ""
Write-Host "javascript:(function(){localStorage.setItem('twk_internal_traffic','1');document.cookie='twk_internal=1; path=/; max-age=31536000; samesite=lax';alert('GA4 INTERNAL ACTIVADO\nVisitas a alexiatwerkgroup.com excluidas');})();" -ForegroundColor Green
Write-Host ""
Write-Host "  4. Save → andá a alexiatwerkgroup.com → click el bookmark UNA VEZ" -ForegroundColor White
Write-Host "  5. Listo - tu browser queda flageado para SIEMPRE (hasta que limpies cookies)" -ForegroundColor White
Write-Host ""

# 3) Pasos GA4
Write-Host "[3/3] GA4 ADMIN - 5 clicks exactos (con TU IP ya rellenada):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. https://analytics.google.com/" -ForegroundColor White
Write-Host "  2. Admin (engranaje abajo izquierda)" -ForegroundColor White
Write-Host "  3. Property -> Data streams -> click 'alexiatwerkgroup.com'" -ForegroundColor White
Write-Host "  4. Configure tag settings -> Show all -> Define internal traffic -> Create" -ForegroundColor White
Write-Host "  5. Llenar:" -ForegroundColor White
Write-Host "       Rule name:       My Internal Traffic" -ForegroundColor Green
Write-Host "       traffic_type:    internal" -ForegroundColor Green
Write-Host "       Match type:      IP address equals" -ForegroundColor Green
Write-Host "       Value:           $IP" -ForegroundColor Green
Write-Host "  6. Create" -ForegroundColor White
Write-Host ""
Write-Host "  Y DESPUES, activar el filter:" -ForegroundColor White
Write-Host "  7. Admin -> Data filters -> 'Internal Traffic'" -ForegroundColor White
Write-Host "  8. Cambiar de Inactive a TESTING (NO ACTIVE TODAVIA)" -ForegroundColor White
Write-Host "  9. Save" -ForegroundColor White
Write-Host ""
Write-Host "  10. Verifica en GA4 -> Reports -> Realtime que tus visitas" -ForegroundColor White
Write-Host "      aparecen con traffic_type=internal" -ForegroundColor White
Write-Host ""
Write-Host "  11. Solo despues de verificar, cambiar TESTING -> ACTIVE" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DONE. Layer 1 (IP) + Layer 2 (cookie) + Layer 3 (filter)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
