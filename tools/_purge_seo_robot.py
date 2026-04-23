#!/usr/bin/env python3
"""
Master Directive nro 1 — Corrección #1:
Purgar bloque SEO robot-cocina de TODAS las páginas.

Elimina:
- <section class="hot-seo-block">...</section>
- <section class="hot-faq">...</section>
- <div>Updated March 10, 2026 · List 2 coming soon</div>
- "Why this clip stands out" bloques legacy si quedan
- "Key moments" estructuras legacy

Cambio mínimo. No toca layout ni CSS. Solo remueve los bloques literales.
"""
import os, re, sys
from pathlib import Path

ROOT = Path('/sessions/funny-trusting-curie/mnt/alexia-twerk-web-clean')

PATTERNS = [
    # Sections con clase específica
    re.compile(r'\n?\s*<section[^>]*class="[^"]*hot-seo-block[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    re.compile(r'\n?\s*<section[^>]*class="[^"]*hot-faq[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # Footer "Updated March 10, 2026 · List 2 coming soon"
    re.compile(r'\n?\s*<div[^>]*>Updated March 10,?\s*2026\s*·\s*List 2 coming soon</div>\s*\n?', re.IGNORECASE),
    re.compile(r'\n?\s*<div[^>]*>\s*Updated March 10[^<]*coming soon\s*</div>\s*\n?', re.IGNORECASE),
    # Legacy seccion "Why this clip stands out" si quedó suelta
    re.compile(r'\n?\s*<section[^>]*class="[^"]*why-clip[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # h2 "Why this clip stands out" sueltos
    re.compile(r'\n?\s*<h2[^>]*>\s*Why this clip stands out\s*</h2>\s*\n?', re.IGNORECASE),
]

targets = []
# Todos los html del root + subdirs relevantes
for pattern in ['*.html', 'playlist/*.html', 'playlist-2/*.html']:
    targets.extend(sorted(ROOT.glob(pattern)))

changed = 0
total_removed_bytes = 0

for fp in targets:
    try:
        original = fp.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        print(f'skip {fp}: {e}')
        continue
    mod = original
    for pat in PATTERNS:
        mod = pat.sub('', mod)
    if mod != original:
        fp.write_text(mod, encoding='utf-8')
        diff = len(original) - len(mod)
        total_removed_bytes += diff
        changed += 1

print(f'Files changed: {changed}/{len(targets)}')
print(f'Total bytes removed: {total_removed_bytes:,}')
