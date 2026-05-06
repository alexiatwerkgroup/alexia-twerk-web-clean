# fix-pills.ps1 — 2026-05-06 (rewritten clean, no regex callbacks)
# Aplica:
#   1. CSS LIVE pill carpet-bomb (28x130 identico a TOKENS)
#   2. membership.html: 891 -> live counter, 3 doors -> 4 doors
#   3. Inyeccion del widget Chaturbate affiliate en TODAS las paginas
#   4. Cache bump CSS/JS
# Idempotente. Uso:
#   .\fix-pills.ps1            (aplica)
#   .\fix-pills.ps1 -Push      (aplica + commit + push)

param([switch]$Push)
$ErrorActionPreference = "Stop"

function Read-U8 ($p) { [IO.File]::ReadAllText($p, [Text.UTF8Encoding]::new($false)) }
function Write-U8 ($p, $c) {
    $c = $c -replace "`r`n", "`n"
    [IO.File]::WriteAllText($p, $c, [Text.UTF8Encoding]::new($false))
}

Write-Host ""
Write-Host "=== TWERKHUB FIX PILLS + MEMBERSHIP + CB PROMO ===" -ForegroundColor Magenta
Write-Host "cwd: $(Get-Location)"
Write-Host ""

if (-not (Test-Path "index.html") -or -not (Test-Path "assets")) {
    Write-Host "ERROR: corre desde la raiz del repo (donde esta index.html)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# FIX 1: CSS LIVE pill carpet-bomb (append con marker para idempotencia)
# ============================================================================
Write-Host "[1/4] CSS LIVE pill carpet-bomb..." -ForegroundColor Cyan
$cssPath = "assets\twerkhub-ph-theme.css"
$css = Read-U8 $cssPath

$marker = "/* TWK-CB-CARPET-BOMB-2026-05-06 */"
$newCss = "`n`n" + $marker + "`n" `
    + "body.twerkhub-ph-theme .twk-nav-v1-live,`n" `
    + "body.twerkhub-ph-theme #twk-nav-v1-live {`n" `
    + "  height: 28px !important;`n" `
    + "  min-width: 130px !important;`n" `
    + "  box-sizing: border-box !important;`n" `
    + "  padding: 0 12px !important;`n" `
    + "  line-height: 1 !important;`n" `
    + "  display: inline-flex !important;`n" `
    + "  align-items: center !important;`n" `
    + "  justify-content: center !important;`n" `
    + "  flex-shrink: 0 !important;`n" `
    + "  white-space: nowrap !important;`n" `
    + "  gap: 7px !important;`n" `
    + "}`n"

if ($css.Contains($marker)) {
    Write-Host "      ya parcheado (idempotente)" -ForegroundColor Green
} else {
    $css = $css.TrimEnd() + $newCss
    Write-U8 $cssPath $css
    Write-Host "      OK: LIVE pill ahora 28x130 con !important al final del CSS" -ForegroundColor Green
}

# ============================================================================
# FIX 2: membership.html (891 -> live counter, 3 doors -> 4 doors)
# ============================================================================
Write-Host "[2/4] membership.html..." -ForegroundColor Cyan
$mbhPath = "membership.html"
if (Test-Path $mbhPath) {
    $html = Read-U8 $mbhPath
    $changed = $false

    $oldStat = '<div class="mbh__stat"><span class="dot"></span>891 members online · 3 doors below</div>'
    $newStat = '<div class="mbh__stat"><span class="dot"></span><span id="mbh-members">412</span> MEMBERS ONLINE · 4 DOORS BELOW</div>'

    if ($html.Contains($oldStat)) {
        $html = $html.Replace($oldStat, $newStat)
        Write-Host "      OK: hero stat sincronizado + 4 doors" -ForegroundColor Green
        $changed = $true
    } elseif ($html.Contains('id="mbh-members"')) {
        Write-Host "      hero stat ya parcheado" -ForegroundColor Green
    } else {
        Write-Host "      WARN: no encontre el texto exacto del stat" -ForegroundColor Yellow
    }

    $oldJs = "try{var n=document.getElementById('twk-nav-v1-live-n');if(n){var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);n.textContent=v;function tick(){var d=Math.floor(Math.random()*5)-2;v=Math.max(300,Math.min(500,v+d));n.textContent=v;sessionStorage.setItem('twkLiveN',v);setTimeout(tick,4000+Math.random()*3000);}setTimeout(tick,4000);}}catch(e){}"
    $newJs = "try{var n=document.getElementById('twk-nav-v1-live-n');var m=document.getElementById('mbh-members');var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);if(n)n.textContent=v;if(m)m.textContent=v;function tick(){var d=Math.floor(Math.random()*5)-2;v=Math.max(300,Math.min(500,v+d));if(n)n.textContent=v;if(m)m.textContent=v;sessionStorage.setItem('twkLiveN',v);setTimeout(tick,4000+Math.random()*3000);}if(n||m)setTimeout(tick,4000);}catch(e){}"

    if ($html.Contains("getElementById('mbh-members')")) {
        Write-Host "      JS inline ya extendido" -ForegroundColor Green
    } elseif ($html.Contains($oldJs)) {
        $html = $html.Replace($oldJs, $newJs)
        Write-Host "      OK: JS inline sincroniza LIVE pill + mbh-members" -ForegroundColor Green
        $changed = $true
    } else {
        Write-Host "      WARN: no encontre el JS exacto del nav" -ForegroundColor Yellow
    }

    if ($changed) { Write-U8 $mbhPath $html }
} else {
    Write-Host "      WARN: membership.html no existe" -ForegroundColor Yellow
}

# ============================================================================
# FIX 3: Inyeccion del widget Chaturbate affiliate en TODAS las paginas
# ============================================================================
Write-Host "[3/4] Widget Chaturbate affiliate..." -ForegroundColor Cyan
$cbScript = "assets\twerkhub-cb-promo.js"
if (-not (Test-Path $cbScript)) {
    Write-Host "      WARN: $cbScript no existe — saltando inyeccion" -ForegroundColor Yellow
} else {
    $loadLine = "  loadOnce('/assets/twerkhub-cb-promo.js?v=20260506-p1','twk-loader-cb-promo');"
    # Anchor: insertamos el loadOnce DESPUES de la linea de twerkhub-auth
    $anchor = "loadOnce('/assets/twerkhub-auth.js?v=20260426-p8','twk-loader-twerkhub-auth');"

    $injected = 0
    $skipped = 0
    $htmls = Get-ChildItem -Filter "*.html" -File
    foreach ($f in $htmls) {
        try {
            $h = Read-U8 $f.FullName
            if ($h.Contains("twk-loader-cb-promo")) {
                $skipped++
                continue
            }
            if ($h.Contains($anchor)) {
                $h = $h.Replace($anchor, "$anchor`n$loadLine")
                Write-U8 $f.FullName $h
                $injected++
            }
        } catch {}
    }
    Write-Host "      OK: inyectado en $injected HTMLs (skip $skipped ya tenian)" -ForegroundColor Green
}

# ============================================================================
# FIX 4: Cache bump (CSS p?? -> p29, JS pill-into-nav p?? -> p7)
# ============================================================================
Write-Host "[4/4] Cache bump..." -ForegroundColor Cyan
$bumped = 0
$htmls = Get-ChildItem -Filter "*.html" -File
foreach ($f in $htmls) {
    try {
        $c = Read-U8 $f.FullName
        $orig = $c
        $c = $c -replace 'twerkhub-ph-theme\.css\?v=20260506-p\d+', 'twerkhub-ph-theme.css?v=20260506-p29'
        $c = $c -replace 'twerkhub-pill-into-nav\.js\?v=20260506-p\d+', 'twerkhub-pill-into-nav.js?v=20260506-p7'
        if ($c -ne $orig) {
            Write-U8 $f.FullName $c
            $bumped++
        }
    } catch {}
}
Write-Host "      OK: $bumped HTMLs bumpeados" -ForegroundColor Green

# ============================================================================
# RESUMEN
# ============================================================================
Write-Host ""
Write-Host "=== Cambios aplicados. git diff --stat:" -ForegroundColor Magenta
git diff --stat 2>&1 | Select-Object -First 15

# ============================================================================
# GIT COMMIT + PUSH (opcional)
# ============================================================================
if ($Push) {
    Write-Host ""
    Write-Host "=== git add + commit + push ===" -ForegroundColor Cyan
    git add -A
    $msg = "fix(pill+membership): carpet-bomb LIVE/TOKENS 28x130 + sync members + 4 doors + add chaturbate affiliate widget"
    $commitOut = git commit -m $msg 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "commit OK, pushing..." -ForegroundColor Green
        git push
    } else {
        Write-Host $commitOut -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Para pushear directamente: .\fix-pills.ps1 -Push" -ForegroundColor Yellow
    Write-Host "O manualmente:" -ForegroundColor Yellow
    Write-Host "  git add -A"
    Write-Host '  git commit -m "fix(pill+membership): carpet-bomb pills + sync members + cb promo widget"'
    Write-Host "  git push"
}
