// Solo dueno. Bandeja de "Busca / Identificacao".
//  GET  /api/novinhas/identify-admin              -> { items:[{id,kind,name,handle,email,ts,status,hasVideo}], total }
//  GET  /api/novinhas/identify-admin?v=<id>       -> reproduce el video enviado (R2, con Range)
//  POST /api/novinhas/identify-admin {id,status}  -> status: pending | done | rejected
//  DELETE /api/novinhas/identify-admin?id=<id>    -> borra el envio (y su video)
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
async function owner(request, env) {
  try { const p = await authenticate(request, env); if (!p || !p.sub) return false; const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); return !!u && String(u.email).toLowerCase() === OWNER; } catch (e) { return false; }
}
export async function onRequest({ request, env }) {
  if (!(await owner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS nv_ident (id TEXT PRIMARY KEY, uid TEXT, email TEXT, kind TEXT, name TEXT, handle TEXT, r2key TEXT, status TEXT DEFAULT \'pending\', ts INTEGER)').run();
  const url = new URL(request.url), q = url.searchParams;
  if (request.method === 'GET' && q.get('v')) {
    const r = await env.DB.prepare('SELECT r2key FROM nv_ident WHERE id = ? AND r2key != \'\'').bind(q.get('v')).first();
    if (!r) return J({ error: 'not_found' }, 404);
    const range = request.headers.get('Range');
    const o = await env.NOVINHAS_VIDEOS.get(r.r2key, range ? { range } : undefined);
    if (!o) return J({ error: 'not_found' }, 404);
    const h = new Headers({ 'Content-Type': (o.httpMetadata && o.httpMetadata.contentType) || 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' });
    if (range && o.range) { const st = o.range.offset || 0, en = st + (o.range.length || o.size) - 1; h.set('Content-Range', 'bytes ' + st + '-' + en + '/' + o.size); h.set('Content-Length', String(en - st + 1)); return new Response(o.body, { status: 206, headers: h }); }
    h.set('Content-Length', String(o.size)); return new Response(o.body, { status: 200, headers: h });
  }
  if (request.method === 'GET') {
    const r = await env.DB.prepare('SELECT id, kind, name, handle, email, ts, status, (r2key != \'\') hasVideo FROM nv_ident ORDER BY (status = \'pending\') DESC, ts DESC LIMIT 500').all();
    const t = await env.DB.prepare('SELECT COUNT(*) c FROM nv_ident').first();
    return J({ ok: true, items: r.results || [], total: t ? t.c : 0 });
  }
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    if (!['pending', 'done', 'rejected'].includes(b.status) || !b.id) return J({ error: 'bad_request' }, 400);
    await env.DB.prepare('UPDATE nv_ident SET status = ? WHERE id = ?').bind(b.status, b.id).run(); return J({ ok: true });
  }
  if (request.method === 'DELETE') {
    const id = q.get('id'); if (!id) return J({ error: 'bad_request' }, 400);
    const r = await env.DB.prepare('SELECT r2key FROM nv_ident WHERE id = ?').bind(id).first();
    if (r && r.r2key) { try { await env.NOVINHAS_VIDEOS.delete(r.r2key); } catch (e) {} }
    await env.DB.prepare('DELETE FROM nv_ident WHERE id = ?').bind(id).run(); return J({ ok: true });
  }
  return J({ error: 'method' }, 405);
}
