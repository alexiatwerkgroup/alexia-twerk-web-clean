#!/usr/bin/env python3
"""home: restore original triggers (#1 auto, #2 auto-after-1, #4 scroll-into-view) + hover-replay on top for ALL cards"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): restore initial triggers (signature auto, try-on auto-chained, kpop scroll-into-view) + add hover-replay on TOP for all 5 cards"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
