// TWERKHUB · tier resolver — replaces Supabase compute_tier RPC
// 2026-05-08

export function computeTier(tokens) {
  const t = parseInt(tokens, 10) || 0;
  if (t >= 5000) return 'vip';
  if (t >= 1500) return 'premium';
  if (t >= 500) return 'medium';
  return 'basic';
}
