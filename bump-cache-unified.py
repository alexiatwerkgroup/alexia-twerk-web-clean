#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unified cache-busting script for all assets.

Consolidates 11+ individual bump-*.py scripts into one flexible tool.
Supports multiple targets, custom versions, dry-run mode, and git integration.

Usage:
    python bump-cache-unified.py --target=css --version=20260510-v1 --dry-run
    python bump-cache-unified.py --target=tokens --version=20260510-v2 --apply
    python bump-cache-unified.py --target=pill --apply --commit

Targets:
    css         - twerkhub-bundle.css, twerkhub-page.css, twerkhub-premium.css, twerkhub-ph-theme.css
    tokens      - twerkhub-tokens.js
    pill        - twerkhub-tokens.js + twerkhub-ph-theme.css
    d1          - d1-worker.js
    avatar      - avatar-*.js assets
    video       - player.js, heatmap.js
    all         - bump all assets

Options:
    --target=TARGET       - Asset target (default: all)
    --version=VERSION     - New version string (default: today's date)
    --dry-run             - Show what would change (default)
    --apply               - Actually write changes
    --commit              - Auto-commit with git
"""

import argparse
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).parent

# All cache-buster patterns organized by target
PATTERNS = {
    "css": [
        (r'twerkhub-bundle\.css\?v=[\w\-]+', 'twerkhub-bundle.css?v={version}'),
        (r'twerkhub-page\.css\?v=[\w\-]+', 'twerkhub-page.css?v={version}'),
        (r'twerkhub-premium\.css\?v=[\w\-]+', 'twerkhub-premium.css?v={version}'),
        (r'twerkhub-ph-theme\.css\?v=[\w\-]+', 'twerkhub-ph-theme.css?v={version}'),
    ],
    "tokens": [
        (r'/assets/twerkhub-tokens\.js\?v=[\w\-]+', '/assets/twerkhub-tokens.js?v={version}'),
    ],
    "pill": [
        (r'/assets/twerkhub-tokens\.js\?v=[\w\-]+', '/assets/twerkhub-tokens.js?v={version}'),
        (r'/assets/twerkhub-ph-theme\.css\?v=[\w\-]+', '/assets/twerkhub-ph-theme.css?v={version}'),
    ],
    "d1": [
        (r'd1-worker\.js\?v=[\w\-]+', 'd1-worker.js?v={version}'),
    ],
    "avatar": [
        (r'avatar-uploader\.js\?v=[\w\-]+', 'avatar-uploader.js?v={version}'),
        (r'avatar-preview\.js\?v=[\w\-]+', 'avatar-preview.js?v={version}'),
    ],
    "video": [
        (r'player\.js\?v=[\w\-]+', 'player.js?v={version}'),
        (r'heatmap\.js\?v=[\w\-]+', 'heatmap.js?v={version}'),
    ],
}


def get_html_files():
    """Get all HTML files, skipping _deleted, node_modules, .git"""
    htmls = []
    for p in REPO.rglob("*.html"):
        if any(x in p.parts for x in ("_deleted", "node_modules", ".git")):
            continue
        htmls.append(p)
    return htmls


def remove_bom(content):
    """Remove UTF-8 BOM if present"""
    if isinstance(content, bytes):
        if content[:3] == b"\xef\xbb\xbf":
            return content[3:]
        return content
    if isinstance(content, str) and content.startswith("﻿"):
        return content[1:]
    return content


def patch_file(file_path, patterns, dry_run=True):
    """Apply patterns to a single file. Returns (changed, replacements_count)"""
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  ERR reading {file_path.name}: {e}")
        return False, 0

    new_content = content
    replacements = 0

    for pattern, replacement in patterns:
        matches = re.findall(pattern, new_content)
        if matches:
            # Count unique changes (exclude ones already at target version)
            for match in matches:
                if match != replacement:
                    new_content = re.sub(pattern, replacement, new_content)
                    replacements += 1

    if new_content != content:
        if not dry_run:
            # Remove BOM and normalize line endings
            new_content = remove_bom(new_content)
            file_path.write_text(new_content, encoding="utf-8", newline="\n")
        return True, replacements

    return False, 0


def main():
    parser = argparse.ArgumentParser(
        description="Unified cache-busting for all Twerkhub assets"
    )
    parser.add_argument(
        "--target",
        default="all",
        help="Asset target: css, tokens, pill, d1, avatar, video, or all",
    )
    parser.add_argument(
        "--version",
        default=datetime.now().strftime("%Y%m%d-v1"),
        help="Version string (default: today's date)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Show changes without applying (default)",
    )
    parser.add_argument(
        "--apply", action="store_true", help="Apply changes to files"
    )
    parser.add_argument("--commit", action="store_true", help="Auto-commit with git")

    args = parser.parse_args()

    # Determine which patterns to use
    if args.target == "all":
        targets = list(PATTERNS.keys())
    elif args.target not in PATTERNS:
        print(f"ERROR: Unknown target '{args.target}'")
        print(f"Available: {', '.join(list(PATTERNS.keys()) + ['all'])}")
        sys.exit(1)
    else:
        targets = [args.target]

    # Build final patterns with version substituted
    final_patterns = []
    for target in targets:
        for pattern, replacement in PATTERNS[target]:
            final_patterns.append(
                (pattern, replacement.format(version=args.version))
            )

    mode = "(DRY RUN)" if args.dry_run else "(APPLYING)"
    print("=" * 72)
    print(f"  BUMP CACHE: {', '.join(targets).upper()}  {mode}")
    print(f"  Version: {args.version}")
    print("=" * 72)

    htmls = get_html_files()
    print(f"\n  HTML files to scan: {len(htmls)}")

    files_changed = 0
    total_replacements = 0

    for html_file in htmls:
        changed, count = patch_file(html_file, final_patterns, dry_run=args.dry_run)
        if changed:
            files_changed += 1
            total_replacements += count
            print(f"    {html_file.relative_to(REPO)}: +{count}")

    print(f"\n  Files changed:      {files_changed}")
    print(f"  Total replacements: {total_replacements}")

    if args.dry_run and not args.apply:
        print(f"\n  To apply: python bump-cache-unified.py --target={args.target} --version={args.version} --apply")
    elif args.apply and total_replacements > 0:
        print(f"\n  SUCCESS. {total_replacements} cache-busters updated.")
        if args.commit:
            try:
                subprocess.run(
                    [
                        "git",
                        "commit",
                        "-am",
                        f"chore: bump {args.target} cache to {args.version}",
                    ],
                    cwd=REPO,
                    check=True,
                    capture_output=True,
                )
                print(f"  COMMITTED: chore: bump {args.target} cache to {args.version}")
            except subprocess.CalledProcessError as e:
                print(f"  WARNING: git commit failed: {e}")


if __name__ == "__main__":
    main()
