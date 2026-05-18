# push-everything.ps1 - TWERKHUB · One-shot push de TODOS los fixes pendientes
# 1) tt.html ya esta actualizado (PH style + LIVE pill removido + scroll fix)
# 2) Fix Telegram URL en 94 HTMLs
# 3) Fix i18n strings en 4 paginas /ja/ + /ko/
# 4) Fix redirect placeholders (5 folders -> _deleted/ + redirects 301)
# 5) Commit + push todo

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
# FASE 1 · Aplicar todos los fixes
# ════════════════════════════════════════════════════════════════════════
Log "FASE 1 · Fix Telegram URL en 94 HTMLs" "Magenta"
RunPython "fix-telegram-url.py"

Log "FASE 2 · Fix i18n strings en 4 paginas /ja/ + /ko/" "Magenta"
RunPython "fix-i18n-strings.py"

Log "FASE 3 · Fix 5 redirect placeholders (top-100, best-twerk-dancers, etc.)" "Magenta"
RunPython "fix-redirect-placeholders.py"

# ════════════════════════════════════════════════════════════════════════
# FASE 4 · Git add + commit + push
# ════════════════════════════════════════════════════════════════════════
Log "FASE 4 · git add -A" "Magenta"
git add -A

Log "FASE 4 · git commit"
$msg = "fix: tt.html PH style + remove dup LIVE + fix Telegram URL (94 pages) + i18n /ja/ /ko/ playlists + kill 5 redirect placeholders"
git commit -m $msg

Log "FASE 4 · git push"
git push

# ════════════════════════════════════════════════════════════════════════
# FIN
# ════════════════════════════════════════════════════════════════════════
$elapsed = (Get-Date) - $start
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [DONE] Push completado en $($elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "VERIFICACION POST-DEPLOY (~2 min despues):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1) Hard refresh en alexiatwerkgroup.com/tt (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "     - Ver el diseno PH/TWERKHUB 2.0 (negro + naranja brutal)" -ForegroundColor Gray
Write-Host "     - Solo 1 pill LIVE (en el hero, no en header)" -ForegroundColor Gray
Write-Host "     - Click 'Weekly drop email' CTA -> scrollea AL FORM ARRIBA" -ForegroundColor Gray
Write-Host ""
Write-Host "  2) Test Telegram link funciona:" -ForegroundColor White
Write-Host "     https://alexiatwerkgroup.com/tt -> click Telegram -> abre tu canal" -ForegroundColor Gray
Write-Host ""
Write-Host "  3) Test paginas /ja/ y /ko/ ya en idioma local:" -ForegroundColor White
Write-Host "     https://alexiatwerkgroup.com/ja/hottest-cosplay-fancam/" -ForegroundColor Gray
Write-Host "     https://alexiatwerkgroup.com/ko/hottest-cosplay-fancam/" -ForegroundColor Gray
Write-Host ""
Write-Host "  4) Test redirects 301 funcionan:" -ForegroundColor White
Write-Host "     https://alexiatwerkgroup.com/top-100-twerk-videos/ -> 301 a .html" -ForegroundColor Gray
Write-Host "     (sin la pagina 'Redirecting to...' fea)" -ForegroundColor Gray
Write-Host ""
