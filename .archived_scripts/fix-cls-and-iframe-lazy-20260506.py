# -*- coding: utf-8 -*-
"""
Core Web Vitals fix pack - 2026-05-06

Two fixes:
1. CLS: add width="X" height="Y" to every <img> tag missing dimensions.
   - Local images: read intrinsic size via Pillow.
   - YouTube thumbnails (i.ytimg.com): use known YouTube thumb dimensions
     based on quality token (default/mqdefault/hqdefault/sddefault/maxresdefault).
   - Other remote images: skip (would need network fetch).

2. YouTube iframe lazy: add loading="lazy" to any <iframe> embedding
   youtube.com/embed or youtube-nocookie.com that lacks it.
   Skip iframes with data-no-lazy attribute (manual opt-out).

Requires: pip install Pillow

Run from project root:
    python fix-cls-and-iframe-lazy-20260506.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# YouTube thumb dimensions (intrinsic)
YT_DIMS = {
    "default":       (120, 90),
    "mqdefault":     (320, 180),
    "hqdefault":     (480, 360),
    "sddefault":     (640, 480),
    "maxresdefault": (1280, 720),
    "0":             (480, 360),  # often used as cover
    "1":             (120, 90),
    "2":             (120, 90),
    "3":             (120, 90),
}

# Cache of resolved dimensions per src
_dim_cache = {}

def resolve_dims(src):
    """Return (w, h) or None for an image src."""
    if src in _dim_cache: return _dim_cache[src]
    dims = None

    # YouTube thumb
    m = re.match(r'https?://i\.ytimg\.com/vi(?:_webp)?/[^/]+/([^.?]+)', src)
    if m:
        token = m.group(1)
        dims = YT_DIMS.get(token)

    # Local image (relative path)
    elif not src.startswith(('http://', 'https://', 'data:', '//')):
        # Strip query string, leading slash
        clean = src.split('?')[0].split('#')[0]
        if clean.startswith('/'): clean = clean[1:]
        full = os.path.join(ROOT, clean)
        if os.path.isfile(full):
            try:
                with Image.open(full) as img:
                    dims = img.size  # (w, h)
            except Exception:
                dims = None

    _dim_cache[src] = dims
    return dims

# Pattern for img tag (capture full tag)
IMG_PAT = re.compile(r'<img\b([^>]*)>', re.IGNORECASE)
SRC_PAT = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.IGNORECASE)
HAS_W = re.compile(r'\bwidth=', re.IGNORECASE)
HAS_H = re.compile(r'\bheight=', re.IGNORECASE)

# Pattern for iframe (youtube)
IFRAME_PAT = re.compile(r'<iframe\b([^>]*)>', re.IGNORECASE)

def fix_imgs(html):
    """Add width/height to <img> tags missing them. Returns (new_html, count)."""
    changes = 0
    def repl(m):
        nonlocal changes
        attrs = m.group(1)
        if HAS_W.search(attrs) and HAS_H.search(attrs):
            return m.group(0)  # already has both
        src_m = SRC_PAT.search(attrs)
        if not src_m: return m.group(0)
        src = src_m.group(1)
        dims = resolve_dims(src)
        if not dims: return m.group(0)
        w, h = dims
        new_attrs = attrs
        if not HAS_W.search(new_attrs):
            new_attrs = f' width="{w}"' + new_attrs
        if not HAS_H.search(new_attrs):
            new_attrs = f' height="{h}"' + new_attrs
        changes += 1
        return f'<img{new_attrs}>'
    new = IMG_PAT.sub(repl, html)
    return new, changes

def fix_iframes(html):
    """Add loading=lazy to youtube iframes missing it. Returns (new_html, count)."""
    changes = 0
    def repl(m):
        nonlocal changes
        attrs = m.group(1)
        if 'loading=' in attrs.lower(): return m.group(0)
        if 'data-no-lazy' in attrs.lower(): return m.group(0)
        # Only apply to youtube iframes
        if not re.search(r'youtube(-nocookie)?\.com/embed', attrs, re.IGNORECASE):
            return m.group(0)
        new_attrs = ' loading="lazy"' + attrs
        changes += 1
        return f'<iframe{new_attrs}>'
    new = IFRAME_PAT.sub(repl, html)
    return new, changes

# Walk
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
total_img_fixes = 0
total_iframe_fixes = 0
files_changed = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: src = f.read()
        new, n_img = fix_imgs(src)
        new, n_if  = fix_iframes(new)
        if (n_img + n_if) > 0 and new != src:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
            files_changed += 1
            total_img_fixes += n_img
            total_iframe_fixes += n_if
            rel = os.path.relpath(full, ROOT)
            print(f"  [img:{n_img:>2}  iframe:{n_if:>2}] {rel}")

print(f"\nDone.")
print(f"  Files updated:           {files_changed}")
print(f"  <img> dimensions added:  {total_img_fixes}")
print(f"  YouTube iframe lazified: {total_iframe_fixes}")
print(f"  Unique srcs cached:      {len(_dim_cache)}")
