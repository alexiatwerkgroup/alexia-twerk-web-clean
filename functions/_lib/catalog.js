// Generic private catalogs for Twerkhub models (Jenny keeps its own lib untouched).
// Registry: only slugs listed here can be served. Videos live in the private R2 bucket
// JENNY_VIDEOS under the prefix "<slug>/v<NN>.mp4" (e.g. abbi/v01.mp4).
// Coins are shared with Jenny (table jenny_coins). Unlocks/access are per model.
export const MODELS = {
  abbi:    { name: 'Abbi' },
  vegan:   { name: 'Vegan' },
  camila:  { name: 'Camila' },
  tainara: { name: 'Tainara' },
  alexia:  { name: 'Alexia' },
};
export const COIN_COST = 1;        // 1 coin = $0.50 (same as Jenny for now)
export const MIN_COIN_PURCHASE = 20;
export const OWNER = 'alexiatwerkoficial@gmail.com';

export const modelOf = slug => (Object.prototype.hasOwnProperty.call(MODELS, slug) ? MODELS[slug] : null);
export const validN = n => /^(0[1-9]|[1-9][0-9])$/.test(n || '');
export const videoKey = (slug, n) => `${slug}/v${n}.mp4`;

export async function ensureTables(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS catalog_unlocks (slug TEXT, email TEXT, n TEXT, via TEXT, PRIMARY KEY (slug, email, n))').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS catalog_votes (slug TEXT, user_id TEXT, n TEXT, v INTEGER, ts INTEGER DEFAULT (strftime(\'%s\',\'now\')), PRIMARY KEY (slug, user_id, n))').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS catalog_follow (slug TEXT, email TEXT, created INTEGER DEFAULT (strftime(\'%s\',\'now\')), via TEXT, PRIMARY KEY (slug, email))').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS catalog_access (slug TEXT, email TEXT, granted_at INTEGER DEFAULT (strftime(\'%s\',\'now\')), PRIMARY KEY (slug, email))').run();
}

export async function canWatch(env, user, slug, n) {
  const em = String(user.email || '').toLowerCase();
  const allowed = String(env.JENNY_ALLOWED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  if (user.tier === 'vip' || em === OWNER || allowed.includes(em)) return true;
  const u = await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug, em, n).first();
  if (u) return true;
  const r = await env.DB.prepare('SELECT 1 x FROM catalog_access WHERE slug = ? AND email = ?').bind(slug, em).first();
  return !!r;
}
