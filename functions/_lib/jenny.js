// Shared Jenny catalog rules. Every non-explicit video is redeemed with tokens; x01-x24 are explicit and use coins.
export const SHORT = ['02','03','04','06','12','13','22','28','29','38','39','40','41','42','50','51','53','54','63','66','69','70','75','77','81','85','86','88','89','90'];
export const TOKEN_COST = 500;   // non-explicit Jenny videos are redeemed with earned TOKENS
export const COIN_COST = 1;      // explicit videos: 1 coin per started minute; 1 coin = $0.50
export const MIN_COIN_PURCHASE = 20;
export const OWNER = 'alexiatwerkoficial@gmail.com';
// Explicit catalog x01-x24: price by duration (seconds). 1 coin = $0.50
export const EXPLICIT_DUR = {x01:120,x02:48,x03:28,x04:60,x05:426,x06:271,x07:271,x08:40,x09:53,x10:37,x11:24,x12:35,x13:361,x14:237,x15:237,x16:279,x17:55,x18:39,x19:66,x20:63,x21:90,x22:70,x23:471,x24:409};
export const explicitCost = n => Math.ceil((EXPLICIT_DUR[n] || 0) / 60); // x01..x24: 1 coin per started minute
export const isExplicit = n => /^x(0[1-9]|1[0-9]|2[0-4])$/.test(n || '');
export const validN = n => (/^(0[1-9]|[1-8][0-9]|9[0-4])$/.test(n || '') && n !== '17') || isExplicit(n); // 17 removed from catalog
export const videoKey = n => (isExplicit(n) ? n : 'v' + n) + '.mp4';
export const isShort = n => SHORT.includes(n);
// full = VIP / owner / env allow-list  -> everything
// legacy jenny_access row              -> grandfathered access to the 63 full archive videos
// unlock = jenny_unlocks row           -> that single video
export async function canWatch(env, user, n) {
  const em = String(user.email || '').toLowerCase();
  const allowed = String(env.JENNY_ALLOWED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  if (user.tier === 'vip' || em === OWNER || allowed.includes(em)) return true;
  const u = await env.DB.prepare('SELECT 1 x FROM jenny_unlocks WHERE email = ? AND n = ?').bind(em, n).first();
  if (u) return true;
  if (!isShort(n) && !isExplicit(n)) { const r = await env.DB.prepare('SELECT 1 x FROM jenny_access WHERE email = ?').bind(em).first(); if (r) return true; }
  return false;
}

// Gift-price promotion (owner-started, auto-expires). While active: every coin video costs PROMO_COST coin, min purchase PROMO_MIN coins.
export const PROMO_COST = 1;
export const PROMO_MIN = 2;
export async function promoState(env) {
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS jenny_promo (id INTEGER PRIMARY KEY, ends_at INTEGER, started_at INTEGER)').run();
    const r = await env.DB.prepare('SELECT ends_at, started_at FROM jenny_promo WHERE id = 1').first();
    const now = Date.now();
    if (r && r.ends_at > now) return { active: true, ends_at: r.ends_at, started_at: r.started_at, cost: PROMO_COST, min: PROMO_MIN, now };
    return { active: false, now };
  } catch (e) { return { active: false, now: Date.now() }; }
}
