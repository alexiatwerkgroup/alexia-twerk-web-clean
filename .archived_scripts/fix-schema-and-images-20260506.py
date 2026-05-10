# -*- coding: utf-8 -*-
"""
Schema fixes + image cleanup round - 2026-05-06

PART 1 - JSON-LD schema repair:
  * BlogPosting nodes missing 'image' get image=https://.../logo-twerkhub.png
  * Organization nodes missing 'url' get url=https://alexiatwerkgroup.com/
  * Preserves all other JSON structure exactly

PART 2 - Image cleanup:
  * Delete orphan: model-premium.jpg (228 KB, never referenced)
  * Convert to WebP: velvet.jpg, tainara.jpg, hero_alexia.jpg
  * Update <img src=> refs to point to .webp (PNGs/JPGs kept for og:image)

Requires: pip install Pillow

Run from project root:
    python fix-schema-and-images-20260506.py
"""
import os, re, json, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
LOGO_URL = "https://alexiatwerkgroup.com/logo-twerkhub.png"
SITE_URL = "https://alexiatwerkgroup.com/"

# Force UTF-8 stdout on Windows
if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

try:
    from PIL import Image
except ImportError:
    print("ERROR: pip install Pillow required")
    sys.exit(1)

# ============================================================
# PART 1: Schema repair
# ============================================================

JSONLD_RE = re.compile(
    r'(<script[^>]*\btype=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
    re.IGNORECASE | re.DOTALL
)

def fix_node(node):
    """Walk node + repair. Returns (modified_node, n_changes)."""
    n = 0
    if not isinstance(node, dict):
        return node, 0

    t = node.get("@type")
    if isinstance(t, list): t_check = t[0]
    else: t_check = t

    # Fix 1: BlogPosting/Article missing image
    if t_check in ("BlogPosting", "Article", "NewsArticle") and "image" not in node:
        node["image"] = LOGO_URL
        n += 1

    # Fix 2: Organization missing url
    if t_check == "Organization" and "url" not in node:
        node["url"] = SITE_URL
        n += 1

    # Recurse
    for k, v in list(node.items()):
        if isinstance(v, dict):
            fixed, dn = fix_node(v)
            node[k] = fixed
            n += dn
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    fixed, dn = fix_node(item)
                    v[i] = fixed
                    n += dn
    return node, n

def fix_jsonld(html_src):
    """Return (new_html, total_changes)."""
    total_changes = 0
    def repl(m):
        nonlocal total_changes
        prefix, body, suffix = m.group(1), m.group(2).strip(), m.group(3)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return m.group(0)

        # Determine container shape
        if isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                changes_here = 0
                for i, node in enumerate(data["@graph"]):
                    if isinstance(node, dict):
                        fixed, dn = fix_node(node)
                        data["@graph"][i] = fixed
                        changes_here += dn
                if changes_here == 0: return m.group(0)
                total_changes += changes_here
            else:
                fixed, dn = fix_node(data)
                if dn == 0: return m.group(0)
                data = fixed
                total_changes += dn
        elif isinstance(data, list):
            changes_here = 0
            for i, node in enumerate(data):
                if isinstance(node, dict):
                    fixed, dn = fix_node(node)
                    data[i] = fixed
                    changes_here += dn
            if changes_here == 0: return m.group(0)
            total_changes += changes_here
        else:
            return m.group(0)

        new_body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        return prefix + new_body + suffix

    new_html = JSONLD_RE.sub(repl, html_src)
    return new_html, total_changes

print("="*60)
print("PART 1: Schema repair")
print("="*60)
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
schema_files_changed = 0
schema_total_fixes = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: src = f.read()
        new, n = fix_jsonld(src)
        if n > 0 and new != src:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new)
            schema_files_changed += 1
            schema_total_fixes += n
            rel = os.path.relpath(full, ROOT)
            print(f"  [+{n}] {rel}")

print(f"\nSchema: {schema_files_changed} files updated, {schema_total_fixes} fields added")

# ============================================================
# PART 2: Image cleanup
# ============================================================
print("\n" + "="*60)
print("PART 2: Image cleanup")
print("="*60)

# Step 2a: delete orphan
ORPHAN = "model-premium.jpg"
op = os.path.join(ROOT, ORPHAN)
if os.path.exists(op):
    sz = os.path.getsize(op) / 1024
    os.remove(op)
    print(f"DELETED orphan: {ORPHAN} ({sz:.1f} KB)")

# Step 2b: convert to WebP
TO_CONVERT = [
    ("velvet.jpg",      "velvet.webp",      85),
    ("tainara.jpg",     "tainara.webp",     85),
    ("hero_alexia.jpg", "hero_alexia.webp", 85),
]
converted = []
for src_name, dst_name, quality in TO_CONVERT:
    src_path = os.path.join(ROOT, src_name)
    if not os.path.exists(src_path):
        print(f"  [skip] {src_name} not found")
        continue
    dst_path = os.path.join(ROOT, dst_name)
    img = Image.open(src_path)
    img.save(dst_path, "WebP", quality=quality, method=6)
    src_kb = os.path.getsize(src_path) / 1024
    dst_kb = os.path.getsize(dst_path) / 1024
    saved = src_kb - dst_kb
    pct = (1 - dst_kb/src_kb) * 100
    print(f"CONVERTED {src_name} -> {dst_name}: {src_kb:.1f}KB -> {dst_kb:.1f}KB (-{pct:.0f}%)")
    converted.append((src_name, dst_name))

# Step 2c: update HTML refs (only <img src=> tags, leave og:image PNGs/JPGs alone)
print("\nUpdating <img src=> references to .webp...")
img_refs_updated = 0
htmls_touched = 0
for src_name, dst_name in converted:
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
                img_refs_updated += n
                htmls_touched += 1

print(f"\nImage refs: {img_refs_updated} updated across {htmls_touched} files")
print("\nDone. Originals (.jpg/.png) kept for og:image / twitter:image fallback.")
