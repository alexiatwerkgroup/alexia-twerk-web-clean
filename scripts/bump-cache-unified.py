#!/usr/bin/env python3
"""
Unified Cache Buster — Single source of truth for all cache busting operations
Replaces: bump-css-cache.py, bump-d1-cache.py, bump-pill-cache.py, etc.
v20260511-unified
"""

import os
import re
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Mapping of targets to their file patterns
TARGETS = {
    'css': {
        'label': 'CSS/Global Styles',
        'files': ['*.html'],
        'patterns': [
            r'(href=")([^"]*\.css\?)v=[^"]*(")',  # CSS links
            r'(/assets/[^"]*?\.css\?)v=[^"]*',     # Asset CSS
        ]
    },
    'tokens': {
        'label': 'Token System (twk-tokens-v3.js)',
        'files': ['*.html'],
        'patterns': [
            r'(twk-tokens-v3\.js\?)v=[^\s"\'<>]*',
        ]
    },
    'pill': {
        'label': 'Token Pill Loader (twerkhub-pill-into-nav.js)',
        'files': ['*.html'],
        'patterns': [
            r'(twerkhub-pill-into-nav\.js\?)v=[^\s"\'<>]*',
        ]
    },
    'auth': {
        'label': 'Auth System (twerkhub-auth.js)',
        'files': ['*.html'],
        'patterns': [
            r'(twerkhub-auth\.js\?)v=[^\s"\'<>]*',
        ]
    },
    'guardian': {
        'label': 'Guardian Safety Net (twk-guardian.js)',
        'files': ['*.html'],
        'patterns': [
            r'(twk-guardian\.js\?)v=[^\s"\'<>]*',
        ]
    },
    'all': {
        'label': 'All Assets (Full Bust)',
        'files': ['*.html'],
        'patterns': [
            r'(\?v=)\d{8}-[a-z0-9]+',
        ]
    },
}

def find_html_files(root_dir='.', exclude_dirs=None):
    """Find all HTML files in project, respecting exclusions."""
    if exclude_dirs is None:
        exclude_dirs = {'.git', 'node_modules', '.archived_scripts', '_deleted', '_generator', 'tiktok-pipeline'}

    html_files = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prune excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

        for filename in filenames:
            if filename.endswith('.html'):
                html_files.append(os.path.join(dirpath, filename))

    return sorted(html_files)

def generate_version_string(label=''):
    """Generate version string: YYYYMMDD-label"""
    today = datetime.now().strftime('%Y%m%d')
    if label:
        return f"{today}-{label}"
    return today

def apply_cache_bust(file_path, target, new_version, dry_run=True):
    """Apply cache bust to a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply each pattern for this target
        for pattern in TARGETS[target]['patterns']:
            if target == 'all':
                # For 'all' target, replace all cache busters
                content = re.sub(
                    pattern,
                    rf'\1{new_version}',
                    content
                )
            else:
                # For specific targets, replace with careful pattern matching
                replacement = rf'\1v={new_version}\3' if '\\3' in pattern else rf'\1v={new_version}'
                content = re.sub(
                    pattern,
                    replacement,
                    content
                )

        if content != original_content:
            if not dry_run:
                # Write without BOM (UTF-8 without BOM)
                with open(file_path, 'w', encoding='utf-8-sig') as f:
                    f.write(content)
                # Re-write to ensure no BOM
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            return True, content
        return False, original_content
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}", file=sys.stderr)
        return None, None

def main():
    parser = argparse.ArgumentParser(
        description='Unified cache buster for all assets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Dry run: see what would change
  python scripts/bump-cache-unified.py --target=css --dry-run

  # Actually bump CSS cache for all HTMLs
  python scripts/bump-cache-unified.py --target=css --apply

  # Custom version label
  python scripts/bump-cache-unified.py --target=tokens --version=20260511-hotfix --apply

  # Bust all cache versions
  python scripts/bump-cache-unified.py --target=all --apply
        '''
    )

    parser.add_argument(
        '--target',
        choices=list(TARGETS.keys()),
        default='css',
        help='Which assets to bump (default: css)'
    )
    parser.add_argument(
        '--version',
        default=None,
        help='Version string (default: YYYYMMDD)'
    )
    parser.add_argument(
        '--label',
        default=None,
        help='Label suffix after date (default: auto)'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Actually modify files (default: dry-run)'
    )
    parser.add_argument(
        '--commit',
        action='store_true',
        help='Auto-commit changes (requires --apply)'
    )
    parser.add_argument(
        '--root',
        default='.',
        help='Root directory to scan (default: current)'
    )

    args = parser.parse_args()

    # Generate version if not provided
    if args.version is None:
        args.version = generate_version_string(args.label or 'p1')

    target = args.target
    label = TARGETS[target]['label']

    print(f"\n{'='*70}")
    print(f"  CACHE BUSTER: {label}")
    print(f"  Target:      {target}")
    print(f"  Version:     {args.version}")
    print(f"  Mode:        {'DRY RUN' if not args.apply else 'APPLY'}")
    print(f"  Root:        {args.root}")
    print(f"{'='*70}\n")

    # Find HTML files
    html_files = find_html_files(args.root)
    print(f"Found {len(html_files)} HTML files to process\n")

    changed_files = []
    skipped = 0
    errors = 0

    for i, file_path in enumerate(html_files, 1):
        changed, _ = apply_cache_bust(file_path, target, args.version, dry_run=not args.apply)

        if changed is None:
            errors += 1
            status = '✗'
        elif changed:
            changed_files.append(file_path)
            status = '↓' if args.apply else '→'
            print(f"  {status} [{i:3d}/{len(html_files)}] {file_path}")
        else:
            skipped += 1
            status = '·'

    # Summary
    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Changed:     {len(changed_files)}")
    print(f"  Skipped:     {skipped}")
    print(f"  Errors:      {errors}")
    print(f"{'='*70}\n")

    if not changed_files:
        print("No files needed updating.")
        return 0

    # Commit if requested
    if args.apply and args.commit and changed_files:
        print(f"Committing {len(changed_files)} changes...\n")
        try:
            # Stage files
            for file_path in changed_files[:10]:  # Show first 10
                print(f"  + {file_path}")
            if len(changed_files) > 10:
                print(f"  ... and {len(changed_files)-10} more")

            subprocess.run(['git', 'add'] + changed_files, check=True, cwd=args.root)

            commit_msg = f"chore: bump {target} cache to {args.version}"
            subprocess.run(
                ['git', 'commit', '-m', commit_msg],
                check=True,
                cwd=args.root
            )
            print(f"\n✓ Committed: {commit_msg}\n")
        except subprocess.CalledProcessError as e:
            print(f"✗ Git commit failed: {e}", file=sys.stderr)
            return 1

    if args.apply:
        print("✓ Cache bust applied to all files")
    else:
        print("ℹ Dry run complete. Use --apply to make changes")
        print(f"ℹ To commit after applying: --apply --commit")

    return 0

if __name__ == '__main__':
    sys.exit(main())
