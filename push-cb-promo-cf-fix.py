#!/usr/bin/env python3
"""
push-cb-promo-cf-fix.py - 2026-05-06
Mueve el serverless de api/ (formato Vercel) a functions/api/ (formato
Cloudflare Pages — que es donde el sitio realmente esta hosteado).

- DELETE api/cb-top.js (estaba siendo servido como archivo estatico)
- DELETE api/ folder (queda vacio)
- KEEP functions/api/cb-top.js (formato Cloudflare onRequest)
- COMMIT + PUSH
"""
import shutil
import subprocess
from pathlib import Path

print("=== Cloudflare Pages Functions deployment fix ===")

# Delete the Vercel-style api/ folder — the file is wrong format for Cloudflare
# and was being served as a static JS file (security issue + dead weight)
api_folder = Path("api")
if api_folder.exists():
    print(f"  removing {api_folder}/ (wrong format for Cloudflare Pages)")
    shutil.rmtree(api_folder)
    print(f"  OK")
else:
    print("  api/ ya no existe (nothing to remove)")

# Verify functions folder exists
fn_path = Path("functions/api/cb-top.js")
if fn_path.exists():
    print(f"  OK: {fn_path} present (Cloudflare Pages Function)")
else:
    print(f"  ERROR: {fn_path} not found! Algo salio mal con la creacion del file.")
    exit(1)

print()
print("=== git add + commit + push ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = "fix(api): move serverless from api/ (Vercel) to functions/api/ (Cloudflare Pages format)"
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    print("commit OK, pushing...")
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
