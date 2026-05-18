#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-ga4-measurement-id.py - 2026-05-08
La property G-YSFR7FHCLS no esta en la cuenta de Google de Anti
(alexiatwerkoficial@gmail.com). Esta en otra cuenta perdida.
Migramos a G-L6TGHLVPV0 (property "Alexia Twerk Group" que SI esta
accesible) en TODOS los archivos del repo (~100+ HTMLs + scripts).

DRY-RUN por defecto. --apply para escribir.

Uso:
    python fix-ga4-measurement-id.py
    python fix-ga4-measurement-id.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD_ID = 'G-YSFR7FHCLS'
NEW_ID = 'G-L6TGHLVPV0'

# Extensions a tocar (todos los archivos texto del repo)
EXTS = {'.html', '.js', '.py', '.md', '.json', '.txt', '.sql', '.toml', '.css'}


def main():
    print("=" * 72)
    print(f"  FIX GA4 MEASUREMENT ID  {'(DRY RUN)' if DRY_RUN else '(APPLYING)'}")
    print(f"  {OLD_ID}  →  {NEW_ID}")
    print(f"  Razon: G-YSFR7FHCLS esta en otra cuenta de Google,")
    print(f"  G-L6TGHLVPV0 esta en alexiatwerkoficial@gmail.com (Alexia Twerk Group).")
    print("=" * 72)

    files = []
    for p in REPO.rglob('*'):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue
        # Skip _deleted/, node_modules/, .git/
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '.git']):
            continue
        files.append(p)

    print(f"\n  Files a chequear: {len(files)}")

    files_changed = 0
    total_replacements = 0
    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        if OLD_ID not in content:
            continue
        count = content.count(OLD_ID)
        new_content = content.replace(OLD_ID, NEW_ID)
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
        print("\n  Para aplicar:  python fix-ga4-measurement-id.py --apply")
    else:
        print("\n  DONE.")
        print("\n  PROXIMOS PASOS:")
        print("    1. git add -A && git commit && git push")
        print("    2. Esperar ~2 min al deploy de Cloudflare")
        print("    3. Hard refresh alexiatwerkgroup.com")
        print("    4. Tu sitio ya envia data a G-L6TGHLVPV0 (Alexia Twerk Group)")
        print("    5. En GA4, vuelve a la property 'Alexia Twerk Group':")
        print("       Admin -> Data Streams -> stream -> Configure tag settings")
        print("       -> Show all -> Define internal traffic -> Create")
        print("       Name: My Internal Traffic / IP equals: 181.21.19.236")
        print("    6. Admin -> Data filters -> Internal Traffic -> Testing -> Save")
        print("    7. Verifica en Realtime, despues cambia a Active")


if __name__ == '__main__':
    main()
