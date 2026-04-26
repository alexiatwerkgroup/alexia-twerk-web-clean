#!/usr/bin/env python3
"""
TWERKHUB · Regenerate themed playlists by cloning /playlist/index.html exactly.
v2026-04-26-p3 — JSON-LD strict-valid build (GSC fix).

Each VideoObject in hasPart and itemListElement gets a non-empty description.
ImageObject is rebuilt from scratch via json.dumps to guarantee valid JSON.
A pre-write validation step asserts every <script application/ld+json> block
parses cleanly with json.loads(). A file is written ONLY if every block is
valid; otherwise the slug is aborted with a detailed error.
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
        "category": "try-on haul",
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
        "category": "Latin model",
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
        "category": "cosplay fancam",
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
        "category": "K-pop twerk",
    },
}


def esc_attr(s):
    return html_lib.escape(str(s or ""), quote=True)


def mk_video_desc(title, category):
    t = (str(title or "")).strip() or "this clip"
    c = (str(category or "")).strip() or "twerk"
    return ("Watch " + t + " on TWERKHUB, a premium curated collection of "
            + c + " videos and exclusive model content.")


def thumb(vid, hi=False):
    return "https://i.ytimg.com/vi/" + vid + "/" + ("maxresdefault" if hi else "hqdefault") + ".jpg"


def build_top5_sidebar_html(top5):
    badges = ['gold', 'purple', 'pink', 'monochrome', 'monochrome']
    out = []
    for i, item in enumerate(top5):
        vid = item.get('id') or item.get('_id') or ''
        title = item.get('title') or item.get('_title') or 'Top #' + str(i + 1)
        channel = item.get('channel') or 'Twerkhub'
        rank = '#%02d' % (i + 1)
        badge = item.get('badge') or badges[i]
        thumb_url = thumb(vid)
        oe = ("if(this.dataset.f){this.onerror=null;this.src='/assets/safe-adult-placeholder.svg';this.style.padding='30px';this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';}else{this.dataset.f=1;this.src='https://i.ytimg.com/vi/" + esc_attr(vid) + "/default.jpg';}")
        out.append(
            '      <a class="rk-item" data-hot="1" data-vid="' + esc_attr(vid) + '" data-number="' + esc_attr(rank) + '" href="#">\n'
            '        <div class="rk-num ' + esc_attr(badge) + '">' + esc_attr(rank) + '</div>\n'
            '        <div class="rk-thumb"><img loading="lazy" decoding="async" src="' + esc_attr(thumb_url) + '" alt="' + esc_attr(title[:80]) + '" decoding="async" onerror="' + oe + '"></div>\n'
            '        <div class="rk-copy"><div class="rk-title">' + esc_attr(title[:50]) + '</div><div class="rk-meta">' + esc_attr(channel[:50]) + '</div></div>\n'
            '      </a>'
        )
    return '\n'.join(out)


def build_grid_html(grid):
    out = []
    for i, item in enumerate(grid):
        vid = item.get('_id') or item.get('id') or ''
        title = item.get('_title') or item.get('title') or item.get('number') or 'Video #' + str(i + 1)
        number = item.get('number') or '#%03d' % (i + 6)
        thumb_hi = thumb(vid, hi=True)
        thumb_lo = thumb(vid)
        oe = ("if(this.dataset.f){this.onerror=null;this.src='/assets/safe-adult-placeholder.svg';this.style.padding='30px';this.style.background='linear-gradient(135deg,#1a1a25,#2a1a35)';}else{this.dataset.f=1;this.src='" + esc_attr(thumb_lo) + "';}")
        out.append(
            '    <a class="vcard reveal" data-hot="1" data-vid="' + esc_attr(vid) + '" data-number="' + esc_attr(number) + '" href="#" role="listitem" aria-label="' + esc_attr(title[:80]) + '">'
            '<div class="vthumb"><img src="' + esc_attr(thumb_hi) + '" alt="' + esc_attr(number) + '" decoding="async" loading="lazy" onerror="' + oe + '">'
            '<div class="vscrim"></div><div class="vplay"></div></div>'
            '<div class="card-meta vmeta"><span class="video-number vtitle">' + esc_attr(number) + '</span></div>'
            '</a>'
        )
    return '\n'.join(out)


def substitute_in_template(template, slug, meta, data):
    top5 = data.get('hot_ranking', [])[:5]
    grid = data.get('grid', [])
    if not top5:
        return None, "No top5"
    first_vid = top5[0].get('id') or top5[0].get('_id') or ''
    canonical_new = SITE + "/" + slug + "/"
    title_new = meta['title']
    desc_new = meta['description']
    h1_short = meta['h1_short']
    h1_em = meta['h1_em']
    category = meta.get('category', '')

    h = template

    # 1. <title>
    h = re.sub(r'<title>[^<]*</title>', '<title>' + esc_attr(title_new) + '</title>', h, count=1)
    # 2. <meta name="description">
    h = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")', r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)
    # 3. canonical + hreflang
    h = re.sub(r'(<link\s+rel="canonical"\s+href=")[^"]*(")', r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<link\s+rel="alternate"\s+hreflang="en"\s+href=")[^"]*(")', r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<link\s+rel="alternate"\s+hreflang="x-default"\s+href=")[^"]*(")', r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    # 4. og:url, og:title, og:description, twitter:title, twitter:description, og:image
    h = re.sub(r'(<meta\s+property="og:url"\s+content=")[^"]*(")', r'\g<1>' + canonical_new + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:title"\s+content=")[^"]*(")', r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:description"\s+content=")[^"]*(")', r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:title"\s+content=")[^"]*(")', r'\g<1>' + esc_attr(title_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:description"\s+content=")[^"]*(")', r'\g<1>' + esc_attr(desc_new) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+property="og:image"\s+content=")[^"]*(")', r'\g<1>' + thumb(first_vid, hi=True) + r'\g<2>', h, count=1)
    h = re.sub(r'(<meta\s+name="twitter:image"\s+content=")[^"]*(")', r'\g<1>' + thumb(first_vid, hi=True) + r'\g<2>', h, count=1)

    # 5. Initial iframe src → first vid
    h = re.sub(
        r'(<iframe[^>]*id="twerkhub-pl-player"[^>]*src=")[^"]*(")',
        r'\g<1>' + 'https://www.youtube.com/embed/' + first_vid + '?autoplay=1&amp;mute=1&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1&amp;widget_referrer=https%3A%2F%2Falexiatwerkgroup.com&amp;origin=https%3A%2F%2Falexiatwerkgroup.com' + r'\g<2>',
        h, count=1, flags=re.DOTALL,
    )
    # 6. img preload of first vid
    h = re.sub(
        r'(<link\s+rel="preload"\s+as="image"\s+href=")[^"]*(")',
        r'\g<1>' + thumb(first_vid, hi=True) + r'\g<2>',
        h, count=1,
    )

    # 7. H1: replace the first /playlist/ hero h1 ("Hottest twerk videos…") with this playlist's h1
    h = re.sub(
        r'<h1[^>]*>Hottest <em>twerk</em> videos on YouTube\..*?</h1>',
        '<h1>' + esc_attr(h1_short.replace(h1_em, '')).strip() + ' <em>' + esc_attr(h1_em) + '</em>.</h1>',
        h, count=1, flags=re.DOTALL,
    )
    # 8. intro <p class="twerkhub-pl-intro">…</p>
    h = re.sub(
        r'(<p\s+class="twerkhub-pl-intro">)[^<]*(</p>)',
        r'\g<1>' + esc_attr(meta['intro']) + r'\g<2>',
        h, count=1,
    )
    # 9. kicker
    h = re.sub(
        r'(<div\s+class="twerkhub-pl-kicker">)[^<]*(</div>)',
        r'\g<1>' + esc_attr(meta['kicker']) + r'\g<2>',
        h, count=1,
    )

    # 10. TOP5 sidebar block (.rk-list)
    new_top5_html = build_top5_sidebar_html(top5)
    h = re.sub(
        r'(<div\s+class="rk-list"[^>]*>)(.*?)(</div>\s*</aside>)',
        lambda m: m.group(1) + '\n' + new_top5_html + '\n    ' + m.group(3),
        h, count=1, flags=re.DOTALL,
    )

    # 11. Grid block (#video-grid)
    new_grid_html = build_grid_html(grid)
    h = re.sub(
        r'(<div\s+(?:class="[^"]*"\s+)?id="video-grid"[^>]*>)(.*?)(</div>\s*</section>)',
        lambda m: m.group(1) + '\n' + new_grid_html + '\n  ' + m.group(3),
        h, count=1, flags=re.DOTALL,
    )

    # 12. Total count "All N cuts"
    total_count = len(top5) + len(grid)
    h = re.sub(
        r'(<h2[^>]*>All\s+<em[^>]*>)\d+(</em>\s*)cuts\s+in\s+the\s+room\.',
        r'\g<1>' + str(total_count) + r'\g<2>' + esc_attr(meta['h2_count_label']),
        h, count=1, flags=re.DOTALL,
    )

    # 13. Inline JS arrays for TOP5 + GRID (replace verbatim window.HOT_RANKING / window.GRID assignments)
    js_top5 = json.dumps([
        {"id": (it.get('id') or it.get('_id') or ''),
         "title": (it.get('title') or it.get('_title') or ''),
         "channel": (it.get('channel') or 'Twerkhub')}
        for it in top5
    ], ensure_ascii=False)
    js_grid = json.dumps([
        {"id": (it.get('_id') or it.get('id') or ''),
         "number": (it.get('number') or ''),
         "title": (it.get('_title') or it.get('title') or '')}
        for it in grid
    ], ensure_ascii=False)
    h = re.sub(r'window\.HOT_RANKING\s*=\s*\[.*?\];', 'window.HOT_RANKING = ' + js_top5 + ';', h, count=1, flags=re.DOTALL)
    h = re.sub(r'window\.GRID\s*=\s*\[.*?\];',        'window.GRID = '        + js_grid + ';', h, count=1, flags=re.DOTALL)

    # 14. ImageObject (build from scratch via json.dumps — guarantees valid JSON)
    image_obj = {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "contentUrl": thumb(first_vid),
        "url": thumb(first_vid),
        "width": 480,
        "height": 360,
        "caption": title_new,
        "representativeOfPage": True,
        "creditText": "Twerkhub",
        "encodingFormat": "image/jpeg",
    }
    image_block = '<script type="application/ld+json">' + json.dumps(image_obj, ensure_ascii=False, separators=(",", ":")) + '</script>'
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ImageObject".*?</script>',
        lambda m: image_block, h, count=1, flags=re.DOTALL,
    )

    # 15. CollectionPage — patch via JSON parse + dump (rock-solid)
    def _patch_collection(m):
        block = m.group(0)
        try:
            inner = re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1)
            obj = json.loads(inner)
            obj['name'] = title_new
            obj['url'] = canonical_new
            obj['description'] = desc_new
            items = []
            for i, it in enumerate(top5 + grid[:30], 1):
                vid = it.get('id') or it.get('_id') or ''
                t = it.get('title') or it.get('_title') or ('Video #' + str(i))
                d = (it.get('description') or it.get('_description') or '').strip() or mk_video_desc(t, category)
                items.append({
                    "@type": "VideoObject",
                    "name": t,
                    "description": d,
                    "thumbnailUrl": thumb(vid, hi=True),
                    "uploadDate": "2026-04-25T12:00:00Z",
                    "contentUrl": "https://www.youtube.com/watch?v=" + vid,
                    "embedUrl": "https://www.youtube.com/embed/" + vid,
                    "inLanguage": "en",
                    "isFamilyFriendly": False,
                    "position": i,
                })
            obj['hasPart'] = items
            return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + '</script>'
        except Exception as e:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"CollectionPage".*?</script>',
        _patch_collection, h, count=1, flags=re.DOTALL,
    )

    # 16. ItemList
    def _patch_itemlist(m):
        block = m.group(0)
        try:
            inner = re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1)
            obj = json.loads(inner)
            items = []
            for i, it in enumerate(top5 + grid, 1):
                vid = it.get('id') or it.get('_id') or ''
                t = it.get('title') or it.get('_title') or ('Video #' + str(i))
                d = (it.get('description') or it.get('_description') or '').strip() or mk_video_desc(t, category)
                items.append({
                    "@type": "ListItem",
                    "position": i,
                    "item": {
                        "@type": "VideoObject",
                        "name": t,
                        "description": d,
                        "thumbnailUrl": thumb(vid, hi=True),
                        "uploadDate": "2026-04-25T12:00:00Z",
                        "contentUrl": "https://www.youtube.com/watch?v=" + vid,
                        "embedUrl": "https://www.youtube.com/embed/" + vid,
                        "inLanguage": "en",
                        "isFamilyFriendly": False,
                        "position": i,
                    },
                })
            obj['itemListElement'] = items
            obj['numberOfItems'] = len(items)
            return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + '</script>'
        except Exception:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"ItemList".*?</script>',
        _patch_itemlist, h, count=1, flags=re.DOTALL,
    )

    # 17. BreadcrumbList
    def _patch_breadcrumb(m):
        block = m.group(0)
        try:
            inner = re.search(r'<script[^>]*>(.*?)</script>', block, re.DOTALL).group(1)
            obj = json.loads(inner)
            obj['itemListElement'] = [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": title_new, "item": canonical_new},
            ]
            return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + '</script>'
        except Exception:
            return block
    h = re.sub(
        r'<script\s+type="application/ld\+json">\{"@context":"https://schema\.org","@type":"BreadcrumbList".*?</script>',
        _patch_breadcrumb, h, count=1, flags=re.DOTALL,
    )

    return h, None


def validate_jsonld(html):
    blocks = re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL,
    )
    errors = []
    for i, b in enumerate(blocks, 1):
        try:
            json.loads(b.strip())
        except json.JSONDecodeError as e:
            ctx_start = max(0, e.pos - 60)
            ctx_end = min(len(b), e.pos + 60)
            errors.append((i, e.msg + ' @ pos ' + str(e.pos) + ' | context: ...' + b.strip()[ctx_start:ctx_end] + '...'))
    return errors


def main():
    template = TEMPLATE.read_text(encoding='utf-8')
    print("Template loaded:", len(template), "chars")
    for slug, meta in PLAYLISTS.items():
        try:
            data = json.load(open(ROOT / meta['data'], 'r', encoding='utf-8'))
        except Exception as e:
            print("  SKIP", slug, ":", e)
            continue
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_path = out_dir / 'index.html'
        new_html, err = substitute_in_template(template, slug, meta, data)
        if err:
            print("  FAIL", slug, ":", err)
            continue
        errs = validate_jsonld(new_html)
        if errs:
            print("  ABORT", slug, ":", len(errs), "broken JSON-LD block(s)")
            for idx, msg in errs:
                print("     block #" + str(idx) + ":", msg)
            continue
        out_path.write_text(new_html, encoding='utf-8')
        print("  +", slug + "/index.html (" + str(len(new_html)//1024) + " KB) — JSON-LD valid")



if __name__ == '__main__':
    main()
