#!/usr/bin/env python3
"""push-cb-promo-v9.py — fix iframe layout: render at native 800x550 + CSS scale to fit"""
import re
import subprocess
from pathlib import Path

bumped = 0
pat = re.compile(r"twerkhub-cb-promo\.js\?v=20260506-p\d+")
for f in Path(".").glob("*.html"):
    try:
        c = f.read_text(encoding="utf-8")
        new = pat.sub("twerkhub-cb-promo.js?v=20260506-p9", c)
        if new != c:
            f.write_text(new, encoding="utf-8", newline="\n")
            bumped += 1
    except Exception as e:
        print(f"  skip {f}: {e}")
print(f"OK: {bumped} HTMLs bumpeados a cb-promo p9")

print()
print("=== git add + commit + push ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "fix(cb-promo): render iframe at native 800x550 + CSS scale to fit "
    "container so model is fully visible (no edge clipping)"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
