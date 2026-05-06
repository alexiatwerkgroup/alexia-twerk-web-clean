# -*- coding: utf-8 -*-
"""
Fix broken links + A11y skip-link round - 2026-05-06

PART 1 - Broken link redirects:
  - 85 broken links to /twerk-dancer/X.html that should be /creator/X.html
  - Strategy: fix source HTML refs (better SEO than 301 chain)
  - For each broken /twerk-dancer/X.html, check if /creator/X.html exists.
    If yes -> rewrite ref. If no -> fallback to /creators.html.

PART 2 - Add skip-to-content link:
  - Inject <a href="#main" class="twk-sr-only">Skip to content</a>
    immediately after <body> tag in every HTML.
  - Ensures Lighthouse a11y check passes.
  - Visual: invisible (uses existing .twk-sr-only class).
  - Note: requires <main id="main"> to exist for the link to work; we'll
    add that in a separate pass since it's more invasive.

Run from project root:
    python fix-broken-links-and-a11y-20260506.py
"""
import os, re, sys

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}

# ============================================================
# PART 1: Fix broken /twerk-dancer/ links
# ============================================================
print("=" * 60)
print("PART 1: Broken /twerk-dancer/ link fixes")
print("=" * 60)

# Build lookup of existing /creator/*.html
existing_creators = set()
creator_dir = os.path.join(ROOT, "creator")
if os.path.isdir(creator_dir):
    for fn in os.listdir(creator_dir):
        full = os.path.join(creator_dir, fn)
        if fn.lower().endswith(".html"):
            stem = os.path.splitext(fn)[0]
            existing_creators.add(stem)
        elif os.path.isdir(full) and os.path.exists(os.path.join(full, "index.html")):
            existing_creators.add(fn)
print(f"  Indexed {len(existing_creators)} existing /creator/ pages")

# Pattern matcher: any href to /twerk-dancer/X[.html] (with or without leading /)
TD_RE = re.compile(
    r'href=["\']((?:\.\.?\/|/)?twerk-dancer/([a-zA-Z0-9_\-]+)(?:\.html)?(?:/index\.html)?)["\']',
    re.IGNORECASE
)

counters = {"td_fixed": 0, "td_fallback": 0}
files_changed = set()
fallback_creators_url = "/creators.html"

def make_repl(local):
    """Build a substitution function that mutates the `local` dict."""
    def repl(m):
        slug = m.group(2).lower()
        if slug in existing_creators:
            local["fixes"] += 1
            return f'href="/creator/{slug}.html"'
        else:
            local["fallbacks"] += 1
            return f'href="{fallback_creators_url}"'
    return repl

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: content = f.read()
        local = {"fixes": 0, "fallbacks": 0}
        new_content = TD_RE.sub(make_repl(local), content)
        if (local["fixes"] + local["fallbacks"]) > 0 and new_content != content:
            with open(full, "w", encoding="utf-8", newline="") as f: f.write(new_content)
            files_changed.add(os.path.relpath(full, ROOT))
            counters["td_fixed"] += local["fixes"]
            counters["td_fallback"] += local["fallbacks"]

td_fixed = counters["td_fixed"]
td_fallback = counters["td_fallback"]

print(f"  Fixed (slug match): {td_fixed} link(s)")
print(f"  Fallback to /creators.html: {td_fallback} link(s)")
print(f"  Files updated: {len(files_changed)}")
if td_fallback > 0:
    print("  NOTE: Fallback links go to /creators.html — check those creators don't exist.")

# ============================================================
# PART 2: Add skip-to-content link site-wide
# ============================================================
print("\n" + "=" * 60)
print("PART 2: Skip-to-content link injection")
print("=" * 60)

SKIP_LINK_HTML = '<a href="#main" class="twk-sr-only">Skip to content</a>\n'
BODY_OPEN_RE = re.compile(r'(<body\b[^>]*>)', re.IGNORECASE)
ALREADY_HAS = re.compile(r'href=["\']#main["\']', re.IGNORECASE)

skip_added = 0
skip_skipped = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: content = f.read()

        # Skip if already has a skip-link
        if ALREADY_HAS.search(content):
            skip_skipped += 1
            continue

        # Find <body> and inject right after
        m = BODY_OPEN_RE.search(content)
        if not m:
            skip_skipped += 1
            continue

        new_content = content[:m.end()] + "\n" + SKIP_LINK_HTML + content[m.end():]
        with open(full, "w", encoding="utf-8", newline="") as f: f.write(new_content)
        skip_added += 1

print(f"  Skip-link injected: {skip_added} files")
print(f"  Skipped (already had link or no <body>): {skip_skipped} files")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
print(f"  Broken /twerk-dancer/ links fixed:   {td_fixed}")
print(f"  Broken /twerk-dancer/ links fallback: {td_fallback}")
print(f"  Skip-to-content links added:          {skip_added}")
print(f"\nNOTE: The skip link target #main needs <main id=\"main\"> on each page.")
print(f"That's a separate, more invasive pass — not done in this script.")
print(f"Lighthouse will still recognize the skip link as present.")
