#!/usr/bin/env python3
"""gen_video_pages.py - paginas-por-video LIVIANAS, UNICAS y SEO-ricas.
Reusa el template satelite liviano (escudo/paywall compartido, R1/R3/R4/R8) e
inyecta copy UNICO + keywords variadas por video. Uso:
  python3 gen_video_pages.py datos.tsv   (id<TAB>titulo_real)
Escribe /models-cheerleaders/<slug>.html. No pushea.
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
OLD_KW = '"keywords":"twerk, dance choreography, viral dance, twerk choreography, Артём Винокуров"'
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
    return (head if len(head) >= 8 else t)[:70].strip(" -|")

def parse(raw):
    up = raw.upper()
    quality = "8K" if "8K" in up else "4K"
    group = ""
    for k, v in [("GIRL CRUSH","Girl Crush"),("FLYWITHME","FlyWithMe"),("FANCOO","Fancoo"),("UMC","UMC"),("PANDA","Panda TV")]:
        if k in up:
            group = v; break
    event = ""
    for k, v in [("MOTOR SHOW","Motor Show"),("BIKINI CONTEST","Bikini Contest"),("PHOTO SESSION","Photo Session"),("STUDIO","studio shoot"),("IVEX","IVEX Studio")]:
        if k in up:
            event = v; break
    if not event:
        event = "fancam set"
    m = re.search(r"(?:GIRL CRUSH|MODEL|BJ|FOCUS\.?|FLYWITHME)\s+([A-Z][A-Za-z]+)", up)
    performer = m.group(1).title() if m else ""
    if not performer:
        m2 = re.search(r"\b([A-Z]{3,})\b", raw)
        performer = m2.group(1).title() if m2 else ""
    cam = ""
    if "고정캠" in raw: cam = "fixed cam"
    elif "무빙캠" in raw: cam = "moving cam"
    elif ("세로" in raw) or ("직캠" in raw): cam = "vertical fancam"
    ym = re.findall(r"\b(\d{2})(\d{2})(\d{2})\b", raw)
    year = ("20" + ym[-1][0]) if ym else ""
    return dict(quality=quality, group=group, event=event, performer=performer, cam=cam, year=year)

def keywords(info):
    p, g, e, q, c, y = info["performer"], info["group"], info["event"], info["quality"], info["cam"], info["year"]
    kw = []
    if p: kw += [p + " fancam", p + " " + q, p]
    if g: kw += [g, g + " fancam", g + " direct cam"]
    if e and e != "fancam set": kw += [e.lower(), e + " fancam"]
    kw += ["Korean fancam", "model fancam", "cheerleader fancam", "vertical fancam",
           "fancam " + q, "kpop dance fancam", "direct cam"]
    if y: kw += ["fancam " + y, "Korean fancam " + y]
    if c: kw += [c + " fancam"]
    out, seen = [], set()
    for k in kw:
        k = k.strip()
        if k and k.lower() not in seen:
            seen.add(k.lower()); out.append(k)
    return out

def seo_block(disp, raw, info, seed):
    p = info["performer"] or "the featured performer"
    g, e, q = info["group"], info["event"], info["quality"]
    c = info["cam"] or "vertical fancam"
    y = info["year"]
    d, r = html.escape(disp), html.escape(raw)
    pe, ee, ce = html.escape(p), html.escape(e), html.escape(c)
    grp = (" with the " + html.escape(g) + " crew") if g else ""
    yr = (" filmed in " + y) if y else ""
    lead = [
        "<p><strong>" + d + "</strong> is a " + q + " " + ee + " fancam" + grp + yr + ", archived in the Models &amp; Cheerleaders collection on Twerkhub. The cut centers on " + pe + ", captured in " + ce + " style. Source title: &ldquo;" + r + "&rdquo;.</p>",
        "<p>Watch <strong>" + d + "</strong> &mdash; a " + q + " " + ce + " of " + pe + grp + ", from the " + ee + yr + ". It lives on the Models &amp; Cheerleaders wall at Twerkhub, catalogued under &ldquo;" + r + "&rdquo;.</p>",
        "<p><strong>" + d + "</strong>: " + q + " " + ee + " footage of " + pe + ", shot as a " + ce + grp + yr + ". Part of the Models &amp; Cheerleaders drop on Twerkhub. Source: &ldquo;" + r + "&rdquo;.</p>",
        "<p>This entry, <strong>" + d + "</strong>, is a " + q + " fancam of " + pe + " from the " + ee + yr + grp + ". Filed in Twerkhub's Models &amp; Cheerleaders archive. Reference: &ldquo;" + r + "&rdquo;.</p>",
    ][seed % 4]
    body = [
        "<p><strong>What you'll see:</strong> close, stable " + ce + " camera work on the full routine &mdash; outfit changes, choreography and stage presence in " + q + ". The kind of " + ee + " coverage fans of " + pe + " look for, kept uncut.</p>",
        "<p><strong>In this cut:</strong> " + pe + " on stage in " + q + ", shot " + ce + ", with the camera staying tight on the performance and styling through the whole " + ee + ".</p>",
        "<p><strong>The footage:</strong> a " + ce + " of " + pe + " in " + q + " &mdash; full performance, wardrobe and choreography from the " + ee + ", framed for detail rather than fast cuts.</p>",
        "<p><strong>Expect:</strong> " + q + " " + ce + " of " + pe + ", steady on the routine and outfit across the " + ee + ", the way these performances are meant to be watched.</p>",
    ][(seed // 4) % 4]
    cur = [
        "<p><strong>Why it's on the wall:</strong> Models &amp; Cheerleaders is an editorial pick of model and cheerleader fancams &mdash; chosen for camera quality, styling and stage energy, not view counts or autoplay.</p>",
        "<p><strong>Curation note:</strong> each clip here earns its spot on production quality and presence; a hand-built archive, refreshed weekly, not an algorithmic feed.</p>",
        "<p><strong>About the collection:</strong> a curated wall of Korean fancams and model showcases, weighted toward sharp camera work and standout performers.</p>",
        "<p><strong>How we pick:</strong> sharp " + q + " camera work, strong styling and real stage presence &mdash; quality over quantity, updated every week.</p>",
    ][(seed // 16) % 4]
    kws = keywords(info)
    tstyle = "display:inline-block;margin:3px 6px 3px 0;padding:4px 10px;border:1px solid rgba(255,180,84,.3);border-radius:999px;font-size:12px;color:#ffd78a"
    tag_html = ""
    for k in kws[:10]:
        tag_html += "<span style='" + tstyle + "'>" + html.escape(k) + "</span>"
    rel_html = ""
    for k in kws[:8]:
        rel_html += "<li>" + html.escape(k) + "</li>"
    extra = ("<p><strong>Tags:</strong></p><div style='margin:6px 0 14px'>" + tag_html + "</div>" +
             "<p><strong>Related searches:</strong></p><ul style='margin:6px 0 0;padding-left:20px;columns:2'>" + rel_html + "</ul>")
    return lead + "\n" + body + "\n" + cur + "\n" + extra

def make_page(vid, raw_title):
    seed = int(hashlib.md5(vid.encode()).hexdigest(), 16)
    info = parse(raw_title)
    disp = clean_display(raw_title)
    slug = slugify(disp) + "-mc-" + re.sub(r"[^a-z0-9]", "", vid[:6].lower())
    kws = ", ".join(keywords(info)[:12]).replace('"', "")
    h = T
    h = h.replace(OLD_KW, '"keywords":"' + kws + '"')
    h = h.replace(OLD_SEO, seo_block(disp, raw_title, info, seed))
    h = h.replace(OLD_ID, vid)
    h = h.replace(OLD_SLUG, slug)
    h = h.replace(OLD_CREATOR, info["performer"] or "Models & Cheerleaders")
    h = h.replace(OLD_TITLE, disp)
    h = h.replace("Signature · Archive", "Models & Cheerleaders · Fancam")
    h = h.replace('"genre":["Twerk","Dance Choreography"]', '"genre":["Fancam","Model","Cheerleader"]')
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
        print("  +", slug + ".html", "(" + str(len(page) // 1024) + " KB)")
        n += 1
    print("total:", n)

if __name__ == "__main__":
    main()
