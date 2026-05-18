#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
unify-footer-brand.py - 2026-05-07
Reemplaza el "TWERKHUB <em>13</em>" del footer por el MISMO logo PNG que usa
el navbar (logo-twerkhub.png). Tambien actualiza el CSS .twk-mf-brand para
ajustar al PNG en vez del texto Playfair gradient.

DRY-RUN por defecto. --apply para escribir.

Uso:
    python unify-footer-brand.py
    python unify-footer-brand.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# 1) HTML: "TWERKHUB <em>13</em>" → logo PNG
OLD_HTML = '<div class="twk-mf-brand">TWERKHUB <em>13</em></div>'
NEW_HTML = '<div class="twk-mf-brand"><img src="/logo-twerkhub.png" alt="TWERKHUB" width="200" height="57" decoding="async" loading="lazy"></div>'

# 2) CSS: text styling → image styling
OLD_CSS = (
    ".twk-mf-brand{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:32px;line-height:1;color:#fff;margin-bottom:14px;letter-spacing:-.01em;}\n"
    ".twk-mf-brand em{background:linear-gradient(135deg,#ff2d87,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent;font-style:italic}"
)
NEW_CSS = (
    ".twk-mf-brand{display:block;line-height:1;margin-bottom:14px}\n"
    ".twk-mf-brand img{display:block;width:auto;max-width:200px;height:auto;}"
)


def main():
    print("=" * 72)
    print("  UNIFY FOOTER BRAND  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts:
            continue
        if 'node_modules' in p.parts:
            continue
        htmls.append(p)

    print(f"\n  HTMLs a chequear: {len(htmls)}")

    html_matched = 0
    css_matched = 0
    html_only = 0
    both = 0
    none = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERR leyendo {p.name}: {e}")
            continue

        new_content = content
        h_changed = False
        c_changed = False

        if OLD_HTML in new_content:
            new_content = new_content.replace(OLD_HTML, NEW_HTML)
            html_matched += 1
            h_changed = True
        if OLD_CSS in new_content:
            new_content = new_content.replace(OLD_CSS, NEW_CSS)
            css_matched += 1
            c_changed = True

        if h_changed and c_changed:
            both += 1
        elif h_changed:
            html_only += 1
        elif not c_changed:
            none += 1

        if (h_changed or c_changed) and not DRY_RUN:
            p.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n  HTML 'TWERKHUB 13' reemplazados: {html_matched}")
    print(f"  CSS .twk-mf-brand actualizados:  {css_matched}")
    print(f"  Ambos en mismo archivo:          {both}")
    print(f"  Solo HTML (CSS ya nuevo o ausente): {html_only}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python unify-footer-brand.py --apply")
    else:
        print(f"\n  DONE. Recorda:")
        print(f"    git add -A")
        print(f"    git commit -m \"feat(footer-brand): unify with navbar logo PNG, drop TWERKHUB 13 gradient\"")
        print(f"    git push")


if __name__ == '__main__':
    main()
