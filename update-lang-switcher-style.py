#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
update-lang-switcher-style.py - 2026-05-07
Propaga el nuevo diseño del switcher de idiomas (gradiente pink->orange + chevron
verde animado en is-active, igual al pill INFINITE LIST) a TODAS las HTMLs del repo.

Reemplaza el bloque CSS del switcher en una sola pasada.
DRY-RUN por defecto. --apply para escribir.

Uso:
    python update-lang-switcher-style.py
    python update-lang-switcher-style.py --apply
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

OLD = (
    ".twk-nav-v1-lang{display:inline-flex;align-items:center;gap:1px;margin-left:6px;padding:3px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}\n"
    ".twk-nav-v1-lang a{padding:5px 8px;border-radius:5px;color:rgba(230,230,240,.62);text-decoration:none;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.08em;line-height:1;transition:color .15s,background .15s}\n"
    ".twk-nav-v1-lang a:hover{color:#fff;background:rgba(255,255,255,.05)}\n"
    ".twk-nav-v1-lang a.is-active{color:#fff;background:rgba(255,46,135,.18);border:1px solid rgba(255,46,135,.35)}"
)

NEW = (
    ".twk-nav-v1-lang{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:3px;border-radius:999px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}\n"
    ".twk-nav-v1-lang a{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;color:rgba(230,230,240,.55);text-decoration:none;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9.5px;font-weight:800;letter-spacing:.18em;line-height:1;text-transform:uppercase;transition:color .15s,background .15s,box-shadow .25s,transform .2s}\n"
    ".twk-nav-v1-lang a:hover{color:#fff;background:rgba(255,255,255,.06);transform:translateY(-1px)}\n"
    ".twk-nav-v1-lang a.is-active{color:#fff;padding:6px 12px;background:linear-gradient(135deg,#ff2d87,#ff9000);box-shadow:0 4px 12px rgba(255,45,135,.4);letter-spacing:.22em;border:0}\n"
    ".twk-nav-v1-lang a.is-active::before{content:\"\";display:inline-block;width:11px;height:11px;margin-right:5px;margin-top:-2px;vertical-align:middle;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231ee08f' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 15 12 9 18 15'/></svg>\");background-repeat:no-repeat;background-size:contain;filter:drop-shadow(0 0 5px rgba(30,224,143,.85)) drop-shadow(0 0 10px rgba(30,224,143,.45));animation:twk-lang-pulse 1.3s ease-in-out infinite;will-change:transform,opacity}\n"
    "@keyframes twk-lang-pulse{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(-3px);opacity:.5}}"
)


def main():
    print("=" * 72)
    print("  UPDATE LANG SWITCHER STYLE  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    # Find every .html EXCEPT _deleted/ backup folder
    htmls = []
    for p in REPO.rglob('*.html'):
        if '_deleted' in p.parts:
            continue
        if 'node_modules' in p.parts:
            continue
        htmls.append(p)

    print(f"\n  HTMLs a chequear: {len(htmls)}")

    matched = 0
    updated = 0
    already_new = 0
    for p in htmls:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ERR leyendo {p.name}: {e}")
            continue

        if OLD in content:
            matched += 1
            new_content = content.replace(OLD, NEW)
            if not DRY_RUN:
                p.write_text(new_content, encoding='utf-8', newline='\n')
            updated += 1
        elif "linear-gradient(135deg,#ff2d87,#ff9000);box-shadow:0 4px 12px rgba(255,45,135,.4)" in content and ".twk-nav-v1-lang a.is-active" in content:
            already_new += 1

    print(f"\n  Encontrados con CSS viejo:  {matched}")
    print(f"  {'Actualizados' if not DRY_RUN else 'A actualizar'}: {updated}")
    print(f"  Ya tienen el CSS nuevo:    {already_new}")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python update-lang-switcher-style.py --apply")
    else:
        print(f"\n  DONE. Recorda: git add -A && git commit && git push")


if __name__ == '__main__':
    main()
