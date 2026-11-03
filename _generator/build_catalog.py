# Builds the private catalog page for each Twerkhub model from Jenny's page template.
# Videos are discovered from <slug>/p/ : v01.mp4 (+ v01.jpg poster), v02.mp4, ...
# Full originals live in the private R2 bucket under "<slug>/v01.mp4" (served by /api/c/<slug>/video).
# Usage: python3 _generator/build_catalog.py            (all models)
#        python3 _generator/build_catalog.py abbi       (one model)
import os, re, sys, html, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = {'abbi': 'Abbi', 'tainara': 'Tainara', 'vegan': 'Vegan', 'camila': 'Camila', 'alexia': 'Alexia', 'lolita': 'Lolita'}
TEMPLATE = open(os.path.join(ROOT, 'jenny', 'index.html'), encoding='utf-8').read()

def videos(slug):
    p = os.path.join(ROOT, slug, 'p')
    out = []
    for f in sorted(glob.glob(os.path.join(p, 'v[0-9][0-9].mp4'))):
        n = os.path.basename(f)[1:3]
        out.append((n, os.path.exists(os.path.join(p, f'v{n}.jpg'))))
    return out

def card(slug, name, n, has_poster, pos):
    poster = f' poster="p/v{n}.jpg"' if has_poster else ''
    return (f'<article class="c long" id="v{n}" data-n="{n}" data-pos="{pos}"><div class="v">'
            f'<video muted loop playsinline preload="none"{poster} data-src="p/v{n}.mp4"></video>'
            f'<span class="tag">PREVIEW · LOW RES</span><span class="fire">🔥 HOT</span><span class="lock">🔒</span></div>'
            f'<div class="cb"><div class="k">{html.escape(name.upper())} · #{n}</div><h3>Video {n}</h3>'
            f'<p>1 coin · or in the full pack</p>'
            f'<button class="full">▶ Watch &amp; download · Original resolution</button></div></article>')

def build(slug, name):
    vids = videos(slug)
    N = len(vids)
    s = TEMPLATE
    # 1) nothing is removed from the template; only per-model values change below
    # 2) catalog grid + chips from discovered files
    if N:
        cards = ''.join(card(slug, name, n, hp, i + 1) for i, (n, hp) in enumerate(vids))
    else:
        cards = '<p class="msg" style="grid-column:1/-1;text-align:center;padding:60px 0">Videos en preparación.</p>'
    s = re.sub(r'<div class="grid" id="grid">.*?</article></div>', lambda m: f'<div class="grid" id="grid">{cards}</div>', s, flags=re.S) if N else \
        re.sub(r'<div class="grid" id="grid">.*?</article></div>', lambda m: f'<div class="grid" id="grid">{cards}</div>', s, flags=re.S)
    s = re.sub(r'<div class="chips" id="chips">.*?</div>', f'<div class="chips" id="chips"><button class="chip on" data-f="all">All · {N}</button></div>', s, flags=re.S)
    # 3) hero preview from first video
    if N:
        first = vids[0][0]
        s = re.sub(r'(<section class="hero"|<div class="hero">)', r'\1', s)
        s = re.sub(r'src="p/hero_v\d+\.mp4"', f'src="p/v{first}.mp4"', s)
        s = re.sub(r'poster="p/v\d+\.jpg"', f'poster="p/v{first}.jpg"', s)
    # 4) names, counts, links
    s = s.replace('/api/jenny/', f'/api/c/{slug}/')
    s = s.replace('href="/jenny/"', f'href="/{slug}/"')
    s = s.replace('https://twerkhub.lat/jenny/', f'https://twerkhub.lat/{slug}/')
    s = s.replace('Jenny VIP', f'{name} VIP')
    s = s.replace('Jenny.<br>', f'{name}.<br>')
    s = s.replace('JENNY ★', f'{name.upper()} ★')
    s = re.sub(r'\b93\b', str(N), s)
    s = s.replace('63 clips', f'{N} clips').replace('63 Originals', f'{N} Originals')
    s = s.replace('Jenny · Private', f'{name} · Private').replace("Jenny's private", f"{name}'s private")
    s = s.replace('<html lang="en">', '<html lang="es">')
    s = s.replace('Jenny', name)  # any remaining copy
    # Owner photo lives in jenny/p (shared Twerkhub owner image)
    s = s.replace(f'/{slug}/p/owner.jpg', '/jenny/p/owner.jpg')
    os.makedirs(os.path.join(ROOT, slug), exist_ok=True)
    with open(os.path.join(ROOT, slug, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(s)
    print(f'{slug}: {N} videos')

if __name__ == '__main__':
    targets = sys.argv[1:] or list(MODELS)
    for slug in targets:
        build(slug, MODELS[slug])
