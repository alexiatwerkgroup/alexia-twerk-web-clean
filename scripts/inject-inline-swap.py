#!/usr/bin/env python3
"""
Inject twerkhub-pl-inline-swap.js script into all playlist HTML files.
This enables inline video loading without navigation when clicking related videos.

Usage:
    python scripts/inject-inline-swap.py [--apply]
"""

import os
import sys
from pathlib import Path

PLAYLIST_DIR = Path(__file__).parent.parent / 'playlist'
SCRIPT_TAG = '<script defer src="/assets/twerkhub-pl-inline-swap.js?v=20260511-p1"></script>'
MARKER_TAG = '<script defer src="/assets/twerkhub-pill-into-nav.js'

def inject_script(filepath):
    """Inject inline swap script into playlist HTML."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print("X Error reading %s: %s" % (filepath, e))
        return False

    # Check if already injected
    if 'twerkhub-pl-inline-swap' in content:
        print("  (already has inline-swap)")
        return True

    # Find the marker and inject after it
    if MARKER_TAG in content:
        # Inject right after the pill-into-nav script
        modified = content.replace(
            MARKER_TAG,
            SCRIPT_TAG + '\n' + MARKER_TAG
        )
    elif '</body>' in content:
        # Fallback: inject before </body>
        modified = content.replace(
            '</body>',
            SCRIPT_TAG + '\n</body>'
        )
    else:
        print("  X No insertion point found")
        return False

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(modified)
        print("  [OK] Injected twerkhub-pl-inline-swap.js")
        return True
    except Exception as e:
        print("  X Error writing %s: %s" % (filepath, e))
        return False

def main():
    apply_changes = '--apply' in sys.argv

    print(f"\n{'='*70}")
    print(f"  INJECT INLINE SWAP SCRIPT TO ALL PLAYLISTS")
    print(f"{'='*70}\n")

    if not apply_changes:
        print("  (dry-run mode — use --apply to write changes)\n")

    playlist_files = sorted(PLAYLIST_DIR.glob('*.html'))

    if not playlist_files:
        print(f"✗ No playlist files found in {PLAYLIST_DIR}\n")
        return

    print(f"Found {len(playlist_files)} playlist files\n")

    injected = 0
    for filepath in playlist_files:
        print(f"Processing: {filepath.name}")
        if inject_script(filepath):
            injected += 1

    print("\n" + "="*70)
    print("  SUMMARY")
    print("="*70)
    print("  Processed: %d" % len(playlist_files))
    print("  Injected:  %d" % injected)
    if not apply_changes:
        print("  Status:    DRY-RUN (use --apply to write)")
    else:
        print("  Status:    APPLIED [OK]")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()
