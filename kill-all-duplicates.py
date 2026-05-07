#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kill-all-duplicates.py - 2026-05-07
MASTER CLEANUP. Mata 3 folders duplicados en una sola pasada:

  /twerk-hub-leaks/    → /playlist/         (slug-mapped + catch-all fallback)
  /latina-model-leaks/ → /ttl-latin-models/ (slug-mapped + catch-all)
  /twerk-dancer/       → /creator/SLUG or /creators.html (mapped)

Operaciones por cada folder:
  1. Mapea cada archivo viejo a su canonical (fuzzy match >= 0.78)
  2. Agrega redirects 301 al vercel.json (cada uno + catch-all)
  3. Mueve el folder entero a _deleted/<folder>-backup/ (safety)
  4. Limpia sitemap.xml + sitemap-videos.xml de URLs viejas
  5. Auto git add + commit + push

DRY-RUN por defecto. --apply para aplicar.

Uso:
    python kill-all-duplicates.py            # dry-run (preview)
    python kill-all-duplicates.py --apply    # aplica + commit + push
"""
import json
import re
import shutil
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

REPO = Path(__file__).parent
VERCEL_JSON = REPO / 'vercel.json'
SITEMAP = REPO / 'sitemap.xml'
SITEMAP_VIDEOS = REPO / 'sitemap-videos.xml'

DRY_RUN = '--apply' not in sys.argv

# Configuración: (old_folder, target_folder, target_index_or_html, catch_all_dest)
JOBS = [
    {
        'old': 'twerk-hub-leaks',
        'target_folder': 'playlist',
        'index_redirect': '/playlist/',
        'catch_all': '/playlist/',
        'reason': 'legacy duplicates of /playlist/',
    },
    {
        'old': 'latina-model-leaks',
        'target_folder': 'ttl-latin-models',
        'index_redirect': '/ttl-latin-models/',
        'catch_all': '/ttl-latin-models/',
        'reason': 'legacy slug for /ttl-latin-models/',
    },
    {
        'old': 'twerk-dancer',
        'target_folder': 'creator',
        'index_redirect': '/creators.html',
        'catch_all': '/creators.html',
        'reason': 'legacy URL pattern, redirected to /creators.html or specific /creator/SLUG',
    },
]


def normalize(slug):
    s = slug.replace('.html', '').lower()
    rep = {'ö':'o','ä':'a','ü':'u','ñ':'n','é':'e','è':'e','á':'a','í':'i','ó':'o','ú':'u'}
    for k, v in rep.items():
        s = s.replace(k, v)
    return re.sub(r'[^a-z0-9]+', '', s)


def best_match(old_slug, target_slugs, threshold=0.78):
    norm_old = normalize(old_slug)
    if len(norm_old) < 4:
        return None, 0
    best = (None, 0)
    for ts in target_slugs:
        norm_ts = normalize(ts)
        if abs(len(norm_old) - len(norm_ts)) > 30:
            continue
        # Truncated prefix match (common case for /twerk-hub-leaks/)
        if len(norm_old) < len(norm_ts) and norm_ts.startswith(norm_old):
            return ts, 1.0
        if len(norm_ts) < len(norm_old) and norm_old.startswith(norm_ts):
            return ts, 1.0
        ratio = SequenceMatcher(None, norm_old, norm_ts).ratio()
        if ratio > best[1]:
            best = (ts, ratio)
    if best[1] >= threshold:
        return best
    return None, best[1]


def process_job(job, vercel_data):
    old_folder = REPO / job['old']
    target_folder = REPO / job['target_folder']
    print(f"\n{'═'*72}")
    print(f"  /{job['old']}/  →  /{job['target_folder']}/")
    print(f"  reason: {job['reason']}")
    print(f"{'═'*72}")

    if not old_folder.is_dir():
        print(f"  /{job['old']}/ no existe — skip")
        return {'redirects_added': 0, 'files_removed': 0, 'sitemap_removed': 0}

    old_files = sorted([f.name for f in old_folder.iterdir() if f.is_file() and f.suffix == '.html'])
    target_files = []
    if target_folder.is_dir():
        target_files = sorted([f.name for f in target_folder.iterdir() if f.is_file() and f.suffix == '.html' and f.name != 'index.html'])

    print(f"  Archivos a mover:  {len(old_files)} en /{job['old']}/")
    print(f"  Targets posibles:  {len(target_files)} en /{job['target_folder']}/")

    # 1) Build mappings
    mappings = []
    matched = 0
    fallback = 0
    for old in old_files:
        if old == 'index.html':
            mappings.append((f"/{job['old']}/", job['index_redirect'], 1.0, 'index'))
            continue
        match, ratio = best_match(old, target_files)
        if match:
            mappings.append((f"/{job['old']}/{old}", f"/{job['target_folder']}/{match}", ratio, 'mapped'))
            matched += 1
        else:
            mappings.append((f"/{job['old']}/{old}", job['catch_all'], ratio, 'fallback'))
            fallback += 1

    print(f"  Mapeados:  {matched}   Fallback:  {fallback}")

    # 2) Update vercel.json redirects
    existing = vercel_data.get('redirects', [])
    existing_sources = {r.get('source') for r in existing}
    added_redirects = 0
    for src, dst, _, _ in mappings:
        if src not in existing_sources:
            existing.append({'source': src, 'destination': dst, 'permanent': True})
            existing_sources.add(src)
            added_redirects += 1
    catch_all = f"/{job['old']}/(.*)"
    if catch_all not in existing_sources:
        existing.append({'source': catch_all, 'destination': job['catch_all'], 'permanent': True})
        added_redirects += 1
    vercel_data['redirects'] = existing
    print(f"  Redirects agregados al vercel.json: {added_redirects}")

    # 3) Move folder to _deleted/
    files_removed = len(old_files)
    if not DRY_RUN:
        backup_dir = REPO / '_deleted' / f"{job['old']}-backup"
        backup_dir.parent.mkdir(parents=True, exist_ok=True)
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        shutil.move(str(old_folder), str(backup_dir))
        print(f"  Folder movido a {backup_dir}")
    else:
        print(f"  (dry-run: folder NO movido)")

    return {'redirects_added': added_redirects, 'files_removed': files_removed}


def clean_sitemap(path, prefixes):
    if not path.exists():
        return 0
    content = path.read_text(encoding='utf-8')
    before = len(re.findall(r'<url>', content))
    for prefix in prefixes:
        # Remove any <url>...</url> that contains /<prefix>/ or /<prefix>.html etc
        pattern = r'<url>(?:(?!</url>).)*?/' + re.escape(prefix) + r'(?:/|\.html|/(?:(?!</url>).)*?</url>)(?:(?!</url>).)*?</url>\s*'
        content = re.sub(pattern, '', content, flags=re.DOTALL)
        # Simpler version that catches slash-paths too
        pattern2 = r'<url>(?:(?!</url>).)*?/' + re.escape(prefix) + r'/(?:(?!</url>).)*?</url>\s*'
        content = re.sub(pattern2, '', content, flags=re.DOTALL)
    after = len(re.findall(r'<url>', content))
    removed = before - after
    if not DRY_RUN and removed > 0:
        path.write_text(content, encoding='utf-8', newline='\n')
    return removed


def main():
    print("=" * 72)
    print("  KILL ALL DUPLICATES  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    # Load vercel.json
    if not VERCEL_JSON.exists():
        print(f"ERROR: {VERCEL_JSON} no existe.")
        sys.exit(1)
    with open(VERCEL_JSON, 'r', encoding='utf-8') as f:
        vercel_data = json.load(f)

    # Process each job
    summary = []
    for job in JOBS:
        result = process_job(job, vercel_data)
        summary.append((job['old'], result))

    # Save vercel.json
    if not DRY_RUN:
        with open(VERCEL_JSON, 'w', encoding='utf-8') as f:
            json.dump(vercel_data, f, indent=2, ensure_ascii=False)
        print(f"\n  vercel.json guardado con todos los redirects nuevos")

    # Clean sitemaps
    print(f"\n{'─'*72}")
    print("  Limpieza de sitemaps")
    print(f"{'─'*72}")
    prefixes = [j['old'] for j in JOBS]
    for smap in [SITEMAP, SITEMAP_VIDEOS]:
        if not smap.exists():
            print(f"  {smap.name}: no existe")
            continue
        removed = clean_sitemap(smap, prefixes)
        print(f"  {smap.name}: removidas {removed} URLs")

    # Final summary
    print(f"\n{'═'*72}")
    print("  RESUMEN")
    print(f"{'═'*72}")
    total_redirects = sum(r['redirects_added'] for _, r in summary)
    total_files = sum(r['files_removed'] for _, r in summary)
    for old, result in summary:
        print(f"  /{old}/ → {result['files_removed']} files removed, {result['redirects_added']} redirects added")
    print(f"  TOTAL: {total_files} files moved to _deleted/, {total_redirects} redirects added")

    if DRY_RUN:
        print(f"\n  Para aplicar:  python kill-all-duplicates.py --apply")
        return

    # Auto git commit + push
    print(f"\n{'─'*72}")
    print("  Auto git add + commit + push")
    print(f"{'─'*72}")
    try:
        subprocess.run(['git', 'add', '-A'], check=False)
        msg = (
            "cleanup: kill duplicate folders /twerk-hub-leaks/, /latina-model-leaks/, "
            "/twerk-dancer/ - mapped 301 redirects to canonical playlists, "
            "moved files to _deleted/, cleaned sitemaps"
        )
        result = subprocess.run(['git', 'commit', '-m', msg], capture_output=True, text=True)
        print(result.stdout)
        if result.returncode == 0:
            print("  commit OK, pushing...")
            push = subprocess.run(['git', 'push'], capture_output=True, text=True)
            print(push.stdout)
            print(push.stderr)
        else:
            print("  ⚠ commit failed:")
            print(result.stderr)
    except Exception as e:
        print(f"  ⚠ git error: {e}")

    print(f"\n  ✓ DONE. Próximos pasos en GSC:")
    print(f"    - Validar redirects en https://search.google.com/search-console/")
    print(f"    - Request URL removal para los paths viejos (acelera deindex)")


if __name__ == '__main__':
    main()
