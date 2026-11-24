// Monthly donor ranking. Public rows come only from confirmed payment records;
// the legacy nv_don table contained preview data and is intentionally ignored.
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { ensureCoinLedger } from '../../_lib/coin-ledger.js';

const CAP = { 1000: 1, 500: 5, 100: 7 };
const J = (o, s = 200, cc = 'no-store') => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': cc, 'X-Robots-Tag': 'noindex' } });
const validEmail = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

function cycleAt(ts) {
  const p = new Intl.DateTimeFormat('en', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).formatToParts(new Date(ts));
  const y = p.find(x => x.type === 'year').value, m = p.find(x => x.type === 'month').value;
  return y + '-' + m;
}
function monthStartUtc(cycle) { const [y, m] = cycle.split('-').map(Number); return Date.UTC(y, m - 1, 1) + 3 * 3600000; }
function nextCycle(cycle) { const [y, m] = cycle.split('-').map(Number); return y + (m === 12 ? 1 : 0) + '-' + String(m === 12 ? 1 : m + 1).padStart(2, '0'); }
function previousCycle(cycle) { const [y, m] = cycle.split('-').map(Number); return (m === 1 ? y - 1 : y) + '-' + String(m === 1 ? 12 : m - 1).padStart(2, '0'); }
async function isOwner(request, env) {
  try { const p = await authenticate(request, env); if (!p?.sub) return false; const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); return String(u?.email || '').toLowerCase() === OWNER; } catch (_) { return false; }
}
async function ensure(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS nv_don_monthly (
    ref TEXT PRIMARY KEY, email TEXT NOT NULL, amount_cents INTEGER NOT NULL,
    ts INTEGER NOT NULL, cycle TEXT NOT NULL, via TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed'
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS nv_don_monthly_cycle ON nv_don_monthly(cycle,status,ts)').run();
  for (const column of ['void_reason TEXT', 'voided_at INTEGER']) {
    try { await db.prepare('ALTER TABLE nv_don_monthly ADD COLUMN ' + column).run(); } catch (e) { if (!/duplicate column/i.test(String(e?.message || e))) throw e; }
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS nv_don_bonus (
    cycle TEXT NOT NULL, email TEXT NOT NULL, amount_cents INTEGER NOT NULL,
    coins INTEGER NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY(cycle,email)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS nv_don_settlements (
    cycle TEXT PRIMARY KEY, closed_at INTEGER NOT NULL, winners TEXT NOT NULL,
    nonwinner_count INTEGER NOT NULL, bonus_coins INTEGER NOT NULL
  )`).run();
  await db.prepare('CREATE TABLE IF NOT EXISTS jenny_coins (email TEXT PRIMARY KEY, coins INTEGER DEFAULT 0)').run();
  await ensureCoinLedger(db);
}
async function tag(email) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('twk-donor-month:' + email));
  return [...new Uint8Array(b).slice(0, 2)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function onRequest({ request, env }) {
  if (!env.DB) return J({ ok: false, error: 'not_configured' }, 503);
  const db = env.DB, url = new URL(request.url), q = url.searchParams, now = Date.now(), currentCycle = cycleAt(now);
  await ensure(db);

  if (request.method === 'GET') {
    if (q.get('me')) return J({ owner: await isOwner(request, env) });
    if (q.get('admin')) {
      if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
      const cycle = /^\d{4}-\d{2}$/.test(q.get('month') || '') ? q.get('month') : currentCycle;
      const rows = (await db.prepare('SELECT ref,email,amount_cents,ts,cycle,via,status FROM nv_don_monthly WHERE cycle=? ORDER BY ts DESC LIMIT 500').bind(cycle).all()).results || [];
      const people = (await db.prepare("SELECT lower(email) email,SUM(amount_cents) amount_cents,MIN(ts) first_ts FROM nv_don_monthly WHERE cycle=? AND status='confirmed' GROUP BY lower(email) ORDER BY amount_cents DESC,first_ts ASC,email ASC").bind(cycle).all()).results || [];
      const settlement = await db.prepare('SELECT cycle,closed_at,winners,nonwinner_count,bonus_coins FROM nv_don_settlements WHERE cycle=?').bind(cycle).first();
      return J({ ok: true, cycle, currentCycle, previousCycle: previousCycle(currentCycle), deadline: monthStartUtc(nextCycle(currentCycle)), rows, people: people.map((p, i) => ({ rank: i + 1, email: p.email, amount: p.amount_cents / 100, amountCents: p.amount_cents, firstTs: p.first_ts })), settlement });
    }
    const cycle = currentCycle;
    const rows = (await db.prepare("SELECT lower(email) email,SUM(amount_cents) amount_cents,MIN(ts) first_ts FROM nv_don_monthly WHERE cycle=? AND status='confirmed' GROUP BY lower(email) ORDER BY amount_cents DESC,first_ts ASC,email ASC LIMIT 10").bind(cycle).all()).results || [];
    const tiers = {}; Object.keys(CAP).forEach(k => { tiers[k] = { cap: CAP[k], used: 0 }; });
    const items = [];
    for (const r of rows) {
      const amt = Number(r.amount_cents || 0) / 100;
      const t = amt >= 1000 ? 1000 : amt >= 500 ? 500 : amt >= 100 ? 100 : 0;
      if (t && tiers[t].used < tiers[t].cap) tiers[t].used++;
      items.push({ n: await tag(r.email), amt });
    }
    return J({ ok: true, items, tiers, cycle, deadline: monthStartUtc(nextCycle(cycle)), bonusCoinsPerUsd: 2, winnerSlots: 5 }, 200, 'public, max-age=30');
  }

  if (request.method !== 'POST') return J({ ok: false, error: 'method' }, 405);
  if (!(await isOwner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
  let b = {}; try { b = await request.json(); } catch (_) {}

  if (b.action === 'record') {
    const email = String(b.email || '').trim().toLowerCase(), ref = String(b.ref || '').trim().slice(0, 120);
    const amountCents = Math.round(Number(b.amount) * 100), via = String(b.via || 'Other').replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 20) || 'Other';
    if (!validEmail(email)) return J({ ok: false, error: 'bad_email' }, 400);
    if (!(amountCents >= 100 && amountCents <= 10000000)) return J({ ok: false, error: 'bad_amount' }, 400);
    if (!/^[A-Za-z0-9._:@/-]{4,120}$/.test(ref)) return J({ ok: false, error: 'bad_payment_reference' }, 400);
    const cycle = cycleAt(now);
    try {
      await db.prepare("INSERT INTO nv_don_monthly(ref,email,amount_cents,ts,cycle,via,status) VALUES(?,?,?,?,?,?, 'confirmed')").bind(ref, email, amountCents, now, cycle, via).run();
    } catch (e) { if (/unique|constraint/i.test(String(e?.message || e))) return J({ ok: false, error: 'duplicate_reference' }, 409); throw e; }
    return J({ ok: true, cycle, amount: amountCents / 100 });
  }

  if (b.action === 'void') {
    const ref = String(b.ref || '').trim().slice(0, 120), reason = String(b.reason || '').trim().slice(0, 200);
    if (!ref || reason.length < 3) return J({ ok: false, error: 'reference_and_reason_required' }, 400);
    const row = await db.prepare('SELECT cycle FROM nv_don_monthly WHERE ref=?').bind(ref).first();
    if (!row) return J({ ok: false, error: 'not_found' }, 404);
    if (row.cycle !== currentCycle) return J({ ok: false, error: 'closed_month' }, 409);
    await db.prepare("UPDATE nv_don_monthly SET status='void',void_reason=?,voided_at=? WHERE ref=? AND status='confirmed'").bind(reason, now, ref).run();
    return J({ ok: true });
  }

  if (b.action === 'settle') {
    const cycle = String(b.month || '');
    if (!/^\d{4}-\d{2}$/.test(cycle) || cycle >= currentCycle) return J({ ok: false, error: 'month_must_be_closed' }, 400);
    const already = await db.prepare('SELECT cycle,closed_at,winners,nonwinner_count,bonus_coins FROM nv_don_settlements WHERE cycle=?').bind(cycle).first();
    if (already) return J({ ok: true, alreadySettled: true, settlement: already });
    const people = (await db.prepare("SELECT lower(email) email,SUM(amount_cents) amount_cents,MIN(ts) first_ts FROM nv_don_monthly WHERE cycle=? AND status='confirmed' GROUP BY lower(email) ORDER BY amount_cents DESC,first_ts ASC,email ASC").bind(cycle).all()).results || [];
    const winners = people.slice(0, 5).map(p => ({ email: p.email, amount: Number(p.amount_cents) / 100 }));
    const nonwinners = people.slice(5);
    let newlyCredited = 0;
    for (const p of nonwinners) {
      // Existing catalog coins are worth USD 0.50 each; round up so credit is never below 100%.
      const coins = Math.ceil(Number(p.amount_cents) / 50);
      if (coins < 1) continue;
      const movementId = crypto.randomUUID();
      const batch = await db.batch([
        db.prepare('INSERT OR IGNORE INTO nv_don_bonus(cycle,email,amount_cents,coins,ts) VALUES(?,?,?,?,?)').bind(cycle, p.email, p.amount_cents, coins, now),
        db.prepare('INSERT INTO jenny_coins(email,coins) SELECT lower(?),? WHERE changes()=1 ON CONFLICT(email) DO UPDATE SET coins=coins+excluded.coins').bind(p.email, coins),
        db.prepare("INSERT INTO coin_movements(id,email,delta,balance_after,kind,reference) SELECT ?,lower(?),?,coins,'donor_bonus',? FROM jenny_coins WHERE lower(email)=lower(?) AND changes()=1").bind(movementId, p.email, coins, 'monthly-donor:' + cycle, p.email)
      ]);
      if (Number(batch?.[0]?.meta?.changes || 0) > 0) newlyCredited += coins;
    }
    const issued = await db.prepare('SELECT COALESCE(SUM(coins),0) bonus_coins FROM nv_don_bonus WHERE cycle=?').bind(cycle).first();
    const totalCoins = Number(issued?.bonus_coins || newlyCredited);
    const settlement = { cycle, closed_at: now, winners: JSON.stringify(winners), nonwinner_count: nonwinners.length, bonus_coins: totalCoins };
    await db.prepare('INSERT OR IGNORE INTO nv_don_settlements(cycle,closed_at,winners,nonwinner_count,bonus_coins) VALUES(?,?,?,?,?)').bind(cycle, now, settlement.winners, settlement.nonwinner_count, totalCoins).run();
    const saved = await db.prepare('SELECT cycle,closed_at,winners,nonwinner_count,bonus_coins FROM nv_don_settlements WHERE cycle=?').bind(cycle).first();
    return J({ ok: true, alreadySettled: false, settlement: saved });
  }
  return J({ ok: false, error: 'bad_action' }, 400);
}
