#!/usr/bin/env python3
"""
# ╔════════════════════════════════════════════════════════════════════════╗
# ║ REGLA DE ORO 13 (Anti, 2026-04-26):                                    ║
# ║   El TOP 5 (hot_ranking) de cualquier playlist DEBE matchear EXACTO    ║
# ║   el orden de los 5 primeros videos de la YouTube playlist real del    ║
# ║   creador. Sin excepciones. Cuando se agrega una playlist nueva, lo    ║
# ║   primero es alinear hot_ranking[0..4] con los 5 primeros de YouTube.  ║
# ║   Aplicado a: ttl-videos.json, cosplay-videos.json. Pendiente:         ║
# ║   try-on-videos.json, corean-videos.json (esperando confirmación).     ║
# ╚════════════════════════════════════════════════════════════════════════╝


TWERKHUB · Regenerate themed playlists by CLONING /playlist/index.html EXACTLY.
v2026-04-25-p2 — byte-for-byte clone, only data substitution.

We take playlist/index.html as the canonical source of truth. Then for each
themed playlist we:
  1. Copy the entire file
  2. Substitute title / description / canonical / og: tags
  3. Substitute the TOP5 sidebar block
  4. Substitute the grid block
  5. Substitute the JSON-LD schemas (preserve structure, replace items)
  6. Substitute the inline JS TOP5 + GRID arrays
  7. Substitute the initial iframe src to point to the new top1 video

Everything else (CSS files, fonts, navbar, scripts, layout, classes) is
preserved IDENTICALLY so the rendering matches /playlist/ exactly.
"""
import json
import re
import os
import html as html_lib
from pathlib import Path

ROOT = Path("/sessions/wizardly-fervent-sagan/mnt/alexia-twerk-web-clean")
SITE = "https://alexiatwerkgroup.com"
TEMPLATE = ROOT / "playlist" / "index.html"

PLAYLISTS = {
    "try-on-hot-leaks": {
        "data": "assets/try-on-videos.json",
        "title": "Try-On Hot Leaks · Curated Try-On Haul Collection · Twerkhub",
        "description": "Twerkhub Try-On Hot Leaks — curated archive of try-on haul videos. 4K bikinis, lingerie, micro-skirts, athletic wear. Members-only viral cuts.",
        "h1_short": "Try-on hot leaks",
        "h1_em": "leaks",
        "intro": "Curated try-on haul collection · 4K · weekly drops · members only.",
        "kicker": "/ try-on archive · members only",
        "h2_count_label": "try-on cuts in the haul.",
    },
    "ttl-latin-models": {
        "data": "assets/ttl-videos.json",
        "title": "TTL · Latin Models · 1,500+ Private Cuts · Twerkhub",
        "description": "Twerkhub TTL · Complete Latin model archive · 4K MP4 cuts. Britney Mazo, Glenda, Jasmin, Daniela Florez and more. Members-only.",
        "h1_short": "TTL Latin models",
        "h1_em": "models",
        "intro": "Complete Latin model collection · 4K · weekly drops · members only.",
        "kicker": "/ TTL archive · members only",
        "h2_count_label": "Latin model cuts.",
    },
    "hottest-cosplay-fancam": {
        "data": "assets/cosplay-videos.json",
        "title": "Hottest Cosplay Fancam · 4K Anime Cosplay Archive · Twerkhub",
        "description": "Twerkhub Hottest Cosplay Fancam — curated anime/cosplay fancam archive. 4K HD vertical cuts, conventions, photoshoots. Weekly drops.",
        "h1_short": "Hottest cosplay fancam",
        "h1_em": "fancam",
        "intro": "4K anime cosplay & fancam collection · weekly drops · members only.",
        "kicker": "/ cosplay fancam archive",
        "h2_count_label": "cosplay fancam cuts.",
    },
    "korean-girls-kpop-twerk": {
        "data": "assets/corean-videos.json",
        "title": "Korean Girls · K-Pop Twerk Choreo Archive · Twerkhub",
        "description": "Twerkhub K-Pop Twerk archive — Korean girl groups, choreo cuts, dance practice. 4K HD cuts of the hottest K-pop twerk performances.",
        "h1_short": "K-pop twerk Korean girls",
        "h1_em": "twerk",
        "intro": "K-Pop twerk choreo & Korean girl groups · 4K · weekly drops.",
        "kicker": "/ K-pop twerk archive",
        "h2_count_label": "K-pop twerk cuts.",
    },
}


def esc_attr(s):
    return html_lib.escape(str(s or ""), quote=True)


def thumb(vid, hi=False):
    return f"https://i.ytimg.com/vi/{vid}/{'maxresdefault' if hi else 'hqdefault'}.jpg"


# ─── Build replacement HTML blocks ─────────────────────────────────────
def build_top5_sidebar_html(top5):
    """Replicate exact /playlist/ rk-list innerHTML format."""
    badges = ['gold', 'purple', 'pink', 'monochrome', 'monochrome']
    out = []
    for i, item in enumerate(top5):
        vid = item.get('id') or item.get('_id') or ''
        title = item.get('title') or item.get('_title') or f'Top #{i+1}'
        channel = item.get('channel') or 'Twerkhub'
        rank = '#%02d' % (i + 1)
        badge = item.get('badge') or badges[i]
        out.append(
            f'      <a class="rk-item" data-hot="1" data-vid="{esc_attr(vid)}" data-number="{esc_attr(rank)}" href="#">\n'
            f'        <div class="rk-num {esc_attr(badge)}">{esc_attr(rank)}</div>\n'
            f'        <div class="rk-thumb"><img loading="lazy" decoding="async" src="{esc_attr(thumb(vid))}" alt="{esc_attr(title[:80])}" decoding="async" '
            f"onerror=\"if(this.dataset.f){{this.onerror=null;this.src='/assets/safe-adult-placeholder.svg';this.style.padding='30px';this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';}}else{{this.dataset.f=1;this.src='https://i.ytimg.com/vi/" + esc_attr(vid) + "/default.jpg';}}\""
            f'></div>\n'
            f'        <div class="rk-copy"><div class="rk-title">{esc_attr(title[:50])}</div><div class="rk-meta">{esc_attr(channel[:50])}</div></div>\n'
            f'      </a>'
        )
    return '\n'.join(out)


def build_grid_html(grid):
    """Replicate exact /playlist/ vcard format."""
    out = []
    for i, item in enumerate(grid):
        vid = item.get('_id') or item.get('id') or ''
        title = item.get('_title') or item.get('title') or item.get('number') or f'Video #{i+1}'
        number = item.get('number') or '#%03d' % (i + 6)
        out.append(
            f'    <a class="vcard reveal" data-hot="1" data-vid="{esc_attr(vid)}" data-number="{esc_attr(number)}" href="#" '
            f'role="listitem" aria-label="{esc_attr(title[:80])}">'
            f'<div class="vthumb">'
            f'<img src="{esc_attr(thumb(vid, hi=True))}" alt="{esc_attr(number)}" decoding="async" loading="lazy" '
            f"onerror=\"if(this.dataset.f){{this.onerror=null;this.src='/assets/safe-adult-placeholder.svg';this.style.padding='30px';this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';}}else{{this.dataset.f=1;this.src='" + esc_attr(thumb(vid)) + "';}}\""
            f'>'
            f'<div class="vscrim"></div><div class="vplay"></div>'
            f'</div>'
            f'<div class="card-meta vmeta"><span class="video-number vtitle">{esc_attr(number)}</span></div>'
            f'</a>'
        )
    return '\n'.join(out)


# ─── Substitute data in template ───────────────────────────────────────
def substitute_in_template(template, slug, meta, data):
    top5 = data.get('hot_ranking', [])[:5]
    grid = data.get('grid', [])
    if not top5:
        return None, "No top5"
    first_vid = top5[0].get('id') or top5[0].get('_id') or ''
    canonical_new = f"{SITE}/{slug}/"
    title_new = meta['title']
    desc_new = meta['description']
    h1_short = meta['h1_short']
    h1_em = meta['h1_em']

    h = template

    # ─── 1. <title>
    h = re.sub(r'<title>[^<]*</title>',
               f'<title>{esc_attr(title_new)}</title>', h, count=1)

    # ─── 2. <meta name="description">
    h = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)

    # ─── 3. canonical + hreflang
    h = re.sub(r'(<link\s+rel="canonical"\s+href=")[^"]*(")',
               r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<link\s+rel="alternate"\s+hreflang="en"\s+href=")[^"]*(")',
               r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<link\s+rel="alternate"\s+hreflang="x-default"\s+href=")[^"]*(")',
               r'\g<1>' + canonical_new + r'\g<2>', h, count=1)

    # ─── 4. og: + twitter: tags
    h = re.sub(r'(<meta\s+property="og:title"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:description"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:url"\s+content=")[^"]*(")',
               r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:image"\s+content=")[^"]*(")',
               r'\g<1>' + thumb(first_vid, hi=True) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:image:alt"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:title"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:description"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:image"\s+content=")[^"]*(")',
               r'\g<1>' + thumb(first_vid, hi=True) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:image:alt"\s+content=")[^"]*(")',
               r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)

    # ─── 5. preload thumb + image_src
    h = re.sub(r'(<link\s+rel="image_src"\s+href=")[^"]*(")',
               r'\g<1>' + thumb(first_vid) + r'\g<2>', h, count=1)
    h = re.sub(r'(<link\s+rel="preload"\s+as="image"\s+href=")[^"]*(")',
               r'\g<1>' + thumb(first_vid) + r'\g<2>', h, count=1)

    # ─── 6. Initial iframe src
    new_iframe_src = (
        f"https://www.youtube.com/embed/{first_vid}"
        f"?autoplay=1&amp;mute=1&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1"
        f"&amp;widget_referrer=https%3A%2F%2Falexiatwerkgroup.com&amp;origin=https%3A%2F%2Falexiatwerkgroup.com"
    )
    h = re.sub(r'(id="twerkhub-pl-player"\s+src=")[^"]*(")',
               r'\g<1>' + new_iframe_src + r'\g<2>', h, count=1)

    # ─── 7. body data-page
    h = re.sub(r'(data-page=")[^"]*(")', r'\g<1>playlist-' + slug + r'\g<2>', h, count=1)

    # ─── 8. Hero h1 — replace ENTIRE <h1>...</h1> block (template has complex inner: <em>+<br>+<span>)
    new_h1_inner = (
        h1_short.replace(h1_em, f'<em>{h1_em}</em>') if h1_em in h1_short
        else f'{h1_short} <em>{h1_em}</em>'
    )
    new_h1 = (
        f'<h1>{new_h1_inner}.'
        f'<br><span style="opacity:.75;font-size:.7em;font-weight:800">{esc_attr(meta["intro"])}</span>'
        f'</h1>'
    )
    h = re.sub(r'<h1[^>]*>.*?</h1>', new_h1, h, count=1, flags=re.DOTALL)

    # ─── 9. Intro <p class="twerkhub-pl-intro">…</p> — replace whole element
    new_intro = f'<p class="twerkhub-pl-intro">{esc_attr(meta["intro"])}</p>'
    h = re.sub(r'<p\s+class="twerkhub-pl-intro"[^>]*>.*?</p>', new_intro, h, count=1, flags=re.DOTALL)

    # ─── 10. Top kicker <div class="twerkhub-pl-kicker">/ ... before h1
    # There may be multiple kicker divs; replace just the one inside the hero header
    h = re.sub(r'(<header\s+class="twerkhub-pl-hero"[^>]*>\s*<div\s+class="twerkhub-pl-kicker">)[^<]*(</div>)',
               r'\g<1>' + esc_attr(meta['kicker']) + r'\g<2>', h, count=1, flags=re.DOTALL)

    # ─── 11. TOP5 sidebar (.rk-list innerHTML)
    new_rk_list = (
        '<div class="rk-list" id="hotrank-list">\n'
        + build_top5_sidebar_html(top5)
        + '\n    </div>'
    )
    h = re.sub(r'<div\s+class="rk-list"\s+id="hotrank-list">.*?</div>\s*</aside>',
               new_rk_list + '\n  </aside>', h, count=1, flags=re.DOTALL)

    # ─── 12. Grid (#video-grid innerHTML)
    # Note: actual class is "grid" not "twerkhub-pl-grid" in /playlist/
    new_grid = (
        '<div class="grid" id="video-grid" role="list">\n'
        + build_grid_html(grid)
        + '\n  </div>'
    )
    h = re.sub(r'<div\s+class="grid"\s+id="video-grid"[^>]*>.*?</div>\s*</section>',
               new_grid + '\n</section>', h, count=1, flags=re.DOTALL)

    # ─── 13. Inline JS TOP5/GRID arrays
    top5_js = json.dumps([{"id": (it.get('id') or it.get('_id') or '')} for it in top5], ensure_ascii=False)
    grid_js = json.dumps(
        [{"id": (it.get('_id') or it.get('id') or ''),
          "number": it.get('number') or '#%03d' % (i + 6)}
         for i, it in enumerate(grid)],
        ensure_ascii=False
    )
    h = re.sub(r'(var TOP5 = )\[[^\]]*\];', r'\g<1>' + top5_js + ';', h, count=1)
    h = re.sub(r'(var GRID = )\[[^;]*?\];', r'\g<1>' + grid_js + ';', h, count=1, flags=re.DOTALL)

    # ─── 14. Replace JSON-LD ImageObject thumbnail (1st script[ld+json])
    # Replace the outer caption + thumbnail of the ImageObject schema
    h = re.sub(
        r'(<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ImageObject")(.*?)(</script>)',
        '\g<1>"' + r',"contentUrl":"' + thumb(first_vid) + r'","url":"' + thumb(first_vid) + r'","width":480,"height":360,"caption":"' + esc_attr(title_new) + r'","representativeOfPage":true,"creditText":"Twerkhub","encodingFormat":"image/jpeg"' + '\g<3>',
        h, count=1, flags=re.DOTALL
    )

    # ─── 15. Replace JSON-LD CollectionPage url + name + description
    def _patch_collection(m):
        block = m.group(0)
        try:
            obj = json.loads(re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1))
            obj['name'] = title_new
            obj['url'] = canonical_new
            obj['description'] = desc_new
            # Replace hasPart with our top5+grid
            items = []
            for i, it in enumerate(top5 + grid[:30], 1):
                vid = it.get('id') or it.get('_id') or ''
                t = it.get('title') or it.get('_title') or f'Video #{i}'
                items.append({
                    "@type": "VideoObject",
                    "name": t,
                    "thumbnailUrl": thumb(vid, hi=True),
                    "uploadDate": "2026-04-25T12:00:00Z",
                    "contentUrl": f"https://www.youtube.com/watch?v={vid}",
                    "embedUrl": f"https://www.youtube.com/embed/{vid}",
                    "inLanguage": "en",
                    "isFamilyFriendly": False,
                    "position": i,
                })
            obj['hasPart'] = items
            return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False, separators=(",",":"))}</script>'
        except Exception:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"CollectionPage".*?</script>',
        _patch_collection, h, count=1, flags=re.DOTALL
    )

    # ─── 16. Replace JSON-LD ItemList items
    def _patch_itemlist(m):
        block = m.group(0)
        try:
            obj = json.loads(re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1))
            items = []
            for i, it in enumerate(top5 + grid, 1):
                vid = it.get('id') or it.get('_id') or ''
                t = it.get('title') or it.get('_title') or f'Video #{i}'
                items.append({
                    "@type": "ListItem",
                    "position": i,
                    "item": {
                        "@type": "VideoObject",
                        "name": t,
                        "thumbnailUrl": thumb(vid, hi=True),
                        "uploadDate": "2026-04-25T12:00:00Z",
                        "contentUrl": f"https://www.youtube.com/watch?v={vid}",
                        "embedUrl": f"https://www.youtube.com/embed/{vid}",
                        "inLanguage": "en",
                        "isFamilyFriendly": False,
                        "position": i,
                    }
                })
            obj['itemListElement'] = items
            obj['numberOfItems'] = len(items)
            return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False, separators=(",",":"))}</script>'
        except Exception:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ItemList".*?</script>',
        _patch_itemlist, h, count=1, flags=re.DOTALL
    )

    # ─── 17. BreadcrumbList → use new title + new URL
    def _patch_breadcrumb(m):
        block = m.group(0)
        try:
            obj = json.loads(re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1))
            obj['itemListElement'] = [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": title_new, "item": canonical_new}
            ]
            return f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False, separators=(",",":"))}</script>'
        except Exception:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"BreadcrumbList".*?</script>',
        _patch_breadcrumb, h, count=1, flags=re.DOTALL
    )

    # ─── 17b. Replace "All <em>NNN</em> cuts in the room." count
    total = len(top5) + len(grid)
    h = re.sub(r'(<h2>)All\s+<em>\d+</em>\s+cuts\s+in\s+the\s+room\.(</h2>)',
               r'\g<1>All <em>' + str(total) + r'</em> ' + esc_attr(meta['h2_count_label']) + r'\g<2>',
               h, count=1)

    # ─── 18. Inject pl-theater loader if missing
    if 'twerkhub-pl-theater.js' not in h:
        h = h.replace(
            "loadOnce('/assets/twerkhub-auth.js?v=20260425-p7','twk-loader-twerkhub-auth');",
            "loadOnce('/assets/twerkhub-auth.js?v=20260425-p7','twk-loader-twerkhub-auth');\n  loadOnce('/assets/twerkhub-pl-theater.js?v=20260425-p11','twk-loader-pl-theater');",
            1
        )

    return h, None


# ─── Main ──────────────────────────────────────────────────────────────
def main():
    template = TEMPLATE.read_text(encoding='utf-8')
    print(f"Template loaded: {len(template)} chars from {TEMPLATE}")

    for slug, meta in PLAYLISTS.items():
        try:
            data = json.load(open(ROOT / meta['data'], 'r', encoding='utf-8'))
        except Exception as e:
            print(f"  SKIP {slug}: {e}")
            continue
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_path = out_dir / 'index.html'
        new_html, err = substitute_in_template(template, slug, meta, data)
        if err:
            print(f"  FAIL {slug}: {err}")
            continue
        out_path.write_text(new_html, encoding='utf-8')
        print(f"  + {slug}/index.html ({len(new_html)//1024} KB)")


if __name__ == '__main__':
    main()
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   