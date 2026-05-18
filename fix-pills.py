#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-pills.py - 2026-05-06
Aplica 4 fixes al repo alexia-twerk-web-clean:
  1. CSS LIVE pill carpet-bomb (28x130 identico a TOKENS pill)
  2. membership.html: 891 -> live counter sync, 3 doors -> 4 doors
  3. Inyeccion del widget Chaturbate affiliate en TODAS las paginas
  4. Cache bump CSS p?? -> p29, JS pill-into-nav p?? -> p7

Uso (corre desde la raiz del repo):
    python fix-pills.py            # aplica fixes
    python fix-pills.py --push     # aplica + git commit + git push

Idempotente: si ya esta aplicado no hace nada.
"""
import os
import re
import subprocess
import sys
from pathlib import Path


def read_u8(path):
    return Path(path).read_text(encoding="utf-8")


def write_u8(path, content):
    content = content.replace("\r\n", "\n")
    Path(path).write_text(content, encoding="utf-8", newline="\n")


def main():
    push = "--push" in sys.argv

    print()
    print("=== TWERKHUB FIX PILLS + MEMBERSHIP + CB PROMO ===")
    print(f"cwd: {Path.cwd()}")
    print()

    if not Path("index.html").exists() or not Path("assets").is_dir():
        print("ERROR: corre desde la raiz del repo (donde esta index.html)")
        sys.exit(1)

    # ------------------------------------------------------------------
    # FIX 1: CSS LIVE pill carpet-bomb (append con marker para idempotencia)
    # ------------------------------------------------------------------
    print("[1/4] CSS LIVE pill carpet-bomb...")
    css_path = "assets/twerkhub-ph-theme.css"
    css = read_u8(css_path)

    marker = "/* TWK-CB-CARPET-BOMB-2026-05-06 */"
    new_rule = "\n\n" + marker + "\n"
    new_rule += "body.twerkhub-ph-theme .twk-nav-v1-live,\n"
    new_rule += "body.twerkhub-ph-theme #twk-nav-v1-live {\n"
    new_rule += "  height: 28px !important;\n"
    new_rule += "  min-width: 130px !important;\n"
    new_rule += "  box-sizing: border-box !important;\n"
    new_rule += "  padding: 0 12px !important;\n"
    new_rule += "  line-height: 1 !important;\n"
    new_rule += "  display: inline-flex !important;\n"
    new_rule += "  align-items: center !important;\n"
    new_rule += "  justify-content: center !important;\n"
    new_rule += "  flex-shrink: 0 !important;\n"
    new_rule += "  white-space: nowrap !important;\n"
    new_rule += "  gap: 7px !important;\n"
    new_rule += "}\n"

    if marker in css:
        print("      ya parcheado (idempotente)")
    else:
        css = css.rstrip() + new_rule
        write_u8(css_path, css)
        print("      OK: LIVE pill 28x130 con !important al final del CSS")

    # ------------------------------------------------------------------
    # FIX 2: membership.html
    # ------------------------------------------------------------------
    print("[2/4] membership.html...")
    mbh_path = "membership.html"
    if Path(mbh_path).exists():
        html = read_u8(mbh_path)
        changed = False

        old_stat = '<div class="mbh__stat"><span class="dot"></span>891 members online · 3 doors below</div>'
        new_stat = '<div class="mbh__stat"><span class="dot"></span><span id="mbh-members">412</span> MEMBERS ONLINE · 4 DOORS BELOW</div>'

        # Probar tambien con el char punto medio sin escape
        old_stat_alt = '<div class="mbh__stat"><span class="dot"></span>891 members online · 3 doors below</div>'

        if old_stat in html:
            html = html.replace(old_stat, new_stat)
            print("      OK: hero stat sincronizado + 4 doors")
            changed = True
        elif old_stat_alt in html:
            html = html.replace(old_stat_alt, new_stat)
            print("      OK: hero stat sincronizado + 4 doors (alt)")
            changed = True
        elif 'id="mbh-members"' in html:
            print("      hero stat ya parcheado")
        else:
            print("      WARN: no encontre el texto exacto del stat")

        old_js = (
            "try{var n=document.getElementById('twk-nav-v1-live-n');"
            "if(n){var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);"
            "if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);"
            "n.textContent=v;"
            "function tick(){var d=Math.floor(Math.random()*5)-2;"
            "v=Math.max(300,Math.min(500,v+d));"
            "n.textContent=v;"
            "sessionStorage.setItem('twkLiveN',v);"
            "setTimeout(tick,4000+Math.random()*3000);}"
            "setTimeout(tick,4000);}}catch(e){}"
        )
        new_js = (
            "try{var n=document.getElementById('twk-nav-v1-live-n');"
            "var m=document.getElementById('mbh-members');"
            "var v=parseInt(sessionStorage.getItem('twkLiveN')||'0',10);"
            "if(!v||v<300||v>500)v=380+Math.floor(Math.random()*80);"
            "if(n)n.textContent=v;if(m)m.textContent=v;"
            "function tick(){var d=Math.floor(Math.random()*5)-2;"
            "v=Math.max(300,Math.min(500,v+d));"
            "if(n)n.textContent=v;if(m)m.textContent=v;"
            "sessionStorage.setItem('twkLiveN',v);"
            "setTimeout(tick,4000+Math.random()*3000);}"
            "if(n||m)setTimeout(tick,4000);}catch(e){}"
        )

        if "getElementById('mbh-members')" in html:
            print("      JS inline ya extendido")
        elif old_js in html:
            html = html.replace(old_js, new_js)
            print("      OK: JS inline sincroniza LIVE pill + mbh-members")
            changed = True
        else:
            print("      WARN: no encontre el JS exacto del nav")

        if changed:
            write_u8(mbh_path, html)
    else:
        print("      WARN: membership.html no existe")

    # ------------------------------------------------------------------
    # FIX 3: Inyeccion del widget Chaturbate affiliate en TODAS las paginas
    # ------------------------------------------------------------------
    print("[3/4] Widget Chaturbate affiliate...")
    cb_script = "assets/twerkhub-cb-promo.js"
    if not Path(cb_script).exists():
        print(f"      WARN: {cb_script} no existe - saltando inyeccion")
    else:
        load_line = "  loadOnce('/assets/twerkhub-cb-promo.js?v=20260506-p1','twk-loader-cb-promo');"
        anchor = "loadOnce('/assets/twerkhub-auth.js?v=20260426-p8','twk-loader-twerkhub-auth');"

        injected = 0
        skipped = 0
        for f in Path(".").glob("*.html"):
            try:
                h = read_u8(f)
                if "twk-loader-cb-promo" in h:
                    skipped += 1
                    continue
                if anchor in h:
                    h = h.replace(anchor, anchor + "\n" + load_line)
                    write_u8(f, h)
                    injected += 1
            except Exception as e:
                pass
        print(f"      OK: inyectado en {injected} HTMLs (skip {skipped} ya tenian)")

    # ------------------------------------------------------------------
    # FIX 4: Cache bump CSS p?? -> p29, JS pill-into-nav p?? -> p7
    # ------------------------------------------------------------------
    print("[4/4] Cache bump...")
    bumped = 0
    css_re = re.compile(r"twerkhub-ph-theme\.css\?v=20260506-p\d+")
    js_re = re.compile(r"twerkhub-pill-into-nav\.js\?v=20260506-p\d+")
    for f in Path(".").glob("*.html"):
        try:
            c = read_u8(f)
            orig = c
            c = css_re.sub("twerkhub-ph-theme.css?v=20260506-p29", c)
            c = js_re.sub("twerkhub-pill-into-nav.js?v=20260506-p7", c)
            if c != orig:
                write_u8(f, c)
                bumped += 1
        except Exception:
            pass
    print(f"      OK: {bumped} HTMLs bumpeados")

    # ------------------------------------------------------------------
    # RESUMEN + GIT
    # ------------------------------------------------------------------
    print()
    print("=== Cambios. git diff --stat:")
    try:
        out = subprocess.run(
            ["git", "diff", "--stat"], capture_output=True, text=True, check=False
        )
        for line in (out.stdout or "").splitlines()[:15]:
            print(line)
    except Exception:
        pass

    if push:
        print()
        print("=== git add + commit + push ===")
        subprocess.run(["git", "add", "-A"], check=False)
        msg = (
            "fix(pill+membership): carpet-bomb LIVE/TOKENS 28x130 + sync members "
            "+ 4 doors + add chaturbate affiliate widget"
        )
        r = subprocess.run(
            ["git", "commit", "-m", msg], capture_output=True, text=True, check=False
        )
        if r.returncode == 0:
            print("commit OK, pushing...")
            print(r.stdout)
            subprocess.run(["git", "push"], check=False)
        else:
            print("git commit:")
            print(r.stdout)
            print(r.stderr)
    else:
        print()
        print("Para pushear directamente: python fix-pills.py --push")
        print("O manualmente:")
        print('  git add -A')
        print('  git commit -m "fix(pill+membership): carpet-bomb pills + sync members + cb promo widget"')
        print("  git push")


if __name__ == "__main__":
    main()
