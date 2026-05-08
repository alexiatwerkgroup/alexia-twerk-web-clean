#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bump-twerkhub-auth-cache.py - 2026-05-08
Bump cache buster of twerkhub-auth.js after removing /tt redirect override.
OLD: twerkhub-auth.js?v=20260426-p8
NEW: twerkhub-auth.js?v=20260508-d1-p1
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv
OLD = 'twerkhub-auth.js?v=20260426-p8'
NEW = 'twerkhub-auth.js?v=20260508-d1-p1'

def main():
    print(f"  {OLD} -> {NEW}  {'(DRY RUN)' if DRY_RUN else '(APPLY)'}")
    files = []
    for p in REPO.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in {'.html', '.htm'}:
            continue
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '.git']):
            continue
        files.append(p)
    changed = 0
    total = 0
    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception:
            continue
        if OLD not in content:
            continue
        count = content.count(OLD)
        new_content = content.replace(OLD, NEW)
        changed += 1
        total += count
        print(f"  [{count}x] {p.relative_to(REPO).as_posix()}")
        if not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')
    print(f"\n  Files: {changed} | Replacements: {total}")
    if DRY_RUN:
        print("  Para aplicar: python bump-twerkhub-auth-cache.py --apply")

if __name__ == '__main__':
    main()
