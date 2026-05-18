#!/usr/bin/env python3
"""
TWERKHUB · Internal Linking Engine
-----------------------------------
Injects a "Related videos" section into every detail page.
Each section contains 12 internal links: 8 same-playlist + 4 cross-playlist.

Idempotent — re-running replaces the existing block, never duplicates.
Marker: <!-- twk-related-block --> ... <!-- /twk-related-block -->

Source-of-truth for indexing: solves orphan-page problem so Google can
reach every detail page within 3 clicks via crawl paths from any other
detail page.
"""
import os
import re
import json
import random
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAYLISTS = {
    'playlist': {
        'label': 'Main archive',
        'kicker': 'Main archive · 577 cuts',
    },
    'cosplay-fancam-leaks': {
        'label': 'Cosplay Fancam Leaks',
        'kicker': 'Cosplay fancam · Taipei + Akihabara',
    },
    'korean-girls-kpop-twerk': {
        'label': 'Korean K-pop & Twerk',
        'kicker': 'K-pop choreo · Seoul scene',
    },
    'twerk-hub-leaks': {
        'label': 'Twerk Hub Leaks',
        'kicker': 'Studio cuts · choreography',
    },
    'latina-model-leaks': {
        'label': 'Latina Model Leaks',
        'kicker': 'Latin models · curated',
    },
    'try-on-hot-leaks': {
        'label': 'Try-On Hot Leaks',
        'kicker': 'VR · try-on · fashion',
    },
}

START = '<!-- twk-related-block -->'
END = '<!-- /twk-related-block -->'

def extract_meta(html, slug, playlist):
    """Extract video title + thumbnail from VideoObject JSON-LD."""
    title = None
    thumb = None
    m = re.search(r'<script type="application/ld\+json">(\{.*?"@type":"VideoObject".*?\})</script>', html, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            title = data.get('name')
            t = data.get('thumbnailUrl')
            if isinstance(t, list):
                thumb = t[0] if t else None
            elif isinstance(t, str):
                thumb = t
        except Exception:
            pass
    if not title:
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S | re.I)
        if h1:
            title = re.sub(r'<[^>]+>', '', h1.group(1)).strip()
    if not title:
        title = slug.replace('-', ' ').strip().title()
    if not thumb:
        # last-ditch: parse iframe src for video id
        ifr = re.search(r'youtube\.com/embed/([A-Za-z0-9_-]{11})', html)
        if ifr:
            thumb = f'https://i.ytimg.com/vi/{ifr.group(1)}/hqdefault.jpg'
    return title, thumb

def collect_pages():
    """Walk every playlist folder, return list of {playlist, slug, url, title, thumb}."""
    pages = []
    for pl_slug in PLAYLISTS:
        folder = ROOT / pl_slug
        if not folder.is_dir():
            continue
        for f in sorted(folder.glob('*.html')):
            if f.name == 'index.html':
                continue
            try:
                html = f.read_text(encoding='utf-8', errors='replace')
            except Exception:
                continue
            slug = f.stem
            url = f'/{pl_slug}/{f.name}'
            title, thumb = extract_meta(html, slug, pl_slug)
            pages.append({
                'playlist': pl_slug,
                'slug': slug,
                'url': url,
                'title': title,
                'thumb': thumb,
                'file': f,
            })
    return pages

def deterministic_pick(pool, current_slug, n):
    """Pick n items from pool, deterministic per current_slug for stable crawl paths."""
    pool = [p for p in pool if p['slug'] != current_slug]
    if len(pool) <= n:
        return pool[:]
    seed = int(hashlib.sha1(current_slug.encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    return rng.sample(pool, n)

def build_block(current_page, all_pages, by_pl):
    same = by_pl.get(current_page['playlist'], [])
    same_picks = deterministic_pick(same, current_page['slug'], 8)

    other_pl = [p for p in all_pages if p['playlist'] != current_page['playlist']]
    cross_picks = deterministic_pick(other_pl, current_page['slug'] + '_cross', 4)

    own_label = PLAYLISTS[current_page['playlist']]['label']

    items_same = ''.join(_card(p) for p in same_picks)
    items_cross = ''.join(_card(p) for p in cross_picks)

    return f'''{START}
<section class="twk-related" aria-label="Related videos" style="margin:48px auto;max-width:1180px;padding:0 20px">
  <div style="margin-bottom:18px">
    <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ff6fa8;margin-bottom:6px">More like this · {own_label}</div>
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(22px,3vw,32px);font-weight:900;color:#fff;line-height:1.2;margin:0">Related videos in this playlist</h2>
  </div>
  <div class="twk-related-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:32px">
    {items_same}
  </div>
  <div style="margin:24px 0 14px">
    <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ffb454;margin-bottom:6px">Cross-playlist · keep exploring</div>
    <h2 style="font-family:'Playfair Display',Georgia,serif;font-size:clamp(20px,2.6vw,28px);font-weight:900;color:#fff;line-height:1.2;margin:0">From other playlists</h2>
  </div>
  <div class="twk-related-grid twk-related-grid--cross" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
    {items_cross}
  </div>
  <nav class="twk-related-tags" aria-label="Browse playlists" style="margin-top:32px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
    <a href="/playlist/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Main archive</a>
    <a href="/cosplay-fancam-leaks/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Cosplay fancam</a>
    <a href="/korean-girls-kpop-twerk/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">K-pop twerk</a>
    <a href="/twerk-hub-leaks/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Studio leaks</a>
    <a href="/latina-model-leaks/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Latina models</a>
    <a href="/try-on-hot-leaks/" style="padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Try-on VR</a>
    <a href="/recent.html" style="padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(255,180,84,.18));border:1px solid rgba(255,45,135,.4);color:#ffb3d1;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;text-decoration:none">Recently added</a>
  </nav>
</section>
{END}'''

def _card(p):
    title_safe = (p['title'] or '').replace('"', '&quot;').replace('<', '&lt;')[:120]
    thumb = p['thumb'] or ''
    pl_label = PLAYLISTS[p['playlist']]['label']
    return f'''<a href="{p['url']}" class="twk-rcard" style="display:block;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-decoration:none;transition:all .2s ease" title="{title_safe}">
      <div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden">
        {f'<img src="{thumb}" alt="{title_safe}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/>' if thumb else '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a0b1f,#0a0a14)"></div>'}
      </div>
      <div style="padding:10px 12px 12px">
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:4px">{pl_label}</div>
        <div style="font-family:'Inter',sans-serif;font-size:13px;line-height:1.35;color:#f5f5fb;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{title_safe}</div>
      </div>
    </a>
    '''

def inject(file_path, html, block):
    if START in html and END in html:
        new_html = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda _: block, html, count=1, flags=re.S)
    else:
        # Insert before </body>
        if '</body>' in html:
            new_html = html.replace('</body>', block + '\n</body>', 1)
        else:
            new_html = html + '\n' + block
    if new_html != html:
        file_path.write_text(new_html, encoding='utf-8')
        return True
    return False

def main():
    print(f'[scan] root = {ROOT}')
    pages = collect_pages()
    print(f'[scan] {len(pages)} detail pages collected')

    by_pl = {}
    for p in pages:
        by_pl.setdefault(p['playlist'], []).append(p)
    for pl, items in by_pl.items():
        print(f'  - {pl}: {len(items)}')

    changed = 0
    for p in pages:
        try:
            html = p['file'].read_text(encoding='utf-8', errors='replace')
        except Exception as e:
            print(f'[ERR ] {p["file"]}: {e}')
            continue
        block = build_block(p, pages, by_pl)
        if inject(p['file'], html, block):
            changed += 1

    print(f'[done] {changed}/{len(pages)} pages updated with related-content block')

if __name__ == '__main__':
    main()
