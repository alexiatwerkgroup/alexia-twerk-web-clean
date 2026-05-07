#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit-duplicates.py - 2026-05-07
Verifica las claims de ChatGPT con datos REALES de tu repo:
  1. Mismo slug/video en multiples folders (cross-folder duplicates)
  2. Titulos HTML duplicados
  3. Paginas casi gemelas (slug similar entre folders)

Output: reporte en consola + audit-duplicates-report.txt
"""

import os
import re
from collections import defaultdict, Counter
from pathlib import Path
from difflib import SequenceMatcher

CONTENT_FOLDERS = [
    'playlist',
    'twerk-hub-leaks',
    'cosplay-fancam-leaks',
    'korean-girls-kpop-twerk',
    'try-on-hot-leaks',
    'ttl-latin-models',
    'latina-model-leaks',
    'hottest-cosplay-fancam',
]

REPO = Path(__file__).parent

OUT = []
def out(s=""):
    print(s)
    OUT.append(s)

def normalize_slug(filename):
    """Normalize slug for comparison: lowercase, remove .html, dashes,
    diacritics-ish, and truncate if needed."""
    s = filename.replace('.html', '').lower()
    # Replace common diacritics
    rep = {'ö':'o','ä':'a','ü':'u','ñ':'n','é':'e','è':'e','á':'a','í':'i','ó':'o','ú':'u'}
    for k, v in rep.items():
        s = s.replace(k, v)
    # Remove all non-alphanumeric
    s = re.sub(r'[^a-z0-9]+', '', s)
    return s

def extract_title(html_path):
    """Extract <title>...</title> from HTML file."""
    try:
        with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(8192)  # first 8KB enough for <head>
        m = re.search(r'<title[^>]*>(.*?)</title>', content, re.DOTALL | re.IGNORECASE)
        if m:
            return m.group(1).strip()
    except Exception:
        pass
    return None

def main():
    out("=" * 75)
    out("  AUDIT DE DUPLICADOS - cross-folder + titulos + slugs similares")
    out("=" * 75)
    out()

    # 1) Recolectar archivos por folder
    files_by_folder = {}
    for folder in CONTENT_FOLDERS:
        path = REPO / folder
        if not path.is_dir():
            files_by_folder[folder] = []
            continue
        files = [f.name for f in path.iterdir() if f.is_file() and f.suffix == '.html' and f.name != 'index.html']
        files_by_folder[folder] = files

    out("📊 ARCHIVOS POR FOLDER:")
    for folder, files in files_by_folder.items():
        out(f"  /{folder:<30}  {len(files):>4} archivos .html")
    total = sum(len(f) for f in files_by_folder.values())
    out(f"  {'TOTAL':<31}  {total:>4} archivos .html")
    out()

    # 2) Cross-folder slug duplicates (normalized)
    out("=" * 75)
    out("  PROBLEMA #1 — Mismo slug normalizado en multiples folders")
    out("=" * 75)
    out()

    slug_locations = defaultdict(list)  # slug -> [(folder, filename), ...]
    for folder, files in files_by_folder.items():
        for f in files:
            slug = normalize_slug(f)
            if len(slug) < 5:
                continue
            slug_locations[slug].append((folder, f))

    cross_dupes = {s: locs for s, locs in slug_locations.items() if len(set(loc[0] for loc in locs)) > 1}
    out(f"Slugs presentes en MAS DE UN folder: {len(cross_dupes)}")
    out()
    if cross_dupes:
        out("Top 30 ejemplos:")
        for slug, locs in list(cross_dupes.items())[:30]:
            out(f"  '{slug[:55]}'")
            for folder, fn in locs:
                out(f"    /{folder}/{fn}")
            out()

    # 3) Near-duplicate slugs (fuzzy match between folders)
    out("=" * 75)
    out("  PROBLEMA #3 — Slugs MUY similares (fuzzy match >= 0.85)")
    out("=" * 75)
    out()
    near_dupes = []
    folders_list = list(files_by_folder.keys())
    for i, fa in enumerate(folders_list):
        for fb in folders_list[i+1:]:
            slugs_a = [(normalize_slug(f), f) for f in files_by_folder[fa]]
            slugs_b = [(normalize_slug(f), f) for f in files_by_folder[fb]]
            for sa, fna in slugs_a:
                for sb, fnb in slugs_b:
                    if sa == sb:
                        continue  # exact match handled above
                    if abs(len(sa) - len(sb)) > 30:
                        continue
                    ratio = SequenceMatcher(None, sa, sb).ratio()
                    if ratio >= 0.85:
                        near_dupes.append((ratio, fa, fna, fb, fnb))
    near_dupes.sort(reverse=True)
    out(f"Pares de slugs casi-gemelos entre folders: {len(near_dupes)}")
    out()
    if near_dupes:
        out("Top 20 (ratio similitud):")
        for ratio, fa, fna, fb, fnb in near_dupes[:20]:
            out(f"  {ratio:.2f}  /{fa}/{fna}")
            out(f"        /{fb}/{fnb}")
            out()

    # 4) Title duplicates
    out("=" * 75)
    out("  PROBLEMA #2 — Titulos HTML duplicados")
    out("=" * 75)
    out()
    titles = defaultdict(list)
    total_with_title = 0
    for folder, files in files_by_folder.items():
        for f in files:
            path = REPO / folder / f
            t = extract_title(path)
            if t:
                total_with_title += 1
                titles[t].append((folder, f))
    dup_titles = {t: locs for t, locs in titles.items() if len(locs) > 1}
    out(f"Total archivos con <title>: {total_with_title}")
    out(f"Titulos UNICOS: {len(titles)}")
    out(f"Titulos DUPLICADOS (presentes en 2+ archivos): {len(dup_titles)}")
    out(f"Total archivos con titulo duplicado: {sum(len(v) for v in dup_titles.values())}")
    out()
    if dup_titles:
        out("Top 15 titulos mas duplicados:")
        sorted_dupes = sorted(dup_titles.items(), key=lambda x: -len(x[1]))
        for title, locs in sorted_dupes[:15]:
            out(f"  '{title[:90]}' x{len(locs)}")
            for folder, fn in locs[:3]:
                out(f"    /{folder}/{fn}")
            if len(locs) > 3:
                out(f"    ... y {len(locs) - 3} mas")
            out()

    # Final summary
    out("=" * 75)
    out("  RESUMEN")
    out("=" * 75)
    out()
    out(f"  Total archivos analizados:           {total}")
    out(f"  Slugs duplicados cross-folder:        {len(cross_dupes)}")
    out(f"  Slugs casi-gemelos (>=0.85):          {len(near_dupes)}")
    out(f"  Titulos duplicados:                   {len(dup_titles)}")
    out(f"  Archivos con titulo duplicado:        {sum(len(v) for v in dup_titles.values())}")
    out()

    # Save report
    report_path = REPO / 'audit-duplicates-report.txt'
    report_path.write_text('\n'.join(OUT), encoding='utf-8')
    print(f"\n📄 Reporte completo guardado en: {report_path}")

if __name__ == '__main__':
    main()
