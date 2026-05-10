"""
TWERKHUB · BACKUP 3.0
Creates a zip snapshot of the project and copies it to 3 locations:

  1. C:\\Users\\Claudio\\Desktop\\uploads\\         (requested location, local desktop)
  2. C:\\Users\\Claudio\\OneDrive\\Desktop\\backups\\ (cloud-synced via OneDrive)
  3. C:\\Users\\Claudio\\Documents\\twerkhub-backups\\ (third local copy)

The backup includes the full source tree EXCEPT:
  - .git/ (huge, the GitHub repo IS the git history backup)
  - node_modules/ (installable from package.json)
  - playlists-backup/ (separate backup channel)

Filename: twerkhub-3.0-YYYYMMDD-HHMMSS.zip
"""
import os
import shutil
import zipfile
import datetime

ROOT = os.path.abspath(os.path.dirname(__file__))

DESTINATIONS = [
    r"C:\Users\Claudio\Desktop\uploads",
    r"C:\Users\Claudio\OneDrive\Desktop\backups",
    r"C:\Users\Claudio\Documents\twerkhub-backups",
]

EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    "playlists-backup",
}

EXCLUDE_FILE_PATTERNS = (
    ".pyc",
    ".DS_Store",
    "Thumbs.db",
)

stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
zip_name = f"twerkhub-3.0-{stamp}.zip"
tmp_zip = os.path.join(ROOT, zip_name)


def should_skip_path(path):
    parts = path.replace("\\", "/").split("/")
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
    for ext in EXCLUDE_FILE_PATTERNS:
        if path.endswith(ext):
            return True
    return False


def build_zip():
    print(f"[backup] Creating {zip_name} ...")
    n_files = 0
    n_bytes = 0
    with zipfile.ZipFile(tmp_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for dirpath, dirs, files in os.walk(ROOT):
            # Prune directories in-place so we don't recurse into them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in files:
                full = os.path.join(dirpath, name)
                if should_skip_path(full):
                    continue
                # Don't include the zip we're creating
                if os.path.abspath(full) == os.path.abspath(tmp_zip):
                    continue
                arc = os.path.relpath(full, ROOT)
                zf.write(full, arc)
                n_files += 1
                n_bytes += os.path.getsize(full)
    size_mb = os.path.getsize(tmp_zip) / (1024 * 1024)
    print(f"[backup] Done. {n_files} files, raw {n_bytes / 1024 / 1024:.1f} MB → zip {size_mb:.1f} MB")


def copy_to_destinations():
    for dst in DESTINATIONS:
        try:
            os.makedirs(dst, exist_ok=True)
            target = os.path.join(dst, zip_name)
            shutil.copy2(tmp_zip, target)
            print(f"[backup] ✓ Copied to: {target}")
        except Exception as e:
            print(f"[backup] ✗ FAILED to copy to {dst}: {e}")


def main():
    build_zip()
    copy_to_destinations()
    # Remove the temp zip from the project root so it doesn't accidentally end
    # up committed.
    try:
        os.remove(tmp_zip)
        print(f"[backup] Cleaned temp zip from project root.")
    except Exception:
        pass
    print(f"[backup] DONE. Backup 3.0 saved in 3 locations.")


if __name__ == "__main__":
    main()
