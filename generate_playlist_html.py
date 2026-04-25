#!/usr/bin/env python3
"""
generate_playlist_html.py
=========================
Genera paginas HTML indexables (con SEO maximizado) en /playlist/ para los
videos catalogados en /assets/playlist-data.js que aun no tienen archivo HTML.

Por que existe:
  Antes habia un /playlist-2/ con un data.js que cargaba videos en el cliente.
  Eso era debil para SEO (Googlebot no indexa bien JSON dinamico). Migramos:
  los datos viven en /assets/playlist-data.js y este script los PROMUEVE a
  archivos HTML estaticos /playlist/{slug}.html con VideoObject schema, OG,
  Twitter card, etc. /playlist-2/ ya no existe; redirect 301 en vercel.json.

Que hace:
  1) Lee /assets/playlist-data.js
  2) Filtra '[Deleted video]', '[Private video]' y similares
  3) Para cada item que NO tenga HTML correspondiente en /playlist/, genera uno
  4) En /playlist/index.html:
       - lo agrega al array GRID (control de click)
       - inserta la tarjeta visible <a class="vcard"> en el HTML estatico
       - actualiza el contador "All N cuts in the room"
       - actualiza numberOfItems del JSON-LD ItemList
  5) Lo agrega a /playlist/sitemap.xml y /sitemap-videos.xml
  6) Actualiza los contadores TOTAL_PLAYLIST y TOTAL_VIDEOS en
     /assets/global-counters.js

Idempotente: si volves a correrlo, solo agrega los videos nuevos.

Uso:
  python generate_playlist_html.py            # genera lo que falte
  python generate_playlist_html.py --dry-run  # reporta sin escribir nada
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from datetime import datetime, timezone

# ---- Rutas (se ubican relativas al script para funcionar en Win + Linux) ----
ROOT = Path(__file__).resolve().parent
PLAYLIST_DIR = ROOT / 'playlist'
DATA_JS = ROOT / 'assets' / 'playlist-data.js'
INDEX_HTML = PLAYLIST_DIR / 'index.html'
SITEMAP_PL = PLAYLIST_DIR / 'sitemap.xml'
SITEMAP_VIDEOS = ROOT / 'sitemap-videos.xml'
GLOBAL_COUNTERS = ROOT / 'assets' / 'global-counters.js'
SITE_BASE = 'https://alexiatwerkgroup.com'
TODAY = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

PLACEHOLDER_RE = re.compile(
    r'^\[?(deleted|private|unavailable|members.only|age.restricted)\s*video\]?$',
    re.IGNORECASE,
)


# ---- helpers ----------------------------------------------------------------

def slugify(text):
    """ASCII lowercase + guiones, igual al patron existente en /playlist/."""
    if not text:
        return 'video'
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    if len(text) > 110:
        text = text[:110].rstrip('-')
    return text or 'video'


def unique_slug(base, taken):
    slug = base
    n = 2
    while f'{slug}.html' in taken:
        slug = f'{base}-{n}'
        n += 1
    return slug


def html_escape(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('"', '&quot;').replace("'", '&#39;'))


def is_placeholder(title):
    if not title:
        return True
    return bool(PLACEHOLDER_RE.fullmatch(title.strip()))


# ---- template del HTML ------------------------------------------------------

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>{title_html} | Twerk Choreography \xb7 Replay &amp; Related Cuts | Twerkhub</title>
<meta name="description" content="{description_html}"/>
<meta name="keywords" content="{keywords_html}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="{canonical}"/>
<meta property="og:type" content="video.other"/>
<meta property="og:site_name" content="Alexia Twerk Group"/>
<meta property="og:title" content="{title_html} \xb7 Twerk Choreography"/>
<meta property="og:description" content="{description_html}"/>
<meta property="og:url" content="{canonical}"/>
<meta property="og:image" content="https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"/>
<meta property="og:image:secure_url" content="https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"/>
<meta property="og:image:width" content="1280"/>
<meta property="og:image:height" content="720"/>
<meta property="og:video" content="https://www.youtube.com/embed/{vid}"/>
<meta property="og:video:secure_url" content="https://www.youtube.com/embed/{vid}"/>
<meta property="og:video:type" content="text/html"/>
<meta property="og:video:width" content="1280"/>
<meta property="og:video:height" content="720"/>
<meta property="og:locale" content="en_US"/>
<meta property="article:section" content="Twerk Choreography"/>
<meta property="article:tag" content="twerk"/>
<meta property="article:tag" content="dance choreography"/>
<meta name="twitter:card" content="player"/>
<meta name="twitter:site" content="@alexiatwerkofic"/>
<meta name="twitter:title" content="{title_html} \xb7 Twerk Choreography"/>
<meta name="twitter:description" content="{description_html}"/>
<meta name="twitter:image" content="https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"/>
<meta name="twitter:player" content="https://www.youtube.com/embed/{vid}"/>
<meta name="twitter:player:width" content="1280"/>
<meta name="twitter:player:height" content="720"/>
<meta name="rating" content="mature"/>
<meta name="theme-color" content="#05050a"/>
<link rel="icon" href="/favicon-32.png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="preconnect" href="https://www.youtube.com" crossorigin>

<link rel="stylesheet" href="/assets/twerkhub-page.css?v=20260424-p1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v=20260424-p1">
<link rel="stylesheet" href="/assets/twerkhub-polish.css?v=20260424-p1">

<script type="application/ld+json">{video_jsonld}</script>
<script type="application/ld+json">{breadcrumb_jsonld}</script>
</head>
<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-video">

<a class="twerkhub-pl-skip" href="#twerkhub-pl-main">Skip to main content</a>

<nav class="twerkhub-pl-topbar" aria-label="Primary">
  <div class="twerkhub-pl-topbar-inner">
    <a class="twerkhub-pl-tb-brand" href="/" aria-label="Twerkhub \xb7 home">
      <img class="twerkhub-pl-tb-logo" src="/logo-twerkhub.png" alt="Twerkhub" loading="eager" decoding="async" width="34" height="34">
      <span class="twerkhub-pl-tb-brand-sub">Est. 2018</span>
    </a>
    <div class="twerkhub-pl-tb-nav">
      <a href="/">Home</a>
      <a href="/#private-models">Exclusive</a>
      <a href="/playlist/" class="is-active" aria-current="page">Playlists</a>
      <a href="/top-100-twerk-videos.html">Top 100</a>
      <a href="/community.html">Community</a>
      <a href="/membership.html">Tokens</a>
      <a href="/profile.html">Profile</a>
    </div>
  </div>
</nav>

<header class="twerkhub-pl-hero" style="text-align:left;max-width:1320px;margin:28px auto 12px;padding:0 26px">
  <div class="twerkhub-pl-kicker">/ From the archive \xb7 Playlist #2</div>
  <h1 style="font-size:clamp(22px,3vw,38px);line-height:1.15;margin:10px 0 8px">{title_html}</h1>
  <p class="twerkhub-pl-intro" style="max-width:900px">Choreography by <strong>{channel_html}</strong> \xb7 curated cut from the Twerk Hub archive \xb7 weekly drops \xb7 18+. <a href="/playlist/" style="color:#1ee08f;text-decoration:none;font-weight:800">← Back to the full archive</a></p>
</header>

<main id="twerkhub-pl-main" class="twerkhub-pl-theater-main" style="max-width:1320px;margin:0 auto;padding:0 26px">
  <div class="twerkhub-pl-player-col">
    <div class="twerkhub-pl-player-wrap">
      <iframe id="twerkhub-pl-player"
              src="https://www.youtube-nocookie.com/embed/{vid}?autoplay=1&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1"
              title="{title_html}"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen></iframe>
    </div>
    <div class="twerkhub-pl-player-meta">
      <span class="twerkhub-pl-player-now">▶ Now playing</span>
      <h2 id="twerkhub-pl-now-title" style="font-size:18px">{title_html}</h2>
    </div>
  </div>

  <article class="twerkhub-pl-video-about" style="margin:28px 0;max-width:900px;line-height:1.65;color:#e8e8f0">
    <h2 style="font-size:20px;margin:0 0 10px">About this cut</h2>
    <p>{long_description_html}</p>
    <ul style="margin:14px 0 0;padding-left:18px;list-style:disc">
      <li><strong>Creator / channel:</strong> {channel_html}</li>
      <li><strong>Genre:</strong> Twerk \xb7 dance choreography \xb7 viral routine</li>
      <li><strong>Source:</strong> YouTube original \xb7 embedded via youtube-nocookie</li>
      <li><strong>Curated by:</strong> Twerkhub \xb7 weekly Thursday drops at 00:00 ART</li>
    </ul>
  </article>
</main>

<section class="twerkhub-pl-cta-final" aria-label="Keep going" style="margin-top:40px">
  <h2>Browse the <em>full archive</em>.</h2>
  <div class="twerkhub-pl-cta-row">
    <a class="twerkhub-btn twerkhub-btn-primary" href="/playlist/">Back to playlist →</a>
    <a class="twerkhub-btn twerkhub-btn-ghost" href="/">Twerkhub Home</a>
  </div>
</section>

<footer class="twerkhub-pl-footer" role="contentinfo">
  <div class="twerkhub-pl-slogan">If you know, you know.</div>
  <div class="twerkhub-pl-founded">\xa9 2026 Twerkhub \xb7 founded by <em>Anti</em> (firestarter)</div>
</footer>

<script defer src="/assets/global-brand.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-tokens.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-sound-on-interaction.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-topbar-enhance.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-locale-switcher.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-mobile-nav.js?v=20260424-p1"></script>
</body>
</html>
"""


# ---- generadores de JSON-LD -------------------------------------------------

def build_video_jsonld(item, slug, position):
    obj = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": item['title'],
        "description": item['description'],
        "thumbnailUrl": [
            f"https://i.ytimg.com/vi/{item['id']}/maxresdefault.jpg",
            f"https://i.ytimg.com/vi/{item['id']}/hqdefault.jpg",
        ],
        "uploadDate": TODAY,
        "duration": f"PT{int(item.get('dur') or 0)}S" if item.get('dur') else "PT1M",
        "contentUrl": f"https://www.youtube.com/watch?v={item['id']}",
        "embedUrl": f"https://www.youtube.com/embed/{item['id']}",
        "url": f"{SITE_BASE}/playlist/{slug}.html",
        "inLanguage": "en",
        "isFamilyFriendly": False,
        "genre": ["Twerk", "Dance Choreography"],
        "keywords": "twerk, dance choreography, viral dance, twerk choreography, " + (item.get('ch') or ''),
        "creator": {"@type": "Person", "name": item.get('ch') or 'Unknown'},
        "publisher": {
            "@type": "Organization",
            "name": "Twerkhub",
            "url": SITE_BASE + "/",
            "logo": {"@type": "ImageObject", "url": SITE_BASE + "/logo-twerkhub.png"},
        },
        "isPartOf": {
            "@type": "CollectionPage",
            "name": "Twerkhub — Curated Twerk Videos Archive",
            "url": SITE_BASE + "/playlist/",
        },
        "position": position,
    }
    if item.get('views'):
        obj["interactionStatistic"] = {
            "@type": "InteractionCounter",
            "interactionType": {"@type": "WatchAction"},
            "userInteractionCount": int(item['views']),
        }
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def build_breadcrumb_jsonld(item, slug):
    obj = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Playlists", "item": SITE_BASE + "/playlist/"},
            {"@type": "ListItem", "position": 3, "name": item['title'][:60], "item": f"{SITE_BASE}/playlist/{slug}.html"},
        ],
    }
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def build_descriptions(item):
    title = item['title']
    ch = item.get('ch') or 'a verified Twerkhub creator'
    short = (
        f"{title} — twerk choreography reference cut on Twerkhub. "
        f"Watch the original embed by {ch}, browse related routines, "
        f"jump to the creator's full archive."
    )
    long = (
        f"<strong>{title}</strong> is part of the Twerkhub curated archive of viral "
        f"twerk choreography videos. The clip features <strong>{ch}</strong> performing a "
        f"reference routine that became a recurring search target on YouTube. "
        f"Twerkhub embeds the original video without cookies, adds a related-routes "
        f"sidebar, and links the cut to the creator's full back catalogue. "
        f"All cuts in the archive are published with explicit creator attribution, an "
        f"is-part-of CollectionPage relation, and the original YouTube as the canonical "
        f"source. Updated weekly on Thursdays at 00:00 ART."
    )
    item['description'] = short
    return short, long


def build_keywords(item):
    title = item['title']
    ch = item.get('ch') or ''
    base = ['twerk', 'twerk choreography', 'dance choreography', 'viral dance',
            'twerkhub', 'youtube twerk', 'twerk video', 'curated twerk']
    if ch:
        base.append(ch.lower())
    words = re.findall(r'[A-Za-z]{4,}', title)[:3]
    base.extend(w.lower() for w in words)
    seen, out = set(), []
    for k in base:
        k = k.strip()
        if k and k not in seen:
            seen.add(k)
            out.append(k)
    return ', '.join(out[:14])


# ---- main -------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--dry-run', action='store_true',
                        help='No escribe nada; reporta cuantos generaria.')
    args = parser.parse_args()

    if not DATA_JS.exists():
        print(f"ERROR: no encuentro {DATA_JS}", file=sys.stderr)
        sys.exit(1)

    # 1) Cargar data.js
    data_text = DATA_JS.read_text(encoding='utf-8')
    items = json.loads(re.search(r'window\.PLAYLIST2_DATA\s*=\s*(\[.*\]);', data_text, re.S).group(1))
    print(f"[1] /assets/playlist-data.js items: {len(items)}")

    # 2) Cargar GRID
    index_text = INDEX_HTML.read_text(encoding='utf-8')
    grid_match = re.search(r'(var GRID = )(\[.*?\]);', index_text, re.S)
    grid = json.loads(grid_match.group(2))
    grid_ids = {g['id'] for g in grid}
    print(f"[2] GRID actual: {len(grid)} items")

    # 3) Filtrar candidatos
    candidates = [it for it in items if it['id'] not in grid_ids]
    placeholders = [it for it in candidates if is_placeholder(it.get('title'))]
    to_gen = [it for it in candidates if not is_placeholder(it.get('title'))]
    print(f"[3] Candidatos: {len(candidates)}; placeholders: {len(placeholders)}; a generar: {len(to_gen)}")

    if not to_gen:
        print("\nNada que generar. /playlist/ ya cubre todo /assets/playlist-data.js.")
        return

    if args.dry_run:
        print("\n[dry-run] No escribo nada. Saliendo.")
        return

    # 4) Generar HTMLs
    existing_files = {p.name for p in PLAYLIST_DIR.glob('*.html')}
    next_position = max((int(g['number'].lstrip('#')) for g in grid), default=0) + 1
    new_grid_entries = []
    new_sitemap_entries = []
    new_video_sitemap_entries = []
    written = 0

    for item in to_gen:
        vid = item['id']
        slug = unique_slug(slugify(item['title']), existing_files)
        existing_files.add(f'{slug}.html')

        position = next_position
        next_position += 1

        short_desc, long_desc = build_descriptions(item)
        canonical = f"{SITE_BASE}/playlist/{slug}.html"
        html = PAGE_TEMPLATE.format(
            title_html=html_escape(item['title']),
            description_html=html_escape(short_desc),
            long_description_html=long_desc,
            keywords_html=html_escape(build_keywords(item)),
            channel_html=html_escape(item.get('ch') or 'Unknown creator'),
            canonical=canonical,
            vid=vid,
            video_jsonld=build_video_jsonld(item, slug, position),
            breadcrumb_jsonld=build_breadcrumb_jsonld(item, slug),
        )
        (PLAYLIST_DIR / f'{slug}.html').write_text(html, encoding='utf-8')
        written += 1

        new_grid_entries.append({'id': vid, 'number': f'#{position:03d}', 'slug': f'{slug}.html'})
        new_sitemap_entries.append(canonical)
        new_video_sitemap_entries.append({
            'loc': canonical,
            'title': item['title'],
            'desc': short_desc,
            'thumb': f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
            'embed': f"https://www.youtube.com/embed/{vid}",
            'duration': int(item.get('dur') or 60),
        })

    print(f"[4] HTMLs escritos: {written}")

    # 5) Actualizar /playlist/index.html: GRID + tarjetas visibles + contadores
    new_grid = grid + new_grid_entries
    new_grid_js = json.dumps(new_grid, ensure_ascii=False, separators=(', ', ': '))
    new_index = (
        index_text[:grid_match.start()]
        + grid_match.group(1) + new_grid_js + ';'
        + index_text[grid_match.end():]
    )

    # 5a) Insertar tarjetas <a class="vcard"> visibles tras la ultima existente
    id_to_title = {it['id']: it['title'] for it in items}
    last_card_re = re.compile(r'<a class="vcard reveal"[^>]*data-number="(#\d+)"[^>]*>.*?</a>', re.S)
    last_num = 0
    last_end = None
    for m in last_card_re.finditer(new_index):
        n = int(m.group(1).lstrip('#'))
        if n > last_num:
            last_num = n
            last_end = m.end()
    if last_end is not None and new_grid_entries:
        cards_html = []
        for g in new_grid_entries:
            vid = g['id']
            slug = g['slug']
            num = g['number']
            title = id_to_title.get(vid, slug.replace('.html', '').replace('-', ' '))
            aria = html_escape(title[:80] + ('...' if len(title) > 80 else ''))
            cards_html.append(
                f'<a class="vcard reveal" data-hot="1" data-vid="{vid}" '
                f'data-slug="{slug}" data-number="{num}" '
                f'href="/playlist/{slug}" role="listitem" aria-label="{aria}">'
                f'<div class="vthumb">'
                f'<img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{num}" '
                f'decoding="async" loading="lazy" '
                f'onerror="this.src=&#39;https://i.ytimg.com/vi/{vid}/default.jpg&#39;">'
                f'<div class="vscrim"></div><div class="vplay"></div>'
                f'</div></a>'
            )
        block = '\n' + '\n'.join(cards_html)
        new_index = new_index[:last_end] + block + new_index[last_end:]
        print(f"[5a] +{len(cards_html)} tarjetas vcard insertadas tras #{last_num:03d}")

    # 5b) Actualizar contador visible "All N cuts in the room" -> total real
    total_cards = len(new_grid)
    new_index = re.sub(
        r'<h2>All <em>\d+</em> cuts in the room\.</h2>',
        f'<h2>All <em>{total_cards}</em> cuts in the room.</h2>',
        new_index, count=1,
    )

    # 5c) Actualizar numberOfItems del JSON-LD ItemList (no toca hasPart del CollectionPage)
    new_index = re.sub(
        r'("@type":"ItemList"[^{}]*?"numberOfItems":)\d+',
        lambda m: f'{m.group(1)}{total_cards}',
        new_index, count=1,
    )

    INDEX_HTML.write_text(new_index, encoding='utf-8')
    print(f"[5] index.html actualizado: GRID={len(new_grid)}, contador 'All N cuts'={total_cards}")

    # 6) /playlist/sitemap.xml
    sm = SITEMAP_PL.read_text(encoding='utf-8')
    new_urls = '\n'.join(
        f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{TODAY[:10]}</lastmod>\n  </url>'
        for loc in new_sitemap_entries
    )
    SITEMAP_PL.write_text(sm.replace('</urlset>', new_urls + '\n</urlset>'), encoding='utf-8')
    print(f"[6] /playlist/sitemap.xml: +{len(new_sitemap_entries)} URLs")

    # 7) /sitemap-videos.xml
    if SITEMAP_VIDEOS.exists():
        sv = SITEMAP_VIDEOS.read_text(encoding='utf-8')
        if 'xmlns:video=' not in sv:
            sv = sv.replace('<urlset ', '<urlset xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" ', 1)
        blocks = []
        for e in new_video_sitemap_entries:
            blocks.append(
                f'  <url>\n'
                f'    <loc>{e["loc"]}</loc>\n'
                f'    <video:video>\n'
                f'      <video:thumbnail_loc>{e["thumb"]}</video:thumbnail_loc>\n'
                f'      <video:title>{html_escape(e["title"])[:97]}</video:title>\n'
                f'      <video:description>{html_escape(e["desc"])[:200]}</video:description>\n'
                f'      <video:player_loc allow_embed="yes">{e["embed"]}</video:player_loc>\n'
                f'      <video:duration>{e["duration"]}</video:duration>\n'
                f'      <video:family_friendly>no</video:family_friendly>\n'
                f'      <video:publication_date>{TODAY}</video:publication_date>\n'
                f'    </video:video>\n'
                f'  </url>'
            )
        SITEMAP_VIDEOS.write_text(sv.replace('</urlset>', '\n'.join(blocks) + '\n</urlset>'), encoding='utf-8')
        print(f"[7] /sitemap-videos.xml: +{len(new_video_sitemap_entries)} entries")

    # 8) Contadores
    if GLOBAL_COUNTERS.exists():
        gc = GLOBAL_COUNTERS.read_text(encoding='utf-8')
        html_count = len(list(PLAYLIST_DIR.glob('*.html')))
        gc = re.sub(r'(TOTAL_PLAYLIST\s*=\s*)\d+', lambda m: f'{m.group(1)}{html_count}', gc, count=1)
        gc = re.sub(r'(/playlist/ = )\d+( HTML pages)', lambda m: f'{m.group(1)}{html_count}{m.group(2)}', gc, count=1)
        m2 = re.search(r'TOTAL_PLAYLIST_2\s*=\s*(\d+)', gc)
        p2 = int(m2.group(1)) if m2 else 0
        new_grand = html_count + p2
        gc = re.sub(r'(Total real = )\d+', lambda m: f'{m.group(1)}{new_grand}', gc, count=1)
        GLOBAL_COUNTERS.write_text(gc, encoding='utf-8')
        print(f"[8] global-counters.js: TOTAL_PLAYLIST -> {html_count}, total -> {new_grand}")

    print(f"\n=== RESUMEN ===")
    print(f"Nuevos HTML: {written}")
    print(f"GRID: {len(grid)} -> {len(new_grid)}")
    print(f"Placeholders ignorados: {len(placeholders)}")


if __name__ == '__main__':
    main()
