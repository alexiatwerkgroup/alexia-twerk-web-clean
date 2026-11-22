"""Adelgaza clips/minis de Novinhas: lado corto > 560 px o bitrate alto -> 540 px de lado corto, CRF 23, tope ~1.5 Mbps.
Las tarjetas se ven a ~230-320 px CSS, asi que 540 px es nitido y pesa mucho menos (menos decodificacion = sin lag).
Uso: python3 tools/slim_clips.py <slug|ALL> [dry]"""
import os, subprocess, sys
import boto3
from botocore.config import Config

def env(n): return (os.environ.get(n) or "").strip().strip("\"'").strip()
target = sys.argv[1]; dry = len(sys.argv) > 2 and sys.argv[2] == "dry"
s3 = boto3.client("s3", endpoint_url=env("R2_ENDPOINT"), aws_access_key_id=env("AWS_ACCESS_KEY_ID"),
                  aws_secret_access_key=env("AWS_SECRET_ACCESS_KEY"), region_name="auto", config=Config(retries={"max_attempts": 3}))
B = "novinhas"

def probe(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return int(o[0]), int(o[1]), float(d)

def slugs():
    out, tok = [], None
    while True:
        r = s3.list_objects_v2(Bucket=B, Delimiter="/", **({"ContinuationToken": tok} if tok else {}))
        out += [c["Prefix"].rstrip("/") for c in r.get("CommonPrefixes", []) if not c["Prefix"].startswith("_")]
        if not r.get("IsTruncated"): break
        tok = r["NextContinuationToken"]
    return out

tot = dict(slim=0, ok=0, bad=0, saved=0)
for slug in (slugs() if target == "ALL" else [target]):
    objs = []
    for pre in ("clips/c-", "mini/m-"):
        tok = None
        while True:
            r = s3.list_objects_v2(Bucket=B, Prefix=f"{slug}/{pre}", **({"ContinuationToken": tok} if tok else {}))
            objs += [(o["Key"], o["Size"]) for o in r.get("Contents", []) if o["Key"].endswith(".mp4")]
            if not r.get("IsTruncated"): break
            tok = r["NextContinuationToken"]
    if objs: print("== canal", slug, len(objs), flush=True)
    for key, size in objs:
        try:
            s3.download_file(B, key, "/tmp/in.mp4"); w, h, dur = probe("/tmp/in.mp4")
        except Exception as e:
            print("ERR probe", key, e, flush=True); tot["bad"] += 1; continue
        short = min(w, h); kbps = size * 8 / max(dur, 1) / 1000
        if short <= 560 and kbps <= 1700:
            tot["ok"] += 1; continue
        print(("DRY " if dry else "SLIM ") + f"{key} {w}x{h} {size//1024}KB {kbps:.0f}kbps", flush=True)
        if dry: continue
        scale = "scale=540:-2" if w <= h else "scale=-2:540"
        if short <= 560: scale = "scale=iw:ih"
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "/tmp/in.mp4", "-an", "-vf", scale, "-c:v", "libx264", "-preset", "slow",
               "-crf", "23", "-maxrate", "1500k", "-bufsize", "3000k", "-g", "60", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", "/tmp/out.mp4"]
        if subprocess.run(cmd).returncode or not os.path.exists("/tmp/out.mp4"):
            print("ERR encode", key, flush=True); tot["bad"] += 1; continue
        ns = os.path.getsize("/tmp/out.mp4"); w2, h2, d2 = probe("/tmp/out.mp4")
        if ns > size * 0.85 or abs(d2 - dur) > 1.0:
            print("SKIP no mejora", key, size, ns, flush=True); os.remove("/tmp/out.mp4"); tot["ok"] += 1; continue
        s3.upload_file("/tmp/out.mp4", B, key, ExtraArgs={"ContentType": "video/mp4"})
        tot["slim"] += 1; tot["saved"] += size - ns; os.remove("/tmp/out.mp4")
print(f"Done: slim={tot['slim']} ok={tot['ok']} problems={tot['bad']} saved={tot['saved']//1024//1024}MB", flush=True)
