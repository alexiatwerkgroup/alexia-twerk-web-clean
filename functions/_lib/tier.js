// TWERKHUB · tier resolver — replaces Supabase compute_tier RPC
// 2026-05-09: bumped thresholds to match canonical values in
// /assets/token-system.js + /assets/profile-stats-live.js (Anti's
// official 4-tier ladder published on /membership). Old values
// (500/1500/5000) were a regression from an earlier balance pass.

export function computeTier(tokens) {
  const t = parseInt(tokens, 10) || 0;
  if (t >= 50000) return 'vip';
  if (t >= 12000)  return 'premium';
  if (t >= 3000)  return 'medium';
  return 'basic';
}
