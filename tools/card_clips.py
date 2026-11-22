"""Version LIVIANA de los clips para las tarjetas de canales de Novinhas: <slug>/clips/c-V-T.mp4 -> <slug>/cards/c-V-T.mp4
Las tarjetas se ven chicas: 270 px de lado corto, <=6 s, sin audio, ~120-250 KB. Menos decodificacion = todas se mueven fluidas.
El ranking sigue usando los clips originales. Idempotente (salta los que ya existen).
Uso: python3 tools/card_clips.py <slug|ALL> [dry]"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import boto3
from botocore.config import Config

def env(n): return (os.environ.get(n) or "").strip().strip("\"'").strip()
target = sys.argv[1]; dry = len(sys.argv) > 2 and sys.argv[2] == "dry"
s3 = boto3.client("s3", endpoint_url=env("R2_ENDPOINT"), aws_access_key_id=env("AWS_ACCESS_KEY_ID"),
                  aws_secret_access_key=env("AWS_SECRET_ACCESS_KEY"), region_name="auto", config=Config(retries={"max_attempts": 3}, max_pool_connections=16))
B = "novinhas"

def listing(prefix):
    out, tok = [], None
    while True:
        r = s3.list_objects_v2(Bucket=B, Prefix=prefix, **({"ContinuationToken": tok} if tok else {}))
        out += [(o["Key"], o["Size"]) for o in r.get("Contents", [])]
        if not r.get("IsTruncated"): break
        tok = r["NextContinuationToken"]
    return out

def slugs():
    out, tok = [], None
    while True:
        r = s3.list_objects_v2(Bucket=B, Delimiter="/", **({"ContinuationToken": tok} if tok else {}))
        out += [c["Prefix"].rstrip("/") for c in r.get("CommonPrefixes", []) if not c["Prefix"].startswith("_")]
        if not r.get("IsTruncated"): break
        tok = r["NextContinuationToken"]
    return out

def one(job):
    i, key, dst = job
    a, b = f"/tmp/ci{i}.mp4", f"/tmp/co{i}.mp4"
    try:
        s3.download_file(B, key, a)
        pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", a], capture_output=True, text=True).stdout.strip().split(",")
        w, h = int(pr[0]), int(pr[1])
        scale = "scale=270:-2" if w <= h else "scale=-2:270"
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", a, "-t", "6", "-an", "-vf", scale + ",fps=24", "-c:v", "libx264", "-preset", "slow",
               "-crf", "27", "-maxrate", "380k", "-bufsize", "760k", "-g", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "1", "-y", b]
        if subprocess.run(cmd).returncode or not os.path.exists(b): return ("bad", key, 0, 0)
        ns = os.path.getsize(b)
        s3.upload_file(b, B, dst, ExtraArgs={"ContentType": "video/mp4"})
        return ("ok", key, os.path.getsize(a), ns)
    except Exception as e:
        return ("bad", key, 0, 0)
    finally:
        for f in (a, b):
            try: os.remove(f)
            except OSError: pass

jobs, n = [], 0
for slug in (slugs() if target == "ALL" else [target]):
    have = {k for k, _ in listing(f"{slug}/cards/c-")}
    todo = [(k, s) for k, s in listing(f"{slug}/clips/c-") if k.endswith(".mp4")]
    for k, _ in todo:
        dst = k.replace("/clips/", "/cards/")
        if dst not in have:
            n += 1; jobs.append((n, k, dst))
print("pendientes:", len(jobs), flush=True)
if dry: sys.exit(0)
tot = dict(ok=0, bad=0, before=0, after=0)
with ThreadPoolExecutor(4) as ex:
    for k, (st, key, a, b) in enumerate(ex.map(one, jobs), 1):
        tot[st] += 1; tot["before"] += a; tot["after"] += b
        if k % 50 == 0: print(f"{k}/{len(jobs)} ok={tot['ok']} bad={tot['bad']} {tot['before']//1024}KB -> {tot['after']//1024}KB", flush=True)
print(f"Done: ok={tot['ok']} bad={tot['bad']} {tot['before']//1024//1024}MB -> {tot['after']//1024//1024}MB", flush=True)
