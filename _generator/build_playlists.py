#!/usr/bin/env python3
"""
Generates the 4 "leaks" playlists (korean, cosplay-fancam, latina-model, try-on-haul)
from the gold standard playlist-twerk-hub-leaks.html, applying per-theme metadata.

Also generates playlist-twerk-hub.html (= /playlist/) preserving SEO-indexed
content (title, description, canonical, OG, JSON-LD, 18 original videos, hero copy,
and the "Anti" attribution), only replacing the layout/navbar with the new 2.0
standard.

SAGRADAS compliance:
  - nav 6 exactos (Home, Exclusive, Playlists, Tokens, VR, Profile)
  - rk-head literal "Hot ranking this week"
  - body.twerkhub-pl-clean + twerkhub-pl-theater
  - no blur/lock (CSS handles via body scope + auth-patch presence)
  - no WhatsApp
  - no nombres de modelos visibles en el DOM (alt="#NNN"), only in JSON-LD
  - Cache-bust ?v=YYYYMMDD-pN

CLI: python build_playlists.py
Writes:
  - ../playlist-korean.html
  - ../playlist-cosplay-fancam-leaks.html
  - ../playlist-latina-model-leaks.html
  - ../playlist-try-on-haul-leaks.html
  - ../playlist-twerk-hub.html (special: preserves SEO)
"""
from __future__ import annotations
import re
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
GOLD = ROOT / "playlist-twerk-hub-leaks.html"
CACHE_BUST = "20260424-p1"
TOKENS_CACHE_BUST = "20260424-p1"


def load_gold() -> str:
    return GOLD.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Theme definitions for each "leaks" playlist
# ---------------------------------------------------------------------------
# Each entry rewrites only the theme-specific strings; everything else
# (GRID, 5 hot videos, layout, scripts) is inherited from the gold template.
LEAKS = [
    {
        "filename": "playlist-korean.html",
        "data_page": "playlist-korean",
        "console_tag": "twerkhub-korean",
        # SEO-sagrada title format: "Hottest [theme] videos on YouTube · many +18 only"
        "title": "Hottest korean videos on YouTube · many +18 only · Twerkhub",
        "description": "Hottest korean videos on YouTube · many +18 only. Curated korean cuts · updated every week · handpicked by the hub.",
        "keywords": "hottest korean videos, korean twerk, k-pop twerk, oriental twerk, asian twerk, pick of the week, twerkhub",
        "og_description": "Korean cuts, k-pop crossovers, tight studio work. Pick of the week · updated every Friday.",
        "twitter_title": "Hottest korean videos · many +18 only",
        "hero_em": "korean",
        "intro": "Curated korean cuts · updated every week · handpicked by the hub.",
        "jsonld_theme_name": "Hottest korean videos on YouTube · many +18 only · Twerkhub",
        "jsonld_theme_desc": "Hottest korean videos on YouTube · many +18 only. K-pop crossovers, tight studio work. Pick of the week, curated weekly by Twerkhub.",
    },
    {
        "filename": "playlist-cosplay-fancam-leaks.html",
        "data_page": "playlist-cosplay-fancam-leaks",
        "console_tag": "twerkhub-cosplay",
        "title": "Hottest cosplay fancam videos on YouTube · many +18 only · Twerkhub",
        "description": "Hottest cosplay fancam videos on YouTube · many +18 only. Curated cosplay fancam cuts · updated every week · handpicked by the hub.",
        "keywords": "hottest cosplay videos, cosplay fancam, con fancam, anime cosplay twerk, pick of the week, twerkhub",
        "og_description": "Con fancams, anime cosplay, tight booty floor work. Pick of the week · updated every Friday.",
        "twitter_title": "Hottest cosplay fancam videos · many +18 only",
        "hero_em": "cosplay fancam",
        "intro": "Curated cosplay fancam cuts · updated every week · handpicked by the hub.",
        "jsonld_theme_name": "Hottest cosplay fancam videos on YouTube · many +18 only · Twerkhub",
        "jsonld_theme_desc": "Hottest cosplay fancam videos on YouTube · many +18 only. Con fancams, anime cosplay, tight booty floor work. Pick of the week, curated weekly by Twerkhub.",
    },
    {
        "filename": "playlist-latina-model-leaks.html",
        "data_page": "playlist-latina-model-leaks",
        "console_tag": "twerkhub-latina",
        "title": "Hottest latina model videos on YouTube · many +18 only · Twerkhub",
        "description": "Hottest latina model videos on YouTube · many +18 only. Curated latina model cuts · updated every week · handpicked by the hub.",
        "keywords": "hottest latina videos, latina model, latina twerk, LATAM twerk, reggaeton twerk, pick of the week, twerkhub",
        "og_description": "Latina floors, reggaeton tight cuts, models going pro. Pick of the week · updated every Friday.",
        "twitter_title": "Hottest latina model videos · many +18 only",
        "hero_em": "latina model",
        "intro": "Curated latina model cuts · updated every week · handpicked by the hub.",
        "jsonld_theme_name": "Hottest latina model videos on YouTube · many +18 only · Twerkhub",
        "jsonld_theme_desc": "Hottest latina model videos on YouTube · many +18 only. Latina floors, reggaeton tight cuts, models going pro. Pick of the week, curated weekly by Twerkhub.",
    },
    {
        "filename": "playlist-try-on-haul-leaks.html",
        "data_page": "playlist-try-on-haul-leaks",
        "console_tag": "twerkhub-try-on-haul",
        "title": "Hottest try-on haul videos on YouTube · many +18 only · Twerkhub",
        "description": "Hottest try-on haul videos on YouTube · many +18 only. Curated try-on haul cuts · updated every week · handpicked by the hub.",
        "keywords": "hottest try on haul videos, try on haul, bikini try on, fashion haul, pick of the week, twerkhub",
        "og_description": "Try-on haul cuts, bikini drops, tight fabric close-ups. Pick of the week · updated every Friday.",
        "twitter_title": "Hottest try-on haul videos · many +18 only",
        "hero_em": "try-on haul",
        "intro": "Curated try-on haul cuts · updated every week · handpicked by the hub.",
        "jsonld_theme_name": "Hottest try-on haul videos on YouTube · many +18 only · Twerkhub",
        "jsonld_theme_desc": "Hottest try-on haul videos on YouTube · many +18 only. Try-on haul cuts, bikini drops, tight fabric close-ups. Pick of the week, curated weekly by Twerkhub.",
    },
]


def build_leak(gold: str, cfg: dict) -> str:
    """Apply theme-specific metadata to the gold template."""
    html = gold

    # --- Metadata in <head> ---
    html = re.sub(
        r"<title>[^<]*</title>",
        f"<title>{cfg['title']}</title>",
        html, count=1,
    )
    html = re.sub(
        r'<meta name="description" content="[^"]*"/>',
        f'<meta name="description" content="{cfg["description"]}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta name="keywords" content="[^"]*">',
        f'<meta name="keywords" content="{cfg["keywords"]}">',
        html, count=1,
    )
    html = re.sub(
        r'<link rel="canonical" href="[^"]*"/>',
        f'<link rel="canonical" href="https://alexiatwerkgroup.com/{cfg["filename"]}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:title" content="[^"]*"/>',
        f'<meta property="og:title" content="{cfg["title"]}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:description" content="[^"]*"/>',
        f'<meta property="og:description" content="{cfg["og_description"]}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:url" content="[^"]*"/>',
        f'<meta property="og:url" content="https://alexiatwerkgroup.com/{cfg["filename"]}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta name="twitter:title" content="[^"]*"/>',
        f'<meta name="twitter:title" content="{cfg["twitter_title"]}"/>',
        html, count=1,
    )

    # --- JSON-LD CollectionPage name + url + description (first block only) ---
    html = re.sub(
        r'("@type":\s*"CollectionPage",\s*"name":\s*")[^"]*(",\s*"url":\s*")[^"]*(",\s*"description":\s*")[^"]*(")',
        lambda m: m.group(1) + cfg["jsonld_theme_name"]
        + m.group(2) + f'https://alexiatwerkgroup.com/{cfg["filename"]}'
        + m.group(3) + cfg["jsonld_theme_desc"]
        + m.group(4),
        html, count=1,
    )

    # --- Body data-page attribute ---
    html = re.sub(
        r'data-page="[^"]*"',
        f'data-page="{cfg["data_page"]}"',
        html, count=1,
    )

    # --- Hero H1: <em>theme</em> ---
    html = re.sub(
        r"(<header class=\"twerkhub-pl-hero\">\s*<div class=\"twerkhub-pl-kicker\">[^<]*</div>\s*<h1>Hottest <em>)[^<]*(</em>)",
        lambda m: m.group(1) + cfg["hero_em"] + m.group(2),
        html, count=1, flags=re.S,
    )

    # --- Intro paragraph ---
    html = re.sub(
        r'<p class="twerkhub-pl-intro">[^<]*</p>',
        f'<p class="twerkhub-pl-intro">{cfg["intro"]}</p>',
        html, count=1,
    )

    # --- Console.info tag ---
    html = re.sub(
        r"console\.info\('\[twerkhub-leaks\] [^']*'\)",
        f"console.info('[{cfg['console_tag']}] theater boot')",
        html, count=1,
    )
    html = re.sub(
        r"console\.error\('\[twerkhub-leaks\] [^']*'",
        f"console.error('[{cfg['console_tag']}] theater init crashed'",
        html, count=1,
    )

    # --- Cache-bust on CSS + trailing scripts ---
    html = re.sub(
        r'\?v=20260420-p22([^&"\']*)',
        lambda m: f"?v={CACHE_BUST}",
        html,
    )

    # --- Inject Token HUD (CSS in <head>, JS before </body>) ---
    tokens_css_tag = (
        f'\n<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v={TOKENS_CACHE_BUST}">'
    )
    if "twerkhub-tokens.css" not in html:
        html = html.replace("</head>", tokens_css_tag + "\n</head>", 1)

    polish_css_tag = (
        f'\n<link rel="stylesheet" href="/assets/twerkhub-polish.css?v={TOKENS_CACHE_BUST}">'
    )
    if "twerkhub-polish.css" not in html:
        html = html.replace("</head>", polish_css_tag + "\n</head>", 1)
    tokens_js_tag = (
        f'\n<script defer src="/assets/twerkhub-tokens.js?v={TOKENS_CACHE_BUST}"></script>'
    )
    if "twerkhub-tokens.js" not in html:
        html = html.replace("</body>", tokens_js_tag + "\n</body>", 1)

    sound_js_tag = (
        f'\n<script defer src="/assets/twerkhub-sound-on-interaction.js?v={TOKENS_CACHE_BUST}"></script>'
    )
    if "twerkhub-sound-on-interaction.js" not in html:
        html = html.replace("</body>", sound_js_tag + "\n</body>", 1)

    # topbar-enhance MUST load before the locale switcher so the .twerkhub-locale-slot
    # exists when the switcher mounts.
    topbar_enhance_tag = (
        f'\n<script defer src="/assets/twerkhub-topbar-enhance.js?v={TOKENS_CACHE_BUST}"></script>'
    )
    if "twerkhub-topbar-enhance.js" not in html:
        html = html.replace("</body>", topbar_enhance_tag + "\n</body>", 1)

    locale_js_tag = (
        f'\n<script defer src="/assets/twerkhub-locale-switcher.js?v={TOKENS_CACHE_BUST}"></script>'
    )
    if "twerkhub-locale-switcher.js" not in html:
        html = html.replace("</body>", locale_js_tag + "\n</body>", 1)

    mobile_nav_js_tag = (
        f'\n<script defer src="/assets/twerkhub-mobile-nav.js?v={TOKENS_CACHE_BUST}"></script>'
    )
    if "twerkhub-mobile-nav.js" not in html:
        html = html.replace("</body>", mobile_nav_js_tag + "\n</body>", 1)

    return html


# ---------------------------------------------------------------------------
# Special: playlist-twerk-hub.html (= /playlist/) — preserve SEO, change layout
# ---------------------------------------------------------------------------
# The 18 original videos from the deployed /playlist/ page, in order.
# SEO-indexed — do not change IDs, titles or tags.
TWERK_HUB_VIDEOS = [
    {"id": "cINCQDEgJvs", "title": "Signature opener · vault drop",           "tag": "Exclusive"},
    {"id": "P2OfySfL_nc", "title": "Replay-tier · the one that started it",    "tag": "Flagship"},
    {"id": "rVcARcoZ9C4", "title": "Studio set · 4K archive pick",             "tag": "4K · VIP"},
    {"id": "Q8IbK72NtAs", "title": "Hot reel · ranked",                        "tag": "Hot"},
    {"id": "qD5xbr5hnVo", "title": "Weekly drop · curated",                    "tag": "This week"},
    {"id": "Caggn9-eEF4", "title": "Crossover · cosplay × twerk",              "tag": "Crossover"},
    {"id": "uNPxpALefYQ", "title": "LATAM signature · Tainara tier",           "tag": "LATAM"},
    {"id": "Mwian64YLsU", "title": "Oriental cut · premium archive",           "tag": "Oriental"},
    {"id": "6Oi6EoujCB0", "title": "Blue signature · try-on drop",             "tag": "Signature"},
    {"id": "M8ASJ83NzZo", "title": "Vault · weekly rotation",                  "tag": "Vault"},
    {"id": "kDY1OZz2xcc", "title": "Hot ranking · top 10 inbound",             "tag": "Top 10"},
    {"id": "26B0xMWCwvo", "title": "Late-night cut · restricted",              "tag": "Night"},
    {"id": "GSeYEJ3qIxU", "title": "Choreo bundle · studio grade",             "tag": "Studio"},
    {"id": "MpuKeRU4GT0", "title": "Alexia feature · handpicked",              "tag": "Alexia · pick"},
    {"id": "6FnVqNns-bc", "title": "Crossover · K-pop × twerk",                "tag": "K-Pop"},
    {"id": "RsSPyDDEG0c", "title": "Premium drop · VIP eyes only",             "tag": "VIP"},
    {"id": "m-0xxwpU780", "title": "Dance floor tier · raw cut",               "tag": "Raw"},
    {"id": "Is-tH_ak0f8", "title": "Flagship closer · the replay",             "tag": "Closer"},
]

HUB_RANK_COLORS = ["gold", "purple", "pink", "monochrome", "monochrome"]


def _esc(s: str) -> str:
    return s.replace('"', '&quot;')


def build_twerk_hub() -> str:
    """
    /playlist/ — preserve all SEO-indexed content; apply new 2.0 layout + nav.
    """
    # Top 5 = first 5 videos
    top5 = TWERK_HUB_VIDEOS[:5]
    rest = TWERK_HUB_VIDEOS[5:]

    # ---- JSON-LD CollectionPage: preserve original name/description/url ----
    jsonld_main = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "TWERKHUB · The Main Archive",
        "url": "https://alexiatwerkgroup.com/playlist-twerk-hub",
        "description": "Flagship twerk archive inside Twerkhub. Hand-picked replay favorites, ranked.",
        "isPartOf": {"@type": "WebSite", "name": "Twerkhub", "url": "https://alexiatwerkgroup.com/"},
    }
    # Serialize JSON-LD with videos as hasPart
    import json as _json
    has_part = []
    for i, v in enumerate(TWERK_HUB_VIDEOS, start=1):
        has_part.append({
            "@type": "VideoObject",
            "name": v["title"],
            "description": f'{v["title"]} · Twerkhub · {v["tag"]}',
            "thumbnailUrl": f'https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg',
            "uploadDate": "2026-04-20",
            "contentUrl": f'https://www.youtube.com/watch?v={v["id"]}',
            "embedUrl": f'https://www.youtube.com/embed/{v["id"]}',
            "inLanguage": "en",
            "isFamilyFriendly": False,
            "position": i,
        })
    jsonld_main["hasPart"] = has_part
    jsonld_str = _json.dumps(jsonld_main, ensure_ascii=False, separators=(", ", ": "))

    # ---- Top 5 sidebar rk-items with thumbs ----
    top5_html = []
    for i, v in enumerate(top5):
        number = f"#{str(i+1).zfill(3)}"
        rank = f"#{str(i+1).zfill(2)}"
        color = HUB_RANK_COLORS[i]
        top5_html.append(f'''      <a class="rk-item" data-hot="1" data-vid="{v["id"]}" data-number="{number}" href="#">
        <div class="rk-num {color}">{rank}</div>
        <div class="rk-thumb"><img src="https://i.ytimg.com/vi/{v["id"]}/default.jpg" alt="Free preview {number}" decoding="async"></div>
      </a>''')
    top5_html = "\n".join(top5_html)

    # ---- Grid: Top 5 hot (data-hot=1) + remaining 13 with data-vid real ----
    grid_cards = []
    for i, v in enumerate(top5):
        number = f"#{str(i+1).zfill(3)}"
        grid_cards.append(f'''    <a class="vcard reveal" data-hot="1" data-vid="{v["id"]}" data-number="{number}" href="#" role="listitem">
      <div class="vthumb"><img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="{_esc(v["title"])}" decoding="async" onerror="this.src='https://i.ytimg.com/vi/{v["id"]}/default.jpg'"><div class="vscrim"></div><div class="vplay"></div></div>
    </a>''')
    for i, v in enumerate(rest, start=6):
        number = f"#{str(i).zfill(3)}"
        grid_cards.append(f'''    <a class="vcard reveal" data-hot="1" data-vid="{v["id"]}" data-number="{number}" href="#" role="listitem">
      <div class="vthumb"><img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="{_esc(v["title"])}" decoding="async" onerror="this.src='https://i.ytimg.com/vi/{v["id"]}/default.jpg'"><div class="vscrim"></div><div class="vplay"></div></div>
    </a>''')
    grid_html = "\n".join(grid_cards)

    # ---- Final HTML ----
    # Keep hero copy 100% as originally indexed.
    hero_h1 = '<h1>Twerk <em>Hub.</em><br><span style="opacity:.75;font-size:.7em;font-weight:800">The signature archive.</span></h1>'
    hero_intro = '<p class="twerkhub-pl-intro">The flagship playlist inside Twerkhub. Hand-picked by the house — replay favorites, hottest openers, the ones that built the archive. Ranked. Tight. No filler.</p>'

    first_vid = top5[0]["id"]

    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://www.youtube-nocookie.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; img-src 'self' data: https://i.ytimg.com https://yt3.ggpht.com https://www.googletagmanager.com https://www.google-analytics.com; media-src 'self' https://www.youtube.com; connect-src 'self' https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; base-uri 'self'; form-action 'self'"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>TWERKHUB · The Main Archive · Flagship Twerk Playlist</title>
<meta name="description" content="TWERKHUB main archive — the flagship twerk playlist. Hand-picked hottest clips, ranked replay favorites and signature drops. If you know, you know."/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="https://alexiatwerkgroup.com/playlist-twerk-hub"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Twerkhub"/>
<meta property="og:title" content="TWERKHUB · The Main Archive"/>
<meta property="og:description" content="The flagship twerk playlist. Hand-picked. Ranked. Replay-tier."/>
<meta property="og:url" content="https://alexiatwerkgroup.com/playlist-twerk-hub"/>
<meta property="og:image" content="https://alexiatwerkgroup.com/hero_alexia_local.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="rating" content="mature"/>
<meta name="theme-color" content="#05050a"/>
<link rel="icon" href="/favicon-32.png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="preconnect" href="https://www.youtube.com" crossorigin>

<style>*{{box-sizing:border-box;margin:0;padding:0}}body.twerkhub-pl-page{{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;color:#f5f5fb;background:#05050a;min-height:100vh;line-height:1.55;-webkit-font-smoothing:antialiased;padding-bottom:80px}}body.twerkhub-pl-page a{{color:inherit;text-decoration:none}}.twerkhub-pl-visually-hidden{{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}.twerkhub-pl-skip{{position:absolute;top:-60px;left:12px;z-index:9999;padding:10px 16px;background:#1ee08f;color:#000;border-radius:6px;font-weight:700;transition:top .2s}}.twerkhub-pl-skip:focus{{top:12px;outline:2px solid #ffb454}}</style>

<link rel="preload" href="/assets/twerkhub-page.css?v={CACHE_BUST}" as="style">
<link rel="stylesheet" href="/assets/twerkhub-page.css?v={CACHE_BUST}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/twerkhub-page.css?v={CACHE_BUST}"></noscript>

<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap"></noscript>

<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v={TOKENS_CACHE_BUST}">
<link rel="stylesheet" href="/assets/twerkhub-polish.css?v={TOKENS_CACHE_BUST}">

<script type="application/ld+json">
{jsonld_str}
</script>
</head>
<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-twerk-hub">

<a class="twerkhub-pl-skip" href="#twerkhub-pl-main">Skip to main content</a>

<nav class="twerkhub-pl-topbar" aria-label="Primary">
  <div class="twerkhub-pl-topbar-inner">
    <a class="twerkhub-pl-tb-brand" href="/" aria-label="Twerkhub · home">
      <img class="twerkhub-pl-tb-logo" src="/logo-twerkhub.png" alt="Twerkhub" loading="eager" decoding="async" width="34" height="34">
      <span class="twerkhub-pl-tb-brand-sub">Est. 2018</span>
    </a>
    <div class="twerkhub-pl-tb-nav">
      <a href="/">Home</a>
      <a href="/#private-models">Exclusive</a>
      <a href="/#playlists" class="is-active" aria-current="page">Playlists</a>
      <a href="/community.html">Community</a>
      <a href="/membership.html">Membership</a>
      <a href="/account.html">My Account</a>
      <a href="/profile.html">Profile</a>
    </div>
  </div>
</nav>

<header class="twerkhub-pl-hero">
  <div class="twerkhub-pl-kicker">/ The main archive · flagship</div>
  {hero_h1}
  {hero_intro}
</header>

<main id="twerkhub-pl-main" class="twerkhub-pl-theater-main">
  <div class="twerkhub-pl-player-col">
    <div class="twerkhub-pl-player-wrap">
      <iframe id="twerkhub-pl-player"
              src="https://www.youtube-nocookie.com/embed/{first_vid}?autoplay=1&amp;mute=1&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1"
              title="Twerk Hub · now playing"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen></iframe>
    </div>
    <div class="twerkhub-pl-player-meta">
      <span class="twerkhub-pl-player-now">▶ Now playing</span>
      <h2 id="twerkhub-pl-now-title">Free preview #001</h2>
    </div>
  </div>

  <aside class="hotrank twerkhub-pl-theater-rank" aria-label="Hot ranking">
    <h2 class="twerkhub-pl-hotrank-h2">Hot ranking this week</h2>
    <div class="rk-list" id="hotrank-list">
{top5_html}
    </div>
  </aside>
</main>

<section class="twerkhub-pl-grid-section" aria-label="Full archive">
  <div class="twerkhub-pl-grid-head">
    <div class="twerkhub-pl-kicker">/ The full playlist</div>
    <h2>All <em>18</em> cuts in the room.</h2>
    <p>Tap a cover to play.</p>
  </div>
  <div class="grid" id="video-grid" role="list">
{grid_html}
  </div>
</section>

<section class="twerkhub-pl-cta-final" aria-label="Keep going">
  <h2>Keep going — the <em>next move</em> is yours.</h2>
  <div class="twerkhub-pl-cta-row">
    <a class="twerkhub-btn twerkhub-btn-primary" href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener">Talk to Alexia →</a>
    <a class="twerkhub-btn twerkhub-btn-ghost" href="/#playlists">Browse playlists</a>
  </div>
</section>

<footer class="twerkhub-pl-footer" role="contentinfo">
  <div class="twerkhub-pl-slogan">If you know, you know.</div>
  <div class="twerkhub-pl-founded">© 2026 Twerkhub · founded by <em>Anti</em> (firestarter)</div>
</footer>

<script>
(function(){{
  'use strict';
  if (window.__twerkhubHubTheaterInit) return;
  window.__twerkhubHubTheaterInit = true;
  try {{
    console.info('[twerkhub-hub] theater boot');
    var player = document.getElementById('twerkhub-pl-player');
    var title  = document.getElementById('twerkhub-pl-now-title');
    function swap(vid, number){{
      if (!player) return;
      var url = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid) +
                '?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';
      player.src = url;
      if (title && number) title.textContent = 'Free preview ' + number;
      try {{ player.closest('.twerkhub-pl-player-wrap').scrollIntoView({{behavior:'smooth', block:'center'}}); }} catch(_){{}}
    }}
    document.addEventListener('click', function(ev){{
      var hot = ev.target.closest && ev.target.closest('[data-hot="1"]');
      if (!hot) return;
      var vid = hot.getAttribute('data-vid');
      var num = hot.getAttribute('data-number') || '';
      if (!vid) return;
      ev.preventDefault();
      ev.stopPropagation();
      swap(vid, num);
    }});
  }} catch(e) {{
    console.error('[twerkhub-hub] theater init crashed', e);
  }}
}})();
</script>

<script defer src="/assets/global-brand.js?v={CACHE_BUST}-twerk-hub"></script>
<script defer src="/assets/twerkhub-tokens.js?v={TOKENS_CACHE_BUST}"></script>
</body>
</html>
'''
    return html


# ---------------------------------------------------------------------------
# Special: /playlist/index.html (flagship, indexed)
# ---------------------------------------------------------------------------
# SEO-sagrada EXCEPT regla SEO — per Anti 2026-04-23: /playlist/ is the
# original indexed URL (Google indexed it with the old backup's title, descr,
# canonical). We preserve those metadata strings 1:1 and only swap the *layout*
# to Twerkhub 2.0. All clicks inside swap the inline player (same UX as the
# "leaks" playlists).
#
# The individual video pages under /playlist/*.html are NOT touched — each one
# is independently indexed by Google with its own canonical, and we keep them
# on the filesystem so those indexed URLs stay alive.
def build_playlist_index(gold: str) -> str:
    """Rebuild /playlist/index.html from the gold template, preserving the
    SEO-indexed title/description/canonical of the original /playlist/ URL."""
    html = gold

    # Metadata preserved from the PWA_BACKUP_VERSION_1_TERMINADA original.
    title = "Best Twerk Videos on YouTube (2026) | Viral Dance Playlist | Alexia Twerk Group"
    description = (
        "Watch the hottest twerk videos on YouTube in one curated playlist. "
        "Explore viral dance clips, trending performers, and top replay-worthy "
        "videos inside Alexia Twerk Group."
    )
    canonical = "https://alexiatwerkgroup.com/playlist/"
    og_description = (
        "Watch the hottest twerk videos on YouTube in one curated playlist. "
        "Viral dance clips, trending performers, top replay-worthy videos."
    )

    html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html, count=1)
    html = re.sub(
        r'<meta name="description" content="[^"]*"/>',
        f'<meta name="description" content="{description}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta name="keywords" content="[^"]*">',
        '<meta name="keywords" content="twerk videos, viral dance, youtube playlist, '
        'alexia twerk group, hottest twerk, trending dance, twerkhub">',
        html, count=1,
    )
    html = re.sub(
        r'<link rel="canonical" href="[^"]*"/>',
        f'<link rel="canonical" href="{canonical}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:title" content="[^"]*"/>',
        f'<meta property="og:title" content="{title}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:description" content="[^"]*"/>',
        f'<meta property="og:description" content="{og_description}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta property="og:url" content="[^"]*"/>',
        f'<meta property="og:url" content="{canonical}"/>',
        html, count=1,
    )
    html = re.sub(
        r'<meta name="twitter:title" content="[^"]*"/>',
        '<meta name="twitter:title" content="Best Twerk Videos on YouTube — Viral Dance Playlist"/>',
        html, count=1,
    )

    # JSON-LD CollectionPage: update name/url/description.
    html = re.sub(
        r'("@type":\s*"CollectionPage",\s*"name":\s*")[^"]*(",\s*"url":\s*")[^"]*(",\s*"description":\s*")[^"]*(")',
        lambda m: m.group(1) + title
        + m.group(2) + canonical
        + m.group(3) + description
        + m.group(4),
        html, count=1,
    )

    # /playlist/index.html loads from a subfolder, so asset URLs relative to the
    # root ("/assets/...") still work correctly because the browser resolves
    # the leading slash against the origin, not the current path. Nothing to
    # rewrite here.

    # Body attribute + log tag so debugging output is clear.
    html = re.sub(r'data-page="[^"]*"', 'data-page="playlist-index"', html, count=1)
    html = re.sub(
        r"console\.info\('\[twerkhub-leaks\] [^']*'\)",
        "console.info('[twerkhub-playlist] theater boot')",
        html, count=1,
    )
    html = re.sub(
        r"console\.error\('\[twerkhub-leaks\] [^']*'",
        "console.error('[twerkhub-playlist] theater init crashed'",
        html, count=1,
    )

    # Hero copy: swap the "twerk" adjective out, keep wording consistent with
    # the indexed metadata ("hottest viral dance").
    html = re.sub(
        r"(<header class=\"twerkhub-pl-hero\">\s*<div class=\"twerkhub-pl-kicker\">[^<]*</div>\s*<h1>Hottest <em>)[^<]*(</em>)",
        lambda m: m.group(1) + "twerk" + m.group(2),
        html, count=1, flags=re.S,
    )
    html = re.sub(
        r'<p class="twerkhub-pl-intro">[^<]*</p>',
        '<p class="twerkhub-pl-intro">The original viral dance archive. Curated every week · handpicked by the hub.</p>',
        html, count=1,
    )

    # Cache-bust.
    html = re.sub(
        r'\?v=20260420-p22([^&"\']*)',
        lambda m: f"?v={CACHE_BUST}",
        html,
    )

    # ── Replace the 60-card grid from the gold template with the FULL 275-card
    #    grid scraped from the existing /playlist/*.html files. This gives us
    #    (slug, yt_id, title) for every individual video page so we can both
    #    render every card AND sync the URL bar on click via pushState. ──────
    entries = scrape_playlist_folder()
    if entries:
        grid_html = _build_275_grid(entries)
        # Replace everything inside <div class="grid" id="video-grid" role="list"> ... </div>
        html = re.sub(
            r'(<div class="grid" id="video-grid" role="list">)[\s\S]*?(</div>\s*</section>)',
            lambda m: m.group(1) + "\n" + grid_html + "\n  " + m.group(2),
            html,
            count=1,
        )
        # Update the "All 60 cuts in the room." headline.
        html = re.sub(
            r'(<h2>All <em>)\d+(</em> cuts in the room\.</h2>)',
            lambda m: m.group(1) + str(len(entries)) + m.group(2),
            html,
            count=1,
        )
        # Replace the hard-coded GRID variable inside the inline script with
        # the full list so the legacy renderer logic won't double up cards.
        js_grid = "[" + ", ".join(
            '{{"id": "{vid}", "number": "#{num}", "slug": "{slug}"}}'.format(
                vid=e["vid"], num=str(i+1).zfill(3), slug=e["slug"]
            ) for i, e in enumerate(entries)
        ) + "]"
        html = re.sub(r'var GRID = \[[^;]*\];', "var GRID = " + js_grid + ";", html, count=1)
        # Inject the slug-aware swap handler (history.pushState on click).
        if "twerkhub-playlist-slug-router" not in html:
            router = PLAYLIST_SLUG_ROUTER_JS.replace("{{TOTAL}}", str(len(entries)))
            html = html.replace("</body>", router + "\n</body>", 1)

    # Inject Token HUD so the coin + toasts work inside /playlist/ too.
    if "twerkhub-tokens.css" not in html:
        html = html.replace(
            "</head>",
            f'\n<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v={TOKENS_CACHE_BUST}">\n</head>',
            1,
        )
    if "twerkhub-tokens.js" not in html:
        html = html.replace(
            "</body>",
            f'\n<script defer src="/assets/twerkhub-tokens.js?v={TOKENS_CACHE_BUST}"></script>\n</body>',
            1,
        )
    # Global UX helpers also for /playlist/index.html.
    if "twerkhub-sound-on-interaction.js" not in html:
        html = html.replace(
            "</body>",
            f'\n<script defer src="/assets/twerkhub-sound-on-interaction.js?v={TOKENS_CACHE_BUST}"></script>\n</body>',
            1,
        )
    if "twerkhub-locale-switcher.js" not in html:
        html = html.replace(
            "</body>",
            f'\n<script defer src="/assets/twerkhub-locale-switcher.js?v={TOKENS_CACHE_BUST}"></script>\n</body>',
            1,
        )
    if "twerkhub-mobile-nav.js" not in html:
        html = html.replace(
            "</body>",
            f'\n<script defer src="/assets/twerkhub-mobile-nav.js?v={TOKENS_CACHE_BUST}"></script>\n</body>',
            1,
        )

    return html


# ---------------------------------------------------------------------------
# Scrape the ./playlist/ folder for (slug, yt_id, title) tuples
# ---------------------------------------------------------------------------
def _is_good_slug(fname):
    """Reject junk slug files that Google hasn't indexed — short numeric
    patterns like `-twerk-4.html`, `-twerk.html`, `-twerk-10age.html`, etc.
    Keep only slugs with a real descriptive name (at least 4 hyphen-separated
    tokens and ≥20 chars)."""
    base = fname[:-5] if fname.endswith(".html") else fname
    if len(base) < 20:
        return False
    # Reject leading-hyphen patterns like "-twerk-4"
    if base.startswith("-"):
        return False
    parts = base.split("-")
    if len(parts) < 3:
        return False
    return True


def scrape_playlist_folder():
    """Iterate over every ./playlist/*.html EXCEPT index.html, extract the
    first YouTube ID and the <title> so we can build a 275-card grid with
    links back to each indexed page."""
    import os
    pl_dir = ROOT / "playlist"
    if not pl_dir.is_dir():
        return []
    entries = []
    seen_vids = set()
    for fname in sorted(os.listdir(pl_dir)):
        if not fname.endswith(".html") or fname == "index.html":
            continue
        # Skip junk slugs (e.g. "-twerk-4.html") that aren't Google-indexed.
        if not _is_good_slug(fname):
            continue
        fp = pl_dir / fname
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Prefer actual iframe embed, fall back to thumbnail URL, then to
        # any 11-char ID string in a YouTube-looking URL.
        m = re.search(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})', text)
        if not m:
            m = re.search(r'i\.ytimg\.com/vi/([A-Za-z0-9_-]{11})/', text)
        if not m:
            m = re.search(r'youtube\.com/watch\?v=([A-Za-z0-9_-]{11})', text)
        if not m:
            continue
        vid = m.group(1)
        if vid in seen_vids:
            continue
        seen_vids.add(vid)
        t = re.search(r'<title>([^<]+)</title>', text)
        title = (t.group(1) if t else fname.replace(".html", "").replace("-", " ")).strip()
        # Cap title at 80 chars to keep the grid tidy.
        if len(title) > 80:
            title = title[:77] + "…"
        entries.append({"slug": fname, "vid": vid, "title": title})
    return entries


def _build_275_grid(entries):
    """Render one <a class='vcard'> per entry. Uses data-hot=1 so the existing
    swap() handler picks them up. Adds data-slug for the URL bar sync."""
    out = []
    for i, e in enumerate(entries, start=1):
        number = "#" + str(i).zfill(3)
        slug_attr = e["slug"].replace('"', '&quot;')
        vid = e["vid"]
        title = e["title"].replace('"', '&quot;').replace("<", "&lt;").replace(">", "&gt;")
        out.append(
            f'    <a class="vcard reveal" data-hot="1" data-vid="{vid}" '
            f'data-slug="{slug_attr}" data-number="{number}" '
            f'href="/playlist/{slug_attr}" role="listitem" aria-label="{title}">'
            f'<div class="vthumb">'
            f'<img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{number}" '
            f'decoding="async" loading="lazy" '
            f'onerror="this.src=\'https://i.ytimg.com/vi/{vid}/default.jpg\'">'
            f'<div class="vscrim"></div><div class="vplay"></div></div></a>'
        )
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Inline JS for the slug-aware click router (only on /playlist/index.html)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Regenerate every individual /playlist/<slug>.html at the 2.0 layout
# ---------------------------------------------------------------------------
def regenerate_individual_video_pages(gold, pl_dir):
    """For each /playlist/<slug>.html (except index.html and junk slugs),
    rewrite the page with the Twerkhub 2.0 theater layout, preserving
    per-page SEO (title, description, canonical, og tags) AND the yt_id.

    Returns the number of files written.
    """
    import os, html as htmllib
    count = 0
    for fname in sorted(os.listdir(pl_dir)):
        if not fname.endswith(".html") or fname == "index.html":
            continue
        if not _is_good_slug(fname):
            continue
        fp = pl_dir / fname
        try:
            raw = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Extract per-page SEO + yt_id from the original backup file.
        vid_m = re.search(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{11})', raw)
        if not vid_m:
            vid_m = re.search(r'i\.ytimg\.com/vi/([A-Za-z0-9_-]{11})/', raw)
        if not vid_m:
            continue
        vid = vid_m.group(1)

        title_m = re.search(r'<title>([^<]+)</title>', raw)
        descr_m = re.search(r'<meta name="description" content="([^"]*)"', raw)
        canon_m = re.search(r'<link rel="canonical" href="([^"]*)"', raw)

        seo_title = (title_m.group(1) if title_m else fname.replace(".html","")).strip()
        seo_descr = (descr_m.group(1) if descr_m else "").strip() or (
            "Watch " + seo_title + " inside the Alexia Twerk Group archive."
        )
        seo_canon = (canon_m.group(1) if canon_m else "").strip() or (
            "https://alexiatwerkgroup.com/playlist/" + fname
        )
        short_title = seo_title.replace(" | Alexia Twerk Group", "").replace(
            " | Viral Dance Playlist", ""
        ).strip()

        new_html = render_individual_video_page(
            yt_id=vid,
            slug=fname,
            title=seo_title,
            description=seo_descr,
            canonical=seo_canon,
            display_title=short_title[:120],
        )
        try:
            fp.write_text(new_html, encoding="utf-8", newline="\n")
            count += 1
        except Exception as e:
            print("  skip", fname, "·", e)
    return count


def render_individual_video_page(yt_id, slug, title, description, canonical, display_title):
    """Render one /playlist/<slug>.html at the Twerkhub 2.0 layout. The page
    keeps its Google-indexed metadata but changes the chrome to the modern
    theater look (nav SAGRADA, hero, inline player, back-to-archive CTA)."""
    safe_title = title.replace("<","&lt;").replace(">","&gt;").replace('"','&quot;')
    safe_disp = display_title.replace("<","&lt;").replace(">","&gt;")
    safe_descr = description.replace('"','&quot;')
    safe_canon = canonical.replace('"','&quot;')

    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>{safe_title}</title>
<meta name="description" content="{safe_descr}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="{safe_canon}"/>
<meta property="og:type" content="video.other"/>
<meta property="og:site_name" content="Alexia Twerk Group"/>
<meta property="og:title" content="{safe_title}"/>
<meta property="og:description" content="{safe_descr}"/>
<meta property="og:url" content="{safe_canon}"/>
<meta property="og:image" content="https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg"/>
<meta property="og:video" content="https://www.youtube.com/embed/{yt_id}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{safe_title}"/>
<meta name="twitter:image" content="https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg"/>
<meta name="rating" content="mature"/>
<meta name="theme-color" content="#05050a"/>
<link rel="icon" href="/favicon-32.png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="preconnect" href="https://www.youtube.com" crossorigin>

<link rel="stylesheet" href="/assets/twerkhub-page.css?v={CACHE_BUST}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v={TOKENS_CACHE_BUST}">
<link rel="stylesheet" href="/assets/twerkhub-polish.css?v={TOKENS_CACHE_BUST}">

<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"VideoObject","name":"{safe_title}","description":"{safe_descr}","thumbnailUrl":"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg","uploadDate":"2026-04-20","contentUrl":"https://www.youtube.com/watch?v={yt_id}","embedUrl":"https://www.youtube.com/embed/{yt_id}","url":"{safe_canon}","inLanguage":"en","isFamilyFriendly":false,"isPartOf":{{"@type":"CollectionPage","name":"Best Twerk Videos on YouTube","url":"https://alexiatwerkgroup.com/playlist/"}}}}
</script>
</head>
<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-video">

<a class="twerkhub-pl-skip" href="#twerkhub-pl-main">Skip to main content</a>

<nav class="twerkhub-pl-topbar" aria-label="Primary">
  <div class="twerkhub-pl-topbar-inner">
    <a class="twerkhub-pl-tb-brand" href="/" aria-label="Twerkhub · home">
      <img class="twerkhub-pl-tb-logo" src="/logo-twerkhub.png" alt="Twerkhub" loading="eager" decoding="async" width="34" height="34">
      <span class="twerkhub-pl-tb-brand-sub">Est. 2018</span>
    </a>
    <div class="twerkhub-pl-tb-nav">
      <a href="/">Home</a>
      <a href="/#private-models">Exclusive</a>
      <a href="/playlist/" class="is-active" aria-current="page">Playlists</a>
      <a href="/community.html">Community</a>
      <a href="/membership.html">Membership</a>
      <a href="/account.html">My Account</a>
      <a href="/profile.html">Profile</a>
    </div>
  </div>
</nav>

<header class="twerkhub-pl-hero" style="text-align:left;max-width:1320px;margin:28px auto 12px;padding:0 26px">
  <div class="twerkhub-pl-kicker">/ From the archive</div>
  <h1 style="font-size:clamp(22px,3vw,38px);line-height:1.15;margin:10px 0 8px">{safe_disp}</h1>
  <p class="twerkhub-pl-intro" style="max-width:900px"><a href="/playlist/" style="color:#1ee08f;text-decoration:none;font-weight:800">← Back to the full archive</a></p>
</header>

<main id="twerkhub-pl-main" class="twerkhub-pl-theater-main" style="max-width:1320px;margin:0 auto;padding:0 26px">
  <div class="twerkhub-pl-player-col">
    <div class="twerkhub-pl-player-wrap">
      <iframe id="twerkhub-pl-player"
              src="https://www.youtube-nocookie.com/embed/{yt_id}?autoplay=1&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1"
              title="{safe_title}"
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen></iframe>
    </div>
    <div class="twerkhub-pl-player-meta">
      <span class="twerkhub-pl-player-now">▶ Now playing</span>
      <h2 id="twerkhub-pl-now-title" style="font-size:18px">{safe_disp}</h2>
    </div>
  </div>
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
  <div class="twerkhub-pl-founded">© 2026 Twerkhub · founded by <em>Anti</em> (firestarter)</div>
</footer>

<script defer src="/assets/global-brand.js?v={CACHE_BUST}"></script>
<script defer src="/assets/twerkhub-tokens.js?v={TOKENS_CACHE_BUST}"></script>
<script defer src="/assets/twerkhub-sound-on-interaction.js?v={TOKENS_CACHE_BUST}"></script>
<script defer src="/assets/twerkhub-topbar-enhance.js?v={TOKENS_CACHE_BUST}"></script>
<script defer src="/assets/twerkhub-locale-switcher.js?v={TOKENS_CACHE_BUST}"></script>
<script defer src="/assets/twerkhub-mobile-nav.js?v={TOKENS_CACHE_BUST}"></script>
</body>
</html>
'''


PLAYLIST_SLUG_ROUTER_JS = '''
<!-- /playlist/ slug router: on every vcard/rk-item click, swap the big player
     iframe AND push the indexed per-video URL (/playlist/<slug>.html) into the
     address bar. No page navigation, no popup, no youtube.com redirect — the
     visible URL stays in sync with the playing video so users can share /
     bookmark / Google can keep crediting each indexed page. -->
<script>
(function(){
  'use strict';
  if (window.__twerkhubPlaylistSlugRouterInit) return;
  window.__twerkhubPlaylistSlugRouterInit = true;
  var TOTAL = {{TOTAL}};
  function init(){
    try {
      console.info('[twerkhub-playlist-slug-router] ready · ' + TOTAL + ' videos');
      var player = document.getElementById('twerkhub-pl-player');
      var title  = document.getElementById('twerkhub-pl-now-title');
      if (!player) return;
      function swap(vid, slug, number){
        var url = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid) +
                  '?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';
        player.src = url;
        if (title && number) title.textContent = 'Playing ' + number;
        // URL bar sync: change to the indexed per-video URL without reloading.
        if (slug) {
          try {
            history.pushState({ vid: vid, slug: slug }, '', '/playlist/' + slug);
          } catch(_) { /* some older browsers reject pushState here */ }
        }
        try { player.closest('.twerkhub-pl-player-wrap').scrollIntoView({behavior:'smooth', block:'center'}); } catch(_){}
      }
      document.addEventListener('click', function(ev){
        var hot = ev.target.closest && ev.target.closest('[data-hot="1"]');
        if (!hot) return;
        var vid  = hot.getAttribute('data-vid');
        var slug = hot.getAttribute('data-slug') || '';
        var num  = hot.getAttribute('data-number') || '';
        if (!vid) return;
        // Hold Ctrl/Cmd/middle-click to actually navigate to the indexed page.
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1) return;
        ev.preventDefault();
        ev.stopPropagation();
        swap(vid, slug, num);
      }, true);
      // Back/forward button support: when the URL goes back, no-op (we don't
      // restore the video state on pop — too fragile). The browser simply
      // shows the URL bar moving; the iframe stays on whatever was last.
    } catch(e){ console.warn('[twerkhub-playlist-slug-router] init crashed', e); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
</script>'''


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    gold = load_gold()
    written = []

    for cfg in LEAKS:
        out_path = ROOT / cfg["filename"]
        html = build_leak(gold, cfg)
        out_path.write_text(html, encoding="utf-8", newline="\n")
        written.append(str(out_path))

    # Special 1: /playlist-twerk-hub.html (legacy — redirects via <meta refresh>)
    hub_out = ROOT / "playlist-twerk-hub.html"
    hub_out.write_text(build_twerk_hub(), encoding="utf-8", newline="\n")
    written.append(str(hub_out))

    # Special 2: /playlist/index.html (the indexed flagship — SEO preserved from
    # the PWA_BACKUP_VERSION_1_TERMINADA original, structure upgraded to 2.0).
    pl_dir = ROOT / "playlist"
    if pl_dir.is_dir():
        pl_index = pl_dir / "index.html"
        pl_index.write_text(build_playlist_index(gold), encoding="utf-8", newline="\n")
        written.append(str(pl_index))

        # Special 3: regenerate every individual /playlist/<slug>.html at the
        # Twerkhub 2.0 layout, preserving each page's original SEO metadata
        # (title/description/canonical) while upgrading the visual shell.
        per_video_count = regenerate_individual_video_pages(gold, pl_dir)
        print("Regenerated", per_video_count, "individual /playlist/*.html pages")

    print("Wrote:")
    for w in written:
        print("  -", w)


if __name__ == "__main__":
    main()
