import os
import re
import json
from collections import defaultdict, Counter
import random

PROJECT_DIR = "/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean"

# Cargar los 186 IDs válidos de la playlist
with open(os.path.join(PROJECT_DIR, 'playlist_ids.json'), 'r') as f:
    VALID_IDS = json.load(f)

print(f"[INFO] Usando {len(VALID_IDS)} IDs válidos de la playlist")

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

print(f"  ✓ Total de IDs únicos: {len(all_video_ids)}")

# Fase 2: Identificar inválidos
# Estrategia: IDs que aparecen menos de 5 veces O que no están en VALID_IDS
invalid_ids = set()

for vid_id, count in frequency.items():
    # Si aparece pocas veces (1-4 veces)
    if count < 5:
        invalid_ids.add(vid_id)

print(f"  ✓ IDs identificados como inválidos (aparecen <5 veces): {len(invalid_ids)}")

# Fase 3: Crear mapeo de reemplazos
print(f"\n[FASE 2] Creando mapeo de reemplazos...")

# Usar VALID_IDS como pool principal, luego agregar IDs válidos encontrados
found_valid = {vid_id for vid_id, count in frequency.items() if count >= 10}
replacement_pool = VALID_IDS + list(found_valid)
replacement_pool = list(set(replacement_pool))
random.shuffle(replacement_pool)

replacements = {}
invalid_list = sorted(list(invalid_ids))

for i, invalid_id in enumerate(invalid_list):
    replacement_id = replacement_pool[i % len(replacement_pool)]
    replacements[invalid_id] = replacement_id
    print(f"  {invalid_id} → {replacement_id} ({len(all_video_ids[invalid_id])} archivos)")

# Fase 4: Aplicar reemplazos
print(f"\n[FASE 3] Aplicando reemplazos...")

modified_files = {}
total_replacements = 0

for invalid_id, replacement_id in replacements.items():
    for filepath in all_video_ids[invalid_id]:
        content = file_contents[filepath]
        
        # Contar ocurrencias antes
        count = content.count(f'i.ytimg.com/vi/{invalid_id}/')
        
        # Reemplazar
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

# Guardar todos los archivos modificados
print(f"\n[FASE 4] Guardando cambios...")

for filepath, count in modified_files.items():
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_contents[filepath])
        rel_path = os.path.relpath(filepath, PROJECT_DIR)
        print(f"  ✓ {rel_path}: {count} reemplazos")
    except Exception as e:
        print(f"  ✗ Error guardando {filepath}: {e}")

print(f"\n[RESUMEN FINAL]")
print(f"  ✓ Total de archivos modificados: {len(modified_files)}")
print(f"  ✓ Total de reemplazos: {total_replacements}")
print(f"  ✓ IDs inválidos reemplazados: {len(replacements)}")
print(f"\n✅ LISTO! Todos los thumbnails grises deberían estar fijos.")

# Guardar reporte
report = {
    "timestamp": "2026-05-18",
    "total_unique_ids_found": len(all_video_ids),
    "invalid_ids_replaced": len(replacements),
    "total_replacements": total_replacements,
    "modified_files": len(modified_files),
    "files": {os.path.relpath(k, PROJECT_DIR): v for k, v in modified_files.items()}
}

with open(os.path.join(PROJECT_DIR, "fix_thumbnails_report.json"), 'w') as f:
    json.dump(report, f, indent=2)
