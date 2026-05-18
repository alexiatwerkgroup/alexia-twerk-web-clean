#!/usr/bin/env python3
"""kpop card hover -> auto trigger (joins sequential queue after try-on)"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): kpop card switches to AUTO trigger - now plays automatically in queue after signature+try-on"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
