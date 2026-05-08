# setup-d1-auto.ps1 - TWERKHUB · One-shot D1 setup automated
# Asume que wrangler ya esta instalado (npm i -g wrangler)
#
# Uso:
#   cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean
#   .\setup-d1-auto.ps1
#
# Si PowerShell te bloquea por execution policy, antes corre:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  TWERKHUB · Auto setup D1 (Cloudflare email capture)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------
# 1) Verificar wrangler instalado
# ------------------------------------------------------------------
$wranglerVersion = wrangler --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: wrangler no esta instalado. Corre primero:" -ForegroundColor Red
    Write-Host "  npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] wrangler instalado: $wranglerVersion" -ForegroundColor Green

# ------------------------------------------------------------------
# 2) Verificar login
# ------------------------------------------------------------------
Write-Host ""
Write-Host "Verificando login a Cloudflare..." -ForegroundColor Cyan
$whoami = wrangler whoami 2>&1 | Out-String
if ($whoami -match "not authenticated|You are not authenticated|not logged in") {
    Write-Host "No estas logueado. Abriendo browser para auth..." -ForegroundColor Yellow
    Write-Host "  → En el browser, clickea 'Allow' y cerra la pestania." -ForegroundColor Yellow
    wrangler login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: login fallo." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Ya estas logueado." -ForegroundColor Green
    Write-Host $whoami
}

# ------------------------------------------------------------------
# 3) Crear D1 (o reusar si existe)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "Creando D1 database 'twerkhub-subscribers'..." -ForegroundColor Cyan

$createOutput = wrangler d1 create twerkhub-subscribers 2>&1 | Out-String
Write-Host $createOutput

$dbId = $null

# Extraer database_id del output (puede venir entre comillas dobles o simples)
if ($createOutput -match 'database_id\s*=\s*"([0-9a-fA-F\-]+)"') {
    $dbId = $matches[1]
    Write-Host "[OK] Database creada. ID: $dbId" -ForegroundColor Green
}
elseif ($createOutput -match 'already exists|name already taken|D1_ERROR.*already') {
    Write-Host "Database ya existe. Buscandola en el listado..." -ForegroundColor Yellow
    $listOutput = wrangler d1 list 2>&1 | Out-String
    Write-Host $listOutput
    # Buscar la linea que contenga twerkhub-subscribers y extraer su uuid
    $listOutput -split "`n" | ForEach-Object {
        if ($_ -match 'twerkhub-subscribers' -and $_ -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
            $dbId = $matches[1]
        }
    }
    if ($dbId) {
        Write-Host "[OK] Database existente encontrada. ID: $dbId" -ForegroundColor Green
    } else {
        Write-Host "ERROR: no pude extraer el ID. Pegame este output completo:" -ForegroundColor Red
        Write-Host $listOutput
        exit 1
    }
}
else {
    Write-Host "ERROR: no pude crear la database. Pegame el output de arriba." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------
# 4) Actualizar wrangler.toml con el database_id real
# ------------------------------------------------------------------
$tomlPath = Join-Path $PSScriptRoot "wrangler.toml"
if (-not (Test-Path $tomlPath)) {
    Write-Host "ERROR: wrangler.toml no existe en $tomlPath" -ForegroundColor Red
    exit 1
}

$tomlContent = Get-Content $tomlPath -Raw
$tomlContent = $tomlContent -replace 'database_id\s*=\s*"PASTE_DATABASE_ID_HERE"', "database_id = `"$dbId`""
$tomlContent = $tomlContent -replace 'database_id\s*=\s*"[0-9a-fA-F\-]+"', "database_id = `"$dbId`""
[System.IO.File]::WriteAllText($tomlPath, $tomlContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "[OK] wrangler.toml actualizado con el database_id real" -ForegroundColor Green

# ------------------------------------------------------------------
# 5) Aplicar el schema en remoto (production D1)
# ------------------------------------------------------------------
Write-Host ""
Write-Host "Aplicando schema SQL en la D1 productiva..." -ForegroundColor Cyan

$schemaPath = Join-Path $PSScriptRoot "d1-subscribers-schema.sql"
if (-not (Test-Path $schemaPath)) {
    Write-Host "ERROR: d1-subscribers-schema.sql no existe en $schemaPath" -ForegroundColor Red
    exit 1
}

wrangler d1 execute twerkhub-subscribers --remote --file="$schemaPath" --yes
if ($LASTEXITCODE -ne 0) {
    # Si falla, probablemente la tabla ya existe. Verificamos.
    Write-Host "Schema apply tuvo errores, verificando si la tabla ya existe..." -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# 6) Verificar que la tabla 'subscribers' existe
# ------------------------------------------------------------------
Write-Host ""
Write-Host "Verificando que la tabla 'subscribers' existe..." -ForegroundColor Cyan
$verifyOutput = wrangler d1 execute twerkhub-subscribers --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='subscribers'" 2>&1 | Out-String
Write-Host $verifyOutput

if ($verifyOutput -match 'subscribers') {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  [OK] D1 LISTA. Tabla 'subscribers' creada en remoto." -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Database ID: $dbId" -ForegroundColor White
    Write-Host "wrangler.toml actualizado con el binding 'DB' apuntando a esta D1." -ForegroundColor White
    Write-Host ""
    Write-Host "PROXIMO PASO: correr el push final." -ForegroundColor Yellow
} else {
    Write-Host "ERROR: no pude verificar la tabla. Pegame el output." -ForegroundColor Red
}
