#!/usr/bin/env python3
"""push-hero-v2.py — hero video 18-28s no loop + pill matches .twerkhub-fp-badge style"""
import subprocess
print("=== Push hero v2: 18-28s no-loop + pill aligned with fp-badge spec ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "fix(home): hero video 18-28s no loop + Infinite list pill now matches "
    ".twerkhub-fp-badge dimensions (6px 12px / 9.5px / .22em letter-spacing)"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
