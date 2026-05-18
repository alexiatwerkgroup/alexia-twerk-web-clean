# -*- coding: utf-8 -*-
"""
Sitemap generator for blog content (EN/ES/RU) - 2026-05-06

Reads blog/, es/blog/, ru/blog/ folders and generates sitemap-blog.xml
with proper xhtml:link hreflang alternates per URL.

Run from project root:
    python generate-sitemap-blog-20260506.py

Output: sitemap-blog.xml (project root)

Then update sitemap-index.xml + robots.txt to register the new sitemap.
"""
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE_URL = "https://alexiatwerkgroup.com"
TODAY = datetime.now().strftime("%Y-%m-%d")

LANG_DIRS = {
    "en": "blog",
    "es": "es/blog",
    "ru": "ru/blog",
}

def list_blog_slugs(rel_dir):
    p = os.path.join(ROOT, rel_dir)
    if not os.path.isdir(p): return []
    return sorted(
        f for f in os.listdir(p)
        if f.endswith(".html")
    )

# Collect by language
by_lang = {lang: list_blog_slugs(d) for lang, d in LANG_DIRS.items()}
all_slugs = set()
for slugs in by_lang.values():
    all_slugs.update(slugs)

# Build XML
lines = []
lines.append('<?xml version="1.0" encoding="UTF-8"?>')
lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
lines.append('        xmlns:xhtml="http://www.w3.org/1999/xhtml">')
lines.append('')
lines.append('  <!-- Generated ' + TODAY + ' by generate-sitemap-blog-20260506.py -->')
lines.append('')

# Add blog index pages first
for lang, d in LANG_DIRS.items():
    if "index.html" in by_lang[lang]:
        loc = f"{BASE_URL}/{d}/" if lang != "en" else f"{BASE_URL}/blog/"
        lines.append('  <url>')
        lines.append(f'    <loc>{loc}</loc>')
        lines.append(f'    <lastmod>{TODAY}</lastmod>')
        lines.append('    <changefreq>weekly</changefreq>')
        lines.append('    <priority>0.8</priority>')
        # hreflang alternates
        for alt_lang, alt_dir in LANG_DIRS.items():
            if "index.html" in by_lang[alt_lang]:
                alt_loc = f"{BASE_URL}/{alt_dir}/" if alt_lang != "en" else f"{BASE_URL}/blog/"
                lines.append(f'    <xhtml:link rel="alternate" hreflang="{alt_lang}" href="{alt_loc}"/>')
        # x-default
        lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE_URL}/blog/"/>')
        lines.append('  </url>')

# Now individual blog posts
post_slugs = sorted(s for s in all_slugs if s != "index.html")
for slug in post_slugs:
    # Determine which langs have this post
    langs_with_post = [lang for lang in LANG_DIRS if slug in by_lang[lang]]
    if not langs_with_post: continue

    for lang in langs_with_post:
        d = LANG_DIRS[lang]
        loc = f"{BASE_URL}/{d}/{slug}"
        lines.append('  <url>')
        lines.append(f'    <loc>{loc}</loc>')
        lines.append(f'    <lastmod>{TODAY}</lastmod>')
        lines.append('    <changefreq>monthly</changefreq>')
        lines.append('    <priority>0.7</priority>')
        # hreflang alternates for sibling posts
        for alt_lang in langs_with_post:
            alt_d = LANG_DIRS[alt_lang]
            alt_loc = f"{BASE_URL}/{alt_d}/{slug}"
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{alt_lang}" href="{alt_loc}"/>')
        # x-default = EN
        if "en" in langs_with_post:
            lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE_URL}/blog/{slug}"/>')
        lines.append('  </url>')

lines.append('')
lines.append('</urlset>')

out_path = os.path.join(ROOT, "sitemap-blog.xml")
with open(out_path, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines) + "\n")

# Stats
total_urls = sum(len([s for s in by_lang[l] if s]) for l in LANG_DIRS)
print(f"Wrote {out_path}")
print(f"Stats:")
for lang, slugs in by_lang.items():
    print(f"  {lang}: {len(slugs)} HTML files (incl. index)")
print(f"  Total URLs in sitemap: {total_urls}")
print(f"\nNext: register sitemap-blog.xml in sitemap-index.xml and robots.txt")
