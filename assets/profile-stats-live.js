/*!
 * profile-stats-live.js v2 (2026-04-29)
 * Adds: animated counter rolling + topbar balance chip
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

  // ── animated counter rolling ──────────────────────────────
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  var animTokens = new WeakMap();
  function animateNumber(el, to, prefix){
    prefix = prefix || "";
    var from = animTokens.get(el);
    if (from == null) {
      // first ever set — try to read current text
      var cur = parseInt((el.textContent || "0").replace(/[^\d-]/g, ""), 10);
      from = isNaN(cur) ? 0 : cur;
    }
    if (from === to) return;
    var dur = 800;
    var t0 = performance.now();
    var token = (animTokens.get(el)|0) + 1;  // cancel previous animation
    animTokens.set(el, to);
    function step(now){
      if (animTokens.get(el) !== to) return;     // newer animation took over
      var p = Math.min(1, (now - t0) / dur);
      var v = Math.round(from + (to - from) * easeOutCubic(p));
      el.textContent = prefix + fmt(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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

    // numeric stats (animated)
    var numericStats = {
      "balance": bal,
      "streak":  streak.days,
      "cuts":    cuts.total,
      "today":   today.amount
    };
    Object.keys(numericStats).forEach(function(k){
      var els = document.querySelectorAll('[data-live="'+k+'"]');
      for (var i = 0; i < els.length; i++) {
        var prefix = (k === "today") ? "+" : "";
        animateNumber(els[i], numericStats[k], prefix);
      }
    });

    // text stats (no anim)
    var textStats = {
      "tier":       tier,
      "next-pct":   pct + "%",
      "next-label": nxt.name === "max" ? "max tier reached" : "to " + nxt.name
    };
    Object.keys(textStats).forEach(function(k){
      var els = document.querySelectorAll('[data-live="'+k+'"]');
      for (var i = 0; i < els.length; i++) {
        if (els[i].textContent !== textStats[k]) els[i].textContent = textStats[k];
      }
    });

    // Also keep #tokens-balance (separate widget at top of sidebar) live
    var tb = document.getElementById("tokens-balance");
    if (tb) {
      var inner = tb.querySelector("[data-live-num]");
      if (!inner) {
        tb.innerHTML = '<span data-live-num>0</span> <small>TWK</small>';
        inner = tb.querySelector("[data-live-num]");
      }
      animateNumber(inner, bal);
    }

    // Sync the topbar chip
    renderTopbar(bal, tier, pct, nxt);
  }

  // ── topbar balance chip ───────────────────────────────────
  // Injects a fixed top-right pill on every page so the user sees their
  // balance + tier without going to /profile. Click → /profile.html.
  function ensureTopbarChip(){
    if (document.getElementById("twk-topbar-chip")) return document.getElementById("twk-topbar-chip");
    var s = document.createElement("style");
    s.textContent = [
      "#twk-topbar-chip{position:fixed;top:14px;right:18px;z-index:9998;display:inline-flex;align-items:center;gap:0;padding:0;border-radius:999px;background:rgba(10,10,18,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,180,84,.28);box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 22px rgba(255,180,84,.08);text-decoration:none;font-family:'JetBrains Mono',ui-monospace,monospace;color:#f5f5fb;cursor:pointer;transition:transform .25s cubic-bezier(.2,.7,.2,1),border-color .25s,box-shadow .25s;overflow:hidden;line-height:1}",
      "#twk-topbar-chip:hover{transform:translateY(-1px);border-color:rgba(255,180,84,.6);box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 32px rgba(255,180,84,.18)}",
      "#twk-topbar-chip .twk-tc-coin{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#ffd78a,#ff6fa8);color:#0a0a14;font-size:13px;font-weight:900;margin:5px 0 5px 6px;flex-shrink:0;box-shadow:0 0 12px rgba(255,180,84,.4) inset}",
      "#twk-topbar-chip .twk-tc-bal{font-size:12.5px;font-weight:700;letter-spacing:.04em;padding:0 10px 0 8px;color:#fff}",
      "#twk-topbar-chip .twk-tc-bal small{font-size:9.5px;color:#8a8a99;font-weight:600;letter-spacing:.18em;margin-left:3px;text-transform:uppercase}",
      "#twk-topbar-chip .twk-tc-tier{display:inline-flex;align-items:center;height:100%;padding:8px 12px 8px 10px;background:linear-gradient(135deg,rgba(255,45,135,.18),rgba(157,78,221,.18));border-left:1px solid rgba(255,180,84,.18);font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ffd78a;border-top-right-radius:999px;border-bottom-right-radius:999px}",
      "#twk-topbar-chip[data-tier='medium']  .twk-tc-tier{color:#7af;background:linear-gradient(135deg,rgba(60,140,255,.2),rgba(80,180,255,.16))}",
      "#twk-topbar-chip[data-tier='premium'] .twk-tc-tier{color:#ff6fa8;background:linear-gradient(135deg,rgba(255,45,135,.28),rgba(157,78,221,.22))}",
      "#twk-topbar-chip[data-tier='vip']     .twk-tc-tier{color:#0a0a14;background:linear-gradient(135deg,#ffd78a,#ff6fa8)}",
      "#twk-topbar-chip .twk-tc-pgr{display:none;width:46px;height:3px;background:rgba(255,255,255,.08);position:absolute;left:36px;right:auto;bottom:6px;border-radius:2px;overflow:hidden}",
      "#twk-topbar-chip .twk-tc-pgr i{display:block;height:100%;background:linear-gradient(90deg,#ffd78a,#ff6fa8);transition:width .8s cubic-bezier(.2,.7,.2,1)}",
      "@media(max-width:540px){#twk-topbar-chip{top:auto;bottom:14px;right:14px}#twk-topbar-chip .twk-tc-tier{display:none}}",
      ".twk-tc-pop{animation:twk-tc-pop .55s cubic-bezier(.34,1.56,.64,1)}",
      "@keyframes twk-tc-pop{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}"
    ].join("");
    document.head.appendChild(s);

    var a = document.createElement("a");
    a.id = "twk-topbar-chip";
    a.href = "/profile.html";
    a.setAttribute("aria-label", "Token balance · go to profile");
    a.innerHTML = ''+
      '<span class="twk-tc-coin">★</span>'+
      '<span class="twk-tc-bal"><span data-live-num>0</span><small>TWK</small></span>'+
      '<span class="twk-tc-tier">basic</span>';
    document.body.appendChild(a);
    return a;
  }
  var lastChipBal = null;
  function renderTopbar(bal, tier, pct, nxt){
    if (window.__twkTopbarChipDisabled) return;
    if (location.pathname.indexOf("/profile.html") === 0) return;  // not needed on profile itself
    var chip = ensureTopbarChip();
    chip.setAttribute("data-tier", tier);
    chip.title = "Balance: " + fmt(bal) + " TWK · " + tier + " tier · " + pct + "% to " + (nxt.name === "max" ? "max" : nxt.name);
    var tierEl = chip.querySelector(".twk-tc-tier");
    if (tierEl && tierEl.textContent !== tier) tierEl.textContent = tier;
    var num = chip.querySelector("[data-live-num]");
    if (num) animateNumber(num, bal);
    if (lastChipBal !== null && bal > lastChipBal) {
      chip.querySelector(".twk-tc-coin").classList.remove("twk-tc-pop");
      void chip.offsetWidth;  // force reflow to restart animation
      chip.querySelector(".twk-tc-coin").classList.add("twk-tc-pop");
    }
    lastChipBal = bal;
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
    // Always render — the topbar chip works on every page; data-live and
    // #tokens-balance only render if the elements exist on this page.
    render();
    instrumentClicks();
    document.addEventListener("alexia-tokens-changed", render);
    document.addEventListener("alexia-cut-watched", render);
    // soft poll for cross-tab updates and modules that don't fire events
    setInterval(render, 4000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // expose for console debugging
  window.__twkProfileStats = { render: render, bumpCut: bumpCut, tickStreak: tickStreak };
})();
