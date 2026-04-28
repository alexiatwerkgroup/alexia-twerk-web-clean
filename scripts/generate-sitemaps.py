#!/usr/bin/env python3
"""
TWERKHUB · Sitemap Auto-Generator
----------------------------------
Walks the entire repo and generates:
  - sitemap.xml         (all public HTML pages, with hreflang annotations for KO/JA cluster)
  - sitemap-videos.xml  (every detail page with VideoObject schema → Google Video sitemap)
  - sitemap-index.xml   (master index)

Auto-scaling: any new page added to the repo gets included on the next run.

Run before each deploy:
    python3 scripts/generate-sitemaps.py
"""
import os
import re
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://alexiatwerkgroup.com'
TODAY = datetime.date.today().isoformat()

# Patterns of pages that must NOT be indexed (utility, admin, test, paid-content variants)
EXCLUDE_PATTERNS = [
    r'^account\.html$',
    r'^profile\.html$',
    r'^admin-',
    r'^auth-',
    r'^callback',
    r'^login',
    r'^test-',
    r'^debug-',
    r'^_',
    r'^paid-content',
    r'^variants?-',
    r'^oriental-final',
    r'^playlist-model-1-dark-premium',
    r'^premium-',
    r'^savage-twerk-video',
    r'^VARIANTE-',
    r'^index\.html\.bak$',
    r'\.bak$',
]
EXCLUDE_DIRS = {'node_modules', '.git', '__pycache__', '_backups', '_generator',
                '_playlist_data', '_supabase', 'main-repo', 'sql', 'tools',
                'scripts'}

# Playlist folders that contain video detail pages (with VideoObject schema)
DETAIL_FOLDERS = {
    'playlist', 'cosplay-fancam-leaks', 'korean-girls-kpop-twerk',
    'twerk-hub-leaks', 'latina-model-leaks', 'try-on-hot-leaks',
}

# i18n cluster: playlists with KO/JA versions
I18N_CLUSTER = {
    'hottest-cosplay-fancam',
    'korean-girls-kpop-twerk',
}

def is_excluded(rel_path):
    parts = rel_path.split('/')
    if any(p in EXCLUDE_DIRS for p in parts):
        return True
    name = parts[-1]
    for pat in EXCLUDE_PATTERNS:
        if re.search(pat, name):
            return True
    return False

def has_noindex(html):
    return bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', html, re.I))

def priority_for(rel_path):
    if rel_path == 'index.html':
        return '1.0'
    if rel_path.endswith('/index.html') or rel_path.count('/') == 0 and rel_path.endswith('.html'):
        # top-level page
        return '0.8'
    if rel_path.startswith('blog/'):
        return '0.7'
    if rel_path.startswith('creator/') or rel_path.startswith('twerk-dancer/'):
        return '0.6'
    if any(rel_path.startswith(d + '/') for d in DETAIL_FOLDERS):
        return '0.7'
    return '0.5'

def changefreq_for(rel_path):
    if rel_path == 'index.html':
        return 'daily'
    if rel_path.startswith('blog/'):
        return 'monthly'
    if any(rel_path.startswith(d + '/') for d in DETAIL_FOLDERS):
        return 'weekly'
    if rel_path.startswith('ko/') or rel_path.startswith('ja/'):
        return 'weekly'
    return 'monthly'

def url_for(rel_path):
    """Convert repo-relative path to public URL."""
    if rel_path == 'index.html':
        return f'{BASE}/'
    # convert /index.html → /
    if rel_path.endswith('/index.html'):
        return f'{BASE}/{rel_path[:-len("index.html")]}'
    return f'{BASE}/{rel_path}'

def collect_html_pages():
    pages = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # prune excluded dirs
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS and not d.startswith('.')]
        for fn in filenames:
            if not fn.endswith('.html'):
                continue
            full = Path(dirpath) / fn
            rel = str(full.relative_to(ROOT)).replace(os.sep, '/')
            if is_excluded(rel):
                continue
            try:
                html = full.read_text(encoding='utf-8', errors='replace')
            except Exception:
                continue
            if has_noindex(html):
                continue
            pages.append({
                'rel': rel,
                'full': full,
                'html': html,
            })
    return pages

def has_i18n_alternates(rel):
    """Pages that should emit hreflang cluster (en + ko + ja + x-default)."""
    # The 4 EN HOMEs that have KO/JA versions
    if rel == 'hottest-cosplay-fancam/index.html':
        return 'hottest-cosplay-fancam'
    if rel == 'korean-girls-kpop-twerk/index.html':
        return 'korean-girls-kpop-twerk'
    if rel.startswith('ko/hottest-cosplay-fancam/') or rel.startswith('ja/hottest-cosplay-fancam/'):
        return 'hottest-cosplay-fancam'
    if rel.startswith('ko/korean-girls-kpop-twerk/') or rel.startswith('ja/korean-girls-kpop-twerk/'):
        return 'korean-girls-kpop-twerk'
    return None

def build_alternates_xml(pl_slug):
    return ''.join([
        f'    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}/{pl_slug}/"/>\n',
        f'    <xhtml:link rel="alternate" hreflang="en" href="{BASE}/{pl_slug}/"/>\n',
        f'    <xhtml:link rel="alternate" hreflang="ko" href="{BASE}/ko/{pl_slug}/"/>\n',
        f'    <xhtml:link rel="alternate" hreflang="ja" href="{BASE}/ja/{pl_slug}/"/>\n',
    ])

def write_sitemap_pages(pages, out_path):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for p in pages:
        url = url_for(p['rel'])
        pri = priority_for(p['rel'])
        cf = changefreq_for(p['rel'])
        cluster = has_i18n_alternates(p['rel'])
        if cluster:
            lines.append('  <url>')
            lines.append(f'    <loc>{url}</loc>')
            lines.append(f'    <lastmod>{TODAY}</lastmod>')
            lines.append(f'    <changefreq>{cf}</changefreq>')
            lines.append(f'    <priority>{pri}</priority>')
            lines.append(build_alternates_xml(cluster).rstrip())
            lines.append('  </url>')
        else:
            lines.append(f'  <url><loc>{url}</loc><lastmod>{TODAY}</lastmod><changefreq>{cf}</changefreq><priority>{pri}</priority></url>')
    lines.append('</urlset>')
    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f'[sitemap] wrote {out_path.name} with {len(pages)} URLs')

def extract_video_meta(html):
    """Pull VideoObject JSON-LD details from a detail page."""
    m = re.search(r'<script type="application/ld\+json">(\{[^<]*?"@type":"VideoObject"[^<]*?\})</script>', html)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except Exception:
        return None
    thumb = data.get('thumbnailUrl')
    if isinstance(thumb, list):
        thumb = thumb[0] if thumb else None
    return {
        'title': data.get('name', ''),
        'description': data.get('description', ''),
        'thumb': thumb,
        'embedUrl': data.get('embedUrl'),
        'contentUrl': data.get('contentUrl'),
        'uploadDate': data.get('uploadDate'),
        'duration': data.get('duration'),
        'creator': (data.get('creator') or {}).get('name') if isinstance(data.get('creator'), dict) else None,
    }

def xml_escape(s):
    if not s:
        return ''
    return (str(s).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;'))

def write_sitemap_videos(pages, out_path):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    count = 0
    for p in pages:
        if not any(p['rel'].startswith(d + '/') for d in DETAIL_FOLDERS):
            continue
        meta = extract_video_meta(p['html'])
        if not meta:
            continue
        if not meta.get('thumb') or not (meta.get('embedUrl') or meta.get('contentUrl')):
            continue
        url = url_for(p['rel'])
        title = xml_escape(meta['title'])[:100]
        desc = xml_escape(meta['description'])[:2048]
        thumb = xml_escape(meta['thumb'])
        embed = xml_escape(meta.get('embedUrl') or '')
        content = xml_escape(meta.get('contentUrl') or '')
        upload = meta.get('uploadDate') or '2026-04-20'
        # ensure ISO 8601 with timezone
        if 'T' not in upload:
            upload = f'{upload}T08:00:00+00:00'
        duration = meta.get('duration') or ''
        creator = xml_escape(meta.get('creator') or 'Twerkhub')

        lines.append('  <url>')
        lines.append(f'    <loc>{url}</loc>')
        lines.append('    <video:video>')
        lines.append(f'      <video:thumbnail_loc>{thumb}</video:thumbnail_loc>')
        lines.append(f'      <video:title>{title}</video:title>')
        lines.append(f'      <video:description>{desc}</video:description>')
        if content:
            lines.append(f'      <video:content_loc>{content}</video:content_loc>')
        if embed:
            lines.append(f'      <video:player_loc>{embed}</video:player_loc>')
        lines.append(f'      <video:publication_date>{upload}</video:publication_date>')
        if duration:
            # convert ISO 8601 PT3M58S to seconds
            secs = 0
            mm = re.search(r'PT(?:(\d+)M)?(?:(\d+)S)?', duration)
            if mm:
                if mm.group(1): secs += int(mm.group(1)) * 60
                if mm.group(2): secs += int(mm.group(2))
            if secs:
                lines.append(f'      <video:duration>{secs}</video:duration>')
        lines.append('      <video:family_friendly>no</video:family_friendly>')
        lines.append('      <video:requires_subscription>no</video:requires_subscription>')
        lines.append(f'      <video:uploader info="{BASE}/">{creator}</video:uploader>')
        lines.append('      <video:live>no</video:live>')
        lines.append('    </video:video>')
        lines.append('  </url>')
        count += 1
    lines.append('</urlset>')
    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f'[sitemap] wrote {out_path.name} with {count} video entries')

def write_sitemap_index(out_path):
    content = f'''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>{BASE}/sitemap.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE}/sitemap-videos.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{BASE}/sitemap-images.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
</sitemapindex>
'''
    out_path.write_text(content, encoding='utf-8')
    print(f'[sitemap] wrote {out_path.name}')

def main():
    print(f'[scan] root = {ROOT}')
    pages = collect_html_pages()
    print(f'[scan] {len(pages)} indexable pages collected')

    write_sitemap_pages(pages, ROOT / 'sitemap.xml')
    write_sitemap_videos(pages, ROOT / 'sitemap-videos.xml')
    write_sitemap_index(ROOT / 'sitemap-index.xml')
    print('[done] all sitemaps regenerated')

if __name__ == '__main__':
    main()
