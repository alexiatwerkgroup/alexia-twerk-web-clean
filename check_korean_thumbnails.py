import json, requests, sys, io
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "_playlist_data" / "playlist-data-korean-girls-kpop-twerk.json"

data = json.loads(DATA.read_text(encoding="utf-8"))
videos = data["videos"]
dead = []

for i, v in enumerate(videos, 1):
    vid = v["id"]
    url = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        img = Image.open(io.BytesIO(r.content))
        w, h = img.size
        if w <= 120 and h <= 90:
            print(f"  DEAD #{i:02d} {vid} ({w}x{h}) — {v['title'][:40]}")
            dead.append(v)
        else:
            print(f"  OK   #{i:02d} {vid} ({w}x{h})")
    except Exception as e:
        print(f"  ERR  #{i:02d} {vid} — {e}")
        dead.append(v)

print(f"\n{len(dead)} dead out of {len(videos)}")
if dead:
    print("IDs to remove:", [v["id"] for v in dead])
