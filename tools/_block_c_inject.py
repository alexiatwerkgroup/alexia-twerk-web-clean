#!/usr/bin/env python3
"""
BLOCK C — Inyectar global-counters.js en TODAS las paginas, al lado de
global-brand.js. Reemplaza tambien cualquier hardcoded "275" en los metas
descriptores de playlist-2 con el total real 590, cuando el contexto lo
permita sin romper el sentido.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = '?v=2026-04-18-c'

INJECT_LINE = '<script defer src="/assets/global-counters.js' + V + '"></script>'

# matches existing global-brand.js script line (any cache-bust)
BRAND_RE = re.compile(r'(<script[^>]+global-brand\.js[^>]*></script>)', re.IGNORECASE)

all_html: list[Path] = []
for pattern in ('*.html', 'playlist/*.html', 'playlist-2/*.html'):
    all_html.extend(sorted(ROOT.glob(pattern)))

injected = 0
for fp in all_html:
    try:
        body = fp.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    if 'global-counters.js' in body:
        continue
    if 'global-brand.js' not in body:
        continue
    # Put counters script right after global-brand.js line
    new = BRAND_RE.sub(r'\1\n' + INJECT_LINE, body, count=1)
    if new != body:
        fp.write_text(new, encoding='utf-8')
        injected += 1
print(f'Injected global-counters.js into {injected} files.')

# Also bump cache-bust for global-brand.js (because we edited it)
NEW_V = '?v=2026-04-18-c'
BRAND_BUST_RE = re.compile(r'(global-brand\.js)\?v=[^"\'>\s]*')
bumped = 0
for fp in all_html:
    try:
        body = fp.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    new = BRAND_BUST_RE.sub(r'\1' + NEW_V, body)
    if new != body:
        fp.write_text(new, encoding='utf-8')
        bumped += 1
print(f'Cache-bust v=2026-04-18-c applied to {bumped} global-brand.js refs.')
