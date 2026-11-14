// GET /api/stats/who?uid=<id>  |  ?vid=<cookie>  -> SOLO DUEÑO. Ficha completa de una persona (tarjeta al pasar el mouse en el panel).
// No devuelve mail ni datos de contacto: solo comportamiento medido y estado de la cuenta.
import { json } from '../../_lib/http.js';
import { CONFIRM_SECONDS, ownerOnly, NO_STORE, all } from '../../_lib/stats-core.js';

const ID = /^[A-Za-z0-9_-]{6,64}$/;

export async function onRequestGet({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url);
  const uid = String(url.searchParams.get('uid') || ''), vidParam = String(url.searchParams.get('vid') || '');
  if (uid ? !ID.test(uid) : !ID.test(vidParam)) return json({ ok: false, error: 'bad_id' }, 400, '', NO_STORE);
  const safe = async (sql, ...a) => { try { return await all(db, sql, ...a); } catch (e) { return []; } };

  let profile = null, email = '', vids = [];
  if (uid) {
    const p = (await safe('SELECT id, email, username, tier, tokens, total_earned, streak, registered_at, last_seen_at, last_active_at, seconds_on_site, cuts_watched, country FROM profiles WHERE id = ?1', uid))[0];
    if (!p) return json({ ok: false, error: 'not_found' }, 404, '', NO_STORE);
    email = String(p.email || '').toLowerCase();
    profile = { username: p.username || '', tier: p.tier || '', coins: p.tokens || 0, earned: p.total_earned || 0, streak: p.streak || 0, registered: p.registered_at || null, lastSeen: p.last_seen_at || p.last_active_at || null, secondsOnSite: p.seconds_on_site || 0, cutsWatched: p.cuts_watched || 0, country: p.country || '' };
    vids = (await safe('SELECT DISTINCT vid FROM tw_hits WHERE uid = ?1 LIMIT 30', uid)).map(r => r.vid);
  } else vids = [vidParam];
  if (!vids.length) vids = ['-'];
  const ph = vids.map((_, i) => `?${i + 1}`).join(',');

  const [agg, days, countries, cities, devices, firstRef, pages, last, events, evNames] = await Promise.all([
    safe(`SELECT COUNT(*) loads, COUNT(DISTINCT vid) cookies, MIN(ts) first, MAX(COALESCE(last_active, ts)) last, SUM(dur) dur, MAX(dur) maxdur, ROUND(AVG(CASE WHEN scroll > 0 THEN scroll END)) scroll, MAX(human) human FROM tw_hits WHERE vid IN (${ph})`, ...vids),
    safe(`SELECT COUNT(DISTINCT date(ts/1000, 'unixepoch')) n FROM tw_hits WHERE vid IN (${ph})`, ...vids),
    safe(`SELECT country c, COUNT(*) n FROM tw_hits WHERE vid IN (${ph}) AND country <> '' GROUP BY country ORDER BY n DESC LIMIT 3`, ...vids),
    safe(`SELECT city, country c, COUNT(*) n FROM tw_hits WHERE vid IN (${ph}) AND city <> '' GROUP BY city, country ORDER BY n DESC LIMIT 3`, ...vids),
    safe(`SELECT device, browser, os, COUNT(*) n FROM tw_hits WHERE vid IN (${ph}) GROUP BY device, browser, os ORDER BY n DESC LIMIT 3`, ...vids),
    safe(`SELECT ref FROM tw_hits WHERE vid IN (${ph}) ORDER BY ts LIMIT 1`, ...vids),
    safe(`SELECT CASE WHEN instr(path,'?') > 0 THEN substr(path,1,instr(path,'?')-1) ELSE path END path, COUNT(*) loads, SUM(dur) dur FROM tw_hits WHERE vid IN (${ph}) GROUP BY 1 ORDER BY loads DESC, dur DESC LIMIT 6`, ...vids),
    safe(`SELECT ts, path, dur, scroll, ref FROM tw_hits WHERE vid IN (${ph}) ORDER BY ts DESC LIMIT 8`, ...vids),
    safe(`SELECT ts, name, detail FROM tw_events WHERE vid IN (${ph}) AND name <> 'vid_time' ORDER BY ts DESC LIMIT 12`, ...vids),
    safe(`SELECT name, COUNT(*) n FROM tw_events WHERE vid IN (${ph}) AND name <> 'vid_time' GROUP BY name ORDER BY n DESC`, ...vids),
  ]);
  const a = agg[0] || {};
  const body = {
    ok: true, now: Date.now(), kind: uid ? 'cuenta' : 'visitante', profile, confirmSeconds: CONFIRM_SECONDS,
    visits: { loads: a.loads || 0, cookies: a.cookies || 0, days: (days[0] || {}).n || 0, first: a.first || null, last: a.last || null, seconds: a.dur || 0, maxSeconds: a.maxdur || 0, scroll: a.scroll || 0, interacted: !!a.human },
    countries, cities, devices, firstRef: (firstRef[0] || {}).ref || '', pages, last, events, eventCounts: evNames,
  };
  // Veredicto simple y explicado: persona o robot probable.
  const real = !!(a.human || uid || (events.length)), sig = (a.maxdur || 0) > 0;
  body.verdict = real ? 'persona' : sig ? ((a.loads || 0) === 1 && (a.maxdur || 0) >= 18 && (a.maxdur || 0) <= 35 ? 'robot probable' : 'con señal') : 'sin señal (robot probable)';
  if (uid) {
    const [unlocks, coins, comments, views, catalog] = await Promise.all([
      safe('SELECT n, via, at FROM jenny_unlocks WHERE email = ?1 ORDER BY at DESC LIMIT 20', email),
      safe('SELECT delta, balance_after, kind, created_at FROM coin_movements WHERE email = ?1 ORDER BY created_at DESC LIMIT 8', email),
      safe('SELECT COUNT(*) n FROM video_comments WHERE user_id = ?1', uid),
      safe('SELECT COUNT(*) n, COUNT(DISTINCT video_slug) u FROM user_video_views WHERE user_id = ?1', uid),
      safe('SELECT COUNT(*) n FROM catalog_unlocks WHERE email = ?1', email),
    ]);
    body.account = { unlocks: unlocks.length, unlocksVia: unlocks.reduce((o, r) => { o[r.via || '?'] = (o[r.via || '?'] || 0) + 1; return o; }, {}), catalogUnlocks: (catalog[0] || {}).n || 0, comments: (comments[0] || {}).n || 0, videoViews: (views[0] || {}).n || 0, videosDistinct: (views[0] || {}).u || 0, coinMoves: coins };
  }
  return json(body, 200, '', NO_STORE);
}
