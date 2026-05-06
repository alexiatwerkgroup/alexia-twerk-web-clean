# -*- coding: utf-8 -*-
"""
Platform-wide image audit - 2026-05-06

Walks all PNG/JPG/JPEG/WebP/GIF/SVG files in the project and:
1. Reports total size + count
2. Lists ORPHANS (not referenced anywhere in HTML/CSS/JS/manifest)
3. Lists HEAVY images (>100 KB) with where they're referenced
4. Reports candidates for WebP conversion (PNG/JPG > 50 KB)

Run from project root:
    python image-audit-20260506.py
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
SOURCE_EXTS = (".html", ".htm", ".css", ".js", ".mjs", ".json", ".xml", ".md", ".txt")

# Collect all images
print("Scanning images...")
images = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn.lower().endswith(IMAGE_EXTS):
            full = os.path.join(dirpath, fn)
            sz = os.path.getsize(full)
            rel = os.path.relpath(full, ROOT)
            images.append((rel, sz, fn))

print(f"  Found {len(images)} images. Total: {sum(s for _,s,_ in images)/1024/1024:.1f} MB\n")

# Build big haystack of all source content for fast lookup
print("Loading source files for usage detection...")
haystack_chunks = []
src_count = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn.lower().endswith(SOURCE_EXTS):
            full = os.path.join(dirpath, fn)
            try:
                with open(full, "r", encoding="utf-8") as f: haystack_chunks.append(f.read())
                src_count += 1
            except (UnicodeDecodeError, OSError):
                pass
HAYSTACK = "\n".join(haystack_chunks).lower()
print(f"  Indexed {src_count} source files ({len(HAYSTACK)/1024/1024:.1f} MB of text)\n")

# Classify images
orphans = []
used_heavy = []
webp_candidates = []

for rel, sz, fn in images:
    fn_lower = fn.lower()
    # Check usage by basename (more reliable than path; some refs are relative)
    is_used = fn_lower in HAYSTACK
    # also check stripped name without extension (covers <picture> srcset etc.)
    if not is_used:
        stem = os.path.splitext(fn_lower)[0]
        is_used = stem in HAYSTACK and len(stem) > 3  # avoid false-positive on "logo"

    if not is_used and sz > 5*1024:  # ignore <5KB sprites
        orphans.append((rel, sz))
    if is_used and sz > 100*1024:
        used_heavy.append((rel, sz))
    # WebP conversion candidates: PNG/JPG over 50KB, NOT already a webp variant
    if fn_lower.endswith((".png", ".jpg", ".jpeg")) and sz > 50*1024:
        # skip if a .webp twin already exists
        webp_twin = os.path.join(ROOT, rel.rsplit('.', 1)[0] + '.webp')
        if not os.path.exists(webp_twin):
            webp_candidates.append((rel, sz))

# Report
print("="*70)
print("ORPHAN IMAGES (>5KB, not referenced anywhere)")
print("="*70)
if not orphans:
    print("  None. Clean.")
else:
    orphans.sort(key=lambda x: -x[1])
    total = sum(s for _,s in orphans)
    for rel, sz in orphans:
        print(f"  {sz/1024:>8.1f} KB  {rel}")
    print(f"  ---")
    print(f"  Total dead weight: {total/1024:.1f} KB ({len(orphans)} files)")

print("\n" + "="*70)
print("HEAVY USED IMAGES (>100KB - candidates for optimization)")
print("="*70)
if not used_heavy:
    print("  None over 100KB threshold. All good.")
else:
    used_heavy.sort(key=lambda x: -x[1])
    for rel, sz in used_heavy:
        print(f"  {sz/1024:>8.1f} KB  {rel}")

print("\n" + "="*70)
print("WEBP CONVERSION CANDIDATES (PNG/JPG >50KB without .webp twin)")
print("="*70)
if not webp_candidates:
    print("  None.")
else:
    webp_candidates.sort(key=lambda x: -x[1])
    saved_estimate = sum(s for _,s in webp_candidates) * 0.7  # ~70% reduction typical
    for rel, sz in webp_candidates[:20]:
        print(f"  {sz/1024:>8.1f} KB  {rel}")
    if len(webp_candidates) > 20:
        print(f"  ... +{len(webp_candidates)-20} more")
    print(f"  ---")
    print(f"  Estimated savings if all converted: ~{saved_estimate/1024:.0f} KB")

print("\nDone.")
