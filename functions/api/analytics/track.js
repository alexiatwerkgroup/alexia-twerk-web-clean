// POST {h, d, s, ev:[{n,d}]}  (sendBeacon) -> updates time on page, scroll depth and events of one page view.
import { json } from '../../_lib/http.js';
import { init } from '../../_lib/analytics.js';
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch {}
  const h = String(b.h || ''); if (!/^[a-f0-9]{16}$/.test(h)) return json({ ok: false }, 400);
  await init(env.DB);
  const d = Math.max(0, Math.min(3600, parseInt(b.d) || 0)), s = Math.max(0, Math.min(100, parseInt(b.s) || 0));
  const row = await env.DB.prepare('SELECT vid FROM tw_hits WHERE hid = ?').bind(h).first();
  if (!row) return json({ ok: false }, 404);
  await env.DB.prepare('UPDATE tw_hits SET dur = MAX(dur, ?), scroll = MAX(scroll, ?) WHERE hid = ?').bind(d, s, h).run();
  const ev = Array.isArray(b.ev) ? b.ev.slice(0, 12) : [];
  for (const e of ev) { const n = String(e && e.n || ''); if (!/^[a-z_]{2,24}$/.test(n)) continue; await env.DB.prepare('INSERT INTO tw_events (ts, hid, vid, name, detail) VALUES (?,?,?,?,?)').bind(Date.now(), h, row.vid, n, String(e.d || '').slice(0, 40)).run(); }
  return json({ ok: true });
}
