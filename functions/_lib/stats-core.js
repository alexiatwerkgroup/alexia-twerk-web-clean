// TWERKHUB · Estadísticas — definiciones ÚNICAS (las usan el panel, el contador flotante y todos los endpoints).
// Nada de adivinar: cada número sale de datos medidos y su regla está escrita acá.
//
//  CARGA        = una página cargada y registrada (fila de tw_hits).
//  COOKIE       = navegador distinto (vid).
//  VISITANTE REAL (cv) = una cookie que dio señal de que hay una persona con la página abierta: al menos UNA de
//                   a) la pestaña mandó señal (tiempo activo mayor a 0 s: solo pasa si el JavaScript corrió y la pestaña estuvo visible),
//                   b) interactuó (human = 1: scroll, clic, toque),
//                   c) tiene sesión iniciada con una cuenta,
//                   d) hizo una acción medida (clic en pago/desbloqueo, reproducir en Novinhas, registro, etc.).
//  TRÁFICO AUTOMÁTICO = cookies que cargaron una página y NUNCA dieron señal (casi todas: 1 sola carga, desde datacenters de EE.UU./Países Bajos/Singapur/China).
//                   No son visitantes: se muestran aparte, en gris, para que se vea cuánto ruido hay.
//  INTERESADO (ci) = un visitante real que además tuvo 30 s o más activos EN UNA misma página, o tiene cuenta, o hizo una acción.
import { authenticate } from './auth.js';
import { json } from './http.js';
import { init, OWNER } from './analytics.js';

export const CONFIRM_SECONDS = 30; // segundos activos en una misma página para ser INTERESADO
export const ONLINE_MS = 90000; // la pestaña manda señal cada 30 s mientras está visible

// CTEs desde ?1 (ms): cv = visitantes reales, ci = interesados (subconjunto de cv). Se usan como  WITH ${REAL_CTE}
export const REAL_CTE = `cv AS (
  SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(dur) > 0 OR MAX(human) = 1 OR MAX(uid IS NOT NULL) = 1
  UNION
  SELECT vid FROM tw_events WHERE ts > ?1 AND name <> 'vid_time'),
ci AS (
  SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(dur) >= ${CONFIRM_SECONDS} OR MAX(uid IS NOT NULL) = 1
  UNION
  SELECT vid FROM tw_events WHERE ts > ?1 AND name <> 'vid_time')`;

export async function ownerOnly(request, env) {
  const identity = await authenticate(request, env);
  if (!identity?.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const row = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(row?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  await init(env.DB);
  return null;
}

export const NO_STORE = { 'Cache-Control': 'private, no-store' };

export function tzInfo(url, now = Date.now()) {
  const requested = parseInt(url.searchParams.get('tz'));
  const tz = Number.isFinite(requested) ? Math.max(-840, Math.min(840, requested)) : -180; // minutos al este de UTC
  const off = tz * 60; // segundos
  const local = new Date(now + tz * 60000);
  const todayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - tz * 60000;
  return { tz, off, todayStart };
}

export const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results || [];
