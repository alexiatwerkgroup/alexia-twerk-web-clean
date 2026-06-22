#!/usr/bin/env python3
"""update_from_playlist.py - Fetch YouTube playlist RSS and update matching local playlist."""
import json, re, sys, requests, xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "_playlist_data"
PLAYLIST_ID = "PLMzWifnZnpVLt_Epf5QNFIBw146T_Ui7j"
RSS_URL = f"https://www.youtube.com/feeds/videos.xml?playlist_id={PLAYLIST_ID}"

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"))

safe_print(f"Fetching RSS: {RSS_URL}")
r = requests.get(RSS_URL, timeout=30, headers={
    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
})
r.raise_for_status()

root = ET.fromstring(r.content)
ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}

pl_title_el = root.find("atom:title", ns)
pl_title = pl_title_el.text if pl_title_el is not None else "Unknown"
safe_print(f"Playlist title: {pl_title}")

entries = root.findall("atom:entry", ns)
videos = []
seen = set()
for entry in entries:
    vid_el = entry.find("yt:videoId", ns)
    title_el = entry.find("atom:title", ns)
    if vid_el is not None:
        vid = vid_el.text
        if vid in seen:
            continue
        seen.add(vid)
        title = title_el.text if title_el is not None else "Untitled"
        title = re.sub(r"\s+", " ", title).strip()
        videos.append({"id": vid, "title": title})

safe_print(f"Found {len(videos)} videos")

# Map playlist title to data file
title_lower = pl_title.lower()
if "cosplay" in title_lower or "fancam" in title_lower:
    target_file = "playlist-data-hottest-cosplay-fancam.json"
elif "korean" in title_lower or "k-pop" in title_lower:
    target_file = "playlist-data-korean-girls-kpop-twerk.json"
elif "try-on" in title_lower or "try on" in title_lower:
    target_file = "playlist-data-try-on-hot-leaks.json"
elif "latin" in title_lower or "ttl" in title_lower:
    target_file = "playlist-data-ttl-latin-models.json"
else:
    target_file = "playlist-data-hottest-cosplay-fancam.json"

data_path = DATA_DIR / target_file
safe_print(f"Target: {data_path.name}")

existing = json.loads(data_path.read_text(encoding="utf-8"))
hero_id = existing.get("hero", videos[0]["id"] if videos else "unknown")

# Ensure hero in list
if videos and not any(v["id"] == hero_id for v in videos):
    hero_title = next((v["title"] for v in existing["videos"] if v["id"] == hero_id), "Hero")
    videos.insert(0, {"id": hero_id, "title": hero_title})

data = {
    "slug": existing["slug"],
    "name": existing["name"],
    "hero": hero_id,
    "playlist_id": PLAYLIST_ID,
    "videos": videos,
    "count": len(videos),
}

data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
safe_print(f"Saved {data_path.name} with {len(videos)} videos")

# Regenerate - patch rebuild script to handle unicode
safe_print("\nRunning rebuild_4_playlists.py...")
import subprocess
result = subprocess.run(
    ["python", "rebuild_4_playlists.py"],
    capture_output=True, text=True, cwd=str(ROOT)
)
# Print stdout safely
for line in result.stdout.split("\n"):
    safe_print(line)
if result.stderr:
    safe_print("STDERR (first 2000 chars):")
    safe_print(result.stderr[:2000])

if result.returncode == 0:
    safe_print("\nSUCCESS: Playlist page regenerated!")
else:
    safe_print(f"\nFAILED: Exit code {result.returncode}")
