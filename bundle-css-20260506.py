# -*- coding: utf-8 -*-
"""
CSS bundler · 2026-05-06

Concatenates the 5 most-loaded CSS files into a single bundle and replaces
the individual <link> tags across all HTMLs with one <link>.

Why: each separate <link rel="stylesheet"> is a render-blocking round-trip.
Bundling 5 -> 1 file cuts HTTP requests + LCP by 300-500ms typical.

Files merged (in order — order matters for cascade):
  1. assets/twerkhub-page.css         (base layout + components)
  2. assets/twerkhub-tokens.css        (token pill + tier badges)
  3. assets/twerkhub-design-tokens.css (CSS custom props)
  4. assets/twerkhub-polish.css        (refinements)
  5. assets/twerkhub-premium.css       (premium grids/reveals)

NOT merged (loaded conditionally / theme override):
  - whatsapp-share.css  (only on share-eligible pages)
  - twerkhub-ph-theme.css (theme — kept separate so we can swap)

Output: assets/twerkhub-bundle.css?v=20260506-b1
The original CSS files stay on disk for safety / rollback.

Run from project root:
    python bundle-css-20260506.py
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, "assets")

BUNDLE_PARTS = [
    "twerkhub-page.css",
    "twerkhub-tokens.css",
    "twerkhub-design-tokens.css",
    "twerkhub-polish.css",
    "twerkhub-premium.css",
]
BUNDLE_NAME = "twerkhub-bundle.css"
BUNDLE_VER  = "20260506-b1"
BUNDLE_LINK = f'<link rel="stylesheet" href="/assets/{BUNDLE_NAME}?v={BUNDLE_VER}">'

# Build bundle
print("Building bundle...")
out = []
out.append(f"/* TWERKHUB · bundle v{BUNDLE_VER} · auto-generated · do not edit */\n")
total_in = 0
for part in BUNDLE_PARTS:
    p = os.path.join(ASSETS, part)
    if not os.path.exists(p):
        print(f"  [skip] {part} not found")
        continue
    with open(p, "r", encoding="utf-8") as f: css = f.read()
    out.append(f"\n/* === {part} === */\n")
    out.append(css)
    sz = len(css)
    total_in += sz
    print(f"  + {part}: {sz/1024:.1f} KB")

bundle_src = "".join(out)
bundle_path = os.path.join(ASSETS, BUNDLE_NAME)
with open(bundle_path, "w", encoding="utf-8", newline="") as f: f.write(bundle_src)
print(f"\nBundle written: {bundle_path} ({len(bundle_src)/1024:.1f} KB total · {total_in/1024:.1f} KB input)")

# Replace links across HTMLs
# Strategy: locate the FIRST original CSS link line, replace with bundle link,
# remove the other 4 links. Use regex tolerant of any ?v=... cache buster.

PARTS_RE = "|".join(re.escape(p) for p in BUNDLE_PARTS)
LINK_RE = re.compile(
    r'<link\s+rel="stylesheet"\s+href="/assets/(?:' + PARTS_RE + r')(?:\?v=[^"]*)?"\s*/?>\s*\n?',
    re.IGNORECASE
)

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}

changed = 0
total_replacements = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: src = f.read()

        matches = list(LINK_RE.finditer(src))
        if not matches: continue

        # Insert bundle at first match position, remove all others.
        first = matches[0]
        new_src = src[:first.start()] + BUNDLE_LINK + "\n" + src[first.end():]
        # Remove all remaining individual links
        new_src = LINK_RE.sub("", new_src)

        if new_src != src:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new_src)
            n = len(matches)
            changed += 1
            total_replacements += n
            rel = os.path.relpath(full, ROOT)
            print(f"  [{n} -> 1] {rel}")

print(f"\nDone. HTMLs updated: {changed}. Total old links removed: {total_replacements}.")
print(f"Bundle URL: /assets/{BUNDLE_NAME}?v={BUNDLE_VER}")
print("\nROLLBACK: if anything breaks, re-link the 5 originals manually and delete twerkhub-bundle.css.")
