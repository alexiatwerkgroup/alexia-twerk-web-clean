# push-final-batch.ps1 - TWERKHUB · Push final de todos los cambios de la sesion
# Aplica scripts Python en orden, commit, push, y cleanup de cosplay-leaks.
#
# Uso:
#   cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean
#   .\push-final-batch.ps1

$ErrorActionPreference = "Continue"
$start = Get-Date

function Log($msg, $color = "Cyan") {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor $color
}

function RunPython($scriptName) {
    Log "Corriendo $scriptName --apply"
    python $scriptName --apply
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    [WARN] $scriptName exit code $LASTEXITCODE" -ForegroundColor Yellow
    }
}

# ════════════════════════════════════════════════════════════════════════
# FASE 1 · Propagar cambios HTML/CSS a las 100+ paginas
# ════════════════════════════════════════════════════════════════════════
Log "FASE 1 · Propagar cambios HTML/CSS" "Magenta"

RunPython "update-lang-switcher-style.py"
RunPython "unify-footer-brand.py"
RunPython "bump-css-cache.py"
RunPython "inject-telegram-cta.py"
RunPython "inject-email-capture.py"
RunPython "internal-linking-auto.py"

# ════════════════════════════════════════════════════════════════════════
# FASE 2 · Git add + commit + push
# ════════════════════════════════════════════════════════════════════════
Log "FASE 2 · git add -A" "Magenta"
git add -A

Log "FASE 2 · git commit"
$msg = "feat(growth): D1 email capture + telegram CTA + internal linking + lang-switcher pill + footer brand + kill pink lines + wrangler.toml"
git commit -m $msg

Log "FASE 2 · git push"
git push

# ════════════════════════════════════════════════════════════════════════
# FASE 3 · Cleanup /cosplay-fancam-leaks/ (auto-commit interno)
# ════════════════════════════════════════════════════════════════════════
Log "FASE 3 · kill-cosplay-fancam-leaks.py" "Magenta"
python kill-cosplay-fancam-leaks.py --apply

# ════════════════════════════════════════════════════════════════════════
# FIN
# ════════════════════════════════════════════════════════════════════════
$elapsed = (Get-Date) - $start
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [DONE] Push final completado en $($elapsed.TotalSeconds.ToString('F1')) segundos" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASOS DE VERIFICACION:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1) Esperar ~2 min para que Cloudflare Pages termine el deploy" -ForegroundColor White
Write-Host ""
Write-Host "  2) Test del endpoint /api/subscribe:" -ForegroundColor White
Write-Host '     curl -X POST https://alexiatwerkgroup.com/api/subscribe -H "Content-Type: application/json" -d ''{"email":"test@example.com","source":"verify"}''' -ForegroundColor Gray
Write-Host ""
Write-Host "  3) Verificar que el email quedo grabado:" -ForegroundColor White
Write-Host '     wrangler d1 execute twerkhub-subscribers --remote --command="SELECT * FROM subscribers"' -ForegroundColor Gray
Write-Host ""
Write-Host "  4) En el browser, hard refresh alexiatwerkgroup.com (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "     - Esperar 35s -> modal de email aparece" -ForegroundColor Gray
Write-Host "     - Footer/bio: nuevo CTA de Telegram (celeste)" -ForegroundColor Gray
Write-Host "     - No mas lineas rosa decorativas" -ForegroundColor Gray
Write-Host "     - Switcher de idiomas con gradiente pink->orange + chevron verde" -ForegroundColor Gray
Write-Host "     - Al final de cada pagina, seccion 'More from the archive' con 6 links" -ForegroundColor Gray
Write-Host ""
