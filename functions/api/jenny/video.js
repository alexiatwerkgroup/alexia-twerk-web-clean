// GET /api/jenny/video?n=01..13  (login required + access check)
// Streams the full video from the PRIVATE R2 bucket (binding JENNY_VIDEOS). Supports Range.
// Access: profiles.tier = 'vip' OR email listed in env.JENNY_ALLOWED (comma separated).
import { authenticate } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const deny = (s, m) => new Response(m, { status: s, headers: { 'Cache-Control': 'no-store' } });
  const n = new URL(request.url).searchParams.get('n') || '';
  if (!/^(0[1-9]|1[0-3])$/.test(n)) return deny(400, 'bad_request');
  if (!env.JENNY_VIDEOS || !env.DB) return deny(500, 'not_configured');
  const p = await authenticate(request, env);
  if (!p || !p.sub) return deny(401, 'login_required');
  const u = await env.DB.prepare('SELECT email, tier FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return deny(401, 'login_required');
  const allowed = String(env.JENNY_ALLOWED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const em = String(u.email || '').toLowerCase();
  let ok = u.tier === 'vip' || allowed.includes(em) || em === 'alexiatwerkoficial@gmail.com';
  if (!ok) { const r = await env.DB.prepare('SELECT 1 AS x FROM jenny_access WHERE email = ?').bind(em).first(); ok = !!r; }
  if (!ok) return deny(403, 'no_access');

  const key = 'v' + n + '.mp4';
  const range = request.headers.get('Range');
  let obj, status = 200, start = 0, end;
  const head = await env.JENNY_VIDEOS.head(key);
  if (!head) return deny(404, 'not_found');
  const size = head.size;
  const h = new Headers({
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline', 'X-Robots-Tag': 'noindex'
  });
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (m) {
    if (m[1] === '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
    else { start = parseInt(m[1], 10); end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1; }
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    status = 206;
    h.set('Content-Range', `bytes ${start}-${end}/${size}`);
    h.set('Content-Length', String(end - start + 1));
    obj = await env.JENNY_VIDEOS.get(key, { range: { offset: start, length: end - start + 1 } });
  } else {
    h.set('Content-Length', String(size));
    obj = await env.JENNY_VIDEOS.get(key);
  }
  return new Response(obj.body, { status, headers: h });
}
