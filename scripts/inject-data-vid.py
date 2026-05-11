#!/usr/bin/env python3
"""
Inject data-vid attributes to related video cards in playlist HTML files.
Extracts YouTube video ID from the href URL and adds data-vid attribute.

Usage:
    python scripts/inject-data-vid.py [--apply]
"""

import os
import re
import sys
from pathlib import Path

PLAYLIST_DIR = Path(__file__).parent.parent / 'playlist'

def extract_vid_from_href(href):
    """Extract YouTube video ID from playlist href."""
    # Pattern: /playlist/slug.html or /playlist/slug
    # We need to parse the title to find the YouTube ID
    # For now, we'll extract from the href path
    # Actually, we need to look at the HTML to find the embed URL
    return None

def inject_data_vid(filepath):
    """Inject data-vid to related video cards."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"✗ Error reading {filepath}: {e}")
        return False

    # Find the main player video ID from the iframe src
    main_iframe = re.search(r'<iframe[^>]+src="https://www\.youtube[^"]*embed/([^?"&\s]{6,})', content)
    if not main_iframe:
        print(f"✗ No main iframe found in {filepath}")
        return False
    
    main_vid = main_iframe.group(1)
    print(f"  Main video ID: {main_vid}")

    # Find all related video cards and inject data-vid from their href titles
    # Pattern: <a href="/playlist/SLUG.html" class="twk-rcard" ...>
    #          <div><img ... alt="TITLE"...></div>
    #          <div>...<div>TITLE</div></div>
    #          </a>
    
    # For each twk-rcard link, we need to extract the video ID from somewhere
    # The video ID should come from the page that link points to
    # But we can extract it from the alt text or title if it contains the YouTube embed
    
    # Actually, let me look for a pattern: each card should have the YouTube video ID
    # in the href URL or somewhere in the card HTML
    
    # Let me search for pattern: href="/playlist/slug.html" where slug contains a video ID hint
    # Or we can look at the img src which might have: i.ytimg.com/vi/VIDEOID/...
    
    pattern = r'<a[^>]*href="(/playlist/[^"]+)"[^>]*class="[^"]*twk-rcard[^"]*"[^>]*>.*?<img[^>]+src="[^"]*i\.ytimg\.com/vi/([^/]+)/'
    
    modified = False
    for match in re.finditer(pattern, content, re.DOTALL):
        href = match.group(1)
        vid = match.group(2)
        
        # Find the <a> tag and add data-vid if not present
        a_tag_pattern = f'<a[^>]*href="{re.escape(href)}"[^>]*class="[^"]*twk-rcard[^"]*"[^>]*>'
        for a_match in re.finditer(a_tag_pattern, content):
            a_tag = a_match.group(0)
            if 'data-vid=' not in a_tag:
                new_a_tag = a_tag.replace('class="', f'data-vid="{vid}" class="')
                if ' class="' not in a_tag:
                    new_a_tag = a_tag.rstrip('>') + f' data-vid="{vid}" class="twk-rcard">'
                
                content = content.replace(a_tag, new_a_tag, 1)
                print(f"  ✓ Added data-vid={vid} to {href}")
                modified = True
    
    if modified:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated {filepath}")
            return True
        except Exception as e:
            print(f"✗ Error writing {filepath}: {e}")
            return False
    
    return True

def main():
    apply = '--apply' in sys.argv
    
    print(f"\n{'='*70}")
    print(f"  INJECT DATA-VID TO RELATED VIDEO CARDS")
    print(f"{'='*70}\n")
    
    if not apply:
        print("  (dry-run mode — use --apply to write changes)\n")
    
    playlist_files = sorted(PLAYLIST_DIR.glob('*.html'))
    print(f"Found {len(playlist_files)} playlist files\n")
    
    updated_count = 0
    for filepath in playlist_files[:5]:  # Test on first 5 files
        print(f"Processing: {filepath.name}")
        if inject_data_vid(filepath):
            updated_count += 1
        print()
    
    print(f"{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Processed: {len(playlist_files[:5])}")
    print(f"  Updated:   {updated_count}")
    if not apply:
        print(f"  Status:    DRY-RUN (use --apply to write)")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    main()
