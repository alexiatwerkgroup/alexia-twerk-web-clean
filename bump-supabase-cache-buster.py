#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bump-supabase-cache-buster.py - 2026-05-08
Actualiza el cache buster de supabase-config.js de la version vieja (STUB)
a la nueva (D1 migration). Sin esto los browsers siguen cargando la version
vieja del archivo aunque el codigo nuevo este deployado.

OLD: supabase-config.js?v=20260505-p9
NEW: supabase-config.js?v=20260508-d1-p1

DRY-RUN por defecto. --apply para escribir.

Uso:
    python bump-supabase-cache-buster.py
    python bump-supabase-cache-buster.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD = 'supabase-config.js?v=20260505-p9'
NEW = 'supabase-config.js?v=20260508-d1-p1'

EXTS = {'.html', '.htm'}


def main():
    print("=" * 72)
    print(f"  BUMP SUPABASE-CONFIG CACHE BUSTER  {'(DRY RUN)' if DRY_RUN else '(APPLYING)'}")
    print(f"  {OLD}")
    print(f"  -> {NEW}")
    print("=" * 72)

    files = []
    for p in REPO.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in EXTS:
            continue
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '.git']):
            continue
        files.append(p)

    print(f"\n  HTMLs a chequear: {len(files)}")

    files_changed = 0
    total_replacements = 0
    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        if OLD not in content:
            continue
        count = content.count(OLD)
        new_content = content.replace(OLD, NEW)
        files_changed += 1
        total_replacements += count
        rel = p.relative_to(REPO).as_posix()
        print(f"  [{count}x] {rel}")
        if not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n{'=' * 72}")
    print(f"  Files con cambios:    {files_changed}")
    print(f"  Total replacements:   {total_replacements}")
    print(f"{'=' * 72}")

    if DRY_RUN:
        print("\n  Para aplicar:  python bump-supabase-cache-buster.py --apply")
    else:
        print("\n  DONE.")
        print("\n  PROXIMOS PASOS:")
        print("    1. git add -A && git commit && git push")
        print("    2. Esperar ~2 min al deploy")
        print("    3. Hard refresh alexiatwerkgroup.com (Ctrl+Shift+R)")
        print("    4. Browser ahora carga supabase-config.js?v=20260508-d1-p1")
        print("    5. En consola deberias ver: [twk-supabase] Cloudflare D1 mode v1")


if __name__ == '__main__':
    main()
