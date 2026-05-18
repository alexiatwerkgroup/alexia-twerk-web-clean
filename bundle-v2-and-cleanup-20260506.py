# -*- coding: utf-8 -*-
"""
Round 3 cleanup - 2026-05-06

1. Rebuild twerkhub-bundle.css INCLUDING whatsapp-share.css (cuts 1 more HTTP req)
2. Strip whatsapp-share.css <link> from all HTMLs (now redundant)
3. Delete orphan PNGs: twerkhub-cover-2048x900.png + twerkhub-cover-1024x450.png
   Verified: not referenced anywhere in the codebase.

Run from project root:
    python bundle-v2-and-cleanup-20260506.py
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
    "whatsapp-share.css",  # NEW: merged in v2
]
BUNDLE_NAME = "twerkhub-bundle.css"
BUNDLE_VER  = "20260506-b2"

# Step 1: rebuild bundle with whatsapp-share.css included
print("Rebuilding bundle v2 (with whatsapp-share.css merged)...")
out = []
out.append(f"/* TWERKHUB - bundle v{BUNDLE_VER} - auto-generated - do not edit */\n")
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
print(f"\nBundle v2: {len(bundle_src)/1024:.1f} KB total")

# Step 2: update bundle cache-bust + remove whatsapp-share.css <link> from all HTMLs
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
BUNDLE_RE = re.compile(r'(twerkhub-bundle\.css\?v=)([0-9A-Za-z\-]+)')
WHATSAPP_LINK_RE = re.compile(
    r'<link\s+rel="stylesheet"\s+href="/assets/whatsapp-share\.css(?:\?v=[^"]*)?"\s*/?>\s*\n?',
    re.IGNORECASE
)

cache_bumped = 0
links_removed = 0
files_changed = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: src = f.read()

        new = src
        new, n_cache = BUNDLE_RE.subn(rf"\g<1>{BUNDLE_VER}", new)
        new, n_remove = WHATSAPP_LINK_RE.subn("", new)

        if (n_cache + n_remove) > 0 and new != src:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
            files_changed += 1
            cache_bumped += n_cache
            links_removed += n_remove

print(f"\nHTML updates:")
print(f"  Files touched: {files_changed}")
print(f"  Bundle cache bumped: {cache_bumped}x")
print(f"  whatsapp-share.css <link> removed: {links_removed}x")

# Step 3: delete orphan covers
ORPHANS = ["twerkhub-cover-2048x900.png", "twerkhub-cover-1024x450.png"]
print("\nDeleting orphan PNGs:")
freed = 0
for o in ORPHANS:
    p = os.path.join(ROOT, o)
    if os.path.exists(p):
        sz = os.path.getsize(p) / 1024
        os.remove(p)
        freed += sz
        print(f"  Deleted: {o} ({sz:.1f} KB)")
    else:
        print(f"  Not found: {o}")
print(f"\nDone. Freed: {freed:.1f} KB")
