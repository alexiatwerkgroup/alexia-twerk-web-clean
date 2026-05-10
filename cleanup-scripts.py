#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cleanup-scripts.py - Identify and clean up obsolete Python scripts

Categorizes scripts and suggests which ones can be archived/deleted:
- Active: Used regularly (cache busting, generation, maintenance)
- Historical: One-time fixes (20260506 in name = old)
- Redundant: Duplicates or superseded by new tools
- Unknown: Unclear purpose

Usage:
    python cleanup-scripts.py              # Audit all scripts
    python cleanup-scripts.py --archive    # Archive historical scripts
    python cleanup-scripts.py --categorize # Show categorization
    python cleanup-scripts.py --stats      # Show statistics
"""

import argparse
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).parent


class ScriptAuditor:
    def __init__(self):
        self.scripts = {}
        self.categories = {
            'active': [],
            'historical': [],
            'redundant': [],
            'archived': [],
            'unknown': [],
        }

    def audit_all(self):
        """Audit all Python scripts in repo root"""
        py_files = list(REPO.glob("*.py"))

        # Known active scripts (new tools created this session)
        active_patterns = [
            'bump-cache-unified',
            'dev-tasks',
            'db-ops',
            'security-audit',
            'deploy-check',
            'analyze-queries',
            'optimize-frontend',
            'improvements-summary',
            'cleanup-scripts',
            'monitoring-setup',
            'hooks-install',
        ]

        # Known redundant/superseded
        redundant_patterns = [
            'bump-css-cache',
            'bump-pill-cache',
            'bump-token-cache',
            'bump-supabase',
            'bump-cb-',
            'bump-ph-theme',
            'bump-d1-cache',
            'bump-bundle-cache',
            'bump-twerkhub-auth',
        ]

        for script in py_files:
            name = script.name

            # Skip if already archived
            if '_archived' in str(script.parent):
                self.categories['archived'].append(name)
                continue

            # Categorize
            if any(pattern in name for pattern in active_patterns):
                self.categories['active'].append(name)
            elif any(pattern in name for pattern in redundant_patterns):
                self.categories['redundant'].append(name)
            elif re.search(r'\d{8}', name):  # Date in filename (20260506)
                self.categories['historical'].append(name)
            else:
                self.categories['unknown'].append(name)

            # Store metadata
            try:
                content = script.read_text(encoding='utf-8')
                lines = len(content.split('\n'))
                size_kb = script.stat().st_size / 1024

                self.scripts[name] = {
                    'path': script,
                    'size_kb': size_kb,
                    'lines': lines,
                    'category': self._get_category(name),
                    'docstring': self._extract_docstring(content),
                }
            except:
                pass

    def _get_category(self, name):
        """Get category for a script name"""
        for cat, scripts in self.categories.items():
            if name in scripts:
                return cat
        return 'unknown'

    def _extract_docstring(self, content):
        """Extract first line of docstring"""
        match = re.search(r'"""([^"]+)"""', content, re.DOTALL)
        if match:
            return match.group(1).split('\n')[0].strip()
        return None

    def print_categorization(self):
        """Print script categorization"""
        print("\n" + "=" * 80)
        print("📋 SCRIPT CATEGORIZATION")
        print("=" * 80)

        print(f"\n🟢 ACTIVE ({len(self.categories['active'])}) - Keep & Use")
        print("-" * 80)
        for script in sorted(self.categories['active']):
            if script in self.scripts:
                info = self.scripts[script]
                doc = f" - {info['docstring']}" if info['docstring'] else ""
                print(f"  ✓ {script} ({info['lines']} lines){doc}")

        print(f"\n🟡 HISTORICAL ({len(self.categories['historical'])}) - Archive?")
        print("-" * 80)
        for script in sorted(self.categories['historical']):
            if script in self.scripts:
                info = self.scripts[script]
                print(f"  ⏱ {script} ({info['size_kb']:.1f}KB)")

        print(f"\n🔴 REDUNDANT ({len(self.categories['redundant'])}) - Delete")
        print("-" * 80)
        for script in sorted(self.categories['redundant']):
            print(f"  ✗ {script} (superseded by bump-cache-unified.py)")

        print(f"\n❓ UNKNOWN ({len(self.categories['unknown'])}) - Review")
        print("-" * 80)
        for script in sorted(self.categories['unknown']):
            if script in self.scripts:
                info = self.scripts[script]
                doc = f" - {info['docstring']}" if info['docstring'] else ""
                print(f"  ? {script}{doc}")

        print(f"\n📦 ARCHIVED ({len(self.categories['archived'])})")
        print("-" * 80)
        if self.categories['archived']:
            for script in self.categories['archived'][:5]:
                print(f"  📁 {script}")
            if len(self.categories['archived']) > 5:
                print(f"  ... and {len(self.categories['archived']) - 5} more")

    def print_stats(self):
        """Print statistics"""
        print("\n" + "=" * 80)
        print("📊 SCRIPT AUDIT STATISTICS")
        print("=" * 80)

        total = len(self.scripts)
        total_size = sum(s['size_kb'] for s in self.scripts.values())
        total_lines = sum(s['lines'] for s in self.scripts.values())

        print(f"\nTotal scripts: {total}")
        print(f"Total size: {total_size:.1f} KB")
        print(f"Total lines: {total_lines}")

        print(f"\nBreakdown:")
        print(f"  Active:     {len(self.categories['active']):3d} scripts")
        print(f"  Historical: {len(self.categories['historical']):3d} scripts (can be archived)")
        print(f"  Redundant:  {len(self.categories['redundant']):3d} scripts (can be deleted)")
        print(f"  Unknown:    {len(self.categories['unknown']):3d} scripts (needs review)")
        print(f"  Archived:   {len(self.categories['archived']):3d} scripts")

        redundant_size = sum(
            self.scripts[s]['size_kb']
            for s in self.categories['redundant']
            if s in self.scripts
        )
        historical_size = sum(
            self.scripts[s]['size_kb']
            for s in self.categories['historical']
            if s in self.scripts
        )

        print(f"\nOptimization potential:")
        print(f"  Delete redundant: {redundant_size:.1f} KB ({len(self.categories['redundant'])} files)")
        print(f"  Archive historical: {historical_size:.1f} KB ({len(self.categories['historical'])} files)")
        print(f"  Total recovery: {redundant_size + historical_size:.1f} KB")

    def archive_historical(self, interactive=True):
        """Archive historical scripts"""
        print("\n" + "=" * 80)
        print("📦 ARCHIVING HISTORICAL SCRIPTS")
        print("=" * 80)

        # Create archive directory
        archive_dir = REPO / ".archived_scripts"
        archive_dir.mkdir(exist_ok=True)

        archived = 0
        for script_name in self.categories['historical']:
            script_path = self.scripts[script_name]['path']

            if interactive:
                response = input(f"\nArchive {script_name}? (yes/no): ").strip().lower()
                if response != "yes":
                    continue

            try:
                # Move to archive
                dest = archive_dir / script_name
                shutil.move(str(script_path), str(dest))
                print(f"  ✓ Archived: {script_name}")
                archived += 1
            except Exception as e:
                print(f"  ✗ Failed to archive {script_name}: {e}")

        print(f"\n📦 Archived {archived} scripts to .archived_scripts/")
        print("   (You can recover them from git if needed)")

    def delete_redundant(self, interactive=True):
        """Delete redundant scripts"""
        print("\n" + "=" * 80)
        print("🗑️ DELETING REDUNDANT SCRIPTS")
        print("=" * 80)

        deleted = 0
        for script_name in self.categories['redundant']:
            script_path = self.scripts[script_name]['path']

            if interactive:
                response = input(f"\nDelete {script_name}? (yes/no): ").strip().lower()
                if response != "yes":
                    continue

            try:
                script_path.unlink()
                print(f"  ✓ Deleted: {script_name}")
                deleted += 1
            except Exception as e:
                print(f"  ✗ Failed to delete {script_name}: {e}")

        print(f"\n🗑️ Deleted {deleted} redundant scripts")

    def print_recommendations(self):
        """Print cleanup recommendations"""
        print("\n" + "=" * 80)
        print("💡 CLEANUP RECOMMENDATIONS")
        print("=" * 80)

        print("\n1. IMMEDIATE ACTIONS:")
        print(f"   • Keep active scripts ({len(self.categories['active'])})")
        print(f"   • Archive historical scripts ({len(self.categories['historical'])}) → .archived_scripts/")
        print(f"   • Delete redundant scripts ({len(self.categories['redundant'])}) → git will track deletion")

        print("\n2. REVIEW UNKNOWN SCRIPTS:")
        if self.categories['unknown']:
            for script in sorted(self.categories['unknown'])[:5]:
                print(f"   • {script} - clarify purpose or delete")
        else:
            print("   ✓ All scripts are categorized")

        print("\n3. COMMANDS TO RUN:")
        print("   python cleanup-scripts.py --archive  # Archive historical")
        print("   python cleanup-scripts.py --delete   # Delete redundant")
        print("   git add .archived_scripts/")
        print("   git commit -m 'chore: archive historical scripts'")
        print("   git push")

        print("\n" + "=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Python script cleanup and auditing")
    parser.add_argument("--categorize", action="store_true", help="Show categorization")
    parser.add_argument("--stats", action="store_true", help="Show statistics")
    parser.add_argument("--archive", action="store_true", help="Archive historical scripts")
    parser.add_argument("--delete", action="store_true", help="Delete redundant scripts")
    parser.add_argument("--auto", action="store_true", help="Non-interactive mode (skip prompts)")
    parser.add_argument("--recommendations", action="store_true", help="Show cleanup recommendations")

    args = parser.parse_args()

    auditor = ScriptAuditor()
    auditor.audit_all()

    if args.categorize:
        auditor.print_categorization()
    elif args.stats:
        auditor.print_stats()
    elif args.archive:
        auditor.archive_historical(interactive=not args.auto)
    elif args.delete:
        auditor.delete_redundant(interactive=not args.auto)
    elif args.recommendations:
        auditor.print_recommendations()
    else:
        # Default: show everything
        auditor.print_categorization()
        auditor.print_stats()
        auditor.print_recommendations()

    return 0


if __name__ == "__main__":
    sys.exit(main())
