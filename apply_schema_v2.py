#!/usr/bin/env python3
"""
TWERKHUB · Centralized SEO schema generator + applier
v2026-04-25-p1

REGLA DE ORO (Anti):
  - No tocar layout, video player, Up Next, ni contenido visible.
  - No cambiar slugs, canonicals existentes, ni redirects.
  - No tocar las URLs ya indexadas (especialmente /playlist/<slug>).
  - SOLO insertar/reparar JSON-LD dentro de <head>.
  - Idempotente: correr 100 veces = mismo resultado.

Page types detected:
  - home              -> WebSite + Organization + WebPage
  - playlist-landing  -> CollectionPage + BreadcrumbList (no overwrite if has ItemList)
  - playlist-video    -> VideoObject + BreadcrumbList (preserves existing if valid)
  - themed-playlist   -> CollectionPage + BreadcrumbList
  - creator           -> ProfilePage + Person + BreadcrumbList
  - twerk-dancer      -> ProfilePage + Person + BreadcrumbList
  - blog              -> BlogPosting + BreadcrumbList
  - country-hub       -> CollectionPage + BreadcrumbList
  - twerk-seo         -> WebPage + BreadcrumbList
  - style             -> WebPage + BreadcrumbList
  - premium-collection -> CollectionPage + BreadcrumbList (premium-cosplay-fancam case)
  - user-page         -> WebPage (account/profile/membership) — minimal, noindex friendly
  - other             -> WebPage + BreadcrumbList

Rules:
  - At most ONE FAQPage per page.
  - NEVER add Offer/Merchant (no real product on this site — membership is a Service).
  - VideoObject.uploadDate always normalized to ISO8601 with Z timezone.
  - All pages get a single combined <script id="twk-schema"> block in <head> if they
    are missing schema or have JS-injected schema only.
  - Pages with valid existing JSON-LD blocks are left alone unless a specific issue
    is detected (handled by repair functions).
"""

import os
import re
import json
import argparse
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
SITE = "https://alexiatwerkgroup.com"
ORG_NAME = "Twerkhub"
ORG_LOGO = SITE + "/logo-twerkhub.png"
DEFAULT_PUBDATE = "2026-04-20T12:00:00Z"

# ─── Helpers ───────────────────────────────────────────────────────────────
def normalize_upload_date(value):
    """Always returns an ISO8601 string with Z timezone or None."""
    if not value:
        return DEFAULT_PUBDATE
    s = str(value).strip()
    # Already has timezone
    if re.search(r'(Z|[+-]\d{2}:?\d{2})$', s):
        return s
    # YYYY-MM-DD only
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s + "T12:00:00Z"
    # YYYY-MM-DDTHH:MM:SS without timezone
    if re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', s):
        return s.split('+')[0].split('Z')[0] + "Z"
    # Anything else: fallback
    return DEFAULT_PUBDATE


def detect_page_type(rel_path: str, html: str) -> str:
    p = rel_path.replace('\\', '/').lstrip('./')
    if p == 'index.html': return 'home'
    if p == 'playlist/index.html': return 'playlist-landing'
    if p.startswith('playlist/') and p.endswith('.html'): return 'playlist-video'
    if re.match(r'(try-on-hot-leaks|hottest-cosplay-fancam|korean-girls-kpop-twerk|ttl-latin-models)/index\.html$', p):
        return 'themed-playlist'
    if p.startswith('creator/') and p.endswith('.html'): return 'creator'
    if p.startswith('twerk-dancer/') and p.endswith('.html'): return 'twerk-dancer'
    if p.startswith('es/creator/') or p.startswith('ru/creator/'): return 'creator'
    if p.startswith('blog/') or '/blog/' in p: return 'blog'
    if re.match(r'creators-(russia|usa|venezuela|colombia|brazil|argentina|spain|mexico|chile|peru)\.html$', p):
        return 'country-hub'
    if p in ('account.html', 'profile.html', 'membership.html', 'auth-callback.html', 'admin-users.html', 'creator-dashboard.html'):
        return 'user-page'
    if p == '404.html': return 'user-page'
    if p in ('premium-cosplay-fancam.html',) or p.startswith('premium-'):
        return 'premium-collection'
    if p.startswith('style-'): return 'style'
    if 'twerk-dance' in p or 'twerk-tutorial' in p or 'twerk-workout' in p or 'twerk-studios' in p or 'top-100' in p:
        return 'twerk-seo'
    return 'other'


# ─── Schema title/description extraction ────────────────────────────────────
def extract_title(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None

def extract_description(html):
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return m.group(1).strip() if m else None

def extract_canonical(html):
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return m.group(1).strip() if m else None

def extract_og_image(html):
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    return m.group(1).strip() if m else None

def extract_video_id(html):
    """Try to find a YouTube video id from existing iframe or schema."""
    m = re.search(r'youtube[^\s"\']*\.com/(?:embed|watch\?v=)/?([A-Za-z0-9_-]{11})', html)
    if m: return m.group(1)
    m = re.search(r'youtu\.be/([A-Za-z0-9_-]{11})', html)
    if m: return m.group(1)
    return None


# ─── Existing schema blocks ─────────────────────────────────────────────────
RE_LD = re.compile(
    r'<script\s+[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL
)
TWK_SCHEMA_MARKER = '<!-- twk-schema-v2 -->'
TWK_SCHEMA_RE = re.compile(
    r'<!-- twk-schema-v2 -->\s*<script\s+[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>',
    re.IGNORECASE | re.DOTALL
)

def extract_existing_schemas(html):
    """Return list of parsed JSON-LD objects from the page."""
    out = []
    for m in RE_LD.finditer(html):
        try:
            out.append(json.loads(m.group(1).strip()))
        except Exception:
            pass
    return out

def schemas_have_type(schemas, t):
    for s in schemas:
        st = s.get('@type') if isinstance(s, dict) else None
        if isinstance(st, list):
            if t in st: return True
        elif st == t: return True
    return False


# ─── BreadcrumbList builder ─────────────────────────────────────────────────
def build_breadcrumb(rel_path, page_title):
    p = rel_path.replace('\\', '/').lstrip('./')
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}]
    parts = p.split('/')

    # Multi-segment paths
    if p.startswith('playlist/') and p != 'playlist/index.html':
        items.append({"@type": "ListItem", "position": 2, "name": "Playlist",
                      "item": SITE + "/playlist/"})
        items.append({"@type": "ListItem", "position": 3, "name": page_title or parts[-1].replace('.html',''),
                      "item": SITE + "/" + p})
    elif p == 'playlist/index.html':
        items.append({"@type": "ListItem", "position": 2, "name": "Playlist",
                      "item": SITE + "/playlist/"})
    elif p.startswith('creator/') or p.startswith('twerk-dancer/'):
        section = "Creators" if p.startswith('creator/') else "Twerk Dancers"
        section_url = SITE + "/creators.html"
        items.append({"@type": "ListItem", "position": 2, "name": section, "item": section_url})
        items.append({"@type": "ListItem", "position": 3, "name": page_title or parts[-1].replace('.html',''),
                      "item": SITE + "/" + p})
    elif p.startswith('blog/'):
        items.append({"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + "/blog/"})
        if p != 'blog/index.html':
            items.append({"@type": "ListItem", "position": 3, "name": page_title or parts[-1].replace('.html',''),
                          "item": SITE + "/" + p})
    elif p.startswith('es/') or p.startswith('ru/'):
        lang = parts[0]
        items.append({"@type": "ListItem", "position": 2, "name": lang.upper(),
                      "item": SITE + "/" + lang + "/"})
        items.append({"@type": "ListItem", "position": 3, "name": page_title or parts[-1].replace('.html',''),
                      "item": SITE + "/" + p})
    else:
        items.append({"@type": "ListItem", "position": 2, "name": page_title or parts[-1].replace('.html',''),
                      "item": SITE + "/" + p})

    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}


# ─── Schema generators per page type ────────────────────────────────────────
def schema_organization():
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": ORG_NAME,
        "url": SITE + "/",
        "logo": ORG_LOGO,
        "sameAs": []
    }

def schema_website():
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": ORG_NAME,
        "url": SITE + "/",
        "potentialAction": {
            "@type": "SearchAction",
            "target": SITE + "/search.html?q={query}",
            "query-input": "required name=query"
        }
    }

def schema_webpage(title, desc, url):
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title or ORG_NAME,
        "description": desc or "",
        "url": url,
        "isPartOf": {"@type": "WebSite", "name": ORG_NAME, "url": SITE + "/"}
    }

def schema_collectionpage(title, desc, url):
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title or ORG_NAME,
        "description": desc or "",
        "url": url,
        "isPartOf": {"@type": "WebSite", "name": ORG_NAME, "url": SITE + "/"}
    }

def schema_videoobject(title, desc, url, vid_id, thumb):
    return {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title or "Twerk video",
        "description": desc or (title or ''),
        "thumbnailUrl": thumb or (f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg" if vid_id else ORG_LOGO),
        "uploadDate": DEFAULT_PUBDATE,
        "contentUrl": f"https://www.youtube.com/watch?v={vid_id}" if vid_id else url,
        "embedUrl": f"https://www.youtube.com/embed/{vid_id}" if vid_id else url,
        "url": url,
        "publisher": {
            "@type": "Organization",
            "name": ORG_NAME,
            "logo": {"@type": "ImageObject", "url": ORG_LOGO}
        },
        "isFamilyFriendly": False,
        "inLanguage": "en"
    }

def schema_blogposting(title, desc, url, pubdate=None):
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title or "Twerkhub blog post",
        "description": desc or "",
        "url": url,
        "datePublished": normalize_upload_date(pubdate),
        "author": {"@type": "Organization", "name": ORG_NAME},
        "publisher": {
            "@type": "Organization",
            "name": ORG_NAME,
            "logo": {"@type": "ImageObject", "url": ORG_LOGO}
        }
    }

def schema_profilepage(title, desc, url):
    return {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "name": title or "",
        "description": desc or "",
        "url": url,
        "mainEntity": {
            "@type": "Person",
            "name": (title or '').split('·')[0].strip()
        }
    }


# ─── Build the schema set for a given page ──────────────────────────────────
def build_schema_set(rel_path, html, page_type):
    title = extract_title(html)
    desc = extract_description(html)
    canonical = extract_canonical(html) or (SITE + '/' + rel_path.replace('\\','/').lstrip('./'))
    og_image = extract_og_image(html)
    vid = extract_video_id(html)

    # Inspect existing schema types so we don't create duplicates.
    existing = extract_existing_schemas(html)
    existing_types = set()
    for s in existing:
        if isinstance(s, dict):
            t = s.get('@type')
            if isinstance(t, list):
                for tt in t: existing_types.add(tt)
            elif isinstance(t, str):
                existing_types.add(t)

    def add_if_missing(schema_obj, *types_to_check):
        """Append schema only if NONE of the given types already exists on the page."""
        if any(t in existing_types for t in types_to_check):
            return
        schemas.append(schema_obj)
        # Track it so we don't re-add same type from another branch
        t = schema_obj.get('@type')
        if isinstance(t, str): existing_types.add(t)

    schemas = []

    if page_type == 'home':
        add_if_missing(schema_website(), 'WebSite')
        add_if_missing(schema_organization(), 'Organization')
    elif page_type == 'playlist-landing':
        # Page already has CollectionPage + ItemList. Just add breadcrumb.
        pass
    elif page_type == 'playlist-video':
        add_if_missing(schema_videoobject(title, desc, canonical, vid, og_image), 'VideoObject')
    elif page_type == 'themed-playlist':
        add_if_missing(schema_collectionpage(title, desc, canonical), 'CollectionPage')
    elif page_type in ('creator', 'twerk-dancer'):
        add_if_missing(schema_profilepage(title, desc, canonical), 'ProfilePage', 'Person')
    elif page_type == 'blog':
        add_if_missing(schema_blogposting(title, desc, canonical), 'BlogPosting', 'Article')
    elif page_type == 'country-hub':
        add_if_missing(schema_collectionpage(title, desc, canonical), 'CollectionPage')
    elif page_type == 'twerk-seo':
        add_if_missing(schema_webpage(title, desc, canonical), 'WebPage')
    elif page_type == 'style':
        add_if_missing(schema_webpage(title, desc, canonical), 'WebPage')
    elif page_type == 'premium-collection':
        add_if_missing(schema_collectionpage(title, desc, canonical), 'CollectionPage')
    elif page_type == 'user-page':
        add_if_missing(schema_webpage(title, desc, canonical), 'WebPage')
    else:
        add_if_missing(schema_webpage(title, desc, canonical), 'WebPage')

    # BreadcrumbList — universal, except home
    if page_type != 'home':
        add_if_missing(build_breadcrumb(rel_path, title), 'BreadcrumbList')

    return schemas


# ─── Repair existing schemas ────────────────────────────────────────────────
def repair_existing_schemas(html):
    """Walk all existing JSON-LD blocks. Repairs:
      - Normalize uploadDate timezone in any VideoObject
      - Strip Offer with missing hasMerchantReturnPolicy/shippingDetails
      - De-duplicate FAQPage (keep first, remove others)
    Returns (new_html, num_changes).
    """
    changes = 0
    seen_faqpage = False
    new_blocks = []
    matches = list(RE_LD.finditer(html))
    if not matches:
        return html, 0

    for m in matches:
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception:
            new_blocks.append(m.group(0))
            continue

        def fix_node(node):
            nonlocal changes, seen_faqpage
            if not isinstance(node, dict):
                return node
            t = node.get('@type')
            if t == 'FAQPage':
                if seen_faqpage:
                    return None  # mark for removal
                seen_faqpage = True
            if t == 'VideoObject':
                ud = node.get('uploadDate')
                norm = normalize_upload_date(ud)
                if norm != ud:
                    node['uploadDate'] = norm
                    changes += 1
            if t == 'Offer':
                # Strip Offer entirely — we don't sell physical goods
                return None
            # Recurse into nested dicts/lists
            for k, v in list(node.items()):
                if isinstance(v, dict):
                    fixed = fix_node(v)
                    if fixed is None:
                        del node[k]
                        changes += 1
                    else:
                        node[k] = fixed
                elif isinstance(v, list):
                    new_list = []
                    for item in v:
                        fixed = fix_node(item) if isinstance(item, dict) else item
                        if fixed is not None:
                            new_list.append(fixed)
                        else:
                            changes += 1
                    node[k] = new_list
            return node

        if isinstance(data, list):
            kept = []
            for item in data:
                fixed = fix_node(item) if isinstance(item, dict) else item
                if fixed is not None:
                    kept.append(fixed)
                else:
                    changes += 1
            data = kept
        elif isinstance(data, dict):
            fixed = fix_node(data)
            if fixed is None:
                # entire block was a duplicate FAQ or Offer — drop the script tag
                changes += 1
                continue
            data = fixed

        new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        # Reconstruct the script tag, preserving its original opening tag
        opening = re.match(r'<script\s+[^>]*type=["\']application/ld\+json["\'][^>]*>', m.group(0), re.IGNORECASE)
        opening_str = opening.group(0) if opening else '<script type="application/ld+json">'
        new_blocks.append(f'{opening_str}{new_json}</script>')

    # Rebuild html with repaired blocks in same positions
    out = []
    last = 0
    for i, m in enumerate(matches):
        out.append(html[last:m.start()])
        if i < len(new_blocks):
            out.append(new_blocks[i])
        # else: block dropped
        last = m.end()
    out.append(html[last:])
    return ''.join(out), changes


# ─── Inject our schema set into <head> ──────────────────────────────────────
def inject_twk_schema(html, schemas):
    """Add a single combined twk-schema block. Idempotent: replaces previous twk-schema block."""
    if not schemas:
        return html, False
    # Build the combined block (one <script> per schema for clarity / Rich Results detection)
    parts = []
    for s in schemas:
        parts.append(
            f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False, separators=(",", ":"))}</script>'
        )
    block = TWK_SCHEMA_MARKER + '\n' + '\n'.join(parts)

    # Replace existing twk-schema if present (handles multiple scripts in marker block)
    pattern_full = re.compile(
        re.escape(TWK_SCHEMA_MARKER) + r'(?:\s*<script[^>]*>.*?</script>)+',
        re.IGNORECASE | re.DOTALL
    )
    if pattern_full.search(html):
        new_html, n = pattern_full.subn(block, html, count=1)
        return new_html, n > 0

    # Insert just before </head>
    if '</head>' in html:
        new_html = html.replace('</head>', block + '\n</head>', 1)
        return new_html, True
    # Fallback: insert at top of <body>
    if '<body' in html:
        new_html = re.sub(r'(<body[^>]*>)', r'\1\n' + block, html, count=1)
        return new_html, True
    return html, False


# ─── Per-page operation ─────────────────────────────────────────────────────
def process_file(path: Path, dry_run=False):
    rel = str(path.relative_to(ROOT)).replace('\\', '/')
    try:
        html = path.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return {'path': rel, 'error': f'read: {e}'}

    page_type = detect_page_type(rel, html)

    # 1. Repair existing schemas (uploadDate, dedup FAQPage, strip Offer)
    repaired, repair_changes = repair_existing_schemas(html)

    # 2. Compute desired schema set for this page type
    desired = build_schema_set(rel, repaired, page_type)

    # 3. Inject (idempotent — replaces previous twk-schema-v2 block)
    new_html, injected = inject_twk_schema(repaired, desired)

    if new_html == html:
        return {'path': rel, 'type': page_type, 'changes': 0, 'injected': False}

    if not dry_run:
        path.write_text(new_html, encoding='utf-8')

    return {
        'path': rel,
        'type': page_type,
        'repair_changes': repair_changes,
        'injected': injected,
        'changes': repair_changes + (1 if injected else 0),
    }


# ─── Main ───────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='Do not write')
    ap.add_argument('--limit', type=int, default=0, help='Process at most N files')
    ap.add_argument('--only', type=str, default='', help='Only process files matching this glob suffix')
    args = ap.parse_args()

    files = []
    for p in ROOT.rglob('*.html'):
        s = str(p)
        if '.git' in s or 'node_modules' in s or '/_supabase/' in s:
            continue
        if args.only and args.only not in str(p.relative_to(ROOT)):
            continue
        files.append(p)
    files.sort()
    if args.limit:
        files = files[:args.limit]

    print(f'Processing {len(files)} files (dry_run={args.dry_run})')
    summary = {'total': 0, 'changed': 0, 'by_type': {}, 'errors': []}
    for p in files:
        res = process_file(p, dry_run=args.dry_run)
        summary['total'] += 1
        t = res.get('type', 'error')
        summary['by_type'].setdefault(t, {'count': 0, 'changed': 0})
        summary['by_type'][t]['count'] += 1
        if res.get('changes', 0) > 0 or res.get('injected'):
            summary['changed'] += 1
            summary['by_type'][t]['changed'] += 1
        if res.get('error'):
            summary['errors'].append(res)

    print(f"\n=== Summary ===")
    print(f"Total: {summary['total']}, Changed: {summary['changed']}")
    print(f"By type:")
    for t, info in sorted(summary['by_type'].items()):
        print(f"  {t:25s} count={info['count']:4d} changed={info['changed']:4d}")
    if summary['errors']:
        print(f"\nErrors ({len(summary['errors'])}):")
        for e in summary['errors'][:10]:
            print(f"  {e}")


if __name__ == '__main__':
    main()
