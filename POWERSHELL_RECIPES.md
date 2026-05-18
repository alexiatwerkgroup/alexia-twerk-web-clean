# PowerShell recipes — copy-paste-safe

Canonical scripts that don't break HTML. Every script here:
- Uses `[IO.File]::WriteAllText` with `UTF8Encoding($false)` (no BOM).
- Excludes `_deleted/` and `.bak` files.
- Anchors on existing structural elements, NOT on plain `<head>` regex.

---

## 1. Bump cache buster on a single file across all HTMLs

```powershell
cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$NoBom = New-Object System.Text.UTF8Encoding($false)
$FILE = 'twk-tokens-v3'   # file basename without .js
$NEW = 'twk-tokens-v3.js?v=20260509-vNEW'  # full replacement
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    $new = [regex]::Replace($orig, [regex]::Escape($FILE) + '\.js\?v=[^"''\s>]+', $NEW)
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom) }
}
```

---

## 2. Bump MULTIPLE cache busters in one pass

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
$R = @(
    @('twk-tokens-v3\.js\?v=[^"''\s>]+',       'twk-tokens-v3.js?v=20260509-vNEW'),
    @('twerkhub-auth\.js\?v=[^"''\s>]+',       'twerkhub-auth.js?v=20260509-aNEW'),
    @('supabase-config\.js\?v=[^"''\s>]+',     'supabase-config.js?v=20260509-sNEW'),
    @('thumb-fallback\.js\?v=[^"''\s>]+',      'thumb-fallback.js?v=20260509-tNEW'),
    @('twk-guardian\.js\?v=[^"''\s>]+',        'twk-guardian.js?v=20260509-gNEW')
)
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    $new = $orig
    foreach ($p in $R) { $new = [regex]::Replace($new, $p[0], $p[1]) }
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom) }
}
```

---

## 3. Strip BOM from all HTMLs (unblocks pre-commit hook)

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
$fixed = 0
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | ForEach-Object {
    $bytes = [IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $text = [Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
        [IO.File]::WriteAllText($_.FullName, $text, $NoBom)
        $fixed++
    }
}
Write-Host "BOM stripped from $fixed files" -ForegroundColor Green
```

---

## 4. Inject a script tag as the FIRST element in `<head>` (SAFE anchor)

⚠️ Do NOT match plain `<head>` — it matches text inside CSS comments.
Anchor on a unique structural element, like the kill-script.

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
$newTag = '<script src="/assets/twk-guardian.js?v=20260509-g1"></script>'
$anchor = [regex]::new('(<script>\(function\(\)\{var F=''twk_killed_20260509_v2'';)', [Text.RegularExpressions.RegexOptions]::None)
$injected = 0
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    if ($orig.Contains('twk-guardian.js')) { return }   # already injected
    $new = $anchor.Replace($orig, "$newTag`r`n`$1", 1)
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom); $injected++ }
}
Write-Host "Injected in $injected files" -ForegroundColor Green
```

---

## 5. Dedupe injected blocks (recovery after a bad regex)

If a previous PowerShell over-matched and now you have duplicate kill-scripts
or duplicate emergency styles in some HTMLs:

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
$killPattern = [regex]::new('<script>\(function\(\)\{var F=''twk_killed_20260509_v2'';.*?\}\)\(\);</script>', [Text.RegularExpressions.RegexOptions]::Singleline)
$stylePattern = [regex]::new('<style>\.twerkhub-tokens-toast\{display:inline-flex!important;.*?</style>', [Text.RegularExpressions.RegexOptions]::Singleline)

Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    $new = $orig
    # Keep first kill-script, remove duplicates
    $m = $killPattern.Matches($new)
    if ($m.Count -gt 1) {
        $f = $m[0]
        $head = $new.Substring(0, $f.Index + $f.Length)
        $tail = $killPattern.Replace($new.Substring($f.Index + $f.Length), '')
        $new = $head + $tail
    }
    # Keep first emergency style, remove duplicates
    $m = $stylePattern.Matches($new)
    if ($m.Count -gt 1) {
        $f = $m[0]
        $head = $new.Substring(0, $f.Index + $f.Length)
        $tail = $stylePattern.Replace($new.Substring($f.Index + $f.Length), '')
        $new = $head + $tail
    }
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom) }
}
```

---

## 6. Replace a URL across all HTMLs (interlink fix)

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    $new = [regex]::Replace($orig, '/old-url/', '/new-url/')
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom) }
}
```

---

## 7. Project backup (3 locations + zip)

```powershell
$Project = "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$Today = (Get-Date -Format "yyyy-MM-dd")
$Label = "twerkhub-v8.0-$Today"
$Zip = "$Label.zip"
$Targets = @(
    "C:\Users\Claudio\Desktop\uploads",
    "C:\Users\Claudio\OneDrive\backups",
    "C:\Users\Claudio\Documents\backups"
)
foreach ($t in $Targets) {
    if (-not (Test-Path $t)) { New-Item -ItemType Directory -Path $t -Force | Out-Null }
}
$Staging = Join-Path $env:TEMP $Label
if (Test-Path $Staging) { Remove-Item $Staging -Recurse -Force }
New-Item -ItemType Directory -Path $Staging | Out-Null
robocopy $Project $Staging /E /XD ".git" "_deleted" "node_modules" ".vscode" /XF "*.bak" /NFL /NDL /NJH /NJS /NP /NS | Out-Null
$ZipPath = Join-Path $env:TEMP $Zip
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$Staging\*" -DestinationPath $ZipPath -CompressionLevel Optimal
foreach ($t in $Targets) {
    Copy-Item $ZipPath (Join-Path $t $Zip) -Force
    Write-Host "Saved: $t\$Zip"
}
Remove-Item $Staging -Recurse -Force
Remove-Item $ZipPath -Force
```

---

## 8. End-to-end deploy ritual

```powershell
cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
# 1. Bump cache busters (recipe #1 or #2)
# 2. Strip BOM (recipe #3) — only if you suspect any HTML got BOM
# 3. Commit and push
git add .
git commit -m "<message>"
git push
```

Cloudflare Pages auto-deploys on push (instant). User waits ~60s before
testing in incognito.

---

## 9. Anti-patterns (NEVER do these)

```powershell
# ❌ Plain <head> regex — matches CSS comment text
$new = $orig -replace '<head[^>]*>', '<head>NEW'

# ❌ Set-Content -Encoding UTF8 — writes BOM in Windows PowerShell 5
Get-Content x.html | Set-Content x.html -Encoding UTF8

# ❌ Replace-All in PowerShell native -replace operator
# (it's fine for simple cases but doesn't expose count / Singleline mode)
$new = $orig -replace 'pattern', 'replacement'

# ❌ Including _deleted/ in bulk operations
Get-ChildItem -Recurse -Filter "*.html"   # no exclusion → touches _deleted/
```
