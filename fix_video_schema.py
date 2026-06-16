#!/usr/bin/env python3
# Arregla el schema VideoObject de todas las paginas:
#  - agrega uploadDate donde falta (los "invalid: missing field uploadDate")
#  - normaliza fecha-sola (2026-04-20) a ISO con timezone (missing timezone / invalid datetime)
# Idempotente: se puede correr varias veces sin romper nada.
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATE = '2026-04-20T12:00:00+00:00'
SKIP = {'node_modules', '.git', '_deleted'}

scanned = inserted = normalized = files_changed = 0

for dp, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP]
    for fn in files:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dp, fn)
        try:
            s = open(p, encoding='utf-8').read()
        except Exception:
            continue
        # soporta con y sin espacio despues de los dos puntos
        marker = '"@type":"VideoObject"' if '"@type":"VideoObject"' in s else (
                 '"@type": "VideoObject"' if '"@type": "VideoObject"' in s else None)
        if marker is None:
            continue
        scanned += 1
        orig = s
        parts = s.split(marker)
        for k in range(1, len(parts)):
            seg = parts[k]
            if 'uploadDate' not in seg[:900]:
                add = ',"uploadDate":"%s"' % DATE
                seg = (add + seg[1:]) if seg[:1] == ',' else (add + seg)
                parts[k] = seg
                inserted += 1
        s = marker.join(parts)
        s2 = re.sub(r'("uploadDate"\s*:\s*")(\d{4}-\d{2}-\d{2})(")',
                    r'\g<1>\g<2>T12:00:00+00:00\g<3>', s)
        if s2 != s:
            normalized += 1
        s = s2
        if s != orig:
            open(p, 'w', encoding='utf-8').write(s)
            files_changed += 1

print("Paginas con VideoObject escaneadas:", scanned)
print("uploadDate agregados (faltaban):", inserted)
print("Fechas normalizadas (timezone):", normalized)
print("Archivos modificados:", files_changed)
