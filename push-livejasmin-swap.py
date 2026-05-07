#!/usr/bin/env python3
"""push-livejasmin-swap.py — swap Chaturbate -> LiveJasmin embed
- _headers updated (CSP allows ecdwm.com / livejasmin.com / nsimg.net)
- twerkhub-cb-promo.js rewritten to inject LJ official affiliate embed
- bumps cb-promo cache to p11
"""
import re
import subprocess
from pathlib import Path

bumped = 0
pat = re.compile(r"twerkhub-cb-promo\.js\?v=20260506-p\d+")
for f in Path(".").glob("*.html"):
    try:
        c = f.read_text(encoding="utf-8")
        new = pat.sub("twerkhub-cb-promo.js?v=20260506-p11", c)
        if new != c:
            f.write_text(new, encoding="utf-8", newline="\n")
            bumped += 1
    except Exception as e:
        print(f"  skip {f}: {e}")
print(f"OK: {bumped} HTMLs bumpeados a cb-promo p11")

print()
print("=== git add + commit + push ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "feat(cb-promo): swap Chaturbate iframe for LiveJasmin official affiliate "
    "embed (psid=alexiatwerk, revs program) + CSP updated for ecdwm/lj domains"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
