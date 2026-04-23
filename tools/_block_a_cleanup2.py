#!/usr/bin/env python3
"""
BLOCK A · Paso 2 — Limpia el <style id="hot-copy-styles">...</style> orfanado
que quedó en 315 playlist pages después de purgar los <section> robot.
También elimina meta-data "hot-copy:v1" sentinel si quedó.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STYLE_RE = re.compile(
    r'\n?\s*<style[^>]*id="hot-copy-styles"[^>]*>.*?</style>\s*\n?',
    re.DOTALL | re.IGNORECASE
)
SENTINEL_RE = re.compile(r'<!--\s*hot-copy:v1\s*-->\s*\n?')

targets = []
for pattern in ('*.html', 'playlist/*.html', 'playlist-2/*.html'):
    targets.extend(sorted(ROOT.glob(pattern)))

changed = 0
for fp in targets:
    try:
        body = fp.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        print(f'!! skip {fp}: {e}')
        continue
    new = STYLE_RE.sub('\n', body)
    new = SENTINEL_RE.sub('', new)
    if new != body:
        fp.write_text(new, encoding='utf-8')
        changed += 1
print(f'Block A step 2: touched {changed}/{len(targets)} files.')
