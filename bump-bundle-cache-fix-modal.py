# -*- coding: utf-8 -*-
"""Bump bundle cache from b2 -> b3 (modal containing-block fix)"""
import os, re, sys
if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
PAT = re.compile(r"(twerkhub-bundle\.css\?v=)20260506-b2")
NEW = r"\g<1>20260506-b3"

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
changed = 0; total = 0
for d, ds, fs in os.walk(ROOT):
    ds[:] = [x for x in ds if x not in EXCLUDE_DIRS]
    for f in fs:
        if not f.lower().endswith((".html", ".htm")): continue
        p = os.path.join(d, f)
        with open(p, "r", encoding="utf-8") as h: src = h.read()
        new, n = PAT.subn(NEW, src)
        if n > 0 and new != src:
            with open(p, "w", encoding="utf-8", newline="") as h: h.write(new)
            changed += 1; total += n
print(f"Done: {changed} files, {total} replacements -> bundle v=20260506-b3")
