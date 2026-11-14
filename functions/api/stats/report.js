// GET /api/stats/report?range=today|month|all|7|30|90&tz=-180  -> SOLO DUEÑO. Histórico del período (el panel lo pide cada 1 hora o con el botón).
// Todos los números de personas usan la definición única de _lib/stats-core.js (CONFIRMADO).
import { json } from '../../_lib/http.js';
import { REAL_CTE, CONFIRM_SECONDS, BURST_MIN, ownerOnly, NO_STORE, tzInfo, all } from '../../_lib/stats-core.js';

// Intención de compra = clic en desbloquear, abrir el pago, copiar el ID de Binance o clic en crear cuenta Binance. NO son ventas confirmadas.
const INTENT = ['unlock_click', 'pay_open', 'copy_id', 'binance_ref'];

export async function onRequestGet({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const { tz, off, todayStart } = tzInfo(url, now);
  const rq = String(url.searchParams.get('range') || url.searchParams.get('days') || 'month');
  const range = ['today', 'week', 'month', 'all'].includes(rq) ? rq : ([1, 7, 30, 90].includes(parseInt(rq)) ? parseInt(rq) : 'month');
  const local = new Date(now + tz * 60000);
  const monthStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - tz * 60000;
  const prevMonthStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - tz * 60000;
  let since, prevSince = null, prevUntil = null, cmpLabel = '';
  if (range === 'today') { since = todayStart; prevSince = todayStart - 86400000; prevUntil = prevSince + (now - todayStart); cmpLabel = 'ayer a la misma hora'; }
  else if (range === 'week') { since = todayStart - 6 * 86400000; prevSince = since - 7 * 86400000; prevUntil = prevSince + (now - since); cmpLabel = 'los 7 días anteriores'; }
  else if (range === 'month') { since = monthStart; prevSince = prevMonthStart; prevUntil = Math.min(prevMonthStart + (now - monthStart), monthStart); cmpLabel = 'mismo tramo del mes anterior'; }
  else if (range === 'all') since = 0;
  else { since = now - range * 86400000; }
  const PREV_CTE = REAL_CTE.replace(/ts > \?1/g, 'ts > ?1 AND ts <= ?2');
  const qp = (sql) => db.prepare(`WITH ${PREV_CTE} ${sql}`).bind(prevSince, prevUntil);
  const q = (sql, ...extra) => db.prepare(`WITH ${REAL_CTE} ${sql}`).bind(since, ...extra);
  const D = `date(ts/1000+${off},'unixepoch')`;
  const INTENT_SQL = INTENT.map(n => `'${n}'`).join(',');
  const res = await db.batch([
    /*0*/ q(`SELECT (SELECT COUNT(*) FROM ci) interested, (SELECT COUNT(DISTINCT CASE WHEN is_new = 1 THEN vid END) FROM tw_hits WHERE ts > ?1 AND vid IN cv) newReal, (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1) loads, (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1) cookies, (SELECT COUNT(*) FROM cv) confirmed,
      (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1 AND vid IN cv) confirmedLoads,
      (SELECT COUNT(*) FROM (SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(dur) >= ${CONFIRM_SECONDS})) byTime,
      (SELECT COUNT(*) FROM (SELECT vid FROM tw_hits WHERE ts > ?1 GROUP BY vid HAVING MAX(uid IS NOT NULL) = 1)) byAccount,
      (SELECT COUNT(DISTINCT vid) FROM tw_events WHERE ts > ?1 AND name <> 'vid_time') byAction,
      (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND name <> 'vid_time') actions,
      (SELECT ROUND(AVG(t)) FROM (SELECT SUM(dur) t FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY vid)) avgSeconds`),
    /*1*/ q(`SELECT d, COUNT(*) u FROM (
        SELECT ${D} d, vid FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY d, vid HAVING MAX(dur) > 0 OR MAX(human) = 1 OR MAX(uid IS NOT NULL) = 1
        UNION
        SELECT ${D} d, vid FROM tw_events WHERE ts > ?1 AND name <> 'vid_time'
      ) GROUP BY d ORDER BY d`),
    /*2*/ q(`SELECT ${D} d, COUNT(*) loads, COUNT(DISTINCT vid) cookies FROM tw_hits WHERE ts > ?1 GROUP BY d ORDER BY d`),
    /*3*/ q(`SELECT CAST(strftime('%H', ts/1000+${off}, 'unixepoch') AS INTEGER) h, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY h ORDER BY h`),
    /*4*/ q(`SELECT country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND country <> '' AND vid IN cv GROUP BY country ORDER BY u DESC LIMIT 15`),
    /*5*/ q(`SELECT city, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND city <> '' AND vid IN cv GROUP BY city, country ORDER BY u DESC LIMIT 10`),
    /*6*/ q(`SELECT CASE WHEN ref = '' THEN 'Directo / sin dato' ELSE ref END k, COUNT(*) u FROM
        (SELECT vid, ref, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts) rn FROM tw_hits WHERE ts > ?1 AND vid IN cv) WHERE rn = 1 GROUP BY k ORDER BY u DESC LIMIT 12`),
    /*7*/ q(`SELECT CASE WHEN instr(path,'?') > 0 THEN substr(path,1,instr(path,'?')-1) ELSE path END path, COUNT(*) v, COUNT(DISTINCT vid) u, ROUND(AVG(CASE WHEN dur > 0 THEN dur END)) dur FROM tw_hits WHERE ts > ?1 AND vid IN cv AND path NOT LIKE '/admin%' GROUP BY 1 ORDER BY u DESC, v DESC LIMIT 15`),
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
    /*17*/ db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT vid) u, (SELECT MAX(ts) FROM tw_hits) lastHit, (SELECT COUNT(DISTINCT vid) FROM tw_events WHERE ts > ?1 AND name IN ('signup_done','nov_signup')) signups FROM tw_events WHERE ts > ?1 AND name IN (${INTENT_SQL})`).bind(since),
    /*18*/ q(`SELECT d, COUNT(*) u FROM (
        SELECT ${D} d, vid FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY d, vid HAVING MAX(dur) >= ${CONFIRM_SECONDS} OR MAX(uid IS NOT NULL) = 1
        UNION
        SELECT ${D} d, vid FROM tw_events WHERE ts > ?1 AND name <> 'vid_time'
      ) GROUP BY d ORDER BY d`),
  ].concat(prevSince == null ? [] : [
    /*19*/ qp(`SELECT (SELECT COUNT(*) FROM cv) confirmed, (SELECT COUNT(*) FROM ci) interested,
        (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1 AND ts <= ?2) loads,
        (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1 AND ts <= ?2) cookies,
        (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND ts <= ?2 AND name <> 'vid_time') actions,
        (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND ts <= ?2 AND name IN (${INTENT_SQL})) intent,
        (SELECT COUNT(DISTINCT vid) FROM tw_events WHERE ts > ?1 AND ts <= ?2 AND name IN (${INTENT_SQL})) intentPeople,
        (SELECT COUNT(*) FROM profiles WHERE registered_at >= datetime(?1/1000, 'unixepoch') AND registered_at < datetime(?2/1000, 'unixepoch')) accounts`),
    /*20*/ qp(`SELECT CAST((ts - ?1) / 86400000 AS INTEGER) i, COUNT(*) u FROM (
        SELECT MIN(ts) ts FROM tw_hits WHERE ts > ?1 AND ts <= ?2 AND vid IN cv GROUP BY date(ts/1000+${off},'unixepoch'), vid HAVING MAX(dur) > 0 OR MAX(human) = 1 OR MAX(uid IS NOT NULL) = 1
        UNION ALL
        SELECT MIN(ts) ts FROM tw_events WHERE ts > ?1 AND ts <= ?2 AND name <> 'vid_time' GROUP BY date(ts/1000+${off},'unixepoch'), vid
      ) GROUP BY i ORDER BY i`),
    /*21*/ qp(`SELECT country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND ts <= ?2 AND country <> '' AND vid IN cv GROUP BY country`),
    /*22*/ qp(`SELECT CASE WHEN ref = '' THEN 'Directo / sin dato' ELSE ref END k, COUNT(*) u FROM
        (SELECT vid, ref, ROW_NUMBER() OVER (PARTITION BY vid ORDER BY ts) rn FROM tw_hits WHERE ts > ?1 AND ts <= ?2 AND vid IN cv) WHERE rn = 1 GROUP BY k`),
    /*23*/ qp(`SELECT CASE WHEN instr(path,'?') > 0 THEN substr(path,1,instr(path,'?')-1) ELSE path END path, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND ts <= ?2 AND vid IN cv AND path NOT LIKE '/admin%' GROUP BY 1`),
  ]).concat([
    /*E0*/ q(`SELECT strftime('%Y-%m-%d %H', ts/1000+${off}, 'unixepoch') k, COUNT(DISTINCT vid) raw, COUNT(DISTINCT CASE WHEN vid IN cv THEN vid END) real FROM tw_hits WHERE ts > ?1 AND (dur > 0 OR human = 1 OR uid IS NOT NULL) GROUP BY k HAVING raw >= 12 ORDER BY raw DESC LIMIT 6`),
    /*E1*/ q(`SELECT ${D} d, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN burst AND (dur > 0 OR human = 1) GROUP BY d ORDER BY d`),
    /*E2*/ q(`SELECT CAST(strftime('%w', ts/1000+${off}, 'unixepoch') AS INTEGER) w, CAST(strftime('%H', ts/1000+${off}, 'unixepoch') AS INTEGER) h, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY w, h`),
    /*E3*/ q(`SELECT country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN burst AND country <> '' GROUP BY country ORDER BY u DESC LIMIT 8`),
    /*E4*/ q(`SELECT (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1 AND vid IN burst) burstCookies, (SELECT COUNT(*) FROM bm) burstMinutes`),
    /*E5*/ q(`SELECT COUNT(DISTINCT vid) total, COUNT(DISTINCT CASE WHEN ref IS NOT NULL AND ref <> '' THEN vid END) conRef FROM tw_hits WHERE ts > ?1 AND vid NOT IN cv AND vid NOT IN burst`),
  ]));
  const one = i => (res[i].results || [])[0] || {};
  const base = 19 + (prevSince == null ? 0 : 5);
  const peakRows = res[base].results || [];
  const peaks = [];
  if (peakRows.length) {
    const ks = peakRows.map(r => r.k), ph2 = ks.map((_, i) => `?${i + 2}`).join(',');
    const KB = `strftime('%Y-%m-%d %H', ts/1000+${off}, 'unixepoch')`;
    const [pc, pf, pw] = await Promise.all([
      all(db, `WITH ${REAL_CTE} SELECT ${KB} k, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND (dur > 0 OR human = 1 OR uid IS NOT NULL) AND country <> '' AND ${KB} IN (${ph2}) GROUP BY k, c ORDER BY u DESC`, since, ...ks),
      all(db, `WITH ${REAL_CTE} SELECT ${KB} k, browser || ' · ' || os || ' · ' || device fp, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN burst AND ${KB} IN (${ph2}) GROUP BY k, fp ORDER BY u DESC`, since, ...ks),
      all(db, `WITH ${REAL_CTE} SELECT ${KB} k, MIN(ts) a, MAX(ts) b, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?1 AND vid IN burst AND ${KB} IN (${ph2}) GROUP BY k`, since, ...ks),
    ]);
    for (const r of peakRows) {
      const bots = Math.max(0, r.raw - r.real), share = r.raw ? bots / r.raw : 0, w = pw.find(x => x.k === r.k) || {}, fp = pf.find(x => x.k === r.k);
      peaks.push({ k: r.k, raw: r.raw, real: r.real, bots, burst: w.u || 0, windowSeconds: w.a ? Math.max(1, Math.round((w.b - w.a) / 1000)) : 0,
        verdict: share >= 0.5 ? 'robots' : share <= 0.15 ? 'real' : 'mixto',
        countries: pc.filter(x => x.k === r.k).slice(0, 4).map(x => ({ c: x.c, u: x.u })), fingerprint: fp ? { fp: fp.fp, u: fp.u } : null });
    }
    peaks.sort((x, y) => y.bots - x.bots || y.raw - x.raw);
  }
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
    return { vid: v.vid, uid: v.uid || '', first: v.first, last: v.last, loads: v.loads, dur: v.dur || 0, user: v.uid ? nameBy[v.uid] || '' : '', country: v.country, city: v.city, device: v.device, browser: v.browser, os: v.os,
      ref: refBy[v.vid] || '', pages: pages.slice(0, 4), morePages: Math.max(0, pages.length - 4), events: events.slice(0, 5), reasons };
  });
  const loads = k.loads || 0, confirmedLoads = k.confirmedLoads || 0;
  return json({
    ok: true, now, range, tz, fromTs: since || (one(16).first) || now, cmpLabel, confirmSeconds: CONFIRM_SECONDS, since: (one(16).first) || null,
    kpi: { loads, cookies: k.cookies || 0, confirmed: k.confirmed || 0, byTime: k.byTime || 0, byAccount: k.byAccount || 0, byAction: k.byAction || 0, actions: k.actions || 0,
      interested: k.interested || 0, newReal: k.newReal || 0, avgSeconds: k.avgSeconds || 0, unconfirmedLoads: Math.max(0, loads - confirmedLoads), unconfirmedCookies: Math.max(0, (k.cookies || 0) - (k.confirmed || 0)),
      accountsTotal: one(12).total || 0, accountsInPeriod: (res[13].results || []).reduce((a, r) => a + r.n, 0),
      lastHit: one(17).lastHit || null, signups: one(17).signups || 0, intent: one(17).n || 0, intentPeople: one(17).u || 0 },
    prev: prevSince == null ? null : { since: prevSince, until: prevUntil, ...one(19), byIndex: res[20].results || [], countries: res[21].results || [], refs: res[22].results || [], pages: res[23].results || [] },
    peaks, botsByDay: res[base + 1].results || [], heat: res[base + 2].results || [], botCountries: res[base + 3].results || [], noSignal: { total: ((res[base + 5].results || [])[0] || {}).total || 0, conRef: ((res[base + 5].results || [])[0] || {}).conRef || 0 }, burst: { cookies: ((res[base + 4].results || [])[0] || {}).burstCookies || 0, minutes: ((res[base + 4].results || [])[0] || {}).burstMinutes || 0, min: BURST_MIN },
    byDay: res[1].results || [], interestedByDay: res[18].results || [], loadsByDay: res[2].results || [], byHour: res[3].results || [], countries: res[4].results || [], cities: res[5].results || [],
    refs: res[6].results || [], pages: res[7].results || [], devices: res[8].results || [], browsers: res[9].results || [], oses: res[10].results || [],
    actions: res[11].results || [], accountsByDay: res[13].results || [], marks: res[14].results || [], visitors: list,
  }, 200, '', NO_STORE);
}
