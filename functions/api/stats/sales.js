// /api/stats/sales  -> SOLO DUEÑO. Ventas / dinero generado (registro manual: PayPal, Binance, Patreon, etc.).
//  GET                         -> {items (ultimas 100), totals {today, week, month, all}, byVia}
//  POST {amount, concept, via, ts?} -> suma una venta
//  DELETE ?id=N                -> borra una venta
// Ojo: nv_don (ranking de donadores) tiene filas de prueba, NO es dinero real y no se cuenta aca.
import { json } from '../../_lib/http.js';
import { ownerOnly, NO_STORE, tzInfo } from '../../_lib/stats-core.js';

async function ensure(db) {
  const had = await db.prepare("SELECT 1 x FROM sqlite_master WHERE type = 'table' AND name = 'nv_sales'").first();
  await db.prepare('CREATE TABLE IF NOT EXISTS nv_sales (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, amount REAL NOT NULL, concept TEXT, via TEXT, ref TEXT UNIQUE)').run();
  if (!had) { // ventas VIP ya confirmadas (15 nov 2026); solo se siembran al crear la tabla
    await db.prepare('INSERT OR IGNORE INTO nv_sales (ts, amount, concept, via, ref) VALUES (?, 49.99, ?, ?, ?)').bind(Date.UTC(2026, 10, 15, 19, 1, 8), 'VIP 30 días · supsi93 / Reginard', 'Discord', 'vip-f3aae7').run();
    await db.prepare('INSERT OR IGNORE INTO nv_sales (ts, amount, concept, via, ref) VALUES (?, 49.99, ?, ?, ?)').bind(Date.UTC(2026, 10, 15, 22, 55, 0), 'VIP 30 días · Vincent FaDiez (Zorel911)', 'PayPal', 'paypal-5KY59402TU592614K').run();
  }
}

export async function onRequest({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url), now = Date.now();
  await ensure(db);
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!(amount > 0 && amount < 100000)) return json({ ok: false, error: 'bad_amount' }, 400);
    const concept = String(b.concept || '').trim().slice(0, 80), via = String(b.via || '').trim().slice(0, 20);
    let ts = Number(b.ts) || now; ts = Math.min(ts, now + 86400000);
    await db.prepare('INSERT INTO nv_sales (ts, amount, concept, via) VALUES (?, ?, ?, ?)').bind(ts, amount, concept, via).run();
    return json({ ok: true }, 200, '', NO_STORE);
  }
  if (request.method === 'DELETE') {
    const id = parseInt(url.searchParams.get('id'), 10); if (!(id > 0)) return json({ ok: false, error: 'bad_id' }, 400);
    await db.prepare('DELETE FROM nv_sales WHERE id = ?').bind(id).run();
    return json({ ok: true }, 200, '', NO_STORE);
  }
  const { tz, todayStart } = tzInfo(url, now);
  const local = new Date(now + tz * 60000), monthStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - tz * 60000;
  const tot = since => db.prepare('SELECT COALESCE(SUM(amount), 0) s, COUNT(*) n FROM nv_sales WHERE ts >= ?').bind(since);
  const r = await db.batch([tot(todayStart), tot(todayStart - 6 * 86400000), tot(monthStart), tot(0),
    db.prepare("SELECT COALESCE(NULLIF(via, ''), 'Otro') via, SUM(amount) s, COUNT(*) n FROM nv_sales GROUP BY 1 ORDER BY s DESC"),
    db.prepare('SELECT id, ts, amount, concept, via FROM nv_sales ORDER BY ts DESC LIMIT 100')]);
  const g = i => (r[i].results || [])[0] || {}, m = i => ({ amount: Math.round((g(i).s || 0) * 100) / 100, n: g(i).n || 0 });
  return json({ ok: true, totals: { today: m(0), week: m(1), month: m(2), all: m(3) }, byVia: r[4].results || [], items: r[5].results || [] }, 200, '', NO_STORE);
}
