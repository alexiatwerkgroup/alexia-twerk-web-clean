#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-ga4-dual-tagging.py - 2026-05-08
DUAL TAGGING: agrega G-L6TGHLVPV0 (Alexia Twerk Group, accesible) AL LADO de
G-YSFR7FHCLS (cuenta perdida) sin tocar el original.

Por que: G-YSFR7FHCLS tiene toda la data historica pero esta en una cuenta de
Google que Anti no controla. Si la reemplazamos, la data nueva si se ve en GA4,
pero la data historica queda inaccesible para siempre.

Con dual tagging:
  - La data NUEVA se manda a las 2 properties al mismo tiempo
  - La data HISTORICA en G-YSFR7FHCLS sigue intacta donde esta
  - Si en algun momento conseguimos acceso a G-YSFR7FHCLS, no perdimos nada
  - G-L6TGHLVPV0 (que SI controlamos) empieza a acumular data desde ahora

DRY-RUN por defecto. --apply para escribir.

Uso:
    python add-ga4-dual-tagging.py
    python add-ga4-dual-tagging.py --apply
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD_ID = 'G-YSFR7FHCLS'
NEW_ID = 'G-L6TGHLVPV0'

# Solo HTMLs (donde estan los gtag configs)
EXTS = {'.html'}

# Pattern: gtag("config","G-YSFR7FHCLS", ...) o gtag('config','G-YSFR7FHCLS', ...)
# Captura: prefijo + ID + (opcional ", {options}") + ")"
GTAG_PATTERN = re.compile(
    r'gtag\s*\(\s*["\']config["\']\s*,\s*["\']' + re.escape(OLD_ID) + r'["\']\s*(,\s*[^)]*)?\)\s*;?',
    re.IGNORECASE
)

# Marker: si el archivo ya tiene G-L6TGHLVPV0, no lo agregamos otra vez
DUAL_MARKER = 'G-L6TGHLVPV0'


def main():
    print("=" * 72)
    print(f"  GA4 DUAL TAGGING  {'(DRY RUN)' if DRY_RUN else '(APPLYING)'}")
    print(f"  Mantener: {OLD_ID} (data historica, cuenta perdida)")
    print(f"  Agregar:  {NEW_ID} (Alexia Twerk Group, accesible)")
    print("=" * 72)

    files = []
    for p in REPO.rglob('*'):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '.git']):
            continue
        files.append(p)

    print(f"\n  HTMLs a chequear: {len(files)}")

    files_changed = 0
    total_added = 0
    files_already_dual = 0
    files_no_gtag = 0

    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue

        # Skip si no tiene el ID viejo
        matches = list(GTAG_PATTERN.finditer(content))
        if not matches:
            files_no_gtag += 1
            continue

        # Skip si ya tiene dual tagging
        if DUAL_MARKER in content:
            files_already_dual += 1
            continue

        # Reemplazar cada match: original + nuevo gtag al lado
        # Construimos un nuevo content procesando matches de atras hacia adelante
        # para no romper offsets
        new_content = content
        added_this_file = 0
        for m in reversed(matches):
            original = m.group(0)
            options_part = m.group(1) or ''  # ej: ", {traffic_type:'internal'}"
            # El nuevo gtag usa las MISMAS options que el original (mismo internal traffic detection)
            new_gtag = f'gtag("config","{NEW_ID}"{options_part});'
            replacement = original.rstrip(';') + ';' + new_gtag
            new_content = new_content[:m.start()] + replacement + new_content[m.end():]
            added_this_file += 1

        files_changed += 1
        total_added += added_this_file
        rel = p.relative_to(REPO).as_posix()
        print(f"  [+{added_this_file}] {rel}")

        if not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n{'=' * 72}")
    print(f"  Files modificados:        {files_changed}")
    print(f"  Total dual tags agregados: {total_added}")
    print(f"  Files ya con dual tag:     {files_already_dual}")
    print(f"  Files sin gtag:            {files_no_gtag}")
    print(f"{'=' * 72}")

    if DRY_RUN:
        print("\n  Para aplicar:  python add-ga4-dual-tagging.py --apply")
    else:
        print("\n  DONE.")
        print("\n  PROXIMOS PASOS:")
        print("    1. git add -A && git commit && git push")
        print("    2. Esperar ~2 min al deploy")
        print("    3. Visitar alexiatwerkgroup.com")
        print("    4. En GA4 (property 'Alexia Twerk Group'), Realtime ya muestra tu visita")
        print("    5. Hacer Internal Traffic rule (IP 181.21.19.236) en property Alexia Twerk Group")
        print("\n  RESULTADO:")
        print(f"    - Data historica {OLD_ID}: intacta (la dueño de esa cuenta sigue recibiendo)")
        print(f"    - Data nueva: se manda a las 2 properties simultaneamente")
        print(f"    - Vos ya ves todo en {NEW_ID} (Alexia Twerk Group)")


if __name__ == '__main__':
    main()
