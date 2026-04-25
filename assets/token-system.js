/* ═══ TWERKHUB · Token system v2 ═══
 * v20260425-p7 · Auth-gated. Anonymous users see balance=0.
 * Logged-in users earn locally and sync to Supabase via grant_tokens RPC.
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
    tier: NS + '.tier'
  };

  var REWARDS = {
    welcomeBonus: 200,
    dailyLogin: 50,
    streakBonus: 25,
    streakCap: 7,
    pageVisit: 5,
    videoWatch: 15,
    videoComplete: 30,
    share: 100,
    referral: 300
  };

  var TIER_THRESHOLDS = { medium: 500, premium: 2000, vip: 10000 };

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
    var bal = N(KEYS.balance, 0) + amount;
    var tot = N(KEYS.total, 0) + amount;
    S(KEYS.balance, bal);
    S(KEYS.total, tot);
    S(KEYS.tier, tierFromBalance(bal));
    syncUserSnapshot();
    syncToSupabase(amount, reason);
    toast('+' + amount, reason);
    broadcast();
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

  function onPageVisit(){
    if (!isLoggedIn()) return;
    var path = location.pathname;
    var visited = N(KEYS.visited, {});
    if (visited[path]) return;
    visited[path] = now();
    S(KEYS.visited, visited);
    grant(REWARDS.pageVisit, 'New page explored');
  }

  function onVideoStart(videoId){
    if (!isLoggedIn() || !videoId) return;
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].started) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].started = now();
    S(KEYS.videos, videos);
    grant(REWARDS.videoWatch, 'Video watched');
  }

  function onVideoComplete(videoId){
    if (!isLoggedIn() || !videoId) return;
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].completed) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].completed = now();
    S(KEYS.videos, videos);
    grant(REWARDS.videoComplete, 'Video finished');
  }

  function onShare(){
    if (!isLoggedIn()) return;
    var shares = N(KEYS.shares, 0) + 1;
    S(KEYS.shares, shares);
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
