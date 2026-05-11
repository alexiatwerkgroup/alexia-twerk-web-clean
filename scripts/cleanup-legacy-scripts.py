#!/usr/bin/env python3
"""
Archive Legacy Scripts — Move old, duplicate, and unused scripts to .archived_scripts/
Only run after confirming new unified scripts work correctly.
v20260511
"""

import os
import shutil
from pathlib import Path

# Scripts that have been consolidated into unified ones
LEGACY_SCRIPTS = {
    # Cache busters (consolidated into bump-cache-unified.py)
    'bump-css-cache.py': 'Cache busting (bump-cache-unified.py)',
    'bump-d1-cache-v2.py': 'Cache busting (bump-cache-unified.py)',
    'bump-ph-theme-cache.py': 'Cache busting (bump-cache-unified.py)',
    'bump-pill-cache.py': 'Cache busting (bump-cache-unified.py)',
    'bump-pill-align-cache.py': 'Cache busting (bump-cache-unified.py)',
    'bump-token-cache-20260506.py': 'Cache busting (bump-cache-unified.py)',
    'bump-cb-p6.py': 'Cache busting (bump-cache-unified.py)',
    'bump-cb-promo-v2.py': 'Cache busting (bump-cache-unified.py)',
    'bump-supabase-cache-buster.py': 'Cache busting (bump-cache-unified.py)',
    'bump-supabase-cachebust.py': 'Cache busting (bump-cache-unified.py)',
    'bump-twerkhub-auth-cache.py': 'Cache busting (bump-cache-unified.py)',
    'bump-bundle-cache-fix-modal.py': 'Cache busting (bump-cache-unified.py)',

    # Playlist generators (consolidated into generate-playlists-unified.py)
    'generate_new_playlists.py': 'Playlist generation (generate-playlists-unified.py)',
    'generate_playlist_html.py': 'Playlist generation (generate-playlists-unified.py)',

    # Outdated push scripts (versioned push-* scripts)
    'push-cb-promo-v1.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v2.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v3.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v4.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v5.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v7.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v8.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v9.py': 'Outdated (use workflow.py)',
    'push-cb-promo-v10.py': 'Outdated (use workflow.py)',

    # Other outdated scripts
    'extract-hero-clips.py': 'Old feature (archived)',
    'kill-all-duplicates.py': 'One-time cleanup (archived)',
    'kill-cosplay-fancam-leaks.py': 'One-time cleanup (archived)',
    'kill-twerk-hub-leaks.py': 'One-time cleanup (archived)',
    'apply-ph-theme-everywhere.py': 'One-time task (archived)',
    'push-all-hover.py': 'One-time task (archived)',
}

def main():
    root = Path('.')
    archive_dir = root / '.archived_scripts'

    print(f"\n{'='*70}")
    print(f"  CLEANUP LEGACY SCRIPTS")
    print(f"{'='*70}\n")

    # Create archive directory
    archive_dir.mkdir(exist_ok=True)

    moved = 0
    not_found = 0

    for script_name, reason in sorted(LEGACY_SCRIPTS.items()):
        script_path = root / script_name

        if script_path.exists():
            dest_path = archive_dir / script_name
            print(f"  > {script_name:<40} ({reason})")
            shutil.move(str(script_path), str(dest_path))
            moved += 1
        else:
            print(f"  - {script_name:<40} (not found)")
            not_found += 1

    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Moved:      {moved} scripts")
    print(f"  Not found:  {not_found} scripts")
    print(f"  Archive:    {archive_dir}/")
    print(f"{'='*70}\n")

    print("To commit this cleanup:")
    print("  git add -A")
    print('  git commit -m "chore: archive legacy scripts (consolidated into unified toolkit)"')
    print("  git push origin main\n")

if __name__ == '__main__':
    main()
