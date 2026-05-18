# -*- coding: utf-8 -*-
"""
Internal link audit - 2026-05-06

Scans all HTML files for internal links and reports:
1. BROKEN internal links (href points to a file that doesn't exist)
2. ORPHAN pages (HTMLs that have ZERO incoming links from other pages)
3. Pages with most links (hubs)

Read-only. Generates a report. NO file modifications.

Run from project root:
    python internal-link-audit-20260506.py
"""
import os, re, sys
from collections import defaultdict
from urllib.parse import urlparse

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_HOST = "alexiatwerkgroup.com"
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}

# Collect all HTML files (potential targets)
all_htmls = set()
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if fn.lower().endswith((".html", ".htm")):
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT).replace("\\", "/")
            all_htmls.add(rel)

print(f"Indexed {len(all_htmls)} HTML files\n")

HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)

# Build outgoing link map: file -> [targets]
# And incoming link map: file -> count
out_links = {}
incoming_count = defaultdict(int)
broken_links = []

def normalize_target(href, src_file):
    """Convert a href to a relative path within the project (or None if external)."""
    # External or anchor-only
    if href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")): return None
    if href.startswith(("http://", "https://", "//")):
        # Only consider if same host
        try:
            p = urlparse(href if "//" in href else "https:" + href)
        except Exception: return None
        if SITE_HOST not in (p.netloc or ""): return None
        path = p.path
    else:
        path = href

    # Strip query + fragment
    path = path.split("?")[0].split("#")[0]
    if not path: return None
    # Resolve relative paths
    if path.startswith("/"):
        # absolute from site root
        target = path.lstrip("/")
    else:
        # relative to current file dir
        src_dir = os.path.dirname(src_file)
        target = os.path.normpath(os.path.join(src_dir, path)).replace("\\", "/")

    # If ends with / treat as index.html
    if target.endswith("/") or target == "":
        target = target + "index.html"
    # Bare directory
    if not os.path.splitext(target)[1]:
        target = target + "/index.html" if not target.endswith("/") else target + "index.html"
    # Trim leading slashes / dots
    target = target.lstrip("/").lstrip("./")
    return target

for src_rel in sorted(all_htmls):
    full = os.path.join(ROOT, src_rel.replace("/", os.sep))
    try:
        with open(full, "r", encoding="utf-8") as f: content = f.read()
    except (UnicodeDecodeError, OSError): continue
    targets = []
    for m in HREF_RE.finditer(content):
        href = m.group(1)
        target = normalize_target(href, src_rel)
        if target is None: continue
        targets.append((href, target))
    out_links[src_rel] = targets
    for href, t in targets:
        if t in all_htmls:
            incoming_count[t] += 1
        else:
            # Check if it's an asset that exists (img, css, js, pdf)
            full_t = os.path.join(ROOT, t.replace("/", os.sep))
            if not os.path.exists(full_t):
                # Skip CSS/JS hrefs that are common (fonts.googleapis etc handled by external check)
                # Only flag if extension is HTML or no extension
                ext = os.path.splitext(t)[1].lower()
                if ext in ("", ".html", ".htm"):
                    broken_links.append((src_rel, href, t))

# Report 1: broken links
print("=" * 70)
print("BROKEN INTERNAL LINKS")
print("=" * 70)
if not broken_links:
    print("  None. All internal HTML hrefs resolve.")
else:
    by_target = defaultdict(list)
    for src, href, target in broken_links:
        by_target[target].append((src, href))
    print(f"  Found {len(broken_links)} broken links across {len(by_target)} unique targets\n")
    for target, refs in sorted(by_target.items(), key=lambda x: -len(x[1]))[:30]:
        print(f"  TARGET: {target}  ({len(refs)} link(s))")
        for src, href in refs[:3]:
            print(f"    - {src}: href=\"{href}\"")
        if len(refs) > 3:
            print(f"    ... +{len(refs)-3} more")
    if len(by_target) > 30:
        print(f"  ... +{len(by_target)-30} more unique targets")

# Report 2: orphan pages
print("\n" + "=" * 70)
print("ORPHAN PAGES (zero incoming internal links)")
print("=" * 70)
# Filter out pages that are typically entry points
ENTRY_POINTS = {
    "index.html", "es/index.html", "ru/index.html",
    "404.html", "es/404.html", "ru/404.html",
    "sitemap.html",
}
orphans = []
for html in sorted(all_htmls):
    if html in ENTRY_POINTS: continue
    if incoming_count.get(html, 0) == 0:
        orphans.append(html)

if not orphans:
    print("  None. Every page is reachable.")
else:
    print(f"  Found {len(orphans)} orphan pages:\n")
    # Group by top-level directory
    by_dir = defaultdict(list)
    for o in orphans:
        top = o.split("/")[0] if "/" in o else "(root)"
        by_dir[top].append(o)
    for d, items in sorted(by_dir.items(), key=lambda x: -len(x[1])):
        print(f"  {d}/ ({len(items)} orphan(s))")
        for item in sorted(items)[:8]:
            print(f"    - {item}")
        if len(items) > 8:
            print(f"    ... +{len(items)-8} more")

# Report 3: top hubs (highest outgoing link count)
print("\n" + "=" * 70)
print("TOP LINK HUBS (most outgoing internal links)")
print("=" * 70)
hubs = sorted(((src, len(targets)) for src, targets in out_links.items()), key=lambda x: -x[1])[:10]
for src, n in hubs:
    print(f"  {n:>4} outgoing  {src}")

print(f"\nDone. Total internal links checked: {sum(len(v) for v in out_links.values())}")
