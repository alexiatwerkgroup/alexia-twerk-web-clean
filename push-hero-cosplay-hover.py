#!/usr/bin/env python3
"""hero: cosplay card hover-triggered preview 3:15-3:27 (auto vs hover triggers split)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): cosplay card hover-triggered video preview 3:15-3:27 - lazy load on mouseenter only"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
