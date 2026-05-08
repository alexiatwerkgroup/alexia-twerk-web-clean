#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bump-css-cache.py - 2026-05-07
Bumpea el cache-buster del bundle.css y ph-theme.css en TODAS las HTMLs del repo.
Sin esto, las paginas viejas siguen sirviendo el CSS cacheado con las lineas
rosas. Con esto, todos los visitantes fuerzan re-download del CSS nuevo.

DRY-RUN por defecto. --apply para escribir.

Uso:
    python bump-css-cache.py
    python bump-css-cache.py --apply
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# Patrones a reemplazar (regex porque pueden tener cualquier ?v=... viejo)
PATTERNS = [
    (
        r'twerkhub-bundle\.css\?v=[\w\-]+',
        'twerkhub-bundle.css?v=20260507-b5-no-pink-lines',
    ),
    (
        r'twerkhub-ph-theme\.css\?v=[\w\-]+',
        'twerkhub-ph-theme.css?v=20260507-p30-no-pink-lines',
    ),
    (
        r'twerkhub-page\.css\?v=[\w\-]+',
        'twerkhub-page.css?v=20260507-pg5-no-pink-lines',
    ),
    (
        r'twerkhub-premium\.css\?v=[\w\-]+',
        'twerkhub-premium.css?v=20260507-pr3-no-pink-lines',
    ),
]


def main():
    print("=" * 72)
    print("  BUMP CSS CACHE BUSTERS  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts:
            continue
        if 'node_modules' in p.parts:
            continue
        htmls.append(p)

    print(f"\n  HTMLs a chequear: {len(htmls)}")

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
        for old_re, new_str in PATTERNS:
            matches = re.findall(old_re, new_content)
            if matches:
                # Solo cuenta los que realmente cambian
                already = sum(1 for m in matches if m == new_str)
                will_change = len(matches) - already
                if will_change > 0:
                    new_content = re.sub(old_re, new_str, new_content)
                    local_count += will_change

        if local_count > 0:
            files_changed += 1
            total_replacements += local_count
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  Files con cambios:   {files_changed}")
    print(f"  Total replacements:  {total_replacements}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python bump-css-cache.py --apply")
    else:
        print(f"\n  DONE. Con esto, todos los visitantes refresh-an el CSS al proximo load.")


if __name__ == '__main__':
    main()
