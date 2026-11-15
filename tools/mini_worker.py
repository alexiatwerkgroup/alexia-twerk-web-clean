# Corta y sube los miniclips pendientes (cola en R2 _config/mini-queue.json). Corre en GitHub Actions (credenciales por variables de entorno).
import os, sys, json, subprocess, boto3
from botocore.config import Config
from botocore.exceptions import ClientError
def env(k):
    v = (os.environ.get(k) or '').strip().strip('"\'').strip()
    print(k, 'len', len(v), 'vacio' if not v else 'ok', flush=True)
    return v
EP, AK, SK = env('R2_ENDPOINT'), env('AWS_ACCESS_KEY_ID'), env('AWS_SECRET_ACCESS_KEY')
if EP and not EP.startswith('https://'): print('R2_ENDPOINT no empieza con https:// ->', EP[:12]); sys.exit(1)
s3 = boto3.client('s3', endpoint_url=EP, aws_access_key_id=AK, aws_secret_access_key=SK, region_name='auto', config=Config(retries={'max_attempts': 3}))
B = 'novinhas'
def has(k):
    try: s3.head_object(Bucket=B, Key=k); return True
    except ClientError: return False
picks = json.loads(s3.get_object(Bucket=B, Key='_config/mini-queue.json')['Body'].read())['items']
todo = [p for p in picks if not has('%s/mini/m-%d-%d-%s.mp4' % (p['c'], int(p['id']), int(p['start']), 's' if p.get('slow') else 'n'))]
print('marcados', len(picks), 'pendientes', len(todo), flush=True)
ok = err = 0
for p in todo:
    c, v, st, slow = p['c'], int(p['id']), int(p['start']), int(p.get('slow', 0) or 0)
    nn = '%02d' % v; key = '%s/mini/m-%d-%d-%s.mp4' % (c, v, st, 's' if slow else 'n')
    src, out, pj = '/tmp/src.mp4', '/tmp/clip.mp4', '/tmp/poster.webp'
    for f in (src, out, pj):
        try: os.remove(f)
        except OSError: pass
    got = False
    for pre in ('full', '480h'):
        try: s3.download_file(B, '%s/%s/video-%s.mp4' % (c, pre, nn), src); got = True; break
        except ClientError: pass
    if not got: err += 1; print('ERROR fuente', c, nn); continue
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(st), '-i', src] + (['-t', '15', '-an', '-vf', 'setpts=2.0*PTS', '-r', '30'] if slow else ['-t', '30', '-an']) + ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', out]
    if subprocess.run(cmd).returncode != 0 or not os.path.exists(out): err += 1; print('ERROR corte', key); continue
    s3.upload_file(out, B, key, ExtraArgs={'ContentType': 'video/mp4'})
    if subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', out, '-ss', '2', '-frames:v', '1', '-vf', 'scale=-2:640', '-c:v', 'libwebp', '-quality', '88', pj]).returncode == 0 and os.path.exists(pj):
        s3.upload_file(pj, B, key[:-4] + '.webp', ExtraArgs={'ContentType': 'image/webp'})
    ok += 1; print('SUBIDO', key, flush=True)
print('Listo:', ok, 'subidos,', err, 'errores')
sys.exit(1 if err else 0)
