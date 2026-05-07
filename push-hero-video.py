#!/usr/bin/env python3
"""push-hero-video.py — homepage hero: pill verde -> TWERKHUB 2.0 + img -> 15s video loop"""
import subprocess
print("=== Push hero video preview + TWERKHUB 2.0 pill ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "feat(home): featured playlist hero - 15s YouTube loop preview (vid #1 X-lPzSuvf3k) "
    "+ Infinite list pill rebrand to TWERKHUB 2.0 pink/orange gradient"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
