#!/usr/bin/env python3
"""gen_video_pages.py — paginas-por-video LIVIANAS y UNICAS para SEO.
Reusa el template satelite liviano (escudo/paywall via <script src> compartido,
Reglas Sagradas R1/R3/R4/R8) e inyecta COPY UNICO por video.
Uso: python3 gen_video_pages.py datos.tsv   (tsv: id<TAB>titulo_real)
Escribe en /models-cheerleaders/<slug>.html. No pushea.
"""
import re, sys, hashlib, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEMPLATE = ROOT / "playlist" / "1-dance-twerk-choreography-pqp0uxe.html"
OUTDIR = ROOT / "models-cheerleaders"

T = TEMPLATE.read_text(encoding="utf-8").replace('+00:00""', '+00:00","')
OLD_ID = "Cay6PQp0UXE"
OLD_SLUG = "1-dance-twerk-choreography-pqp0uxe"
OLD_CREATOR = "Артём Винокуров"
OLD_TITLE = "1 DANCE"
OLD_SEO = ('<p><strong>Playlist Overview:</strong> This curated collection brings together the hottest twerk, dance choreography, and fancam content from talented creators worldwide. Explore premium 4K videos, weekly drops, and exclusive cuts from the Twerkhub archive.</p>\n'
'<p><strong>Content Quality:</strong> All videos are professionally curated and shot in 4K resolution. Each piece is selected for artistic merit, technical skill, and entertainment value, making this a comprehensive resource for dance enthusiasts.</p>\n'
'<p><strong>For Members:</strong> Premium members unlock exclusive behind-the-scenes cuts, creator interviews, and early access to newly added content. Join our community to support independent creators and access unlimited streaming.</p>')

def slugify(s):
    s = re.sub(r"[^A-Za-z0-9\s-]", " ", s)
    s = re.sub(r"\s+", "-", s.strip().lower())
    return re.sub(r"-+", "-", s).strip("-")[:60] or "fancam"

def clean_display(raw):
    t = re.sub(r"^\[[^\]]*\]\s*", "", raw)
    t = re.sub(r"\s+", " ", t).strip()
    head = t.split("|")[0].strip()
    if len(head) < 8:
        head = t
    return head[:70].strip(" -|")

def parse(raw):
    up = raw.upper()
    quality = "8K" if "8K" in up else "4K"
    event = "fancam set"
    for k in ["GIRL CRUSH","FLYWITHME","UMC","PANDA","BIKINI CONTEST","MOTOR SHOW","PHOTO SESSION","STUDIO","IVEX","FANCOO"]:
        if k in up:
            event = k.title().replace("Umc","UMC"); break
    m = re.search(r"(?:GIRL CRUSH|MODEL|BJ|FOCUS\.?|FLYWITHME)\s+([A-Z][A-Za-z]+)", up)
    performer = m.group(1).title() if m else ""
    if not performer:
        m2 = re.search(r"\b([A-Z]{3,})\b", raw)
        performer = m2.group(1).title() if m2 else ""
    return quality, event, performer

def seo_paragraphs(disp, raw, performer, event, quality, seed):
    who = performer or "this performer"
    d, r = html.escape(disp), html.escape(raw)
    w, e = html.escape(who), html.escape(event)
    p1 = [
        f"<p><strong>About this cut:</strong> {d} is part of the Models &amp; Cheerleaders collection on Twerkhub — a {quality} {e} fancam centered on {w}. Source title: “{r}”.</p>",
        f"<p><strong>This clip:</strong> a {quality} {e} fancam ({w}) from the Models &amp; Cheerleaders wall, catalogued under “{r}”.</p>",
        f"<p><strong>Overview:</strong> {d} — {quality} {e} footage with {w}, added to the Models &amp; Cheerleaders drop. Source: “{r}”.</p>",
    ][seed % 3]
    p2 = [
        "<p><strong>Why it's here:</strong> every entry on the Models &amp; Cheerleaders wall is picked for camera work, styling and stage energy rather than algorithmic noise — an editorial archive, not an autoplay feed.</p>",
        "<p><strong>Curation:</strong> the wall favors sharp camera work, outfit and stage presence over raw view counts. Editorial picks, refreshed weekly.</p>",
        "<p><strong>The selection:</strong> hand-picked for production quality and presence — an editorial archive that grows with each weekly drop.</p>",
    ][(seed // 3) % 3]
    p3 = [
        "<p><strong>Keep exploring:</strong> jump back to the full Models &amp; Cheerleaders playlist for the rest of the drop, or follow the related cuts below.</p>",
        "<p><strong>More like this:</strong> the related cuts below stay in the same lane; the full Models &amp; Cheerleaders playlist has the complete set.</p>",
        "<p><strong>Next:</strong> browse the related fancams under this player, or open the complete Models &amp; Cheerleaders playlist.</p>",
    ][(seed // 9) % 3]
    return p1 + "\n" + p2 + "\n" + p3

def make_page(vid, raw_title):
    seed = int(hashlib.md5(vid.encode()).hexdigest(), 16)
    quality, event, performer = parse(raw_title)
    disp = clean_display(raw_title)
    slug = slugify(disp) + "-mc-" + re.sub(r"[^a-z0-9]","",vid[:6].lower())
    h = T
    h = h.replace(OLD_ID, vid)
    h = h.replace(OLD_SLUG, slug)
    h = h.replace(OLD_CREATOR, performer or "Models & Cheerleaders")
    h = h.replace(OLD_TITLE, disp)
    h = h.replace(OLD_SEO, seo_paragraphs(disp, raw_title, performer, event, quality, seed))
    h = h.replace("Signature · Archive", "Models & Cheerleaders · Fancam")
    h = h.replace('"genre":["Twerk","Dance Choreography"]', '"genre":["Fancam","Model","Cheerleader"]')
    h = h.replace("twerk, dance choreography, viral dance, twerk choreography", "models, cheerleaders, fancam, 4K fancam, dance")
    h = h.replace("/playlist/" + slug, "/models-cheerleaders/" + slug)
    h = h.replace("Curated 4K Twerk Videos", "Models & Cheerleaders · Fancam")
    return slug, h

def main():
    if len(sys.argv) < 2:
        print("uso: gen_video_pages.py datos.tsv"); return
    rows = []
    for ln in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
        if "\t" in ln:
            vid, title = ln.split("\t", 1)
            rows.append((vid.strip(), title.strip()))
    OUTDIR.mkdir(exist_ok=True)
    n = 0
    for vid, title in rows:
        slug, page = make_page(vid, title)
        (OUTDIR / (slug + ".html")).write_text(page, encoding="utf-8")
        print("  +", slug + ".html", "(" + str(len(page)//1024) + " KB)")
        n += 1
    print("total:", n)

if __name__ == "__main__":
    main()
