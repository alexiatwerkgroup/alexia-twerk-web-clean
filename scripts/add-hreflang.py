#!/usr/bin/env python3
"""
Add hreflang tags to multilingual playlists
Consolidates: /playlist/slug.html (EN) → /es/playlist/slug.html (ES) → /ru/playlist/slug.html (RU)
Google will index canonical + understand language variants
v20260511
"""

import os
import re
from pathlib import Path

HREFLANG_TEMPLATE = '''<link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/playlist/{slug}">
<link rel="alternate" hreflang="es" href="https://alexiatwerkgroup.com/es/playlist/{slug}">
<link rel="alternate" hreflang="ru" href="https://alexiatwerkgroup.com/ru/playlist/{slug}">
<link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/playlist/{slug}">
'''

def extract_slug(filepath):
    """Extract slug from HTML filename"""
    # Examples:
    # /playlist/my-list.html → my-list
    # /es/playlist/my-list.html → my-list
    # /ru/playlist/my-list.html → my-list

    basename = os.path.basename(filepath)
    slug = basename.replace('.html', '')
    return slug if slug else None

def add_hreflang(filepath):
    """Add hreflang tags to a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  ERR Error reading {filepath}: {e}")
        return False

    # Skip if already has hreflang
    if 'hreflang' in content:
        return False

    # Extract slug from path
    slug = extract_slug(filepath)
    if not slug:
        return False

    # Generate hreflang HTML
    hreflang = HREFLANG_TEMPLATE.format(slug=slug)

    # Insert after <link rel="canonical"> if exists, otherwise after <meta charset>
    if '<link rel="canonical"' in content:
        # Insert after canonical link
        content = re.sub(
            r'(<link rel="canonical"[^>]*>\n)',
            r'\1' + hreflang,
            content,
            count=1
        )
    elif '<meta charset' in content:
        # Insert after meta charset
        content = re.sub(
            r'(<meta charset[^>]*>\n)',
            r'\1' + hreflang,
            content,
            count=1
        )
    else:
        # Insert after <head> tag
        content = re.sub(
            r'(<head[^>]*>\n)',
            r'\1' + hreflang,
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
    print(f"  ADDING HREFLANG TAGS TO PLAYLISTS")
    print(f"{'='*70}\n")

    # Find all playlist .html files in /playlist/ directories
    playlist_files = []

    # Find in /playlist/ directory (English version)
    playlist_dir = 'playlist'
    if os.path.isdir(playlist_dir):
        for filename in os.listdir(playlist_dir):
            if filename.endswith('.html') and filename != 'index.html':
                playlist_files.append(os.path.join(playlist_dir, filename))

    # Sort for consistency
    playlist_files.sort()

    print(f"Found {len(playlist_files)} English playlist files\n")

    # Add hreflang to each
    added = 0
    skipped = 0

    for i, filepath in enumerate(playlist_files, 1):
        if add_hreflang(filepath):
            added += 1
            slug = extract_slug(filepath)
            print(f"  OK [{i:3d}/{len(playlist_files)}] {slug}")

            # Show progress every 100 files
            if added % 100 == 0:
                print(f"     ... {added} files updated")
        else:
            skipped += 1

    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Added:   {added} files")
    print(f"  Skipped: {skipped} files (already had hreflang)")
    print(f"  Total:   {len(playlist_files)} playlist files")
    print(f"{'='*70}\n")

    if added > 0:
        print("OK Hreflang tags added successfully!\n")
        print("NEXT STEPS:")
        print("  1. git add -A")
        print("  2. git commit -m 'feat: add hreflang tags to playlists'")
        print("  3. git push origin main")
        print("  4. Cloudflare deploys (~2-5 minutes)")
        print("  5. Google rescates changes within 24-48 hours\n")
        return True
    else:
        print("ERR No files were updated")
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
