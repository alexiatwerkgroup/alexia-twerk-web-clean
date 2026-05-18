#!/usr/bin/env python3
"""hero: kpop card hover-triggered (vid #2 bDfPfmpUPmw, 2:44-3:01) + hover INTENT delay 350ms (no scroll false-positives)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): kpop card hover preview 2:44-3:01 (vid #2 of top 5) + hover-intent delay 350ms prevents triggering during scroll"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
