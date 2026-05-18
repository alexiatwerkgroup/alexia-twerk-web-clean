#!/usr/bin/env python3
"""home: kpop scroll-trigger waits if any other card is playing (no overlap)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): kpop scroll-trigger waits when another card is currently playing - prevents overlapping audio/video lag"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
