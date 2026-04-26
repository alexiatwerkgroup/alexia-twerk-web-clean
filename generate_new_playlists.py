#!/usr/bin/env python3
"""Generator for 4 new playlist pages"""
import json
from pathlib import Path

TEMPLATE_HEAD = '''<!doctype html>
<html lang="en">
<head>
<script src="/assets/twerkhub-sw-killer.js?v=20260425-p1" async></script>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://www.youtube-nocookie.com https://translate.google.com https://translate.googleapis.com https://*.gstatic.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://translate.google.com https://*.translate.goog; img-src 'self' data: https://i.ytimg.com https://yt3.ggpht.com https://www.googletagmanager.com https://www.google-analytics.com https://*.gstatic.com https://translate.googleapis.com https://translate.google.com; media-src 'self' https://www.youtube.com; connect-src 'self' https://www.google-analytics.com https://translate.googleapis.com https://translate.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com; font-src https://fonts.gstatic.com data:; base-uri 'self'; form-action 'self'"/>
<meta name="referrer" content="strict-origin-when-cross-origin"/>
<title>{page_title}</title>
<meta name="description" content="{meta_description}"/>
<meta name="keywords" content="twerk videos, viral dance, youtube playlist, alexia twerk group, hottest twerk, trending dance, twerkhub">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="https://alexiatwerkgroup.com/{slug}/"/>
<link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/{slug}/"/>
<link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/{slug}/"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Twerkhub"/>
<meta property="og:title" content="{og_title}"/>
<meta property="og:description" content="{og_description}"/>
<meta property="og:url" content="https://alexiatwerkgroup.com/{slug}/"/>
<meta property="og:image" content="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"/>
<meta property="og:image:secure_url" content="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="480"/>
<meta property="og:image:height" content="360"/>
<meta property="og:image:alt" content="{og_alt}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{twitter_title}"/>
<meta name="twitter:description" content="{meta_description}"/>
<meta name="twitter:image" content="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"/>
<link rel="image_src" href="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"/>
<meta itemprop="image" content="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg"/>
<link rel="preload" as="image" href="https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg" fetchpriority="high"/>
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"ImageObject","contentUrl":"https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg","url":"https://i.ytimg.com/vi/{hero_id}/hqdefault.jpg","width":480,"height":360,"representativeOfPage":true}}</script>
<meta name="rating" content="mature"/>
<meta name="theme-color" content="#05050a"/>
<link rel="icon" href="/favicon-32.png" sizes="32x32"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="preconnect" href="https://www.youtube.com" crossorigin>
<style>*{{box-sizing:border-box;margin:0;padding:0}}body.twerkhub-pl-page{{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;color:#f5f5fb;background:#05050a;min-height:100vh;line-height:1.55;-webkit-font-smoothing:antialiased;padding-bottom:80px}}body.twerkhub-pl-page a{{color:inherit;text-decoration:none}}.twerkhub-pl-visually-hidden{{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}.twerkhub-pl-skip{{position:absolute;top:-60px;left:12px;z-index:9999;padding:10px 16px;background:#1ee08f;color:#000;border-radius:6px;font-weight:700;transition:top .2s}}.twerkhub-pl-skip:focus{{top:12px;outline:2px solid #ffb454}}</style>
<link rel="preload" href="/assets/twerkhub-page.css?v=20260424-p1" as="style">
<link rel="stylesheet" href="/assets/twerkhub-page.css?v=20260424-p1" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/assets/twerkhub-page.css?v=20260424-p1"></noscript>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap"></noscript>
{ld_collection}
{ld_itemlist}
<link rel="stylesheet" href="/assets/twerkhub-tokens.css?v=20260424-p1">
<script>
(function(){{function eager(img){{if(!img||img.dataset.twkEager)return;img.dataset.twkEager='1';if(img.loading!=='eager')img.loading='eager';if(!img.fetchPriority||img.fetchPriority==='auto')img.fetchPriority='high'}}document.addEventListener('DOMContentLoaded',function(){{document.querySelectorAll('.vthumb img, .rk-thumb img, .twerkhub-fp-thumb img').forEach(eager)}});if(typeof MutationObserver!=='undefined'){{new MutationObserver(function(muts){{muts.forEach(function(m){{m.addedNodes&&m.addedNodes.forEach(function(n){{if(n.nodeType!==1)return;if(n.matches&&n.matches('.vthumb img, .rk-thumb img, .twerkhub-fp-thumb img'))eager(n);if(n.querySelectorAll)n.querySelectorAll('.vthumb img, .rk-thumb img, .twerkhub-fp-thumb img').forEach(eager)}})}})}}).observe(document.documentElement,{{childList:true,subtree:true}})}}}})();
</script>
</head>
<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-index">
<a class="twerkhub-pl-skip" href="#twerkhub-pl-main">Skip to main content</a>
{navbar}
<main id="twerkhub-pl-main" class="twerkhub-pl-main">
  <section class="twerkhub-pl-hero">
    <h1 class="twerkhub-pl-hero-title">{title}</h1>
    <p class="twerkhub-pl-hero-desc">{hero_desc}</p>
  </section>
  <article class="twerkhub-pl-theater">
    <div class="theater-player">
      <iframe src="https://www.youtube-nocookie.com/embed/{hero_id}?modestbranding=1&rel=0&showinfo=0&controls=1&autoplay=0&fs=1" title="Featured video" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen loading="lazy"></iframe>
    </div>
    <aside class="twerkhub-pl-sidebar">
      <h2 class="twerkhub-pl-sidebar-title">Hot ranking this week</h2>
      <ol class="twerkhub-pl-ranking">
{ranking}
      </ol>
    </aside>
  </article>
{vip_banner}
  <section class="twerkhub-pl-grid">
    <h2 class="twerkhub-pl-grid-title">{grid_title}</h2>
    <div class="twerkhub-pl-grid-container"{grid_style}>
{grid}
    </div>
  </section>
</main>
<footer class="twerkhub-pl-footer"><p>&copy; 2026 Twerkhub. All rights reserved.</p></footer>
{nav_script}
</body>
</html>'''

NAVBAR = '''<style id="twk-nav-v1-css">.twk-nav-v1{position:sticky!important;top:0!important;z-index:9999!important;background:rgba(5,5,10,.94)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.06)!important;margin:0!important;width:100%!important;display:block!important}.twk-nav-v1-inner{max-width:1480px!important;margin:0 auto!important;padding:14px 26px!important;display:flex!important;align-items:center!important;gap:14px!important;flex-wrap:nowrap!important}.twk-nav-v1-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;flex-shrink:0}.twk-nav-v1-brand img{width:38px;height:38px;border-radius:8px;display:block}.twk-nav-v1-links{display:flex;align-items:center;gap:2px;flex-wrap:nowrap;margin-left:auto;white-space:nowrap}.twk-nav-v1-links a{position:relative;padding:10px 14px;border-radius:8px;color:rgba(230,230,240,.82);text-decoration:none;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;line-height:1;transition:color .22s ease,background .22s ease,transform .2s ease;white-space:nowrap}.twk-nav-v1-links a:hover{background:rgba(255,255,255,.05);color:#fff;transform:translateY(-1px)}.twk-nav-v1-links a.is-active{color:#fff;background:transparent}.twk-nav-v1-links a.is-active::after{content:"";position:absolute;left:18%;right:18%;bottom:2px;height:2px;border-radius:2px;background:linear-gradient(90deg,#ff2d87,#ffb454);box-shadow:0 0 10px rgba(255,45,135,.55)}.twk-nav-v1-links a.twk-nav-v1-hot{background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(255,180,84,.18));color:#ff7eb0;border:1px solid rgba(255,45,135,.45)}.twk-nav-v1-links a.twk-nav-v1-hot:hover{background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14;border-color:transparent;box-shadow:0 6px 18px rgba(255,45,135,.4)}.twk-nav-v1-live{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:rgba(30,224,143,.1);border:1px solid rgba(30,224,143,.5);color:#1ee08f;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;flex-shrink:0;margin-left:6px}.twk-nav-v1-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#1ee08f;box-shadow:0 0 8px #1ee08f;animation:twkLivePulse 2s ease-in-out infinite}@keyframes twkLivePulse{0%,100%{opacity:1}50%{opacity:.4}}</style>
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
</nav>'''

NAV_SCRIPT = '''<script>(function(){try{var p=location.pathname.replace(/\/index\.html$/,'/');var map={'/':'home','/creators.html':'creators','/community.html':'community','/membership.html':'membership','/account.html':'account','/profile.html':'profile','/alexia-video-packs.html':'hotpacks'};var key=map[p];if(p.indexOf('/playlist')===0)key='playlists';else if(p.indexOf('/creator/')===0||p.indexOf('/twerk-dancer/')===0)key='creators';if(key){var a=document.querySelector('.twk-nav-v1-links a[data-nav="'+key+'"]');if(a){a.classList.add('is-active');a.setAttribute('aria-current','page');}}}catch(e){}try{var n=document.getElementById('twk-nav-v1-live-n');if(n){var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);n.textContent=v;function tick(){var d=Math.floor(Math.random()*5)-2;v=Math.max(300,Math.min(500,v+d));n.textContent=v;sessionStorage.setItem('twkLiveN',v);setTimeout(tick,4000+Math.random()*3000);}setTimeout(tick,4000);}}catch(e){}}})();</script>'''

def gen_ld(title, url, desc, videos, is_vip=False):
    h = f'''<script type="application/ld+json">{{"@context":"https://schema.org","@type":"CollectionPage","name":"{title}","url":"{url}","description":"{desc}","inLanguage":"en","isPartOf":{{"@type":"WebSite","name":"Twerkhub","url":"https://alexiatwerkgroup.com/"}},
    "hasPart":['''
    for i, v in enumerate(videos[:35], 1):
        h += f'{{"@type":"VideoObject","name":"{v["title"]}","thumbnailUrl":"https://i.ytimg.com/vi/{v["id"]}/maxresdefault.jpg","contentUrl":"https://www.youtube.com/watch?v={v["id"]}","embedUrl":"https://www.youtube.com/embed/{v["id"]}","inLanguage":"en","isFamilyFriendly":false,"position":{i}}},' if i < 35 else f'{{"@type":"VideoObject","name":"{v["title"]}","thumbnailUrl":"https://i.ytimg.com/vi/{v["id"]}/maxresdefault.jpg","contentUrl":"https://www.youtube.com/watch?v={v["id"]}","embedUrl":"https://www.youtube.com/embed/{v["id"]}","inLanguage":"en","isFamilyFriendly":false,"position":{i}}}'
    h += ']}}</script>'
    return h.replace('"', '\\"') if is_vip else h

def gen_itemlist(videos, is_vip=False):
    h = f'''<script type="application/ld+json">{{"@context":"https://schema.org","@type":"ItemList","itemListOrder":"https://schema.org/ItemListOrderAscending","numberOfItems":{len(videos)},"itemListElement":['''
    for i, v in enumerate(videos, 1):
        h += f'{{"@type":"ListItem","position":{i},"item":{{"@type":"VideoObject","name":"{v["title"]}","thumbnailUrl":"https://i.ytimg.com/vi/{v["id"]}/maxresdefault.jpg","contentUrl":"https://www.youtube.com/watch?v={v["id"]}","embedUrl":"https://www.youtube.com/embed/{v["id"]}","inLanguage":"en","isFamilyFriendly":false,"isAccessibleForFree":{str(not is_vip).lower()}}}}},' if i < len(videos) else f'{{"@type":"ListItem","position":{i},"item":{{"@type":"VideoObject","name":"{v["title"]}","thumbnailUrl":"https://i.ytimg.com/vi/{v["id"]}/maxresdefault.jpg","contentUrl":"https://www.youtube.com/watch?v={v["id"]}","embedUrl":"https://www.youtube.com/embed/{v["id"]}","inLanguage":"en","isFamilyFriendly":false,"isAccessibleForFree":{str(not is_vip).lower()}}}}}'
    h += ']}}</script>'
    return h

def main():
    base = Path("/sessions/wizardly-fervent-sagan/mnt/alexia-twerk-web-clean")
    outs = Path("/sessions/wizardly-fervent-sagan/mnt/outputs")
    
    configs = [
        {"data": "playlist-data-try-on-hot-leaks.json", "slug": "playlist-try-on-hot-leaks", "title": "Try-On Hot Leaks · Twerkhub", "desc": "Hot try-on videos · 16 cuts", "vip": False},
        {"data": "playlist-data-hottest-cosplay-fancam.json", "slug": "playlist-hottest-cosplay-fancam", "title": "Hottest Cosplay & Fancam · Twerkhub", "desc": "Cosplay & fancam · 53 cuts", "vip": False},
        {"data": "playlist-data-korean-girls-kpop-twerk.json", "slug": "playlist-korean-girls-kpop-twerk", "title": "Korean Girls · K-pop & Twerk · Twerkhub", "desc": "K-pop & twerk · 50 cuts", "vip": False},
        {"data": "playlist-data-ttl-latin-models.json", "slug": "ttl-latin-models", "title": "TTL · Latin Models · Twerkhub VIP", "desc": "Latin models · 1500+ VIP cuts", "vip": True},
    ]
    
    for cfg in configs:
        df = outs / cfg["data"]
        with open(df) as f:
            data = json.load(f)
        
        vids = data["videos"]
        hero = data["hero"]
        slug = cfg["slug"]
        
        (base / slug).mkdir(parents=True, exist_ok=True)
        
        rank_html = ""
        for i, v in enumerate(vids[:5], 1):
            rank_html += f'        <li><a href="https://www.youtube.com/watch?v={v["id"]}" class="rk-link"><img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="" class="rk-thumb" loading="lazy" width="120" height="90"><div class="rk-text"><div class="rk-rank">{i}</div><div class="rk-title">{v["title"]}</div></div></a></li>\n'
        
        grid_html = ""
        blur = ' style="filter:blur(8px);position:relative;"' if cfg["vip"] else ''
        lock = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px">🔒</div>' if cfg["vip"] else ''
        for v in vids:
            grid_html += f'        <a href="https://www.youtube.com/watch?v={v["id"]}" class="vthumb"{blur}><img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="" loading="lazy" width="168" height="126">{lock}<div class="vthumb-title">{v["title"]}</div></a>\n'
        
        vip_banner = ''
        grid_title = f"All {len(vids)} cuts in the room"
        grid_style = ''
        if cfg["vip"]:
            vip_banner = '\n  <div style="margin:40px 20px;padding:24px;background:linear-gradient(135deg,rgba(255,45,135,.15),rgba(255,180,84,.15));border:1px solid rgba(255,45,135,.4);border-radius:12px;text-align:center"><p style="font-size:18px;margin-bottom:12px">🔒 1,500+ uncut cuts · MP4 4K · VIP tier only</p><a href="/membership.html" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#ff2d87,#ffb454);color:#1a0a14;text-decoration:none;border-radius:8px;font-weight:700;margin-top:8px">Unlock the full archive · Upgrade to VIP →</a></div>\n'
            grid_title = "1,500+ private cuts"
        
        ld_coll = gen_ld(cfg["title"], f'https://alexiatwerkgroup.com/{slug}/', cfg["desc"], vids, cfg["vip"])
        ld_list = gen_itemlist(vids, cfg["vip"])
        
        html = TEMPLATE_HEAD.format(
            page_title=cfg["title"],
            meta_description=cfg["desc"],
            og_title=cfg["title"],
            og_description=cfg["desc"],
            og_alt=cfg["title"],
            twitter_title=cfg["title"],
            slug=slug,
            hero_id=hero,
            ld_collection=ld_coll,
            ld_itemlist=ld_list,
            navbar=NAVBAR,
            title=cfg["title"],
            hero_desc=cfg["desc"],
            ranking=rank_html,
            vip_banner=vip_banner,
            grid_title=grid_title,
            grid_style=grid_style,
            grid=grid_html,
            nav_script=NAV_SCRIPT
        )
        
        (base / slug / "index.html").write_text(html, encoding='utf-8')
        print(f"✓ {slug}/index.html ({len(html)} bytes)")

if __name__ == "__main__":
    main()
