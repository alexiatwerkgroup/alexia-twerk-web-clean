import { authenticate } from '../../../_lib/auth.js';
import { json } from '../../../_lib/http.js';
import { validModelN, videoKey, catalogStorage, isPublished } from '../../../_lib/catalog.js';

const DURATION_SECONDS = {"01":149.72,"02":32.925,"03":125.41,"04":361.62,"05":117.515,"06":15.045,"07":208.003,"08":388.567,"09":185.55,"10":26.446,"11":103.606,"12":135.977,"13":66.986,"14":18.767,"15":466.563,"16":374.367,"17":215.567,"18":84.775,"19":208.051,"20":67.222,"21":94.97,"22":237.433,"23":169.633,"24":141.467,"25":108.8,"26":208.003,"27":208.016,"28":208.003,"29":208.003,"30":63.041,"31":60.033,"32":60.033,"33":90.743,"34":208.003,"35":208.003,"36":208.003};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const n = url.searchParams.get('n') || '';
  if (!validModelN('abbi', n)) return new Response('bad_request', { status: 400 });
  const p = await authenticate(request, env);
  if (!p?.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email, tier FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!user) return json({ ok: false, error: 'login_required' }, 401);
  const allowed = String(env.JENNY_ALLOWED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const email = String(user.email || '').toLowerCase();
  const owner = email === 'alexiatwerkoficial@gmail.com' || user.tier === 'vip' || allowed.includes(email);
  if (!owner) {
    const grant = await env.DB.prepare('SELECT 1 x FROM catalog_access WHERE slug = ? AND email = ?').bind('abbi', email).first();
    const unlock = await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind('abbi', email, n).first();
    if (!grant && !unlock) return json({ ok: false, error: 'coins_required' }, 403);
  }
  if (!(await isPublished(env, 'abbi', n))) return new Response('not_found', { status: 404 });
  const storage = catalogStorage(env, 'abbi');
  if (!storage || !env.DB) return new Response('not_configured', { status: 503 });
  const key = videoKey('abbi', n);
  const head = await storage.head(key);
  if (!head) return new Response('not_found', { status: 404 });
  const duration = DURATION_SECONDS[n];
  if (!duration || !head.size) return new Response('not_found', { status: 404 });
  const previewSeconds = Math.min(10, Math.max(1, duration * 0.1));
  const range = request.headers.get('Range');
  let start = 0, end = head.size - 1;
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match) {
    if (match[1] === '') start = Math.max(0, head.size - parseInt(match[2], 10));
    else start = parseInt(match[1], 10);
    if (match[2] && match[1]) end = Math.min(end, parseInt(match[2], 10));
  }
  const allowedEnd = Math.max(0, Math.floor(head.size * previewSeconds / duration) - 1);
  if (start > allowedEnd || start >= head.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } });
  end = Math.min(end, allowedEnd);
  const obj = await storage.get(key, { range: { offset: start, length: end - start + 1 } });
  return new Response(obj.body, { status: 206, headers: {
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1),
    'Content-Range': `bytes ${start}-${end}/${head.size}`, 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
    'X-Preview-Duration': String(previewSeconds)
  }});
}
