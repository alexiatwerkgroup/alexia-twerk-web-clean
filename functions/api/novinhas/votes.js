// Votos ("Me gusta") de videos Novinhas: base del futuro ranking hot.
//  GET  /api/novinhas/votes?c=<slug>            -> { counts: { id: n }, mine?: [ids] (con ?d=<dev>) }
//  GET  /api/novinhas/votes?top=1&limit=20      -> ranking global: [{c,id,n}] (mas votados)
//  POST /api/novinhas/votes {c,id,d,on}         -> alterna el voto de ese dispositivo (un voto por dispositivo y video)
const SLUG = /^[a-z0-9-]{2,60}$/;
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_votes (slug TEXT, vid INTEGER, dev TEXT, ts INTEGER, PRIMARY KEY (slug, vid, dev))').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS nv_votes_slug ON nv_votes (slug, vid)').run();
}
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  await ensure(env.DB);
  const url = new URL(request.url), q = url.searchParams;
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const id = parseInt(b.id, 10), dev = String(b.d || '').slice(0, 40);
    if (!SLUG.test(b.c || '') || !(id > 0) || dev.length < 8) return J({ error: 'bad_request' }, 400);
    if (b.on) await env.DB.prepare('INSERT OR IGNORE INTO nv_votes (slug, vid, dev, ts) VALUES (?, ?, ?, ?)').bind(b.c, id, dev, Math.floor(Date.now() / 1000)).run();
    else await env.DB.prepare('DELETE FROM nv_votes WHERE slug = ? AND vid = ? AND dev = ?').bind(b.c, id, dev).run();
    const n = await env.DB.prepare('SELECT COUNT(*) c FROM nv_votes WHERE slug = ? AND vid = ?').bind(b.c, id).first();
    return J({ ok: true, n: n ? n.c : 0 });
  }
  if (q.get('top')) {
    const lim = Math.min(100, Math.max(1, parseInt(q.get('limit'), 10) || 20));
    const r = await env.DB.prepare('SELECT slug c, vid id, COUNT(*) n FROM nv_votes GROUP BY slug, vid ORDER BY n DESC, MAX(ts) DESC LIMIT ?').bind(lim).all();
    return J({ top: r.results || [] }, 200, 'public, max-age=60');
  }
  const slug = q.get('c') || ''; if (!SLUG.test(slug)) return J({ error: 'bad_request' }, 400);
  const r = await env.DB.prepare('SELECT vid, COUNT(*) n FROM nv_votes WHERE slug = ? GROUP BY vid').bind(slug).all();
  const counts = {}; (r.results || []).forEach((x) => { counts[x.vid] = x.n; });
  const out = { counts }, dev = String(q.get('d') || '').slice(0, 40);
  if (dev.length >= 8) { const m = await env.DB.prepare('SELECT vid FROM nv_votes WHERE slug = ? AND dev = ?').bind(slug, dev).all(); out.mine = (m.results || []).map((x) => x.vid); }
  return J(out);
}
