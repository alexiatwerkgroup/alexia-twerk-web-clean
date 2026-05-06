#!/usr/bin/env python3
"""
push-cb-promo-v3-fix.py - Re-push despues de fixear deteccion de
serverless en Vercel:
  - api/cb-top.js convertido a CommonJS (module.exports)
  - vercel.json con functions config explicito
  - package.json minimo agregado para que Vercel detecte Node project
"""
import subprocess
print("=== Fixing CB promo serverless deployment ===")
subprocess.run(["git", "add", "-A"], check=False)
msg = "fix(api): commonJS handler + explicit functions config + package.json so Vercel deploys /api/cb-top"
r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
if r.returncode == 0:
    print(r.stdout)
    subprocess.run(["git", "push"], check=False)
else:
    print(r.stdout)
    print(r.stderr)
