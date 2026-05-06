"""
Purge the legacy /premium-cosplay-fancam.html test page from the site.

Steps:
  1. Replace every  href=".../premium-cosplay-fancam(.html)?"  →  href="/hottest-cosplay-fancam/"
  2. Strip the URL from sitemap.xml + sitemap-index.xml + sitemap-videos.xml if listed.
  3. Delete  premium-cosplay-fancam.html  from the project root.

Idempotent: re-running after the file is gone is a no-op for the link replacement.

The 301 redirect in _redirects + vercel.json must be added separately so external
links (Google index, social shares) don't 404 after deploy.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.dirname(__file__))
TARGET = "premium-cosplay-fancam"
REPLACE_HREF = "/hottest-cosplay-fancam/"
DEAD_FILE = os.path.join(ROOT, "premium-cosplay-fancam.html")

SKIP_DIRS = (
    os.sep + ".git" + os.sep,
    os.sep + "node_modules" + os.sep,
    os.sep + "_supabase" + os.sep,
    os.sep + "_generator" + os.sep,
    os.sep + "_playlist_data" + os.sep,
    os.sep + "playlists-backup" + os.sep,
    os.sep + "scripts" + os.sep,
)

# href="...premium-cosplay-fancam(.html)?(#frag)?(?qs)?"
RE_HREF = re.compile(
    r'href="(?:/?)'
    + re.escape(TARGET)
    + r'(?:\.html)?(?:[#?][^"]*)?"',
    re.IGNORECASE,
)
# Bare URL inside JSON-LD or meta tags
RE_BARE = re.compile(
    r'(?:/|alexiatwerkgroup\.com/)' + re.escape(TARGET) + r'(?:\.html)?\b',
    re.IGNORECASE,
)


def patch_file(path):
    with open(path, "rb") as f:
        raw = f.read()
    bom = raw[:3] == b"\xef\xbb\xbf"
    if bom:
        raw = raw[3:]
    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False, "not-utf8"

    orig = txt
    # 1. href in HTML
    txt = RE_HREF.sub(f'href="{REPLACE_HREF}"', txt)
    # 2. bare URL in JSON-LD / OG / canonical (rewrites to canonical equivalent)
    txt = RE_BARE.sub("/hottest-cosplay-fancam/", txt)

    if txt != orig:
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))
        return True, "patched"
    return False, "skip"


def patch_xml(path):
    """Drop <url><loc>.../premium-cosplay-fancam...</loc>...</url> from sitemaps."""
    if not os.path.isfile(path):
        return False, "missing"
    with open(path, "rb") as f:
        raw = f.read()
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
    txt = raw.decode("utf-8", errors="replace")
    orig = txt
    # Remove the entire <url> block that contains premium-cosplay-fancam
    pattern = re.compile(
        r"\s*<url>(?:(?!</url>).)*?" + re.escape(TARGET) + r"(?:(?!</url>).)*?</url>",
        re.DOTALL | re.IGNORECASE,
    )
    txt = pattern.sub("", txt)
    if txt != orig:
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))
        return True, "purged"
    return False, "noref"


def should_skip(path):
    norm = path.replace("/", os.sep)
    return any(s in norm for s in SKIP_DIRS)


def walk_html(root):
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith((".html", ".htm")):
                full = os.path.join(dirpath, name)
                if not should_skip(full):
                    yield full


def main():
    print(f"[purge] target = {TARGET}")
    print(f"[purge] root   = {ROOT}")

    # 1. Patch HTML hrefs + bare URLs
    n_files, n_patched = 0, 0
    for path in walk_html(ROOT):
        n_files += 1
        changed, _ = patch_file(path)
        if changed:
            n_patched += 1
    print(f"[purge] HTML  scanned={n_files}  patched={n_patched}")

    # 2. Sitemaps
    for sm in ("sitemap.xml", "sitemap-index.xml", "sitemap-videos.xml", "sitemap-images.xml"):
        full = os.path.join(ROOT, sm)
        changed, status = patch_xml(full)
        print(f"[purge] {sm}: {status}")

    # 3. Delete the dead file
    if os.path.isfile(DEAD_FILE):
        os.remove(DEAD_FILE)
        print(f"[purge] deleted: premium-cosplay-fancam.html")
    else:
        print(f"[purge] dead file already absent")

    print("[purge] done. Verify with: git status && git diff --stat")
    print("[purge] Don't forget: add 301 in _redirects + vercel.json (see manual step)")


if __name__ == "__main__":
    main()
