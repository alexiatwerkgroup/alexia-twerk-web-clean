#!/usr/bin/env python3
"""
Apply proposed <title> and <meta name="description"> ONLY where missing.
Never overwrites existing tags. Inserts right after <meta charset> (or first
<head> child if charset is absent).
"""
import re, html as html_lib
from pathlib import Path
from collections import Counter

ROOT = Path('/sessions/wizardly-fervent-sagan/mnt/alexia-twerk-web-clean')
INCLUDE_DIRS = {'try-on-hot-leaks','ttl-latin-models','hottest-cosplay-fancam','korean-girls-kpop-twerk','creators'}
EXCLUDE_PREFIXES = ('playlist/','creator/','twerk-dancer/','es/','ru/','blog/','sitemap','admin-','404.html','_supabase/','.git/','node_modules/','_generator/','auth-callback.html','profile.html','account.html','membership.html','admin-users.html','creator-dashboard.html')
SUFFIX = ' · Twerkhub'

CATEGORY_HINTS = [
    (re.compile(r'twerk-dance'),       ('twerk dance','choreo, fancam & dance challenge cuts')),
    (re.compile(r'twerk-tutorial'),    ('twerk tutorial','beginner-to-advanced moves & technique drills')),
    (re.compile(r'twerk-workout'),     ('twerk workout','glute-focused dance workouts & routines')),
    (re.compile(r'twerk-music'),       ('twerk music','best beats, mixes & playlists for dancers')),
    (re.compile(r'twerk-shorts'),      ('twerk shorts','fast viral clips & TikTok-style cuts')),
    (re.compile(r'twerk-battle'),      ('twerk battle','head-to-head dancer battles & competitions')),
    (re.compile(r'twerk-compilation'), ('twerk compilation','curated highlight reels & best-of cuts')),
    (re.compile(r'twerk-4k'),          ('4K twerk','high-resolution dance cuts in true 4K')),
    (re.compile(r'cosplay'),           ('cosplay fancam','anime cosplay fancams in HD')),
    (re.compile(r'try-on'),            ('try-on haul','curated try-on haul cuts')),
    (re.compile(r'latin'),             ('Latin model','Latina model archive & private cuts')),
    (re.compile(r'korean|kpop|k-pop'), ('K-pop twerk','Korean girl group dance & choreo cuts')),
    (re.compile(r'top-100|top100'),    ('top 100','curated ranking of the hottest twerk videos')),
    (re.compile(r'best-twerk'),        ('best twerk','hand-picked top dancers & viral routines')),
    (re.compile(r'pack|leak'),         ('exclusive pack','private 4K archives & members-only drops')),
    (re.compile(r'group-'),            ('group archive','choreo group archive & dancer profile')),
    (re.compile(r'studio|dance'),      ('dance studio','studio profile, choreographies & student cuts')),
    (re.compile(r'creator|model'),     ('creator profile','profile, top videos & curated archive')),
]

def slug_to_words(s): return re.sub(r'[-_]+',' ',re.sub(r'\.html$','',s)).strip().title()
def category_for(rel):
    s=rel.lower()
    for rx,(cat,bl) in CATEGORY_HINTS:
        if rx.search(s): return cat,bl
    return 'twerk','curated dance & fancam content'

def propose_title(rel,h1):
    base=(h1 or slug_to_words(rel.split('/')[-1])).strip().rstrip('.')
    base=re.sub(r'\s+',' ',base)
    if 'twerkhub' in base.lower(): return base[:65]
    mb=65-len(SUFFIX)
    if len(base)>mb: base=base[:mb].rstrip().rstrip('-:.,·')
    return (base+SUFFIX)[:65]

def propose_desc(rel,h1):
    name=(h1 or slug_to_words(rel.split('/')[-1])).strip().rstrip('.')
    name=re.sub(r'\s+',' ',name)
    cat,bl=category_for(rel)
    d=f"{name} on Twerkhub — {bl}. Watch the curated {cat} collection, weekly drops & exclusive cuts. Free preview, members-only archive."
    if len(d)>158: d=f"{name} on Twerkhub — {bl}. Curated {cat} collection. Weekly drops & members-only cuts."
    if len(d)>158: d=d[:155].rstrip().rstrip(',.;:')+'...'
    return d

def is_root(rel):
    rel=rel.replace('\\','/')
    if rel=='index.html': return True
    if '/' not in rel and rel.endswith('.html'):
        for p in EXCLUDE_PREFIXES:
            if rel.startswith(p): return False
        return True
    parts=rel.split('/')
    if len(parts)==2 and parts[1]=='index.html' and parts[0] in INCLUDE_DIRS: return True
    return False

HAS_TITLE = re.compile(r'<title[^>]*>[^<]*</title>', re.IGNORECASE | re.DOTALL)
HAS_DESC  = re.compile(r'<meta\s+name=["\']description["\']', re.IGNORECASE)
H1_RE     = re.compile(r'<h1[^>]*>(.*?)</h1>', re.IGNORECASE | re.DOTALL)
CHARSET   = re.compile(r'(<meta\s+charset=["\'][^"\']*["\']\s*/?>)', re.IGNORECASE)
HEAD_OPEN = re.compile(r'(<head[^>]*>)', re.IGNORECASE)

def get_h1(html):
    m = H1_RE.findall(html)
    if not m: return ''
    return html_lib.unescape(re.sub(r'<[^>]+>', '', m[0])).strip().rstrip('.')

def attr_escape(s):
    return html_lib.escape(s, quote=True)

def inject_after_head(html, snippet):
    """Insert snippet right after <meta charset> if present, else right after <head>."""
    if CHARSET.search(html):
        return CHARSET.sub(lambda m: m.group(1) + '\n' + snippet, html, count=1)
    if HEAD_OPEN.search(html):
        return HEAD_OPEN.sub(lambda m: m.group(1) + '\n' + snippet, html, count=1)
    return html

# ── Run
applied = 0; touched_files = 0; skipped = 0
results = {'titles_added': [], 'descs_added': [], 'skipped': []}
for p in ROOT.rglob('*.html'):
    rel = str(p.relative_to(ROOT)).replace('\\','/')
    if not is_root(rel): continue
    try: html = p.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        results['skipped'].append((rel, f'read: {e}'))
        continue

    needs_title = not HAS_TITLE.search(html)
    needs_desc  = not HAS_DESC.search(html)
    if not (needs_title or needs_desc): continue

    h1 = get_h1(html)
    new_html = html
    snippets = []
    if needs_title:
        t = propose_title(rel, h1)
        snippets.append('<title>' + html_lib.escape(t, quote=False) + '</title>')
        results['titles_added'].append((rel, t))
    if needs_desc:
        d = propose_desc(rel, h1)
        snippets.append('<meta name="description" content="' + attr_escape(d) + '">')
        results['descs_added'].append((rel, d))

    if snippets:
        new_html = inject_after_head(new_html, '\n'.join(snippets))

    if new_html != html:
        p.write_text(new_html, encoding='utf-8')
        touched_files += 1
        applied += len(snippets)

print(f'\n=== Applied ===')
print(f'Files touched : {touched_files}')
print(f'Titles added  : {len(results["titles_added"])}')
print(f'Descs added   : {len(results["descs_added"])}')
print(f'Skipped       : {len(results["skipped"])}')
print()
print('Sample of titles added:')
for rel, t in results['titles_added'][:8]:
    print(f'  {rel}  →  {t!r}')
