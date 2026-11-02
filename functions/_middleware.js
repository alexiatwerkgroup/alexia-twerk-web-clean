// TWERKHUB · global adults-only disclaimer, injected once at the end of <body> of every HTML page
// (existing and future). One implementation: no per-page edits, no duplicated markup.
const DISC = '<div class="twk-disc" role="note" style="margin:0;padding:18px 16px;border-top:1px solid rgba(255,255,255,.12);background:#000;color:#9d9db0;font:11px/1.6 system-ui,Arial,sans-serif;text-align:center;letter-spacing:.02em"><b style="color:#fff">18+ ADULTS ONLY.</b> If you are under 18 you cannot enter this site. All performers in Twerkhub original content are 18 or older and appear under a written agreement.</div>';

export async function onRequest(context) {
  const res = await context.next();
  try {
    const url = new URL(context.request.url);
    const ct = res.headers.get('content-type') || '';
    if (context.request.method !== 'GET' || url.pathname.startsWith('/api/') || !ct.includes('text/html') || !res.body || res.status !== 200) return res;
    const html = await res.text();
    if (html.includes('class="twk-disc"')) return new Response(html, res);
    const i = html.lastIndexOf('</body>');
    const out = i >= 0 ? html.slice(0, i) + DISC + html.slice(i) : html + DISC;
    const h = new Headers(res.headers);
    h.delete('content-length'); h.delete('content-encoding'); h.delete('etag');
    return new Response(out, { status: res.status, statusText: res.statusText, headers: h });
  } catch (e) {
    return res;
  }
}
