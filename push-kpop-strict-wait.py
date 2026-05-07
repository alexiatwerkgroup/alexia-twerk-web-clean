#!/usr/bin/env python3
"""home: kpop drain has 350ms grace - waits for full auto-queue chain"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "fix(home): kpop scroll-trigger waits FULL auto-queue chain (signature->try-on) - 350ms grace prevents race condition"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
