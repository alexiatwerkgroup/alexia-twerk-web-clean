# -*- coding: utf-8 -*-
"""
Fix variety-catalog.html TBD placeholder links - 2026-05-06

The 13 cards in variety-catalog.html have href="/creator/01" through
"/creator/13" with data-of-url="TBD" and target="_blank" — they're
intended to link to OnlyFans but the URL was never filled in.

Strategy: redirect all 13 to the canonical Alexia OnlyFans URL.
"""
import re, os, sys

if sys.platform == "win32":
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(ROOT, "variety-catalog.html")
OF_URL = "https://onlyfans.com/alexiatwerkoficial"

with open(F, "r", encoding="utf-8") as f: src = f.read()

# Match href="/creator/NN" where NN is 2 digits (01-99 placeholder slugs)
PAT = re.compile(r'href="/creator/(\d{2})/?"', re.IGNORECASE)
new_src, n = PAT.subn(f'href="{OF_URL}"', src)
print(f"Replaced {n} placeholder links to canonical OF URL")

# Also: data-of-url="TBD" -> data-of-url="...same OF URL..."
PAT_TBD = re.compile(r'data-of-url="TBD"', re.IGNORECASE)
new_src, n2 = PAT_TBD.subn(f'data-of-url="{OF_URL}"', new_src)
print(f"Replaced {n2} data-of-url=TBD attributes")

with open(F, "w", encoding="utf-8", newline="") as f: f.write(new_src)
print(f"Done: {F}")
