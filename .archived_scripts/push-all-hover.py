#!/usr/bin/env python3
"""home: all 5 hero playlist cards now hover-triggered (no auto)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): all 5 playlist hero cards now hover-triggered (no autoplay) - reduces bot-prompts + saves bandwidth"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
