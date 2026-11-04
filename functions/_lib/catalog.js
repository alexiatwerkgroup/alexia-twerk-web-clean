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
  lolita:  { name: 'Lolita' },
};
export const COIN_COST = 1;        // 1 coin = $0.50 (same as Jenny for now)
export const LOLITA_COSTS = {"01":11,"02":4,"03":4,"04":8,"05":9,"06":9,"07":10,"08":9,"09":8,"10":8,"11":9,"12":10,"13":10,"14":6,"15":10,"16":9,"17":10,"18":6,"19":6,"20":6,"21":4,"22":5,"23":6,"24":6,"25":5,"26":4,"27":6,"28":4,"29":6,"30":4,"31":5,"32":1,"33":1,"34":1,"35":1,"36":4,"37":6,"38":6,"39":11,"40":11,"41":11,"42":11,"43":11,"44":11,"45":11,"46":12,"47":11,"48":8,"49":11,"50":7,"51":7,"52":11,"53":11,"54":11,"55":6,"56":9,"57":11,"58":8,"59":11,"60":11,"61":11,"62":4,"63":10,"64":10,"65":9,"66":8,"67":6,"68":2,"69":1,"70":7,"71":9,"72":9,"73":7,"74":5,"75":5,"76":6,"77":5,"78":8,"79":11,"80":6};
export const TAINARA_COSTS = {"01":1,"02":1,"03":1,"04":1,"05":1,"06":1,"07":1,"08":1,"09":8,"10":1,"11":1,"12":3,"13":2,"14":1,"15":1,"16":1,"17":1,"18":2,"19":1,"20":1,"21":2,"22":1,"23":2,"24":2,"25":2,"26":1,"27":2,"28":1,"29":1,"30":2,"31":1,"32":1,"33":1,"34":1,"35":1,"36":2,"37":1,"38":2,"39":2,"40":1,"41":2,"42":1,"43":1,"44":2,"45":1,"46":1,"47":2,"48":2,"49":1,"50":11,"51":2,"52":1,"53":1,"54":1,"55":3,"56":1,"57":2,"58":4,"59":1,"60":1,"61":1,"62":3,"63":1,"64":3,"65":1,"66":1,"67":1,"68":1,"69":1,"70":1,"71":3,"72":2,"73":1,"74":1,"75":1,"76":4,"77":1,"78":2,"79":1,"80":2,"81":2,"82":3,"83":2,"84":3,"85":2,"86":1,"87":1,"88":1,"89":2,"90":4,"91":2,"92":1,"93":5,"94":1,"95":3,"96":2}
export const LOLITA_PARTS = {"46":"81","52":"82","53":"83","54":"84","59":"85","60":"86","79":"87"};
export const lolitaPrimary = n => Object.keys(LOLITA_PARTS).find(k=>LOLITA_PARTS[k]===n)||n;
export const coinCost = (slug, n) => slug === "lolita" ? (LOLITA_COSTS[n] || null) : slug === "tainara" ? (TAINARA_COSTS[n] || null) : COIN_COST;
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
  if (slug === 'lolita') { const primary=lolitaPrimary(n); if(primary!==n) { const access=await env.DB.prepare('SELECT 1 x FROM catalog_unlocks WHERE slug = ? AND email = ? AND n = ?').bind(slug,em,primary).first(); if(access)return true; } }
  const r = await env.DB.prepare('SELECT 1 x FROM catalog_access WHERE slug = ? AND email = ?').bind(slug, em).first();
  return !!r;
}
