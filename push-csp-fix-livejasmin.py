#!/usr/bin/env python3
"""push-csp-fix-livejasmin.py — fix CSP para que cargue el iframe atwmcd.com
del embed de LiveJasmin (ese era el dominio bloqueado que tiraba el icono roto)
"""
import subprocess
print("=== Pushing CSP fix for LiveJasmin embed (allow atwmcd.com) ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = (
    "fix(csp): allow atwmcd.com + extra livejasmin ecosystem domains in "
    "CSP frame-src/connect-src/script-src - was blocking the actual iframe"
)
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
