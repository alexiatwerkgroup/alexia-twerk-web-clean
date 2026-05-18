#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
remove-supabase-sdk.py - 2026-05-08
Removes the Supabase SDK <script> tag from all HTML files. Migration to
Cloudflare D1 made it obsolete — supabase-config.js now provides the
window.__twkSupabase shim. Loading the real SDK breaks CSP + races our shim.

DRY-RUN by default. --apply to write.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# Patterns to remove (any of these, with optional whitespace)
PATTERNS = [
    re.compile(r'\s*<script[^>]*src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@?\d*"[^>]*></script>\s*\n?', re.IGNORECASE),
    re.compile(r'\s*<script[^>]*src="https://unpkg\.com/@supabase/supabase-js@?\d*"[^>]*></script>\s*\n?', re.IGNORECASE),
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
    changed = 0
    total_removals = 0
    for p in files:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception:
            continue
        new_content = content
        file_removals = 0
        for pat in PATTERNS:
            matches = pat.findall(new_content)
            if matches:
                file_removals += len(matches)
                new_content = pat.sub('\n', new_content)
        if file_removals > 0:
            changed += 1
            total_removals += file_removals
            print(f"  [{file_removals}x] {p.relative_to(REPO).as_posix()}")
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  Files modified: {changed}  Tags removed: {total_removals}")
    if DRY_RUN:
        print("  Para aplicar: python remove-supabase-sdk.py --apply")

if __name__ == '__main__':
    main()
