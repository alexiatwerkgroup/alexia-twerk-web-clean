param(
  [string]$Repo = (Join-Path $PSScriptRoot '..'),
  [string]$Source = 'C:\Users\Claudio\Downloads\Tainara2'
)
$ErrorActionPreference = 'Stop'
$jenny = Join-Path $Repo 'jenny\index.html'
$targetDir = Join-Path $Repo 'tainara'
$target = Join-Path $targetDir 'index.html'
$html = Get-Content -Raw -Encoding utf8 -LiteralPath $jenny
$files = Get-ChildItem -LiteralPath $Source -Filter '*.mp4' | Sort-Object Name
if ($files.Count -eq 0) { throw "No se encontraron MP4 en $Source" }

function Get-Duration([string]$path) {
  $value = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 -- $path 2>$null
  $seconds = 0.0
  [double]::TryParse(($value | Select-Object -First 1), [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$seconds) | Out-Null
  return [math]::Round($seconds, 3)
}
function Format-Time([double]$seconds) {
  $total = [math]::Max(0, [int][math]::Round($seconds))
  return ('{0}:{1:00}' -f [math]::Floor($total / 60), ($total % 60))
}

$cards = New-Object System.Text.StringBuilder
$i = 0
foreach ($file in $files) {
  $i++
  $n = '{0:00}' -f $i
  $duration = Get-Duration $file.FullName
  $time = Format-Time $duration
  $card = @'
<article class="c long" id="v{0}" data-duration="{1}" data-n="{0}" data-pos="{2}"><div class="v"><video muted loop playsinline preload="none" poster="p/v{0}.jpg" data-src="p/v{0}.mp4"></video><span class="tag">PREVIEW - LOW RES</span><span class="fire">HOT</span><span class="lock">LOCK</span></div><div class="cb"><div class="k">TAINARA - #{0}</div><h3>Video {0}</h3><p>1 coin per started minute</p><div class="vt" data-n="{0}"><button class="up" aria-label="Like">Like</button><button class="dn" aria-label="Dislike">Dislike</button><span class="vp mono">-</span></div><button class="full">WATCH &amp; DOWNLOAD - ORIGINAL RESOLUTION</button></div></article>
'@
  $durationText = $duration.ToString('0.###', [Globalization.CultureInfo]::InvariantCulture)
  [void]$cards.Append(($card.Trim() -f $n, $durationText, $i))
}

$start = $html.IndexOf('<div class="grid" id="grid">')
if ($start -lt 0) { throw 'No se encontró el grid universal de Jenny' }
$end = $html.IndexOf('</div></div></section>', $start)
if ($end -lt 0) { throw 'No se encontró el cierre del catálogo universal' }
$prefix = $html.Substring(0, $start) + '<div class="grid" id="grid">'
$suffix = $html.Substring($end)
$html = $prefix + $cards.ToString() + $suffix
$html = $html.Replace('Jenny', 'Tainara').Replace('JENNY', 'TAINARA').Replace('jenny', 'tainara')
$html = $html.Replace('All <em>93 clips.</em>', 'All <em>96 videos.</em>')
$html = $html.Replace('93 clips', '96 videos')
$html = $html.Replace('93 Originals', '96 Originals')
$html = $html.Replace('All · 93', 'All · 96').Replace('Full videos · 63', 'Full videos · 96').Replace('Short clips · 30', 'Short clips · 0')
$html = $html.Replace('The pack · $99', '1 coin per started minute').Replace('63 clips · 50% OFF', '1 coin per started minute')
$html = $html.Replace('Full pack', 'Simple pricing').Replace('Best value', 'Universal pricing')
$html = [regex]::Replace($html, '(?s)<section class="tainara-promo".*?</section>', '')
$tainaraPricing = @'
<section id="pricing"><div class="w"><div class="kick mono">/ tainara pricing</div><h2>Choose your <em>video.</em></h2><div class="price"><div class="pc best"><span class="rib mono">⭐ TAINARA</span><div class="kick mono">Single video</div><div class="n">1<small>coin per started minute</small></div><p>Pay only for the time you choose. Watch and download the original resolution.</p><ul><li>✔ 96 full videos in the catalog</li><li>✔ Duration shown before purchase</li><li>✔ Same Binance payment and receipt flow as Lolita</li></ul><a class="vb" href="#pay" data-pay="coins"><span class="lk">🔒</span><span class="t"><b>Buy coins</b><i>Secure checkout · Verified Binance ID</i></span><img src="/tainara/p/binance.png" alt="Binance" width="56" height="54"></a></div></div><p class="bal" id="bal"></p></div></section>
'@
$html = [regex]::Replace($html, '(?s)<section id="pricing">.*?</section>', $tainaraPricing.Trim(), 1)
$html = $html.Replace('full $99 pack', 'the catalog')
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Set-Content -LiteralPath $target -Value $html -Encoding utf8
Write-Output "Generated $target with $($files.Count) videos from Jenny template"
