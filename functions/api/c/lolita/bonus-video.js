// GET /api/c/<slug>/video?n=01..99  (login + access check). Streams from private R2 (JENNY_VIDEOS).
import { authenticate } from '../../../_lib/auth.js';


export async function onRequestGet({ request, env, params }) {
  const deny = (s, m) => new Response(m, { status: s, headers: { 'Cache-Control': 'no-store' } });
  const slug='lolita';
  const n = new URL(request.url).searchParams.get('n') || '';
  if (!/^(0[1-9]|[1-7][0-9]|80)$/.test(n)) return deny(400, 'bad_request');
  if (!env.JENNY_VIDEOS || !env.DB) return deny(500, 'not_configured');
  const p = await authenticate(request, env);
  if (!p || !p.sub) return deny(401, 'login_required');
  const u = await env.DB.prepare('SELECT email, tier FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return deny(401, 'login_required');
  const own=await env.DB.prepare('SELECT 1 x FROM lolita_bonus_clips WHERE email=? AND n=?').bind(String(u.email).toLowerCase(),n).first();
  if (!own && String(u.email).toLowerCase()!=='alexiatwerkoficial@gmail.com') return deny(403, 'reward_required');

  const key = 'lolita/bonus/v'+n+'.mp4';
  const range = request.headers.get('Range');
  let obj, status = 200, start = 0, end;
  const head = await env.JENNY_VIDEOS.head(key);
  if (!head) return deny(404, 'not_found');
  const size = head.size;
  const h = new Headers({
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
    'Content-Disposition': new URL(request.url).searchParams.get('dl') === '1' ? `attachment; filename="${slug}-${n}-30s.mp4"` : 'inline'
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
