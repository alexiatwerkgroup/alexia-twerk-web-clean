import { authenticate } from '../../_lib/auth.js';
import { canWatch, ensureTables, validN, videoKey } from '../../_lib/catalog.js';

export async function onRequestGet({ request, env, params }) {
  const deny = (status, message) => new Response(message, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }
  });

  if (!env.DB || !env.JENNY_VIDEOS) return deny(500, 'not_configured');
  const raw = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  const match = /^v(0[1-9]|[1-9][0-9])\.mp4$/.exec(raw);
  if (!match) return deny(404, 'not_found');
  const n = match[1];

  const session = await authenticate(request, env).catch(() => null);
  if (!session?.sub) return deny(401, 'login_required');
  const user = await env.DB.prepare('SELECT email, tier FROM profiles WHERE id = ?').bind(session.sub).first();
  if (!user) return deny(401, 'login_required');

  await ensureTables(env);
  if (!(await canWatch(env, user, 'tainara', n))) return deny(403, 'coins_required');

  const key = videoKey('tainara', n);
  const head = await env.JENNY_VIDEOS.head(key);
  if (!head) return deny(404, 'not_found');

  const size = head.size;
  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex'
  });
  const range = request.headers.get('Range');
  const parsed = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  let object;
  let status = 200;

  if (parsed) {
    const start = parsed[1] === '' ? Math.max(0, size - Number(parsed[2])) : Number(parsed[1]);
    const end = parsed[2] === '' ? size - 1 : Math.min(Number(parsed[2]), size - 1);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'private, no-store' } });
    }
    object = await env.JENNY_VIDEOS.get(key, { range: { offset: start, length: end - start + 1 } });
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
    status = 206;
  } else {
    object = await env.JENNY_VIDEOS.get(key);
    headers.set('Content-Length', String(size));
  }

  return new Response(object.body, { status, headers });
}
