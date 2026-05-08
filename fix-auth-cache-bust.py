#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-auth-cache-bust.py - 2026-05-08
Bumpea el cache buster de twerkhub-auth.js para que el browser baje la
version con el override que evita el modal Supabase roto.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD_PATTERN = r'twerkhub-auth\.js\?v=[\w\-]+'
NEW_VALUE = 'twerkhub-auth.js?v=20260508-supadown-hotfix'


def main():
    print(f"  BUMP twerkhub-auth.js cache buster  {'(DRY RUN)' if DRY_RUN else '(APPLYING)'}")
    htmls = [p for p in REPO.rglob('*.html') if '_deleted' not in p.parts and 'node_modules' not in p.parts]
    changed = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception:
            continue
        if not re.search(OLD_PATTERN, content):
            continue
        new_content = re.sub(OLD_PATTERN, NEW_VALUE, content)
        if new_content != content:
            changed += 1
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')
    print(f"  Files changed: {changed}")
    if DRY_RUN:
        print("  Para aplicar: python fix-auth-cache-bust.py --apply")


if __name__ == '__main__':
    main()
