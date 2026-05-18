#!/usr/bin/env python3
"""
Fix and complete hreflang tags on ALL playlists
Replaces incomplete/incorrect hreflang with complete version
v20260511
"""

import os
import re

HREFLANG_TEMPLATE = '''<link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/playlist/{slug}">
<link rel="alternate" hreflang="es" href="https://alexiatwerkgroup.com/es/playlist/{slug}">
<link rel="alternate" hreflang="ru" href="https://alexiatwerkgroup.com/ru/playlist/{slug}">
<link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/playlist/{slug}">
'''

def extract_slug(filepath):
    """Extract slug from HTML filename"""
    basename = os.path.basename(filepath)
    slug = basename.replace('.html', '')
    return slug if slug else None

def fix_hreflang(filepath):
    """Replace old hreflang tags with complete new version"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  ERR Error reading {filepath}: {e}")
        return False

    # Extract slug
    slug = extract_slug(filepath)
    if not slug:
        return False

    # Check if has old or incomplete hreflang
    if 'hreflang' not in content:
        return False

    # Generate correct hreflang HTML
    new_hreflang = HREFLANG_TEMPLATE.format(slug=slug)

    # Remove ALL old hreflang tags (handle various formats)
    content = re.sub(
        r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?',
        '',
        content
    )

    # Insert new hreflang after <link rel="canonical"> if exists, else after <meta charset>, else after <head>
    if '<link rel="canonical"' in content:
        content = re.sub(
            r'(<link rel="canonical"[^>]*>\n)',
            r'\1' + new_hreflang,
            content,
            count=1
        )
    elif '<meta charset' in content:
        content = re.sub(
            r'(<meta charset[^>]*>\n)',
            r'\1' + new_hreflang,
            content,
            count=1
        )
    else:
        content = re.sub(
            r'(<head[^>]*>\n)',
            r'\1' + new_hreflang,
            content,
            count=1
        )

    # Write back to file
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"  ERR Error writing {filepath}: {e}")
        return False

def main():
    print(f"\n{'='*70}")
    print(f"  FIXING HREFLANG TAGS (COMPLETE VERSION WITH ES/RU)")
    print(f"{'='*70}\n")

    # Find all playlist .html files
    playlist_files = []
    playlist_dir = 'playlist'
    if os.path.isdir(playlist_dir):
        for filename in os.listdir(playlist_dir):
            if filename.endswith('.html') and filename != 'index.html':
                playlist_files.append(os.path.join(playlist_dir, filename))

    playlist_files.sort()
    print(f"Found {len(playlist_files)} playlist files\n")

    # Fix hreflang on each
    fixed = 0
    skipped = 0

    for i, filepath in enumerate(playlist_files, 1):
        if fix_hreflang(filepath):
            fixed += 1
            slug = extract_slug(filepath)
            print(f"  OK [{i:3d}/{len(playlist_files)}] {slug}")

            if fixed % 100 == 0:
                print(f"     ... {fixed} files fixed")
        else:
            skipped += 1

    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Fixed:   {fixed} files")
    print(f"  Skipped: {skipped} files (no hreflang found)")
    print(f"  Total:   {len(playlist_files)} playlist files")
    print(f"{'='*70}\n")

    if fixed > 0:
        print("OK Hreflang tags fixed with complete language variants!\n")
        print("NEXT STEPS:")
        print("  1. git add -A")
        print("  2. git commit -m 'fix: update hreflang tags with complete es/ru variants'")
        print("  3. git push origin main")
        print("  4. Cloudflare deploys (~2-5 minutes)")
        print("  5. Google rescates within 24-48 hours\n")
        return True
    else:
        print("ERR No files were updated")
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
