#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject-telegram-cta.py - 2026-05-07
Agrega CTA de Telegram en:
  1. Bio CTAs del home (junto a OnlyFans, Discord, Patreon)
  2. Footer "social links" (donde sea relevante en cada HTML)
  3. Footer general de twerkhub-bundle.css (para todas las pages)

USO:
  Antes de correr, EDITAR la constante TELEGRAM_URL al final con tu link real.
  Ejemplo: TELEGRAM_URL = 'https://t.me/twerkhub_official'

  python inject-telegram-cta.py            # dry-run
  python inject-telegram-cta.py --apply    # aplica
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# ════════════════════════════════════════════════════════════════════════
# ⚠️ EDITAR ANTES DE CORRER --apply
# ════════════════════════════════════════════════════════════════════════
TELEGRAM_URL = 'https://t.me/Alexia_twerk'  # @Alexia_Twerk_Group
# ════════════════════════════════════════════════════════════════════════


# ─── 1) Bio CTAs del home (index.html) ─────────────────────────────────
OLD_BIO = '<a class="twerkhub-btn twerkhub-btn-ghost" href="https://www.patreon.com/Alexia_Twerk" target="_blank" rel="noopener">Patreon</a>'
NEW_BIO = (
    '<a class="twerkhub-btn twerkhub-btn-ghost" href="https://www.patreon.com/Alexia_Twerk" target="_blank" rel="noopener">Patreon</a>\n'
    f'    <a class="twerkhub-btn twerkhub-btn-primary" href="{TELEGRAM_URL}" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#229ED9,#28a8e0);">Telegram channel →</a>'
)


# ─── 2) Mega-footer (todas las HTMLs que tienen el footer) ─────────────
# Buscamos un patrón estable del footer y agregamos el link
FOOTER_OLD = '<a href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener">Discord</a>'
FOOTER_NEW = (
    '<a href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener">Discord</a>\n'
    f'                <a href="{TELEGRAM_URL}" target="_blank" rel="noopener">Telegram</a>'
)


def main():

    print("=" * 72)
    print("  INJECT TELEGRAM CTA  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print(f"  URL: {TELEGRAM_URL}")
    print("=" * 72)

    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts:
            continue
        if 'node_modules' in p.parts:
            continue
        htmls.append(p)

    print(f"\n  HTMLs a chequear: {len(htmls)}")

    bio_changed = 0
    footer_changed = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERR leyendo {p.name}: {e}")
            continue

        new_content = content
        local_changed = False

        # 1) Bio CTAs (solo donde aplique, ej. index)
        if OLD_BIO in new_content and TELEGRAM_URL not in new_content:
            new_content = new_content.replace(OLD_BIO, NEW_BIO)
            bio_changed += 1
            local_changed = True

        # 2) Footer
        if FOOTER_OLD in new_content and ('"' + TELEGRAM_URL + '"') not in new_content:
            new_content = new_content.replace(FOOTER_OLD, FOOTER_NEW)
            footer_changed += 1
            local_changed = True

        if local_changed and not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  Bio CTAs actualizadas:  {bio_changed}")
    print(f"  Footers actualizados:   {footer_changed}")

    if DRY_RUN:
        print(f"\n  Para aplicar:")
        print(f"    1) Editá TELEGRAM_URL en este archivo con tu URL real")
        print(f"    2) python inject-telegram-cta.py --apply")
    else:
        print(f"\n  DONE.")


if __name__ == '__main__':
    main()
