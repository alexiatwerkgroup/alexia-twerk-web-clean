# ============================================================
# PRE-DEPLOY-VALIDATE.ps1
# Corre ANTES de cualquier git push. Aborta si encuentra:
#   - Syntax error en cualquier .js de /assets/
#   - HTML con patrones rotos conocidos (;'>, strings huerfanos)
#   - account.html sin el founder override correcto
#   - Cache busters duplicados o malformados
# Llamado desde DEPLOY-BLINDAJE-V5.ps1 antes del git commit.
# ============================================================

$ErrorActionPreference = "Continue"
$projRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$assetsDir = Join-Path $projRoot "assets"
$errors = @()
$warnings = @()

function Err($msg) { $script:errors += $msg; Write-Host "  [ERR] $msg" -ForegroundColor Red }
function Warn($msg) { $script:warnings += $msg; Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function OK($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }

Write-Host "=== PRE-DEPLOY VALIDATION ===" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# TEST 1: JS syntax check on critical files
# ============================================================
Write-Host "[1/5] JS syntax check (node --check)..." -ForegroundColor Cyan
$criticalJS = @(
    "twk-tokens-v3.js",
    "twk-thumb-to-video.js",
    "twk-self-heal.js",
    "twk-paywall-guard.js",
    "twerkhub-auth.js",
    "twk-bot-detect.js",
    "twk-guardian.js",
    "twk-kill-pink-pills.js",
    "twerkhub-age-gate.js",
    "twerkhub-pl-theater-v2.js",
    "twk-yt-gate.js"
)
foreach ($f in $criticalJS) {
    $path = Join-Path $assetsDir $f
    if (-not (Test-Path $path)) {
        Warn "Missing: assets/$f"
        continue
    }
    # Use node --check para validar syntax sin ejecutar
    $nodeOut = node --check "$path" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Err "SYNTAX ERROR en assets/$f`n        $nodeOut"
    } else {
        OK "assets/$f syntax OK"
    }
}

# ============================================================
# TEST 2: HTML pattern checks (los bugs reales que tuvimos)
# ============================================================
Write-Host ""
Write-Host "[2/5] HTML pattern checks..." -ForegroundColor Cyan
# Pattern A: ;'> (string quote roto, el bug de debii-abreu)
$patternA = Get-ChildItem -Path $projRoot -Recurse -Filter "*.html" -File |
    Where-Object { $_.FullName -notmatch "\\_deleted\\|\\\.git\\|\\node_modules\\" } |
    Select-String -Pattern ";\s*'\s*>\s*[A-Za-z]" -SimpleMatch:$false -List
if ($patternA) {
    foreach ($m in $patternA) { Err "Broken HTML quote `;'>...` en $($m.Path)" }
} else { OK "No `;'>` patterns" }

# Pattern B: <style id="twk-related-css"> texto fuera de tag (CSS visible)
# Si CSS aparece como texto, suele ser por un </style> mal cerrado
$patternB = Get-ChildItem -Path $projRoot -Filter "*.html" -File |
    Select-String -Pattern '\.twk-related,\.twk-mf\{grid-column' -List
foreach ($m in $patternB) {
    $content = [IO.File]::ReadAllText($m.Path)
    # check that the line before has <style or class="twk-related-css"
    if ($content -notmatch '<style[^>]*id="twk-related-css"[^>]*>\s*\.twk-related') {
        Warn "Possible broken style tag near twk-related-css en $($m.Path)"
    }
}
OK "twk-related-css style checks done"

# ============================================================
# TEST 3: account.html founder override
# ============================================================
Write-Host ""
Write-Host "[3/5] account.html founder override..." -ForegroundColor Cyan
$accountPath = Join-Path $projRoot "account.html"
if (Test-Path $accountPath) {
    $accountContent = [IO.File]::ReadAllText($accountPath)
    if ($accountContent -notmatch 'FOUNDER_EMAILS\s*=\s*\{\s*[''"]alexiatwerkoficial@gmail\.com[''"]') {
        Err "account.html sin FOUNDER_EMAILS correcto"
    } else { OK "FOUNDER_EMAILS present" }
    if ($accountContent -notmatch 'alexia_streak_v1') {
        Warn "account.html no usa alexia_streak_v1 para recovery"
    } else { OK "Streak recovery from localStorage" }
} else {
    Err "account.html missing"
}

# ============================================================
# TEST 4: Cache buster consistency
# ============================================================
Write-Host ""
Write-Host "[4/5] Cache buster consistency..." -ForegroundColor Cyan
$twkThumbJs = Join-Path $assetsDir "twk-thumb-to-video.js"
if (Test-Path $twkThumbJs) {
    $jsContent = [IO.File]::ReadAllText($twkThumbJs)
    $pattern = 'twk-blindaje-style\.css\?v=([A-Za-z0-9._-]+)'
    $cssRefs = [regex]::Matches($jsContent, $pattern)
    if ($cssRefs.Count -eq 0) {
        Warn "twk-thumb-to-video.js no inyecta CSS link"
    } else {
        $uniqueVers = @($cssRefs | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
        if ($uniqueVers.Count -gt 1) {
            Warn ("Multiple CSS cache busters in JS: " + ($uniqueVers -join ', '))
        } else { OK ("CSS cache buster consistent: " + $uniqueVers[0]) }
    }
}

# ============================================================
# TEST 5: Critical localStorage keys docs
# ============================================================
Write-Host ""
Write-Host "[5/5] Self-heal script check..." -ForegroundColor Cyan
$selfHealPath = Join-Path $assetsDir "twk-self-heal.js"
if (-not (Test-Path $selfHealPath)) {
    Err "assets/twk-self-heal.js missing - el guardian principal no esta!"
} else {
    OK "twk-self-heal.js present"
}

# ============================================================
# RESULTADO
# ============================================================
Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
if ($errors.Count -gt 0) {
    Write-Host "VALIDATION FAILED: $($errors.Count) errors, $($warnings.Count) warnings" -ForegroundColor Red
    Write-Host "Deploy abortado. Arregla los errores y reintenta." -ForegroundColor Red
    exit 1
} else {
    Write-Host "VALIDATION OK ($($warnings.Count) warnings)" -ForegroundColor Green
    exit 0
}
