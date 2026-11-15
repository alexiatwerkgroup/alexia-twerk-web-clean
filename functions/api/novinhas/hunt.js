// Concurso "cazador" (Novinhas). Participan usuarios registrados que marcan "quiero participar".
//  GET            -> {auth, joined}
//  POST {join, cat:'content'|'money'}    -> guarda/quita la participacion del usuario logueado (con su email, para contactarlo si resulta elegido)
//  GET ?list=1    -> (dueño) lista de participantes {email, username, ts}
//  GET ?stats=1   -> {plays, hits, pct}  (porcentaje REAL = sesiones que acertaron / sesiones que jugaron)
//  GET ?winners=1 -> (dueño) mails que ganaron monedas de platino (5 o 20), sean o no hunters
//  POST {ev:'play'|'hit'|'great', sid} -> registra el evento (una vez por sesion). 'hit' = conejo (+5 platino), 'great' = conejo+Binance+PayPal o 3 previews (+20 platino +1 voucher VIP). Con cuenta se acredita y se guarda el mail
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt_ev (sid TEXT NOT NULL, kind TEXT NOT NULL, ts INTEGER, PRIMARY KEY (sid, kind))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_plat (uid TEXT PRIMARY KEY, email TEXT, username TEXT, coins INTEGER DEFAULT 0, tier TEXT, voucher INTEGER DEFAULT 0, ts INTEGER)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt (uid TEXT PRIMARY KEY, email TEXT, username TEXT, joined INTEGER DEFAULT 1, ts INTEGER)').run();
  try { await db.prepare('ALTER TABLE nv_hunt ADD COLUMN cat TEXT').run(); } catch (e) {}
}
async function me(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email, username FROM profiles WHERE id = ?').bind(p.sub).first();
    return u ? { uid: String(p.sub), email: String(u.email || ''), username: String(u.username || '') } : null;
  } catch (e) { return null; }
}
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  await ensure(env.DB);
  const url = new URL(request.url), u = await me(request, env);
  if (request.method === 'GET') {
    if (url.searchParams.get('list')) {
      if (!u || u.email.toLowerCase() !== OWNER) return J({ error: 'forbidden' }, 403);
      const r = await env.DB.prepare('SELECT email, username, cat, ts FROM nv_hunt WHERE joined = 1 ORDER BY ts').all();
      return J({ ok: true, count: (r.results || []).length, list: r.results || [] });
    }
    if (url.searchParams.get('winners')) {
      if (!u || u.email.toLowerCase() !== OWNER) return J({ error: 'forbidden' }, 403);
      const r = await env.DB.prepare('SELECT p.email, p.username, p.coins, p.voucher, p.tier, p.ts, COALESCE(h.joined, 0) AS hunter FROM nv_plat p LEFT JOIN nv_hunt h ON h.uid = p.uid ORDER BY p.ts').all();
      return J({ ok: true, count: (r.results || []).length, list: r.results || [] });
    }
    if (url.searchParams.get('stats')) {
      const a = await env.DB.prepare("SELECT COUNT(*) n FROM nv_hunt_ev WHERE kind = 'play'").first();
      const h = await env.DB.prepare("SELECT COUNT(*) n FROM nv_hunt_ev WHERE kind = 'hit'").first();
      const plays = (a && a.n) || 0, hits = (h && h.n) || 0;
      const g = await env.DB.prepare("SELECT COUNT(*) n FROM nv_hunt_ev WHERE kind = 'great'").first();
      const greats = (g && g.n) || 0, pc = (n) => plays > 0 ? Math.round(n * 1000 / plays) / 10 : 0;
      const ck = async (k) => { const r = await env.DB.prepare('SELECT COUNT(*) n FROM nv_hunt_ev WHERE kind = ?').bind(k).first(); return (r && r.n) || 0; };
      const [later, close, reg, cat1, cat2] = await Promise.all([ck('later'), ck('close'), ck('reg'), ck('cat1'), ck('cat2')]);
      return J({ ok: true, plays, hits, greats, pct: pc(hits), pctGreat: pc(greats), later, close, reg, cat1, cat2 });
    }
    if (!u) return J({ auth: false, joined: false });
    const row = await env.DB.prepare('SELECT joined, cat FROM nv_hunt WHERE uid = ?').bind(u.uid).first();
    let tokens = 0, coins = 0;
    try { const t = await env.DB.prepare('SELECT tokens FROM profiles WHERE id = ?').bind(u.uid).first(); tokens = (t && t.tokens) || 0; } catch (e) {}
    try { const c = await env.DB.prepare('SELECT coins FROM jenny_coins WHERE lower(email) = lower(?)').bind(u.email).first(); coins = (c && c.coins) || 0; } catch (e) {}
    const w = await env.DB.prepare('SELECT coins, voucher FROM nv_plat WHERE uid = ?').bind(u.uid).first();
    return J({ auth: true, joined: !!(row && row.joined), cat: (row && row.cat) || '', wallet: { tokens, coins, platinum: (w && w.coins) || 0, voucher: (w && w.voucher) || 0 } });
  }
  if (request.method !== 'POST') return J({ error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  if (b.ev === 'later' || b.ev === 'close' || b.ev === 'reg' || b.ev === 'cat1' || b.ev === 'cat2') {
    const sid2 = String(b.sid || '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(sid2)) return J({ error: 'sid' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO nv_hunt_ev (sid, kind, ts) VALUES (?,?,?)').bind(sid2, b.ev, Date.now()).run();
    return J({ ok: true });
  }
  if (b.ev === 'play' || b.ev === 'hit' || b.ev === 'great') {
    const sid = String(b.sid || '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(sid)) return J({ error: 'sid' }, 400);
    await env.DB.prepare('INSERT OR IGNORE INTO nv_hunt_ev (sid, kind, ts) VALUES (?,?,?)').bind(sid, b.ev, Date.now()).run();
    let platinum = 0, voucher = 0;
    if (b.ev !== 'play' && u) {
      const coins = b.ev === 'great' ? 20 : 5;
      await env.DB.prepare('INSERT INTO nv_plat (uid, email, username, coins, tier, voucher, ts) VALUES (?,?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET voucher = MAX(nv_plat.voucher, excluded.voucher), coins = MAX(nv_plat.coins, excluded.coins), tier = CASE WHEN excluded.coins > nv_plat.coins THEN excluded.tier ELSE nv_plat.tier END, email = excluded.email, username = excluded.username')
        .bind(u.uid, u.email, u.username, coins, b.ev, b.ev === 'great' ? 1 : 0, Date.now()).run();
      const w = await env.DB.prepare('SELECT coins, voucher FROM nv_plat WHERE uid = ?').bind(u.uid).first();
      platinum = (w && w.coins) || coins; voucher = (w && w.voucher) || 0;
    }
    return J({ ok: true, auth: !!u, platinum, voucher });
  }
  if (!u) return J({ error: 'login' }, 401);
  const join = b.join ? 1 : 0, cat = b.cat === 'money' ? 'money' : (b.cat === 'content' ? 'content' : null);
  if (join && !cat) return J({ error: 'cat' }, 400);
  await env.DB.prepare('INSERT INTO nv_hunt (uid, email, username, joined, cat, ts) VALUES (?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET cat = COALESCE(excluded.cat, nv_hunt.cat), joined = excluded.joined, email = excluded.email, username = excluded.username, ts = CASE WHEN excluded.joined = 1 THEN excluded.ts ELSE nv_hunt.ts END')
    .bind(u.uid, u.email, u.username, join, cat, Date.now()).run();
  return J({ ok: true, joined: !!join });
}
