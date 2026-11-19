"""Generate secure five-second teaser files for videos currently locked by VIP config."""
import json
import os
import subprocess
import sys

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


def env(name):
    return (os.environ.get(name) or "").strip().strip("\"'").strip()


endpoint, access_key, secret_key = env("R2_ENDPOINT"), env("AWS_ACCESS_KEY_ID"), env("AWS_SECRET_ACCESS_KEY")
if not endpoint.startswith("https://") or not access_key or not secret_key:
    sys.exit("R2 credentials are incomplete")
s3 = boto3.client("s3", endpoint_url=endpoint, aws_access_key_id=access_key,
                  aws_secret_access_key=secret_key, region_name="auto",
                  config=Config(retries={"max_attempts": 3}))
bucket = "novinhas"


def get_json(key):
    try:
        return json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return None
        raise


def exists(key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return False
        raise


cfg = get_json("_config/vip.json") or {}
channels = cfg.get("channels", {})
todo = []
pages = s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Delimiter="/")
slugs = [p["Prefix"].strip("/") for page in pages for p in page.get("CommonPrefixes", [])]
# Canales retirados del sitio: no tienen videos en R2 y gastaban los 100 intentos de cada corrida.
REMOVED = {"carol-videos"}
for slug in slugs:
    if slug in REMOVED:
        continue
    access = channels.get(slug, {})
    if not access.get("vip"):
        continue
    catalog = get_json(f"{slug}/_videos.json") or {}
    free = {int(x) for x in access.get("free", [])}
    existing = set()
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=f"{slug}/teasers/"):
        existing.update(obj["Key"] for obj in page.get("Contents", []))
    for video in catalog.get("videos", []):
        try:
            vid = int(video["id"])
        except (KeyError, TypeError, ValueError):
            continue
        if vid in free:
            continue
        n = f"{vid:02d}"
        target = f"{slug}/teasers/video-{n}.mp4"
        if target not in existing:
            todo.append((slug, n, target))

# Prepare Claudio's main channel first; then continue with every other VIP channel.
todo.sort(key=lambda item: (item[0] != "chica-twerk", item[0], int(item[1])))

limit = 100
print(f"Missing teasers: {len(todo)}; processing up to {limit}", flush=True)
ok = errors = missing = 0
for slug, number, target in todo:
    if ok + errors >= limit:
        break
    source, output = "/tmp/locked-source.mp4", "/tmp/locked-teaser.mp4"
    for path in (source, output):
        try:
            os.remove(path)
        except OSError:
            pass
    try:
        s3.download_file(bucket, f"{slug}/full/video-{number}.mp4", source)
    except ClientError as exc:
        missing += 1
        print(f"SKIP source missing: {slug}/{number}", flush=True)
        continue
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", source, "-t", "5",
           "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", output]
    if subprocess.run(cmd).returncode or not os.path.exists(output):
        errors += 1
        print(f"ERROR encoding teaser: {slug}/{number}", flush=True)
        continue
    s3.upload_file(output, bucket, target, ExtraArgs={"ContentType": "video/mp4"})
    ok += 1
    print(f"READY teaser: {slug}/{number}", flush=True)

print(f"Done: {ok} teasers created; {errors} encode errors; {missing} skipped (source missing)", flush=True)
if errors:
    print(f"::warning title=locked_teaser::{errors} teasers con error de encode; se reintentan en la proxima corrida")
sys.exit(0)
