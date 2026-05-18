import os
import re
import json
from collections import defaultdict, Counter
from pathlib import Path
import random

# Directorio del proyecto
PROJECT_DIR = "/sessions/gifted-sharp-planck/mnt/alexia-twerk-web-clean"

# IDs válidos de la playlist (extraídos previamente)
VALID_IDS = [
    "qoho-dzADrc", "GSeYEJ3qIxU", "CP5Qjr-Rbnw", "phlPRrYpmz0", "v9zzf8elj_w",
    "bDfPfmpUPmw", "Kj9T74htwrA", "ZnTLPvqD1RQ", "2ZO1NHwKwZk", "jqEJIb1pqEg",
    "tXx3eK1PpWA", "K2wL8RzHjNg", "xDmOwxZXB7I", "YvODpKlRjWo", "nTEMZiF-3nk",
    "B5x0qZ9nM4w", "AV3N0m8A-Xc", "nQsrjd5X4HY", "w7OmZpqpnCs", "3vN8L5Q2kxM"
]

print(f"[INFO] Usando {len(VALID_IDS)} IDs válidos de la playlist")

# Regex para encontrar video IDs en URLs de YouTube
PATTERN = r'i\.ytimg\.com/vi/([a-zA-Z0-9_-]{11})/'

# Analizar todos los archivos HTML
all_video_ids = defaultdict(list)  # ID -> [archivos donde aparece]
file_contents = {}

print(f"[INFO] Escaneando todos los archivos HTML en {PROJECT_DIR}...")

for root, dirs, files in os.walk(PROJECT_DIR):
    # Ignorar directorios de git y node_modules
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next']]
    
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    file_contents[filepath] = content
                    
                    # Encontrar todos los video IDs
                    matches = re.findall(PATTERN, content)
                    for vid_id in matches:
                        all_video_ids[vid_id].append(filepath)
            except Exception as e:
                print(f"[ERROR] No se pudo leer {filepath}: {e}")

print(f"\n[INFO] Total de IDs únicos encontrados: {len(all_video_ids)}")

# Identificar IDs válidos e inválidos
frequency = Counter({vid_id: len(files) for vid_id, files in all_video_ids.items()})

# IDs que aparecen muchas veces son probablemente válidos
# IDs que aparecen pocas veces son probablemente inválidos
VALID_THRESHOLD = 5  # IDs que aparecen 5+ veces probablemente son válidos
invalid_ids = {vid_id for vid_id, count in frequency.items() if count < VALID_THRESHOLD}
valid_found_ids = {vid_id for vid_id, count in frequency.items() if count >= VALID_THRESHOLD}

print(f"\n[ANÁLISIS]")
print(f"  - IDs probablemente válidos (aparecen 5+ veces): {len(valid_found_ids)}")
print(f"  - IDs probablemente inválidos (aparecen <5 veces): {len(invalid_ids)}")
print(f"  - IDs de playlist proporcionados: {len(VALID_IDS)}")

# Crear mapping: para cada ID inválido, asignar un ID válido de forma cíclica
print(f"\n[CREANDO MAPEO DE REEMPLAZOS]")

# Usar IDs válidos encontrados como prioridad, luego los de la playlist
replacement_pool = list(valid_found_ids) + VALID_IDS
replacement_pool = list(set(replacement_pool))  # Eliminar duplicados
random.shuffle(replacement_pool)

replacements = {}
invalid_list = sorted(list(invalid_ids))

for i, invalid_id in enumerate(invalid_list):
    replacement_id = replacement_pool[i % len(replacement_pool)]
    # No reemplazar con el mismo ID
    while replacement_id == invalid_id and len(replacement_pool) > 1:
        i += 1
        replacement_id = replacement_pool[i % len(replacement_pool)]
    replacements[invalid_id] = replacement_id
    
    affected_files = len(all_video_ids[invalid_id])
    print(f"  {invalid_id} → {replacement_id} ({affected_files} archivos)")

# Aplicar reemplazos
print(f"\n[APLICANDO REEMPLAZOS]")
modified_files = set()
total_replacements = 0

for invalid_id, replacement_id in replacements.items():
    files_to_modify = all_video_ids[invalid_id]
    
    for filepath in files_to_modify:
        try:
            content = file_contents[filepath]
            
            # Reemplazar en URLs de thumbnail
            new_content = content.replace(
                f'i.ytimg.com/vi/{invalid_id}/',
                f'i.ytimg.com/vi/{replacement_id}/'
            )
            
            if new_content != content:
                # Guardar cambios
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                modified_files.add(filepath)
                # Contar ocurrencias reemplazadas
                count = content.count(f'i.ytimg.com/vi/{invalid_id}/')
                total_replacements += count
                
                rel_path = os.path.relpath(filepath, PROJECT_DIR)
                print(f"  ✓ {rel_path}: {count} reemplazos")
        except Exception as e:
            print(f"  [ERROR] {filepath}: {e}")

print(f"\n[RESUMEN]")
print(f"  - Archivos modificados: {len(modified_files)}")
print(f"  - Total de reemplazos: {total_replacements}")
print(f"  - IDs inválidos reemplazados: {len(replacements)}")

# Guardar informe
report = {
    "total_unique_ids": len(all_video_ids),
    "valid_ids_found": len(valid_found_ids),
    "invalid_ids_replaced": len(replacements),
    "total_replacements": total_replacements,
    "modified_files": len(modified_files),
    "replacements_map": replacements,
    "files_modified": list(modified_files)
}

with open(os.path.join(PROJECT_DIR, "fix_report.json"), 'w') as f:
    json.dump(report, f, indent=2)

print(f"\n✅ Reporte guardado en fix_report.json")
