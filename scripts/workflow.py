#!/usr/bin/env python3
"""
Workflow Orchestrator — Master controller for complex dev tasks
Coordinates: playlist generation → component updates → cache busting → commits
v20260511-unified
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

class Workflow:
    """Master workflow orchestrator."""

    def __init__(self, root_dir='.', dry_run=False):
        self.root = Path(root_dir)
        self.dry_run = dry_run
        self.log = []
        self.errors = []
        self.changes = []

    def _run(self, cmd, cwd=None, check=True):
        """Execute shell command and log."""
        cwd = cwd or self.root
        self.log.append(f"  $ {' '.join(cmd)}")
        if self.dry_run:
            return 0
        try:
            result = subprocess.run(cmd, cwd=cwd, check=check, capture_output=True)
            return result.returncode
        except subprocess.CalledProcessError as e:
            self.errors.append(f"Command failed: {' '.join(cmd)}")
            return e.returncode

    def _status(self, msg, icon='→'):
        """Print status message."""
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"  [{timestamp}] {icon} {msg}")
        self.log.append(msg)

    def add_playlist(self, slug, title, videos_json=None, auto_commit=True):
        """Add new playlist: generate HTML → validate → bump cache → commit."""
        self._status(f"Adding playlist: {slug}")

        # 1. Create data file if provided
        if videos_json:
            data_file = self.root / '_playlist_data' / f'{slug}.json'
            data_file.parent.mkdir(parents=True, exist_ok=True)
            self._status(f"Creating {data_file}")
            if not self.dry_run:
                with open(data_file, 'w') as f:
                    json.dump(videos_json, f, indent=2)
            self.changes.append(str(data_file))

        # 2. Generate HTML from data
        self._status("Generating playlist HTML...")
        cmd = [
            sys.executable, 'scripts/generate-playlists-unified.py',
            '--data', f'_playlist_data/{slug}.json',
            '--apply'
        ]
        if self._run(cmd) != 0:
            self.errors.append(f"Failed to generate {slug}")
            return False

        # 3. Bump cache for new content
        self._status("Bumping cache...")
        cmd = [
            sys.executable, 'scripts/bump-cache-unified.py',
            '--target=css',
            '--label=playlist-added',
            '--apply'
        ]
        self._run(cmd)

        # 4. Auto-commit
        if auto_commit and not self.dry_run:
            self._status("Committing...")
            self._run(['git', 'add', f'{slug}/index.html'])
            self._run(['git', 'commit', '-m', f'feat: add playlist {slug}'])

        self._status(f"✓ Playlist {slug} published", icon='✓')
        return True

    def fix_component(self, component_name, version_label='', auto_commit=True):
        """Fix component: validate → bump cache → commit."""
        self._status(f"Fixing component: {component_name}")

        # 1. Validate component exists
        comp_files = list(self.root.glob(f'assets/*{component_name}*'))
        if not comp_files:
            self.errors.append(f"Component {component_name} not found")
            return False

        self._status(f"Found {len(comp_files)} component file(s)")

        # 2. Bump cache for this component only
        label = version_label or component_name
        self._status(f"Bumping cache for {component_name}...")
        cmd = [
            sys.executable, 'scripts/bump-cache-unified.py',
            '--target=' + self._map_component_target(component_name),
            f'--label={label}',
            '--apply'
        ]
        self._run(cmd)

        # 3. Commit
        if auto_commit and not self.dry_run:
            self._status("Committing...")
            self._run(['git', 'add', '*.html'])
            self._run(['git', 'commit', '-m', f'fix: update {component_name}'])

        self._status(f"✓ Component {component_name} fixed", icon='✓')
        return True

    def deploy_hotfix(self, message, files_to_stage=None, auto_push=False):
        """Deploy hotfix: validate → stage → commit → push."""
        self._status(f"Deploying hotfix: {message}")

        if not files_to_stage:
            files_to_stage = self._detect_changed_files()

        if not files_to_stage:
            self._status("No changes detected", icon='·')
            return True

        # Stage files
        self._status(f"Staging {len(files_to_stage)} files...")
        if not self.dry_run:
            self._run(['git', 'add'] + files_to_stage)

        # Commit
        self._status(f"Committing: {message}")
        if not self.dry_run:
            self._run(['git', 'commit', '-m', message])

        # Push (optional)
        if auto_push and not self.dry_run:
            self._status("Pushing to remote...")
            self._run(['git', 'push', 'origin', 'main'])

        self._status(f"✓ Hotfix deployed", icon='✓')
        return True

    def validate_all(self):
        """Run all validation checks."""
        self._status("Running validation suite...")

        # 1. Check BOM in HTML
        self._status("Checking for UTF-8 BOM...")
        cmd = ['bash', '-c', 'find . -name "*.html" -exec file {} \\; | grep -i bom | wc -l']
        result = subprocess.run(cmd, cwd=self.root, capture_output=True, text=True)
        bom_count = int(result.stdout.strip() or 0)
        if bom_count > 0:
            self.errors.append(f"Found {bom_count} files with BOM")

        # 2. Check CRLF
        self._status("Checking for CRLF line endings...")
        cmd = ['bash', '-c', 'find . -name "*.js" -o -name "*.json" | grep -v node_modules | xargs file | grep -c CRLF']
        result = subprocess.run(cmd, cwd=self.root, capture_output=True, text=True)
        crlf_count = int(result.stdout.strip() or 0)
        if crlf_count > 0:
            self.errors.append(f"Found {crlf_count} files with CRLF")

        # 3. Validate JSON files
        self._status("Validating JSON...")
        json_files = list(self.root.glob('**/*.json'))
        for jf in json_files[:20]:  # Sample
            try:
                with open(jf) as f:
                    json.load(f)
            except json.JSONDecodeError:
                self.errors.append(f"Invalid JSON: {jf}")

        self._status(f"✓ Validation complete (Errors: {len(self.errors)})", icon='✓')
        return len(self.errors) == 0

    def report(self):
        """Print execution report."""
        print(f"\n{'='*70}")
        print(f"  WORKFLOW REPORT")
        print(f"{'='*70}\n")

        if self.log:
            print("Log:")
            for entry in self.log[-20:]:  # Last 20 entries
                print(f"  {entry}")

        if self.changes:
            print(f"\nChanges ({len(self.changes)}):")
            for change in self.changes[:10]:
                print(f"  + {change}")
            if len(self.changes) > 10:
                print(f"  ... and {len(self.changes)-10} more")

        if self.errors:
            print(f"\nErrors ({len(self.errors)}):")
            for error in self.errors:
                print(f"  ✗ {error}")
        else:
            print("\n✓ All operations completed successfully")

        print(f"\n{'='*70}\n")

    @staticmethod
    def _map_component_target(component_name):
        """Map component name to cache bust target."""
        mapping = {
            'tokens': 'tokens',
            'pill': 'pill',
            'auth': 'auth',
            'guardian': 'guardian',
        }
        for key, target in mapping.items():
            if key in component_name.lower():
                return target
        return 'css'

    @staticmethod
    def _detect_changed_files():
        """Detect modified files using git."""
        try:
            result = subprocess.run(
                ['git', 'diff', '--name-only'],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip().split('\n') if result.stdout else []
        except:
            return []


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Workflow orchestrator for dev tasks',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Commands:
  add-playlist       Add and publish a new playlist
  fix-component      Fix and deploy a component update
  hotfix            Deploy a hotfix with custom message
  validate          Run validation suite

Examples:
  # Add new playlist
  python scripts/workflow.py add-playlist --slug=my-list --title="My List"

  # Fix component
  python scripts/workflow.py fix-component --component=tokens

  # Deploy hotfix
  python scripts/workflow.py hotfix --message="fix: auth redirect" --push
        '''
    )

    parser.add_argument('command', choices=['add-playlist', 'fix-component', 'hotfix', 'validate'])
    parser.add_argument('--slug', help='Playlist slug (for add-playlist)')
    parser.add_argument('--title', help='Playlist title (for add-playlist)')
    parser.add_argument('--component', help='Component name (for fix-component)')
    parser.add_argument('--label', help='Version label')
    parser.add_argument('--message', help='Commit message (for hotfix)')
    parser.add_argument('--push', action='store_true', help='Auto-push to remote')
    parser.add_argument('--dry-run', action='store_true', help='Simulate without changes')

    args = parser.parse_args()

    wf = Workflow(dry_run=args.dry_run)

    if args.command == 'add-playlist':
        if not args.slug or not args.title:
            print("Error: --slug and --title required")
            return 1
        wf.add_playlist(args.slug, args.title)

    elif args.command == 'fix-component':
        if not args.component:
            print("Error: --component required")
            return 1
        wf.fix_component(args.component, args.label or '')

    elif args.command == 'hotfix':
        if not args.message:
            print("Error: --message required")
            return 1
        wf.deploy_hotfix(args.message, auto_push=args.push)

    elif args.command == 'validate':
        if not wf.validate_all():
            return 1

    wf.report()
    return 0 if not wf.errors else 1


if __name__ == '__main__':
    sys.exit(main())
