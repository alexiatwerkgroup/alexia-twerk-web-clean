// TWERKHUB · Estadísticas — definiciones ÚNICAS (las usan el panel, el contador flotante y todos los endpoints).
// Nada de adivinar: cada número sale de datos medidos y su regla está escrita acá.
//
//  CARGA        = una página cargada y registrada (fila de tw_hits).
//  COOKIE       = navegador distinto (vid).
//  CONFIRMADO   = una cookie que, dentro de la ventana consultada, cumple AL MENOS UNA de estas tres cosas:
//                   a) tuvo 60 s o más de tiempo activo (pestaña visible) EN UNA MISMA página (no se suman páginas: así un visitante que solo pasa 25 s por cada una no se confirma);
//                   b) tiene sesión iniciada con una cuenta;
//                   c) hizo una acción medida (clic en pago/desbloqueo/seguir, reproducir en Novinhas, registro, etc.).
//                 Las cookies que solo cargaron páginas sin ninguna de las tres NO se cuentan como visitantes.
import { authenticate } from './auth.js';
import { json } from './http.js';
import { init, OWNER } from './analytics.js';

export const CONFIRM_SECONDS = 60;
export const ONLINE_MS = 90000; // la pestaña manda señal cada 30 s mientras está visible

// CTE "cv": cookies confirmadas desde ?1 (ms). Se usa como  WITH cv AS (...)
export const REAL_CTE = `cv AS (
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
