# Builds provisional "coming soon" pages for Twerkhub model slugs (+18 disclaimer, link back home).
# Replace each page with the full catalog once its folder (previews + R2 videos) is ready.
import os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = {'tainara': 'Tainara', 'vegan': 'Vegan', 'camila': 'Camila', 'alexia': 'Alexia', 'lolita': 'Lolita'}
TPL = """<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name} · Catálogo privado | Twerkhub</title>
<meta name="description" content="Catálogo privado de {name} en Twerkhub. Solo mayores de 18 años.">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://twerkhub.lat/{slug}/">
<style>
:root{{--gold:#e8c872;--bg:#0b0905}}
*{{box-sizing:border-box}}
body{{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 35%,#2a2008,var(--bg) 70%);color:#f6eedb;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}}
img.logo{{width:140px;height:auto;filter:drop-shadow(0 12px 24px #000a) drop-shadow(0 0 22px rgba(232,200,114,.35));margin-bottom:18px}}
h1{{font:400 56px Anton,Impact,sans-serif;letter-spacing:.02em;margin:0 0 6px;color:var(--gold)}}
p{{margin:6px 0;opacity:.85;max-width:520px}}
.soon{{font:700 11px monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);opacity:.9;margin-top:14px}}
.age{{margin-top:28px;font-size:12px;opacity:.7;max-width:520px}}
a.btn{{display:inline-block;margin-top:26px;padding:13px 22px;border-radius:12px;border:2px solid #c99a2e;background:linear-gradient(180deg,#17120a,#000);color:var(--gold);text-decoration:none;font-weight:700}}
a.btn:hover{{background:linear-gradient(180deg,#f7dd8b,#c99a2e 60%,#8f6a14);color:#1a1204}}
</style></head>
<body>
<img class="logo" src="/assets/rabbit.png" alt="">
<h1>{name}</h1>
<p>Catálogo privado en preparación.</p>
<div class="soon">Próximamente</div>
<p class="age">Contenido exclusivo +18. Todas las modelos son mayores de 18 años y aparecen bajo contrato escrito. Los menores de edad no pueden ingresar.</p>
<a class="btn" href="/">Volver a Twerkhub</a>
</body></html>
"""
for slug, name in MODELS.items():
    d = os.path.join(ROOT, slug)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(TPL.format(name=html.escape(name), slug=slug))
    print('wrote', slug)
