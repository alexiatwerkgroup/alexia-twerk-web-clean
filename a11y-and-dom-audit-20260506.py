# -*- coding: utf-8 -*-
"""
Accessibility + DOM size audit - 2026-05-06

Reports:
1. Heading hierarchy issues (H tags out of order, e.g., H1 -> H3 skip)
2. DOM size estimates per page (count of elements)
3. <main> landmark presence (Lighthouse a11y check)
4. Pages without skip-to-content link

Read-only. NO file modifications.

Run from project root:
    python a11y-and-dom-audit-20260506.py
"""
import os, re, sys
from collections import Counter

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}

H_RE = re.compile(r'<h([1-6])\b[^>]*>', re.IGNORECASE)
ELEMENT_RE = re.compile(r'<([a-z][a-z0-9]*)\b', re.IGNORECASE)
MAIN_RE = re.compile(r'<main\b', re.IGNORECASE)
ROLE_MAIN_RE = re.compile(r'role=["\']main["\']', re.IGNORECASE)
SKIP_LINK_RE = re.compile(r'href=["\']#main', re.IGNORECASE)

heading_issues = []
no_main_pages = []
huge_dom_pages = []
small_dom_pages = []
skip_links_missing = []

scanned = 0
DOM_BIG = 1500   # Lighthouse warns above ~800-1500
DOM_HUGE = 3000  # Definite penalty

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        try:
            with open(full, "r", encoding="utf-8") as f: content = f.read()
        except (UnicodeDecodeError, OSError): continue
        scanned += 1
        rel = os.path.relpath(full, ROOT).replace("\\", "/")

        # Heading hierarchy
        levels = [int(m.group(1)) for m in H_RE.finditer(content)]
        if levels:
            issues = []
            # Check first heading is H1 (or at least, NOT H4+)
            if levels[0] > 2:
                issues.append(f"first heading is H{levels[0]} (should be H1 or H2)")
            # Check no skips: H1 -> H3 is a skip
            for i in range(1, len(levels)):
                jump = levels[i] - levels[i-1]
                if jump > 1:
                    issues.append(f"H{levels[i-1]} -> H{levels[i]} (skip)")
                    if len(issues) > 3: break
            # Multiple H1s
            n_h1 = levels.count(1)
            if n_h1 > 1:
                issues.append(f"{n_h1} H1 tags (should be 1)")
            if issues:
                heading_issues.append((rel, issues))

        # <main> landmark
        if not MAIN_RE.search(content) and not ROLE_MAIN_RE.search(content):
            no_main_pages.append(rel)

        # Skip-to-content link
        if not SKIP_LINK_RE.search(content):
            skip_links_missing.append(rel)

        # DOM size estimate (count of opening tags, ignoring closing/self-closing semantics)
        # This is a rough estimate, not exact DOM node count
        all_tags = ELEMENT_RE.findall(content)
        node_count = len(all_tags)
        if node_count > DOM_HUGE:
            huge_dom_pages.append((rel, node_count))
        elif node_count > DOM_BIG:
            small_dom_pages.append((rel, node_count))

# ============================================================
# Report
# ============================================================
print(f"Scanned {scanned} HTML files\n")

print("=" * 70)
print(f"HEADING HIERARCHY ISSUES  ({len(heading_issues)} pages)")
print("=" * 70)
if not heading_issues:
    print("  None.")
else:
    for rel, issues in sorted(heading_issues)[:20]:
        print(f"\n  {rel}")
        for issue in issues[:3]:
            print(f"    - {issue}")
    if len(heading_issues) > 20:
        print(f"\n  ... +{len(heading_issues)-20} more pages with heading issues")

print("\n" + "=" * 70)
print(f"PAGES WITHOUT <main> LANDMARK  ({len(no_main_pages)} pages)")
print("=" * 70)
if not no_main_pages:
    print("  All pages have <main> or role='main'.")
else:
    by_dir = Counter(p.split("/")[0] for p in no_main_pages)
    for d, n in sorted(by_dir.items(), key=lambda x: -x[1])[:10]:
        print(f"  {n:>4}x   {d}/")
    print(f"\n  Sample 5:")
    for p in sorted(no_main_pages)[:5]:
        print(f"    - {p}")

print("\n" + "=" * 70)
print(f"DOM SIZE")
print("=" * 70)
print(f"  HUGE (>{DOM_HUGE} elements - definite Lighthouse penalty):")
if huge_dom_pages:
    for rel, n in sorted(huge_dom_pages, key=lambda x: -x[1])[:10]:
        print(f"    {n:>5} elements   {rel}")
    if len(huge_dom_pages) > 10:
        print(f"    ... +{len(huge_dom_pages)-10} more")
else:
    print("    None.")

print(f"\n  Big ({DOM_BIG}-{DOM_HUGE} - Lighthouse may warn):")
if small_dom_pages:
    for rel, n in sorted(small_dom_pages, key=lambda x: -x[1])[:10]:
        print(f"    {n:>5} elements   {rel}")
    if len(small_dom_pages) > 10:
        print(f"    ... +{len(small_dom_pages)-10} more")
else:
    print("    None.")

print("\n" + "=" * 70)
print(f"SKIP-TO-MAIN LINK MISSING  ({len(skip_links_missing)}/{scanned} pages)")
print("=" * 70)
if len(skip_links_missing) == scanned:
    print("  No pages have skip-to-content link (Lighthouse a11y).")
    print("  Recommendation: add <a class='twk-sr-only' href='#main'>Skip to content</a>")
    print("  to top of every <body>, plus <main id='main'>.")
elif skip_links_missing:
    print(f"  {len(skip_links_missing)} pages missing skip-link.")
else:
    print("  All pages have skip-link. Good.")

print(f"\nDone.")
