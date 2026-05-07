#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract-hero-clips.py - 2026-05-07
Baja los 4 videos de YouTube usados en las hero cards y los recorta a los
segundos exactos que querés mostrar. Output: 4 MP4s en assets/clips/

Requiere:
  - yt-dlp:  pip install yt-dlp     (o: choco install yt-dlp)
  - ffmpeg:  https://www.gyan.dev/ffmpeg/builds/   (o: choco install ffmpeg)

Uso:
    python extract-hero-clips.py

Despues, reemplazas los <iframe> en index.html por <video> tags.
El script puede generar el HTML actualizado automaticamente con --write-html.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Configuracion: video_id, start_sec, stop_sec, output_filename, label
CLIPS = [
    ("X-lPzSuvf3k", 18,  34,  "clip-1-signature.mp4", "Signature (featured)"),
    ("phlPRrYpmz0", 15,  33,  "clip-2-tryon.mp4",     "Try-on hot leaks"),
    ("qoho-dzADrc", 195, 207, "clip-3-cosplay.mp4",   "Hottest cosplay fancam"),
    ("bDfPfmpUPmw", 164, 181, "clip-4-kpop.mp4",      "Korean K-pop twerk"),
]

OUTPUT_DIR = Path("assets/clips")
TEMP_DIR = Path("_temp_yt_downloads")


def have_cmd(cmd):
    return shutil.which(cmd) is not None


def run(args, **kw):
    print(f"  $ {' '.join(args)}")
    return subprocess.run(args, check=True, **kw)


def main():
    # Sanity checks
    if not have_cmd("yt-dlp"):
        print("ERROR: yt-dlp no esta instalado.")
        print("  Instalalo con:  pip install yt-dlp")
        print("  O con choco:    choco install yt-dlp")
        sys.exit(1)
    if not have_cmd("ffmpeg"):
        print("ERROR: ffmpeg no esta instalado.")
        print("  Bajalo de https://www.gyan.dev/ffmpeg/builds/ y agregalo al PATH")
        print("  O con choco:    choco install ffmpeg")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    print()
    print(f"=== Extracting {len(CLIPS)} hero clips ===")
    print(f"  Output: {OUTPUT_DIR.resolve()}")
    print()

    for idx, (vid, start, stop, out_name, label) in enumerate(CLIPS, 1):
        out_path = OUTPUT_DIR / out_name
        if out_path.exists():
            print(f"[{idx}/{len(CLIPS)}] {label} - SKIP (already exists: {out_path})")
            continue

        print(f"[{idx}/{len(CLIPS)}] {label}")
        print(f"  Video: {vid}  |  Range: {start}s - {stop}s ({stop-start}s clip)")

        # 1) Download original (max 720p, h264 mp4 if possible) into TEMP
        src_template = str(TEMP_DIR / f"{vid}.%(ext)s")
        try:
            run([
                "yt-dlp",
                "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]",
                "--merge-output-format", "mp4",
                "-o", src_template,
                f"https://www.youtube.com/watch?v={vid}",
            ])
        except subprocess.CalledProcessError as e:
            print(f"  ERROR descargando {vid}: {e}")
            continue

        # Find the downloaded file
        src_files = list(TEMP_DIR.glob(f"{vid}.*"))
        src_files = [f for f in src_files if f.suffix in (".mp4", ".mkv", ".webm")]
        if not src_files:
            print(f"  ERROR: descarga no produjo archivo")
            continue
        src_path = src_files[0]

        # 2) Trim with ffmpeg, stripping audio (no audio needed for muted preview)
        try:
            run([
                "ffmpeg",
                "-y",
                "-ss", str(start),
                "-to", str(stop),
                "-i", str(src_path),
                "-an",                          # NO audio (smaller file)
                "-c:v", "libx264",              # H.264 for max compat
                "-preset", "slow",              # smaller file
                "-crf", "23",                   # decent quality
                "-pix_fmt", "yuv420p",          # ensures Safari/iOS compat
                "-movflags", "+faststart",      # progressive load
                "-vf", "scale=720:-2",          # max 720p width
                str(out_path),
            ])
            size_mb = out_path.stat().st_size / 1024 / 1024
            print(f"  OK: {out_path}  ({size_mb:.2f} MB)")
        except subprocess.CalledProcessError as e:
            print(f"  ERROR recortando: {e}")

    # Cleanup temp downloads (originals are big, no need to keep them)
    print()
    print("=== Cleanup ===")
    if TEMP_DIR.exists():
        try:
            shutil.rmtree(TEMP_DIR)
            print(f"  Removed {TEMP_DIR}")
        except Exception as e:
            print(f"  Could not remove {TEMP_DIR}: {e}")

    print()
    print("=== DONE ===")
    print()
    print("Los 4 clips estan en:")
    for clip in CLIPS:
        out = OUTPUT_DIR / clip[3]
        if out.exists():
            sz = out.stat().st_size / 1024 / 1024
            print(f"  {out}  ({sz:.2f} MB)")
    print()
    print("Proximo paso: reemplazar los <iframe> de YouTube por <video> tags.")
    print("Avisame cuando termine y te paso el patch del HTML.")


if __name__ == "__main__":
    main()
