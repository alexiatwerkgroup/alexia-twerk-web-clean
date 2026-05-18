#!/usr/bin/env python3
"""hero: fix blurry freeze (X-lPzSuvf3k maxresdefault is 404, use sddefault) + pill height match badge"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): freeze image uses sddefault (maxres was 404 for vid #1) + pill height matches badge inline rendering"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
