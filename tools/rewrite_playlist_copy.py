#!/usr/bin/env python3
"""
rewrite_playlist_copy.py
Replace robot-generated SEO text in /playlist/*.html with flirty, conversion-driven
copy. Kills duplicate "Why this clip stands out" blocks and rewrites the side
panel copy. Safe and idempotent — marked with <!-- hot-copy:v1 --> sentinel.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from random import choice

ROOT = Path(__file__).resolve().parent.parent
PLAYLIST_DIR = ROOT / "playlist"

SENTINEL = "<!-- hot-copy:v1 -->"

# Flirty/hot variations that hint without crossing a line — SEO-friendly human prose.
TEASER_LINES_A = [
    "Some clips you watch once. This one you queue again.",
    "Press play. Pretend you're not coming back. We both know how it ends.",
    "Thirty seconds in, you stop scrolling. That's the whole point.",
    "The kind of loop you don't admit to watching a fourth time.",
    "Made to be replayed. Best if you lock the door first.",
    "You didn't land here by accident. Stay a while.",
    "If you only watch it once, you're doing it wrong.",
    "Short clip. Long memory.",
]

TEASER_LINES_B = [
    "Open the loop. Close the door. The rest is between you and the replay button.",
    "Everything you need is in the frame. Everything you want is one more watch away.",
    "Volume up. Lights off. Phone face down for anyone else.",
    "Built for replay. Rewarding for the patient.",
    "The moment everyone rewinds to is in here — see if you find it on the first pass.",
    "Some clips survive the scroll. This is one of them.",
    "Queue it. Loop it. Tell nobody.",
]

CTA_HOT = [
    ('Want the uncut version?', '/alexia-twerk-leaks.html'),
    ('See what Alexia doesn\u2019t post anywhere else', '/alexia-twerk-leaks.html'),
    ('The stuff she saves for subscribers \u2192', '/alexia-twerk-leaks.html'),
    ('Hotter drops live behind this door', '/alexia-video-packs.html'),
]

def pick_teasers(slug: str) -> tuple[str, str]:
    # Deterministic pick based on slug so each page is stable but varied.
    h = abs(hash(slug))
    return TEASER_LINES_A[h % len(TEASER_LINES_A)], TEASER_LINES_B[(h // 7) % len(TEASER_LINES_B)]

def pick_cta(slug: str) -> tuple[str, str]:
    h = abs(hash(slug + "_cta"))
    return CTA_HOT[h % len(CTA_HOT)]


SIDE_BLOCK_RE = re.compile(
    r'(<aside class="side">)\s*<h2>Why this clip stands out</h2>\s*'
    r'(<p>[^<]*</p>\s*){1,3}',
    flags=re.MULTILINE
)

SEO_BLOCK_RE = re.compile(
    r'<section class="seo-block">\s*<h2>Why this clip stands out</h2>\s*'
    r'<p>Instead of a single orphan video page[^<]*</p>\s*'
    r'<div class="seo-links">[\s\S]*?</div>\s*</section>',
    flags=re.MULTILINE
)

FAQ_BLOCK_RE = re.compile(
    r'<section class="page-faq">\s*<h2>Key moments</h2>\s*'
    r'<details[^>]*>\s*<summary>What makes this page different from a plain embed\?</summary>\s*'
    r'<p>This page adds archive context[^<]*</p>\s*</details>\s*'
    r'<details>\s*<summary>Where should I go after this clip\?</summary>\s*'
    r'<p>Use the related videos[^<]*</p>\s*</details>\s*</section>',
    flags=re.MULTILINE
)

NEW_SEO_TEMPLATE = '''<section class="hot-seo-block">
  <h2>Why you're still watching</h2>
  <p>{teaser_b}</p>
  <div class="hot-seo-cta">
    <a class="hot-seo-btn hot-seo-btn--primary" href="{cta_href}">{cta_text} \u2192</a>
    <a class="hot-seo-btn" href="/alexia-video-packs.html">Browse private packs</a>
    <a class="hot-seo-btn" href="/top-100-twerk-videos.html">Top 100</a>
    <a class="hot-seo-btn" href="/best-twerk-dancers.html">Dancers</a>
  </div>
</section>

<section class="hot-faq">
  <h2>House rules</h2>
  <details open><summary>What makes this page worth bookmarking?</summary><p>We curate, rank and route every clip so you never dead-end. One play leads to the next, and the next is almost always hotter.</p></details>
  <details><summary>Where do I go if I want the real stuff?</summary><p>Behind the <a href="/alexia-twerk-leaks.html">Alexia Twerk door</a> — that's where the unfiltered drops live. If you're done window-shopping, that's your move.</p></details>
</section>'''


def rewrite_side_block(html: str, slug: str) -> tuple[str, bool]:
    teaser_a, _ = pick_teasers(slug)
    replacement = r'\1\n      <span class="side-eyebrow">Replay-worthy</span>\n      <h2>Why you clicked</h2>\n      <p class="side-teaser">' + teaser_a.replace('\\', '\\\\') + r'</p>\n      '
    new, n = SIDE_BLOCK_RE.subn(replacement, html, count=1)
    return new, n > 0


def rewrite_seo_and_faq(html: str, slug: str) -> tuple[str, bool]:
    teaser_a, teaser_b = pick_teasers(slug)
    cta_text, cta_href = pick_cta(slug)
    new_block = NEW_SEO_TEMPLATE.format(
        teaser_b=teaser_b,
        cta_href=cta_href,
        cta_text=cta_text,
    )
    # Kill the old FAQ block entirely
    changed = False
    new, n = FAQ_BLOCK_RE.subn("", html, count=1)
    if n:
        changed = True
        html = new
    # Replace the duplicate SEO block with our hot version
    new, n = SEO_BLOCK_RE.subn(new_block.replace('\\', '\\\\'), html, count=1)
    if n:
        changed = True
        html = new
    return html, changed


def inject_hot_styles(html: str) -> tuple[str, bool]:
    if "hot-copy-styles" in html:
        return html, False
    style = '''<style id="hot-copy-styles">
.side-eyebrow{display:inline-block;font-size:9px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;color:#ff6fa8;background:rgba(255,46,126,.08);border:1px solid rgba(255,46,126,.28);padding:4px 10px;border-radius:999px;margin-bottom:10px}
.side-teaser{font-family:"Playfair Display",Georgia,serif;font-size:17px;line-height:1.4;color:#f2e8ee;font-style:italic;letter-spacing:.003em}
.hot-seo-block{margin-top:32px;padding:28px 24px;border-radius:22px;background:linear-gradient(165deg,rgba(255,46,126,.05),rgba(15,8,14,.7));border:1px solid rgba(255,46,126,.18)}
.hot-seo-block h2{font-family:"Playfair Display",Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-.01em;color:#fff;margin:0 0 10px}
.hot-seo-block p{font-size:15px;line-height:1.55;color:rgba(240,235,250,.78);margin:0 0 18px;max-width:60ch}
.hot-seo-cta{display:flex;gap:10px;flex-wrap:wrap}
.hot-seo-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#f2f2f5;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:.25s ease}
.hot-seo-btn:hover{background:rgba(255,46,126,.12);border-color:rgba(255,46,126,.5);color:#fff}
.hot-seo-btn--primary{background:linear-gradient(180deg,#ff2e7e,#d4185d);border-color:transparent;color:#fff;box-shadow:0 10px 30px rgba(255,46,126,.25)}
.hot-seo-btn--primary:hover{background:linear-gradient(180deg,#ff4a91,#e8296f);color:#fff}
.hot-faq{margin-top:22px;padding:20px 24px;border-radius:18px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.015)}
.hot-faq h2{font-family:"Playfair Display",Georgia,serif;font-size:20px;font-weight:700;color:#f2e8ee;margin:0 0 12px;letter-spacing:-.005em}
.hot-faq summary{font-weight:600;font-size:14px;color:#fff;cursor:pointer;padding:6px 0}
.hot-faq p{font-size:14px;line-height:1.55;color:rgba(240,235,250,.7);margin:6px 0 12px}
.hot-faq a{color:#ff6fa8;text-decoration:underline;text-decoration-color:rgba(255,46,126,.4);text-underline-offset:3px}
</style>'''
    html = html.replace("</head>", style + "\n</head>", 1)
    return html, True


def process_file(path: Path) -> bool:
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as exc:
        print(f"  ! {path.name}: {exc}")
        return False

    if SENTINEL in content:
        return False  # already processed

    slug = path.stem
    original = content
    content, a = rewrite_side_block(content, slug)
    content, b = rewrite_seo_and_faq(content, slug)
    content, c = inject_hot_styles(content)

    if a or b or c:
        # Add sentinel just before </body>
        content = content.replace("</body>", f"{SENTINEL}\n</body>", 1)
        path.write_text(content, encoding="utf-8")
        return True
    return False


def main() -> int:
    if not PLAYLIST_DIR.exists():
        print(f"No playlist dir at {PLAYLIST_DIR}")
        return 1
    files = sorted(PLAYLIST_DIR.glob("*.html"))
    # Skip index.html — it's a hub page, styled differently
    files = [f for f in files if f.name != "index.html"]

    touched = 0
    for f in files:
        if process_file(f):
            touched += 1
    print(f"Rewrote hot copy on {touched}/{len(files)} playlist pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
