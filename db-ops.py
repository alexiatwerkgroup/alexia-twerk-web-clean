#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
db-ops.py - Database operations helper for D1

Usage:
    python db-ops.py apply-schema       # Apply schema to remote DB
    python db-ops.py backup-schema      # Backup current schema
    python db-ops.py verify-schema      # Verify schema is correct
    python db-ops.py optimize-indexes   # Create performance indexes
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).parent
D1_DIR = REPO / "_d1"


def run_wrangler(cmd, remote=False):
    """Run wrangler d1 command"""
    db_name = "twerkhub-subscribers"
    remote_flag = " --remote" if remote else ""
    full_cmd = f"wrangler d1 {cmd} {db_name}{remote_flag}"

    print(f"  $ {full_cmd}")
    try:
        result = subprocess.run(full_cmd, shell=True, cwd=REPO, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return result.returncode
        if result.stdout:
            print(result.stdout)
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


def cmd_apply_schema():
    """Apply schema files to database"""
    print("\n📊 APPLYING SCHEMA")
    print("=" * 60)

    schemas = [
        ("Main schema", "schema-auth-tokens.sql"),
        ("Rate limits", "rate-limits.sql"),
    ]

    for name, file in schemas:
        print(f"\n  {name}: {file}")
        if not (D1_DIR / file).exists():
            print(f"    ⚠ File not found: {file}")
            continue

        # Ask for confirmation
        response = input(f"    Apply to remote DB? (yes/no): ").strip().lower()
        if response != "yes":
            print("    Skipped")
            continue

        code = run_wrangler(f"execute --file={D1_DIR / file}", remote=True)
        if code == 0:
            print(f"    ✓ Applied {file}")
        else:
            print(f"    ❌ Failed to apply {file}")

    print("\n" + "=" * 60 + "\n")


def cmd_backup_schema():
    """Export current schema"""
    print("\n💾 BACKING UP SCHEMA")
    print("=" * 60)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_file = D1_DIR / f"backup-schema-{timestamp}.sql"

    print(f"\n  Exporting schema to {backup_file.name}...")
    code = run_wrangler(f"execute --json \"SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name\"", remote=True)

    if code == 0:
        print(f"  ✓ Schema backed up to {backup_file.name}")
    else:
        print(f"  ❌ Failed to backup schema")

    print("\n" + "=" * 60 + "\n")


def cmd_verify_schema():
    """Verify schema is correct"""
    print("\n✓ VERIFYING SCHEMA")
    print("=" * 60)

    tables = [
        "users",
        "profiles",
        "video_comments",
        "comment_reports",
        "video_heatmap",
        "user_video_views",
        "rate_limits",
    ]

    print(f"\n  Expected tables: {len(tables)}")
    for table in tables:
        print(f"    - {table}")

    print("\n  Checking remote database...")
    code = run_wrangler(f"execute \"SELECT name FROM sqlite_master WHERE type='table'\"", remote=True)

    if code == 0:
        print("\n  ✓ Schema verification complete")
    else:
        print("\n  ❌ Failed to verify schema")

    print("\n" + "=" * 60 + "\n")


def cmd_optimize_indexes():
    """Create performance indexes"""
    print("\n⚡ OPTIMIZING INDEXES")
    print("=" * 60)

    indexes = [
        ("User by email", "users", "email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL"),
        ("Comments by video", "video_comments", "video_id", "CREATE INDEX IF NOT EXISTS idx_comments_video ON video_comments(video_id)"),
        ("Heatmap by video", "video_heatmap", "video_id", "CREATE INDEX IF NOT EXISTS idx_heatmap_video ON video_heatmap(video_id)"),
        ("Rate limits by key", "rate_limits", "key", "CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key)"),
    ]

    print(f"\n  Creating {len(indexes)} indexes...")
    for name, table, column, sql in indexes:
        print(f"    - {name}")

    response = input("\n  Create these indexes on remote DB? (yes/no): ").strip().lower()
    if response != "yes":
        print("  Skipped")
        return 0

    for name, table, column, sql in indexes:
        print(f"\n  Creating: {name}")
        code = run_wrangler(f"execute \"{sql}\"", remote=True)
        if code != 0:
            print(f"    ⚠ Failed to create index for {table}")

    print("\n" + "=" * 60 + "\n")
    return 0


def cmd_status():
    """Show database status"""
    print("\n📊 DATABASE STATUS")
    print("=" * 60)

    print("\n  Checking database connection...")
    code = run_wrangler("execute \"SELECT COUNT(*) as user_count FROM users\"", remote=True)

    if code == 0:
        print("\n  ✓ Database is accessible")
    else:
        print("\n  ❌ Cannot access database")

    print("\n" + "=" * 60 + "\n")
    return code


def main():
    parser = argparse.ArgumentParser(description="Database operations for D1")
    parser.add_argument(
        "command",
        nargs="?",
        default="status",
        help="Command: apply-schema, backup-schema, verify-schema, optimize-indexes, status"
    )

    args = parser.parse_args()

    commands = {
        "apply-schema": cmd_apply_schema,
        "backup-schema": cmd_backup_schema,
        "verify-schema": cmd_verify_schema,
        "optimize-indexes": cmd_optimize_indexes,
        "status": cmd_status,
    }

    if args.command not in commands:
        print(f"Unknown command: {args.command}")
        print(f"Available: {', '.join(commands.keys())}")
        return 1

    return commands[args.command]()


if __name__ == "__main__":
    sys.exit(main())
