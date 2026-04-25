#!/usr/bin/env python3
"""
TWERKHUB · Regenerate themed playlists from /playlist/ template
v2026-04-25-p1

Builds /try-on-hot-leaks/, /ttl-latin-models/, /hottest-cosplay-fancam/,
/korean-girls-kpop-twerk/ using the EXACT same structure as /playlist/:

  - Inline #twerkhub-pl-player iframe in main column (no fullscreen modal)
  - Hot ranking sidebar (top 5) on the right
  - Grid of vcards below
  - swap(vid, number) handler with YT postMessage unmute
  - Click delegation in capture phase for both .rk-item and .vcard
  - twerkhub-pl-theater.js loaded for viewed marker
  - Schema: CollectionPage + ItemList + BreadcrumbList

Data sources:
  /assets/try-on-videos.json        → /try-on-hot-leaks/index.html
  /assets/ttl-videos.json           → /ttl-latin-models/index.html
  /assets/cosplay-videos.json       → /hottest-cosplay-fancam/index.html
  /assets/corean-videos.json        → /korean-girls-kpop-twerk/index.html

Each JSON has:
  hot_ranking: [{id, title, channel, duration, rank, badge}, ...] (5 items)
  grid:        [{_id, _title, channel, duration, number}, ...] (variable)
"""
import json
import re
import os
import sys
import html as html_lib
from pathlib import Path

ROOT = Path("/sessions/wizardly-fervent-sagan/mnt/alexia-twerk-web-clean")
SITE = "https://alexiatwerkgroup.com"

PLAYLISTS = {
    "try-on-hot-leaks": {
        "data": "assets/try-on-videos.json",
        "title": "Try-On Hot Leaks · Curated Try-On Haul Collection · Twerkhub",
        "description": "Twerkhub Try-On Hot Leaks — curated archive of try-on haul videos. 4K bikinis, lingerie, micro-skirts, athletic wear. Members-only viral cuts.",
        "h1": "Try-On <em>hot leaks</em> archive.",
        "intro": "Curated try-on haul collection · 4K · weekly drops · members only.",
        "keywords": "try-on haul, bikini try-on, lingerie try-on, micro skirt, athletic wear, leaks",
    },
    "ttl-latin-models": {
        "data": "assets/ttl-videos.json",
        "title": "TTL · Latin Models · 1,500+ Private Cuts · Twerkhub",
        "description": "Twerkhub TTL · Complete Latin model archive · 4K MP4 cuts. Britney Mazo, Glenda, Jasmin, Daniela Florez and more. Members-only.",
        "h1": "TTL · <em>Latin Models</em> archive.",
        "intro": "Complete Latin model collection · 4K · weekly drops · members only.",
        "keywords": "latin model, britney mazo, glenda, jasmin model, daniela florez, ttl, micro bikini",
    },
    "hottest-cosplay-fancam": {
        "data": "assets/cosplay-videos.json",
        "title": "Hottest Cosplay Fancam · 4K Anime Cosplay Archive · Twerkhub",
        "description": "Twerkhub Hottest Cosplay Fancam — curated anime/cosplay fancam archive. 4K HD vertical cuts, conventions, photoshoots. Weekly drops.",
        "h1": "Hottest <em>cosplay fancam</em>.",
        "intro": "4K anime cosplay & fancam collection · weekly drops · members only.",
        "keywords": "cosplay fancam, anime cosplay, convention cosplay, 4k cosplay, vertical cosplay, hot cosplay",
    },
    "korean-girls-kpop-twerk": {
        "data": "assets/corean-videos.json",
        "title": "Korean Girls · K-Pop Twerk Choreo Archive · Twerkhub",
        "description": "Twerkhub K-Pop Twerk archive — Korean girl groups, choreo cuts, dance practice. 4K HD cuts of the hottest K-pop twerk performances.",
        "h1": "K-Pop <em>twerk</em> & Korean girls.",
        "intro": "K-Pop twerk choreo & Korean girl groups · 4K · weekly drops.",
        "keywords": "kpop twerk, korean twerk, k-pop dance, korean girls dancing, kpop choreo",
    },
}


def esc(s):
    """HTML-escape, returning empty string for None."""
    if s is None:
        return ""
    return html_lib.escape(str(s), quote=True)


def thumb(vid, hi=False):
    return f"https://i.ytimg.com/vi/{vid}/{'maxresdefault' if hi else 'hqdefault'}.jpg"


def build_top5_html(top5):
    """Return HTML for the 5 .rk-item entries in the sidebar."""
    badges = ['gold', 'purple', 'pink', 'monochrome', 'monochrome']
    lines = []
    for i, item in enumerate(top5):
        vid = item.get('id') or item.get('_id') or ''
        title = item.get('title') or item.get('_title') or f'Top #{i+1}'
        channel = item.get('channel') or 'Twerkhub'
        rank = '#%02d' % (i + 1)
        badge = item.get('badge') or badges[i]
        lines.append(
            f'      <a class="rk-item" data-hot="1" data-vid="{esc(vid)}" data-number="{esc(rank)}" href="#">\n'
            f'        <div class="rk-num {esc(badge)}">{esc(rank)}</div>\n'
            f'        <div class="rk-thumb"><img loading="lazy" decoding="async" src="{esc(thumb(vid))}" alt="{esc(title)}" '
            f'onerror="if(this.dataset.f){{this.onerror=null;this.src=\'/assets/safe-adult-placeholder.svg\';}}else{{this.dataset.f=1;this.src=\'https://i.ytimg.com/vi/{esc(vid)}/default.jpg\';}}"></div>\n'
            f'        <div class="rk-copy"><div class="rk-title">{esc(title[:60])}</div><div class="rk-meta">{esc(channel[:50])}</div></div>\n'
            f'      </a>'
        )
    return '\n'.join(lines)


def build_grid_html(grid):
    """Return HTML for the .vcard entries in the grid."""
    lines = []
    for i, item in enumerate(grid):
        vid = item.get('_id') or item.get('id') or ''
        title = item.get('_title') or item.get('title') or item.get('number') or f'Video #{i+1}'
        number = item.get('number') or '#%03d' % (i + 6)
        lines.append(
            f'    <a class="vcard reveal" data-hot="1" data-vid="{esc(vid)}" data-number="{esc(number)}" href="#" '
            f'role="listitem" aria-label="{esc(title[:80])}">'
            f'<div class="vthumb">'
            f'<img src="{esc(thumb(vid, hi=True))}" alt="{esc(number)}" decoding="async" loading="lazy" '
            f'onerror="if(this.dataset.f){{this.onerror=null;this.src=\'/assets/safe-adult-placeholder.svg\';}}else{{this.dataset.f=1;this.src=\'{esc(thumb(vid))}\';}}">'
            f'<div class="vscrim"></div><div class="vplay"></div>'
            f'</div>'
            f'<div class="card-meta vmeta"><span class="video-number vtitle">{esc(number)}</span></div>'
            f'</a>'
        )
    return '\n'.join(lines)


def build_collectionpage_schema(slug, meta, top5, grid):
    items = []
    pos = 1
    for it in top5 + grid[:30]:
        vid = it.get('id') or it.get('_id') or ''
        title = it.get('title') or it.get('_title') or f'Video #{pos}'
        items.append({
            "@type": "VideoObject",
            "name": title,
            "thumbnailUrl": thumb(vid, hi=True),
            "uploadDate": "2026-04-25T12:00:00Z",
            "contentUrl": f"https://www.youtube.com/watch?v={vid}",
            "embedUrl": f"https://www.youtube.com/embed/{vid}",
            "inLanguage": "en",
            "isFamilyFriendly": False,
            "position": pos,
        })
        pos += 1
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": meta['title'],
        "url": f"{SITE}/{slug}/",
        "description": meta['description'],
        "inLanguage": "en",
        "isPartOf": {"@type": "WebSite", "name": "Twerkhub", "url": SITE + "/"},
        "hasPart": items
    }


def build_itemlist_schema(slug, top5, grid, meta):
    items = []
    for i, it in enumerate(top5 + grid):
        vid = it.get('id') or it.get('_id') or ''
        title = it.get('title') or it.get('_title') or f'Video #{i+1}'
        items.append({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "VideoObject",
                "name": title,
                "thumbnailUrl": thumb(vid, hi=True),
                "uploadDate": "2026-04-25T12:00:00Z",
                "contentUrl": f"https://www.youtube.com/watch?v={vid}",
                "embedUrl": f"https://www.youtube.com/embed/{vid}",
                "inLanguage": "en",
                "isFamilyFriendly": False,
                "position": i + 1,
            }
        })
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "numberOfItems": len(top5) + len(grid),
        "itemListElement": items,
    }


def build_breadcrumb_schema(slug, meta):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": meta['title'], "item": f"{SITE}/{slug}/"}
        ]
    }


def build_imageobject_schema(slug, top5, meta):
    vid1 = (top5[0].get('id') or top5[0].get('_id') or '') if top5 else ''
    return {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "contentUrl": thumb(vid1),
        "url": thumb(vid1),
        "width": 480,
        "height": 360,
        "caption": meta['title'],
        "representativeOfPage": True,
    }


def build_top5_js_array(top5):
    items = []
    for it in top5:
        vid = it.get('id') or it.get('_id') or ''
        items.append({"id": vid})
    return json.dumps(items, ensure_ascii=False)


def build_grid_js_array(grid):
    items = []
    for i, it in enumerate(grid):
        vid = it.get('_id') or it.get('id') or ''
        number = it.get('number') or '#%03d' % (i + 6)
        items.append({"id": vid, "number": number})
    return json.dumps(items, ensure_ascii=False)


# ─── Main page builder ─────────────────────────────────────────────────────
def build_page(slug, meta):
    data = json.load(open(ROOT / meta['data'], 'r', encoding='utf-8'))
    top5 = data.get('hot_ranking', [])[:5]
    grid = data.get('grid', [])
    if not top5:
        return None, "No top5 in data"
    first_vid = top5[0].get('id') or top5[0].get('_id') or ''
    initial_iframe_src = (
        f"https://www.youtube.com/embed/{first_vid}"
        f"?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1"
        f"&widget_referrer={SITE}&origin={SITE}"
    )

    # Schemas
    schemas = [
        build_imageobject_schema(slug, top5, meta),
        build_collectionpage_schema(slug, meta, top5, grid),
        build_itemlist_schema(slug, top5, grid, meta),
        build_breadcrumb_schema(slug, meta),
    ]
    schema_blocks = '\n'.join(
        f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False, separators=(",",":"))}</script>'
        for s in schemas
    )

    # JS data
    top5_js = build_top5_js_array(top5)
    grid_js = build_grid_js_array(grid)

    # Build HTML
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{esc(meta['title'])}</title>
<meta name="description" content="{esc(meta['description'])}"/>
<meta name="keywords" content="{esc(meta['keywords'])}"/>
<meta name="theme-color" content="#08080b"/>
<link rel="canonical" href="{SITE}/{slug}/">
<link rel="alternate" hreflang="en" href="{SITE}/{slug}/">
<link rel="alternate" hreflang="x-default" href="{SITE}/{slug}/">

<meta property="og:type" content="website"/>
<meta property="og:title" content="{esc(meta['title'])}"/>
<meta property="og:description" content="{esc(meta['description'])}"/>
<meta property="og:url" content="{SITE}/{slug}/"/>
<meta property="og:image" content="{esc(thumb(first_vid, hi=True))}"/>
<meta property="og:image:alt" content="{esc(meta['title'])}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{esc(meta['title'])}"/>
<meta name="twitter:description" content="{esc(meta['description'])}"/>
<meta name="twitter:image" content="{esc(thumb(first_vid, hi=True))}"/>
<meta name="twitter:image:alt" content="{esc(meta['title'])}"/>

<link rel="stylesheet" href="/assets/elite-tokens.css">
<link rel="stylesheet" href="/assets/elite-components.css">
<link rel="stylesheet" href="/assets/twerkhub-page.css?v=20260424-p11">
<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v=20260424-p10">
<link rel="stylesheet" href="/assets/twerkhub-polish.css?v=20260424-p4">
<link rel="stylesheet" href="/assets/twerkhub-premium.css?v=20260424-p1">
<link rel="manifest" href="/manifest.json">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">

{schema_blocks}
</head>
<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-{slug}">

<nav class="twk-nav-v1" id="twk-nav-v1">
  <a class="twk-nav-v1-brand" href="/">
    <img src="/logo-twerkhub.png" alt="Twerkhub" loading="eager">
    <span class="twk-nav-v1-brand-name">TWERKHUB · EST. 2018</span>
  </a>
  <div class="twk-nav-v1-links">
    <a href="/" data-nav="home">HOME</a>
    <a href="/playlist/" data-nav="playlists">EXCLUSIVE</a>
    <a href="/playlist/" data-nav="playlists">PLAYLISTS</a>
    <a href="/creators.html" data-nav="creators">CREATORS</a>
    <a href="/alexia-video-packs.html" class="twk-nav-v1-cta" data-nav="hotpacks">HOT PACKS</a>
    <a href="/community.html" data-nav="community">COMMUNITY</a>
    <a href="/membership.html" data-nav="membership">MEMBERSHIP</a>
    <a href="/account.html" data-nav="account">MY ACCOUNT</a>
    <a href="/profile.html" data-nav="profile">PROFILE</a>
    <span class="twk-nav-v1-live" id="twk-nav-v1-live" aria-label="Live online count">LIVE <span id="twk-nav-v1-live-n">412</span></span>
  </div>
</nav>
<script>
(function(){{
  try{{var p=location.pathname.replace(/\\/index\\.html$/,'/');var map={{'/':'home','/creators.html':'creators','/community.html':'community','/membership.html':'membership','/account.html':'account','/profile.html':'profile','/alexia-video-packs.html':'hotpacks'}};var key=map[p];if(p.indexOf('/playlist')===0)key='playlists';else if(p.indexOf('/creator/')===0||p.indexOf('/twerk-dancer/')===0)key='creators';if(key){{var a=document.querySelector('.twk-nav-v1-links a[data-nav="'+key+'"]');if(a){{a.classList.add('is-active');a.setAttribute('aria-current','page');}}}}}}catch(e){{}}
  try{{var n=document.getElementById('twk-nav-v1-live-n');if(n){{var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);n.textContent=v;function tick(){{var d=Math.floor(Math.random()*5)-2;v=Math.max(300,Math.min(500,v+d));n.textContent=v;sessionStorage.setItem('twkLiveN',v);setTimeout(tick,4000+Math.random()*3000);}}setTimeout(tick,4000);}}}}catch(e){{}}
  function loadOnce(src,id){{if(document.getElementById(id))return;var s=document.createElement('script');s.src=src;s.id=id;s.defer=true;document.head.appendChild(s);}}
  loadOnce('/assets/supabase-config.js?v=20260425-p11','twk-loader-supabase-config');
  loadOnce('/assets/token-system.js?v=20260425-p11','twk-loader-token-system');
  loadOnce('/assets/twerkhub-tokens.js?v=20260425-p11','twk-loader-twerkhub-tokens');
  loadOnce('/assets/twerkhub-auth.js?v=20260425-p11','twk-loader-twerkhub-auth');
  loadOnce('/assets/twerkhub-pl-theater.js?v=20260425-p11','twk-loader-pl-theater');
}})();
</script>

<header class="twerkhub-pl-hero">
  <div class="twerkhub-pl-kicker">/ Curated archive · members only</div>
  <h1>{meta['h1']}</h1>
  <p class="twerkhub-pl-intro">{esc(meta['intro'])}</p>
</header>

<main id="twerkhub-pl-main" class="twerkhub-pl-theater-main">
  <div class="twerkhub-pl-player-col">
    <div class="twerkhub-pl-player-wrap">
      <iframe id="twerkhub-pl-player"
              src="{initial_iframe_src}"
              title="{esc(meta['title'])} · now playing"
              loading="eager"
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
{build_top5_html(top5)}
    </div>
  </aside>
</main>

<section class="twerkhub-pl-grid-section" aria-label="Full archive">
  <div class="twerkhub-pl-grid-head">
    <div class="twerkhub-pl-kicker">/ The full archive</div>
    <h2>The <em>full</em> archive.</h2>
  </div>
  <div class="twerkhub-pl-grid" id="video-grid" role="list">
{build_grid_html(grid)}
  </div>
</section>

<section class="twerkhub-pl-cta-final" aria-label="Keep going" style="margin-top:40px">
  <h2>Browse the <em>full archive</em>.</h2>
  <div class="twerkhub-pl-cta-row">
    <a class="twerkhub-btn twerkhub-btn-primary" href="/playlist/">All twerk videos →</a>
    <a class="twerkhub-btn twerkhub-btn-ghost" href="/">Twerkhub Home</a>
  </div>
</section>

<footer class="twerkhub-pl-footer" role="contentinfo">
  <div class="twerkhub-pl-slogan">If you know, you know.</div>
  <div class="twerkhub-pl-founded">© 2026 Twerkhub · founded by <em>Anti</em> (firestarter)</div>
</footer>

<script defer src="/assets/twerkhub-tokens.js?v=20260425-p11"></script>
<script defer src="/assets/twerkhub-sound-on-interaction.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-topbar-enhance.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-locale-switcher.js?v=20260424-p1"></script>
<script defer src="/assets/twerkhub-mobile-nav.js?v=20260424-p1"></script>

<script>
(function(){{
  'use strict';
  if (window.__twerkhubHubTheaterInit) return;
  window.__twerkhubHubTheaterInit = true;
  try {{
    console.info('[twerkhub-playlist:{slug}] theater boot');
    var TOP5 = {top5_js};
    var GRID = {grid_js};
    var player = document.getElementById('twerkhub-pl-player');
    var title  = document.getElementById('twerkhub-pl-now-title');
    function swap(vid, number){{
      if (!player) return;
      var url = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid) +
                '?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1';
      player.src = url;
      if (title && number) title.textContent = 'Playing ' + number;
      try {{
        player.onload = function(){{
          [200, 800, 1500, 2500].forEach(function(d){{
            setTimeout(function(){{
              try {{
                player.contentWindow.postMessage(JSON.stringify({{event:'command',func:'unMute',args:[]}}), '*');
                player.contentWindow.postMessage(JSON.stringify({{event:'command',func:'setVolume',args:[100]}}), '*');
                player.contentWindow.postMessage(JSON.stringify({{event:'command',func:'playVideo',args:[]}}), '*');
              }} catch(_){{}}
            }}, d);
          }});
        }};
      }} catch(_){{}}
      try {{ if (window.TwerkhubPlTheater && window.TwerkhubPlTheater.markViewed) window.TwerkhubPlTheater.markViewed(vid); }} catch(_){{}}
      try {{ if (window.AlexiaTokens && window.AlexiaTokens.watchClip) window.AlexiaTokens.watchClip(); }} catch(_){{}}
      try {{ var pc = document.querySelector('.twerkhub-pl-player-col'); if (pc) pc.scrollIntoView({{ behavior: 'smooth', block: 'start' }}); }} catch(_){{}}
    }}
    document.addEventListener('click', function(ev){{
      var a = ev.target.closest && ev.target.closest('a[data-vid]');
      if (!a) return;
      if (!a.matches('.rk-item') && !a.matches('.vcard')) return;
      var vid = a.getAttribute('data-vid');
      if (!vid) return;
      ev.preventDefault();
      ev.stopPropagation();
      swap(vid, a.getAttribute('data-number') || '');
    }}, true);
  }} catch(e){{
    console.warn('[twerkhub-playlist:{slug}] theater boot failed', e);
  }}
}})();
</script>

</body>
</html>
'''
    return html, None


def main():
    for slug, meta in PLAYLISTS.items():
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_path = out_dir / 'index.html'
        # Backup
        if out_path.exists():
            (out_dir / 'index.html.bak').write_text(out_path.read_text(encoding='utf-8'), encoding='utf-8')
        html, err = build_page(slug, meta)
        if err:
            print(f"  FAIL {slug}: {err}")
            continue
        out_path.write_text(html, encoding='utf-8')
        size_kb = len(html) / 1024
        print(f"  + {slug}/index.html ({size_kb:.1f} KB)")


if __name__ == '__main__':
    main()
