"""
Inject the universal token-pill-into-nav loader on every HTML page.

For each .html file:
  - If <script src="/assets/twerkhub-pill-into-nav.js"...> is missing, insert
    it right before </body> (or at end if </body> not found).
  - Idempotent: skips files where the loader is already present.

UTF-8 no BOM. Skip the usual non-page folders.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))
LOADER_VER = "20260505-p1"
LOADER_TAG = (
    f'<script defer src="/assets/twerkhub-pill-into-nav.js?v={LOADER_VER}"></script>'
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

    if "twerkhub-pill-into-nav.js" in txt:
        return False, "already"

    if "</body>" in txt:
        new = txt.replace("</body>", LOADER_TAG + "\n</body>", 1)
    else:
        new = txt + "\n" + LOADER_TAG + "\n"

    if new == txt:
        return False, "noop"

    with open(path, "wb") as f:
        f.write(new.encode("utf-8"))
    return True, "injected"


def main():
    n_total, n_patched = 0, 0
    for dirpath, _dirs, files in os.walk(ROOT):
        if any(s in dirpath for s in SKIP):
            continue
        for name in files:
            if not name.endswith(".html"):
                continue
            full = os.path.join(dirpath, name)
            n_total += 1
            try:
                changed, _ = patch(full)
                if changed:
                    n_patched += 1
            except Exception as e:
                print(f"[error] {full}: {e}")
    print(f"[inject-pill] scanned={n_total}  injected={n_patched}")


if __name__ == "__main__":
    main()
