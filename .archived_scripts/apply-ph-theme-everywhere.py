"""
Apply the PH-style theme to every HTML page on the site.

What it does to each .html file under the project root:
  1. Adds  twerkhub-ph-theme  to the <body> class list (if missing).
  2. Adds  <link rel="stylesheet" href="/assets/twerkhub-ph-theme.css?v=20260505-p16">
     in <head> after twerkhub-design-tokens.css (or before </head> as fallback).
  3. Appends  &family=Anton  to the Google Fonts URL (if missing).
  4. Re-writes the file in UTF-8 WITHOUT BOM (respects the SAGRADAS encoding rule).
  5. Idempotent: detects existing patches by string presence and skips them.

Skipped folders: .git, node_modules, _supabase, _generator, _playlist_data,
                 playlists-backup, scripts/.

Usage from PowerShell (in the project root):
    python apply-ph-theme-everywhere.py

Output: per-file log + final summary.
"""
import os
import re

ROOT = os.path.abspath(os.path.dirname(__file__))
if not os.path.exists(os.path.join(ROOT, "index.html")):
    ROOT = r"C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"

PH_VER = "20260505-p16"
PH_LINK = f'<link rel="stylesheet" href="/assets/twerkhub-ph-theme.css?v={PH_VER}">'
PH_CLASS = "twerkhub-ph-theme"
ANTON_QUERY = "&family=Anton"

SKIP_DIRS = (
    os.sep + ".git" + os.sep,
    os.sep + "node_modules" + os.sep,
    os.sep + "_supabase" + os.sep,
    os.sep + "_generator" + os.sep,
    os.sep + "_playlist_data" + os.sep,
    os.sep + "playlists-backup" + os.sep,
    os.sep + "scripts" + os.sep,
    os.sep + "outputs" + os.sep,
)

RE_BODY_CLASS  = re.compile(r'<body([^>]*?)\bclass="([^"]*?)"', re.IGNORECASE)
RE_BODY_NOCLS  = re.compile(r'<body([^>]*?)>', re.IGNORECASE)
RE_DESIGN_CSS  = re.compile(r'<link[^>]+twerkhub-design-tokens\.css[^>]*>', re.IGNORECASE)
RE_FONTS_HREF  = re.compile(r'(href="https://fonts\.googleapis\.com/css2\?[^"]+)"', re.IGNORECASE)


def patch_html(path):
    with open(path, "rb") as f:
        raw = f.read()

    bom_stripped = False
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
        bom_stripped = True

    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False, ["[skip] not utf-8"]

    orig = txt
    log = []
    if bom_stripped:
        log.append("strip-bom")

    if PH_CLASS not in txt:
        m = RE_BODY_CLASS.search(txt)
        if m:
            new_attrs = f'<body{m.group(1)}class="{m.group(2)} {PH_CLASS}"'
            txt = txt[:m.start()] + new_attrs + txt[m.end():]
            log.append("body-class+")
        else:
            m2 = RE_BODY_NOCLS.search(txt)
            if m2:
                new_open = f'<body{m2.group(1)} class="{PH_CLASS}">'
                txt = txt[:m2.start()] + new_open + txt[m2.end():]
                log.append("body-class-new")

    if "twerkhub-ph-theme.css" not in txt:
        m = RE_DESIGN_CSS.search(txt)
        if m:
            txt = txt[:m.end()] + "\n" + PH_LINK + txt[m.end():]
            log.append("link-after-design")
        elif "</head>" in txt:
            txt = txt.replace("</head>", PH_LINK + "\n</head>", 1)
            log.append("link-before-head")

    if "family=Anton" not in txt:
        m = RE_FONTS_HREF.search(txt)
        if m:
            new_href = m.group(1) + ANTON_QUERY + '"'
            txt = txt[:m.start()] + new_href + txt[m.end():]
            log.append("fonts+anton")

    if txt != orig:
        with open(path, "wb") as f:
            f.write(txt.encode("utf-8"))
        return True, log

    return False, []


def should_skip(path):
    norm = path.replace("/", os.sep)
    return any(s in norm for s in SKIP_DIRS)


def walk_html(root):
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if name.endswith(".html"):
                full = os.path.join(dirpath, name)
                if not should_skip(full):
                    yield full


def main():
    print(f"[ph-theme] root = {ROOT}")
    n_total, n_changed = 0, 0
    sample = []
    for path in walk_html(ROOT):
        n_total += 1
        try:
            changed, log = patch_html(path)
        except Exception as e:
            print(f"[error] {path}: {e}")
            continue
        if changed:
            n_changed += 1
            if len(sample) < 10:
                sample.append(f"  - {os.path.relpath(path, ROOT)}  [{','.join(log)}]")
    print(f"[ph-theme] scanned: {n_total}  patched: {n_changed}  unchanged: {n_total-n_changed}")
    if sample:
        print("[ph-theme] first patches:")
        print("\n".join(sample))
    print("[ph-theme] done. Verify with: git status && git diff --stat")


if __name__ == "__main__":
    main()
