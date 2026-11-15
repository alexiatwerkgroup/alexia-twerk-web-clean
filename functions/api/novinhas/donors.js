// Ranking de donadores (anonimo). Los montos son REALES: los carga el dueño al confirmar cada pago.
//  GET  /api/novinhas/donors            -> {items:[{n,amt}], tiers:{1000:{cap,used},500:{..},100:{..}}}
//  GET  /api/novinhas/donors?me=1       -> {owner}
//  POST {action:'set', ref, amt}        -> (dueño) alta/actualiza un donador (ref = nombre interno privado)
//  POST {action:'remove', ref}          -> (dueño) lo quita
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
const CAP = { 1000: 1, 500: 5, 100: 7 };
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
async function isOwner(request, env) {
  try { const p = await authenticate(request, env); if (!p || !p.sub) return false; const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); return !!u && String(u.email).toLowerCase() === OWNER; } catch (e) { return false; }
}
async function tag(ref) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('twk-don:' + ref)); return [...new Uint8Array(b).slice(0, 2)].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase(); }
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ error: 'not_configured' }, 500);
  const db = env.DB, q = new URL(request.url).searchParams;
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_don (ref TEXT PRIMARY KEY, amt REAL NOT NULL, ts INTEGER)').run();
  if (request.method === 'POST') {
    if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
    let b = {}; try { b = await request.json(); } catch (e) {}
    const ref = String(b.ref || '').trim().slice(0, 80); if (!ref) return J({ error: 'bad_request' }, 400);
    if (b.action === 'remove') { await db.prepare('DELETE FROM nv_don WHERE ref = ?').bind(ref).run(); return J({ ok: true }); }
    const amt = Math.round(Number(b.amt) * 100) / 100; if (!(amt >= 1 && amt <= 100000)) return J({ error: 'bad_amount' }, 400);
    await db.prepare('INSERT INTO nv_don (ref, amt, ts) VALUES (?, ?, ?) ON CONFLICT(ref) DO UPDATE SET amt = excluded.amt, ts = excluded.ts').bind(ref, amt, Math.floor(Date.now() / 1000)).run();
    return J({ ok: true, n: await tag(ref) });
  }
  if (q.get('me')) return J({ owner: await isOwner(request, env) });
  const rows = (await db.prepare('SELECT ref, amt FROM nv_don ORDER BY amt DESC, ts ASC').all()).results || [];
  const tiers = {}; Object.keys(CAP).forEach((k) => { tiers[k] = { cap: CAP[k], used: 0 }; });
  rows.forEach((r) => { const t = r.amt >= 1000 ? 1000 : r.amt >= 500 ? 500 : r.amt >= 100 ? 100 : 0; if (t && tiers[t].used < tiers[t].cap) tiers[t].used++; });
  const items = []; for (const r of rows.slice(0, 10)) items.push({ n: await tag(r.ref), amt: r.amt });
  return J({ items, tiers }, 200, 'public, max-age=30');
}
