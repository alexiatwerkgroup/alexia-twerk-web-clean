#!/usr/bin/env python3
import os
from pathlib import Path

def analyze_bundle():
    print("🔍 BUNDLE ANALYSIS")
    print("=" * 80)
    
    assets_dir = Path("public/assets")
    if not assets_dir.exists():
        print("⚠ assets directory not found")
        return

    js_files = list(assets_dir.glob("**/*.js"))
    css_files = list(assets_dir.glob("**/*.css"))
    img_files = list(assets_dir.glob("**/*.{png,jpg,jpeg,gif,webp,svg}", recursive=True))

    print(f"\n📦 JavaScript: {len(js_files)} files")
    print(f"🎨 CSS: {len(css_files)} files")
    print(f"🖼  Images: {len(img_files)} files")
    
    print(f"\n✅ Bundle analysis complete")

if __name__ == '__main__':
    analyze_bundle()
