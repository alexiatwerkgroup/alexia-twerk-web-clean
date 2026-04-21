#!/usr/bin/env python3
"""
BLOCK A — Cleanup masivo pre-launch (Master Directive nro 1, puntos 8/10/11).

Qué hace:
  1. Resuelve merge conflicts <<<<<<< HEAD ... ======= ... >>>>>>> en todos los HTML
     tomando SIEMPRE la versión "incoming" (la que purgó los bloques robot).
  2. Elimina cualquier <section class="hot-seo-block">...</section> legacy residual.
  3. Elimina cualquier <section class="hot-faq">...</section> legacy residual.
  4. Elimina el <section class="seo-block">...</section> original (si quedó).
  5. Elimina footer "Updated March 10, 2026 · List 2 coming soon".
  6. Elimina <a class="btn" href="index.html...">Playlist Index</a> (botón robot).
  7. Elimina <a class="btn" href="...">Playlist Index</a> dentro del .stats-wrap o .footer-links.
  8. Limpia posibles líneas en blanco múltiples que queden.

Output: cuántos archivos tocó. Idempotente.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# === 1. Merge conflicts — take "incoming" side ===
MERGE_RE = re.compile(
    r'<<<<<<< [^\n]*\n'      # start
    r'(?:.*?\n)*?'           # head content (will drop)
    r'=======\n'
    r'(.*?\n)'               # incoming content (keep)
    r'(?:.*?\n)*?'           # optionally more incoming
    r'>>>>>>> [^\n]*\n',
    re.DOTALL
)

def resolve_conflicts(text: str) -> tuple[str, int]:
    """Replace each <<<<<<< HEAD ... ======= ... >>>>>>> block with the incoming side."""
    count = 0
    result = []
    i = 0
    while True:
        start = text.find('<<<<<<< ', i)
        if start == -1:
            result.append(text[i:])
            break
        # keep everything before the conflict
        result.append(text[i:start])
        # find end of the <<<<<<< line
        eol1 = text.find('\n', start)
        if eol1 == -1:
            result.append(text[start:])
            break
        # find =======
        sep = text.find('\n=======\n', eol1)
        if sep == -1:
            # malformed — keep as-is
            result.append(text[start:])
            break
        # find >>>>>>>
        end_marker = text.find('\n>>>>>>> ', sep)
        if end_marker == -1:
            result.append(text[start:])
            break
        eol_end = text.find('\n', end_marker + 1)
        if eol_end == -1:
            eol_end = len(text)
        # incoming side content between =======\n and \n>>>>>>>
        incoming = text[sep + len('\n=======\n'): end_marker]
        # reconstruct: ensure a single newline in the output
        result.append(incoming)
        # advance past the conflict (include trailing newline)
        i = eol_end + 1
        count += 1
    return ''.join(result), count


# === 2-7. Block deletions ===
BLOCK_PATTERNS = [
    # hot-seo-block
    re.compile(r'\n?\s*<section[^>]*class="[^"]*hot-seo-block[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # hot-faq
    re.compile(r'\n?\s*<section[^>]*class="[^"]*hot-faq[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # legacy seo-block
    re.compile(r'\n?\s*<section[^>]*class="[^"]*\bseo-block[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # page-faq
    re.compile(r'\n?\s*<section[^>]*class="[^"]*page-faq[^"]*"[^>]*>.*?</section>\s*\n?', re.DOTALL | re.IGNORECASE),
    # Footer "Updated March ..."
    re.compile(r'\n?\s*<div[^>]*>\s*Updated\s+March\s+10[^<]*</div>\s*\n?', re.IGNORECASE),
    # "Playlist Index" button in footer
    re.compile(r'\n?\s*<a[^>]*class="[^"]*btn[^"]*"[^>]*>\s*Playlist\s+Index\s*</a>\s*\n?', re.IGNORECASE),
    # generic <a>Playlist Index</a>
    re.compile(r'\n?\s*<a[^>]*>\s*Playlist\s+Index\s*</a>\s*\n?', re.IGNORECASE),
]

# empty .footer-links, .stats-wrap, .btn-row that are now dangling
EMPTY_WRAPPERS = [
    re.compile(r'<div class="footer-links">\s*</div>', re.IGNORECASE),
    re.compile(r'<div class="stats-wrap">\s*</div>', re.IGNORECASE),
    re.compile(r'<div class="btn-row">\s*</div>', re.IGNORECASE),
]

WHITESPACE_RE = re.compile(r'\n{4,}')


def clean(text: str) -> tuple[str, bool]:
    original = text
    text, n = resolve_conflicts(text)
    for pat in BLOCK_PATTERNS:
        text = pat.sub('\n', text)
    for pat in EMPTY_WRAPPERS:
        text = pat.sub('', text)
    text = WHITESPACE_RE.sub('\n\n', text)
    return text, text != original


def main() -> int:
    targets: list[Path] = []
    for pattern in ('*.html', 'playlist/*.html', 'playlist-2/*.html'):
        targets.extend(sorted(ROOT.glob(pattern)))

    changed = 0
    for fp in targets:
        try:
            body = fp.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            print(f'!! skip {fp}: {e}')
            continue
        new_body, did = clean(body)
        if did:
            fp.write_text(new_body, encoding='utf-8')
            changed += 1
    print(f'Block A cleanup: touched {changed}/{len(targets)} files.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
