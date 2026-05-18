#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
internal-linking-auto.py - 2026-05-07
Inyecta una sección "RELATED" con 6 links internos al final de cada HTML del repo.

ALGORITMO:
  1. Indexa todas las HTMLs: URL, title, h1, folder, slug, tokens del slug
  2. Clasifica cada página en una "categoría" según su URL pattern:
       - /creator/<slug>.html              → creator
       - /creators-<region>.html           → creators_hub
       - /<city>-twerk.html                → city_twerk
       - /style-<style>.html               → style
       - /playlist/<slug>.html             → playlist
       - /ttl-latin-models/<slug>.html     → ttl_latin
       - /try-on-hot-leaks/<slug>.html     → tryon
       - /korean-girls-kpop-twerk/<slug>.html → kpop
       - /hottest-cosplay-fancam/<slug>.html → cosplay
       - /blog/<slug>.html                 → blog
       - /group-<name>.html                → group
       - resto                             → misc
  3. Score de relación entre 2 pages:
       +20 si misma categoría
       +15 si comparten 2+ tokens de slug
       +10 si comparten 1 token de slug
       +5  si misma "region" (moscow, seoul, tokyo, miami, etc.)
       +3  si comparten 1 keyword del title
  4. Top 6 = related. Inserta antes de </body> con marker idempotente.

DRY-RUN por defecto. --apply para escribir.
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

MARKER_OPEN = '<!-- twk-related-auto:START -->'
MARKER_CLOSE = '<!-- twk-related-auto:END -->'

REGIONS = {
    'moscow', 'seoul', 'tokyo', 'osaka', 'akihabara', 'manchester', 'london',
    'miami', 'atlanta', 'california', 'newyork', 'losangeles', 'usa', 'uk',
    'russia', 'colombia', 'latam', 'greece', 'taipei', 'japan',
    'buenosaires', 'argentina',
}

STOP_TOKENS = {
    'the', 'and', 'for', 'with', 'fancam', 'twerk', 'dance', 'video', 'videos',
    'leaks', 'hot', 'top', 'index', 'page', 'creator', 'model', 'models',
    'group', 'style', 'playlist', 'mix', 'compilation', 'cover', 'session',
    'fcam', 'cam', '4k', '8k', 'hd', 'full', 'live', 'new', 'best', 'how',
    'what', 'why', 'who', 'when', 'where',
}


def normalize_token(t):
    return re.sub(r'[^a-z0-9]+', '', t.lower())


def categorize(rel_path):
    p = rel_path.lower().replace('\\', '/').lstrip('./')
    if p.startswith('blog/'):
        return 'blog'
    if p.startswith('creator/'):
        return 'creator'
    if p.startswith('playlist/'):
        return 'playlist'
    if p.startswith('ttl-latin-models/'):
        return 'ttl_latin'
    if p.startswith('try-on-hot-leaks/'):
        return 'tryon'
    if p.startswith('korean-girls-kpop-twerk/'):
        return 'kpop'
    if p.startswith('hottest-cosplay-fancam/'):
        return 'cosplay'
    if p.startswith('ru/') or p.startswith('es/'):
        return 'translated'
    fname = p.split('/')[-1]
    if fname.startswith('creators-') or fname.startswith('creators.html'):
        return 'creators_hub'
    if fname.startswith('style-'):
        return 'style'
    if fname.endswith('-twerk.html'):
        return 'city_twerk'
    if fname.startswith('group-'):
        return 'group'
    return 'misc'


def slug_tokens(rel_path):
    fname = rel_path.split('/')[-1].replace('.html', '')
    tokens = re.split(r'[-_]+', fname)
    out = set()
    for t in tokens:
        t = normalize_token(t)
        if t and len(t) > 2 and t not in STOP_TOKENS and not t.isdigit():
            out.add(t)
    return out


def detect_region(tokens):
    return tokens & REGIONS


def extract_title_h1(content):
    title = ''
    h1 = ''
    m = re.search(r'<title[^>]*>(.*?)</title>', content, re.S | re.I)
    if m:
        title = re.sub(r'\s+', ' ', m.group(1)).strip()
    m = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.S | re.I)
    if m:
        h1 = re.sub(r'<[^>]+>', '', m.group(1))
        h1 = re.sub(r'\s+', ' ', h1).strip()
    return title, h1


def title_keywords(title):
    kws = set()
    for w in re.split(r'[\s\W]+', title.lower()):
        w = normalize_token(w)
        if w and len(w) > 3 and w not in STOP_TOKENS:
            kws.add(w)
    return kws


def build_index():
    htmls = []
    for p in REPO.rglob('*.html'):
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '_generator', 'tools']):
            continue
        if p.name.startswith('.'):
            continue
        htmls.append(p)

    pages = []
    for fp in htmls:
        try:
            content = fp.read_text(encoding='utf-8')
        except Exception:
            continue
        rel = fp.relative_to(REPO).as_posix()
        if rel.startswith('blog/index.html') or rel == 'index.html':
            url = '/' if rel == 'index.html' else '/' + rel.rsplit('/', 1)[0] + '/'
        elif rel.endswith('/index.html'):
            url = '/' + rel[:-len('index.html')]
        else:
            url = '/' + rel
        category = categorize(rel)
        tokens = slug_tokens(rel)
        title, h1 = extract_title_h1(content)
        kws = title_keywords(title + ' ' + h1)
        region = detect_region(tokens)

        pages.append({
            'fp': fp,
            'rel': rel,
            'url': url,
            'category': category,
            'tokens': tokens,
            'kws': kws,
            'region': region,
            'title': title or h1 or rel,
            'h1': h1,
        })

    return pages


def score_relation(a, b):
    if a is b:
        return -1
    if a['url'] == b['url']:
        return -1
    score = 0
    if a['category'] == b['category'] and a['category'] not in ('misc', 'translated'):
        score += 20
    common_tokens = a['tokens'] & b['tokens']
    if len(common_tokens) >= 2:
        score += 15
    elif len(common_tokens) == 1:
        score += 10
    if a['region'] and a['region'] & b['region']:
        score += 5
    common_kws = a['kws'] & b['kws']
    if len(common_kws) >= 2:
        score += 6
    elif len(common_kws) == 1:
        score += 3
    return score


def render_block(related):
    """Genera el HTML del bloque related con 6 cards minimal."""
    items = ''
    for r in related:
        title = (r['h1'] or r['title'] or r['url']).strip()
        # truncar título suave
        title_safe = re.sub(r'[<>"]', '', title)[:80]
        if len(title) > 80:
            title_safe += '…'
        items += (
            f'    <a href="{r["url"]}" class="twk-rel-auto-card" data-cat="{r["category"]}">\n'
            f'      <span class="twk-rel-auto-cat">{r["category"].replace("_", " ")}</span>\n'
            f'      <span class="twk-rel-auto-title">{title_safe}</span>\n'
            f'    </a>\n'
        )
    css = (
        '<style id="twk-rel-auto-css">'
        '.twk-rel-auto{max-width:1320px;margin:50px auto 30px;padding:0 26px;font-family:"Inter",ui-sans-serif,system-ui,sans-serif}'
        '.twk-rel-auto-head{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:#ff9000;margin-bottom:18px;display:block}'
        '.twk-rel-auto-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}'
        '@media(max-width:880px){.twk-rel-auto-grid{grid-template-columns:repeat(2,1fr)}}'
        '@media(max-width:520px){.twk-rel-auto-grid{grid-template-columns:1fr}}'
        '.twk-rel-auto-card{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(20,20,32,.5);text-decoration:none;color:#f5f5fb;transition:transform .25s,border-color .25s,background .25s}'
        '.twk-rel-auto-card:hover{transform:translateY(-2px);border-color:rgba(255,45,135,.45);background:rgba(30,20,40,.7)}'
        '.twk-rel-auto-cat{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8}'
        '.twk-rel-auto-title{font-family:"Inter",sans-serif;font-size:14px;font-weight:600;line-height:1.35;color:#e9e9f0}'
        '</style>'
    )
    return (
        f'\n{MARKER_OPEN}\n'
        f'{css}\n'
        f'<aside class="twk-rel-auto" aria-label="Related pages">\n'
        f'  <span class="twk-rel-auto-head">★ More from the archive</span>\n'
        f'  <div class="twk-rel-auto-grid">\n'
        f'{items}'
        f'  </div>\n'
        f'</aside>\n'
        f'{MARKER_CLOSE}\n'
    )


def main():
    print("=" * 72)
    print("  INTERNAL LINKING AUTO  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    print("\n  Indexando páginas...")
    pages = build_index()
    print(f"  Total páginas indexadas: {len(pages)}")

    by_cat = defaultdict(int)
    for p in pages:
        by_cat[p['category']] += 1
    print("\n  Páginas por categoría:")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"    {c:<16} {n}")

    print("\n  Calculando relaciones (top 6 por página)...")
    inserted = 0
    updated = 0
    skipped = 0

    for i, page in enumerate(pages):
        if i % 100 == 0 and i > 0:
            print(f"    procesadas {i}/{len(pages)}...")

        # Compute scores
        scored = []
        for other in pages:
            s = score_relation(page, other)
            if s > 0:
                scored.append((s, other))
        scored.sort(key=lambda x: (-x[0], x[1]['url']))
        top = [o for _, o in scored[:6]]
        if len(top) < 3:
            skipped += 1
            continue

        block = render_block(top)
        try:
            content = page['fp'].read_text(encoding='utf-8')
        except Exception:
            skipped += 1
            continue

        if MARKER_OPEN in content and MARKER_CLOSE in content:
            start = content.find(MARKER_OPEN)
            end = content.find(MARKER_CLOSE) + len(MARKER_CLOSE)
            new_content = content[:start] + block.strip() + content[end:]
            if new_content == content:
                skipped += 1
                continue
            updated += 1
        else:
            if '</body>' not in content:
                skipped += 1
                continue
            new_content = content.replace('</body>', block + '</body>', 1)
            inserted += 1

        if not DRY_RUN:
            page['fp'].write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n{'=' * 72}")
    print(f"  Insertados (nuevos):     {inserted}")
    print(f"  Actualizados (existían): {updated}")
    print(f"  Saltados (sin candidatos / </body> faltante): {skipped}")
    print(f"{'=' * 72}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python internal-linking-auto.py --apply")


if __name__ == '__main__':
    main()
