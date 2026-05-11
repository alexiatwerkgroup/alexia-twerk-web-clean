#!/usr/bin/env python3
"""
Remove non-public pages from sitemap.xml
Pages blocked in robots.txt shouldn't be in sitemap
v20260511
"""

import xml.etree.ElementTree as ET
import sys

# Pages that should NOT be in sitemap (blocked in robots.txt)
BLOCKED_PATTERNS = {
    'account.html',
    'admin-users.html',
    'auth-callback.html',
    'profile.html',
    'debug-',
    'test-',
    '/api/',
    '/tools/',
}

def should_include(url):
    """Check if URL should be in sitemap"""
    for pattern in BLOCKED_PATTERNS:
        if pattern in url:
            return False
    return True

def cleanup_sitemap(filepath='sitemap.xml'):
    """Remove blocked pages from sitemap"""

    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except Exception as e:
        print(f"✗ Error reading sitemap: {e}")
        return False

    # Handle namespace
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    # Get all URLs
    urls = root.findall('sm:url', ns)
    total_before = len(urls)

    print(f"\n{'='*70}")
    print(f"  SITEMAP CLEANUP")
    print(f"{'='*70}\n")
    print(f"Total URLs before: {total_before}\n")

    # Remove blocked pages
    removed_urls = []
    for url_elem in urls:
        loc = url_elem.find('sm:loc', ns)
        if loc is not None:
            if not should_include(loc.text):
                root.remove(url_elem)
                removed_urls.append(loc.text)
                print(f"  Removing: {loc.text}")

    # Save cleaned sitemap
    try:
        tree.write(filepath, encoding='utf-8', xml_declaration=True)
    except Exception as e:
        print(f"\n✗ Error writing sitemap: {e}")
        return False

    # Report
    total_after = len(root.findall('sm:url', ns))

    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")
    print(f"  Removed:   {len(removed_urls)} URLs")
    print(f"  Before:    {total_before}")
    print(f"  After:     {total_after}")
    print(f"  Saved:     {filepath}")
    print(f"{'='*70}\n")

    print("✓ Sitemap cleanup complete!\n")
    print("NEXT STEP:")
    print("  1. Go to: https://search.google.com/search-console/")
    print("  2. Go to: Sitemaps section")
    print("  3. Remove old sitemap (if exists)")
    print("  4. Add new: https://alexiatwerkgroup.com/sitemap.xml")
    print("  5. Click 'Submit'\n")

    return True

if __name__ == '__main__':
    cleanup_sitemap()
