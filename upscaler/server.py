"""Servicio de mejora de video (Real-ESRGAN). Trabajos asincronos: POST /jobs, GET /jobs/<id>, GET /jobs/<id>/result.
Todas las rutas (menos /health) exigen el header X-Token igual a la variable UPSCALER_TOKEN."""
import os, sys, uuid, json, shutil, subprocess, threading, queue, time
from flask import Flask, request, jsonify, send_file, abort

TOKEN = os.environ.get('UPSCALER_TOKEN', '')
if len(TOKEN) < 12:
    sys.exit('Falta UPSCALER_TOKEN (minimo 12 caracteres). No arranco sin token.')
DATA = os.environ.get('DATA_DIR', '/data'); os.makedirs(DATA, exist_ok=True)
REPO = os.environ.get('REALESRGAN_DIR', '/app/Real-ESRGAN')
PORT = int(os.environ.get('PORT', '8000'))
app = Flask(__name__)
JOBS = {}; Q = queue.Queue(); LOCK = threading.Lock()

def probe(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', path]).decode().strip()
    w, h = out.split('x'); return int(w), int(h)

def even_scale(w, h, esc):
    """El script calcula la salida como int(w*s) x int(h*s) y libx264/yuv420p exige medidas pares: busco la escala mas cercana que de pares."""
    cands = [esc]
    for k in range(1, 400):
        cands += [round(esc + k * 0.0005, 4), round(esc - k * 0.0005, 4)]
    for c in cands:
        if c > 1 and int(w * c) % 2 == 0 and int(h * c) % 2 == 0: return c
    return esc

def set_job(jid, **kw):
    with LOCK: JOBS[jid].update(kw)

def worker():
    while True:
        jid = Q.get()
        try:
            j = JOBS[jid]; src = j['src']; lado = j['lado']; dn = j['dn']
            w, h = probe(src); esc = round(lado / min(w, h), 2)
            if esc > 1.05: esc = even_scale(w, h, esc)
            set_job(jid, status='running', width=w, height=h, scale=esc, started=time.time())
            outdir = os.path.join(DATA, jid, 'out'); os.makedirs(outdir, exist_ok=True)
            if esc <= 1.05:
                shutil.copy(src, os.path.join(outdir, 'resultado.mp4'))
                set_job(jid, status='done', result=os.path.join(outdir, 'resultado.mp4'), note='ya tenia resolucion suficiente, se devuelve igual'); continue
            cmd = [sys.executable, 'inference_realesrgan_video.py', '-i', src, '-n', 'realesr-general-x4v3', '-dn', str(dn), '-s', str(esc), '--suffix', 'mejorado', '-o', outdir]
            p = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
            files = [f for f in os.listdir(outdir) if f.endswith('.mp4')]
            if p.returncode != 0 or not files:
                set_job(jid, status='error', error=(p.stderr or p.stdout)[-800:]); continue
            set_job(jid, status='done', result=os.path.join(outdir, files[0]), seconds=round(time.time() - j['started'], 1))
        except Exception as e:
            set_job(jid, status='error', error=str(e)[-800:])
        finally:
            try: os.remove(JOBS[jid]['src'])
            except Exception: pass
            Q.task_done()

@app.before_request
def auth():
    if request.path == '/health': return
    if request.headers.get('X-Token', '') != TOKEN: abort(401)

@app.get('/health')
def health():
    with LOCK: n = sum(1 for j in JOBS.values() if j['status'] in ('queued', 'running'))
    return jsonify(ok=True, pendientes=n)

@app.post('/jobs')
def create():
    lado = max(240, min(2160, int(request.args.get('lado', 1080)))); dn = max(0.0, min(1.0, float(request.args.get('dn', 0))))
    jid = uuid.uuid4().hex[:12]; d = os.path.join(DATA, jid); os.makedirs(d, exist_ok=True); src = os.path.join(d, 'entrada.mp4')
    with open(src, 'wb') as f:
        while True:
            c = request.stream.read(1 << 20)
            if not c: break
            f.write(c)
    if os.path.getsize(src) < 1024: shutil.rmtree(d, ignore_errors=True); abort(400)
    with LOCK: JOBS[jid] = {'status': 'queued', 'src': src, 'lado': lado, 'dn': dn, 'created': time.time()}
    Q.put(jid); return jsonify(id=jid, status='queued')

@app.get('/jobs/<jid>')
def status(jid):
    j = JOBS.get(jid) or abort(404)
    return jsonify({k: v for k, v in j.items() if k not in ('src', 'result')})

@app.get('/jobs/<jid>/result')
def result(jid):
    j = JOBS.get(jid) or abort(404)
    if j['status'] != 'done': abort(409)
    return send_file(j['result'], mimetype='video/mp4', as_attachment=True, download_name='mejorado.mp4')

@app.delete('/jobs/<jid>')
def delete(jid):
    j = JOBS.pop(jid, None); shutil.rmtree(os.path.join(DATA, jid), ignore_errors=True); return jsonify(ok=True)

if __name__ == '__main__':
    threading.Thread(target=worker, daemon=True).start()
    from waitress import serve
    opts = dict(threads=8, max_request_body_size=6 * 1024 ** 3, channel_timeout=900)
    try:
        serve(app, listen='[::]:%d' % PORT, **opts)  # Salad entra por IPv6; en Linux '::' tambien atiende IPv4
    except OSError as e:
        print('IPv6 no disponible (%s), sigo solo con IPv4' % e, flush=True)
        serve(app, host='0.0.0.0', port=PORT, **opts)
