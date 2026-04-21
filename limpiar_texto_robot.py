import os
import re
import shutil

BACKUP = "_backup_limpieza"

FRASES_ROBOT = [
    "curated access",
    "verified links",
    "no repost culture",
    "google ranks pages",
    "search intent",
    "internal linking",
    "seo content written for google",
    "rankings come from",
    "designed for organic search",
    "people search for",
    "structured overview",
    "archive access",
    "tutorial intent",
    "why this page",
    "popular search intents",
    "recommended internal links",
]

def limpiar_html(html):
    for frase in FRASES_ROBOT:
        html = re.sub(
            rf"<p[^>]*>[^<]*{re.escape(frase)}[^<]*</p>",
            "",
            html,
            flags=re.IGNORECASE,
        )

    html = re.sub(
        r"<h[1-6][^>]*>\s*FAQ\s*</h[1-6]>",
        "",
        html,
        flags=re.IGNORECASE,
    )

    html = re.sub(
        r"<section[^>]*>.*?FAQ.*?</section>",
        "",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    return html

def procesar_archivo(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()

    nuevo = limpiar_html(html)

    if nuevo != html:
        backup_path = os.path.join(BACKUP, path)
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        shutil.copy2(path, backup_path)

        with open(path, "w", encoding="utf-8") as f:
            f.write(nuevo)

        return True

    return False

def main():
    os.makedirs(BACKUP, exist_ok=True)
    modificados = 0

    for root, dirs, files in os.walk("."):
        if BACKUP in root:
            continue

        for file in files:
            if not file.lower().endswith(".html"):
                continue

            if file.lower() in ("home.html", "index.html"):
                continue

            path = os.path.join(root, file)

            if procesar_archivo(path):
                modificados += 1
                print("OK", file)

    print("\nDONE")
    print("Archivos modificados:", modificados)

if __name__ == "__main__":
    main()