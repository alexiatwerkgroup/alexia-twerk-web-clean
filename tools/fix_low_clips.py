"""Regenera clips/minis de Novinhas que quedaron en baja resolucion (cortados desde 480h) usando el video 'full'.
Uso: python3 tools/fix_low_clips.py <slug> [dry]"""
import json, os, subprocess, sys
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

def env(n): return (os.environ.get(n) or "").strip().strip("\"'").strip()
slug = sys.argv[1]; dry = len(sys.argv) > 2 and sys.argv[2] == "dry"
s3 = boto3.client("s3", endpoint_url=env("R2_ENDPOINT"), aws_access_key_id=env("AWS_ACCESS_KEY_ID"),
                  aws_secret_access_key=env("AWS_SECRET_ACCESS_KEY"), region_name="auto", config=Config(retries={"max_attempts": 3}))
B = "novinhas"
man = json.loads(s3.get_object(Bucket=B, Key=f"{slug}/_videos.json")["Body"].read())
dims = {int(v["id"]): min(int(v.get("width") or 0), int(v.get("height") or 0)) for v in man.get("videos", [])}

def probe(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return min(int(o[0]), int(o[1])), float(d)

keys = []
for pre in ("clips/c-", "mini/m-"):
    tok = None
    while True:
        r = s3.list_objects_v2(Bucket=B, Prefix=f"{slug}/{pre}", **({"ContinuationToken": tok} if tok else {}))
        keys += [o["Key"] for o in r.get("Contents", []) if o["Key"].endswith(".mp4")]
        if not r.get("IsTruncated"): break
        tok = r["NextContinuationToken"]
print("clips/minis:", len(keys), flush=True)
fixed = skipped = bad = 0
for key in keys:
    name = key.rsplit("/", 1)[1][:-4].split("-")  # c-ID-START  |  m-ID-START-s|n
    vid, start = int(name[1]), float(name[2]); slow_name = len(name) > 3 and name[3] == "s"
    want = dims.get(vid, 0)
    try:
        s3.download_file(B, key, "/tmp/old.mp4"); short, dur = probe("/tmp/old.mp4")
    except Exception as e:
        print("ERR probe", key, e, flush=True); bad += 1; continue
    if not want or short >= want * 0.8:
        skipped += 1; continue
    slow = slow_name or (name[0] == "c" and dur <= 10.5)
    print(("DRY " if dry else "FIX ") + key, f"{short}p -> {want}p dur={dur:.1f} slow={slow}", flush=True)
    if dry: continue
    try:
        s3.download_file(B, f"{slug}/full/video-{vid:02d}.mp4", "/tmp/full.mp4")
    except ClientError:
        print("SKIP sin full", key, flush=True); bad += 1; continue
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-i", "/tmp/full.mp4", "-t", f"{dur:.3f}", "-an"]
    if slow: cmd += ["-vf", "setpts=2.0*PTS", "-r", "30"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", "/tmp/new.mp4"]
    if subprocess.run(cmd).returncode or not os.path.exists("/tmp/new.mp4"):
        print("ERR encode", key, flush=True); bad += 1; continue
    ns, nd = probe("/tmp/new.mp4")
    if ns < want * 0.8 or nd < 0.5:
        print("ERR resultado raro", key, ns, nd, flush=True); bad += 1; continue
    s3.upload_file("/tmp/new.mp4", B, key, ExtraArgs={"ContentType": "video/mp4"}); fixed += 1
    os.remove("/tmp/new.mp4")
print(f"Done: fixed={fixed} ok={skipped} problems={bad}", flush=True)
