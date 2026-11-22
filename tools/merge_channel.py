"""Pasa los videos de un canal origen a otro destino (copia en R2, sin bajar nada), saltando repetidos.
Repetido = mismo titulo o misma (duracion, ancho, alto). Los ids nuevos siguen desde el max del destino (quedan bloqueados/VIP).
Uso: python3 tools/merge_channel.py <origen> <destino> [dry]"""
import json, os, re, sys
import boto3
from botocore.config import Config

def env(n): return (os.environ.get(n) or "").strip().strip("\"'").strip()
src, dst = sys.argv[1], sys.argv[2]; dry = len(sys.argv) > 3 and sys.argv[3] == "dry"
s3 = boto3.client("s3", endpoint_url=env("R2_ENDPOINT"), aws_access_key_id=env("AWS_ACCESS_KEY_ID"),
                  aws_secret_access_key=env("AWS_SECRET_ACCESS_KEY"), region_name="auto", config=Config(retries={"max_attempts": 5}))
B = "novinhas"
def rj(k): return json.loads(s3.get_object(Bucket=B, Key=k)["Body"].read())
def keys(prefix):
    out, tok = [], None
    while True:
        r = s3.list_objects_v2(Bucket=B, Prefix=prefix, **({"ContinuationToken": tok} if tok else {}))
        out += [o["Key"] for o in r.get("Contents", [])]
        if not r.get("IsTruncated"): break
        tok = r["NextContinuationToken"]
    return out

S, D = rj(f"{src}/_videos.json"), rj(f"{dst}/_videos.json")
sig = lambda v: (round(float(v.get("duration") or 0), 1), v.get("width"), v.get("height"))
have_t = {v.get("title") for v in D["videos"]}; have_s = {sig(v) for v in D["videos"]}
nxt = max(v["id"] for v in D["videos"]) + 1
mapping, dup = {}, []
for v in S["videos"]:
    if v.get("title") in have_t or sig(v) in have_s: dup.append(v["id"]); continue
    mapping[v["id"]] = nxt; nxt += 1
print(f"origen={len(S['videos'])} destino={len(D['videos'])} repetidos={len(dup)} nuevos={len(mapping)} ids {min(mapping.values()) if mapping else '-'}..{nxt-1}", flush=True)
if dry: sys.exit(0)

pad = lambda n: str(n).zfill(2)
pats = [(re.compile(r"^(full|480h|hq|teasers)/video-(\d+)(\..+)$"), lambda m, n: f"{m[1]}/video-{pad(n)}{m[3]}"),
        (re.compile(r"^previews/poster-(\d+)(\..+)$"), lambda m, n: f"previews/poster-{pad(n)}{m[2]}"),
        (re.compile(r"^clips/c-(\d+)-(.+)$"), lambda m, n: f"clips/c-{n}-{m[2]}"),
        (re.compile(r"^mini/m-(\d+)-(.+)$"), lambda m, n: f"mini/m-{n}-{m[2]}")]
copied = skipped = 0
for k in keys(src + "/"):
    rel = k[len(src) + 1:]
    for rx, f in pats:
        m = rx.match(rel)
        if not m: continue
        old = int(m[2] if rx.pattern.startswith("^(full") else m[1])
        if old not in mapping: break
        nk = f"{dst}/" + f(m, mapping[old])
        s3.copy({"Bucket": B, "Key": k}, B, nk); copied += 1
        if copied % 100 == 0: print("copiados", copied, flush=True)
        break
    else:
        if rel != "_videos.json": print("clave no reconocida", rel, flush=True)
        continue
new = []
for v in S["videos"]:
    if v["id"] in mapping:
        w = dict(v); w["id"] = mapping[v["id"]]; new.append(w)
D["videos"] += new
if "count" in D: D["count"] = len(D["videos"])
s3.put_object(Bucket=B, Key=f"{dst}/_videos.json", Body=json.dumps(D).encode(), ContentType="application/json")
print(f"Done: archivos copiados={copied} videos nuevos={len(new)} total destino={len(D['videos'])}", flush=True)
