#!/usr/bin/env python3
"""standardize_navbars.py - Standardize navbar across all pages."""
from __future__ import annotations
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MARKER = "<!-- TWK_NAV_V1 -->"

CANONICAL_NAV = """<!-- TWK_NAV_V1 -->
<style id="twk-nav-v1-css">
.twk-nav-v1{position:sticky!important;top:0!important;z-index:9999!important;background:rgba(5,5,10,.94)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)!important;margin:0!important;width:100%!important;display:block!important}
.twk-nav-v1-inner{max-width:1480px!important;margin:0 auto!important;padding:14px 26px!important;display:flex!important;align-items:center!important;gap:14px!important;flex-wrap:nowrap!important;grid-template-columns:none!important}
.twk-nav-v1-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;flex-shrink:0}
.twk-nav-v1-brand img{width:38px;height:38px;border-radius:8px;display:block}
.twk-nav-v1-links{display:flex;align-items:center;gap:2px;flex-wrap:nowrap;margin-left:auto;white-space:nowrap}
.twk-nav-v1-links a{position:relative;padding:10px 14px;border-radius:8px;color:rgba(230,230,240,.82);text-decoration:none;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;line-height:1;transition:color .22s ease,background .22s ease,transform .2s ease;white-space:nowrap}
.twk-nav-v1-links a:hover{background:rgba(255,255,255,.05);color:#fff;transform:translateY(-1px)}
.twk-nav-v1-links a.is-active{color:#fff;background:transparent}
.twk-nav-v1-links a.is-active::after{content:"";position:absolute;left:18%;right:18%;bottom:2px;height:2px;border-radius:2px;background:linear-gradient(90deg,#ff2d87,#ffb454);box-shadow:0 0 10px rgba(255,45,135,.55)}
.twk-nav-v1-links a.twk-nav-v1-hot{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(255,180,84,.18));color:#ff7eb0;border:1px solid rgba(255,45,135,.45);padding-left:14px}
.twk-nav-v1-links a.twk-nav-v1-hot:hover{background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14;border-color:transparent;box-shadow:0 6px 18px rgba(255,45,135,.4)}
.twk-nav-v1-live{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:rgba(30,224,143,.1);border:1px solid rgba(30,224,143,.5);color:#1ee08f;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;flex-shrink:0;margin-left:6px}
.twk-nav-v1-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#1ee08f;box-shadow:0 0 8px #1ee08f;animation:twkLivePulse 2s ease-in-out infinite}
@keyframes twkLivePulse{0%,100%{opacity:1}50%{opacity:.4}}
@media(max-width:1180px){.twk-nav-v1-links a{padding:8px 10px;font-size:10.5px;letter-spacing:.08em}}
@media(max-width:1024px){.twk-nav-v1-links{gap:0}.twk-nav-v1-links a{padding:8px 8px;font-size:10px;letter-spacing:.06em}.twk-nav-v1-live{font-size:9px;padding:5px 9px}}
@media(max-width:880px){.twk-nav-v1-inner{padding:10px 14px;gap:8px}.twk-nav-v1-links{gap:1px;overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap;padding-bottom:2px}.twk-nav-v1-links a{padding:7px 8px;font-size:10px}.twk-nav-v1-brand span{display:none}.twk-nav-v1-live{display:none}}
/* Defensive thumb backgrounds */
.twerkhub-pl-thumb,.vthumb,.rk-thumb,.twerkhub-fp-thumb,.twerkhub-club-thumb{background:linear-gradient(135deg,#1a0a1f 0%,#2a0f3d 50%,#0a0a14 100%)!important}
.twerkhub-pl-thumb img,.vthumb img,.rk-thumb img,.twerkhub-fp-thumb img,.twerkhub-club-thumb img{background:transparent}
</style>
<nav class="twk-nav-v1" aria-label="Primary" data-twk-nav-v1>
  <div class="twk-nav-v1-inner">
    <a class="twk-nav-v1-brand" href="/" aria-label="Twerkhub · home">
      <img src="/logo-twerkhub.png" alt="Twerkhub" width="38" height="38" decoding="async">
      <span>TWERKHUB · EST. 2018</span>
    </a>
    <div class="twk-nav-v1-links">
      <a href="/" data-nav="home">HOME</a>
      <a href="/#private-models" data-nav="exclusive">EXCLUSIVE</a>
      <a href="/#playlists" data-nav="playlists">PLAYLISTS</a>
      <a href="/creators.html" data-nav="creators">CREATORS</a>
      <a href="/alexia-video-packs.html" class="twk-nav-v1-hot" data-nav="hotpacks">HOT PACKS</a>
      <a href="/community.html" data-nav="community">COMMUNITY</a>
      <a href="/membership.html" data-nav="membership">MEMBERSHIP</a>
      <a href="/account.html" data-nav="account">MY ACCOUNT</a>
      <a href="/profile.html" data-nav="profile">PROFILE</a>
    </div>
    <span class="twk-nav-v1-live" id="twk-nav-v1-live" aria-label="Live online count">LIVE <span id="twk-nav-v1-live-n">412</span></span>
  </div>
</nav>
<script>
(function(){
  // 1. Mark active nav link based on current path
  try{
    var p=location.pathname.replace(/\\/index\\.html$/,'/');
    var map={'/':'home','/creators.html':'creators','/community.html':'community','/membership.html':'membership','/account.html':'account','/profile.html':'profile','/alexia-video-packs.html':'hotpacks'};
    var key=map[p];
    if(p.indexOf('/playlist')===0)key='playlists';
    else if(p.indexOf('/creator/')===0||p.indexOf('/twerk-dancer/')===0)key='creators';
    if(key){var a=document.querySelector('.twk-nav-v1-links a[data-nav="'+key+'"]');if(a){a.classList.add('is-active');a.setAttribute('aria-current','page');}}
  }catch(e){}
  // 2. Live online count — random 380-460, breathes every 4-7s
  try{
    var n=document.getElementById('twk-nav-v1-live-n');
    if(n){
      var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);
      if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);
      n.textContent=v;
      function tick(){
        var d=Math.floor(Math.random()*5)-2;v=Math.max(300,Math.min(500,v+d));
        n.textContent=v;sessionStorage.setItem('twkLiveN',v);
        setTimeout(tick,4000+Math.random()*3000);
      }
      setTimeout(tick,4000);
    }
  }catch(e){}
  // 3. THUMB FIX: force every YouTube img out of lazy state immediately,
  //    so they always load — fixes the "black thumbnail" bug where lazy
  //    loading never triggered for off-screen-but-rendered cards.
  function eagerizeThumbs(){
    try{
      var imgs=document.querySelectorAll('img[loading="lazy"]');
      imgs.forEach(function(img){
        if(img.src && (img.src.indexOf('ytimg.com')!==-1 || img.src.indexOf('/logo-twerkhub')!==-1)){
          img.loading='eager';
          if(img.fetchPriority==='auto'||!img.fetchPriority)img.fetchPriority='high';
          // Re-trigger load if naturalWidth still 0 after a moment
          var s=img.src;
          if(!img.complete||img.naturalWidth===0){
            img.src='';
            img.src=s;
          }
        }
      });
    }catch(e){}
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',eagerizeThumbs);
  }else{
    eagerizeThumbs();
  }
  // Run again after 1s + 3s in case more imgs got injected by other scripts
  setTimeout(eagerizeThumbs,1000);
  setTimeout(eagerizeThumbs,3000);
})();
</script>
"""

NAV_PATTERNS = [
    re.compile(r'<nav\b[^>]*class="[^"]*\btwerkhub-topbar\b[^"]*"[^>]*>.*?</nav>\s*', re.DOTALL),
    re.compile(r'<nav\b[^>]*class="[^"]*\btwerkhub-pl-topbar\b[^"]*"[^>]*>.*?</nav>\s*', re.DOTALL),
    re.compile(r'<nav\b[^>]*class="[^"]*\bsite-nav-final\b[^"]*"[^>]*>.*?</nav>\s*', re.DOTALL),
    re.compile(r'<nav\b[^>]*class="[^"]*\bnavbar\b[^"]*"[^>]*>.*?</nav>\s*', re.DOTALL),
]

EXISTING_V1 = re.compile(r'<!-- TWK_NAV_V1 -->.*?</script>\s*', re.DOTALL)
ORPHAN_STYLE = re.compile(r'<style id="twk-nav-v1-css">.*?</style>\s*', re.DOTALL)
BODY_OPEN = re.compile(r'(<body\b[^>]*>)', re.IGNORECASE)
SKIP_PATTERNS = [re.compile(r'/auth-callback\.html$', re.IGNORECASE)]

def should_skip(path: Path) -> bool:
    rel = str(path.relative_to(ROOT)).replace('\\', '/')
    for pat in SKIP_PATTERNS:
        if pat.search(rel):
            return True
    try:
        size = path.stat().st_size
        if size < 2048:
            sample = path.read_text(encoding='utf-8', errors='replace')
            if re.search(r'http-equiv=["\']?refresh', sample, re.IGNORECASE):
                return True
    except Exception:
        pass
    return False

def standardize(path: Path, dry_run: bool = False) -> str:
    try:
        text = path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return f'error:{e}'
    if should_skip(path):
        return 'skipped'
    original = text
    text = EXISTING_V1.sub('', text)
    text = ORPHAN_STYLE.sub('', text)
    nav_removed = 0
    for pat in NAV_PATTERNS:
        new_text, n = pat.subn('', text)
        if n:
            nav_removed += n
            text = new_text
    m = BODY_OPEN.search(text)
    if not m:
        return 'no-body'
    insert_at = m.end()
    rest = text[insert_at:insert_at + 400]
    skip_match = re.match(r'\s*<a class="[^"]*skip[^"]*"[^>]*>.*?</a>\s*', rest, re.DOTALL)
    if skip_match:
        insert_at += skip_match.end()
    text = text[:insert_at] + '\n' + CANONICAL_NAV + '\n' + text[insert_at:]
    if text == original:
        return 'noop'
    if not dry_run:
        path.write_text(text, encoding='utf-8')
    return 'replaced' if nav_removed else 'inserted'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()
    files = sorted(ROOT.rglob('*.html'))
    files = [f for f in files if 'node_modules' not in f.parts]
    counts = {'replaced': 0, 'inserted': 0, 'skipped': 0, 'noop': 0, 'no-body': 0, 'error': 0}
    examples = {k: [] for k in counts}
    for i, path in enumerate(files):
        if args.limit and i >= args.limit:
            break
        try:
            res = standardize(path, dry_run=args.dry_run)
        except Exception as e:
            res = f'error:{e}'
        if res.startswith('error'):
            counts['error'] += 1
            if len(examples['error']) < 5:
                examples['error'].append(f'{path}: {res}')
        else:
            counts[res] = counts.get(res, 0) + 1
            if len(examples.get(res, [])) < 3:
                examples.setdefault(res, []).append(str(path.relative_to(ROOT)))
    print(f"Processed: {sum(counts.values())} files")
    for k, v in counts.items():
        print(f"  {k:>10}: {v}")
    for k, exs in examples.items():
        if exs and k != 'noop':
            print(f"  examples [{k}]: {exs[:3]}")
    if args.dry_run:
        print("\n[DRY RUN] No files written.")

if __name__ == '__main__':
    main()
