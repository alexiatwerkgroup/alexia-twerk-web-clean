// GET /api/novinhas/file?k=<canal>/<full|480h|previews>/<video-NN.mp4|poster-NN.webp>
// Sirve videos y portadas de Novinhas desde el bucket R2 "novinhas" (binding NOVINHAS_VIDEOS). Soporta Range.
const KEY = /^[a-z0-9-]{2,60}\/(full|480h)\/video-\d{2,3}\.mp4$|^[a-z0-9-]{2,60}\/previews\/poster-\d{2,3}\.webp$/;

export async function onRequestGet({ request, env }) {
  const fail = (s, m) => new Response(m, { status: s, headers: { 'Cache-Control': 'no-store' } });
  const key = new URL(request.url).searchParams.get('k') || '';
  if (!KEY.test(key)) return fail(400, 'bad_request');
  if (!env.NOVINHAS_VIDEOS) return fail(500, 'not_configured');
  const head = await env.NOVINHAS_VIDEOS.head(key);
  if (!head) return fail(404, 'not_found');
  const size = head.size, isVideo = key.endsWith('.mp4');
  const h = new Headers({
    'Content-Type': isVideo ? 'video/mp4' : 'image/webp', 'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex'
  });
  const range = request.headers.get('Range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (m) {
    let start, end;
    if (m[1] === '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
    else { start = parseInt(m[1], 10); end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1; }
    if (!(start <= end) || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    h.set('Content-Range', `bytes ${start}-${end}/${size}`); h.set('Content-Length', String(end - start + 1));
    const obj = await env.NOVINHAS_VIDEOS.get(key, { range: { offset: start, length: end - start + 1 } });
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('Content-Length', String(size));
  const obj = await env.NOVINHAS_VIDEOS.get(key);
  return new Response(obj.body, { status: 200, headers: h });
}
