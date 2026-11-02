// Shared Jenny catalog rules. SHORT = clips under 15 s: NOT for sale, unlock only with site tokens.
export const SHORT = ['02','03','04','06','12','13','22','28','29','38','39','40','41','42','50','51','53','54','63','66','69','70','75','77','81','85','86','88','89','90'];
export const TOKEN_COST = 500;   // short clips, paid with site TOKENS (earned)
export const COIN_COST = 1;      // long videos, paid with COINS (bought, 1 coin = $0.50)
export const MIN_COIN_PURCHASE = 20;
export const OWNER = 'alexiatwerkoficial@gmail.com';
export const EXPLICIT_COST = 2;  // Uncensored section (x01..x24): 2 coins per video, never included in the 63 pack
export const isExplicit = n => /^x(0[1-9]|1[0-9]|2[0-4])$/.test(n || '');
export const validN = n => (/^(0[1-9]|[1-8][0-9]|9[0-4])$/.test(n || '') && n !== '17') || isExplicit(n); // 17 removed from catalog
export const videoKey = n => (isExplicit(n) ? n : 'v' + n) + '.mp4';
export const isShort = n => SHORT.includes(n);
// full = VIP / owner / env allow-list  -> everything
// pack = jenny_access row              -> the 63 long videos
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
