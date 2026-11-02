// OWNER ONLY. POST {label, channel, ts?} adds a promo marker ("I posted on X at 21:00"). DELETE ?id= removes it.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';
export async function onRequest({ request, env }) {
  const p = await authenticate(request, env);
  const u = p && p.sub ? await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first() : null;
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  await init(env.DB);
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch {}
    const label = String(b.label || '').slice(0, 80).trim(), channel = String(b.channel || '').slice(0, 24).trim();
    if (!label) return json({ ok: false, error: 'label' }, 400);
    const ts = Math.min(Date.now() + 3600000, Math.max(Date.now() - 90 * 86400000, parseInt(b.ts) || Date.now()));
    await env.DB.prepare('INSERT INTO tw_marks (ts, label, channel) VALUES (?,?,?)').bind(ts, label, channel).run();
    return json({ ok: true });
  }
  if (request.method === 'DELETE') { const id = parseInt(new URL(request.url).searchParams.get('id')); await env.DB.prepare('DELETE FROM tw_marks WHERE id = ?').bind(id).run(); return json({ ok: true }); }
  return json({ ok: false, error: 'method' }, 405);
}
