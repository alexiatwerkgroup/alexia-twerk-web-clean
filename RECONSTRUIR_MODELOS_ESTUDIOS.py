# -*- coding: utf-8 -*-

from pathlib import Path
import re
import html

ROOT = Path(".")
PLAYLIST_DIR = ROOT / "playlist"
OUTPUT_DIR = ROOT / "output_playlist_site"
BEST = ROOT / "best-twerk-dancers.html"
STUDIOS = ROOT / "twerk-studios.html"
HOME = ROOT / "home.html"
TWERK_VIDEO = ROOT / "twerk-dance-video.html"

SAFE_PLACEHOLDER_REL = "assets/safe-adult-placeholder.svg"
PLAYLIST_CSS = "playlist/assets/styles.css"
SERVER_PLAYLIST_INDEX = "playlist/index.html"

TARGET_TITLES = {
    "EMILIANO FERRARI VILLALOBO",
}

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[’'`´]", "", text)
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "page"

def ensure_safe_placeholder():
    assets = ROOT / "assets"
    assets.mkdir(exist_ok=True)
    svg = assets / "safe-adult-placeholder.svg"
    svg.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs>
<linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
<stop offset="0%" stop-color="#111827"/>
<stop offset="100%" stop-color="#0b0b0b"/>
</linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#g)"/>
<rect x="30" y="30" width="1220" height="660" rx="28" fill="none" stroke="#2dd4bf" stroke-opacity=".45" stroke-width="4"/>
<text x="640" y="310" text-anchor="middle" fill="#f5f5f5" font-size="56" font-family="Arial, Helvetica, sans-serif" font-weight="700">
Adult-safe thumbnail
</text>
<text x="640" y="390" text-anchor="middle" fill="#bdbdbd" font-size="28" font-family="Arial, Helvetica, sans-serif">
Replaced to avoid legal / reputation issues
</text>
</svg>""",
        encoding="utf-8",
    )

def patch_old_links(text: str) -> str:
    old_paths = [
        "twerk-video-playlist.html",
        "playlist.html",
        "playlist/index.html",
        "/playlist/index.html",
        "output_playlist_site/index.html",
        "/output_playlist_site/index.html",
    ]
    for old in old_paths:
        text = text.replace(f'href="{old}"', f'href="{SERVER_PLAYLIST_INDEX}"')
        text = text.replace(f"href='{old}'", f"href='{SERVER_PLAYLIST_INDEX}'")
    return text

def source_playlist_dir() -> Path:
    if PLAYLIST_DIR.exists():
        return PLAYLIST_DIR
    return OUTPUT_DIR

def parse_playlist_entries():
    entries = []
    src = source_playlist_dir()
    if not src.exists():
        return entries

    for p in src.glob("*.html"):
        if p.name == "index.html":
            continue

        txt = p.read_text(encoding="utf-8", errors="ignore")

        h2 = re.search(r"<h2>(.*?)</h2>", txt, re.S | re.I)
        title = html.unescape(re.sub(r"<.*?>", "", h2.group(1)).strip()) if h2 else p.stem

        desc = ""
        for raw in re.findall(r"<p>(.*?)</p>", txt, re.S | re.I):
            clean = html.unescape(re.sub(r"<.*?>", "", raw)).strip()
            if clean:
                desc = clean
                break
        if not desc:
            desc = "Curated related twerk video page."

        iframe = re.search(r"https://www\.youtube\.com/embed/([^\"?&]+)", txt)
        vid = iframe.group(1) if iframe else ""
        thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else SAFE_PLACEHOLDER_REL

        entries.append({
            "title": title,
            "filename": p.name,
            "href_server": f"playlist/{p.name}",
            "thumb": thumb,
            "desc": desc,
        })
    return entries

def score_entry(card_title: str, entry_title: str) -> int:
    ct = card_title.lower()
    et = entry_title.lower()
    stop = {
        "dance", "studio", "project", "team", "video", "videos", "twerk",
        "choreography", "official", "the", "and", "hub", "playlist",
        "model", "models", "route"
    }
    tokens = [t for t in re.split(r"[^a-z0-9а-яё]+", ct) if len(t) >= 4 and t not in stop]
    score = 0
    if ct in et:
        score += 50
    for tok in tokens:
        if tok in et:
            score += 10
    return score

def find_group_matches(card_title: str, entries: list, limit: int = 24):
    ranked = []
    for e in entries:
        s = score_entry(card_title, e["title"])
        if s > 0:
            ranked.append((s, e))
    ranked.sort(key=lambda x: (-x[0], x[1]["title"].lower()))
    return [e for _, e in ranked[:limit]]

def build_group_page(title: str, desc: str, matches: list) -> str:
    cards = []

    if not matches:
        cards.append(f"""
<a class="card" href="{SERVER_PLAYLIST_INDEX}">
  <div class="thumb">
    <img src="{SAFE_PLACEHOLDER_REL}" alt="Playlist Hub" loading="lazy">
  </div>
  <div class="card-body">
    <h2>Open Playlist Hub</h2>
    <div class="meta">No exact grouped matches were found, so this page points to the full playlist hub.</div>
    <div class="card-actions">
      <span class="btn">Open Playlist Hub</span>
    </div>
  </div>
</a>""")
    else:
        for e in matches:
            cards.append(f"""
<a class="card" href="{html.escape(e['href_server'])}">
  <div class="thumb">
    <img src="{html.escape(e['thumb'])}" alt="{html.escape(e['title'])}" loading="lazy">
  </div>
  <div class="card-body">
    <h2>{html.escape(e['title'])}</h2>
    <div class="meta">{html.escape(e['desc'])}</div>
    <div class="card-actions">
      <span class="btn">Open Video</span>
    </div>
  </div>
</a>""")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)} | Alexia Twerk Group</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="https://alexiatwerkgroup.com/{slugify(title)}.html">
<link rel="stylesheet" href="{PLAYLIST_CSS}">
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="home.html">ALEXIA TWERK GROUP</a>
    <nav class="nav">
      <a href="home.html">Home</a>
      <a href="{SERVER_PLAYLIST_INDEX}">Playlist</a>
      <a href="best-twerk-dancers.html">Models</a>
    </nav>
  </div>
</header>

<div class="wrap">
  <section class="hero">
    <div class="kicker">Grouped selection</div>
    <h1 class="single-line">{html.escape(title)}</h1>
    <p>{html.escape(desc)}</p>
    <div class="badges">
      <div class="badge">Playlist Hub</div>
      <div class="badge">Grouped videos only</div>
    </div>
  </section>

  <section class="home-grid" style="grid-template-columns:1fr;">
    <div>
      <h2 class="section-title">Related video pages</h2>
      <p class="section-sub">A focused selection using the same visual system as the main playlist.</p>
      <div class="grid">{''.join(cards)}</div>
    </div>
  </section>

  <footer class="footer">
    <div>All routes now lead to the new playlist hub.</div>
    <div class="footer-links">
      <a class="btn" href="home.html">Main Home</a>
      <a class="btn" href="{SERVER_PLAYLIST_INDEX}">Playlist Hub</a>
    </div>
  </footer>
</div>
</body>
</html>"""

def extract_cards(txt: str):
    blocks = []
    patterns = [
        re.compile(r'(<a\b[^>]*href=")([^"]*)(".*?<strong>(.*?)</strong>.*?<p>(.*?)</p>.*?</a>)', re.S | re.I),
        re.compile(r'(<a\b[^>]*href=")([^"]*)(".*?<h2>(.*?)</h2>.*?<div class="meta">(.*?)</div>.*?</a>)', re.S | re.I),
    ]
    seen = set()
    for pat in patterns:
        for m in pat.finditer(txt):
            key = (m.start(), m.end())
            if key in seen:
                continue
            seen.add(key)
            full = m.group(0)
            href = m.group(2)
            title = html.unescape(re.sub(r"<.*?>", "", m.group(4)).strip())
            desc = html.unescape(re.sub(r"<.*?>", "", m.group(5)).strip())
            blocks.append((full, href, title, desc))
    return blocks

def patch_cards_page(path: Path, entries: list):
    if not path.exists():
        return

    txt = path.read_text(encoding="utf-8", errors="ignore")
    txt = patch_old_links(txt)

    for full, href, title, desc in extract_cards(txt):
        group_name = f"group-{slugify(title)}.html"
        new_block = full.replace(f'href="{href}"', f'href="{group_name}"')

        if title.strip().upper() in TARGET_TITLES:
            new_block = re.sub(r'src="[^"]+"', f'src="{SAFE_PLACEHOLDER_REL}"', new_block, count=1)

        txt = txt.replace(full, new_block)
        group_html = build_group_page(title, desc, find_group_matches(title, entries))
        (ROOT / group_name).write_text(group_html, encoding="utf-8")

    txt = patch_old_links(txt)
    path.write_text(txt, encoding="utf-8")

def patch_root_html(path: Path):
    if not path.exists():
        return
    txt = path.read_text(encoding="utf-8", errors="ignore")
    txt = patch_old_links(txt)
    path.write_text(txt, encoding="utf-8")

def main():
    ensure_safe_placeholder()
    entries = parse_playlist_entries()

    patch_root_html(HOME)
    patch_root_html(TWERK_VIDEO)
    patch_cards_page(BEST, entries)
    patch_cards_page(STUDIOS, entries)

    print("LISTO")
    print("- best-twerk-dancers.html reconstruido")
    print("- twerk-studios.html reconstruido")
    print("- links viejos enviados a playlist/index.html")
    print("- paginas agrupadas por bailarina / estudio generadas")
    print("- miniatura conflictiva reemplazada por una opcion segura")

if __name__ == "__main__":
    main()