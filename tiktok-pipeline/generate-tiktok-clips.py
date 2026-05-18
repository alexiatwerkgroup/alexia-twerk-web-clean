#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate-tiktok-clips.py - 2026-05-07
Genera clips verticales 9:16 listos para subir a TikTok desde YouTube IDs.

Por cada entrada en clips-manifest.csv:
  1. Descarga SOLO el segmento (start_seconds, duration_seconds) via yt-dlp
  2. Convierte a 9:16 (1080x1920) con fondo blur del mismo video
  3. Quema watermark "alexiatwerkgroup.com" subtle bottom-right
  4. Normaliza audio
  5. Genera output/clip-001.mp4 + metadata.txt con caption listo para pegar

Requisitos: yt-dlp + ffmpeg en PATH.

Uso:
    cd tiktok-pipeline
    python generate-tiktok-clips.py
"""
import csv
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
MANIFEST = HERE / 'clips-manifest.csv'
OUT_DIR = HERE / 'output'
RAW_DIR = HERE / 'raw'
WATERMARK_TEXT = "alexiatwerkgroup.com"


def check_tools():
    missing = []
    for tool in ['yt-dlp', 'ffmpeg']:
        if shutil.which(tool) is None:
            missing.append(tool)
    if missing:
        print(f"ERROR: faltan: {', '.join(missing)}")
        print("  Instalar:")
        print("    pip install yt-dlp --break-system-packages")
        print("    choco install ffmpeg -y")
        sys.exit(1)


def download_clip(yt_id, start, duration, raw_path):
    """Descarga solo el segmento usando --download-sections (rapido)."""
    end = start + duration
    cmd = [
        'yt-dlp',
        '-f', 'bv*[height<=1080]+ba/b[height<=1080]',
        '--download-sections', f'*{start}-{end}',
        '--force-keyframes-at-cuts',
        '-o', str(raw_path),
        f'https://www.youtube.com/watch?v={yt_id}',
    ]
    print(f"  Descargando segmento {start}s-{end}s de {yt_id}...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  yt-dlp falló: {r.stderr[:300]}")
        return False
    return raw_path.exists()


def to_vertical_with_watermark(raw_path, out_path):
    """
    Convierte horizontal/cuadrado a 1080x1920 con:
      - Fondo: el mismo video escalado a 1080x1920 con blur (cubre marco)
      - Foreground: video original centrado, escalado para que entre en 1080w
      - Watermark texto bottom-right
    Audio normalizado a -16 LUFS (TikTok preferred).
    """
    vf = (
        # Background: escalar el input a cubrir 1080x1920, recortar y blur
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,boxblur=20:1[bg];"
        # Foreground: escalar el original cabiendo en 1080w (ratio mantenido)
        "[0:v]scale=1080:-2[fg];"
        # Componer fg sobre bg, centrado vertical
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[v];"
        # Watermark bottom-right, sutil
        f"[v]drawtext=text='{WATERMARK_TEXT}':"
        "fontcolor=white@0.85:fontsize=34:"
        "borderw=2:bordercolor=black@0.6:"
        "x=w-tw-32:y=h-th-90"
    )
    cmd = [
        'ffmpeg', '-y',
        '-i', str(raw_path),
        '-filter_complex', vf,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-movflags', '+faststart',
        str(out_path),
    ]
    print(f"  Convirtiendo a 9:16 con watermark...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ffmpeg falló: {r.stderr[-400:]}")
        return False
    return out_path.exists()


def main():
    print("=" * 72)
    print("  TWERKHUB · TikTok Clip Generator")
    print("=" * 72)

    check_tools()

    if not MANIFEST.exists():
        print(f"ERROR: falta {MANIFEST}")
        sys.exit(1)

    OUT_DIR.mkdir(exist_ok=True)
    RAW_DIR.mkdir(exist_ok=True)

    metadata_lines = []
    metadata_lines.append("# TWERKHUB TikTok clips · ready to post\n")
    metadata_lines.append("# Pegá el caption + hashtags al subir cada clip\n\n")

    with open(MANIFEST, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    print(f"\n  Total clips a generar: {len(rows)}\n")

    success = 0
    fail = 0
    for i, row in enumerate(rows, 1):
        yt_id = row['youtube_id'].strip()
        start = int(row['start_seconds'])
        duration = int(row['duration_seconds'])
        title = row['title'].strip()
        caption = row['caption'].strip()
        hashtags = row['hashtags'].strip()

        print(f"\n[{i:02d}/{len(rows)}] {yt_id} ({title})")

        raw_path = RAW_DIR / f"raw-{i:03d}-{yt_id}.mp4"
        out_path = OUT_DIR / f"clip-{i:03d}-{yt_id}.mp4"

        if out_path.exists():
            print(f"  Ya existe {out_path.name} - skip")
            success += 1
            metadata_lines.append(f"--- clip-{i:03d}-{yt_id}.mp4 ---\n")
            metadata_lines.append(f"{caption}\n\n{hashtags}\n\n")
            continue

        if not raw_path.exists():
            ok = download_clip(yt_id, start, duration, raw_path)
            if not ok:
                fail += 1
                continue
        else:
            print(f"  raw ya existe, saltando download")

        ok = to_vertical_with_watermark(raw_path, out_path)
        if not ok:
            fail += 1
            continue

        success += 1
        metadata_lines.append(f"--- clip-{i:03d}-{yt_id}.mp4 ---\n")
        metadata_lines.append(f"{caption}\n\n{hashtags}\n\n")
        print(f"  OK -> {out_path.name}")

    # Save metadata
    meta_path = OUT_DIR / 'captions-and-hashtags.txt'
    meta_path.write_text(''.join(metadata_lines), encoding='utf-8')

    print(f"\n{'=' * 72}")
    print(f"  Resumen: {success} OK · {fail} fallaron")
    print(f"  Clips listos en: {OUT_DIR}")
    print(f"  Captions/hashtags en: {meta_path}")
    print(f"{'=' * 72}")
    print("\n  PROXIMO PASO:")
    print("  1. Abrí TikTok app en el celu")
    print("  2. Subí 3 clips por dia, durante 10-14 dias")
    print("  3. Mejor horario AR/LATAM: 12pm, 7pm, 10pm")
    print("  4. Caption + hashtags ya estan en captions-and-hashtags.txt")


if __name__ == '__main__':
    main()
