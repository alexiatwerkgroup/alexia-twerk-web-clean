"""
TWERKHUB · UNIVERSAL PILL FIX

One-shot script that guarantees the token pill appears, sticky, in the
SAME exact spot on EVERY .html page on the site.

For every HTML file under the project root:
  1. Bumps the cache-bust version param for the 3 files that drive the pill
     so browsers + Service Worker fetch the new fixed versions:
       /assets/twerkhub-tokens.js          → ?v=20260506-p10
       /assets/twerkhub-ph-theme.css       → ?v=20260506-p21
       /assets/twerkhub-pill-into-nav.js   → ?v=20260506-p2
  2. Injects  <script defer src="/assets/twerkhub-pill-into-nav.js?v=...">
     right before </body> if it's missing.
  3. Removes any *previous* (older-versioned) pill-into-nav.js script tag
     so we don't end up with duplicates.

Idempotent. UTF-8 no BOM. Runs in seconds across ~1000 files.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))

TOKENS_VER  = "20260506-p10"
THEME_VER   = "20260506-p21"
PILL_VER    = "20260506-p2"

PILL_TAG = (
    f'<script defer src="/assets/twerkhub-pill-into-nav.js?v={PILL_VER}"></script>'
)

PATCHES = [
    (re.compile(r'/assets/twerkhub-tokens\.js\?v=[^"\'<>\s]+',        re.I),
     f'/assets/twerkhub-tokens.js?v={TOKENS_VER}'),
    (re.compile(r'/assets/twerkhub-ph-theme\.css\?v=[^"\'<>\s]+',     re.I),
     f'/assets/twerkhub-ph-theme.css?v={THEME_VER}'),
    (re.compile(r'/assets/twerkhub-pill-into-nav\.js\?v=[^"\'<>\s]+', re.I),
     f'/assets/twerkhub-pill-into-nav.js?v={PILL_VER}'),
]

# Match any existing pill-into-nav <script> tag (any version)
RE_EXISTING_PILL_TAG = re.compile(
    r'<script[^>]*twerkhub-pill-into-nav\.js[^>]*></script>\s*',
    re.I,
)

SKIP = (
    os.sep + ".git" + os.sep,
    os.sep + "node_modules" + os.sep,
    os.sep + "_supabase" + os.sep,
    os.sep + "_generator" + os.sep,
    os.sep + "_playlist_data" + os.sep,
    os.sep + "playlists-backup" + os.sep,
    os.sep + "scripts" + os.sep,
)


def patch(path):
    with open(path, "rb") as f:
        raw = f.read()
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False, "not-utf8"

    orig = txt
    log = []

    # Step 1: bump cache versions
    for pat, repl in PATCHES:
        n = txt
        txt = pat.sub(repl, txt)
        if n != txt:
            log.append("ver-bump")
            break  # only need to log once

    # Step 2: ensure pill-into-nav loader is injected exactly once.
    matches = RE_EXISTING_PILL_TAG.findall(txt)
    if len(matches) >= 1:
        # Already present (any version) — leave it (already version-bumped above)
        if len(matches) > 1:
            # Strip extras, keep first
            count = [0]
            def _keep_first(m):
                count[0] += 1
                return m.group(0) if count[0] == 1 else ""
            txt = RE_EXISTING_PILL_TAG.sub(_keep_first, txt)
            log.append("dedup-loader")
    else:
        # Inject before </body>
        if "</body>" in txt:
            txt = txt.replace("</body>", PILL_TAG + "\n</body>", 1)
            log.append("inject-loader")
        else:
            txt = txt + "\n" + PILL_TAG + "\n"
            log.append("append-loader")

    if txt != orig:
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))
        return True, ",".join(log) or "patched"
    return False, "noop"


def main():
    n_total, n_patched = 0, 0
    sample = []
    for dirpath, _dirs, files in os.walk(ROOT):
        if any(s in dirpath for s in SKIP):
            continue
        for name in files:
            if not name.endswith(".html"):
                continue
            full = os.path.join(dirpath, name)
            n_total += 1
            try:
                changed, log = patch(full)
                if changed:
                    n_patched += 1
                    if len(sample) < 10:
                        sample.append(f"  - {os.path.relpath(full, ROOT)}  [{log}]")
            except Exception as e:
                print(f"[error] {full}: {e}")

    print(f"[fix-pill] scanned={n_total}  patched={n_patched}")
    print(f"[fix-pill] versions: tokens.js→p10  ph-theme.css→p21  pill-into-nav.js→p2")
    if sample:
        print("[fix-pill] first patches:")
        print("\n".join(sample))
    print("[fix-pill] done. Verify with: git status && git diff --stat")


if __name__ == "__main__":
    main()
