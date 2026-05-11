#!/usr/bin/env python3
"""push-cb-promo-v4.py — bump p3 -> p4 + push"""
import re
import subprocess
from pathlib import Path

bumped = 0
pat = re.compile(r"twerkhub-cb-promo\.js\?v=20260506-p\d+")
for f in Path(".").glob("*.html"):
    try:
        c = f.read_text(encoding="utf-8")
        new = pat.sub("twerkhub-cb-promo.js?v=20260506-p4", c)
        if new != c:
            f.write_text(new, encoding="utf-8", newline="\n")
            bumped += 1
    except Exception as e:
        print(f"  skip {f}: {e}")
print(f"OK: {bumped} HTMLs bumpeados a cb-promo p4")

print()
print("=== git add + commit + push ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "feat(cb-promo): pornhub vibe (black/orange) + remove avatars row + "
    "X close button + 'Live now' + faster rotate (25s) + sandbox iframe + "
    "random top-5 initial pick"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
