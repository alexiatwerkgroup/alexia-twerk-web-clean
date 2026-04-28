#!/usr/bin/env python3
"""
TWERKHUB · Discovery Hub Generator
-----------------------------------
Builds /recent.html and /trending.html — static discovery hubs that
aggregate ALL detail pages and present them as cards. Linked from
homepage + footer to give Google a single short crawl path to every
page in the archive.

/recent.html   — sorted by file mtime (most recently created first), 200 cards
/trending.html — sorted by playlist + alphabetical (covers all 751)
"""
import os
import re
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://alexiatwerkgroup.com'
TODAY = datetime.date.today().isoformat()

PLAYLISTS = {
    'playlist': 'Main archive',
    'cosplay-fancam-leaks': 'Cosplay Fancam',
    'korean-girls-kpop-twerk': 'K-pop Twerk',
    'twerk-hub-leaks': 'Studio Leaks',
    'latina-model-leaks': 'Latina Models',
    'try-on-hot-leaks': 'Try-On VR',
}

GA4_ID = 'G-YSFR7FHCLS'

def collect_all():
    pages = []
    for pl in PLAYLISTS:
        folder = ROOT / pl
        if not folder.is_dir():
            continue
        for f in sorted(folder.glob('*.html')):
            if f.name == 'index.html':
                continue
            try:
                html = f.read_text(encoding='utf-8', errors='replace')
            except Exception:
                continue
            title, thumb, vid = None, None, None
            m = re.search(r'<script type="application/ld\+json">(\{[^<]*?"@type":"VideoObject"[^<]*?\})</script>', html)
            if m:
                try:
                    data = json.loads(m.group(1))
                    title = data.get('name')
                    t = data.get('thumbnailUrl')
                    if isinstance(t, list): thumb = t[0] if t else None
                    elif isinstance(t, str): thumb = t
                    embed = data.get('embedUrl', '')
                    vm = re.search(r'/embed/([A-Za-z0-9_-]{11})', embed or '')
                    if vm: vid = vm.group(1)
                except Exception:
                    pass
            if not title:
                h1 = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S | re.I)
                if h1: title = re.sub(r'<[^>]+>', '', h1.group(1)).strip()
            if not title: title = f.stem.replace('-', ' ').title()
            if not thumb and vid:
                thumb = f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg'
            mtime = f.stat().st_mtime
            pages.append({
                'pl': pl, 'pl_label': PLAYLISTS[pl],
                'url': f'/{pl}/{f.name}', 'title': title,
                'thumb': thumb or '', 'mtime': mtime,
                'slug': f.stem,
            })
    return pages

def build_card(p):
    title_safe = (p['title'] or '').replace('"', '&quot;').replace('<', '&lt;')[:140]
    return f'''<a href="{p['url']}" class="rh-card" title="{title_safe}">
      <div class="rh-thumb">
        {f'<img src="{p["thumb"]}" alt="{title_safe}" loading="lazy"/>' if p['thumb'] else ''}
      </div>
      <div class="rh-meta">
        <span class="rh-pl">{p['pl_label']}</span>
        <span class="rh-title">{title_safe}</span>
      </div>
    </a>'''

HEAD_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={ga4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{ga4}');</script>
<title>{title}</title>
<meta name="description" content="{description}"/>
<link rel="canonical" href="{canonical}"/>
<meta property="og:title" content="{title}"/>
<meta property="og:description" content="{description}"/>
<meta property="og:url" content="{canonical}"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{title}"/>
<meta name="twitter:description" content="{description}"/>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0a0a0f;color:#f5f5fb;font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}}
.rh-wrap{{max-width:1280px;margin:0 auto;padding:40px 24px 80px}}
.rh-back{{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;transition:all .2s ease;margin-bottom:24px}}
.rh-back:hover{{background:rgba(255,45,135,.12);border-color:rgba(255,45,135,.4);color:#ff6fa8}}
.rh-back::before{{content:"\\2190";font-size:16px}}
.rh-kicker{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ff6fa8;margin-bottom:10px}}
.rh-h1{{font-family:'Playfair Display',Georgia,serif;font-size:clamp(36px,5vw,62px);font-weight:900;line-height:1.05;letter-spacing:-.02em;margin-bottom:14px;background:linear-gradient(180deg,#fff 30%,#ffb3d1 70%,#c084fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}}
.rh-intro{{font-size:16px;line-height:1.75;color:#c7c7d4;margin-bottom:36px;max-width:780px}}
.rh-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:32px}}
.rh-card{{display:block;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-decoration:none;transition:all .2s ease}}
.rh-card:hover{{background:rgba(255,255,255,.07);border-color:rgba(255,45,135,.3);transform:translateY(-2px)}}
.rh-thumb{{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden}}
.rh-thumb img{{width:100%;height:100%;object-fit:cover;display:block}}
.rh-meta{{padding:10px 12px 12px}}
.rh-pl{{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:4px}}
.rh-title{{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-family:'Inter',sans-serif;font-size:13px;line-height:1.35;color:#f5f5fb;font-weight:600}}
.rh-section h2{{font-family:'Playfair Display',serif;font-size:26px;font-weight:800;color:#ffd78a;margin:36px 0 16px}}
.rh-tags{{display:flex;flex-wrap:wrap;gap:10px;margin:32px 0}}
.rh-tags a{{padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#c7c7d4;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none}}
.rh-tags a.active{{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(255,180,84,.18));border-color:rgba(255,45,135,.4);color:#ffb3d1}}
</style>
{schema}
</head>
<body>
<main class="rh-wrap">
  <a href="/" class="rh-back">Home</a>
  <div class="rh-kicker">{kicker}</div>
  <h1 class="rh-h1">{h1}</h1>
  <p class="rh-intro">{intro}</p>
  <nav class="rh-tags" aria-label="Browse playlists">
    <a href="/playlist/">Main archive</a>
    <a href="/cosplay-fancam-leaks/">Cosplay fancam</a>
    <a href="/korean-girls-kpop-twerk/">K-pop twerk</a>
    <a href="/twerk-hub-leaks/">Studio leaks</a>
    <a href="/latina-model-leaks/">Latina models</a>
    <a href="/try-on-hot-leaks/">Try-on VR</a>
    <a href="/recent.html"{recent_active}>Recent</a>
    <a href="/trending.html"{trending_active}>All cuts</a>
  </nav>
'''

FOOT = '''
</main>
<script src="/assets/js/image-seo-engine.js" defer></script>
</body>
</html>
'''

def build_recent(pages):
    pages_sorted = sorted(pages, key=lambda x: x['mtime'], reverse=True)[:200]
    cards = '\n    '.join(build_card(p) for p in pages_sorted)
    schema = json.dumps({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': 'Recently added videos · Twerkhub',
        'description': 'The latest 200 videos added to the Twerkhub archive across every playlist.',
        'url': f'{BASE}/recent.html',
        'inLanguage': 'en',
        'numberOfItems': len(pages_sorted),
    }, ensure_ascii=False)
    head = HEAD_TEMPLATE.format(
        ga4=GA4_ID,
        title='Recently added · Twerkhub',
        description='The latest 200 videos curated into the Twerkhub archive — fancam, K-pop twerk, cosplay, studio leaks, VR try-on. Updated continuously.',
        canonical=f'{BASE}/recent.html',
        kicker='Fresh drops · auto-updated',
        h1='Recently added',
        intro='The 200 most recently added cuts across every Twerkhub playlist. Updated as new videos enter the archive — fancam, K-pop choreo, cosplay, studio leaks, and VR try-on, all in one feed.',
        recent_active=' class="active"',
        trending_active='',
        schema=f'<script type="application/ld+json">{schema}</script>',
    )
    body = f'<section class="rh-section"><div class="rh-grid">\n    {cards}\n  </div></section>'
    return head + body + FOOT

def build_trending(pages):
    by_pl = {}
    for p in pages:
        by_pl.setdefault(p['pl'], []).append(p)
    sections_html = []
    for pl, label in PLAYLISTS.items():
        items = sorted(by_pl.get(pl, []), key=lambda x: x['title'].lower())
        if not items:
            continue
        cards = '\n    '.join(build_card(p) for p in items)
        sections_html.append(f'<section class="rh-section"><h2>{label} <span style="color:#a8a8b8;font-weight:500;font-size:.6em">({len(items)})</span></h2><div class="rh-grid">\n    {cards}\n  </div></section>')
    schema = json.dumps({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': 'All Twerkhub videos · full archive',
        'description': f'The complete Twerkhub archive — every video across every playlist, organized for browsing and discovery. {len(pages)} cuts total.',
        'url': f'{BASE}/trending.html',
        'inLanguage': 'en',
        'numberOfItems': len(pages),
    }, ensure_ascii=False)
    head = HEAD_TEMPLATE.format(
        ga4=GA4_ID,
        title='All cuts · full archive · Twerkhub',
        description=f'The complete Twerkhub archive — {len(pages)} videos across every playlist (fancam, K-pop, cosplay, studio leaks, VR try-on). One page, every cut.',
        canonical=f'{BASE}/trending.html',
        kicker='Full archive · every cut',
        h1='All cuts',
        intro=f'The complete archive — {len(pages)} videos across every playlist. Browse the full collection in one place. No algorithm feed, no ranking — just the work.',
        recent_active='',
        trending_active=' class="active"',
        schema=f'<script type="application/ld+json">{schema}</script>',
    )
    body = '\n'.join(sections_html)
    return head + body + FOOT

def main():
    pages = collect_all()
    print(f'[scan] {len(pages)} detail pages')
    (ROOT / 'recent.html').write_text(build_recent(pages), encoding='utf-8')
    print(f'[hub] wrote recent.html (200 newest)')
    (ROOT / 'trending.html').write_text(build_trending(pages), encoding='utf-8')
    print(f'[hub] wrote trending.html ({len(pages)} cards)')

if __name__ == '__main__':
    main()
