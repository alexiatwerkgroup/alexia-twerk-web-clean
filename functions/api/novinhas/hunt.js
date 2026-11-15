// Concurso "cazador" (Novinhas). Participan usuarios registrados que marcan "quiero participar".
//  GET            -> {auth, joined}
//  POST {join, cat:'content'|'money'}    -> guarda/quita la participacion del usuario logueado (con su email, para contactarlo si resulta elegido)
//  GET ?list=1    -> (dueño) lista de participantes {email, username, ts}
//  GET ?stats=1   -> {plays, hits, pct}  (porcentaje REAL = sesiones que acertaron / sesiones que jugaron)
//  GET ?winners=1 -> (dueño) mails que ganaron monedas de platino (5 o 20), sean o no hunters
//  POST {ev:'play'|'hit'|'great', sid} -> registra el evento (una vez por sesion). 'hit' = conejo (+5 platino), 'great' = conejo+Binance+PayPal o 3 previews (+20 platino +1 voucher VIP). Con cuenta se acredita y se guarda el mail
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { sendEmail } from '../../_lib/resend.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt_ev (sid TEXT NOT NULL, kind TEXT NOT NULL, ts INTEGER, PRIMARY KEY (sid, kind))').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_plat (uid TEXT PRIMARY KEY, email TEXT, username TEXT, coins INTEGER DEFAULT 0, tier TEXT, voucher INTEGER DEFAULT 0, ts INTEGER)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt (uid TEXT PRIMARY KEY, email TEXT, username TEXT, joined INTEGER DEFAULT 1, ts INTEGER)').run();
  try { await db.prepare('ALTER TABLE nv_hunt ADD COLUMN cat TEXT').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_hunt ADD COLUMN mailed INTEGER').run(); } catch (e) {}
  try { await db.prepare('ALTER TABLE nv_hunt ADD COLUMN mail_err TEXT').run(); } catch (e) {}
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_hunt_msg (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, email TEXT, username TEXT, contact TEXT, msg TEXT, ts INTEGER)').run();
}
async function me(request, env) {
  try {
    const p = await authenticate(request, env); if (!p || !p.sub) return null;
    const u = await env.DB.prepare('SELECT email, username FROM profiles WHERE id = ?').bind(p.sub).first();
    return u ? { uid: String(p.sub), email: String(u.email || ''), username: String(u.username || '') } : null;
  } catch (e) { return null; }
}

const MT = {
  pt: { s: 'Você está participando: Caçador Twerkhub', h: 'Olá', a: 'Sua participação no concurso de caçadores do Twerkhub foi registrada.', c1: 'Categoria 1: quem mais doar conteúdo. Se você for escolhido, entraremos em contato por este e-mail. Se quiser falar agora, responda este e-mail ou entre no Discord.', c2: 'Categoria 2: top doadores. Para confirmar sua doação e sua participação no sorteio, envie uma captura do pagamento pelo Discord ou por e-mail (twerkhub.lat@gmail.com).', f: 'Acesso grátis a todo o conteúdo para os escolhidos. Boa sorte!' },
  es: { s: 'Estás participando: Cazador Twerkhub', h: 'Hola', a: 'Tu participación en el concurso de cazadores de Twerkhub quedó registrada.', c1: 'Categoría 1: los que más contenido donen. Si resultás elegido, te vamos a contactar a este mail. Si querés hablar ya, respondé este mail o entrá al Discord.', c2: 'Categoría 2: top donantes. Para confirmar tu donación y tu participación en el sorteo, enviá una captura del pago por Discord o por mail (twerkhub.lat@gmail.com).', f: 'Acceso gratis a todo el contenido para los elegidos. ¡Suerte!' },
  en: { s: "You're in: Twerkhub Hunter", h: 'Hi', a: 'Your entry in the Twerkhub hunter contest has been registered.', c1: 'Category 1: top content donors. If you are chosen, we will contact you at this email. If you want to talk now, reply to this email or join our Discord.', c2: 'Category 2: top donors. To confirm your donation and your entry in the draw, send a screenshot of the payment on Discord or by email (twerkhub.lat@gmail.com).', f: 'Free access to all content for the chosen ones. Good luck!' }
};
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function mailJoin(env, db, u, cat, lang) {
  try {
    const r = await db.prepare('SELECT mailed FROM nv_hunt WHERE uid = ?').bind(u.uid).first();
    if (!u.email || (r && r.mailed)) return;
    const t = MT[lang] || MT.pt;
    const html = '<div style="font-family:system-ui,Arial,sans-serif;background:#0b0b0d;color:#f4efe2;padding:28px;max-width:520px;margin:auto;border:1px solid #6b5316;border-radius:14px"><h2 style="color:#f0b90b;margin:0 0 14px">' + esc(t.s) + '</h2><p>' + esc(t.h) + ' ' + esc(u.username || '') + ',</p><p>' + esc(t.a) + '</p><p>' + esc(cat === 'money' ? t.c2 : t.c1) + '</p><p style="color:#a89c78">' + esc(t.f) + '</p><p style="margin-top:22px"><a href="https://twerkhub.lat/discord" style="background:#f0b90b;color:#1a1100;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Discord</a></p></div>';
    await sendEmail(env, { to: u.email, subject: t.s, html, replyTo: 'twerkhub.lat@gmail.com' });
    await db.prepare('UPDATE nv_hunt SET mailed = ? WHERE uid = ?').bind(Date.now(), u.uid).run();
  } catch (e) { try { await db.prepare('UPDATE nv_hunt SET mail_err = ? WHERE uid = ?').bind(String((e && e.message) || e).slice(0, 300), u.uid).run(); } catch (x) {} }
}
export async function onRequest(ctx) {
  const { request, env } = ctx;
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  await ensure(env.DB);
  const url = new URL(request.url), u = await me(request, env);
  if (request.method === 'GET') {
    if (url.searchParams.get('list')) {
      if (!u || u.email.toLowerCase() !== OWNER) return J({ error: 'forbidden' }, 403);
      const r = await env.DB.prepare('SELECT email, username, cat, ts FROM nv_hunt WHERE joined = 1 ORDER BY ts').all();
      return J({ ok: true, count: (r.results || []).length, list: r.results || [] });
    }
    if (url.searchParams.get('msgs')) {
      if (!u || u.email.toLowerCase() !== OWNER) return J({ error: 'forbidden' }, 403);
      const r = await env.DB.prepare('SELECT username, email, contact, msg, ts FROM nv_hunt_msg ORDER BY ts DESC LIMIT 300').all();
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
    return J({ auth: true, uid: u.uid, joined: !!(row && row.joined), cat: (row && row.cat) || '', wallet: { tokens, coins, platinum: (w && w.coins) || 0, voucher: (w && w.voucher) || 0 } });
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
  if (b.ev === 'contact') {
    if (!u) return J({ error: 'login' }, 401);
    const contact = String(b.contact || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120), msg = String(b.msg || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, 800);
    if (contact.length < 3) return J({ error: 'contact' }, 400);
    const n = await env.DB.prepare('SELECT COUNT(*) n FROM nv_hunt_msg WHERE uid = ? AND ts > ?').bind(u.uid, Date.now() - 86400000).first();
    if (n && n.n >= 5) return J({ error: 'limit' }, 429);
    await env.DB.prepare('INSERT INTO nv_hunt_msg (uid, email, username, contact, msg, ts) VALUES (?,?,?,?,?,?)').bind(u.uid, u.email, u.username, contact, msg, Date.now()).run();
    return J({ ok: true });
  }
  if (!u) return J({ error: 'login' }, 401);
  const join = b.join ? 1 : 0, cat = b.cat === 'money' ? 'money' : (b.cat === 'content' ? 'content' : null);
  if (join && !cat) return J({ error: 'cat' }, 400);
  await env.DB.prepare('INSERT INTO nv_hunt (uid, email, username, joined, cat, ts) VALUES (?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET cat = COALESCE(excluded.cat, nv_hunt.cat), joined = excluded.joined, email = excluded.email, username = excluded.username, ts = CASE WHEN excluded.joined = 1 THEN excluded.ts ELSE nv_hunt.ts END')
    .bind(u.uid, u.email, u.username, join, cat, Date.now()).run();
  if (join) { const lg = ['pt', 'es', 'en'].indexOf(b.lang) >= 0 ? b.lang : 'pt', job = mailJoin(env, env.DB, u, cat, lg); if (ctx.waitUntil) ctx.waitUntil(job); else await job; }
  return J({ ok: true, joined: !!join });
}
