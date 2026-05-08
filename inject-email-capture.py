#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject-email-capture.py - 2026-05-07
Inyecta <script defer src="/assets/twerkhub-email-capture.js?v=..."> antes
de </body> en todas las HTMLs del repo (con marker para idempotencia).

DRY-RUN por defecto. --apply para escribir.

Uso:
    python inject-email-capture.py
    python inject-email-capture.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

VERSION = '20260507-ec1'
TAG = f'<script defer src="/assets/twerkhub-email-capture.js?v={VERSION}" data-twk-email-capture></script>'
MARKER_OPEN = '<!-- twk-email-capture:START -->'
MARKER_CLOSE = '<!-- twk-email-capture:END -->'
BLOCK = f'\n{MARKER_OPEN}\n{TAG}\n{MARKER_CLOSE}\n'


def main():
    print("=" * 72)
    print("  INJECT EMAIL CAPTURE  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts:
            continue
        if 'node_modules' in p.parts:
            continue
        # Saltamos pages "internas" donde no querés modal:
        # - account, profile, auth-callback, paid-content, admin-*
        if any(seg in p.name for seg in ['account.html', 'profile.html', 'auth-callback.html', 'admin-', 'paid-content.html']):
            continue
        htmls.append(p)

    print(f"\n  HTMLs target: {len(htmls)}")

    inserted = 0
    updated = 0
    skipped = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERR leyendo {p.name}: {e}")
            continue

        if MARKER_OPEN in content:
            # Ya inyectado: actualizar (replace block) si la versión cambió
            start = content.find(MARKER_OPEN)
            end = content.find(MARKER_CLOSE) + len(MARKER_CLOSE)
            if start >= 0 and end > start:
                old_block = content[start:end]
                if old_block.strip() == f'{MARKER_OPEN}\n{TAG}\n{MARKER_CLOSE}'.strip():
                    skipped += 1
                    continue
                new_content = content[:start] + f'{MARKER_OPEN}\n{TAG}\n{MARKER_CLOSE}' + content[end:]
                if not DRY_RUN:
                    p.write_text(new_content, encoding='utf-8', newline='\n')
                updated += 1
            continue

        # Insertar antes de </body>
        if '</body>' not in content:
            skipped += 1
            continue
        new_content = content.replace('</body>', BLOCK + '</body>', 1)
        if not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')
        inserted += 1

    print(f"\n  Inyectados (nuevos): {inserted}")
    print(f"  Actualizados (versión nueva): {updated}")
    print(f"  Saltados (ya al día): {skipped}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python inject-email-capture.py --apply")
    else:
        print(f"\n  DONE. Recordá:")
        print(f"    1) Correr el SQL de supabase-subscribers-schema.sql en Supabase")
        print(f"    2) Setear env vars en Cloudflare Pages → Settings → Environment variables:")
        print(f"       SUPABASE_URL = https://<tu-project>.supabase.co")
        print(f"       SUPABASE_ANON_KEY = <anon key>")


if __name__ == '__main__':
    main()
