#!/usr/bin/env python3
"""
rebuild_4_playlists.py — Surgical regeneration of 4 new playlist pages
using the REAL /playlist/index.html template (not a simplified clone).

Reads the original template, performs targeted substitutions per playlist,
writes each output to its slug folder.

Run:
    python3 rebuild_4_playlists.py
"""
from __future__ import annotations
import os
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "playlist" / "index.html"

# Where the JSON data files live (Linux sandbox path; we resolve below)
DATA_DIRS = [
    Path("/sessions/wizardly-fervent-sagan/mnt/outputs"),
    ROOT / "_playlist_data",  # fallback for Windows
]

PLAYLISTS = [
    {
        "slug": "playlist-try-on-hot-leaks",
        "data": "playlist-data-try-on-hot-leaks.json",
        "title": "Try-On Hot Leaks · Twerkhub",
        "kicker": "/ Try-on Hub · weekly drops",
        "h1_main": "Hottest <em>try-on</em> leaks.",
        "h1_sub": "VR180 + 4K · uncut",
        "intro": "The curated try-on archive. VR180, 4K and lingerie haul cuts. Refreshed every week.",
        "meta_desc": "The hottest try-on hauls and lingerie leaks on YouTube — VR180, 4K, weekly drops. Curated by Twerkhub.",
        "vip_locked": False,
    },
    {
        "slug": "playlist-hottest-cosplay-fancam",
        "data": "playlist-data-hottest-cosplay-fancam.json",
        "title": "Hottest Cosplay & Fancam · Twerkhub",
        "kicker": "/ Cosplay & Fancam · weekly",
        "h1_main": "Hottest <em>cosplay</em> & fancam.",
        "h1_sub": "Convention floor · 4K studio",
        "intro": "The complete cosplay and fancam circuit. Convention floor, studio shoots, K-pop dance covers. Updated weekly.",
        "meta_desc": "The hottest cosplay and fancam videos on YouTube — convention floor, studio cuts, K-pop fancams. Curated by Twerkhub.",
        "vip_locked": False,
    },
    {
        "slug": "playlist-korean-girls-kpop-twerk",
        "data": "playlist-data-korean-girls-kpop-twerk.json",
        "title": "Korean Girls · K-pop & Twerk · Twerkhub",
        "kicker": "/ K-pop & Twerk · Seoul circuit",
        "h1_main": "Korean girls · <em>K-pop</em> & twerk.",
        "h1_sub": "Seoul · Busan · Taipei",
        "intro": "Top Korean and Taiwanese twerk + K-pop dance covers. BEFOX, iDance Studio, fancam circuit. Curated weekly.",
        "meta_desc": "Top Korean girls K-pop and twerk dance covers — BEFOX, iDance Studio, Seoul + Taipei circuit. Curated by Twerkhub.",
        "vip_locked": False,
    },
    {
        "slug": "ttl-latin-models",
        "data": "playlist-data-ttl-latin-models.json",
        "title": "TTL · Latin Models · 1,500+ private cuts · Twerkhub VIP",
        "kicker": "/ TTL Archive · VIP-tier only",
        "h1_main": "TTL · <em>Latin</em> Models.",
        "h1_sub": "1,500+ private 4K cuts",
        "intro": "The complete TTL Latin model archive in MP4 4K. VIP-tier only — scattered low-quality reuploads exist online; this is the source.",
        "meta_desc": "Twerkhub TTL · Complete Latin model archive · 1,500+ MP4 4K cuts · VIP only. Scattered low-quality reuploads exist on Google; this is the source.",
        "vip_locked": True,
    },
]


def find_data_file(filename: str) -> Path:
    for d in DATA_DIRS:
        p = d / filename
        if p.exists():
            return p
    raise FileNotFoundError(f"Could not find {filename} in any of {DATA_DIRS}")


def load_template() -> str:
    return TEMPLATE.read_text(encoding="utf-8")


def normalize_title(s: str) -> str:
    """Decode any literal \\uXXXX sequences and remove backslashes/control
    chars that could break regex replacements or HTML attrs."""
    # Decode literal \uXXXX (e.g. & → &) if the JSON parser left them raw.
    if "\\u" in s:
        try:
            s = s.encode("utf-8").decode("unicode_escape")
        except Exception:
            s = s.replace("\\u0026", "&").replace("\\\"", "\"")
    # Strip stray backslashes that confuse re.sub replacement strings.
    s = s.replace("\\", "")
    # Collapse weird whitespace.
    s = re.sub(r"\s+", " ", s).strip()
    return s


def num_pad(n: int) -> str:
    return f"#{n:03d}"


def rk_color(rank: int) -> str:
    """Color for the rk-num badge based on rank."""
    return ["gold", "purple", "pink", "monochrome", "monochrome"][rank - 1]


def build_rk_items(videos: list[dict]) -> str:
    """Build the 5 rk-item HTML cards for the hot ranking sidebar."""
    out = []
    # Use plain string concat to avoid all the brace-escaping pain.
    def make_onerror(vid: str) -> str:
        return (
            "if(this.dataset.f){this.onerror=null;"
            "this.src='/assets/safe-adult-placeholder.svg';"
            "this.style.padding='30px';"
            "this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';"
            "}else{this.dataset.f=1;"
            "this.src='https://i.ytimg.com/vi/" + vid + "/default.jpg';"
            "}"
        )
    for i, v in enumerate(videos[:5], start=1):
        vid = v["id"]
        title = v["title"]
        # Truncate for the title/meta lines
        title_short = title[:36] + ("…" if len(title) > 36 else "")
        meta = title[36:75] if len(title) > 36 else ""
        oe = make_onerror(vid)
        out.append(
            f'      <a class="rk-item" data-hot="1" data-vid="{vid}" data-number="#{i:03d}" href="#">\n'
            f'        <div class="rk-num {rk_color(i)}">#{i:02d}</div>\n'
            f'        <div class="rk-thumb"><img loading="lazy" decoding="async" '
            f'src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{escape_attr(title)}" '
            f'onerror="{oe}"></div>\n'
            f'        <div class="rk-copy"><div class="rk-title">{escape_html(title_short)}</div>'
            f'<div class="rk-meta">{escape_html(meta) if meta else "·"}</div></div>\n'
            f'      </a>'
        )
    return "\n".join(out)


def build_vcard_grid(videos: list[dict], slug: str, vip: bool) -> str:
    """Build vcard tiles for the main grid."""
    out = []
    def make_onerror(vid: str) -> str:
        return (
            "if(this.dataset.f){this.onerror=null;"
            "this.src='/assets/safe-adult-placeholder.svg';"
            "this.style.padding='30px';"
            "this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';"
            "}else{this.dataset.f=1;"
            "this.src='https://i.ytimg.com/vi/" + vid + "/default.jpg';"
            "}"
        )
    for i, v in enumerate(videos, start=1):
        vid = v["id"]
        title = v["title"]
        num = num_pad(i)
        # For VIP-locked, link to /membership.html (forces upsell). For others, link to YouTube.
        href = "/membership.html" if vip else f"https://www.youtube.com/watch?v={vid}"
        target = "" if vip else ' target="_blank" rel="noopener"'
        oe = make_onerror(vid)
        out.append(
            f'    <a class="vcard reveal" data-hot="1" data-vid="{vid}" '
            f'data-number="{num}" href="{href}"{target} role="listitem" '
            f'aria-label="{escape_attr(title)}">'
            f'<div class="vthumb">'
            f'<img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{num}" '
            f'decoding="async" loading="eager" '
            f'onerror="{oe}">'
            f'<div class="vscrim"></div><div class="vplay"></div>'
            f'</div></a>'
        )
    return "\n".join(out)


def build_collectionpage_haspart(videos: list[dict], lang: str = "en", accessible: bool = True) -> str:
    """Build the hasPart array for CollectionPage JSON-LD."""
    items = []
    for i, v in enumerate(videos, start=1):
        vid = v["id"]
        item = {
            "@type": "VideoObject",
            "name": v["title"],
            "thumbnailUrl": f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
            "uploadDate": "2026-04-25T12:00:00Z",
            "contentUrl": f"https://www.youtube.com/watch?v={vid}",
            "embedUrl": f"https://www.youtube.com/embed/{vid}",
            "inLanguage": lang,
            "isFamilyFriendly": False,
            "position": i,
        }
        if not accessible:
            item["isAccessibleForFree"] = False
        items.append(item)
    return json.dumps(items, ensure_ascii=False)


def build_itemlist(videos: list[dict], lang: str = "en", accessible: bool = True) -> dict:
    """Build the full ItemList JSON-LD object."""
    items = []
    for i, v in enumerate(videos, start=1):
        vid = v["id"]
        vid_obj = {
            "@type": "VideoObject",
            "name": v["title"],
            "thumbnailUrl": f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg",
            "contentUrl": f"https://www.youtube.com/watch?v={vid}",
            "embedUrl": f"https://www.youtube.com/embed/{vid}",
            "inLanguage": lang,
            "isFamilyFriendly": False,
            "isAccessibleForFree": accessible,
        }
        items.append({
            "@type": "ListItem",
            "position": i,
            "item": vid_obj,
        })
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "numberOfItems": len(videos),
        "itemListElement": items,
    }


def escape_attr(s: str) -> str:
    return (s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
             .replace(">", "&gt;").replace("'", "&#39;"))


def escape_html(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


VIP_BANNER = """
<section class="twerkhub-pl-vip-gate" aria-label="VIP archive gate">
  <div class="twerkhub-pl-vip-inner">
    <div class="twerkhub-pl-vip-icon" aria-hidden="true">🔒</div>
    <h2>VIP archive · 1,500+ uncut cuts</h2>
    <p>The complete TTL Latin model collection in MP4 4K. Members of the VIP tier unlock the full grid below — every clip in original quality, no reuploads, no compression artifacts.</p>
    <a class="twerkhub-pl-vip-cta" href="/membership.html">Unlock the full archive · Upgrade to VIP →</a>
    <p class="twerkhub-pl-vip-note">Scattered low-quality reuploads exist on Google; this is the source.</p>
  </div>
</section>
<style>
.twerkhub-pl-vip-gate{margin:30px auto;max-width:1200px;padding:0 26px}
.twerkhub-pl-vip-inner{position:relative;border:2px solid rgba(255,180,84,.5);border-radius:24px;padding:42px 32px;text-align:center;background:linear-gradient(135deg,rgba(255,45,135,.08),rgba(255,180,84,.06),rgba(157,78,221,.08));overflow:hidden}
.twerkhub-pl-vip-inner::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,180,84,.18),transparent 60%);pointer-events:none}
.twerkhub-pl-vip-icon{font-size:42px;margin-bottom:14px;position:relative}
.twerkhub-pl-vip-inner h2{font-family:'Playfair Display',Georgia,serif;font-size:clamp(28px,4vw,42px);font-weight:900;color:#fff;margin-bottom:12px;letter-spacing:-.01em;position:relative}
.twerkhub-pl-vip-inner p{color:rgba(255,255,255,.78);font-size:16px;max-width:560px;margin:0 auto 22px;line-height:1.6;position:relative}
.twerkhub-pl-vip-note{font-size:12px!important;color:rgba(255,255,255,.45)!important;font-style:italic;margin-top:18px!important;letter-spacing:.04em}
.twerkhub-pl-vip-cta{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:999px;background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14!important;font-weight:900;letter-spacing:.08em;text-transform:uppercase;font-size:13px;box-shadow:0 14px 32px rgba(255,45,135,.4);transition:transform .25s,box-shadow .25s;position:relative}
.twerkhub-pl-vip-cta:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(255,45,135,.55)}
.twk-vip-locked .vcard .vthumb img{filter:blur(8px) brightness(.6);transition:filter .35s}
.twk-vip-locked .vcard{cursor:not-allowed;position:relative}
.twk-vip-locked .vcard::after{content:"🔒";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;z-index:5;text-shadow:0 4px 18px rgba(0,0,0,.85);pointer-events:none}
.twk-vip-locked .vcard:hover .vthumb img{filter:blur(6px) brightness(.7)}
.twk-vip-locked .vcard:hover::after{transform:translate(-50%,-50%) scale(1.15)}
</style>
"""


def regenerate_playlist(template: str, p: dict) -> str:
    """Apply all substitutions for one playlist."""
    data_path = find_data_file(p["data"])
    data = json.loads(data_path.read_text(encoding="utf-8"))
    videos = data["videos"]
    # CRITICAL: normalize all titles BEFORE any regex/HTML insertion.
    # Some scraped data has literal "&", trailing backslashes, or
    # control chars that break re.sub when used as a replacement string.
    for v in videos:
        v["title"] = normalize_title(v.get("title", ""))
    hero_id = data["hero"]
    n = len(videos)
    canonical = f"https://alexiatwerkgroup.com/{p['slug']}/"
    accessible = not p["vip_locked"]

    html = template

    # 1. Title
    html = re.sub(
        r"<title>[^<]*</title>",
        f"<title>{escape_html(p['title'])}</title>",
        html,
        count=1,
    )

    # 2. Meta description
    html = re.sub(
        r'<meta name="description" content="[^"]*"/>',
        f'<meta name="description" content="{escape_attr(p["meta_desc"])}"/>',
        html,
        count=1,
    )

    # 3. Canonical
    html = re.sub(
        r'<link rel="canonical" href="https://alexiatwerkgroup\.com/playlist/">',
        f'<link rel="canonical" href="{canonical}">',
        html,
    )

    # 4. Hreflang en + x-default
    html = html.replace(
        '<link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/playlist/">',
        f'<link rel="alternate" hreflang="en" href="{canonical}">',
    )
    html = html.replace(
        '<link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/playlist/">',
        f'<link rel="alternate" hreflang="x-default" href="{canonical}">',
    )

    # 5. OpenGraph + Twitter Card
    # Use lambdas everywhere to avoid backslash interpretation in replacement strings.
    og_image = f"https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"
    og_title = p["title"]
    og_desc = p["meta_desc"]

    _og_title_meta = f'<meta property="og:title" content="{escape_attr(og_title)}"/>'
    html = re.sub(r'<meta property="og:title" content="[^"]*"/>', lambda _m: _og_title_meta, html, count=1)
    _og_desc_meta = f'<meta property="og:description" content="{escape_attr(og_desc)}"/>'
    html = re.sub(r'<meta property="og:description" content="[^"]*"/>', lambda _m: _og_desc_meta, html, count=1)
    html = html.replace(
        '<meta property="og:url" content="https://alexiatwerkgroup.com/playlist/"/>',
        f'<meta property="og:url" content="{canonical}"/>',
    )
    # Replace all OG image/twitter image URLs to hero thumbnail
    html = re.sub(r'https://i\.ytimg\.com/vi/X-lPzSuvf3k/hqdefault\.jpg', lambda _m: og_image, html)
    _og_alt = f'<meta property="og:image:alt" content="{escape_attr(og_title)}"/>'
    html = re.sub(r'<meta property="og:image:alt" content="[^"]*"/>', lambda _m: _og_alt, html, count=1)
    _tw_title = f'<meta name="twitter:title" content="{escape_attr(og_title)}"/>'
    html = re.sub(r'<meta name="twitter:title" content="[^"]*"/>', lambda _m: _tw_title, html, count=1)
    _tw_desc = f'<meta name="twitter:description" content="{escape_attr(og_desc)}"/>'
    html = re.sub(
        r'<meta name="twitter:description" content="[^"]*"/>',
        lambda _m: _tw_desc,
        html,
        count=1,
    )
    _tw_alt = f'<meta name="twitter:image:alt" content="{escape_attr(og_title)}"/>'
    html = re.sub(r'<meta name="twitter:image:alt" content="[^"]*"/>', lambda _m: _tw_alt, html, count=1)

    # 6. JSON-LD ImageObject (first one) — keep simple
    image_jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "contentUrl": og_image,
        "url": og_image,
        "width": 480,
        "height": 360,
        "caption": og_title,
        "representativeOfPage": True,
    }, ensure_ascii=False)
    _img_script = f'<script type="application/ld+json">{image_jsonld}</script>'
    html = re.sub(
        r'<script type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ImageObject"[^<]*</script>',
        lambda _m: _img_script,
        html,
        count=1,
    )

    # 7. JSON-LD CollectionPage — fully replace
    cp_jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": p["title"],
        "url": canonical,
        "description": p["meta_desc"],
        "inLanguage": "en",
        "isPartOf": {"@type": "WebSite", "name": "Twerkhub", "url": "https://alexiatwerkgroup.com/"},
        "hasPart": json.loads(build_collectionpage_haspart(videos, accessible=accessible)),
    }, ensure_ascii=False)
    _cp_script = f'<script type="application/ld+json">{cp_jsonld}</script>'
    html = re.sub(
        r'<script type="application/ld\+json">\{"@context":"https://schema\.org","@type":"CollectionPage"[^<]*</script>',
        lambda _m: _cp_script,
        html,
        count=1,
    )

    # 8. JSON-LD ItemList — fully replace
    il_jsonld = json.dumps(build_itemlist(videos, accessible=accessible), ensure_ascii=False)
    _il_script = f'<script type="application/ld+json">{il_jsonld}</script>'
    html = re.sub(
        r'<script type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ItemList"[^<]*</script>',
        lambda _m: _il_script,
        html,
        count=1,
    )

    # 9. Player iframe src — replace hero video ID
    _player_src = f'src="https://www.youtube.com/embed/{hero_id}?'
    html = re.sub(
        r'src="https://www\.youtube\.com/embed/X-lPzSuvf3k\?',
        lambda _m: _player_src,
        html,
        count=1,
    )

    # 10. Hero section h1 + intro
    new_hero = (
        f'<header class="twerkhub-pl-hero">\n'
        f'  <div class="twerkhub-pl-kicker">{p["kicker"]}</div>\n'
        f'  <h1>{p["h1_main"]}<br><span style="opacity:.75;font-size:.7em;font-weight:800">{escape_html(p["h1_sub"])}</span></h1>\n'
        f'  <p class="twerkhub-pl-intro">{escape_html(p["intro"])}</p>\n'
        f'</header>'
    )
    # Use lambda to avoid backslash interpretation in replacement string.
    html = re.sub(
        r'<header class="twerkhub-pl-hero">.*?</header>',
        lambda _m: new_hero,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 11. Player meta — change "Free preview #001" to playlist-specific
    now_title = videos[0]["title"][:60]
    html = re.sub(
        r'<h2 id="twerkhub-pl-now-title">[^<]*</h2>',
        f'<h2 id="twerkhub-pl-now-title">{escape_html(now_title)}</h2>',
        html,
        count=1,
    )

    # 12. Hot ranking sidebar — replace the rk-list contents
    new_rk_list = (
        '    <div class="rk-list" id="hotrank-list">\n'
        + build_rk_items(videos)
        + '\n    </div>'
    )
    html = re.sub(
        r'<div class="rk-list" id="hotrank-list">.*?</div>(?=\s*</aside>)',
        lambda _m: new_rk_list,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 13. Grid section h2 — replace "All <em>526</em> cuts in the room."
    if p["vip_locked"]:
        grid_h2 = '<em>1,500+</em> private cuts.'
    else:
        grid_h2 = f'All <em>{n}</em> cuts in the room.'
    html = re.sub(
        r'<h2>All <em>\d+</em> cuts in the room\.</h2>',
        f'<h2>{grid_h2}</h2>',
        html,
        count=1,
    )

    # 14. Grid contents — replace ALL vcard entries in <div class="grid" id="video-grid">
    new_grid = (
        '<div class="grid" id="video-grid" role="list">\n'
        + build_vcard_grid(videos, p["slug"], p["vip_locked"])
        + '\n  </div>'
    )
    html = re.sub(
        r'<div class="grid" id="video-grid"[^>]*>.*?</div>(?=\s*</section>)',
        lambda _m: new_grid,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 15. VIP banner before grid section
    if p["vip_locked"]:
        # Insert VIP banner BEFORE the grid section
        html = html.replace(
            '<section class="twerkhub-pl-grid-section"',
            VIP_BANNER + '\n<section class="twerkhub-pl-grid-section"',
            1,
        )
        # Add twk-vip-locked class to body
        # Add twk-vip-locked class to body
        html = re.sub(
            r'<body class="twerkhub-pl-page([^"]*)"',
            r'<body class="twerkhub-pl-page\1 twk-vip-locked"',
            html,
            count=1,
        )

    return html


def main():
    print(f"Reading template: {TEMPLATE}")
    template = load_template()
    print(f"  template size: {len(template):,} bytes")

    for p in PLAYLISTS:
        slug = p["slug"]
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_file = out_dir / "index.html"

        try:
            html = regenerate_playlist(template, p)
        except Exception as e:
            print(f"  ✗ {slug}: ERROR — {e}")
            import traceback
            traceback.print_exc()
            continue

        out_file.write_text(html, encoding="utf-8")
        size_kb = len(html) // 1024
        print(f"  ✓ {slug}: {size_kb} KB")


if __name__ == "__main__":
    main()
