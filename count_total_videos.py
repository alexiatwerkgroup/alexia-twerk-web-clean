import os
import re
from collections import defaultdict

PROJECT_DIR = "/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean"

# Regex para encontrar video IDs en URLs de YouTube
PATTERN = r'i\.ytimg\.com/vi/([a-zA-Z0-9_-]{11})/'

print("[INFO] Contando videos en la plataforma...\n")

all_video_ids = defaultdict(int)
total_video_elements = 0
files_with_videos = 0

for root, dirs, files in os.walk(PROJECT_DIR):
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next']]
    
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = re.findall(PATTERN, content)
                    
                    if matches:
                        files_with_videos += 1
                        total_video_elements += len(matches)
                        
                        for vid_id in matches:
                            all_video_ids[vid_id] += 1
            except:
                pass

print(f"[ESTADÍSTICAS FINALES]")
print(f"{'='*60}")
print(f"  • Total de archivos HTML con videos: {files_with_videos}")
print(f"  • Total de elementos de video encontrados: {total_video_elements}")
print(f"  • IDs únicos (videos diferentes): {len(all_video_ids)}")
print(f"{'='*60}")

print(f"\n[TOP 20 VIDEOS MÁS USADOS]")
top_20 = sorted(all_video_ids.items(), key=lambda x: x[1], reverse=True)[:20]
for i, (vid_id, count) in enumerate(top_20, 1):
    print(f"  {i:2d}. {vid_id}: aparece {count:4d} veces")

# Análisis de distribución
print(f"\n[ANÁLISIS DE DISTRIBUCIÓN]")
counts_freq = defaultdict(int)
for count in all_video_ids.values():
    if count >= 100:
        counts_freq["100+"] += 1
    elif count >= 50:
        counts_freq["50-99"] += 1
    elif count >= 20:
        counts_freq["20-49"] += 1
    elif count >= 10:
        counts_freq["10-19"] += 1
    elif count >= 5:
        counts_freq["5-9"] += 1
    else:
        counts_freq["1-4"] += 1

for range_label in ["100+", "50-99", "20-49", "10-19", "5-9", "1-4"]:
    print(f"  • Videos que aparecen {range_label} veces: {counts_freq[range_label]}")

print(f"\n[RESUMEN]")
print(f"{'='*60}")
print(f"Tu plataforma tiene:")
print(f"  • {len(all_video_ids)} videos DIFERENTES")
print(f"  • {total_video_elements} INSTANCIAS de videos (mismo video puede aparecer múltiples veces)")
print(f"  • En {files_with_videos} páginas HTML")
print(f"{'='*60}")
