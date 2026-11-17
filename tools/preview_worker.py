"""Create missing owner-selected preview clips from the R2 queue."""
import json
import os
import subprocess
import sys

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def env(name):
    value = (os.environ.get(name) or "").strip().strip("\"'").strip()
    print(name, "present" if value else "missing", flush=True)
    return value


endpoint = env("R2_ENDPOINT")
access_key = env("AWS_ACCESS_KEY_ID")
secret_key = env("AWS_SECRET_ACCESS_KEY")
if not endpoint.startswith("https://") or not access_key or not secret_key:
    sys.exit("R2 credentials are incomplete")

s3 = boto3.client(
    "s3", endpoint_url=endpoint, aws_access_key_id=access_key,
    aws_secret_access_key=secret_key, region_name="auto",
    config=Config(retries={"max_attempts": 3}),
)
bucket = "novinhas"


def exists(key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return False
        raise


try:
    queue_doc = json.loads(s3.get_object(Bucket=bucket, Key="_config/feat-clips.json")["Body"].read())
    items = queue_doc.get("items", [])
except ClientError as exc:
    if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
        print("No preview queue yet", flush=True)
        sys.exit(0)
    raise

todo = []
seen = set()
for item in items:
    slug = str(item.get("c", ""))
    try:
        vid, start = int(item["id"]), max(0, int(item.get("start", 0)))
    except (KeyError, TypeError, ValueError):
        continue
    if not slug or vid <= 0:
        continue
    key = f"{slug}/clips/c-{vid}-{start}.mp4"
    if key not in seen and not exists(key):
        seen.add(key)
        todo.append((item, key, vid, start))

print("Preview queue:", len(items), "entries;", len(todo), "missing clips", flush=True)
ok = errors = 0
for item, key, vid, start in todo:
    slug = str(item["c"])
    number = f"{vid:02d}"
    src = "/tmp/preview-source.mp4"
    out = "/tmp/preview-clip.mp4"
    poster = "/tmp/preview-poster.webp"
    for path in (src, out, poster):
        try:
            os.remove(path)
        except OSError:
            pass

    downloaded = False
    for folder in ("full", "480h"):
        try:
            s3.download_file(bucket, f"{slug}/{folder}/video-{number}.mp4", src)
            downloaded = True
            break
        except ClientError as exc:
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
                raise
    if not downloaded:
        errors += 1
        print("ERROR source missing:", slug, number, flush=True)
        continue

    slow = bool(item.get("slow"))
    duration = 10 if slow else 20
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-i", src,
           "-t", str(duration), "-an"]
    if slow:
        cmd += ["-vf", "setpts=2.0*PTS", "-r", "30"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-y", out]
    if subprocess.run(cmd).returncode or not os.path.exists(out):
        errors += 1
        print("ERROR encoding:", key, flush=True)
        continue

    s3.upload_file(out, bucket, key, ExtraArgs={"ContentType": "video/mp4"})
    poster_key = f"{slug}/previews/poster-{number}.webp"
    if not exists(poster_key):
        poster_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", out,
                      "-ss", "2", "-frames:v", "1", "-vf", "scale=-2:640", "-c:v", "libwebp",
                      "-quality", "88", poster]
        if subprocess.run(poster_cmd).returncode == 0 and os.path.exists(poster):
            s3.upload_file(poster, bucket, poster_key, ExtraArgs={"ContentType": "image/webp"})
    ok += 1
    print("READY preview:", key, flush=True)

print("Done:", ok, "previews created;", errors, "errors", flush=True)
sys.exit(1 if errors else 0)
