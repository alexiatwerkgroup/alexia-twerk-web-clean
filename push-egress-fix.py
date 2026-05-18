#!/usr/bin/env python3
"""push-egress-fix.py — stub heartbeat() in online-count-global.js to
stop bleeding egress to the deleted page_visits table.

This file is served with Cache-Control: no-cache so no version bump
needed. Just commit + push and the next visitor gets the new version
that no longer hits Supabase.
"""
import subprocess
print("=== Stubbing heartbeat to stop Supabase egress bleed ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "fix(egress): stub online-count-global heartbeat — was POSTing to "
    "deleted page_visits table generating 404 responses (~1GB/day waste)"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    print("commit OK, pushing...")
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
