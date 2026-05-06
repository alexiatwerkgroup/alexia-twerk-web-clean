# -*- coding: utf-8 -*-
"""
Bump cache for the pill-alignment fix:
- twerkhub-bundle.css : b3 -> b4   (added .twk-sr-only utility for /account fix)
- twerkhub-ph-theme.css : -> 20260506-p22  (split fixed/absolute pill rules)
- twerkhub-pill-into-nav.js : -> 20260506-p3 (defensive bump for relocator)

Run from project root:
    python bump-pill-align-cache.py
"""
import os, re, sys
if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))

REPLACEMENTS = [
    # bundle: b3 -> b4
    (re.compile(r"(twerkhub-bundle\.css\?v=)20260506-b3"),       r"\g<1>20260506-b4"),
    # ph-theme: any version -> p22
    (re.compile(r"(twerkhub-ph-theme\.css\?v=)[^\"'<>\s]+"),     r"\g<1>20260506-p22"),
    # pill-into-nav: p2 -> p3
    (re.compile(r"(twerkhub-pill-into-nav\.js\?v=)[^\"'<>\s]+"), r"\g<1>20260506-p3"),
]

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__", "_supabase"}
changed_files = 0
total_replacements = 0

for d, ds, fs in os.walk(ROOT):
    ds[:] = [x for x in ds if x not in EXCLUDE_DIRS]
    for f in fs:
        if not f.lower().endswith((".html", ".htm")):
            continue
        p = os.path.join(d, f)
        try:
            with open(p, "r", encoding="utf-8") as h:
                src = h.read()
        except Exception:
            continue
        new = src
        n_file = 0
        for pat, repl in REPLACEMENTS:
            new, n = pat.subn(repl, new)
            n_file += n
        if n_file > 0 and new != src:
            with open(p, "w", encoding="utf-8", newline="") as h:
                h.write(new)
            changed_files += 1
            total_replacements += n_file

print(f"Done: {changed_files} files patched, {total_replacements} replacements")
print(f"  bundle      -> v=20260506-b4")
print(f"  ph-theme    -> v=20260506-p22")
print(f"  pill-relocator -> v=20260506-p3")
