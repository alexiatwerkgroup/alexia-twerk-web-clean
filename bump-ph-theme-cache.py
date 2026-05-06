"""
Bump the cache-bust version param for /assets/twerkhub-ph-theme.css across
all HTML pages so browsers fetch the cleaned-up CSS immediately (the file
content was rewritten — without bumping, SW serves the cached old version
and the user keeps seeing the broken pill).

Replaces:
  /assets/twerkhub-ph-theme.css?v=*
With:
  /assets/twerkhub-ph-theme.css?v=20260506-p20

UTF-8 no BOM. Idempotent.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))
NEW_VER = "20260506-p22"
NEW_PATH = f"/assets/twerkhub-ph-theme.css?v={NEW_VER}"
RE_VER = re.compile(r'/assets/twerkhub-ph-theme\.css\?v=[^"\'<>\s]+', re.IGNORECASE)

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
    new = RE_VER.sub(NEW_PATH, txt)
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
    print(f"[bump] scanned={n_total}  patched={n_patched}  new_ver={NEW_VER}")


if __name__ == "__main__":
    main()
