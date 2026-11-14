// GET /api/stats/report?days=30&tz=-180  -> SOLO DUEÑO. Histórico del período (el panel lo pide cada 1 hora o con el botón).
// Todos los números de personas usan la definición única de _lib/stats-core.js (CONFIRMADO).
import { json } from '../../_lib/http.js';
import { REAL_CTE, CONFIRM_SECONDS, ownerOnly, NO_STORE, tzInfo, all } from '../../_lib/stats-core.js';

export async function onRequestGet({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const days = [1, 7, 30, 90].includes(parseInt(url.searchParams.get('days'))) ? parseInt(url.searchParams.get('days')) : 30;
  const { tz, off } = tzInfo(url, now);
  const since = now - days * 86400000;
  const q = (sql, ...extra) => db.prepare(`WITH ${REAL_CTE} ${sql}`).bind(since, ...extra);
  const D = `date(ts/1000+${off},'unixepoch')`;
  const res = await db.batch([
    /*0*/ q(`SELECT (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1) loads, (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1) cookies, (SELECT COUNT(*) FROM cv) confirmed,
      (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1 AND vid IN cv) confirmedLoads,
      (SELECT COUNT(*) FROM (SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(dur) >= ${CONFIRM_SECONDS})) byTime,
      (SELECT COUNT(*) FROM (SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(uid IS NOT NULL) = 1)) byAccount,
      (SELECT COUNT(DISTINCT vid) FROM tw_events WHERE ts > ?1 AND name <> 'vid_time') byAction,
      (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND name <> 'vid_time') actions,
      (SELECT ROUND(AVG(t)) FROM (SELECT SUM(dur) t FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY vid)) avgSeconds`),
    /*1*/ q(`SELECT d, COUNT(*) u FROM (
        SELECT ${D} d, vid FROM tw_hits WHERE ts > ?1 GROUP BY d, vid HAVING MAX(dur) >= ${CONFIRM_SECONDS} OR MAX(uid IS NOT NULL) = 1
        UNION
        SELECT ${D} d, vid FROM tw_events WHERE ts > ?1 AND name <> 'vid_time'
      ) GROUP BY d ORDER BY d`),
    /*2*/ q(`SELECT ${D} d, COUNT(*) loads, COUNT(DISTINCT vid) cookies FROM tw_hits WHERE ts > ?1 GROUP BY d ORDER BY d`),
    /*3*/ q(`SELECT CAST(strftime('%H', ts/1000+${off}, 'unixepoch') AS INTEGER) h, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY h ORDER BY h`),
    /*4*/ q(`SELECT country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND country <> '' AND vid IN cv GROUP BY country ORDER BY u DESC LIMIT 15`),
    /*5*/ q(`SELECT city, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND city <> '' AND vid IN cv GROUP BY city, country ORDER BY u DESC LIMIT 10`),
    /*6*/ q(`SELECT CASE WHEN ref = '' THEN 'Directo / sin dato' ELSE ref END k, COUNT(*) u FROM
        (SELECT vid, ref, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts) rn FROM tw_hits WHERE ts > ?1 AND vid IN cv) WHERE rn = 1 GROUP BY k ORDER BY u DESC LIMIT 12`),
    /*7*/ q(`SELECT path, COUNT(*) v, COUNT(DISTINCT vid) u, ROUND(AVG(CASE WHEN dur > 0 THEN dur END)) dur FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY path ORDER BY u DESC, v DESC LIMIT 15`),
    /*8*/ q(`SELECT device k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND device <> '' AND vid IN cv GROUP BY device ORDER BY u DESC`),
    /*9*/ q(`SELECT browser k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND browser <> '' AND vid IN cv GROUP BY browser ORDER BY u DESC`),
    /*10*/ q(`SELECT os k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND os <> '' AND vid IN cv GROUP BY os ORDER BY u DESC`),
    /*11*/ q(`SELECT name, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ?1 AND name <> 'vid_time' GROUP BY name ORDER BY n DESC`),
    /*12*/ db.prepare('SELECT COUNT(*) total FROM profiles'),
    /*13*/ db.prepare(`SELECT date(strftime('%s', registered_at) + ${off}, 'unixepoch') d, COUNT(*) n FROM profiles WHERE registered_at >= datetime(?1/1000, 'unixepoch') GROUP BY d ORDER BY d`).bind(since),
    /*14*/ db.prepare('SELECT id, ts, label, channel FROM tw_marks WHERE ts > ?1 ORDER BY ts DESC LIMIT 100').bind(since),
    /*15*/ q(`SELECT vid, MIN(ts) first, MAX(COALESCE(last_active, ts)) last, COUNT(*) loads, SUM(dur) dur, MAX(dur) maxdur, MAX(uid) uid, MAX(country) country, MAX(city) city, MAX(device) device, MAX(browser) browser, MAX(os) os, group_concat(DISTINCT path) paths
        FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY vid ORDER BY last DESC LIMIT 60`),
    /*16*/ db.prepare("SELECT MIN(ts) first FROM tw_hits"),
  ]);
  const one = i => (res[i].results || [])[0] || {};
  const k = one(0);
  const visitors = res[15].results || [];
  const vids = visitors.map(v => v.vid), ph = vids.map((_, i) => `?${i + 2}`).join(',');
  const uids = [...new Set(visitors.map(v => v.uid).filter(Boolean))];
  const [ev, firstRef, names] = await Promise.all([
    vids.length ? all(db, `SELECT vid, name, detail FROM tw_events WHERE ts > ?1 AND name <> 'vid_time' AND vid IN (${ph}) ORDER BY ts`, since, ...vids) : [],
    vids.length ? all(db, `SELECT vid, ref FROM (SELECT vid, ref, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts) rn FROM tw_hits WHERE ts > ?1 AND vid IN (${ph})) WHERE rn = 1`, since, ...vids) : [],
    uids.length ? all(db, `SELECT id, username FROM profiles WHERE id IN (${uids.map((_, i) => `?${i + 1}`).join(',')})`, ...uids) : [],
  ]);
  const evBy = {}, refBy = Object.fromEntries(firstRef.map(r => [r.vid, r.ref])), nameBy = Object.fromEntries(names.map(p => [p.id, p.username || '']));
  for (const e of ev) (evBy[e.vid] = evBy[e.vid] || []).push(e.name + (e.detail ? ' · ' + e.detail : ''));
  const list = visitors.map(v => {
    const events = evBy[v.vid] || [], reasons = [];
    if ((v.maxdur || 0) >= CONFIRM_SECONDS) reasons.push('tiempo');
    if (v.uid) reasons.push('cuenta');
    if (events.length) reasons.push('acción');
    const pages = String(v.paths || '').split(',');
    return { first: v.first, last: v.last, loads: v.loads, dur: v.dur || 0, user: v.uid ? nameBy[v.uid] || '' : '', country: v.country, city: v.city, device: v.device, browser: v.browser, os: v.os,
      ref: refBy[v.vid] || '', pages: pages.slice(0, 4), morePages: Math.max(0, pages.length - 4), events: events.slice(0, 5), reasons };
  });
  const loads = k.loads || 0, confirmedLoads = k.confirmedLoads || 0;
  return json({
    ok: true, now, days, tz, confirmSeconds: CONFIRM_SECONDS, since: (one(16).first) || null,
    kpi: { loads, cookies: k.cookies || 0, confirmed: k.confirmed || 0, byTime: k.byTime || 0, byAccount: k.byAccount || 0, byAction: k.byAction || 0, actions: k.actions || 0,
      avgSeconds: k.avgSeconds || 0, unconfirmedLoads: Math.max(0, loads - confirmedLoads), unconfirmedCookies: Math.max(0, (k.cookies || 0) - (k.confirmed || 0)),
      accountsTotal: one(12).total || 0, accountsInPeriod: (res[13].results || []).reduce((a, r) => a + r.n, 0) },
    byDay: res[1].results || [], loadsByDay: res[2].results || [], byHour: res[3].results || [], countries: res[4].results || [], cities: res[5].results || [],
    refs: res[6].results || [], pages: res[7].results || [], devices: res[8].results || [], browsers: res[9].results || [], oses: res[10].results || [],
    actions: res[11].results || [], accountsByDay: res[13].results || [], marks: res[14].results || [], visitors: list,
  }, 200, '', NO_STORE);
}
