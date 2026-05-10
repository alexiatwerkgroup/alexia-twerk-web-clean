#!/usr/bin/env python3
import gzip
from pathlib import Path

def analyze_compression():
    print("🗜️  COMPRESSION ANALYSIS")
    print("=" * 80)
    
    html_files = list(Path(".").glob("**/*.html"))
    total_size = 0
    total_gzip = 0
    
    for html_file in html_files[:5]:
        try:
            with open(html_file, 'rb') as f:
                content = f.read()
            original = len(content)
            compressed = len(gzip.compress(content, compresslevel=9))
            total_size += original
            total_gzip += compressed
        except: pass
    
    if total_size > 0:
        ratio = (1 - total_gzip / total_size) * 100
        print(f"\nTotal uncompressed: {total_size / 1024:.1f} KB")
        print(f"With GZIP: {total_gzip / 1024:.1f} KB ({ratio:.1f}% smaller)")
        print(f"\n✅ Enable Brotli compression in Cloudflare for best results")

if __name__ == '__main__':
    analyze_compression()
