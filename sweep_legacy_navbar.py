#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Define patterns to remove
PATTERNS = [
    (re.compile(r'<div class="site-nav-final".*?</div>\s*</div>\s*</div>\s*', re.DOTALL), 'legacy-navbar'),
    (re.compile(r'<link[^>]*site-nav-final\.css[^>]*>\s*\n?', re.IGNORECASE), 'legacy-css'),
    (re.compile(r'<script[^>]*online-count-global\.js[^>]*>\s*</script>\s*\n?', re.IGNORECASE), 'online-count-script'),
    (re.compile(r'<script[^>]*global-brand\.js[^>]*>\s*</script>\s*\n?', re.IGNORECASE), 'global-brand-script'),
    (re.compile(r'<script[^>]*analytics-profile\.js[^>]*>\s*</script>\s*\n?', re.IGNORECASE), 'analytics-profile-script'),
]

def has_canonical_navbar(content):
    """Check if file has TWK_NAV_V1 marker."""
    return 'TWK_NAV_V1' in content

def process_file(filepath):
    """Process a single HTML file. Returns dict with results."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
    except Exception as e:
        return {'file': filepath, 'error': str(e)}

    # Safety check: only process files with canonical navbar
    if not has_canonical_navbar(original):
        return {'file': filepath, 'skipped': True, 'reason': 'no-canonical-navbar'}

    modified = original
    removed_patterns = {}

    # Apply each pattern
    for pattern, name in PATTERNS:
        if pattern.search(modified):
            modified = pattern.sub('', modified)
            removed_patterns[name] = True

    # Only write if something was removed
    if removed_patterns:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(modified)
            return {
                'file': filepath,
                'modified': True,
                'removed_patterns': list(removed_patterns.keys())
            }
        except Exception as e:
            return {'file': filepath, 'error': str(e)}
    else:
        return {'file': filepath, 'no_changes': True}

def main():
    root = Path('.')
    html_files = list(root.glob('**/*.html'))

    results = []
    for filepath in html_files:
        result = process_file(filepath)
        results.append(result)

    # Summary
    modified_count = sum(1 for r in results if r.get('modified'))
    pattern_counts = {}

    for result in results:
        if result.get('modified'):
            for pattern in result.get('removed_patterns', []):
                pattern_counts[pattern] = pattern_counts.get(pattern, 0) + 1

    # Report
    print(f"=== SWEEP RESULTS ===")
    print(f"Total files modified: {modified_count}")
    print(f"\nPattern removal counts:")
    for pattern, count in sorted(pattern_counts.items()):
        print(f"  {pattern}: {count}")

    print(f"\nSample modified files (first 3):")
    sample_count = 0
    for result in results:
        if result.get('modified') and sample_count < 3:
            relpath = result['file']
            print(f"  {relpath}")
            print(f"    Removed: {', '.join(result['removed_patterns'])}")
            sample_count += 1

if __name__ == '__main__':
    main()
