#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-telegram-url.py - 2026-05-08
Patch: la URL de Telegram inyectada en TODAS las HTMLs estaba MAL.
Real: t.me/Alexia_Twerk_Group (matchea el username real)
Mal:  t.me/Alexia_twerk

Reemplaza globalmente. DRY-RUN por defecto. --apply para escribir.

Uso:
    python fix-telegram-url.py
    python fix-telegram-url.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD_URL = 'https://t.me/Alexia_twerk'
NEW_URL = 'https://t.me/Alexia_Twerk_Group'


def main():
    print("=" * 72)
    print("  FIX TELEGRAM URL  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print(f"  {OLD_URL}  →  {NEW_URL}")
    print("=" * 72)

    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts or 'node_modules' in p.parts:
            continue
        htmls.append(p)

    files_changed = 0
    total_replacements = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERR leyendo {p.name}: {e}")
            continue

        if OLD_URL not in content:
            continue

        count = content.count(OLD_URL)
        new_content = content.replace(OLD_URL, NEW_URL)
        files_changed += 1
        total_replacements += count

        if not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  Files con cambios:    {files_changed}")
    print(f"  Total replacements:   {total_replacements}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python fix-telegram-url.py --apply")
    else:
        print(f"\n  DONE. Recordá:")
        print(f"    git add -A")
        print(f"    git commit -m \"fix(telegram): correct CTA URL to canonical username @Alexia_Twerk_Group\"")
        print(f"    git push")


if __name__ == '__main__':
    main()
