#!/usr/bin/env python3
"""
inject_enter_now_widget.py
Ensure every HTML page (except the portal root) loads enter-now-widget.js.
Idempotent; skips files that already include it.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_TAG = '<script defer src="/assets/enter-now-widget.js?v=20260417-02"></script>'

EXCLUDE = {"index.html"}  # only the portal root index

def process(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    # skip top-level portal only
    if rel in EXCLUDE:
        return False
    # skip vendor / hidden
    if any(p.startswith(".") for p in path.parts) or "node_modules" in path.parts:
        return False
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False
    if "enter-now-widget" in content:
        return False
    if "</body>" not in content:
        return False
    new = content.replace("</body>", f"  {SCRIPT_TAG}\n</body>", 1)
    path.write_text(new, encoding="utf-8")
    return True

def main() -> int:
    touched = 0
    for f in ROOT.rglob("*.html"):
        if process(f):
            touched += 1
            print(f"  + {f.relative_to(ROOT).as_posix()}")
    print(f"Injected Enter Now widget into {touched} pages.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
