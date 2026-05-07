#!/usr/bin/env python3
"""hero: add card 2 (try-on 15-33s) + refactor to data-yt-* attrs + buffer-spinner fix"""
import subprocess
subprocess.run(["git", "add", "-A"], check=False)
r = subprocess.run(
    ["git", "commit", "-m", "feat(home): try-on card 15-33s video preview + state-based fade-in (hides YT buffering spinner) + refactor to data-yt-* attrs"],
    capture_output=True, text=True
)
print(r.stdout)
if r.returncode == 0:
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stderr)
