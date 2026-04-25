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
.twk-nav-v1{position:sticky!important;top:0!important;z-index:9999!important;background:rgba(5,5,10,.92)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)!important;margin:0!important;width:100%!important;display:block!important}
.twk-nav-v1-inner{max-width:1320px!important;margin:0 auto!important;padding:12px 22px!important;display:flex!important;align-items:center!important;gap:22px!important;flex-wrap:wrap!important;grid-template-columns:none!important}
.twk-nav-v1-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.twk-nav-v1-brand img{width:36px;height:36px;border-radius:8px;display:block}
.twk-nav-v1-links{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-left:auto}
.twk-nav-v1-links a{padding:8px 14px;border-radius:999px;color:#cdcdd9;text-decoration:none;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;letter-spacing:.02em;transition:background .2s,color .2s}
.twk-nav-v1-links a:hover{background:rgba(255,255,255,.06);color:#fff}
.twk-nav-v1-links a.is-active{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(157,78,221,.18));color:#fff;border:1px solid rgba(255,45,135,.35)}
.twk-nav-v1-links a.twk-nav-v1-hot{background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14;font-weight:900;box-shadow:0 6px 18px rgba(255,45,135,.32)}
.twk-nav-v1-links a.twk-nav-v1-hot:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(255,45,135,.45)}
@media(max-width:780px){.twk-nav-v1-inner{padding:10px 14px;gap:10px}.twk-nav-v1-links{gap:2px;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap;margin-left:0;padding-bottom:2px}.twk-nav-v1-links a{padding:7px 11px;font-size:12px;white-space:nowrap;flex-shrink:0}.twk-nav-v1-brand{font-size:10px}}
.twerkhub-pl-thumb,.vthumb,.rk-thumb,.twerkhub-fp-thumb,.twerkhub-club-thumb{background:linear-gradient(135deg,#1a0a1f 0%,#2a0f3d 50%,#0a0a14 100%)!important}
.twerkhub-pl-thumb img,.vthumb img,.rk-thumb img,.twerkhub-fp-thumb img,.twerkhub-club-thumb img{background:transparent}
</style>
<nav class="twk-nav-v1" aria-label="Primary" data-twk-nav-v1>
  <div class="twk-nav-v1-inner">
    <a class="twk-nav-v1-brand" href="/" aria-label="Twerkhub · home">
      <img src="/logo-twerkhub.png" alt="Twerkhub" width="36" height="36" decoding="async">
      <span>TWERKHUB · Est. 2018</span>
    </a>
    <div class="twk-nav-v1-links">
      <a href="/" data-nav="home">Home</a>
      <a href="/#private-models" data-nav="exclusive">Exclusive</a>
      <a href="/#playlists" data-nav="playlists">Playlists</a>
      <a href="/creators.html" data-nav="creators">Creators</a>
      <a href="/alexia-video-packs.html" class="twk-nav-v1-hot" data-nav="hotpacks">Hot Packs</a>
      <a href="/community.html" data-nav="community">Community</a>
      <a href="/membership.html" data-nav="membership">Membership</a>
      <a href="/account.html" data-nav="account">My Account</a>
      <a href="/profile.html" data-nav="profile">Profile</a>
    </div>
  </div>
</nav>
<script>
(function(){
  try{
    var p=location.pathname.replace(/\\/index\\.html$/,'/');
    var map={'/':'home','/creators.html':'creators','/community.html':'community','/membership.html':'membership','/account.html':'account','/profile.html':'profile','/alexia-video-packs.html':'hotpacks'};
    var key=map[p];
    if(p.indexOf('/playlist')===0)key='playlists';
    else if(p.indexOf('/creator/')===0||p.indexOf('/twerk-dancer/')===0)key='creators';
    if(key){var a=document.querySelector('.twk-nav-v1-links a[data-nav="'+key+'"]');if(a){a.classList.add('is-active');a.setAttribute('aria-current','page');}}
  }catch(e){}
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
