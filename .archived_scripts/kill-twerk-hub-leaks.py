#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kill-twerk-hub-leaks.py - 2026-05-07
Elimina la carpeta /twerk-hub-leaks/ (vieja, duplica /playlist/) en 4 pasos:

  1. Mapea cada /twerk-hub-leaks/X.html al canonical en /playlist/Y.html
     (fuzzy match >= 0.80, fallback a /playlist/ root)
  2. Agrega redirects 301 al vercel.json
  3. Borra los .html de /twerk-hub-leaks/
  4. Limpia las URLs del sitemap.xml + sitemap-videos.xml

DRY-RUN por defecto. Usa --apply para aplicar los cambios.

Uso:
    python kill-twerk-hub-leaks.py            # dry-run
    python kill-twerk-hub-leaks.py --apply    # aplica + lo deja listo para git push
"""
import json
import re
import shutil
import sys
from difflib import SequenceMatcher
from pathlib import Path

REPO = Path(__file__).parent
OLD_FOLDER = REPO / 'twerk-hub-leaks'
TARGET_FOLDER = REPO / 'playlist'
VERCEL_JSON = REPO / 'vercel.json'
SITEMAP = REPO / 'sitemap.xml'
SITEMAP_VIDEOS = REPO / 'sitemap-videos.xml'
SITEMAP_INDEX = REPO / 'sitemap-index.xml'

DRY_RUN = '--apply' not in sys.argv


def normalize(slug):
    s = slug.replace('.html', '').lower()
    rep = {'ö':'o','ä':'a','ü':'u','ñ':'n','é':'e','è':'e','á':'a','í':'i','ó':'o','ú':'u'}
    for k, v in rep.items():
        s = s.replace(k, v)
    return re.sub(r'[^a-z0-9]+', '', s)


def best_match(old_slug, target_slugs):
    """Find best fuzzy match for old_slug in target_slugs. Returns (slug, ratio) or (None, 0)."""
    norm_old = normalize(old_slug)
    if len(norm_old) < 4:
        return None, 0
    best = (None, 0)
    for ts in target_slugs:
        norm_ts = normalize(ts)
        # Quick filter: skip if length differs too much
        if abs(len(norm_old) - len(norm_ts)) > 25:
            continue
        # Old slugs are TRUNCATED, so check if old is a prefix of target
        if len(norm_old) < len(norm_ts) and norm_ts.startswith(norm_old):
            return ts, 1.0  # truncated prefix match, perfect
        ratio = SequenceMatcher(None, norm_old, norm_ts).ratio()
        if ratio > best[1]:
            best = (ts, ratio)
    return best


def main():
    print("=" * 72)
    print("  KILL /twerk-hub-leaks/  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)
    print()

    if not OLD_FOLDER.is_dir():
        print(f"ERROR: {OLD_FOLDER} no existe.")
        sys.exit(1)
    if not TARGET_FOLDER.is_dir():
        print(f"ERROR: {TARGET_FOLDER} no existe.")
        sys.exit(1)

    # 1) Enumerate files
    old_files = sorted([f.name for f in OLD_FOLDER.iterdir() if f.is_file() and f.suffix == '.html'])
    target_files = sorted([f.name for f in TARGET_FOLDER.iterdir() if f.is_file() and f.suffix == '.html' and f.name != 'index.html'])
    print(f"Files a procesar:  {len(old_files)} en /twerk-hub-leaks/")
    print(f"Target candidatos: {len(target_files)} en /playlist/")
    print()

    # 2) Build mapping
    print("─── Step 1: Mapeo old → canonical ───")
    mappings = []  # list of (old_path, dest_path, ratio)
    matched = 0
    fallback = 0
    for old in old_files:
        if old == 'index.html':
            mappings.append((f'/twerk-hub-leaks/', '/playlist/', 1.0, 'index'))
            continue
        match, ratio = best_match(old, target_files)
        if match and ratio >= 0.80:
            mappings.append((f'/twerk-hub-leaks/{old}', f'/playlist/{match}', ratio, 'mapped'))
            matched += 1
        else:
            mappings.append((f'/twerk-hub-leaks/{old}', '/playlist/', ratio, 'fallback'))
            fallback += 1

    print(f"  Mapeados a slug equivalente: {matched}")
    print(f"  Fallback a /playlist/ root:  {fallback}")
    print()

    # Show samples
    print("Muestra de mapeos:")
    for src, dst, ratio, kind in mappings[:8]:
        print(f"  [{kind}] {src}")
        print(f"           → {dst}  (ratio {ratio:.2f})")
    if len(mappings) > 8:
        print(f"  ... y {len(mappings)-8} más")
    print()

    # 3) Update vercel.json
    print("─── Step 2: Agregar redirects 301 al vercel.json ───")
    if not VERCEL_JSON.exists():
        print(f"  WARN: {VERCEL_JSON} no existe — saltando.")
    else:
        with open(VERCEL_JSON, 'r', encoding='utf-8') as f:
            vercel = json.load(f)
        existing_redirects = vercel.get('redirects', [])
        existing_sources = {r.get('source') for r in existing_redirects}
        new_redirects = []
        for src, dst, _, _ in mappings:
            if src in existing_sources:
                continue
            new_redirects.append({
                "source": src,
                "destination": dst,
                "permanent": True
            })
        # Also add a catch-all for anything else under /twerk-hub-leaks/
        catch_all = "/twerk-hub-leaks/(.*)"
        if catch_all not in existing_sources:
            new_redirects.append({
                "source": catch_all,
                "destination": "/playlist/",
                "permanent": True
            })
        print(f"  Redirects nuevos a agregar: {len(new_redirects)}")
        if not DRY_RUN:
            vercel.setdefault('redirects', []).extend(new_redirects)
            with open(VERCEL_JSON, 'w', encoding='utf-8') as f:
                json.dump(vercel, f, indent=2, ensure_ascii=False)
            print(f"  vercel.json actualizado")
        else:
            print(f"  (dry-run: no se guarda)")
    print()

    # 4) Delete files
    print("─── Step 3: Borrar archivos de /twerk-hub-leaks/ ───")
    print(f"  Archivos a borrar: {len(old_files)}")
    if not DRY_RUN:
        # Move folder to _deleted/ as safety
        backup_dir = REPO / '_deleted' / 'twerk-hub-leaks-backup'
        backup_dir.parent.mkdir(parents=True, exist_ok=True)
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        shutil.move(str(OLD_FOLDER), str(backup_dir))
        print(f"  Folder movido a {backup_dir} (backup por si las moscas)")
    else:
        print(f"  (dry-run: no se borra)")
    print()

    # 5) Clean sitemaps
    print("─── Step 4: Limpiar sitemap.xml y sitemap-videos.xml ───")
    for smap in [SITEMAP, SITEMAP_VIDEOS]:
        if not smap.exists():
            print(f"  {smap.name}: no existe, saltando")
            continue
        content = smap.read_text(encoding='utf-8')
        # Remove any <url>...</url> block that contains /twerk-hub-leaks/
        before = len(re.findall(r'<url>', content))
        content_new = re.sub(
            r'<url>(?:(?!</url>).)*?/twerk-hub-leaks/(?:(?!</url>).)*?</url>\s*',
            '',
            content,
            flags=re.DOTALL
        )
        after = len(re.findall(r'<url>', content_new))
        removed = before - after
        print(f"  {smap.name}: {before} URLs → {after} URLs (removidas {removed})")
        if not DRY_RUN and removed > 0:
            smap.write_text(content_new, encoding='utf-8', newline='\n')
    print()

    # Done
    print("=" * 72)
    if DRY_RUN:
        print("  DRY RUN COMPLETO. Para aplicar:  python kill-twerk-hub-leaks.py --apply")
    else:
        print("  ✓ APLICADO. Próximos pasos:")
        print("    1. git diff --stat")
        print("    2. git add -A")
        print("    3. git commit -m 'cleanup: remove /twerk-hub-leaks/ (legacy duplicates of /playlist/)'")
        print("    4. git push")
        print("    5. En GSC, request URL removal para /twerk-hub-leaks/* (acelera deindex)")
    print("=" * 72)


if __name__ == '__main__':
    main()
