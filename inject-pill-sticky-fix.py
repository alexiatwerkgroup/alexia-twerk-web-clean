#!/usr/bin/env python3
"""Inject pill-sticky-fix.css into all HTML files"""

from pathlib import Path
import re

CSS_LINK = '<link rel="stylesheet" href="/assets/pill-sticky-fix.css?v=20260510">'

def inject_css_into_html():
    html_files = list(Path('.').glob('*.html'))
    updated = 0
    
    for html_file in html_files:
        try:
            content = html_file.read_text(encoding='utf-8')
            
            # Check if already injected
            if 'pill-sticky-fix.css' in content:
                print(f"⏭  {html_file.name} - already has pill-sticky-fix")
                continue
            
            # Find the last twerkhub-ph-theme.css link and add our CSS after it
            pattern = r'(<link[^>]*twerkhub-ph-theme\.css[^>]*>)'
            match = re.search(pattern, content)
            
            if not match:
                print(f"⚠  {html_file.name} - no theme CSS found")
                continue
            
            # Insert after the theme CSS link
            insert_pos = match.end()
            new_content = content[:insert_pos] + '\n' + CSS_LINK + content[insert_pos:]
            
            html_file.write_text(new_content, encoding='utf-8')
            print(f"✓ {html_file.name} - injected")
            updated += 1
            
        except Exception as e:
            print(f"✗ {html_file.name} - error: {e}")
    
    print(f"\n✅ Updated {updated} HTML files")

if __name__ == '__main__':
    inject_css_into_html()
