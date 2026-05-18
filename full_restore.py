#!/usr/bin/env python3
"""
Complete restoration script for playlists from backup v6.0
Handles ZIP extraction, file copying, and git operations
"""

import os
import sys
import shutil
import zipfile
import subprocess
import tempfile
from pathlib import Path

def run_command(cmd, cwd=None):
    """Execute a command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    # Paths
    backup_zip = Path(r"C:\Users\Claudio\AppData\Roaming\Claude\local-agent-mode-sessions\da4bbc4b-095a-4544-a6aa-aab44ac1ed2b\5a901b8b-f30d-481b-b397-e0cffc5cf462\local_b1286b60-c39f-4500-9c7e-09bbfce970c4\uploads\alexia-twerk-web-clean-v6.0-2026-05-14.zip")
    project_path = Path(r"C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean")
    playlist_data_dir = project_path / "_playlist_data"

    print("\n" + "="*60)
    print("[*] RESTAURACION DE PLAYLISTS DESDE BACKUP V6.0")
    print("="*60)

    # Verify backup exists
    if not backup_zip.exists():
        print(f"[ERROR] Backup ZIP no encontrado: {backup_zip}")
        return 1

    print(f"[+] Backup encontrado: {backup_zip.name}")
    print(f"[+] Tamaño: {backup_zip.stat().st_size / (1024*1024):.2f} MB")

    # Create temporary directory
    with tempfile.TemporaryDirectory(prefix="backup-v6-") as temp_dir:
        temp_path = Path(temp_dir)
        print(f"\n[+] Extrayendo backup a directorio temporal...")

        # Extract ZIP
        try:
            with zipfile.ZipFile(backup_zip, 'r') as zip_ref:
                zip_ref.extractall(temp_path)
            print("[OK] Backup extraído exitosamente")
        except Exception as e:
            print(f"[ERROR] Fallo en extracción: {e}")
            return 1

        # Find root folder
        contents = list(temp_path.iterdir())
        if len(contents) == 1 and contents[0].is_dir():
            root_folder = contents[0]
        else:
            root_folder = temp_path

        print(f"[OK] Raíz encontrada: {root_folder.name}")

        # Find playlist data directory
        print(f"\n[*] Buscando directorio de playlists...")
        backup_playlist_dirs = list(root_folder.rglob("_playlist_data"))

        if not backup_playlist_dirs:
            print("[ERROR] No se encontró carpeta _playlist_data en el backup")
            return 1

        backup_playlist_dir = backup_playlist_dirs[0]
        print(f"[OK] Encontrado: {backup_playlist_dir.relative_to(root_folder)}")

        # Get playlist files
        playlist_files = list(backup_playlist_dir.glob("playlist-data-*.json"))
        print(f"[+] Encontrados {len(playlist_files)} archivos de playlist")

        if not playlist_files:
            print("[WARN] No hay archivos de playlist para restaurar")
            return 1

        # Create destination directory
        print(f"\n[*] Preparando directorio de destino...")
        playlist_data_dir.mkdir(parents=True, exist_ok=True)
        print(f"[OK] Directorio listo: {playlist_data_dir}")

        # Copy playlist files
        print(f"\n[*] Copiando playlists...")
        copied_count = 0
        for src_file in playlist_files:
            dest_file = playlist_data_dir / src_file.name
            try:
                shutil.copy2(src_file, dest_file)
                print(f"    [OK] {src_file.name}")
                copied_count += 1
            except Exception as e:
                print(f"    [ERROR] {src_file.name}: {e}")

        print(f"\n[SUCCESS] {copied_count} playlists restauradas")

        # Try to restore playlist-data.js
        print(f"\n[*] Buscando assets/playlist-data.js...")
        assets_dirs = list(root_folder.rglob("assets"))
        if assets_dirs:
            backup_js = assets_dirs[0] / "playlist-data.js"
            if backup_js.exists():
                dest_js = project_path / "assets" / "playlist-data.js"
                dest_js.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.copy2(backup_js, dest_js)
                    print(f"[OK] assets/playlist-data.js restaurado")
                except Exception as e:
                    print(f"[ERROR] No se pudo copiar assets/playlist-data.js: {e}")
            else:
                print("[WARN] playlist-data.js no encontrado en backup")
        else:
            print("[WARN] Carpeta assets no encontrada en backup")

    # Git operations
    print(f"\n" + "="*60)
    print("[*] OPERACIONES GIT")
    print("="*60)

    os.chdir(project_path)

    # Add files
    print(f"\n[+] git add _playlist_data/")
    success, out, err = run_command("git add _playlist_data/", project_path)
    if success:
        print("[OK] Archivos staged")
    else:
        print(f"[WARN] git add: {err}")

    # Commit
    print(f"\n[+] git commit...")
    success, out, err = run_command(
        "git commit -m \"Restore all playlists from v6.0 backup\"",
        project_path
    )
    if success:
        print("[OK] Cambios committed")
        print(out)
    else:
        if "nothing to commit" in err.lower():
            print("[INFO] Sin cambios para hacer commit")
        else:
            print(f"[WARN] git commit: {err}")

    # Push
    print(f"\n[+] git push...")
    success, out, err = run_command("git push", project_path)
    if success:
        print("[OK] Cambios pusheados")
        print(out)
    else:
        print(f"[WARN] git push: {err}")
        print("[INFO] Puede que necesite credenciales")

    print(f"\n" + "="*60)
    print("[DONE] RESTAURACION COMPLETADA")
    print("="*60)
    print("\n[INFO] Próximas acciones sugeridas:")
    print("  1. Verificar los playlists en el navegador")
    print("  2. Hacer refresh de la página (Ctrl+Shift+R)")
    print("  3. Verificar en https://www.alexiatwerkgroup.com")

    return 0

if __name__ == "__main__":
    sys.exit(main())
