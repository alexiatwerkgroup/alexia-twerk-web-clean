// Twerkhub rabbit: a catchable rabbit that pays coins.
// GET  -> { ok, eligible }        (needs login)
// POST {action:'spawn'}           -> { ok, id }          (rabbit shown to the user)
// POST {action:'catch', id}       -> { ok, coins, usd }  (user clicked it; server picks the prize)
// Limits: 1 prize per user per day, 1 per IP per day, global daily budget in coins.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';

const PRIZES = [[2, 60], [4, 25], [10, 10], [20, 4], [50, 1]]; // [coins, weight]  ($1, $2, $5, $10, $25)
const DAILY_BUDGET = 60; // coins per day for everybody ($30)
let ready = false;
async function init(db) {
  if (ready) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS rabbit_spawn (id TEXT PRIMARY KEY, email TEXT, at INTEGER, used INTEGER DEFAULT 0)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS rabbit_wins (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, ip TEXT, day TEXT, coins INTEGER, at INTEGER)').run();
  ready = true;
}
const today = () => new Date().toISOString().slice(0, 10);
async function status(env, email, ip) {
  const day = today();
  const mine = await env.DB.prepare('SELECT 1 x FROM rabbit_wins WHERE day = ? AND (email = ? OR ip = ?)').bind(day, email, ip).first();
  const spent = await env.DB.prepare('SELECT COALESCE(SUM(coins),0) s FROM rabbit_wins WHERE day = ?').bind(day).first();
  const left = DAILY_BUDGET - (spent ? spent.s : 0);
  return { day, won: !!mine, left };
}
function pick(left) {
  const ok = PRIZES.filter(p => p[0] <= left);
  if (!ok.length) return 0;
  const tot = ok.reduce((a, p) => a + p[1], 0);
  let r = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * tot;
  for (const p of ok) { if ((r -= p[1]) < 0) return p[0]; }
  return ok[0][0];
}

export async function onRequest({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'login_required' }, 401);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u) return json({ ok: false, error: 'login_required' }, 401);
  const email = String(u.email).toLowerCase();
  const ip = request.headers.get('CF-Connecting-IP') || '';
  await init(env.DB);
  const st = await status(env, email, ip);
  if (request.method === 'GET') return json({ ok: true, eligible: !st.won && st.left >= PRIZES[0][0] });
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let b = {}; try { b = await request.json(); } catch {}
  if (b.action === 'spawn') {
    if (st.won || st.left < PRIZES[0][0]) return json({ ok: true, eligible: false });
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO rabbit_spawn (id, email, at) VALUES (?, ?, ?)').bind(id, email, Date.now()).run();
    return json({ ok: true, eligible: true, id });
  }
  if (b.action === 'catch') {
    if (st.won) return json({ ok: false, error: 'already_won' }, 409);
    const s = await env.DB.prepare('SELECT at, used FROM rabbit_spawn WHERE id = ? AND email = ?').bind(String(b.id || ''), email).first();
    if (!s || s.used) return json({ ok: false, error: 'bad_rabbit' }, 400);
    const age = Date.now() - s.at;
    if (age < 1500 || age > 120000) return json({ ok: false, error: 'bad_rabbit' }, 400);
    const claim = await env.DB.prepare('UPDATE rabbit_spawn SET used = 1 WHERE id = ? AND used = 0').bind(String(b.id)).run();
    if (!claim.meta || claim.meta.changes !== 1) return json({ ok: false, error: 'bad_rabbit' }, 400);
    const coins = pick(st.left);
    if (!coins) return json({ ok: false, error: 'budget' }, 409);
    await env.DB.prepare('INSERT INTO rabbit_wins (email, ip, day, coins, at) VALUES (?, ?, ?, ?, ?)').bind(email, ip, st.day, coins, Date.now()).run();
    await env.DB.prepare('INSERT INTO jenny_coins (email, coins) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET coins = coins + excluded.coins').bind(email, coins).run();
    return json({ ok: true, coins, usd: coins / 2 });
  }
  return json({ ok: false, error: 'bad_action' }, 400);
}
