#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-redirect-placeholders.py - 2026-05-08
Hay 5 folders con index.html que muestran "Redirecting to..." como TEXTO
en vez de hacer un redirect HTTP real. Google los ve como soft-404 / thin
content y NO los indexa. Solucion:
  1. Mover folders a _deleted/<folder>-redirect-placeholder/
  2. Agregar/asegurar redirects 301 en vercel.json
  3. Limpiar sitemaps si tuvieran esas URLs

DRY-RUN por defecto. --apply para escribir.
"""
import json
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).parent
VERCEL = REPO / 'vercel.json'
SITEMAP = REPO / 'sitemap.xml'
SITEMAP_VIDEOS = REPO / 'sitemap-videos.xml'
DRY_RUN = '--apply' not in sys.argv

# (folder_name, redirect_destination)
PLACEHOLDERS = [
    ('top-100-twerk-videos',           '/top-100-twerk-videos.html'),
    ('best-twerk-dancers',             '/best-twerk-dancers.html'),
    ('playlist-try-on-hot-leaks',      '/try-on-hot-leaks/'),
    ('playlist-korean-girls-kpop-twerk', '/korean-girls-kpop-twerk/'),
    ('playlist-hottest-cosplay-fancam',  '/hottest-cosplay-fancam/'),
]


def update_vercel(vercel_data, folder, dest):
    """Asegura que existan los redirects para /folder, /folder/ y /folder/(.*)"""
    redirects = vercel_data.setdefault('redirects', [])
    existing_sources = {r.get('source') for r in redirects}

    sources_to_add = [
        (f'/{folder}',           dest),
        (f'/{folder}/',          dest),
        (f'/{folder}/(.*)',      dest),
    ]
    added = 0
    for src, dst in sources_to_add:
        if src not in existing_sources:
            redirects.append({'source': src, 'destination': dst, 'permanent': True})
            existing_sources.add(src)
            added += 1
    return added


def clean_sitemap(path, folder):
    if not path.exists():
        return 0
    content = path.read_text(encoding='utf-8')
    before = len(re.findall(r'<url>', content))
    pattern = r'<url>(?:(?!</url>).)*?/' + re.escape(folder) + r'/(?:(?!</url>).)*?</url>\s*'
    new_content = re.sub(pattern, '', content, flags=re.DOTALL)
    after = len(re.findall(r'<url>', new_content))
    removed = before - after
    if removed > 0 and not DRY_RUN:
        path.write_text(new_content, encoding='utf-8', newline='\n')
    return removed


def main():
    print("=" * 72)
    print("  FIX REDIRECT PLACEHOLDERS  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    # Cargar vercel.json
    if not VERCEL.exists():
        print(f"ERROR: {VERCEL} no existe.")
        sys.exit(1)
    with open(VERCEL, 'r', encoding='utf-8') as f:
        vercel_data = json.load(f)

    total_redirects_added = 0
    total_files_moved = 0
    total_sitemap_removed = 0

    for folder, dest in PLACEHOLDERS:
        folder_path = REPO / folder
        print(f"\n  ── /{folder}/  →  {dest} ──")

        # 1) Mover folder a _deleted/
        if folder_path.is_dir():
            files_count = sum(1 for _ in folder_path.iterdir() if _.is_file())
            if not DRY_RUN:
                backup = REPO / '_deleted' / f'{folder}-redirect-placeholder'
                backup.parent.mkdir(parents=True, exist_ok=True)
                if backup.exists():
                    shutil.rmtree(backup)
                shutil.move(str(folder_path), str(backup))
                print(f"    [OK] folder movido a {backup.relative_to(REPO)} ({files_count} files)")
            else:
                print(f"    (dry-run: folder con {files_count} files NO movido)")
            total_files_moved += files_count
        else:
            print(f"    [skip] folder no existe")

        # 2) Asegurar redirects en vercel.json
        added = update_vercel(vercel_data, folder, dest)
        if added > 0:
            print(f"    Redirects nuevos en vercel.json: {added}")
            total_redirects_added += added
        else:
            print(f"    Redirects ya estaban presentes")

        # 3) Limpiar sitemaps
        for smap in [SITEMAP, SITEMAP_VIDEOS]:
            removed = clean_sitemap(smap, folder)
            if removed > 0:
                print(f"    {smap.name}: removidas {removed} URLs")
                total_sitemap_removed += removed

    # Guardar vercel.json
    if not DRY_RUN and total_redirects_added > 0:
        with open(VERCEL, 'w', encoding='utf-8') as f:
            json.dump(vercel_data, f, indent=2, ensure_ascii=False)
        print(f"\n  vercel.json guardado")

    print(f"\n{'=' * 72}")
    print(f"  Folders movidos:       {len(PLACEHOLDERS) if not DRY_RUN else 'pendiente'}")
    print(f"  Files movidos:         {total_files_moved}")
    print(f"  Redirects agregados:   {total_redirects_added}")
    print(f"  Sitemap URLs removidas: {total_sitemap_removed}")
    print(f"{'=' * 72}")

    if DRY_RUN:
        print("\n  Para aplicar:  python fix-redirect-placeholders.py --apply")
    else:
        print("\n  DONE.")


if __name__ == '__main__':
    main()
