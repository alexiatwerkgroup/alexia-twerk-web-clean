// POST {h, d, s, ev:[{n,d}]}  (sendBeacon) -> updates time on page, scroll depth and events of one page view.
import { json } from '../../_lib/http.js';
import { init } from '../../_lib/analytics.js';
const ALLOWED_EVENTS = new Set(['pay_open', 'unlock_click', 'follow', 'copy_id', 'binance_ref', 'rabbit_click', 'nov_watch', 'nov_join', 'nov_play', 'nov_video_view', 'signup_click', 'signup_start', 'signup_done', 'signup_verified', 'nov_signup', 'vid_time']);
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch {}
  const h = String(b.h || ''); if (!/^[a-f0-9]{16}$/.test(h)) return json({ ok: false }, 400);
  await init(env.DB);
  const requestedDuration = Math.max(0, Math.min(172800, parseInt(b.d) || 0)), s = Math.max(0, Math.min(100, parseInt(b.s) || 0));
  const row = await env.DB.prepare('SELECT vid, ts, uid FROM tw_hits WHERE hid = ?').bind(h).first();
  if (!row) return json({ ok: false }, 404);
  const cf = request.cf || {};
  const country = String(cf.country || '').slice(0, 2);
  const region = String(cf.region || '').slice(0, 100);
  const city = String(cf.city || '').slice(0, 100);
  const timezone = String(cf.timezone || '').slice(0, 80);
  const lat = typeof cf.latitude === 'number' && Number.isFinite(cf.latitude) ? cf.latitude : null;
  const lon = typeof cf.longitude === 'number' && Number.isFinite(cf.longitude) ? cf.longitude : null;
  const now = Date.now();
  // Duración declarada por el navegador nunca puede superar el tiempo real transcurrido
  // desde la carga. Evita que un POST inmediato convierta un bot en "interesado" con 30 s falsos.
  const elapsed = Math.max(0, Math.floor((now - Number(row.ts || now)) / 1000));
  const d = Math.min(requestedDuration, elapsed);
  const engaged = b.i && Number.isFinite(Number(b.i)) ? Math.max(now - 60000, Math.min(now, Number(b.i))) : null;
  await env.DB.prepare("UPDATE tw_hits SET dur = MAX(dur, ?), scroll = MAX(scroll, ?), human = MAX(human, ?), last_active = ?, last_engaged = CASE WHEN ? IS NULL THEN last_engaged ELSE MAX(COALESCE(last_engaged, 0), ?) END, country = COALESCE(NULLIF(?, ''), country), region = COALESCE(NULLIF(?, ''), region), city = COALESCE(NULLIF(?, ''), city), tz = COALESCE(NULLIF(?, ''), tz), lat = COALESCE(?, lat), lon = COALESCE(?, lon) WHERE hid = ?")
    .bind(d, s, b.u ? 1 : 0, now, engaged, engaged, country, region, city, timezone, lat, lon, h).run();
  const ev = Array.isArray(b.ev) ? b.ev.slice(0, 12) : [];
  for (const e of ev) { const n = String(e && e.n || ''); if (!ALLOWED_EVENTS.has(n)) continue; if (n === 'vid_time') await env.DB.prepare("DELETE FROM tw_events WHERE hid = ? AND name = 'vid_time'").bind(h).run(); await env.DB.prepare('INSERT INTO tw_events (ts, hid, vid, name, detail) VALUES (?,?,?,?,?)').bind(Date.now(), h, row.vid, n, String(e.d || '').slice(0, n === 'nov_video_view' ? 80 : 40)).run(); }
  return json({ ok: true });
}
