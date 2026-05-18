#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backup-v4.py - 2026-05-06
Crea un ZIP del proyecto con tag "v4.0" y lo replica en 3 ubicaciones distintas
para tener redundancia antes de hacer cambios grandes.

Ubicaciones de backup:
  1. C:\\Users\\Claudio\\OneDrive\\Desktop\\uploads\\
     (OneDrive synced, acceso rapido desde escritorio)
  2. C:\\Users\\Claudio\\OneDrive\\Documentos\\Backups\\TWERKHUB\\
     (OneDrive synced, organizado por proyecto)
  3. C:\\Users\\Claudio\\Documents\\Backups\\TWERKHUB\\
     (LOCAL only - NO OneDrive - sobrevive si OneDrive borra/corrompe algo)

Excluye: .git, node_modules, __pycache__, .DS_Store, *.pyc, *.log

Uso (corre desde la raiz del repo):
    python backup-v4.py
"""

import datetime
import hashlib
import os
import shutil
import sys
import zipfile
from pathlib import Path

VERSION_TAG = "v4.0"
PROJECT_NAME = "alexia-twerk-web-clean"
SOURCE = Path(r"C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean")

# 3 ubicaciones de backup
BACKUP_DIRS = [
    Path(r"C:\Users\Claudio\OneDrive\Desktop\uploads"),
    Path(r"C:\Users\Claudio\OneDrive\Documentos\Backups\TWERKHUB"),
    Path(r"C:\Users\Claudio\Documents\Backups\TWERKHUB"),
]

# Patrones a excluir del ZIP
EXCLUDE_DIRS = {".git", "node_modules", "__pycache__", ".vscode", ".idea", ".pytest_cache"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
EXCLUDE_EXT = {".pyc", ".pyo", ".log", ".swp"}


def should_skip(path: Path) -> bool:
    """Skip excluded directories, files, and extensions."""
    parts = set(path.parts)
    if parts & EXCLUDE_DIRS:
        return True
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix.lower() in EXCLUDE_EXT:
        return True
    return False


def make_zip(source: Path, dest_zip: Path) -> tuple[int, int]:
    """ZIP source dir into dest_zip. Returns (file_count, total_bytes)."""
    dest_zip.parent.mkdir(parents=True, exist_ok=True)
    file_count = 0
    total_bytes = 0
    with zipfile.ZipFile(dest_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(source):
            # Filtrar dirs in-place para no entrar en .git, node_modules, etc.
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for fname in files:
                fp = Path(root) / fname
                if should_skip(fp):
                    continue
                arcname = fp.relative_to(source.parent)
                try:
                    zf.write(fp, arcname)
                    file_count += 1
                    total_bytes += fp.stat().st_size
                except (OSError, PermissionError) as e:
                    print(f"  WARN: skip {fp.name}: {e}")
    return file_count, total_bytes


def md5_of(path: Path) -> str:
    """Compute MD5 hash of file (chunked for big files)."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main():
    if not SOURCE.is_dir():
        print(f"ERROR: source no existe: {SOURCE}")
        sys.exit(1)

    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    zip_name = f"{PROJECT_NAME}-{VERSION_TAG}-{timestamp}.zip"

    print()
    print("=" * 70)
    print(f"  BACKUP {VERSION_TAG} - {PROJECT_NAME}")
    print(f"  Source: {SOURCE}")
    print(f"  ZIP name: {zip_name}")
    print("=" * 70)

    # 1) Crear ZIP en la primera ubicacion (sera el "master")
    master_zip = BACKUP_DIRS[0] / zip_name
    print(f"\n[1/{len(BACKUP_DIRS)}] Creando master ZIP...")
    print(f"   Destino: {master_zip}")
    file_count, total_bytes = make_zip(SOURCE, master_zip)
    zip_size = master_zip.stat().st_size
    master_md5 = md5_of(master_zip)
    print(f"   OK: {file_count} archivos, source={fmt_bytes(total_bytes)}, "
          f"zip={fmt_bytes(zip_size)} (MD5 {master_md5[:12]}...)")

    # 2) Copiar el master a las otras 2 ubicaciones
    for idx, target_dir in enumerate(BACKUP_DIRS[1:], start=2):
        target_zip = target_dir / zip_name
        print(f"\n[{idx}/{len(BACKUP_DIRS)}] Copiando a {target_dir}...")
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(master_zip, target_zip)
            target_md5 = md5_of(target_zip)
            ok = target_md5 == master_md5
            print(f"   {'OK' if ok else 'WARN'}: {fmt_bytes(target_zip.stat().st_size)} "
                  f"(MD5 {target_md5[:12]}{'... matches' if ok else '... MISMATCH!'})")
        except Exception as e:
            print(f"   ERROR: {e}")

    # 3) Resumen final
    print()
    print("=" * 70)
    print("  BACKUP COMPLETO. Resumen:")
    print("=" * 70)
    for d in BACKUP_DIRS:
        zp = d / zip_name
        if zp.exists():
            print(f"  OK  {zp}")
        else:
            print(f"  XX  {zp} (NO existe)")
    print()
    print(f"  Filename: {zip_name}")
    print(f"  Size:     {fmt_bytes(master_zip.stat().st_size)}")
    print(f"  MD5:      {master_md5}")
    print(f"  Files:    {file_count}")
    print()
    print("  Para restaurar mas adelante, descomprimi el ZIP en cualquier carpeta")
    print("  y vas a tener el proyecto exactamente como esta ahora.")
    print()


if __name__ == "__main__":
    main()
