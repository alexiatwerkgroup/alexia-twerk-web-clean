#!/usr/bin/env python3
"""home: hover cards now support unlimited replays + Card #1 src->data-src (was autoplay-leaking from page load)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): all 5 hero cards support unlimited hover replays + Card #1 lazy-load (was autoplaying from 0:00 on page load, ignoring 18-34 range)"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
