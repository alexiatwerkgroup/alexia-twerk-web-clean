$ErrorActionPreference = "Continue"
$projRoot = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$logFile = Join-Path $projRoot "_deploy-log.txt"

function Log($msg) {
    $line = "[$(Get-Date -Format HH:mm:ss)] $msg"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

# limpiar log anterior
"" | Out-File -FilePath $logFile -Encoding UTF8

Log "INICIO deploy blindaje v5"
Log "Cambiando a directorio del proyecto..."
Set-Location $projRoot
Log "CWD: $(Get-Location)"

# Verificar git
$gitVersion = git --version 2>&1
Log "git version: $gitVersion"

# Status
Log "=== git status ==="
$status = git status --porcelain 2>&1
Log "$status"

if (-not $status) {
    Log "Nada que commitear. Saliendo."
    exit 0
}

Log "=== git add . ==="
git add . 2>&1 | ForEach-Object { Log $_ }

Log "=== git commit ==="
git commit -m "blindaje v5: auto-hero, clean badges, force playVideo, sweep iframes" 2>&1 | ForEach-Object { Log $_ }

Log "=== git push ==="
git push 2>&1 | ForEach-Object { Log $_ }

Log "=== git log -1 (ultimo commit) ==="
git log -1 --oneline 2>&1 | ForEach-Object { Log $_ }

# Cloudflare purge si hay vars
$token = [Environment]::GetEnvironmentVariable("CF_API_TOKEN", "User")
if (-not $token) { $token = [Environment]::GetEnvironmentVariable("CF_API_TOKEN", "Machine") }
$zone  = [Environment]::GetEnvironmentVariable("CF_ZONE_ID", "User")
if (-not $zone) { $zone = [Environment]::GetEnvironmentVariable("CF_ZONE_ID", "Machine") }

if (-not $token -or -not $zone) {
    Log "CF_API_TOKEN / CF_ZONE_ID NO seteados. Purga manual desde dashboard."
} else {
    Log "Purgando Cloudflare via API..."
    try {
        $headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
        $body = @{
            files = @(
                "https://alexiatwerkgroup.com/assets/twk-thumb-to-video.js",
                "https://alexiatwerkgroup.com/assets/twk-blindaje-style.css",
                "https://alexiatwerkgroup.com/creators-latam.html",
                "https://alexiatwerkgroup.com/creators-colombia.html",
                "https://alexiatwerkgroup.com/creators-greece.html",
                "https://alexiatwerkgroup.com/creators-moscow.html",
                "https://alexiatwerkgroup.com/creators-russia.html",
                "https://alexiatwerkgroup.com/creators-seoul.html",
                "https://alexiatwerkgroup.com/creators-taipei.html",
                "https://alexiatwerkgroup.com/creators-usa.html",
                "https://alexiatwerkgroup.com/",
                "https://alexiatwerkgroup.com/playlist/"
            )
        } | ConvertTo-Json -Depth 5
        $resp = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache" -Method Post -Headers $headers -Body $body
        Log "Cloudflare resp: $($resp | ConvertTo-Json -Depth 5)"
    } catch {
        Log "ERROR purge: $_"
    }
}

Log "FIN deploy."
