#!/usr/bin/env python3
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

TARGET_PAGES = [
    'playlist/index.html',
    'try-on-hot-leaks/index.html',
    'ttl-latin-models/index.html',
    'hottest-cosplay-fancam/index.html',
    'korean-girls-kpop-twerk/index.html',
]

THEATER_VERSION = 'v20260425-p14'
HEATMAP_VERSION = 'v20260425-p1'

THEATER_LOAD_RE = re.compile(
    r"loadOnce\(\s*['\"]/assets/twerkhub-pl-theater\.js\?v=[^'\"]+['\"]\s*,\s*['\"]twk-loader-pl-theater['\"]\s*\)\s*;"
)
HEATMAP_LOAD_RE = re.compile(
    r"loadOnce\(\s*['\"]/assets/twerkhub-heatmap\.js\?v=[^'\"]+['\"]\s*,\s*['\"]twk-loader-heatmap['\"]\s*\)\s*;"
)

def process(path):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        print(f"  SKIP (not found): {path}")
        return False
    with open(full, 'r', encoding='utf-8') as f:
        html = f.read()
    orig = html

    new_theater_call = "loadOnce('/assets/twerkhub-pl-theater.js?v=" + THEATER_VERSION + "','twk-loader-pl-theater');"
    new_heatmap_call = "loadOnce('/assets/twerkhub-heatmap.js?v=" + HEATMAP_VERSION + "','twk-loader-heatmap');"

    if THEATER_LOAD_RE.search(html):
        html = THEATER_LOAD_RE.sub(new_theater_call, html)
    else:
        print(f"  WARN: no theater loadOnce call in {path}, skipping")
        return False

    if HEATMAP_LOAD_RE.search(html):
        html = HEATMAP_LOAD_RE.sub(new_heatmap_call, html)
    else:
        html = html.replace(new_theater_call, new_theater_call + "\n  " + new_heatmap_call, 1)

    if html != orig:
        with open(full, 'w', encoding='utf-8', newline='') as f:
            f.write(html)
        print(f"  UPDATED: {path}")
        return True
    print(f"  no-change: {path}")
    return False

def main():
    print(f"Adding heatmap loader + bumping theater to {THEATER_VERSION}")
    print()
    changed = 0
    for p in TARGET_PAGES:
        if process(p):
            changed += 1
    print()
    print(f"Done. {changed}/{len(TARGET_PAGES)} files updated.")

if __name__ == '__main__':
    main()
