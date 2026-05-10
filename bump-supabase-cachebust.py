"""
TWERKHUB · STOP ALL SUPABASE EGRESS

Two-step neutralization across the whole site:

1. Bump the cache-bust version param for /assets/supabase-config.js everywhere
   so browsers + the Service Worker fetch the new STUB file (the file
   itself was already rewritten to a fake client; this forces fresh download).

2. Neutralize hardcoded direct Supabase init in HTML files.
   ~10 pages (recommend.html, recommended-videos.html, several playlist
   pages) bypass supabase-config.js and call createClient() directly with the
   hardcoded URL. We replace the URL with an empty string so the SDK fails
   to init without making any network request.

Idempotent. UTF-8 no BOM.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))
NEW_VER = "20260505-p9"
NEW_PATH = f"/assets/supabase-config.js?v={NEW_VER}"

RE_VER = re.compile(r'/assets/supabase-config\.js\?v=[^"\'<>\s]+', re.IGNORECASE)
# Hardcoded URL — match in single OR double quotes
RE_HARDCODED_URL = re.compile(
    r"""(['"])https://vieqniahusdrfkpcuqsn\.supabase\.co\1""",
    re.IGNORECASE,
)

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
        return False, []

    orig = txt
    log = []
    new = RE_VER.sub(NEW_PATH, txt)
    if new != txt:
        log.append("ver-bump")
        txt = new

    new = RE_HARDCODED_URL.sub('""', txt)
    if new != txt:
        log.append("kill-hardcoded-url")
        txt = new

    if txt != orig:
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))
        return True, log
    return False, []


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
                    if len(sample) < 12:
                        sample.append(f"  - {os.path.relpath(full, ROOT)}  [{','.join(log)}]")
            except Exception as e:
                print(f"[error] {full}: {e}")

    print(f"[bump] scanned={n_total}  patched={n_patched}  new_ver={NEW_VER}")
    if sample:
        print("[bump] first patches:")
        print("\n".join(sample))
    print("[bump] done. Verify with: git status && git diff --stat")


if __name__ == "__main__":
    main()
