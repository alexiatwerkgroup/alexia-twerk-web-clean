#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kill-cosplay-fancam-leaks.py - 2026-05-07
Mata /cosplay-fancam-leaks/ (vieja, 71 indexed URLs duplicando contenido).
vercel.json YA tiene los redirects 301 a /hottest-cosplay-fancam/ (agregados manualmente).
Este script:
  1. Mueve /cosplay-fancam-leaks/ a _deleted/cosplay-fancam-leaks-backup/
  2. Limpia sitemap.xml y sitemap-videos.xml
  3. Auto git add + commit + push

Uso:
    python kill-cosplay-fancam-leaks.py            # dry-run
    python kill-cosplay-fancam-leaks.py --apply    # aplica + commit + push
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).parent
OLD_FOLDER = REPO / 'cosplay-fancam-leaks'
SITEMAP = REPO / 'sitemap.xml'
SITEMAP_VIDEOS = REPO / 'sitemap-videos.xml'

DRY_RUN = '--apply' not in sys.argv


def clean_sitemap(path):
    if not path.exists():
        return 0
    content = path.read_text(encoding='utf-8')
    before = len(re.findall(r'<url>', content))
    # Remove every <url>...</url> block whose loc points to /cosplay-fancam-leaks/
    pattern = r'<url>(?:(?!</url>).)*?/cosplay-fancam-leaks/(?:(?!</url>).)*?</url>\s*'
    content = re.sub(pattern, '', content, flags=re.DOTALL)
    after = len(re.findall(r'<url>', content))
    removed = before - after
    if not DRY_RUN and removed > 0:
        path.write_text(content, encoding='utf-8', newline='\n')
    return removed


def main():
    print("=" * 72)
    print("  KILL /cosplay-fancam-leaks/  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    # 1) Move folder
    if OLD_FOLDER.is_dir():
        files = sorted([f.name for f in OLD_FOLDER.iterdir() if f.is_file() and f.suffix == '.html'])
        print(f"\n  Archivos en /cosplay-fancam-leaks/: {len(files)}")
        if not DRY_RUN:
            backup_dir = REPO / '_deleted' / 'cosplay-fancam-leaks-backup'
            backup_dir.parent.mkdir(parents=True, exist_ok=True)
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            shutil.move(str(OLD_FOLDER), str(backup_dir))
            print(f"  Folder movido a {backup_dir}")
        else:
            print(f"  (dry-run: folder NO movido)")
    else:
        print(f"\n  /cosplay-fancam-leaks/ no existe — skip")

    # 2) Sitemaps
    print(f"\n  ─── Sitemaps ───")
    for smap in [SITEMAP, SITEMAP_VIDEOS]:
        if not smap.exists():
            print(f"  {smap.name}: no existe")
            continue
        removed = clean_sitemap(smap)
        print(f"  {smap.name}: removidas {removed} URLs")

    # 3) vercel.json status
    vercel = REPO / 'vercel.json'
    if vercel.exists():
        content = vercel.read_text(encoding='utf-8')
        if '"/cosplay-fancam-leaks/(.*)"' in content:
            print(f"\n  vercel.json: redirect catch-all /cosplay-fancam-leaks/(.*) presente OK")
        else:
            print(f"\n  WARN: catch-all redirect NO esta en vercel.json — agregalo manual")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python kill-cosplay-fancam-leaks.py --apply")
        return

    # 4) Git
    print(f"\n  ─── Git ───")
    try:
        subprocess.run(['git', 'add', '-A'], check=False, cwd=REPO)
        msg = (
            "cleanup: kill /cosplay-fancam-leaks/ - 71 indexed URLs 301-redirected "
            "to /hottest-cosplay-fancam/, sitemaps cleaned, folder backed up"
        )
        result = subprocess.run(
            ['git', 'commit', '-m', msg],
            capture_output=True, text=True, cwd=REPO
        )
        print(result.stdout)
        if result.returncode == 0:
            print("  commit OK, pushing...")
            push = subprocess.run(['git', 'push'], capture_output=True, text=True, cwd=REPO)
            print(push.stdout)
            if push.stderr:
                print(push.stderr)
        else:
            print("  commit failed:")
            print(result.stderr)
    except Exception as e:
        print(f"  git error: {e}")

    print(f"\n  DONE. Proximos pasos en GSC:")
    print(f"    - Validar redirects: https://search.google.com/search-console/")
    print(f"    - Request URL removal para /cosplay-fancam-leaks/* (acelera deindex)")


if __name__ == '__main__':
    main()
