"""
Bump cache-bust version for the 2 files that drive the token pill so the
fix actually takes effect (Service Worker + browser cache won't serve the
old broken versions):

  /assets/twerkhub-tokens.js     ?v=20260425-p8  →  ?v=20260506-p9
  /assets/twerkhub-ph-theme.css  ?v=*            →  ?v=20260506-p20

UTF-8 no BOM. Idempotent.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))

PATCHES = [
    (
        re.compile(r'/assets/twerkhub-tokens\.js\?v=[^"\'<>\s]+', re.IGNORECASE),
        '/assets/twerkhub-tokens.js?v=20260506-p11',
    ),
    (
        re.compile(r'/assets/twerkhub-ph-theme\.css\?v=[^"\'<>\s]+', re.IGNORECASE),
        '/assets/twerkhub-ph-theme.css?v=20260506-p20',
    ),
]

SKIP = (
    os.sep + ".git" + os.sep,
    os.sep + "node_modules" + os.sep,
    os.sep + "_supabase" + os.sep,
)


def patch(path):
    with open(path, "rb") as f:
        raw = f.read()
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False
    new = txt
    for pat, repl in PATCHES:
        new = pat.sub(repl, new)
    if new != txt:
        with open(path, "wb") as f:
            f.write(new.encode("utf-8"))
        return True
    return False


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
                if patch(full):
                    n_patched += 1
            except Exception as e:
                print(f"[error] {full}: {e}")
    print(f"[bump-pill] scanned={n_total}  patched={n_patched}")
    print(f"[bump-pill] new vers: tokens.js→p9 · ph-theme.css→p20")


if __name__ == "__main__":
    main()
