#!/usr/bin/env python3
"""hero: instant freeze with preloaded image (no fade, no buffer spinner) + chunkier pill + chevron SVG"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): instant freeze swap to preloaded poster (no spinner) + pill chevron SVG arrow + matched dimensions"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
