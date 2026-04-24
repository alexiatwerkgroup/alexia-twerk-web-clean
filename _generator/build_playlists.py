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
CACHE_BUST = "20260423-p3"


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
            "thumbnailUrl": f'https://i.ytimg.com/vi/{v["id"]}/maxresdefault.jpg',
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
      <a href="#">Exclusive</a>
      <a href="/#playlists" class="is-active" aria-current="page">Playlists</a>
      <a href="#">Tokens</a>
      <a href="#">VR</a>
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
</body>
</html>
'''
    return html


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

    # Special: /playlist/
    hub_out = ROOT / "playlist-twerk-hub.html"
    hub_out.write_text(build_twerk_hub(), encoding="utf-8", newline="\n")
    written.append(str(hub_out))

    print("Wrote:")
    for w in written:
        print("  -", w)


if __name__ == "__main__":
    main()
