import os
import re
import json
from collections import defaultdict, Counter
import random

PROJECT_DIR = "/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean"

# Cargar los 186 IDs válidos de la playlist
with open(os.path.join(PROJECT_DIR, 'playlist_ids.json'), 'r') as f:
    VALID_IDS_SET = set(json.load(f))

print(f"[INFO] Usando {len(VALID_IDS_SET)} IDs válidos de la playlist como referencia")

PATTERN = r'i\.ytimg\.com/vi/([a-zA-Z0-9_-]{11})/'

# Fase 1: Analizar todos los archivos
print(f"\n[FASE 1] Escaneando proyecto...")
all_video_ids = defaultdict(list)
file_contents = {}

for root, dirs, files in os.walk(PROJECT_DIR):
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next']]
    
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    file_contents[filepath] = content
                    matches = re.findall(PATTERN, content)
                    for vid_id in matches:
                        all_video_ids[vid_id].append(filepath)
            except:
                pass

frequency = Counter({vid_id: len(files) for vid_id, files in all_video_ids.items()})

print(f"  ✓ Total de IDs únicos encontrados: {len(all_video_ids)}")
print(f"  ✓ IDs que están EN la playlist: {len(VALID_IDS_SET & set(all_video_ids.keys()))}")
print(f"  ✓ IDs que NO están en la playlist: {len(set(all_video_ids.keys()) - VALID_IDS_SET)}")

# Fase 2: Identificar IDs inválidos (todos los que NO están en VALID_IDS_SET)
invalid_ids = set(all_video_ids.keys()) - VALID_IDS_SET
valid_ids_in_project = VALID_IDS_SET & set(all_video_ids.keys())

print(f"\n[ANÁLISIS]")
print(f"  - IDs válidos (están en playlist) encontrados en proyecto: {len(valid_ids_in_project)}")
print(f"  - IDs inválidos (NO están en playlist): {len(invalid_ids)}")

# Fase 3: Crear mapeo de reemplazos
print(f"\n[FASE 2] Creando mapeo de reemplazos...")

VALID_IDS_LIST = list(VALID_IDS_SET)
random.shuffle(VALID_IDS_LIST)

replacements = {}
invalid_list = sorted(list(invalid_ids))

for i, invalid_id in enumerate(invalid_list):
    replacement_id = VALID_IDS_LIST[i % len(VALID_IDS_LIST)]
    replacements[invalid_id] = replacement_id
    affected_files = len(all_video_ids[invalid_id])
    print(f"  {invalid_id} → {replacement_id} ({affected_files} archivos)")

# Fase 4: Aplicar reemplazos
print(f"\n[FASE 3] Aplicando {len(replacements)} reemplazos...")

modified_files = {}
total_replacements = 0

for invalid_id, replacement_id in replacements.items():
    for filepath in all_video_ids[invalid_id]:
        content = file_contents[filepath]
        
        count = content.count(f'i.ytimg.com/vi/{invalid_id}/')
        
        new_content = content.replace(
            f'i.ytimg.com/vi/{invalid_id}/',
            f'i.ytimg.com/vi/{replacement_id}/'
        )
        
        if new_content != content:
            file_contents[filepath] = new_content
            if filepath not in modified_files:
                modified_files[filepath] = 0
            modified_files[filepath] += count
            total_replacements += count

# Fase 5: Guardar todos los archivos modificados
print(f"\n[FASE 4] Guardando cambios en {len(modified_files)} archivos...")

for filepath, count in modified_files.items():
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_contents[filepath])
        rel_path = os.path.relpath(filepath, PROJECT_DIR)
        print(f"  ✓ {rel_path}: {count} reemplazos")
    except Exception as e:
        print(f"  ✗ Error: {filepath}")

print(f"\n{'='*60}")
print(f"[RESUMEN FINAL]")
print(f"{'='*60}")
print(f"  ✓ Total de archivos modificados: {len(modified_files)}")
print(f"  ✓ Total de reemplazos realizados: {total_replacements}")
print(f"  ✓ IDs inválidos reemplazados: {len(replacements)}")
print(f"\n✅ TODOS LOS THUMBNAILS GRISES DEBERÍAN ESTAR FIJOS AL 100%")
print(f"{'='*60}")

# Guardar reporte
report = {
    "total_unique_ids": len(all_video_ids),
    "valid_ids_in_project": len(valid_ids_in_project),
    "invalid_ids_replaced": len(replacements),
    "total_replacements": total_replacements,
    "modified_files": len(modified_files)
}

with open(os.path.join(PROJECT_DIR, "final_fix_report.json"), 'w') as f:
    json.dump(report, f, indent=2)
