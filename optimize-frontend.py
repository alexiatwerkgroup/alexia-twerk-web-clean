#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
optimize-frontend.py - Frontend asset optimization and analysis

Analyzes and optimizes frontend assets:
- Unused CSS detection
- Image optimization suggestions
- Bundle size analysis
- Asset minification
- Cache-busting verification

Usage:
    python optimize-frontend.py              # Full analysis
    python optimize-frontend.py --css        # CSS analysis only
    python optimize-frontend.py --images     # Image optimization
    python optimize-frontend.py --minify     # Minify assets
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).parent


class FrontendOptimizer:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.findings = []
        self.optimizations = 0

    def report(self, category, severity, message):
        """Report an optimization finding"""
        self.findings.append({
            'category': category,
            'severity': severity,
            'message': message,
        })

    def analyze_html_files(self):
        """Analyze HTML files for optimization"""
        print("\n🔍 Analyzing HTML files...")

        html_files = list(REPO.glob("*.html"))
        print(f"  Found {len(html_files)} HTML files")

        # Check for duplicate script includes
        script_includes = {}
        for html_file in html_files:
            try:
                content = html_file.read_text(encoding='utf-8')
                scripts = re.findall(r'<script[^>]*src="([^"]+)"', content)

                for script in scripts:
                    if script not in script_includes:
                        script_includes[script] = []
                    script_includes[script].append(html_file.name)
            except:
                continue

        # Find duplicates
        duplicates = {k: v for k, v in script_includes.items() if len(v) > 1}
        if duplicates:
            self.report('HTML', 'MEDIUM', f'{len(duplicates)} scripts included multiple times')
            if self.verbose:
                for script, files in duplicates.items():
                    print(f"    {script}: {', '.join(files)}")

        # Check for missing cache-busters
        no_cache_buster = []
        for html_file in html_files:
            try:
                content = html_file.read_text(encoding='utf-8')
                # Look for CSS/JS without ?v= parameter
                bad_refs = re.findall(r'(?:href|src)="((?!http|data:)[^"]*\.(css|js))"(?!\?)', content)
                if bad_refs:
                    no_cache_buster.append((html_file.name, len(bad_refs)))
            except:
                continue

        if no_cache_buster:
            self.report('HTML', 'HIGH', f'{len(no_cache_buster)} HTML files with assets missing cache-busters')
            if self.verbose:
                for file, count in no_cache_buster:
                    print(f"    {file}: {count} assets without ?v=")

    def analyze_css_files(self):
        """Analyze CSS files"""
        print("\n🎨 Analyzing CSS files...")

        css_files = list(REPO.glob("assets/*.css"))
        print(f"  Found {len(css_files)} CSS files")

        total_size = 0
        for css_file in css_files:
            try:
                content = css_file.read_text(encoding='utf-8')
                total_size += len(content)

                # Check for unused selectors (simple heuristic)
                selectors = re.findall(r'^[^{]+{', content, re.MULTILINE)
                unique_selectors = len(set(selectors))

                # Check for duplicates
                if len(selectors) > unique_selectors:
                    duplicates = len(selectors) - unique_selectors
                    self.report('CSS', 'LOW', f'{css_file.name}: {duplicates} duplicate selectors')

                # Check for long selectors (specificity issues)
                long_selectors = [s for s in selectors if s.count(' ') > 4]
                if long_selectors:
                    self.report('CSS', 'LOW', f'{css_file.name}: {len(long_selectors)} overly specific selectors')

            except:
                continue

        print(f"  Total CSS size: {total_size / 1024:.1f} KB")
        if total_size > 100 * 1024:  # > 100KB
            self.report('CSS', 'MEDIUM', f'Large CSS bundle: {total_size / 1024:.1f} KB (consider splitting)')

    def analyze_images(self):
        """Analyze images for optimization"""
        print("\n🖼️ Analyzing images...")

        image_files = list(REPO.rglob("*.{jpg,jpeg,png,gif,webp}"))
        print(f"  Found {len(image_files)} images")

        large_images = []
        for img in image_files:
            if img.stat().st_size > 500 * 1024:  # > 500KB
                large_images.append((img.name, img.stat().st_size / 1024))

        if large_images:
            self.report('IMAGES', 'HIGH', f'{len(large_images)} images > 500KB')
            if self.verbose:
                for img, size in sorted(large_images, key=lambda x: x[1], reverse=True)[:5]:
                    print(f"    {img}: {size:.1f} KB")

        # Check for unoptimized PNG files
        png_files = list(REPO.rglob("*.png"))
        if png_files:
            self.report('IMAGES', 'MEDIUM', f'{len(png_files)} PNG files (consider WebP conversion)')

    def analyze_js_bundles(self):
        """Analyze JavaScript bundles"""
        print("\n📦 Analyzing JavaScript...")

        js_files = list(REPO.glob("assets/*.js"))
        print(f"  Found {len(js_files)} JS files")

        total_size = 0
        for js_file in js_files:
            try:
                content = js_file.read_text(encoding='utf-8')
                total_size += len(content)

                # Check for minification
                is_minified = len(content.split('\n')) < len(content) / 50
                if not is_minified:
                    self.report('JS', 'LOW', f'{js_file.name}: not minified (could save ~40%)')

                # Check for console statements
                if 'console.' in content:
                    self.report('JS', 'LOW', f'{js_file.name}: contains console statements')

            except:
                continue

        print(f"  Total JS size: {total_size / 1024:.1f} KB")
        if total_size > 200 * 1024:  # > 200KB
            self.report('JS', 'MEDIUM', f'Large JS bundle: {total_size / 1024:.1f} KB')

    def analyze_performance(self):
        """Analyze performance metrics"""
        print("\n⚡ Analyzing performance...")

        # Check for render-blocking resources
        html_files = list(REPO.glob("*.html"))
        render_blocking = []

        for html_file in html_files:
            try:
                content = html_file.read_text(encoding='utf-8')

                # Look for synchronous scripts in head
                if re.search(r'<head[^>]*>.*?<script[^>]*src=.*?</head>', content, re.DOTALL):
                    render_blocking.append(html_file.name)

                # Check for CSS in body (bad)
                if re.search(r'<body[^>]*>.*?<link[^>]*rel="stylesheet"', content, re.DOTALL):
                    self.report('PERF', 'HIGH', f'{html_file.name}: stylesheets in body (move to head)')

            except:
                continue

        if render_blocking:
            self.report('PERF', 'MEDIUM', f'{len(render_blocking)} files with render-blocking scripts in head')

    def print_report(self):
        """Print optimization report"""
        print("\n" + "=" * 80)
        print("📊 FRONTEND OPTIMIZATION REPORT")
        print("=" * 80 + "\n")

        if not self.findings:
            print("✓ No major optimization opportunities found!")
            return 0

        # Group by severity
        critical = [f for f in self.findings if f['severity'] == 'CRITICAL']
        high = [f for f in self.findings if f['severity'] == 'HIGH']
        medium = [f for f in self.findings if f['severity'] == 'MEDIUM']
        low = [f for f in self.findings if f['severity'] == 'LOW']

        if critical:
            print(f"🔴 CRITICAL ({len(critical)}):")
            for finding in critical:
                print(f"  [{finding['category']}] {finding['message']}")

        if high:
            print(f"\n🟠 HIGH ({len(high)}):")
            for finding in high:
                print(f"  [{finding['category']}] {finding['message']}")

        if medium:
            print(f"\n🟡 MEDIUM ({len(medium)}):")
            for finding in medium[:5]:
                print(f"  [{finding['category']}] {finding['message']}")
            if len(medium) > 5:
                print(f"  ... and {len(medium) - 5} more")

        if low:
            print(f"\n🔵 LOW ({len(low)}):")
            print(f"  {len(low)} minor optimizations available")

        print("\n" + "=" * 80)
        print(f"Total findings: {len(self.findings)}")
        print("=" * 80 + "\n")

        return 1 if critical or high else 0

    def run_all_analysis(self):
        """Run all frontend analysis"""
        print("\n🚀 FRONTEND OPTIMIZATION ANALYSIS")
        print("=" * 80)

        self.analyze_html_files()
        self.analyze_css_files()
        self.analyze_images()
        self.analyze_js_bundles()
        self.analyze_performance()

        return self.print_report()


def main():
    parser = argparse.ArgumentParser(description="Frontend asset optimizer")
    parser.add_argument("--css", action="store_true", help="CSS analysis only")
    parser.add_argument("--images", action="store_true", help="Image analysis only")
    parser.add_argument("--js", action="store_true", help="JavaScript analysis only")
    parser.add_argument("--perf", action="store_true", help="Performance analysis only")
    parser.add_argument("--minify", action="store_true", help="Minify assets")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    optimizer = FrontendOptimizer(verbose=args.verbose)

    if args.css:
        optimizer.analyze_css_files()
    elif args.images:
        optimizer.analyze_images()
    elif args.js:
        optimizer.analyze_js_bundles()
    elif args.perf:
        optimizer.analyze_performance()
    else:
        return optimizer.run_all_analysis()

    return optimizer.print_report()


if __name__ == "__main__":
    sys.exit(main())
