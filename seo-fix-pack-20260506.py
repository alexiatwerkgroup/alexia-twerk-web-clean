# -*- coding: utf-8 -*-
"""
SEO + Performance fix pack · 2026-05-06

Applies platform-wide:
1. Strips '' from Google Fonts URLs (keeps Anton — covers same role)
2. Normalizes hreflang/canonical pointing to '/index.html' -> '/'
3. Reduces Playfair Display weight set 0,700;0,800;0,900;1,700;1,800;1,900 -> 0,700;0,900;1,700;1,900
4. Reports a count of changes per file

Run from project root:
    python seo-fix-pack-20260506.py
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

# Pattern 1: drop Bebas Neue
BEBAS_PAT = re.compile(r"&family=Bebas\+Neue")

# Pattern 2: collapse Playfair weight set (kept full coverage of italic + 700/900)
PLAYFAIR_PAT = re.compile(
    r"family=Playfair\+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900"
)
PLAYFAIR_REPL = "family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900"

# Pattern 3: canonical/hreflang index.html -> /
INDEX_HTML_PATTERNS = [
    (re.compile(r'(href="https://alexiatwerkgroup\.com)/index\.html(")'),
     r'\1/\2'),
    (re.compile(r'(href="https://alexiatwerkgroup\.com)/es/index\.html(")'),
     r'\1/es/\2'),
    (re.compile(r'(href="https://alexiatwerkgroup\.com)/ru/index\.html(")'),
     r'\1/ru/\2'),
]

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
EXCLUDE_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
                  ".mp4", ".webm", ".mp3", ".woff", ".woff2", ".ttf",
                  ".pdf", ".zip", ".gz", ".pyc")

changed_files = 0
totals = {"bebas": 0, "playfair": 0, "canon": 0}

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn.lower().endswith(EXCLUDE_SUFFIX): continue
        full = os.path.join(dirpath, fn)
        try:
            with open(full, "r", encoding="utf-8") as f: src = f.read()
        except (UnicodeDecodeError, OSError): continue

        new = src
        n_b = 0; n_p = 0; n_c = 0

        new, n_b = BEBAS_PAT.subn("", new)
        new, n_p = PLAYFAIR_PAT.subn(PLAYFAIR_REPL, new)
        for pat, repl in INDEX_HTML_PATTERNS:
            new, c = pat.subn(repl, new)
            n_c += c

        if (n_b + n_p + n_c) > 0 and new != src:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
            changed_files += 1
            totals["bebas"] += n_b
            totals["playfair"] += n_p
            totals["canon"] += n_c
            rel = os.path.relpath(full, ROOT)
            print(f"  [B{n_b:>2} P{n_p:>2} C{n_c:>2}] {rel}")

print(f"\nDone. Files changed: {changed_files}.")
print(f"  Bebas Neue removed:   {totals['bebas']}x")
print(f"  Playfair compacted:   {totals['playfair']}x")
print(f"  Canonical normalized: {totals['canon']}x")
