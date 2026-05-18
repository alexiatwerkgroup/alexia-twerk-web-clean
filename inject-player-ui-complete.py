#!/usr/bin/env python3
"""
Replace twk-player-wrapper.js with twk-player-ui-complete.js in all 250+ playlist pages.

This script:
1. Finds all .html files in /playlist/
2. Replaces the twk-player-wrapper.js script tag with twk-player-ui-complete.js
3. Updates the cache-bust version parameter (pw1 -> pc1)
4. Reports how many files were modified

Usage: python inject-player-ui-complete.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
PLAYLIST_DIR = ROOT / "playlist"

def inject_player_ui():
    """Replace player wrapper with complete UI in all playlist HTML files."""
    if not PLAYLIST_DIR.exists():
        print(f"ERROR: {PLAYLIST_DIR} does not exist")
        return

    # Find all .html files
    html_files = sorted(PLAYLIST_DIR.glob("*.html"))
    print(f"Found {len(html_files)} playlist HTML files")

    modified_count = 0
    failed_count = 0

    for html_file in html_files:
        try:
            content = html_file.read_text(encoding="utf-8")
            original_content = content

            # Replace twk-player-wrapper.js with twk-player-ui-complete.js
            # Match the exact pattern from the file
            # Old: <script defer src="/assets/twk-player-wrapper.js?v=20260518-pw1"></script>
            # New: <script defer src="/assets/twk-player-ui-complete.js?v=20260518-pc1"></script>

            # First, replace the script tag
            content = re.sub(
                r'<script defer src="/assets/twk-player-wrapper\.js\?v=[\d]+-pw\d+"></script>',
                '<script defer src="/assets/twk-player-ui-complete.js?v=20260518-pc1"></script>',
                content,
                count=1
            )

            # If no match with the date pattern, try more flexible pattern
            if content == original_content:
                content = re.sub(
                    r'<script defer src="/assets/twk-player-wrapper\.js"[^>]*></script>',
                    '<script defer src="/assets/twk-player-ui-complete.js?v=20260518-pc1"></script>',
                    content,
                    count=1
                )

            # If the content changed, write it back
            if content != original_content:
                html_file.write_text(content, encoding="utf-8")
                modified_count += 1
                print(f"✓ {html_file.name}")
            else:
                print(f"⊘ {html_file.name} (no match found)")

        except Exception as e:
            failed_count += 1
            print(f"✗ {html_file.name}: {e}")

    print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Modified: {modified_count}")
    print(f"Failed: {failed_count}")
    print(f"Total: {len(html_files)}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

if __name__ == "__main__":
    inject_player_ui()
