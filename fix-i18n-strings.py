#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix-i18n-strings.py - 2026-05-08
Reemplaza UI strings hardcoded en INGLES dentro de las paginas localizadas
en /ja/ y /ko/ por sus traducciones correctas. Google penaliza paginas con
hreflang=ja pero contenido en ingles -> "soft 404" o "duplicate without
canonical". Esto desbloquea indexacion de las hub pages.

Scope: solo los 4 playlist-hub archivos detectados con problema.
DRY-RUN por defecto. --apply para escribir.
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent
DRY_RUN = '--apply' not in sys.argv

# ─── Traducciones por idioma ────────────────────────────────────────────
# Ordenadas de string mas larga a mas corta (Python dict preserva orden)
# para que los matches mas especificos se hagan primero.

JA = {
    # Player
    '▶ Now playing': '▶ 再生中',
    'title="Twerk Hub · now playing"': 'title="Twerk Hub · 再生中"',
    'Free preview #001': '無料プレビュー #001',

    # Hot rank
    'Hot ranking this week': '今週のホットランキング',

    # Grid head
    '/ The full playlist': '/ 全プレイリスト',
    'Tap a cover to play.': 'サムネイルをタップして再生。',

    # Templated H2 ("All <em>N</em> ... cuts.")
    'cosplay fancam cuts.': 'コスプレファンカム動画。',
    'k-pop twerk cuts.': 'K-popトワーク動画。',
    'twerk cuts.': 'トワーク動画。',

    # H2 prefix "All <em>"
    '<h2>All <em>': '<h2>全<em>',

    # Aria-label of playlist
    'Hot ranking': 'ホットランキング',
    'Full archive': '完全アーカイブ',
}

KO = {
    # Player
    '▶ Now playing': '▶ 재생 중',
    'title="Twerk Hub · now playing"': 'title="Twerk Hub · 재생 중"',
    'Free preview #001': '무료 미리보기 #001',

    # Hot rank
    'Hot ranking this week': '이번 주 핫 랭킹',

    # Grid head
    '/ The full playlist': '/ 전체 플레이리스트',
    'Tap a cover to play.': '썸네일을 탭하여 재생.',

    # Templated H2
    'cosplay fancam cuts.': '코스프레 팬캠 영상.',
    'k-pop twerk cuts.': 'K-pop 트워크 영상.',
    'twerk cuts.': '트워크 영상.',

    '<h2>All <em>': '<h2>전체 <em>',

    'Hot ranking': '핫 랭킹',
    'Full archive': '전체 아카이브',
}

# Files a procesar (locale, path relativo)
FILES = [
    ('ja', 'ja/hottest-cosplay-fancam/index.html'),
    ('ja', 'ja/korean-girls-kpop-twerk/index.html'),
    ('ko', 'ko/hottest-cosplay-fancam/index.html'),
    ('ko', 'ko/korean-girls-kpop-twerk/index.html'),
]


def main():
    print("=" * 72)
    print("  FIX I18N STRINGS (ja + ko)  " + ("(DRY RUN)" if DRY_RUN else "(APPLYING)"))
    print("=" * 72)

    translations = {'ja': JA, 'ko': KO}

    total_changes = 0
    for locale, rel in FILES:
        fp = REPO / rel
        if not fp.exists():
            print(f"\n  [SKIP] {rel} no existe")
            continue

        try:
            content = fp.read_text(encoding='utf-8')
        except Exception as e:
            print(f"\n  [ERR] {rel}: {e}")
            continue

        new_content = content
        local_replacements = 0
        local_breakdown = []
        for src, dst in translations[locale].items():
            count = new_content.count(src)
            if count > 0:
                new_content = new_content.replace(src, dst)
                local_replacements += count
                local_breakdown.append(f"      {src!r} → {dst!r} (x{count})")

        print(f"\n  [{locale}] {rel}")
        print(f"    Replacements: {local_replacements}")
        for line in local_breakdown:
            print(line)

        total_changes += local_replacements
        if local_replacements > 0 and not DRY_RUN:
            fp.write_text(new_content, encoding='utf-8', newline='\n')

    print(f"\n{'=' * 72}")
    print(f"  Total reemplazos: {total_changes}")
    print(f"{'=' * 72}")

    if DRY_RUN:
        print("\n  Para aplicar:  python fix-i18n-strings.py --apply")
    else:
        print("\n  DONE. Recordá:")
        print("    git add -A")
        print("    git commit -m \"fix(i18n): translate hardcoded English UI strings in /ja/ + /ko/ playlist hubs\"")
        print("    git push")


if __name__ == '__main__':
    main()
