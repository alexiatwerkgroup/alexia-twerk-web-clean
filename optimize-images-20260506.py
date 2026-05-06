# -*- coding: utf-8 -*-
"""
Image optimization pack - 2026-05-06
Uses Pillow (PIL) to convert key heavy PNGs to WebP and update HTML references.

Steps:
1. Delete unused 'yt-playlist-cover no.png' (4 MB orphan)
2. Convert hero_alexia_local.png -> .webp (~80% smaller)
3. Convert yt-playlist-cover.png -> .webp (~80% smaller)
4. Update <img src=...> references across HTML to use .webp
   IMPORTANT: og:image and twitter:image stay on .png (Facebook/Twitter req PNG/JPG)

Requirements:
    pip install Pillow

Run from project root:
    python optimize-images-20260506.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# Step 1: delete orphan
ORPHAN = "yt-playlist-cover no.png"
orphan_path = os.path.join(ROOT, ORPHAN)
if os.path.exists(orphan_path):
    sz = os.path.getsize(orphan_path) / 1024
    os.remove(orphan_path)
    print(f"DELETED orphan: {ORPHAN} ({sz:.1f} KB freed)")

# Step 2 + 3: convert PNGs to WebP
TO_CONVERT = [
    ("hero_alexia_local.png", "hero_alexia_local.webp", 88),
    ("yt-playlist-cover.png", "yt-playlist-cover.webp", 85),
]

converted = []
for src_name, dst_name, quality in TO_CONVERT:
    src = os.path.join(ROOT, src_name)
    if not os.path.exists(src):
        print(f"  [skip] {src_name} not found")
        continue
    dst = os.path.join(ROOT, dst_name)
    img = Image.open(src)
    # Preserve transparency
    img.save(dst, "WebP", quality=quality, method=6, lossless=False)
    src_kb = os.path.getsize(src) / 1024
    dst_kb = os.path.getsize(dst) / 1024
    saved = src_kb - dst_kb
    pct = (1 - dst_kb/src_kb) * 100
    print(f"CONVERTED {src_name} -> {dst_name}")
    print(f"  {src_kb:.1f} KB -> {dst_kb:.1f} KB  (saved {saved:.1f} KB, -{pct:.0f}%)")
    converted.append((src_name, dst_name))

# Step 4: update HTML references (<img src=> only — leave OG/Twitter alone)
print("\nUpdating HTML references...")
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
htmls_changed = 0
total_repls = 0

for src_name, dst_name in converted:
    # Match <img src=...> with the PNG, with or without quotes/path prefix
    # IMPORTANT: only replace inside <img ...> tags, NOT meta og:image/twitter:image
    pat = re.compile(
        r'(<img[^>]*\bsrc=["\'])([^"\']*?)' + re.escape(src_name) + r'(["\'])',
        re.IGNORECASE
    )
    repl = r'\1\2' + dst_name + r'\3'

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if not fn.lower().endswith((".html", ".htm")): continue
            full = os.path.join(dirpath, fn)
            with open(full, "r", encoding="utf-8") as f: content = f.read()
            new, n = pat.subn(repl, content)
            if n > 0 and new != content:
                with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
                rel = os.path.relpath(full, ROOT)
                print(f"  [{n}x] {rel}: {src_name} -> {dst_name}")
                total_repls += n
                htmls_changed += 1

# Also update preload hint in home (rel=preload as=image href=...)
print("\nUpdating <link rel='preload'> hints...")
preload_changed = 0
for src_name, dst_name in converted:
    pat = re.compile(
        r'(<link[^>]*\brel=["\']preload["\'][^>]*\bhref=["\'])([^"\']*?)' + re.escape(src_name) + r'(["\'])',
        re.IGNORECASE
    )
    repl = r'\1\2' + dst_name + r'\3'
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if not fn.lower().endswith((".html", ".htm")): continue
            full = os.path.join(dirpath, fn)
            with open(full, "r", encoding="utf-8") as f: content = f.read()
            new, n = pat.subn(repl, content)
            if n > 0 and new != content:
                # Also need to update the as=image type hint to image/webp
                new = re.sub(
                    r'(<link[^>]*\bhref=["\'][^"\']*' + re.escape(dst_name) + r'["\'][^>]*?)(?:\s+type=["\'][^"\']*["\'])?(\s*/?>)',
                    r'\1 type="image/webp"\2',
                    new
                )
                with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
                rel = os.path.relpath(full, ROOT)
                print(f"  preload [{n}x] {rel}: -> {dst_name}")
                preload_changed += n

print(f"\nDone. HTMLs touched: {htmls_changed}. Total <img> refs: {total_repls}. Preload hints: {preload_changed}.")
print("\nNOTE: Original PNGs kept on disk — used for og:image (Facebook/Twitter).")
print("      Only <img src=...> tags now point to .webp.")
