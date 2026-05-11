/* ═══════════════════════════════════════════════════════════════════
 * TWERKHUB · Token System v3.0 · 2026-05-10 (toast + audio fixed)
 * ───────────────────────────────────────────────────────────────────
 * Single-file replacement for both token-system.js AND twerkhub-tokens.js.
 * Self-contained. Zero external CSS dependency. D1-synced.
 *
 * What it does:
 *   • Earns: page visit (+5), video watch (+10), video complete (+10),
 *     share (+50), daily login (+30 + streak bonus), welcome (+200).
 *   • Persists tokens to D1 via /api/tokens/grant after every earn.
 *   • Drift reconciler on page load: if local > server (offline grants),
 *     pushes delta. If server > local, pulls.
 *   • Founder override (alexiatwerkoficial@gmail.com): always 1M+ tokens, VIP.
 *   • HUD top-right: floating badge with live balance + tier.
 *   • Toast: 100% inline-styled DIVs. Renders correctly even if every
 *     external CSS file is broken. No span quirks. Bulletproof.
 *   • Daily caps with cap-doesn't-burn-reward fix.
 *
 * Tier ladder (canonical):
 *   basic  : 0     – 2,999
 *   medium : 3,000 – 8,999
 *   premium: 9,000 – 49,999
 *   vip    : 50,000+
 *
 * Public API (window.AlexiaTokens) — backward compatible:
 *   getState(), grant(amount, reason), spend(amount),
 *   onPageVisit(), onVideoStart(vid), onVideoComplete(vid), onShare(),
 *   isLoggedIn()
 * ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twkTokensV3) return;
  window.__twkTokensV3 = true;

  // ─── Constants ───────────────────────────────────────────────────────
  var KEYS = {
    balance:    'alexia_tokens_v1.balance',
    total:      'alexia_tokens_v1.total_earned',
    tier:       'alexia_tokens_v1.tier',
    streak:     'alexia_tokens_v1.streak_days',
    welcomed:   'alexia_tokens_v1.welcomed',
    lastLogin:  'alexia_tokens_v1.last_login',
    visited:    'alexia_tokens_v1.pages_visited',
    videos:     'alexia_tokens_v1.videos_watched',
    daily:      'alexia_tokens_v1.daily_v3',     // {date, pages, watches, finishes, shares}
  };
  var REWARDS = {
    pageVisit:     5,
    videoWatch:    15,   // +15 per video watched, once per video.
    videoComplete: 30,   // +30 on finish, once per video.
    share:         50,
    dailyLogin:    30,
    streakBonus:   15,
    streakCap:     7,
    welcomeBonus:  200,
  };
  var DAILY_CAPS = { pages: 50, watches: 20, finishes: 10, shares: 3 };
  var TIERS = { medium: 3000, premium: 9000, vip: 50000 };
  var FOUNDER_EMAILS = { 'alexiatwerkoficial@gmail.com': true };
  var FOUNDER_FLOOR  = 1000009;

  // ─── Storage helpers ─────────────────────────────────────────────────
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ─── Auth ────────────────────────────────────────────────────────────
  function getAuth() {
    try {
      var raw = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}');
      if (raw && raw.user && raw.token) return raw;
    } catch (_) {}
    return null;
  }
  function isLoggedIn() { return !!getAuth(); }
  function isFounder() {
    var a = getAuth();
    if (!a || !a.user || !a.user.email) return false;
    return !!FOUNDER_EMAILS[String(a.user.email).toLowerCase().trim()];
  }
  function userToken() {
    var a = getAuth();
    return a && a.token ? a.token : '';
  }

  // ─── Tier ────────────────────────────────────────────────────────────
  function tierFromBalance(b) {
    if (b >= TIERS.vip) return 'vip';
    if (b >= TIERS.premium) return 'premium';
    if (b >= TIERS.medium) return 'medium';
    return 'basic';
  }
  function nextTierFor(b) {
    if (b < TIERS.medium)  return { key: 'medium',  at: TIERS.medium };
    if (b < TIERS.premium) return { key: 'premium', at: TIERS.premium };
    if (b < TIERS.vip)     return { key: 'vip',     at: TIERS.vip };
    return null;
  }

  // ─── Daily counters (single object, atomic) ──────────────────────────
  function getDaily() {
    var d = read(KEYS.daily, null);
    var t = todayStr();
    if (!d || d.date !== t) {
      d = { date: t, pages: 0, watches: 0, finishes: 0, shares: 0 };
      write(KEYS.daily, d);
    }
    return d;
  }
  function consumeDaily(slot, cap) {
    var d = getDaily();
    if ((d[slot] | 0) >= cap) return false;
    d[slot] = (d[slot] | 0) + 1;
    write(KEYS.daily, d);
    return true;
  }

  // ─── State ───────────────────────────────────────────────────────────
  // 2026-05-09 update: founder now accumulates on top of the floor.
  // Display = max(FOUNDER_FLOOR, actualLocalBalance). When user earns
  // 10 tokens, localBalance bumps and after a few earnings the displayed
  // balance grows past 1,000,009.
  function getState() {
    var localBal = read(KEYS.balance, 0) | 0;
    var localTot = read(KEYS.total, 0) | 0;
    var visited  = read(KEYS.visited, {}) || {};
    var videos   = read(KEYS.videos, {}) || {};
    var shares   = read('alexia_tokens_v1.shares', 0) | 0;
    var welcomed = !!read(KEYS.welcomed, false);
    var lastLogin= read(KEYS.lastLogin, null);
    if (isFounder()) {
      var displayedBal = Math.max(FOUNDER_FLOOR, localBal);
      var displayedTot = Math.max(FOUNDER_FLOOR, localTot);
      return {
        balance: displayedBal,
        total:   displayedTot,
        tier:    'vip',
        streak:  read(KEYS.streak, 0) | 0,
        nextTier: null,
        founder: true,
        visited: visited,
        videos:  videos,
        shares:  shares,
        welcomed: welcomed,
        lastLogin: lastLogin,
      };
    }
    return {
      balance: localBal,
      total:   localTot,
      tier:    tierFromBalance(localBal),
      streak:  read(KEYS.streak, 0) | 0,
      nextTier: nextTierFor(localBal),
      founder: false,
      visited: visited,
      videos:  videos,
      shares:  shares,
      welcomed: welcomed,
      lastLogin: lastLogin,
    };
  }
  function setBalance(newBal) {
    write(KEYS.balance, Math.max(0, newBal | 0));
    write(KEYS.tier, tierFromBalance(read(KEYS.balance, 0)));
    broadcast();
  }
  function broadcast(detail) {
    try {
      window.dispatchEvent(new CustomEvent('alexia-tokens-changed', {
        detail: detail || getState(),
      }));
    } catch (_) {}
  }

  // ─── D1 sync ─────────────────────────────────────────────────────────
  function syncGrantToServer(amount, reason) {
    var token = userToken();
    if (!token) return;
    fetch('/api/tokens/grant', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ amount: amount, reason: reason || null }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) return;
        // Server-canonical values overwrite local — trust server.
        if (typeof data.balance === 'number') write(KEYS.balance, data.balance);
        if (typeof data.tier === 'string')    write(KEYS.tier, data.tier);
        broadcast();
      })
      .catch(function () {});
  }

  function reconcileWithServer() {
    var token = userToken();
    if (!token) return;
    fetch('/api/profile/me', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + token },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.profile) return;
        var serverBal = Number(data.profile.tokens || 0);
        var localBal  = read(KEYS.balance, 0) | 0;
        var deficit   = localBal - serverBal;
        if (deficit > 0 && deficit <= 5000) {
          // Push delta in chunks of 1000.
          var remaining = deficit;
          var pushChunk = function () {
            if (remaining <= 0) return;
            var chunk = Math.min(remaining, 1000);
            fetch('/api/tokens/grant', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
              },
              body: JSON.stringify({ amount: chunk, reason: 'drift_reconcile_v3' }),
            }).then(function () { remaining -= chunk; pushChunk(); }).catch(function () {});
          };
          pushChunk();
        } else {
          // Server is canonical — overwrite local.
          write(KEYS.balance, serverBal);
          write(KEYS.total,   Number(data.profile.total_earned || 0) | 0);
          write(KEYS.tier,    String(data.profile.tier || tierFromBalance(serverBal)));
          broadcast();
        }
      })
      .catch(function () {});
  }

  // ─── Grant ───────────────────────────────────────────────────────────
  // 2026-05-09 update: founder accumulates too. Local balance starts at
  // FOUNDER_FLOOR (set by ensureFounderFloor on init). Each grant adds
  // on top, and getState returns max(FOUNDER_FLOOR, localBalance).
  function grant(amount, reason) {
    if (!isLoggedIn() || amount <= 0) return;
    var founder = isFounder();
    if (founder) {
      // Ensure the local floor is set so accumulation is visible.
      var curBal = read(KEYS.balance, 0) | 0;
      if (curBal < FOUNDER_FLOOR) {
        write(KEYS.balance, FOUNDER_FLOOR);
        write(KEYS.total,   FOUNDER_FLOOR);
      }
    }
    var prevBal = read(KEYS.balance, 0) | 0;
    var newBal  = prevBal + amount;
    write(KEYS.balance, newBal);
    write(KEYS.total,   (read(KEYS.total, 0) | 0) + amount);
    var prevTier = founder ? 'vip' : tierFromBalance(prevBal);
    var newTier  = founder ? 'vip' : tierFromBalance(newBal);
    write(KEYS.tier, newTier);
    syncGrantToServer(amount, reason);
    toast(amount, reason || 'Earned', founder ? 'FOUNDER' : tierLabel(newTier));
    broadcast();
    if (newTier !== prevTier) {
      try {
        window.dispatchEvent(new CustomEvent('alexia-level-up', {
          detail: { from: prevTier, to: newTier, balance: newBal },
        }));
      } catch (_) {}
    }
  }

  function tierLabel(t) {
    return t === 'vip' ? 'VIP TOP'
         : t === 'premium' ? 'PREMIUM'
         : t === 'medium' ? 'MEDIUM'
         : 'BASIC';
  }

  function spend(amount) {
    if (!isLoggedIn() || amount <= 0) return false;
    if (isFounder()) return true; // founder can always spend
    var bal = read(KEYS.balance, 0) | 0;
    if (bal < amount) return false;
    write(KEYS.balance, bal - amount);
    write(KEYS.tier, tierFromBalance(bal - amount));
    broadcast();
    return true;
  }

  // ─── Earn triggers ───────────────────────────────────────────────────
  function welcome() {
    if (!isLoggedIn()) return;
    if (read(KEYS.welcomed, false)) return;
    write(KEYS.welcomed, true);
    grant(REWARDS.welcomeBonus, 'Welcome bonus');
  }

  function dailyCheck() {
    if (!isLoggedIn()) return;
    var today = todayStr();
    var last = read(KEYS.lastLogin, null);
    if (last === today) return;
    var streak = read(KEYS.streak, 0) | 0;
    if (last) {
      var lastD = new Date(last + 'T12:00:00');
      var todayD = new Date(today + 'T12:00:00');
      var diff = Math.round((todayD - lastD) / (1000 * 60 * 60 * 24));
      streak = diff === 1 ? streak + 1 : (diff > 1 ? 1 : streak);
    } else {
      streak = 1;
    }
    write(KEYS.streak, streak);
    write(KEYS.lastLogin, today);
    var bonus = Math.min(streak, REWARDS.streakCap) * REWARDS.streakBonus;
    grant(REWARDS.dailyLogin + bonus, 'Daily login · streak ' + streak);
  }

  function onPageVisit() {
    if (!isLoggedIn()) return;
    // 2026-05-09: founder bypass — always rewards, no cap, no dedup.
    // Still tracks visited paths in localStorage so the dashboard "Explore
    // a new page" achievement reflects activity.
    if (isFounder()) {
      var v = read(KEYS.visited, {});
      v[location.pathname] = Date.now();
      write(KEYS.visited, v);
      grant(REWARDS.pageVisit, 'New page explored');
      return;
    }
    var path = location.pathname;
    var visited = read(KEYS.visited, {});
    if (visited[path]) return;
    if (!consumeDaily('pages', DAILY_CAPS.pages)) return;
    visited[path] = Date.now();
    write(KEYS.visited, visited);
    grant(REWARDS.pageVisit, 'New page explored');
  }

  // +15 watch + +30 finish, once per video, for everyone (founder included
  // = same as normal user). No bypasses, no multi-fire.
  function onVideoStart(vid) {
    if (!isLoggedIn() || !vid) return;
    var videos = read(KEYS.videos, {});
    if (videos[vid] && videos[vid].started) return;
    if (!consumeDaily('watches', DAILY_CAPS.watches)) return;
    videos[vid] = videos[vid] || {};
    videos[vid].started = Date.now();
    write(KEYS.videos, videos);
    grant(REWARDS.videoWatch, 'Video watched');
  }

  function onVideoComplete(vid) {
    if (!isLoggedIn() || !vid) return;
    var videos = read(KEYS.videos, {});
    if (videos[vid] && videos[vid].completed) return;
    if (!consumeDaily('finishes', DAILY_CAPS.finishes)) return;
    videos[vid] = videos[vid] || {};
    videos[vid].completed = Date.now();
    write(KEYS.videos, videos);
    grant(REWARDS.videoComplete, 'Video finished');
  }

  function onShare() {
    if (!isLoggedIn()) return;
    if (isFounder()) {
      var sh = read(KEYS.shares || 'alexia_tokens_v1.shares', 0) | 0;
      try { localStorage.setItem('alexia_tokens_v1.shares', JSON.stringify(sh + 1)); } catch (_) {}
      grant(REWARDS.share, 'Shared');
      return;
    }
    if (!consumeDaily('shares', DAILY_CAPS.shares)) return;
    grant(REWARDS.share, 'Shared');
  }

  // ─── HUD (badge top-right) ───────────────────────────────────────────
  function ensureHudElements() {
    // Create HUD HTML structure if it doesn't exist
    if (document.getElementById('twk-tokens-hud-v3')) return true;

    // Create main HUD container with class for pill-into-nav.js to find
    var hud = document.createElement('div');
    hud.id = 'twk-tokens-hud-v3';
    hud.className = 'twerkhub-tokens-hud twk-tk-hud';
    hud.style.cssText =
      'display:inline-flex;align-items:center;gap:6px;' +
      'padding:6px 12px;border-radius:999px;' +
      'background:rgba(30,224,143,.1);border:1px solid rgba(30,224,143,.5);' +
      'color:#1ee08f;font-family:"JetBrains Mono",ui-monospace,monospace;' +
      'font-size:10px;font-weight:800;letter-spacing:.12em;' +
      'text-transform:uppercase;flex-shrink:0;white-space:nowrap;' +
      'flex-direction:row;margin-left:6px;';

    // Count display
    var countEl = document.createElement('span');
    countEl.id = 'twk-tokens-count';
    countEl.style.cssText = 'font-size:12px;font-weight:900;';
    countEl.textContent = '0';

    // Tier display
    var tierEl = document.createElement('span');
    tierEl.id = 'twk-tokens-tier';
    tierEl.style.cssText = 'font-size:8px;opacity:.85;letter-spacing:.15em;margin-left:4px;';
    tierEl.textContent = 'BASIC';

    hud.appendChild(countEl);
    hud.appendChild(tierEl);

    // Try to inject into navbar
    var navInner = document.querySelector('.twk-nav-v1 .twk-nav-v1-inner');
    var injected = false;
    if (navInner) {
      // Insert before LIVE pill if it exists
      var livePill = navInner.querySelector('.twk-nav-v1-live');
      if (livePill) {
        navInner.insertBefore(hud, livePill);
        injected = true;
      } else {
        navInner.appendChild(hud);
        injected = true;
      }
    }

    if (!injected) {
      // Fallback: put at end of body, but use MutationObserver to move it to navbar once ready
      document.body.appendChild(hud);
      // Try again shortly in case navbar loads later
      setTimeout(function() {
        if (!document.getElementById('twk-tokens-hud-v3').parentElement.querySelector('.twk-nav-v1')) {
          var navInner2 = document.querySelector('.twk-nav-v1 .twk-nav-v1-inner');
          if (navInner2) {
            var livePill2 = navInner2.querySelector('.twk-nav-v1-live');
            var hud2 = document.getElementById('twk-tokens-hud-v3');
            if (hud2 && livePill2) {
              navInner2.insertBefore(hud2, livePill2);
            }
          }
        }
      }, 500);
    }

    // Create toast host
    if (!document.getElementById('twk-toast-host-v3')) {
      var host = document.createElement('div');
      host.id = 'twk-toast-host-v3';
      host.style.cssText =
        'position:fixed;bottom:20px;right:20px;z-index:999999;' +
        'display:flex;flex-direction:column;gap:10px;pointer-events:none;' +
        'font-family:Inter,ui-sans-serif,system-ui,sans-serif;';
      document.body.appendChild(host);
    }

    return true;
  }

  function renderHud() {
    // Ensure elements exist before rendering
    ensureHudElements();

    var countEl = document.getElementById('twk-tokens-count');
    var tierEl = document.getElementById('twk-tokens-tier');

    if (!countEl || !tierEl) return;

    var s = getState();
    countEl.textContent = (s.balance | 0).toLocaleString('en-US');
    tierEl.textContent = tierLabel(s.tier);
  }
  function buildHud() {
    ensureHudElements();
    renderHud();
  }

  // ─── Toast (BULLETPROOF — divs + inline styles) ──────────────────────
  // ─── LOUD coin-cascade ping — Web Audio, ~0.85 gain (max-ish) ─────────
  var _audioCtx = null;
  function ensureAudioCtx() {
    if (_audioCtx) return _audioCtx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) _audioCtx = new Ctor();
    } catch (_) {}
    return _audioCtx;
  }
  function playLoudPing() {
    try {
      var ctx = ensureAudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(_){} }
      var now = ctx.currentTime;
      var master = ctx.createGain();
      // 2026-05-09: bumped from 0.07 → 0.85 (12x louder).
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.85, now + 0.005);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      master.connect(ctx.destination);
      // 5 notes: ascending arpeggio with extra sparkle on top.
      [[1320,0],[1760,0.04],[2093,0.08],[2637,0.13],[3136,0.18]].forEach(function(p){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(p[0], now + p[1]);
        g.gain.setValueAtTime(0.0001, now + p[1]);
        g.gain.exponentialRampToValueAtTime(0.95, now + p[1] + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + p[1] + 0.13);
        osc.connect(g).connect(master);
        osc.start(now + p[1]);
        osc.stop(now + p[1] + 0.14);
      });
      // Add a soft sub-bass thump at the start so it feels weighty.
      var bass = ctx.createOscillator();
      var bg = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(110, now);
      bg.gain.setValueAtTime(0.0001, now);
      bg.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      bass.connect(bg).connect(master);
      bass.start(now);
      bass.stop(now + 0.13);
    } catch (_) {}
  }

  function toast(amount, title, sub) {
    var host = document.getElementById('twk-toast-host-v3');
    if (!host) {
      // Create toast host if it doesn't exist
      host = document.createElement('div');
      host.id = 'twk-toast-host-v3';
      host.style.cssText =
        'position:fixed;bottom:20px;right:20px;z-index:999999;' +
        'display:flex;flex-direction:column;gap:10px;pointer-events:none;' +
        'font-family:Inter,ui-sans-serif,system-ui,sans-serif;';
      document.body.appendChild(host);
    }
    var card = document.createElement('div');
    card.style.cssText =
      'pointer-events:auto;display:flex;align-items:center;gap:14px;' +
      'padding:12px 18px 12px 14px;border-radius:14px;' +
      'background:linear-gradient(135deg,rgba(10,24,18,.97),rgba(20,15,30,.97));' +
      'border:1px solid rgba(30,224,143,.6);' +
      'box-shadow:0 14px 40px rgba(30,224,143,.32),0 4px 12px rgba(0,0,0,.55);' +
      'color:#f5f5fb;max-width:300px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;' +
      'opacity:0;transform:translateX(24px);' +
      'transition:opacity .35s,transform .35s cubic-bezier(.2,1.2,.3,1);';

    var plus = document.createElement('div');
    plus.textContent = '+' + Number(amount);
    plus.style.cssText =
      'font-size:26px;font-weight:900;line-height:1;color:#1ee08f;' +
      'flex-shrink:0;font-family:"Playfair Display",Georgia,serif;';

    var body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;';

    var t = document.createElement('div');
    t.textContent = String(title || '');
    t.style.cssText = 'font-size:13px;font-weight:800;color:#fff;line-height:1.25;';

    var s = document.createElement('div');
    s.textContent = String(sub || '');
    s.style.cssText =
      'font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;' +
      'color:#1ee08f;opacity:.85;font-family:"JetBrains Mono",ui-monospace,monospace;' +
      'margin-top:1px;';

    body.appendChild(t);
    body.appendChild(s);
    card.appendChild(plus);
    card.appendChild(body);
    host.appendChild(card);

    // 2026-05-09: PLAY THE LOUD COIN PING.
    playLoudPing();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.style.opacity   = '1';
        card.style.transform = 'translateX(0)';
      });
    });
    setTimeout(function () {
      card.style.opacity   = '0';
      card.style.transform = 'translateX(24px)';
      setTimeout(function () {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 400);
    }, 3200);

    // Also flash the badge balance
    var hudBalance = document.getElementById('twk-tokens-count');
    if (hudBalance) {
      hudBalance.style.transition = 'color .3s,transform .3s';
      hudBalance.style.color     = '#ffd69a';
      hudBalance.style.transform = 'scale(1.18)';
      setTimeout(function () {
        hudBalance.style.color     = '#1ee08f';
        hudBalance.style.transform = 'scale(1)';
      }, 600);
    }
  }

  // ─── Auto-instrument YouTube clicks for video-watched reward ─────────
  function instrumentClicks() {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href*="/playlist/"], a[data-vid], [data-hot="1"][data-vid]');
      if (!a) return;
      var vid = a.getAttribute('data-vid');
      if (!vid) {
        // Try to extract from href if it's a youtube link
        var href = a.getAttribute('href') || '';
        var m = href.match(/[?&]v=([^&]+)/) || href.match(/youtu\.be\/([^?]+)/);
        if (m) vid = m[1];
      }
      if (vid) setTimeout(function () { onVideoStart(vid); }, 50);
    }, true);
  }

  // ─── Init ────────────────────────────────────────────────────────────
  function init() {
    // Remove duplicate tokens pills (efficient selector)
    try {
      var duplicates = document.querySelectorAll('.twerkhub-tokens-hud:not(#twk-tokens-hud-v3)');
      for (var i = 0; i < duplicates.length; i++) {
        try { duplicates[i].remove(); } catch (_) {}
      }
    } catch (_) {}

    // CRITICAL: Ensure HUD elements are created BEFORE token earning
    try { ensureHudElements(); } catch (_) {}

    // Build HUD - ALWAYS DO THIS regardless of errors
    buildHud();

    // Listen for state changes
    try {
      window.addEventListener('alexia-tokens-changed', renderHud);
      renderHud();
    } catch (_) {}

    // CRITICAL: Token earning functions - ALWAYS CALL IF LOGGED IN
    if (isLoggedIn()) {
      try { welcome(); } catch (_) {}
      try { dailyCheck(); } catch (_) {}
      try { onPageVisit(); } catch (_) {}

      // Video tracking - if page has video player
      try {
        var vp = document.querySelector('.vd-player[data-vid], [data-vid]');
        if (vp) {
          var vid = vp.getAttribute('data-vid');
          if (vid) {
            setTimeout(function () { try { onVideoStart(vid); } catch (_) {} }, 1200);
            setTimeout(function () { try { onVideoComplete(vid); } catch (_) {} }, 25000);
          }
        }
      } catch (_) {}

      // Drift reconcile
      try {
        setTimeout(reconcileWithServer, 1500);
      } catch (_) {}
    }

    // Auto-click instrumentation
    try {
      instrumentClicks();
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Fallback: ensure HUD is created even if init() fails silently
  // This fires after page is fully loaded (including images, etc.)
  if (window.addEventListener) {
    window.addEventListener('load', function() {
      if (!document.getElementById('twk-tokens-hud-v3')) {
        try { ensureHudElements(); renderHud(); } catch (_) {}
      }
    }, { once: true });
  }

  // ─── Public API (backwards-compatible namespace) ─────────────────────
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
    watchClip: onVideoStart,
    onShare: onShare,
    isLoggedIn: isLoggedIn,
    REWARDS: REWARDS,
    UNLOCK_THRESHOLD: TIERS.medium, // legacy field used by some pages
  };
})();
