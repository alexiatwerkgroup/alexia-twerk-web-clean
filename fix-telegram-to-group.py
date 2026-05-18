#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-telegram-to-group.py - 2026-05-08
Cambia el link de Telegram en TODAS las HTMLs:
  De: https://t.me/Alexia_Twerk_Group  (username publico)
  A:  https://t.me/+q1cooFnvQctlNjRh   (invite link a grupo privado)

Razon: el grupo privado es mejor para conversion (sensacion VIP) y el user
puede controlar quien entra.

DRY-RUN por defecto. --apply para escribir.
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# Reemplazos a hacer (orden importa: primero la URL principal,
# despues cualquier referencia textual al username)
REPLACEMENTS = [
    ('https://t.me/Alexia_Twerk_Group', 'https://t.me/+q1cooFnvQctlNjRh'),
    # Tambien las referencias en texto visible a t.me/Alexia_Twerk_Group
    ('t.me/Alexia_Twerk_Group',         'private group invite'),
]


def main():
    print("=" * 72)
    print("  FIX TELEGRAM URL → INVITE LINK  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("  https://t.me/Alexia_Twerk_Group → https://t.me/+q1cooFnvQctlNjRh")
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

        new_content = content
        local_count = 0
        for old, new in REPLACEMENTS:
            if old in new_content:
                count = new_content.count(old)
                new_content = new_content.replace(old, new)
                local_count += count

        if local_count > 0:
            files_changed += 1
            total_replacements += local_count
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  Files con cambios:    {files_changed}")
    print(f"  Total replacements:   {total_replacements}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python fix-telegram-to-group.py --apply")
    else:
        print(f"\n  DONE.")


if __name__ == '__main__':
    main()
