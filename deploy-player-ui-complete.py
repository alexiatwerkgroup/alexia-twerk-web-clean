#!/usr/bin/env python3
"""
Deploy twk-player-ui-complete.js to all 269+ playlist video pages.

This script:
1. Scans all .html files in the /playlist/ directory
2. Replaces the old twk-player-wrapper.js reference with twk-player-ui-complete.js
3. Updates cache-bust parameter from pw1 to pc1
4. Writes modified files back with UTF-8 encoding
5. Reports comprehensive statistics

BEFORE running this script:
- Ensure twk-player-ui-complete.js exists in /assets/
- Back up the playlist directory (optional but recommended)

AFTER running this script:
- Commit and push all modified files to git
- Clear browser cache and reload pages to verify features work
- Test: zoom lock, anti-exit shield, viewed pill, thumbnail dimming, paywall

Usage:
    cd /path/to/alexia-twerk-web-clean
    python3 deploy-player-ui-complete.py
"""

import pathlib
import re
import sys
from typing import Tuple

# Configuration
ROOT = pathlib.Path(__file__).resolve().parent
PLAYLIST_DIR = ROOT / "playlist"
ASSETS_DIR = ROOT / "assets"

# Verify assets exist
NEW_SCRIPT = ASSETS_DIR / "twk-player-ui-complete.js"
if not NEW_SCRIPT.exists():
    print(f"ERROR: {NEW_SCRIPT} does not exist!")
    print("Please create twk-player-ui-complete.js in /assets/ before running this script.")
    sys.exit(1)

def update_html_file(file_path: pathlib.Path) -> Tuple[bool, str]:
    """
    Update a single HTML file with the new player UI script.

    Returns: (success: bool, message: str)
    """
    try:
        content = file_path.read_text(encoding="utf-8")
        original_content = content

        # Pattern 1: Match with specific version numbers
        # <script defer src="/assets/twk-player-wrapper.js?v=20260518-pw1"></script>
        content = re.sub(
            r'<script defer src="/assets/twk-player-wrapper\.js\?v=[\d]+-pw\d+"></script>',
            '<script defer src="/assets/twk-player-ui-complete.js?v=20260518-pc1"></script>',
            content,
            count=1
        )

        # Pattern 2: If no exact match, try flexible match (no version)
        if content == original_content:
            content = re.sub(
                r'<script defer src="/assets/twk-player-wrapper\.js"[^>]*></script>',
                '<script defer src="/assets/twk-player-ui-complete.js?v=20260518-pc1"></script>',
                content,
                count=1
            )

        # Write back if changed
        if content != original_content:
            file_path.write_text(content, encoding="utf-8")
            return True, "✓ Updated"
        else:
            return False, "⊘ No match found (already updated?)"

    except Exception as e:
        return False, f"✗ Error: {str(e)}"

def deploy_player_ui():
    """Main deployment function."""
    print("="*70)
    print("TWERKHUB PLAYER UI COMPLETE DEPLOYMENT")
    print("="*70)
    print()

    # Verify playlist directory exists
    if not PLAYLIST_DIR.exists():
        print(f"ERROR: {PLAYLIST_DIR} does not exist")
        sys.exit(1)

    # Find all HTML files
    html_files = sorted(PLAYLIST_DIR.glob("*.html"))
    total_files = len(html_files)

    if total_files == 0:
        print(f"ERROR: No .html files found in {PLAYLIST_DIR}")
        sys.exit(1)

    print(f"Found {total_files} playlist HTML files")
    print(f"Processing updates...")
    print()

    # Track results
    updated = 0
    skipped = 0
    failed = 0
    errors = []

    # Process each file
    for i, html_file in enumerate(html_files, 1):
        success, message = update_html_file(html_file)

        if success:
            updated += 1
            status = "✓"
        elif "Error" in message:
            failed += 1
            status = "✗"
            errors.append((html_file.name, message))
        else:
            skipped += 1
            status = "⊘"

        # Progress output (every 25 files)
        if i % 25 == 0:
            print(f"  [{i}/{total_files}] Processing...")

    print()
    print("="*70)
    print("DEPLOYMENT COMPLETE")
    print("="*70)
    print(f"Updated:  {updated:4d} files")
    print(f"Skipped:  {skipped:4d} files (already updated)")
    print(f"Failed:   {failed:4d} files")
    print(f"Total:    {total_files:4d} files")
    print()

    if errors:
        print("ERRORS:")
        for filename, error in errors[:10]:  # Show first 10 errors
            print(f"  {filename}: {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        print()

    # Summary of what happens next
    print("NEXT STEPS:")
    print("1. Verify changes: git status")
    print("2. Review diffs:   git diff playlist/")
    print("3. Commit:         git add playlist/ && git commit -m 'Deploy twk-player-ui-complete.js'")
    print("4. Push:           git push origin main")
    print("5. Test on live site:")
    print("   - Zoom lock prevents accessing Windows desktop")
    print("   - Anti-YouTube shield blocks exit links")
    print("   - 'Viewed' pill appears on watched videos")
    print("   - Thumbnails dimmed for watched videos")
    print("   - Paywall blocks +18 content for non-members")
    print("   - Watermark overlay visible on player")
    print()
    print("="*70)

    return updated > 0 and failed == 0

if __name__ == "__main__":
    success = deploy_player_ui()
    sys.exit(0 if success else 1)
