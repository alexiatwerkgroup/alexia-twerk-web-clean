#!/usr/bin/env python3
"""
Unified Playlist Generator — Single source of truth for playlist HTML generation
Replaces: generate_new_playlists.py, generate_playlist_html.py
v20260511-unified
"""

import os
import json
import sys
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from urllib.parse import quote

def load_playlist_data(data_file):
    """Load playlist data from JSON file."""
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ Error loading {data_file}: {e}", file=sys.stderr)
        return None

def generate_schema_jsonld(playlist_data):
    """Generate VideoObject schema JSON-LD for SEO."""
    videos = playlist_data.get('videos', [])[:5]  # First 5 for schema
    schema = {
        '@context': 'https://schema.org',
        '@type': 'Playlist',
        'name': playlist_data.get('title', 'Playlist'),
        'description': playlist_data.get('description', ''),
        'url': playlist_data.get('canonical_url', ''),
        'image': playlist_data.get('og_image', ''),
        'numberOfVideos': len(videos),
        'video': [
            {
                '@type': 'VideoObject',
                'name': v.get('title', ''),
                'description': v.get('description', ''),
                'thumbnailUrl': v.get('thumbnail', ''),
                'uploadDate': v.get('date', datetime.now().isoformat()),
            }
            for v in videos
        ]
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)

def generate_html(playlist_data, locale='en', dry_run=True):
    """Generate complete HTML for a playlist."""
    slug = playlist_data.get('slug', 'unknown')
    title = playlist_data.get('title', 'Playlist')
    description = playlist_data.get('description', '')
    og_image = playlist_data.get('og_image', '')
    hero_video_id = playlist_data.get('hero_video_id', '')
    canonical_url = playlist_data.get('canonical_url', f'https://alexiatwerkgroup.com/{slug}/')

    # Locale-specific paths
    locale_prefix = f'{locale}/' if locale != 'en' else ''
    output_path = f'{locale_prefix}{slug}/' if slug not in ['index'] else f'{locale_prefix}'

    # Meta tags
    meta_title = f"{title} · Twerkhub"
    meta_description = description[:160] if description else title

    # Schema JSON-LD
    schema = generate_schema_jsonld(playlist_data)

    # Content expansion (SEO)
    content_expansion = playlist_data.get('seo_content', '')

    html = f'''<!doctype html>
<html lang="{locale}">
<head>
<script src="/assets/twk-guardian.js?v=20260509-g1"></script>
<script>(function(){{var F='twk_killed_20260509_v2';if(localStorage.getItem(F)==='1')return;var done=false;function finish(){{if(done)return;done=true;localStorage.setItem(F,'1');location.reload(true)}}if('serviceWorker' in navigator){{navigator.serviceWorker.getRegistrations().then(function(rs){{return Promise.all(rs.map(function(r){{return r.unregister()}}))}}).catch(function(){{}}).then(function(){{if('caches' in window){{return caches.keys().then(function(ks){{return Promise.all(ks.map(function(k){{return caches.delete(k)}}))}})}}}}).catch(function(){{}}).then(finish);setTimeout(finish,3000)}}else{{finish()}}}})();</script>
<script>(function(){{if(!document.getElementById('twk-toast-host-v3')){{var h=document.createElement('div');h.id='twk-toast-host-v3';h.style.cssText='position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:Inter,ui-sans-serif,system-ui,sans-serif;';document.documentElement.insertBefore(h,document.body);}}}})();</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{meta_title}</title>
<meta name="description" content="{meta_description}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="{canonical_url}">

<meta property="og:type" content="website">
<meta property="og:title" content="{meta_title}">
<meta property="og:description" content="{meta_description}">
<meta property="og:url" content="{canonical_url}">
<meta property="og:image" content="{og_image}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{meta_title}">
<meta name="twitter:description" content="{meta_description}">
<meta name="twitter:image" content="{og_image}">

<meta name="theme-color" content="#05050a">
<link rel="icon" href="/favicon-32.png" sizes="32x32">

<script type="application/ld+json">
{schema}
</script>

<style>
  body {{ background: #05050a; color: #fff; font-family: Inter, sans-serif; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
  h1 {{ font-size: 2em; margin: 20px 0; }}
  .meta {{ color: #aaa; margin: 10px 0; }}
  .seo-content-expansion {{ margin: 20px 0; padding: 20px; background: rgba(255,255,255,.03); border-radius: 8px; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,.85); }}
</style>

</head>
<body>
<div class="container">
  <h1>{title}</h1>
  <div class="meta">{description}</div>

  <section class="seo-content-expansion">
    {content_expansion}
  </section>

  <p><a href="/">← Home</a></p>
</div>

<script src="/assets/twk-tokens-v3.js?v=20260511-p9" async></script>
<script src="/assets/twerkhub-pill-into-nav.js?v=20260506-p6" async></script>
</body>
</html>'''

    return html

def main():
    parser = argparse.ArgumentParser(
        description='Unified playlist HTML generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Dry run: show what would be generated
  python scripts/generate-playlists-unified.py --dry-run

  # Generate all playlists
  python scripts/generate-playlists-unified.py --apply

  # Generate specific locale
  python scripts/generate-playlists-unified.py --locale=ru --apply

  # Specific data file
  python scripts/generate-playlists-unified.py --data=_playlist_data/my-list.json --apply
        '''
    )

    parser.add_argument(
        '--data',
        default='_playlist_data',
        help='Data source: directory or .json file'
    )
    parser.add_argument(
        '--locale',
        default='en',
        choices=['en', 'es', 'ru', 'ja'],
        help='Generate for specific locale'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be generated without writing'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Actually write files'
    )
    parser.add_argument(
        '--commit',
        action='store_true',
        help='Auto-commit changes (requires --apply)'
    )

    args = parser.parse_args()

    print(f"\n{'='*70}")
    print(f"  PLAYLIST GENERATOR")
    print(f"  Mode:        {'DRY RUN' if not args.apply else 'GENERATE'}")
    print(f"  Locale:      {args.locale}")
    print(f"  Data source: {args.data}")
    print(f"{'='*70}\n")

    # Load playlist data
    data_files = []
    if os.path.isfile(args.data):
        data_files = [args.data]
    elif os.path.isdir(args.data):
        data_files = sorted([
            os.path.join(args.data, f)
            for f in os.listdir(args.data)
            if f.endswith('.json')
        ])

    if not data_files:
        print(f"✗ No playlist data found at {args.data}", file=sys.stderr)
        return 1

    generated = []

    for data_file in data_files:
        playlist_data = load_playlist_data(data_file)
        if not playlist_data:
            continue

        slug = playlist_data.get('slug', '')
        if not slug:
            print(f"  ✗ No slug in {data_file}")
            continue

        html = generate_html(playlist_data, args.locale)

        # Determine output path
        locale_prefix = f'{args.locale}/' if args.locale != 'en' else ''
        output_dir = Path(f'{locale_prefix}{slug}')
        output_file = output_dir / 'index.html'

        if args.apply or args.dry_run:
            print(f"  → [{len(generated)+1}] {output_file}")

            if args.apply:
                output_dir.mkdir(parents=True, exist_ok=True)
                # Write without BOM
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(html)
                generated.append(str(output_file))

    # Summary
    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Generated:   {len(generated)}")
    print(f"  Locale:      {args.locale}")
    print(f"{'='*70}\n")

    # Commit if requested
    if args.apply and args.commit and generated:
        print(f"Committing {len(generated)} playlists...\n")
        try:
            subprocess.run(['git', 'add'] + generated, check=True)
            commit_msg = f"feat: generate {len(generated)} playlists for {args.locale}"
            subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
            print(f"\n✓ Committed: {commit_msg}\n")
        except subprocess.CalledProcessError as e:
            print(f"✗ Git commit failed: {e}", file=sys.stderr)
            return 1

    if not args.apply:
        print("ℹ Dry run complete. Use --apply to generate files")

    return 0

if __name__ == '__main__':
    sys.exit(main())
