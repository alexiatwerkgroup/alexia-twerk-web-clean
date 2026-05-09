#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""bump-d1-cache-v2.py - 2026-05-08
Bump cache busters for supabase-config.js + twerkhub-auth.js after the
post-signup redirect / session-race fixes."""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

REPLACEMENTS = [
    ('supabase-config.js?v=20260508-d1-p1', 'supabase-config.js?v=20260508-d1-p6'),
    ('supabase-config.js?v=20260508-d1-p2', 'supabase-config.js?v=20260508-d1-p6'),
    ('supabase-config.js?v=20260508-d1-p3', 'supabase-config.js?v=20260508-d1-p6'),
    ('supabase-config.js?v=20260508-d1-p4', 'supabase-config.js?v=20260508-d1-p6'),
    ('supabase-config.js?v=20260508-d1-p5', 'supabase-config.js?v=20260508-d1-p6'),
    ('twerkhub-auth.js?v=20260426-p8',      'twerkhub-auth.js?v=20260508-d1-p6'),
    ('twerkhub-auth.js?v=20260508-d1-p1',   'twerkhub-auth.js?v=20260508-d1-p6'),
    ('twerkhub-auth.js?v=20260508-d1-p2',   'twerkhub-auth.js?v=20260508-d1-p6'),
    ('twerkhub-auth.js?v=20260508-d1-p3',   'twerkhub-auth.js?v=20260508-d1-p6'),
    ('twerkhub-auth.js?v=20260508-d1-p4',   'twerkhub-auth.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260426-p6',       'profile-page.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260508-d1-p1',    'profile-page.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260508-d1-p2',    'profile-page.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260508-d1-p3',    'profile-page.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260508-d1-p4',    'profile-page.js?v=20260508-d1-p6'),
    ('profile-page.js?v=20260508-d1-p5',    'profile-page.js?v=20260508-d1-p6'),
    ('enter-now-widget.js?v=20260417-02',   'enter-now-widget.js?v=20260508-d1-p1'),
]

def main():
    files = []
    for p in REPO.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in {'.html', '.htm'}:
            continue
        if any(seg in p.parts for seg in ['_deleted', 'node_modules', '.git']):
            continue
        files.append(p)
    print(f"  HTMLs: {len(files)}  {'(DRY RUN)' if DRY_RUN else '(APPLY)'}")
    total_files = 0
    total_replacements = 0
    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception:
            continue
        new_content = content
        file_replaced = False
        for old, new in REPLACEMENTS:
            if old in new_content:
                count = new_content.count(old)
                new_content = new_content.replace(old, new)
                total_replacements += count
                file_replaced = True
        if file_replaced:
            total_files += 1
            print(f"  {p.relative_to(REPO).as_posix()}")
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')
    print(f"\n  Files changed: {total_files}  Total replacements: {total_replacements}")
    if DRY_RUN:
        print("  Para aplicar: python bump-d1-cache-v2.py --apply")

if __name__ == '__main__':
    main()
