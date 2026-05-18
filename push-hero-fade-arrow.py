#!/usr/bin/env python3
"""hero: fade out + freeze frame at 20s + green up-arrow growth animation in pill"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): hero video fade out at 34s, freeze on frame 20s + green up-arrow growth-pulse in 'Infinite list' pill (matches Signature pill height)"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
