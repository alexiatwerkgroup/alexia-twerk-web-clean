#!/usr/bin/env python3
"""
Script to restore playlists from backup v6.0
Preserves all changes in other files
"""

import os
import sys
import shutil
import zipfile
import tempfile
from pathlib import Path

def main():
    backup_zip = r"C:\Users\Claudio\AppData\Roaming\Claude\local-agent-mode-sessions\da4bbc4b-095a-4544-a6aa-aab44ac1ed2b\5a901b8b-f30d-481b-b397-e0cffc5cf462\local_b1286b60-c39f-4500-9c7e-09bbfce970c4\uploads\alexia-twerk-web-clean-v6.0-2026-05-14.zip"
    project_path = Path(r"C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean")
    playlist_data_dir = project_path / "_playlist_data"

    print("[*] Restaurando playlists desde backup v6.0...")

    # Create temporary directory for extraction
    with tempfile.TemporaryDirectory(prefix="backup-v6-") as extract_path:
        extract_path = Path(extract_path)

        print("[+] Extrayendo backup...")
        with zipfile.ZipFile(backup_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_path)

        # Find root folder inside ZIP
        contents = list(extract_path.iterdir())
        if len(contents) == 1 and contents[0].is_dir():
            root_folder = contents[0]
        else:
            root_folder = extract_path

        print(f"[OK] Backup extraido en: {root_folder}")

        # Find playlist data directory in backup
        backup_playlist_data_dirs = list(root_folder.rglob("_playlist_data"))

        if backup_playlist_data_dirs:
            backup_playlist_data_dir = backup_playlist_data_dirs[0]
            print("[OK] Encontrado directorio de playlists en backup")

            # Copy all playlist JSON files
            playlist_files = list(backup_playlist_data_dir.glob("playlist-data-*.json"))
            print(f"[*] Restaurando {len(playlist_files)} playlists...")

            # Create destination directory if it doesn't exist
            playlist_data_dir.mkdir(parents=True, exist_ok=True)

            for file_path in playlist_files:
                dest_path = playlist_data_dir / file_path.name
                shutil.copy2(file_path, dest_path)
                print(f"    [OK] {file_path.name}")

            print("\n[SUCCESS] Playlists restauradas exitosamente")

            # Try to restore playlist-data.js from assets
            assets_dirs = list(root_folder.rglob("assets"))
            if assets_dirs:
                backup_assets_dir = assets_dirs[0]
                backup_playlist_js = backup_assets_dir / "playlist-data.js"
                if backup_playlist_js.exists():
                    dest_js = project_path / "assets" / "playlist-data.js"
                    dest_js.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(backup_playlist_js, dest_js)
                    print(f"    [OK] assets/playlist-data.js")
        else:
            print("[ERROR] No se encontro carpeta _playlist_data en el backup")
            return 1

    print("\n[DONE] Restauracion completada")
    print("\n[INFO] Proximos pasos:")
    print("  1. git add _playlist_data/")
    print("  2. git commit -m 'Restore all playlists from v6.0 backup'")
    print("  3. git push")

    return 0

if __name__ == "__main__":
    sys.exit(main())
