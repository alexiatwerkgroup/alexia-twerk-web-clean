"""Process one missing Enhanced video from R2 through the Salad GPU upscaler."""
import json
import os
import subprocess
import sys
import time

import boto3
import requests
from botocore.config import Config
from botocore.exceptions import ClientError


def env(name):
    value = (os.environ.get(name) or "").strip().strip("\"'").strip()
    print(name, "present" if value else "missing", flush=True)
    return value


endpoint = env("R2_ENDPOINT")
access_key = env("AWS_ACCESS_KEY_ID")
secret_key = env("AWS_SECRET_ACCESS_KEY")
upscaler_url = env("SALAD_UPSCALER_URL").rstrip("/")
upscaler_token = env("SALAD_UPSCALER_TOKEN")
if not endpoint.startswith("https://") or not access_key or not secret_key or not upscaler_url.startswith("https://") or not upscaler_token:
    sys.exit("R2 or Salad upscaler credentials are incomplete")

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
    queue_doc = json.loads(s3.get_object(Bucket=bucket, Key="_config/enh-queue.json")["Body"].read())
    items = queue_doc.get("items", [])
except ClientError as exc:
    if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
        print("No Enhanced queue yet", flush=True)
        sys.exit(0)
    raise

pending = []
seen = set()
for item in items:
    slug = str(item.get("c", ""))
    try:
        vid = int(item["id"])
    except (KeyError, TypeError, ValueError):
        continue
    if not slug or vid <= 0:
        continue
    key = f"{slug}/hq/video-{vid:02d}.mp4"
    if key not in seen and not exists(key):
        seen.add(key)
        pending.append((item, slug, vid, key))

print("Enhanced queue:", len(items), "entries;", len(pending), "missing outputs", flush=True)
if not pending:
    sys.exit(0)

# A single GPU model job per scheduled run prevents overlapping inference work.
item, slug, vid, output_key = pending[0]
number = f"{vid:02d}"
source = "/tmp/enhanced-source.mp4"
result = "/tmp/enhanced-result.mp4"
for path in (source, result):
    try:
        os.remove(path)
    except OSError:
        pass

downloaded = False
for folder in ("full", "480h"):
    try:
        s3.download_file(bucket, f"{slug}/{folder}/video-{number}.mp4", source)
        downloaded = True
        break
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
            raise
if not downloaded:
    sys.exit(f"Source video is missing for {slug} #{number}; leaving it queued")

base = upscaler_url
headers = {"X-Token": upscaler_token}
health_deadline = time.time() + 15 * 60
while time.time() < health_deadline:
    try:
        if requests.get(base + "/health", timeout=10).ok:
            break
    except requests.RequestException:
        pass
    print("Waiting for Salad GPU endpoint", flush=True)
    time.sleep(15)
else:
    sys.exit("Salad GPU endpoint did not become ready")

with open(source, "rb") as stream:
    response = requests.post(
        base + "/jobs?lado=1080&dn=0", data=stream,
        headers={**headers, "Content-Type": "video/mp4"},
        timeout=(30, 15 * 60),
    )
response.raise_for_status()
job_id = response.json()["id"]
print("Enhanced job started for", slug, number, flush=True)
deadline = time.time() + 5 * 60 * 60
while time.time() < deadline:
    status = requests.get(base + "/jobs/" + job_id, headers=headers, timeout=30)
    status.raise_for_status()
    state = status.json()
    if state.get("status") == "error":
        raise RuntimeError(state.get("error", "Upscaler failed"))
    if state.get("status") == "done":
        break
    print("Enhanced job status:", state.get("status", "unknown"), flush=True)
    time.sleep(20)
else:
    raise TimeoutError("Upscaler job exceeded the five-hour processing window")

with requests.get(base + "/jobs/" + job_id + "/result", headers=headers, stream=True, timeout=900) as response:
    response.raise_for_status()
    with open(result, "wb") as stream:
        for block in response.iter_content(1024 * 1024):
            if block:
                stream.write(block)
if os.path.getsize(result) < 1024:
    raise RuntimeError("Upscaler returned an empty video")

s3.upload_file(result, bucket, output_key, ExtraArgs={"ContentType": "video/mp4"})
poster_key = f"{slug}/previews/poster-{number}.webp"
if not exists(poster_key):
    poster = "/tmp/enhanced-poster.webp"
    poster_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", result,
                  "-ss", "2", "-frames:v", "1", "-vf", "scale=-2:640", "-c:v", "libwebp",
                  "-quality", "88", poster]
    if subprocess.run(poster_cmd).returncode == 0 and os.path.exists(poster):
        s3.upload_file(poster, bucket, poster_key, ExtraArgs={"ContentType": "image/webp"})
print("READY Enhanced:", output_key, flush=True)
