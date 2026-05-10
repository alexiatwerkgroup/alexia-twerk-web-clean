#!/usr/bin/env python3
"""
apply_elite_system.py
Idempotent injector for the Elite design-system CSS across every HTML page.

Behavior:
  • Inserts <link rel=stylesheet href=/assets/elite-tokens.css>
    and  <link rel=stylesheet href=/assets/elite-components.css>
    BEFORE </head>, if not already present.
  • On every page in DEFENSIVE_SET (regex), adds class "elite-defensive"
    to <body> so the tokens re-theme the page without rewriting markup.
  • On every page in FULL_SET (regex), adds class "elite" to <html>
    so all .elite-scope / .elite-* components activate fully.

Run from the repo root:
    python tools/apply_elite_system.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LINK_TOKENS     = '<link rel="stylesheet" href="/assets/elite-tokens.css">'
LINK_COMPONENTS = '<link rel="stylesheet" href="/assets/elite-components.css">'
LINK_TOKENS_REL_1     = '<link rel="stylesheet" href="../assets/elite-tokens.css">'
LINK_COMPONENTS_REL_1 = '<link rel="stylesheet" href="../assets/elite-components.css">'

# Pages that should receive the full `html.elite` treatment (hand-tuned markup).
FULL_SET = [
    re.compile(r"^index\.html$"),
]

# Pages that only get the defensive re-theme (tokens pipe in but don't rewrite markup).
# Everything else matching *.html receives defensive class; FULL_SET overrides.
EXCLUDE = [
    re.compile(r"^404\.html$"),
    re.compile(r"^auth-callback\.html$"),
]

def is_full(rel: str) -> bool:
    return any(r.search(rel) for r in FULL_SET)

def is_excluded(rel: str) -> bool:
    return any(r.search(rel) for r in EXCLUDE)

def choose_links(rel_path: Path) -> tuple[str, str]:
    """Pick absolute / relative link forms based on file depth from repo root."""
    # Pages inside a subfolder (e.g. playlist/x.html, playlist-2/index.html) still
    # resolve /assets/... because CF Pages / static hosts serve from root.
    return LINK_TOKENS, LINK_COMPONENTS

def inject(html: str, rel: str) -> tuple[str, bool]:
    changed = False
    tokens_link, comp_link = choose_links(Path(rel))

    if "elite-tokens.css" not in html:
        if "</head>" in html:
            html = html.replace("</head>", f"  {tokens_link}\n  {comp_link}\n</head>", 1)
            changed = True

    # Apply class toggles
    if is_full(rel):
        # Add elite class to <html>
        if re.search(r"<html[^>]*class=", html):
            html2 = re.sub(
                r'(<html[^>]*class=")([^"]*)(")',
                lambda m: m.group(1) + (m.group(2) + " elite").strip() + m.group(3)
                if "elite" not in m.group(2) else m.group(0),
                html, count=1
            )
            if html2 != html:
                changed = True
                html = html2
        else:
            html2 = re.sub(r"<html([^>]*)>", r'<html\1 class="elite">', html, count=1)
            if html2 != html:
                changed = True
                html = html2
    elif not is_excluded(rel):
        # Add elite-defensive class on <body>
        if re.search(r"<body[^>]*class=", html):
            def add_defensive(m):
                current = m.group(2)
                if "elite-defensive" in current:
                    return m.group(0)
                return m.group(1) + (current + " elite-defensive").strip() + m.group(3)
            html2 = re.sub(
                r'(<body[^>]*class=")([^"]*)(")',
                add_defensive, html, count=1
            )
            if html2 != html:
                changed = True
                html = html2
        else:
            html2 = re.sub(r"<body([^>]*)>", r'<body\1 class="elite-defensive">', html, count=1)
            if html2 != html:
                changed = True
                html = html2
    return html, changed


def main() -> int:
    touched = 0
    scanned = 0
    for path in ROOT.rglob("*.html"):
        # Skip vendor / build output directories if any
        if any(part.startswith(".") for part in path.parts):
            continue
        if "node_modules" in path.parts:
            continue

        rel = path.relative_to(ROOT).as_posix()
        scanned += 1
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception as exc:  # pragma: no cover
            print(f"  ! read failed: {rel} ({exc})")
            continue

        new_content, changed = inject(content, rel)
        if changed:
            path.write_text(new_content, encoding="utf-8")
            touched += 1
            print(f"  + {rel}")

    print(f"\nDone: scanned {scanned} HTML files, updated {touched}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
