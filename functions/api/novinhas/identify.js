// Busqueda / identificacion de bailarinas Novinhas.
//  GET  /api/novinhas/identify          -> { auth, videos, names, max } (lo enviado por el usuario; max 20 de cada tipo)
//  POST /api/novinhas/identify          (multipart) kind=name  + name [+ handle]            -> 50 tokens por nombre nuevo (max 20)
//                                       kind=video + file(video) + adults=1 [+ names]       -> 100 tokens por video (max 20)
// Recompensa en TOKENS (profiles.tokens): 50 por nombre, 100 por video. Requiere cuenta. Todo queda en estado "pending" para revision del dueno; los videos van a R2 (_ident/), nunca publicos.
import { authenticate } from '../../_lib/auth.js';
const REWARD = { name: 50, video: 100 }, MAX = 20, MAX_BYTES = 80 * 1024 * 1024, VID = /^video\/(mp4|quicktime|webm|x-matroska|x-msvideo)$/;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
async function who(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
    return u && u.email ? { uid: String(p.sub), email: String(u.email).toLowerCase() } : null;
  } catch (e) { return null; }
}
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_ident (id TEXT PRIMARY KEY, uid TEXT, email TEXT, kind TEXT, name TEXT, handle TEXT, r2key TEXT, status TEXT DEFAULT \'pending\', ts INTEGER)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS nv_ident_uid ON nv_ident (uid, kind)').run();
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
async function counts(db, uid) {
  const r = await db.prepare('SELECT kind, COUNT(*) c FROM nv_ident WHERE uid = ? GROUP BY kind').bind(uid).all();
  const o = { video: 0, name: 0 }; (r.results || []).forEach((x) => { o[x.kind] = x.c; }); return o;
}
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  await ensure(env.DB);
  const me = await who(request, env);
  if (request.method !== 'POST') {
    if (!me) return J({ auth: false, max: MAX });
    const c = await counts(env.DB, me.uid); return J({ auth: true, videos: c.video, names: c.name, max: MAX });
  }
  if (!me) return J({ error: 'login' }, 401);
  let f; try { f = await request.formData(); } catch (e) { return J({ error: 'bad_request' }, 400); }
  const kind = f.get('kind') === 'video' ? 'video' : 'name';
  const c = await counts(env.DB, me.uid);
  if (c[kind] >= MAX) return J({ error: 'limit', videos: c.video, names: c.name, max: MAX }, 429);
  const id = crypto.randomUUID(), ts = Math.floor(Date.now() / 1000);
  let name = clean(f.get('name') || f.get('names'), 160), handle = clean(f.get('handle'), 80), key = '';
  if (kind === 'name') {
    if (name.length < 3) return J({ error: 'name_short' }, 400);
    const dup = await env.DB.prepare('SELECT 1 FROM nv_ident WHERE uid = ? AND kind = \'name\' AND lower(name) = lower(?)').bind(me.uid, name).first();
    if (dup) return J({ error: 'duplicate' }, 409);
  } else {
    const file = f.get('file');
    if (!file || typeof file === 'string' || !file.size) return J({ error: 'no_file' }, 400);
    if (f.get('adults') !== '1') return J({ error: 'adults_required' }, 400);
    if (!VID.test(file.type || '')) return J({ error: 'bad_type' }, 415);
    if (file.size > MAX_BYTES) return J({ error: 'too_big', maxMb: 80 }, 413);
    key = '_ident/' + me.uid + '/' + id + '.' + (file.type.split('/')[1] === 'quicktime' ? 'mov' : file.type.split('/')[1].replace('x-', ''));
    await env.NOVINHAS_VIDEOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO nv_ident (id, uid, email, kind, name, handle, r2key, ts) VALUES (?,?,?,?,?,?,?,?)').bind(id, me.uid, me.email, kind, name, handle, key, ts),
    env.DB.prepare('UPDATE profiles SET tokens = COALESCE(tokens,0) + ?, total_earned = COALESCE(total_earned,0) + ? WHERE id = ?').bind(REWARD[kind], REWARD[kind], me.uid),
  ]);
  const n = await counts(env.DB, me.uid);
  return J({ ok: true, tokens: REWARD[kind], videos: n.video, names: n.name, max: MAX });
}
