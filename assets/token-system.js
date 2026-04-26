/* ═══ TWERKHUB · Token system v2 ═══
 * v20260426-p9 · Auth-gated. Anonymous users see balance=0.
 * Logged-in users earn locally and sync to Supabase via grant_tokens RPC.
 *
 * 2026-04-26 fix p9: tightened economy so VIP Top requires ~6 months of
 * hardcore grinding. Per-action rewards lowered + DAILY CAPS added (so a
 * user can't burn through all unique pages/videos in week 1). New tier
 * thresholds: Basic 0–499 · Medium 500–9,999 · Premium 10,000–44,999 ·
 * VIP Top 45,000+. Hardcore daily max ≈ 280 tokens incl. streaks → ~6
 * months minimum to reach VIP Top.
 */
(function(){
  'use strict';
  if (window.__alexiaTokensInit) return;
  window.__alexiaTokensInit = true;

  var NS = 'alexia_tokens_v1';
  var KEYS = {
    balance: NS + '.balance',
    total: NS + '.total_earned',
    streak: NS + '.streak_days',
    lastLogin: NS + '.last_login',
    registered: NS + '.registered_at',
    visited: NS + '.pages_visited',
    videos: NS + '.videos_watched',
    shares: NS + '.shares',
    welcomed: NS + '.welcomed',
    tier: NS + '.tier',
    // Daily counters (reset every calendar day)
    dailyDate:    NS + '.daily_date',
    dailyPages:   NS + '.daily_pages',
    dailyWatches: NS + '.daily_watches',
    dailyFinishes:NS + '.daily_finishes',
    dailyShares:  NS + '.daily_shares'
  };

  // Token rewards (re-balanced 2026-04-26-p10):
  //   - Welcome 200 keeps you in Basic until you watch ~10 videos
  //   - 10 videos × 10 = +100 → 200 + 100 = 300 = Medium (entry hook)
  //   - hardcore daily ≈ 230 (+25 streak avg) = ~255/day average
  //   - VIP Top at 50,000 → (50,000 - 200) / 255 ≈ 195 days = ~6.5 months
  var REWARDS = {
    welcomeBonus:200,    // unchanged — matches "+200 tokens" promised on UI
    dailyLogin:   30,    // was 50
    streakBonus:  15,    // was 25 (per streak-day, capped)
    streakCap:     7,
    pageVisit:     5,
    videoWatch:   10,    // was 15 → 10 vids = 100, with welcome 200 = Medium
    videoComplete:10,    // was 30 (bonus on top of watch when ≥80% played)
    share:        50,    // was 100
    referral:    200     // was 300
  };

  // Daily caps — strict ceiling on number of grant events per category
  var DAILY_CAPS = {
    pages:    10,  // +50/day max from pageVisit
    watches:  10,  // +100/day max from videoWatch
    finishes:  5,  // +50/day max from videoComplete
    shares:    3   // +150/day max from share
  };

  // Tier thresholds: welcome 200 alone leaves you in Basic. After ~10 videos
  // you cross into Medium. VIP Top requires ~6.5 months of grinding.
  var TIER_THRESHOLDS = { medium: 300, premium: 3000, vip: 50000 };

  function N(k, dflt){ try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch(_){ return dflt; } }
  function S(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){} }
  function now(){ return Date.now(); }
  function today(){ return new Date().toDateString(); }

  function isLoggedIn(){
    try {
      var ls = localStorage.getItem('alexia_current_user');
      if (ls && ls !== 'null') return true;
      var ss = sessionStorage.getItem('alexia_current_user');
      if (ss && ss !== 'null') return true;
    } catch(_){}
    return false;
  }

  function tierFromBalance(bal){
    if (bal >= TIER_THRESHOLDS.vip) return 'vip';
    if (bal >= TIER_THRESHOLDS.premium) return 'premium';
    if (bal >= TIER_THRESHOLDS.medium) return 'medium';
    return 'basic';
  }

  function getState(){
    if (!isLoggedIn()) {
      return {
        balance: 0, total: 0, streak: 0, lastLogin: null, registered: null,
        visited: {}, videos: {}, shares: 0, welcomed: false,
        tier: 'basic',
        nextTier: { key: 'medium', at: TIER_THRESHOLDS.medium }
      };
    }
    var bal = N(KEYS.balance, 0);
    var subscribedTier = N(KEYS.tier, null);
    if (subscribedTier === 'free') subscribedTier = null;
    if (subscribedTier === 'elite') subscribedTier = 'vip';
    var computed = tierFromBalance(bal);
    var rank = { basic:0, medium:1, premium:2, vip:3 };
    var effective = computed;
    if (subscribedTier && rank[subscribedTier] > rank[computed]) effective = subscribedTier;
    return {
      balance: bal,
      total: N(KEYS.total, 0),
      streak: N(KEYS.streak, 0),
      lastLogin: N(KEYS.lastLogin, null),
      registered: N(KEYS.registered, null),
      visited: N(KEYS.visited, {}),
      videos: N(KEYS.videos, {}),
      shares: N(KEYS.shares, 0),
      welcomed: N(KEYS.welcomed, false),
      tier: effective,
      nextTier: (effective === 'basic' ? { key: 'medium', at: TIER_THRESHOLDS.medium }
              : effective === 'medium' ? { key: 'premium', at: TIER_THRESHOLDS.premium }
              : effective === 'premium' ? { key: 'vip', at: TIER_THRESHOLDS.vip }
              : null)
    };
  }

  function broadcast(){
    try { window.dispatchEvent(new CustomEvent('alexia-tokens-changed', { detail: getState() })); } catch(_){}
  }

  function syncUserSnapshot(){
    try {
      var raw = localStorage.getItem('alexia_current_user') || sessionStorage.getItem('alexia_current_user');
      if (!raw) return;
      var current = JSON.parse(raw);
      if (!current || !current.username) return;
      var users = JSON.parse(localStorage.getItem('alexia_registered_users') || '[]');
      if (!Array.isArray(users)) return;
      var idx = users.findIndex(function(x){ return x && x.username && x.username.toLowerCase() === current.username.toLowerCase(); });
      if (idx < 0) return;
      users[idx].currentTokens = N(KEYS.balance, 0);
      users[idx].totalEarned = N(KEYS.total, 0);
      users[idx].streak = N(KEYS.streak, 0);
      users[idx].lastActiveAt = Date.now();
      localStorage.setItem('alexia_registered_users', JSON.stringify(users));
    } catch(_){}
  }

  // Sync token grants to Supabase via grant_tokens RPC
  async function syncToSupabase(amount, reason){
    try {
      if (!window.twkGetSupabase) return;
      var sb = await window.twkGetSupabase();
      if (!sb) return;
      var sess = await sb.auth.getSession();
      if (!sess || !sess.data || !sess.data.session) return;
      await sb.rpc('grant_tokens', { amount: amount, reason: reason || null });
    } catch(_){ /* offline — local already incremented */ }
  }

  function setBalance(newBalance){
    S(KEYS.balance, Math.max(0, newBalance));
    syncUserSnapshot();
    broadcast();
  }

  function grant(amount, reason){
    if (amount <= 0) return;
    if (!isLoggedIn()) return;
    var prevBal = N(KEYS.balance, 0);
    var prevTier = tierFromBalance(prevBal);
    var bal = prevBal + amount;
    var tot = N(KEYS.total, 0) + amount;
    var newTier = tierFromBalance(bal);
    S(KEYS.balance, bal);
    S(KEYS.total, tot);
    S(KEYS.tier, newTier);
    syncUserSnapshot();
    syncToSupabase(amount, reason);
    toast('+' + amount, reason);
    broadcast();
    // ── Level-up detection: dispatch a separate event so the HUD can play
    // its special chime and the user sees the celebration.
    if (newTier !== prevTier) {
      try {
        window.dispatchEvent(new CustomEvent('alexia-level-up', {
          detail: { from: prevTier, to: newTier, balance: bal }
        }));
      } catch(_){}
    }
  }

  function spend(amount){
    if (!isLoggedIn()) return false;
    var bal = N(KEYS.balance, 0);
    if (bal < amount) return false;
    S(KEYS.balance, bal - amount);
    syncUserSnapshot();
    broadcast();
    return true;
  }

  // ── Earn triggers (all gated by isLoggedIn) ─────────────────────────
  function welcome(){
    if (!isLoggedIn()) return;
    if (N(KEYS.welcomed, false)) return;
    S(KEYS.welcomed, true);
    S(KEYS.registered, now());
    grant(REWARDS.welcomeBonus, 'Welcome bonus');
  }

  function dailyCheck(){
    if (!isLoggedIn()) return;
    var last = N(KEYS.lastLogin, null);
    var t = today();
    if (last === t) return;
    var streak = N(KEYS.streak, 0);
    if (last) {
      var y = new Date(); y.setDate(y.getDate() - 1);
      streak = (last === y.toDateString()) ? streak + 1 : 1;
    } else { streak = 1; }
    S(KEYS.streak, streak);
    S(KEYS.lastLogin, t);
    var bonus = Math.min(streak, REWARDS.streakCap) * REWARDS.streakBonus;
    grant(REWARDS.dailyLogin + bonus, 'Daily login · streak ' + streak);
  }

  // ── Daily cap helper: rolls counters at midnight (local) ───────────
  function dailyCounterRoll(){
    var t = today();
    if (N(KEYS.dailyDate, null) !== t) {
      S(KEYS.dailyDate,    t);
      S(KEYS.dailyPages,   0);
      S(KEYS.dailyWatches, 0);
      S(KEYS.dailyFinishes,0);
      S(KEYS.dailyShares,  0);
    }
  }
  function dailyConsume(counterKey, cap){
    dailyCounterRoll();
    var n = N(counterKey, 0);
    if (n >= cap) return false;
    S(counterKey, n + 1);
    return true;
  }

  function onPageVisit(){
    if (!isLoggedIn()) return;
    var path = location.pathname;
    var visited = N(KEYS.visited, {});
    if (visited[path]) return;
    visited[path] = now();
    S(KEYS.visited, visited);
    if (!dailyConsume(KEYS.dailyPages, DAILY_CAPS.pages)) return;
    grant(REWARDS.pageVisit, 'New page explored');
  }

  function onVideoStart(videoId){
    if (!isLoggedIn() || !videoId) return;
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].started) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].started = now();
    S(KEYS.videos, videos);
    if (!dailyConsume(KEYS.dailyWatches, DAILY_CAPS.watches)) return;
    grant(REWARDS.videoWatch, 'Video watched');
  }

  function onVideoComplete(videoId){
    if (!isLoggedIn() || !videoId) return;
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].completed) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].completed = now();
    S(KEYS.videos, videos);
    if (!dailyConsume(KEYS.dailyFinishes, DAILY_CAPS.finishes)) return;
    grant(REWARDS.videoComplete, 'Video finished');
  }

  function onShare(){
    if (!isLoggedIn()) return;
    var shares = N(KEYS.shares, 0) + 1;
    S(KEYS.shares, shares);
    if (!dailyConsume(KEYS.dailyShares, DAILY_CAPS.shares)) return;
    grant(REWARDS.share, 'Shared');
  }

  // ── Lightweight toast (no-op if AlexiaTokensToast missing) ──────────
  function toast(amount, reason){
    try {
      if (window.TwerkhubTokens && window.TwerkhubTokens.toast) {
        window.TwerkhubTokens.toast(amount, reason);
      }
    } catch(_){}
  }

  // ── Init: claim daily + page visit on every page load ───────────────
  function init(){
    try {
      welcome();
      dailyCheck();
      onPageVisit();
    } catch(_){}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.AlexiaTokens = {
    getState: getState,
    setBalance: setBalance,
    grant: grant,
    spend: spend,
    welcome: welcome,
    dailyCheck: dailyCheck,
    onPageVisit: onPageVisit,
    onVideoStart: onVideoStart,
    onVideoComplete: onVideoComplete,
    onShare: onShare,
    isLoggedIn: isLoggedIn,
    REWARDS: REWARDS
  };
})();
