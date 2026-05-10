# -*- coding: utf-8 -*-
"""
Bump cache version for tier-threshold sync (2026-05-06).
- twerkhub-tokens.js: any version -> 20260506-p11
- token-system.js:    any version -> 20260506-p3
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

NEW_TWERKHUB = "20260506-p11"
NEW_SYSTEM = "20260506-p3"

PAT_TWERKHUB = re.compile(r"(twerkhub-tokens\.js\?v=)([0-9A-Za-z\-]+)")
PAT_SYSTEM   = re.compile(r"(token-system\.js\?v=)([0-9A-Za-z\-]+)")

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
EXCLUDE_FILES_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
                         ".mp4", ".webm", ".mp3", ".woff", ".woff2", ".ttf",
                         ".pdf", ".zip", ".gz", ".pyc")

changed_files = 0
total_repls = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn.lower().endswith(EXCLUDE_FILES_SUFFIX):
            continue
        full = os.path.join(dirpath, fn)
        try:
            with open(full, "r", encoding="utf-8") as f:
                src = f.read()
        except (UnicodeDecodeError, OSError):
            continue
        new_src, n1 = PAT_TWERKHUB.subn(rf"\g<1>{NEW_TWERKHUB}", src)
        new_src, n2 = PAT_SYSTEM.subn(rf"\g<1>{NEW_SYSTEM}", new_src)
        if n1 + n2 > 0 and new_src != src:
            with open(full, "w", encoding="utf-8", newline="") as f:
                f.write(new_src)
            changed_files += 1
            total_repls += (n1 + n2)
            rel = os.path.relpath(full, ROOT)
            print(f"  [{n1+n2:>2}] {rel}")

print(f"\nDone. Files changed: {changed_files}. Total replacements: {total_repls}.")
print(f"  twerkhub-tokens.js -> ?v={NEW_TWERKHUB}")
print(f"  token-system.js    -> ?v={NEW_SYSTEM}")
