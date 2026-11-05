param(
  [string]$Source = $env:TWK_NOVINHAS_SOURCE,
  [string]$Output = (Join-Path $PSScriptRoot '..\novinhas\catalog.json')
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Source)) { throw 'Pass the collection folder with -Source when rebuilding the local inventory.' }
$excluded = @('_PRESERVAR_ANTES_DE_BORRAR_DELETE_20261103', '_DUPLICADOS_20261031')
$videoExt = @('.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.wmv', '.mpg', '.mpeg', '.3gp', '.m2ts', '.ts')
$roots = @('-10 videos', '+20 videos')
$folders = [System.Collections.Generic.List[object]]::new()
$videoTotal = 0

foreach ($rootName in $roots) {
  $rootPath = Join-Path $Source $rootName
  if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) { continue }
  foreach ($folder in Get-ChildItem -LiteralPath $rootPath -Directory) {
    if ($excluded -contains $folder.Name) { continue }
    $files = @(Get-ChildItem -LiteralPath $folder.FullName -File -Recurse -ErrorAction SilentlyContinue)
    $videos = @($files | Where-Object { $videoExt -contains $_.Extension.ToLowerInvariant() })
    $count = $videos.Count
    $videoTotal += $count
    $names = ($videos | ForEach-Object { $_.BaseName }) -join ' '
    $tags = [System.Collections.Generic.List[string]]::new()
    if ($names -match '(?i)mini[\s_-]*saia|minissaia') { $tags.Add('mini-saia') }
    if ($names -match '(?i)calcinha|lingerie') { $tags.Add('calcinha') }
    if ($names -match '(?i)mostrando[\s_-]*demais|mostra[\s_-]*demais') { $tags.Add('mostrando-demais') }
    if ($names -match '(?i)safad') { $tags.Add('safadas') }
    $folders.Add([pscustomobject]@{ VideoCount = $count; Categories = @($tags) })
  }
}

$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
for ($i = $folders.Count - 1; $i -gt 0; $i--) {
  $bytes = [byte[]]::new(4)
  $random.GetBytes($bytes)
  $j = [BitConverter]::ToUInt32($bytes, 0) % ($i + 1)
  $tmp = $folders[$i]; $folders[$i] = $folders[$j]; $folders[$j] = $tmp
}
$random.Dispose()
$records = @()
$genericNames = @('Novinha Tai', 'Chica Twerk', 'Brasileira Safada', 'Garota do Funk', 'Rainha do Rebolado', 'Dancarina do Brasil', 'Twerk Girl', 'Novinha do Baile', 'Morena do Funk', 'Garota Twerk')
$nameCounts = @{}
for ($i = 0; $i -lt $folders.Count; $i++) {
  $n = $folders[$i].VideoCount
  $range = if ($n -eq 0) { 'No videos' } elseif ($n -le 5) { '1-5 videos' } elseif ($n -le 20) { '6-20 videos' } elseif ($n -le 50) { '21-50 videos' } else { '50+ videos' }
  $label = $genericNames[$i % $genericNames.Count]
  if (-not $nameCounts.ContainsKey($label)) { $nameCounts[$label] = 0 }
  $nameCounts[$label]++
  $records += [pscustomobject]@{
    name = '{0} {1:D2}' -f $label, $nameCounts[$label]
    videoRange = $range
    categories = $folders[$i].Categories
    publicListing = $true
  }
}
$inventory = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  sourceLabel = 'Local inventory'
  folderCount = $folders.Count
  foldersWithVideos = @($folders | Where-Object VideoCount -gt 0).Count
  videoFiles = $videoTotal
  publicRecords = $records.Count
  records = $records
}
$json = $inventory | ConvertTo-Json -Depth 4 -Compress
$parent = Split-Path -Parent $Output
New-Item -ItemType Directory -Path $parent -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path (Resolve-Path $parent) (Split-Path -Leaf $Output)), $json, [System.Text.UTF8Encoding]::new($false))
Write-Output "Inventory totals: $($inventory.folderCount) folders; $($inventory.foldersWithVideos) folders with videos; $($inventory.videoFiles) video files. No names or source media exported."
