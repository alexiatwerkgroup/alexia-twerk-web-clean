#!/usr/bin/env python3
"""hero video range 18->34 instead of 18->28"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): hero video range 18-34s (was 18-28s)"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
