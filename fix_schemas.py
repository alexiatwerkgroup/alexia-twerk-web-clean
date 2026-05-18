#!/usr/bin/env python3
"""
fix_schemas.py
==============
Arregla los problemas de structured data reportados por Google Search Console
en alexiatwerkgroup.com.

Que hace:
  1) FAQPage duplicado (issue critico) -> deja solo el primero por archivo
     (solo se aplica a archivos listados en DEDUPE_FAQ_FILES; el resto se respeta).
  2) uploadDate sin timezone / invalido -> normaliza a ISO 8601 UTC
     ('YYYY-MM-DD'           -> 'YYYY-MM-DDT12:00:00Z'
      'YYYY-MM-DDTHH:MM:SS'  -> 'YYYY-MM-DDTHH:MM:SSZ'
      'YYYY-MM-DD HH:MM:SS'  -> 'YYYY-MM-DDTHH:MM:SSZ').
  3) Offer sin hasMerchantReturnPolicy / shippingDetails -> agrega ambos campos
     (config para servicio digital: $0 worldwide, no devoluciones).

Como funciona:
  Parsea cada bloque <script type="application/ld+json"> con json.loads,
  modifica el objeto y lo serializa de vuelta. Mucho mas seguro que regex
  sobre el cuerpo JSON.

Uso:
  python fix_schemas.py            # corre sobre la carpeta del script
  python fix_schemas.py --dry-run  # muestra que cambiaria sin escribir
  python fix_schemas.py /otra/ruta # corre sobre otra raiz
"""
import argparse
import json
import re
import sys
from pathlib import Path

# ---- Archivos en los que se aplica dedupe de FAQPage. Anadir aqui si Google
# reporta nuevos duplicados en el futuro. ---------------------------------
DEDUPE_FAQ_FILES = {"index.html", "twerk-dance-tutorial.html"}

# ---- Bloques que se inyectan en cada Offer (servicio digital, sin envio) ---
SHIPPING_DETAILS = {
    "@type": "OfferShippingDetails",
    "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": "USD",
    },
    "shippingDestination": {
        "@type": "DefinedRegion",
        "geoMidpoint": {
            "@type": "GeoCoordinates",
            "latitude": "0",
            "longitude": "0",
        },
    },
    "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 0,
            "unitCode": "DAY",
        },
        "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 0,
            "unitCode": "DAY",
        },
    },
}

RETURN_POLICY = {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": ["US", "CA", "MX", "ES", "AR", "BR", "GB", "DE", "FR"],
    "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
}

SCRIPT_RE = re.compile(
    r'(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)',
    re.DOTALL | re.IGNORECASE,
)


def normalize_upload_date(value):
    """Convierte uploadDate a ISO 8601 UTC. Pasa otras estructuras tal cual."""
    if not isinstance(value, str):
        return value
    v = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        return f"{v}T12:00:00Z"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", v):
        return v + "Z"
    m = re.fullmatch(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})", v)
    if m:
        return f"{m.group(1)}T{m.group(2)}Z"
    return value


def patch_node(obj):
    """Recorre el JSON-LD: normaliza uploadDate y completa Offers.
    Devuelve True si modifico algo."""
    changed = False
    if isinstance(obj, dict):
        if "uploadDate" in obj:
            new_val = normalize_upload_date(obj["uploadDate"])
            if new_val != obj["uploadDate"]:
                obj["uploadDate"] = new_val
                changed = True
        if obj.get("@type") == "Offer":
            if "hasMerchantReturnPolicy" not in obj:
                obj["hasMerchantReturnPolicy"] = json.loads(json.dumps(RETURN_POLICY))
                changed = True
            if "shippingDetails" not in obj:
                obj["shippingDetails"] = json.loads(json.dumps(SHIPPING_DETAILS))
                changed = True
        for v in obj.values():
            if patch_node(v):
                changed = True
    elif isinstance(obj, list):
        for v in obj:
            if patch_node(v):
                changed = True
    return changed


def process_file(path, drop_dup_faq, stats, dry_run=False):
    text = path.read_text(encoding="utf-8")
    original = text
    matches = list(SCRIPT_RE.finditer(text))
    if not matches:
        return False

    parsed_blocks = []
    for m in matches:
        body = m.group(2).strip()
        try:
            parsed_blocks.append(json.loads(body))
        except Exception:
            parsed_blocks.append(None)

    drop_indices = set()
    if drop_dup_faq:
        first_seen = False
        for i, data in enumerate(parsed_blocks):
            if data is None:
                continue
            if data.get("@type") == "FAQPage":
                if first_seen:
                    drop_indices.add(i)
                    stats["faq_dropped"] += 1
                else:
                    first_seen = True

    out = []
    last = 0
    for i, m in enumerate(matches):
        out.append(text[last:m.start()])
        if i in drop_indices:
            after = m.end()
            if after < len(text) and text[after] == "\n":
                last = after + 1
            else:
                last = after
            continue
        data = parsed_blocks[i]
        if data is None:
            out.append(text[m.start():m.end()])
        else:
            if patch_node(data):
                stats["blocks_patched"] += 1
                new_body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
                out.append(m.group(1) + new_body + m.group(3))
            else:
                out.append(text[m.start():m.end()])
        last = m.end()
    out.append(text[last:])

    new_text = "".join(out)
    if new_text != original:
        if not dry_run:
            path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("root", nargs="?", default=None,
                        help="Raiz del sitio (por defecto: carpeta donde vive este script).")
    parser.add_argument("--dry-run", action="store_true",
                        help="No escribe cambios; solo reporta cuantos haria.")
    args = parser.parse_args()

    root = Path(args.root) if args.root else Path(__file__).resolve().parent
    if not root.exists():
        print(f"NO EXISTE: {root}", file=sys.stderr)
        sys.exit(1)

    html_files = sorted(root.rglob("*.html"))
    html_files = [
        p for p in html_files
        if ".git" not in p.parts and "node_modules" not in p.parts
    ]

    stats = {
        "files_changed": 0,
        "blocks_patched": 0,
        "faq_dropped": 0,
        "files_total": len(html_files),
        "dry_run": args.dry_run,
    }

    for p in html_files:
        try:
            if process_file(p, drop_dup_faq=p.name in DEDUPE_FAQ_FILES,
                            stats=stats, dry_run=args.dry_run):
                stats["files_changed"] += 1
        except Exception as e:
            print(f"ERROR en {p}: {e}", file=sys.stderr)

    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
