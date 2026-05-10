#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bump-cb-promo-v2.py - 2026-05-06
Bumpea la version del loader del CB promo widget en todos los HTML
(p1 -> p2) para forzar refresh del cache de Cloudflare/browser.
Hace commit + push automatico.

Uso: python bump-cb-promo-v2.py
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
            new = pat.sub("twerkhub-cb-promo.js?v=20260506-p2", c)
            if new != c:
                f.write_text(new, encoding="utf-8", newline="\n")
                bumped += 1
        except Exception as e:
            print(f"  skip {f}: {e}")
    print(f"OK: {bumped} HTMLs bumpeados a p2")

    if bumped == 0:
        print("Nada que bumpear (ya estaba en p2)")

    print()
    print("=== git add + commit + push ===")
    subprocess.run(["git", "add", "-A"], check=False)
    msg = "fix(cb-promo): retarget banner to viewers (tour=Limj) + sticky no-close + bump p2"
    r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True, check=False)
    if r.returncode == 0:
        print(r.stdout)
        print("commit OK, pushing...")
        subprocess.run(["git", "push"], check=False)
    else:
        print(r.stdout)
        print(r.stderr)


if __name__ == "__main__":
    main()
