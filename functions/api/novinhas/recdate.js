// GET /api/novinhas/recdate?c=<slug> -> (solo dueño) fechas de grabacion de los videos del canal: { id: { d:'YYYY-MM-DD', m:'meta|title|mtime' } }
// Las fechas se calculan una sola vez (ffprobe del archivo original, fecha en el titulo, fecha del archivo) y se guardan fijas en <slug>/_dates.json.
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
export async function onRequestGet({ request, env }) {
  const slug = new URL(request.url).searchParams.get('c') || '';
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !env.NOVINHAS_VIDEOS) return J({ owner: false });
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return J({ owner: false });
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
    if (!u || String(u.email).toLowerCase() !== OWNER) return J({ owner: false });
  } catch (e) { return J({ owner: false }); }
  const o = await env.NOVINHAS_VIDEOS.get(slug + '/_dates.json');
  return J({ owner: true, dates: o ? await o.json().catch(() => ({})) : {} });
}
