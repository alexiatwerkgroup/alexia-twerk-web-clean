/*!
 * profile-stats-live.js v1 (2026-04-29)
 * --------------------------------------------------------------
 * Live-updates the six profile sidebar stats from localStorage:
 *
 *   data-live="balance"    →  alexia_tokens_v1.balance
 *   data-live="tier"       →  computed from balance (basic/medium/premium/vip)
 *   data-live="streak"     →  alexia_streak_v1.days  (auto-bumped on each visit)
 *   data-live="cuts"       →  alexia_cuts_watched_v1
 *   data-live="next-pct"   →  computed: balance vs next tier threshold
 *   data-live="next-label" →  e.g. "to medium"
 *   data-live="today"      →  alexia_tokens_today_v1.amount  (resets on date change)
 *
 * Listens to the `alexia-tokens-changed` event token-system.js dispatches
 * so values refresh in real time as the user earns / spends tokens.
 *
 * Also auto-instruments video clicks on the page to bump
 * `alexia_cuts_watched_v1` (one count per unique video id per day).
 *
 * No backend. Pure localStorage. Works offline. Idempotent — safe to
 * load on every page (it only renders if it finds [data-live] elements).
 */
(function(){
  "use strict";
  if (window.__twkProfileStatsLive) return;
  window.__twkProfileStatsLive = true;

  // Must match TIER_THRESHOLDS in /assets/token-system.js
  var TIERS = { medium: 3000, premium: 9000, vip: 50000 };

  var BAL_KEY    = "alexia_tokens_v1";       // { balance:N, tier:string,... }
  var STREAK_KEY = "alexia_streak_v1";       // { days:N, last:"YYYY-MM-DD" }
  var CUTS_KEY   = "alexia_cuts_watched_v1"; // { ids:[...], total:N, day:"...", today:N }
  var TODAY_KEY  = "alexia_tokens_today_v1"; // { day:"YYYY-MM-DD", amount:N, lastBalance:N }

  function todayStr(){
    var d = new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function read(k, dflt){
    try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); }
    catch(_){ return dflt; }
  }
  function write(k, v){
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){}
  }
  function fmt(n){
    n = Math.max(0, Math.floor(Number(n) || 0));
    return n.toLocaleString("en-US");
  }

  // ── Streak: auto-bump on first call per day ─────────────────
  function tickStreak(){
    var s = read(STREAK_KEY, { days: 0, last: null });
    var today = todayStr();
    if (s.last === today) return s;
    if (s.last) {
      var lastD = new Date(s.last + "T12:00:00");
      var todayD = new Date(today + "T12:00:00");
      var diffDays = Math.round((todayD - lastD) / (1000*60*60*24));
      if (diffDays === 1) s.days = (s.days|0) + 1;
      else if (diffDays > 1) s.days = 1;        // missed days → reset to 1
    } else {
      s.days = 1;                                // first ever visit
    }
    s.last = today;
    write(STREAK_KEY, s);
    return s;
  }

  // ── Tokens-earned-today: tracks balance delta over a single day ──
  function tickToday(currentBal){
    var t = read(TODAY_KEY, { day: null, amount: 0, lastBalance: currentBal });
    var today = todayStr();
    if (t.day !== today) {
      // new day — reset amount, capture balance baseline
      t = { day: today, amount: 0, lastBalance: currentBal };
    } else {
      // same day — add positive delta to "amount earned today"
      var delta = currentBal - (t.lastBalance|0);
      if (delta > 0) t.amount = (t.amount|0) + delta;
      t.lastBalance = currentBal;
    }
    write(TODAY_KEY, t);
    return t;
  }

  // ── Cuts watched: ensure the cuts log has today's section ──
  function ensureCuts(){
    var c = read(CUTS_KEY, { ids: [], total: 0, day: null, today: 0 });
    var today = todayStr();
    if (c.day !== today) {
      c.day = today;
      c.today = 0;
    }
    write(CUTS_KEY, c);
    return c;
  }

  // increment cuts watched (called when a YouTube thumbnail / video link is clicked)
  function bumpCut(videoId){
    var c = ensureCuts();
    if (!videoId) return c;
    if (c.ids.indexOf(videoId) === -1) {
      c.ids.unshift(videoId);
      if (c.ids.length > 500) c.ids.length = 500;   // keep memory bounded
      c.total = (c.total|0) + 1;
      c.today = (c.today|0) + 1;
      write(CUTS_KEY, c);
      // notify other listeners
      try { document.dispatchEvent(new CustomEvent("alexia-cut-watched", { detail: { id: videoId, total: c.total } })); } catch(_){}
    }
    return c;
  }

  // ── compute tier from balance (mirrors token-system.js) ──
  function tierFromBalance(b){
    if (b >= TIERS.vip)     return "vip";
    if (b >= TIERS.premium) return "premium";
    if (b >= TIERS.medium)  return "medium";
    return "basic";
  }
  function nextTierInfo(b){
    if (b < TIERS.medium)  return { name: "medium",  at: TIERS.medium,  prev: 0 };
    if (b < TIERS.premium) return { name: "premium", at: TIERS.premium, prev: TIERS.medium };
    if (b < TIERS.vip)     return { name: "vip",     at: TIERS.vip,     prev: TIERS.premium };
    return { name: "max",  at: TIERS.vip, prev: TIERS.vip };  // already at top
  }

  // ── render ────────────────────────────────────────────────
  function render(){
    var bal = 0;
    try {
      var t = read(BAL_KEY, null);
      if (t && typeof t === "object") bal = +t.balance || 0;
      else if (typeof t === "number") bal = t;
    } catch(_){}

    var streak = tickStreak();
    var today  = tickToday(bal);
    var cuts   = ensureCuts();
    var tier   = tierFromBalance(bal);
    var nxt    = nextTierInfo(bal);
    var pct    = (nxt.name === "max")
      ? 100
      : Math.min(100, Math.round( ((bal - nxt.prev) / (nxt.at - nxt.prev)) * 100 ));

    var map = {
      "balance":   fmt(bal),
      "tier":      tier,
      "streak":    fmt(streak.days),
      "cuts":      fmt(cuts.total),
      "next-pct":  pct + "%",
      "next-label": nxt.name === "max" ? "max tier reached" : "to " + nxt.name,
      "today":     "+" + fmt(today.amount)
    };

    Object.keys(map).forEach(function(k){
      var els = document.querySelectorAll('[data-live="'+k+'"]');
      for (var i = 0; i < els.length; i++) {
        if (els[i].textContent !== map[k]) els[i].textContent = map[k];
      }
    });

    // Also keep #tokens-balance (separate widget at top of sidebar) live
    var tb = document.getElementById("tokens-balance");
    if (tb) {
      var existing = tb.innerHTML;
      var html = fmt(bal) + ' <small>TWK</small>';
      if (existing !== html) tb.innerHTML = html;
    }
  }

  // ── auto-instrument video clicks ─────────────────────────
  function ytIdFromHref(href){
    if (!href) return null;
    var m = href.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = href.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    m = href.match(/embed\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return null;
  }
  function ytIdFromImg(img){
    if (!img || !img.src) return null;
    var m = img.src.match(/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{6,})\//);
    return m ? m[1] : null;
  }
  function instrumentClicks(){
    document.addEventListener("click", function(ev){
      var t = ev.target;
      // walk up to find an <a> or any element with a YT thumb image
      var card = t && t.closest ? t.closest('a[href*="youtube"], a[href*="youtu.be"], [data-vid], .vthumb, .rh-card, .vcard, .twk-feat-card') : null;
      if (!card) return;
      var id = ytIdFromHref(card.getAttribute("href"));
      if (!id) {
        var img = card.querySelector ? card.querySelector("img") : null;
        id = ytIdFromImg(img);
      }
      if (!id) id = card.getAttribute("data-vid");
      if (id) bumpCut(id);
    }, true);
  }

  // ── boot ─────────────────────────────────────────────────
  function boot(){
    if (!document.querySelector("[data-live]") && !document.getElementById("tokens-balance")) return;
    render();
    instrumentClicks();
    document.addEventListener("alexia-tokens-changed", render);
    document.addEventListener("alexia-cut-watched", render);
    // soft poll in case some module writes to localStorage without firing the event
    setInterval(function(){
      try { if (read(BAL_KEY, null)) render(); } catch(_){}
    }, 4000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // expose for console debugging
  window.__twkProfileStats = { render: render, bumpCut: bumpCut, tickStreak: tickStreak };
})();
