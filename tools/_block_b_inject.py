#!/usr/bin/env python3
"""
BLOCK B — Inyectar global-brand.js en las 6 paginas root que no lo tenian +
playlist-2/index.html (puntos 1, 4, 5, 6, 12 punch list).

Tambien bumpea el cache-bust query de global-brand.js en TODAS las paginas
que lo referencian, para que el browser recargue la version nueva.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MISSING = [
    '404.html',
    'account.html',
    'index.html',
    'membership.html',
    'oriental-final.html',
    'savage-twerk-video.html',
    'playlist-2/index.html',
]

# cache-bust para global-brand.js, global-i18n.js, online-count-global.js
BUST_RE = re.compile(r'(global-brand\.js)\?v=[^"\'>\s]*')
BUST2_RE = re.compile(r'(global-i18n\.js)\?v=[^"\'>\s]*')
BUST3_RE = re.compile(r'(online-count-global\.js)\?v=[^"\'>\s]*')
NEW_V = '?v=2026-04-18-b'

INJECT_BLOCK = (
    '\n<!-- Alexia Twerk global scripts (Master Directive nro 1 · Bloque B) -->\n'
    '<script defer src="/assets/global-brand.js' + NEW_V + '"></script>\n'
    '<script defer src="/assets/global-i18n.js' + NEW_V + '"></script>\n'
    '<script defer src="/assets/online-count-global.js' + NEW_V + '"></script>\n'
)

# Bump cache-bust in all HTML referencing the scripts
all_html: list[Path] = []
for pattern in ('*.html', 'playlist/*.html', 'playlist-2/*.html'):
    all_html.extend(sorted(ROOT.glob(pattern)))

bumped = 0
for fp in all_html:
    try:
        body = fp.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    new = BUST_RE.sub(r'\1' + NEW_V, body)
    new = BUST2_RE.sub(r'\1' + NEW_V, new)
    new = BUST3_RE.sub(r'\1' + NEW_V, new)
    if new != body:
        fp.write_text(new, encoding='utf-8')
        bumped += 1
print(f'Cache-bust bumped in {bumped} files.')

# Inject in the 6 pages missing it
injected = 0
for rel in MISSING:
    fp = ROOT / rel
    if not fp.exists():
        print(f'!! missing file: {rel}')
        continue
    body = fp.read_text(encoding='utf-8', errors='ignore')
    if 'global-brand.js' in body:
        # Already has it — only bump was needed
        continue
    # Inject before </body>
    if '</body>' in body:
        new = body.replace('</body>', INJECT_BLOCK + '</body>', 1)
    else:
        # fallback append
        new = body + INJECT_BLOCK
    fp.write_text(new, encoding='utf-8')
    injected += 1
    print(f'injected: {rel}')
print(f'Injected into {injected}/{len(MISSING)} files.')
