#!/usr/bin/env python3
"""push-cb-promo-v5.py — bump p4->p5, force fixed positioning + filter blocked rooms"""
import re
import subprocess
from pathlib import Path

bumped = 0
pat = re.compile(r"twerkhub-cb-promo\.js\?v=20260506-p\d+")
for f in Path(".").glob("*.html"):
    try:
        c = f.read_text(encoding="utf-8")
        new = pat.sub("twerkhub-cb-promo.js?v=20260506-p5", c)
        if new != c:
            f.write_text(new, encoding="utf-8", newline="\n")
            bumped += 1
    except Exception as e:
        print(f"  skip {f}: {e}")
print(f"OK: {bumped} HTMLs bumpeados a cb-promo p5")

print()
print("=== git add + commit + push ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "fix(cb-promo): force position:fixed via !important + appendTo html "
    "+ filter region/gender-blocked rooms in API + faster rotation 18s"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
