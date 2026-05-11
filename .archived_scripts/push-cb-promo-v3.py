#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
push-cb-promo-v3.py - 2026-05-06
Bumpea twerkhub-cb-promo.js?v=p?? -> p3 en todos los HTML (asi el browser
trae el JS nuevo) y pushea TODOS los cambios pendientes:
  - _headers (CSP actualizada con chaturbate.com en frame-src)
  - api/cb-top.js (nueva serverless function que proxie la API)
  - assets/twerkhub-cb-promo.js (widget v3 con iframe live real)
  - HTMLs (?v=p3)

Uso: python push-cb-promo-v3.py
"""
import re
import subprocess
from pathlib import Path


def main():
    bumped = 0
    pat = re.compile(r"twerkhub-cb-promo\.js\?v=20260506-p\d+")
    for f in Path(".").glob("*.html"):
        try:
            c = f.read_text(encoding="utf-8")
            new = pat.sub("twerkhub-cb-promo.js?v=20260506-p3", c)
            if new != c:
                f.write_text(new, encoding="utf-8", newline="\n")
                bumped += 1
        except Exception as e:
            print(f"  skip {f}: {e}")
    print(f"OK: {bumped} HTMLs bumpeados a cb-promo p3")

    print()
    print("=== git add + commit + push ===")
    subprocess.run(["git", "add", "-A"], check=False)
    msg = (
        "feat(cb-promo): real top live model iframe (revshare) + "
        "Vercel API proxy /api/cb-top + CSP allow chaturbate frame-src"
    )
    r = subprocess.run(
        ["git", "commit", "-m", msg], capture_output=True, text=True, check=False
    )
    if r.returncode == 0:
        print(r.stdout)
        print("commit OK, pushing...")
        subprocess.run(["git", "push"], check=False)
    else:
        print(r.stdout)
        print(r.stderr)


if __name__ == "__main__":
    main()
