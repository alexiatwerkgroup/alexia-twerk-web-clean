// Temporary pause: keep purchases and the SFW catalog intact. Remove this gate to reopen.
export const PAUSE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Jenny · very soon | Twerkhub</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#08080c;color:#fff;font-family:Arial,sans-serif;padding:24px}main{width:100%;max-width:680px;padding:clamp(28px,7vw,64px);border:1px solid #30303a;border-radius:20px;background:#101016;text-align:center}.brand{font-weight:900;letter-spacing:.12em}.brand span{color:#ff8a00}h1{font-size:clamp(52px,12vw,92px);line-height:1;margin:36px 0 24px;color:#ff8a00}p{color:#c5c5d0;line-height:1.6}a{display:inline-block;margin-top:24px;padding:17px 24px;border-radius:6px;background:#ff8a00;color:#000;font-weight:700;text-decoration:none}a:focus-visible{outline:3px solid white;outline-offset:5px}</style></head><body><main><div class="brand">TWERK<span>HUB</span> · JENNY</div><h1>very soon</h1><p>The uncensored section is temporarily unavailable.</p><p>Jenny's SFW videos are still available.</p><a href="/jenny/">Watch SFW videos</a></main></body></html>`;

export async function explicitPauseResponse(request) {
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/').toLowerCase(); }
  catch { return null; }
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex,nofollow' };
  if (/^\/jenny\/uncensored(?:\/|\.html|$)/.test(path)) {
    return new Response(request.method === 'HEAD' ? null : PAUSE_PAGE, {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  // Includes covers and promotional teasers, as well as direct preview URLs.
  const preview = /^\/jenny\/p\/(?:x\d+|tz\d+)\./.test(path);
  let explicit = /^\/api\/jenny\/video\/?$/.test(path) && /^x/i.test(url.searchParams.get('n') || '');
  if (/^\/api\/jenny\/unlock\/?$/.test(path) && request.method === 'POST') {
    try { explicit = /^x/i.test(String((await request.clone().json()).n || '')); } catch {}
  }
  if (preview || explicit) return new Response(JSON.stringify({ ok: false, error: 'temporarily_unavailable', message: 'very soon' }), {
    status: 403, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
  return null;
}
