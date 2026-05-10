#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dev-tasks.py - Developer helper script for Twerkhub
Common development tasks: cache bump, schema check, backup creation, etc.

Usage:
    python dev-tasks.py bump-css             # Bump CSS cache
    python dev-tasks.py bump-tokens          # Bump tokens JS
    python dev-tasks.py status               # Show project status
    python dev-tasks.py backup               # Create backup
    python dev-tasks.py lint-html            # Check HTML files
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).parent


def run_cmd(cmd, cwd=None, capture=False):
    """Run a shell command"""
    try:
        if capture:
            result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
            return result.returncode, result.stdout.strip()
        else:
            return subprocess.run(cmd, shell=True, cwd=cwd).returncode, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1, None


def cmd_bump_css():
    """Bump CSS cache version"""
    version = datetime.now().strftime("%Y%m%d-v1")
    print(f"Bumping CSS cache to {version}...")
    code, _ = run_cmd(f"python bump-cache-unified.py --target=css --version={version} --apply --commit", cwd=REPO)
    return code


def cmd_bump_tokens():
    """Bump tokens JS cache version"""
    version = datetime.now().strftime("%Y%m%d-v1")
    print(f"Bumping tokens cache to {version}...")
    code, _ = run_cmd(f"python bump-cache-unified.py --target=tokens --version={version} --apply --commit", cwd=REPO)
    return code


def cmd_bump_all():
    """Bump all asset caches"""
    version = datetime.now().strftime("%Y%m%d-v1")
    print(f"Bumping all caches to {version}...")
    code, _ = run_cmd(f"python bump-cache-unified.py --target=all --version={version} --apply --commit", cwd=REPO)
    return code


def cmd_status():
    """Show project status"""
    print("\n📊 PROJECT STATUS")
    print("=" * 60)

    # Git status
    code, output = run_cmd("git status --short", cwd=REPO, capture=True)
    changes = len(output.split('\n')) if output else 0
    print(f"  Git changes:        {changes} files")

    # Commit count
    code, output = run_cmd("git rev-list --count HEAD", cwd=REPO, capture=True)
    print(f"  Total commits:      {output}")

    # Branch info
    code, output = run_cmd("git rev-parse --abbrev-ref HEAD", cwd=REPO, capture=True)
    print(f"  Current branch:     {output}")

    # API endpoints
    api_files = list(Path(REPO / "functions" / "api").rglob("*.js"))
    print(f"  API endpoints:      {len(api_files)}")

    # Database tables
    print(f"\n  Database tables:")
    tables = ["users", "profiles", "video_comments", "comment_reports", "video_heatmap", "user_video_views", "rate_limits"]
    for table in tables:
        print(f"    - {table}")

    print("\n" + "=" * 60 + "\n")
    return 0


def cmd_backup():
    """Create backup of HTML files"""
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = REPO / f"backup-{timestamp}"
    backup_dir.mkdir(exist_ok=True)

    print(f"Creating backup in {backup_dir.name}...")

    html_files = list(REPO.glob("*.html"))
    for html_file in html_files:
        import shutil
        shutil.copy2(html_file, backup_dir / html_file.name)

    print(f"✓ Backed up {len(html_files)} HTML files")
    return 0


def cmd_lint_html():
    """Check HTML files for common issues"""
    print("\n🔍 LINTING HTML FILES")
    print("=" * 60)

    # Check for BOM
    print("\n  Checking for UTF-8 BOM...")
    bom_count = 0
    for html_file in REPO.glob("*.html"):
        with open(html_file, 'rb') as f:
            if f.read(3) == b'\xef\xbb\xbf':
                print(f"    ⚠ BOM in {html_file.name}")
                bom_count += 1

    if bom_count == 0:
        print("    ✓ No BOM found")

    # Check for CRLF
    print("\n  Checking for CRLF line endings...")
    crlf_count = 0
    for html_file in REPO.glob("*.html"):
        content = html_file.read_bytes()
        if b'\r\n' in content:
            print(f"    ⚠ CRLF in {html_file.name}")
            crlf_count += 1

    if crlf_count == 0:
        print("    ✓ All files use LF")

    print("\n" + "=" * 60 + "\n")
    return 0


def cmd_validate():
    """Run all validations"""
    print("\n✓ Running validations...")

    # BOM check
    code, _ = run_cmd("find . -name '*.html' -type f ! -path './.git/*' ! -path './node_modules/*' | while read f; do "
                      "if [ \"$(head -c 3 \"$f\" | od -A n -t x1 | tr -d ' ')\" = \"efbbbf\" ]; then "
                      "echo \"❌ BOM found in $f\"; exit 1; fi; done", cwd=REPO)

    if code == 0:
        print("  ✓ No BOM in HTML files")

    return code


def main():
    parser = argparse.ArgumentParser(description="Developer helper for Twerkhub")
    parser.add_argument(
        "command",
        nargs="?",
        default="status",
        help="Command to run: bump-css, bump-tokens, bump-all, status, backup, lint-html, validate"
    )

    args = parser.parse_args()

    commands = {
        "bump-css": cmd_bump_css,
        "bump-tokens": cmd_bump_tokens,
        "bump-all": cmd_bump_all,
        "status": cmd_status,
        "backup": cmd_backup,
        "lint-html": cmd_lint_html,
        "validate": cmd_validate,
    }

    if args.command not in commands:
        print(f"Unknown command: {args.command}")
        print(f"Available: {', '.join(commands.keys())}")
        return 1

    return commands[args.command]()


if __name__ == "__main__":
    sys.exit(main())
