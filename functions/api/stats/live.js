// GET /api/stats/live?tz=-180[&lite=1]  -> SOLO DUEÑO. Lo que tiene que verse al instante (el panel lo pide cada 5 s).
import { json } from '../../_lib/http.js';
import { REAL_CTE, ACTIVE_SECONDS, VALID_EVENT_SQL, ONLINE_MS, CONFIRM_SECONDS, ownerOnly, NO_STORE, tzInfo, all } from '../../_lib/stats-core.js';

// Hoy / semana (7 dias) / total: se recalcula cada 2 min (el panel pide /live cada 5 s y el total recorre toda la tabla).
let PCACHE = { t: 0, v: null };
async function periods(db, todayStart) {
  if (PCACHE.v && Date.now() - PCACHE.t < 120000 && PCACHE.d === todayStart) return PCACHE.v;
  const per = since => db.prepare(`WITH ${REAL_CTE} SELECT (SELECT COUNT(*) FROM cv) confirmed, (SELECT COUNT(*) FROM ci) interested, (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND ${VALID_EVENT_SQL} AND vid IN cv) actions, (SELECT ROUND(AVG(t)) FROM (SELECT SUM(${ACTIVE_SECONDS}) t FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY vid)) avgSeconds`).bind(since);
  const r = await db.batch([per(todayStart), per(todayStart - 6 * 86400000), per(0), db.prepare("SELECT SUM(CASE WHEN registered_at >= datetime(?1/1000,'unixepoch') THEN 1 ELSE 0 END) week FROM profiles").bind(todayStart - 6 * 86400000)]);
  const g = i => (r[i].results || [])[0] || {};
  const m = o => ({ confirmed: o.confirmed || 0, interested: o.interested || 0, actions: o.actions || 0, avgSeconds: o.avgSeconds || 0 });
  PCACHE = { t: Date.now(), d: todayStart, v: { today: m(g(0)), week: m(g(1)), all: m(g(2)), accountsWeek: g(3).week || 0 } };
  return PCACHE.v;
}
export async function onRequestGet({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const { todayStart } = tzInfo(url, now);
  const since24 = now - 86400000, hourAgo = now - 3600000, onlineSince = now - ONLINE_MS;
  const lite = url.searchParams.get('lite') === '1';
  const counts = since => db.prepare(`WITH ${REAL_CTE} SELECT (SELECT COUNT(*) FROM cv) confirmed, (SELECT COUNT(*) FROM ci) interested, (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1) loads, (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1) cookies, (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND ${VALID_EVENT_SQL} AND vid IN cv) actions`).bind(since);
  const stmts = [
    counts(todayStart),
    counts(hourAgo),
    db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN registered_at >= datetime(?1/1000,'unixepoch') THEN 1 ELSE 0 END) today FROM profiles").bind(todayStart),
    db.prepare(`WITH ${REAL_CTE} SELECT COUNT(DISTINCT vid) n FROM tw_hits WHERE last_active > ${onlineSince} AND (dur > 0 OR human = 1 OR last_engaged IS NOT NULL OR uid IS NOT NULL OR last_active - ts > 2000) AND vid IN cv`).bind(now - 3 * 3600000),
  ];
  if (!lite) stmts.push(
    db.prepare(`WITH ${REAL_CTE} SELECT h.vid, h.path, h.country, h.city, h.device, h.browser, h.os, h.ref, ${ACTIVE_SECONDS} dur, h.scroll, h.uid, h.ts, h.last_active, h.last_engaged
      FROM tw_hits h JOIN (SELECT vid, MAX(last_active) la FROM tw_hits WHERE last_active > ${onlineSince} AND (dur > 0 OR human = 1 OR last_engaged IS NOT NULL OR uid IS NOT NULL OR last_active - ts > 2000) GROUP BY vid) x ON x.vid = h.vid AND x.la = h.last_active
      WHERE h.vid IN cv ORDER BY h.last_active DESC LIMIT 80`).bind(now - 3 * 3600000),
    db.prepare(`WITH ${REAL_CTE} SELECT e.ts, e.name, e.detail, e.vid, h.uid, h.country, h.city FROM tw_events e LEFT JOIN tw_hits h ON h.hid = e.hid WHERE ${VALID_EVENT_SQL.replaceAll('name', 'e.name')} AND e.vid IN cv ORDER BY e.ts DESC LIMIT 15`).bind(now - 86400000),
    db.prepare('SELECT id, username, country, registered_at, tier FROM profiles ORDER BY registered_at DESC LIMIT 6'),
  );
  const res = await db.batch(stmts);
  const first = i => (res[i].results || [])[0] || {};
  const t = first(0), h = first(1), acc = first(2), on = first(3);
  const body = {
    ok: true, now, confirmSeconds: CONFIRM_SECONDS, onlineSeconds: ONLINE_MS / 1000,
    today: { confirmed: t.confirmed || 0, interested: t.interested || 0, loads: t.loads || 0, cookies: t.cookies || 0, actions: t.actions || 0 },
    lastHour: { confirmed: h.confirmed || 0, interested: h.interested || 0, loads: h.loads || 0, cookies: h.cookies || 0, actions: h.actions || 0 },
    accounts: { total: acc.total || 0, today: acc.today || 0 },
    onlineCookies: on.n || 0,
  };
  try { body.periods = await periods(db, todayStart); } catch (e) { body.periodsErr = String(e && e.message || e).slice(0, 120); }
  if (lite) return json(body, 200, '', NO_STORE);

  // ---- quién está ahora, con la evidencia de cada uno (últimas 24 h) ----
  const seen = new Set(), online = [];
  for (const r of res[4].results || []) { if (seen.has(r.vid)) continue; seen.add(r.vid); online.push(r); }
  const vids = online.map(r => r.vid), ph = vids.map((_, i) => `?${i + 2}`).join(',');
  const [dur, ev] = vids.length ? await Promise.all([
    all(db, `SELECT vid, SUM(${ACTIVE_SECONDS}) dur, MAX(${ACTIVE_SECONDS}) maxdur, COUNT(*) loads, MAX(uid IS NOT NULL) acc FROM tw_hits WHERE ts > ?1 AND vid IN (${ph}) GROUP BY vid`, since24, ...vids),
    all(db, `SELECT vid, ts, name, detail FROM tw_events WHERE ts > ?1 AND ${VALID_EVENT_SQL} AND vid IN (${ph}) ORDER BY ts DESC`, since24, ...vids),
  ]) : [[], []];
  const durBy = Object.fromEntries(dur.map(r => [r.vid, r]));
  const evBy = {};
  for (const e of ev) (evBy[e.vid] = evBy[e.vid] || []).push({ ts: e.ts, name: e.name, detail: e.detail });
  const uids = [...new Set(online.map(r => r.uid).concat((res[5].results || []).map(e => e.uid)).filter(Boolean))];
  const names = {};
  if (uids.length) for (const p of await all(db, `SELECT id, username FROM profiles WHERE id IN (${uids.map((_, i) => `?${i + 1}`).join(',')})`, ...uids)) names[p.id] = p.username || '';
  body.online = online.map(r => {
    const d = durBy[r.vid] || {}, events = evBy[r.vid] || [];
    const reasons = [];
    if ((d.maxdur || 0) >= CONFIRM_SECONDS) reasons.push('tiempo');
    if (r.uid || d.acc) reasons.push('cuenta');
    if (events.length) reasons.push('acción');
    return { vid: r.vid.slice(0, 6), vidFull: r.vid, uid: r.uid || '', user: r.uid ? names[r.uid] || '' : '', country: r.country, city: r.city, device: r.device, browser: r.browser, os: r.os, ref: r.ref, path: r.path,
      enteredAt: r.ts, lastSignal: r.last_active, lastEngaged: r.last_engaged || null, dur: r.dur || 0, scroll: r.scroll || 0, maxDur24h: d.maxdur || 0, loads24h: d.loads || 1, events: events.slice(0, 4), confirmed: true, reasons };
  });
  // Últimos conectados (24 h): UNA fila por visitante real, con recorrido, tiempo, registro y si es hunter.
  body.recent = [];
  try {
    const rv = await all(db, `WITH ${REAL_CTE} SELECT vid, MAX(last_active) la, MIN(ts) first, MAX(uid) uid, COUNT(*) loads, SUM(${ACTIVE_SECONDS}) dur FROM tw_hits WHERE ts > ?1 AND vid IN cv GROUP BY vid ORDER BY la DESC LIMIT 40`, now - 86400000);
    const rids = rv.map(r => r.vid);
    if (rids.length) {
      const rph = rids.map((_, i) => `?${i + 2}`).join(',');
      const pages = await all(db, `SELECT vid, path, ts, ${ACTIVE_SECONDS} dur, scroll, country, city, device, browser, os, ref, uid FROM tw_hits WHERE ts > ?1 AND vid IN (${rph}) ORDER BY ts ASC`, now - 86400000, ...rids);
      const byV = {}; pages.forEach(h => { (byV[h.vid] = byV[h.vid] || []).push(h); });
      const ruids = [...new Set(rv.map(r => r.uid).filter(Boolean))];
      const prof = {}, hunt = {};
      if (ruids.length) {
        const uph = ruids.map((_, i) => `?${i + 1}`).join(',');
        for (const p of await all(db, `SELECT id, username, country, registered_at FROM profiles WHERE id IN (${uph})`, ...ruids)) prof[p.id] = p;
        try { for (const h of await all(db, `SELECT uid, joined, cat FROM nv_hunt WHERE uid IN (${uph})`, ...ruids)) hunt[h.uid] = h; } catch (e) {}
      }
      const hl = {};
      try { for (const h of await all(db, `SELECT vid, kind, COUNT(*) n, MAX(ts) last FROM nv_hunt_log WHERE vid IN (${rph.replace(/\?(\d+)/g, (m, d) => '?' + (Number(d) - 1))}) GROUP BY vid, kind`, ...rids)) { (hl[h.vid] = hl[h.vid] || {})[h.kind] = h; } } catch (e) {}
      body.recent = rv.map(r => {
        const hs = byV[r.vid] || [], f = hs[0] || {}, pr = r.uid ? prof[r.uid] : null, hu = r.uid ? hunt[r.uid] : null;
        return { vid: r.vid.slice(0, 6), vidFull: r.vid, uid: r.uid || '', user: pr ? pr.username || '' : '', registered: !!r.uid, registeredAt: pr ? pr.registered_at : null,
          hunter: !!(hu && hu.joined), hunterCat: hu ? String(hu.cat || '') : '', country: f.country || '', city: f.city || '', device: f.device, browser: f.browser, os: f.os, ref: f.ref || '',
          firstAt: r.first, lastAt: r.la, loads: r.loads, dur: r.dur || 0,
          banner: (() => { const x = hl[r.vid] || {}, c1 = x.cat1, c2 = x.cat2; return { shown: x.play ? x.play.n : 0, choice: c1 || c2 ? ((c1 ? c1.last : 0) >= (c2 ? c2.last : 0) ? 'content' : 'money') : '', closed: x.close ? x.close.n : 0, later: x.later ? x.later.n : 0, reg: x.reg ? x.reg.n : 0, contact: x.contact ? x.contact.n : 0 }; })(),
          journey: hs.slice(-8).map(h => ({ path: h.path, ts: h.ts, dur: h.dur || 0, scroll: h.scroll || 0 })) };
      });
    }
  } catch (e) { body.recentErr = String(e && e.message || e).slice(0, 120); }
  body.recentActions = (res[5].results || []).map(e => ({ vid: e.vid, uid: e.uid || '', ts: e.ts, name: e.name, detail: e.detail, country: e.country, city: e.city, user: e.uid ? names[e.uid] || '' : '' }));
  body.latestAccounts = res[6].results || [];
  return json(body, 200, '', NO_STORE);
}
