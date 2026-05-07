#!/usr/bin/env python3
"""hero video: remove URL start/end params, fully JS-controlled stop at 34s"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): hero video full JS control - removes YT end= bug premature ENDED"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
