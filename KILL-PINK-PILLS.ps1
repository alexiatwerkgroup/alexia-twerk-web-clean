# =============================================================
# KILL-PINK-PILLS.ps1
# Elimina la pill "Paid content unlocks" y CUALQUIER pill rosa/magenta
# glowing similar en TODO el sitio. Tambien CSS-kill por si vienen de JS.
# =============================================================

cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$Root = $PWD.Path
$NoBom = New-Object System.Text.UTF8Encoding($false)

$killTextPatterns = @(
  'Paid content unlocks',
  'Paid content unlock',
  'paid-content-unlock',
  'unlock paid content',
  'Premium unlock',
  'Unlock premium'
)

function Remove-PillByText($html, $text){
  $esc = [regex]::Escape($text)
  $pat = '<(a|button|div|span)\b[^>]*>[\s\S]{0,800}?' + $esc + '[\s\S]{0,800}?</\1>'
  return [regex]::Replace($html, $pat, '', 'IgnoreCase')
}

$cssKill = @'
/* === KILL pink/magenta glowing pills (Anti, 2026-05-13) === */
.pill-paid-unlock,
.paid-content-unlock,
.cta-pill-pink,
[data-twk-pill="paid-unlock"],
a[href*="paid-content-unlock"],
button[data-pill="paid-unlock"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;}
.pill[style*="ff1c8e"],
.pill[style*="ff2d95"],
.pill[style*="ff0066"]{display:none!important;}
'@

$cssPath = Join-Path $Root "assets\twk-kill-pink-pills.css"
[IO.File]::WriteAllText($cssPath, $cssKill, $NoBom)
Write-Host "[OK] CSS kill creado" -ForegroundColor Green

$jsKill = @'
(function(){
  if(window.__twkPillKiller) return; window.__twkPillKiller = true;
  var BAD_TEXT = ['paid content unlocks','paid content unlock','unlock paid content','premium unlock','unlock premium'];
  function isBad(el){
    if(!el || el.nodeType !== 1) return false;
    var t = (el.innerText || el.textContent || '').trim().toLowerCase();
    if(!t || t.length > 60) return false;
    for(var i=0;i<BAD_TEXT.length;i++){
      if(t.indexOf(BAD_TEXT[i]) !== -1){
        var s = getComputedStyle(el);
        var br = parseFloat(s.borderRadius) || 0;
        var w = el.offsetWidth || 0;
        if(br >= 14 || w < 280) return true;
      }
    }
    return false;
  }
  function sweep(root){
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll('a,button,div,span') : [];
    for(var i=0;i<nodes.length;i++){
      if(isBad(nodes[i])){ try{ nodes[i].remove(); }catch(e){ nodes[i].style.display='none'; } }
    }
  }
  function init(){
    sweep(document);
    var obs = new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var m = muts[i];
        if(m.addedNodes && m.addedNodes.length){
          for(var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            if(n.nodeType === 1){
              if(isBad(n)){ try{ n.remove(); }catch(e){ n.style.display='none'; } }
              else { sweep(n); }
            }
          }
        }
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
  setTimeout(function(){ sweep(document); }, 1500);
  setTimeout(function(){ sweep(document); }, 4000);
})();
'@

$jsPath = Join-Path $Root "assets\twk-kill-pink-pills.js"
[IO.File]::WriteAllText($jsPath, $jsKill, $NoBom)
Write-Host "[OK] JS kill creado" -ForegroundColor Green

$Buster = "20260513-kill-pink-pills"
$linkTag = "<link rel=`"stylesheet`" href=`"/assets/twk-kill-pink-pills.css?v=$Buster`">"
$scriptTag = "<script src=`"/assets/twk-kill-pink-pills.js?v=$Buster`" defer></script>"

$cleaned = 0; $injected = 0
Get-ChildItem -Path $Root -Recurse -Filter "*.html" | Where-Object {
  $_.FullName -notmatch '\\_deleted\\' -and
  $_.FullName -notmatch '\.bak' -and
  $_.FullName -notmatch '\\node_modules\\'
} | ForEach-Object {
  $f = $_.FullName
  $o = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
  if(-not $o){ return }
  $n = $o
  foreach($t in $killTextPatterns){ $n = Remove-PillByText $n $t }
  if($n -notmatch 'twk-kill-pink-pills\.css'){
    if($n -match '</head>'){ $n = $n -replace '</head>', "$linkTag`r`n</head>" }
  } else {
    $n = [regex]::Replace($n, 'twk-kill-pink-pills\.css\?v=[^"''\s>]+', "twk-kill-pink-pills.css?v=$Buster")
  }
  if($n -notmatch 'twk-kill-pink-pills\.js'){
    if($n -match '</body>'){ $n = $n -replace '</body>', "$scriptTag`r`n</body>" }
  } else {
    $n = [regex]::Replace($n, 'twk-kill-pink-pills\.js\?v=[^"''\s>]+', "twk-kill-pink-pills.js?v=$Buster")
  }
  if($n -ne $o){
    [IO.File]::WriteAllText($f, $n, $NoBom)
    $injected++
    foreach($t in $killTextPatterns){ if($o -match [regex]::Escape($t)){ $cleaned++; break } }
  }
}

Write-Host "[OK] HTMLs con pill eliminada: $cleaned" -ForegroundColor Green
Write-Host "[OK] HTMLs con CSS+JS inyectado: $injected" -ForegroundColor Green

git add assets/twk-kill-pink-pills.css assets/twk-kill-pink-pills.js .
git commit -m "fix: kill 'Paid content unlocks' pill + global pink pill killer (CSS + JS MutationObserver) site-wide"
git push origin main
Write-Host "`nDONE - pill rosa eliminada en todo el sitio." -ForegroundColor Green
