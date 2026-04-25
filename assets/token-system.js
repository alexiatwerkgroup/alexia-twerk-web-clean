/* ═══════════════════════════════════════════════════════════════════════════
   ALEXIA TWERK GROUP — TOKEN SYSTEM v1.0
   Gamified points engine. All state persisted in localStorage.
   Earn paths: welcome bonus, daily streak, page browsing, video watching,
   share actions, referrals. Spend path: unlock VIP gate at 4000 tokens.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var NS = 'alexia_tokens_v1';
  var KEYS = {
    balance:    NS + '.balance',
    total:      NS + '.total_earned',
    streak:     NS + '.streak_days',
    lastLogin:  NS + '.last_login',
    registered: NS + '.registered_at',
    visited:    NS + '.pages_visited',
    videos:     NS + '.videos_watched',
    shares:     NS + '.shares',
    welcomed:   NS + '.welcomed',
    tier:       NS + '.tier',           // free | vip | elite
    muted:      NS + '.muted'           // toast suppression
  };

  var REWARDS = {
    welcomeBonus:  200,
    dailyLogin:    50,
    streakBonus:   25,                  // +25 per consecutive day
    streakCap:     7,                   // max 7-day streak bonus
    pageVisit:     5,                   // per unique nav click (capped per page)
    videoWatch:    15,                  // per video played
    videoComplete: 30,                  // per video watched to end
    share:         100,
    referral:      300
  };

  var UNLOCK_THRESHOLD = 4000;

  var N = function(k, dflt){
    try { var v = localStorage.getItem(k); return v === null ? dflt : JSON.parse(v); }
    catch(e){ return dflt; }
  };
  var S = function(k, v){
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){}
  };
  var now = function(){ return Date.now(); };
  var today = function(){ return new Date().toDateString(); };

  // GATE: every earn-flow checks isLoggedIn() first. Anonymous users must
  // see balance=0 and achievements=0 — they only start accumulating after
  // they Sign In or Sign Up.
  function isLoggedIn(){
    try {
      var ls = localStorage.getItem('alexia_current_user');
      if (ls && ls !== 'null') return true;
      var ss = sessionStorage.getItem('alexia_current_user');
      if (ss && ss !== 'null') return true;
    } catch(_){}
    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────────────────
  // 4-tier thresholds aligned with the /membership pricing page.
  // Basic < 500 · Medium 500–1999 · Premium 2000–9999 · VIP 10000+
  // The returned `tier` reflects the user's CURRENT token-earned tier, which
  // is what /account and /profile and the HUD all display. Subscription tier
  // (paid) takes precedence if KEYS.subscription is set to one of the four
  // values — subscribed users never "downgrade" visually.
  var TIER_THRESHOLDS = { medium: 500, premium: 2000, vip: 10000 };
  function tierFromBalance(bal){
    if (bal >= TIER_THRESHOLDS.vip)     return 'vip';
    if (bal >= TIER_THRESHOLDS.premium) return 'premium';
    if (bal >= TIER_THRESHOLDS.medium)  return 'medium';
    return 'basic';
  }
  function getState(){
    // GATE: if no user is logged in, ALL state is zero. Anonymous users
    // never see accumulated tokens / streaks / videos / shares.
    if (!isLoggedIn()) {
      return {
        balance: 0, total: 0, streak: 0, lastLogin: null, registered: null,
        visited: {}, videos: {}, shares: 0, welcomed: false,
        tier: 'basic',
        nextTier: { key:'medium', at: TIER_THRESHOLDS.medium }
      };
    }
    var bal = N(KEYS.balance, 0);
    var subscribedTier = N(KEYS.tier, null);
    // Treat legacy values so users upgraded in the old 3-tier schema still work.
    if (subscribedTier === 'free')  subscribedTier = null;
    if (subscribedTier === 'elite') subscribedTier = 'vip';
    var computed = tierFromBalance(bal);
    // Pick the HIGHER of (subscribed, computed) so paid subscribers never
    // get downgraded if their balance is low.
    var rank = { basic:0, medium:1, premium:2, vip:3 };
    var effective = computed;
    if (subscribedTier && rank[subscribedTier] > rank[computed]) effective = subscribedTier;
    return {
      balance:    bal,
      total:      N(KEYS.total, 0),
      streak:     N(KEYS.streak, 0),
      lastLogin:  N(KEYS.lastLogin, null),
      registered: N(KEYS.registered, null),
      visited:    N(KEYS.visited, {}),
      videos:     N(KEYS.videos, {}),
      shares:     N(KEYS.shares, 0),
      welcomed:   N(KEYS.welcomed, false),
      tier:       effective,
      nextTier:   (effective === 'basic'   ? { key:'medium',  at: TIER_THRESHOLDS.medium  }
                 : effective === 'medium'  ? { key:'premium', at: TIER_THRESHOLDS.premium }
                 : effective === 'premium' ? { key:'vip',     at: TIER_THRESHOLDS.vip     }
                 : null)
    };
  }

  function setBalance(newBalance){
    S(KEYS.balance, Math.max(0, newBalance));
    broadcast();
  }

  function grant(amount, reason){
    if (amount <= 0) return;
    if (!isLoggedIn()) return;             // gate: anonymous users get nothing
    var bal = N(KEYS.balance, 0) + amount;
    var tot = N(KEYS.total, 0) + amount;
    S(KEYS.balance, bal);
    S(KEYS.total, tot);
    toast('+' + amount + ' tokens', reason);
    broadcast();
  }

  function spend(amount){
    var bal = N(KEYS.balance, 0);
    if (bal < amount) return false;
    S(KEYS.balance, bal - amount);
    broadcast();
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Earn triggers
  // ──────────────────────────────────────────────────────────────────────────
  function welcome(){
    if (!isLoggedIn()) return;             // gate: only logged-in users get the welcome bonus
    if (N(KEYS.welcomed, false)) return;
    S(KEYS.welcomed, true);
    S(KEYS.registered, now());
    grant(REWARDS.welcomeBonus, 'Welcome to Alexia Twerk Group 🔥');
  }

  function dailyCheck(){
    if (!isLoggedIn()) return;             // gate
    var last = N(KEYS.lastLogin, null);
    var t = today();
    if (last === t) return;
    // streak logic
    var streak = N(KEYS.streak, 0);
    if (last){
      var y = new Date(); y.setDate(y.getDate()-1);
      if (last === y.toDateString()) streak += 1;
      else streak = 1;
    } else {
      streak = 1;
    }
    S(KEYS.streak, streak);
    S(KEYS.lastLogin, t);
    var streakBonus = Math.min(streak, REWARDS.streakCap) * REWARDS.streakBonus;
    grant(REWARDS.dailyLogin + streakBonus, 'Daily login · streak ' + streak + '🔥');
  }

  function onPageVisit(){
    if (!isLoggedIn()) return;             // gate: anonymous users don't accumulate
    var path = location.pathname;
    var visited = N(KEYS.visited, {});
    if (visited[path]) return;
    visited[path] = now();
    S(KEYS.visited, visited);
    grant(REWARDS.pageVisit, 'New page explored');
  }

  function onVideoStart(videoId){
    if (!isLoggedIn()) return;             // gate
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].started) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].started = now();
    S(KEYS.videos, videos);
    grant(REWARDS.videoWatch, 'Video watched');
  }

  function onVideoComplete(videoId){
    if (!isLoggedIn()) return;             // gate
    var videos = N(KEYS.videos, {});
    if (videos[videoId] && videos[videoId].completed) return;
    videos[videoId] = videos[videoId] || {};
    videos[videoId].completed = now();
    S(KEYS.videos, videos);
    grant(REWARDS.videoComplete, 'Video finished 💯');
  }

  function onShare(){
    if (!isLoggedIn()) return;             // gate
    var shares = N(KEYS.shares, 0) + 1;
    S(KEYS.shares, shares);
    grant(REWARDS.share, 'Shared with the world 📣');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UI — counter widget + toast + unlock modal
  // ──────────────────────────────────────────────────────────────────────────
  function ensureStyles(){
    if (document.getElementById('alexia-tokens-styles')) return;
    var s = document.createElement('style');
    s.id = 'alexia-tokens-styles';
    s.textContent = [
      '.atk-widget{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;',
      'background:linear-gradient(180deg,rgba(232,200,128,.14),rgba(232,200,128,.04));',
      'border:1px solid rgba(232,200,128,.32);color:#e8c880;font:800 11px/1 "Inter",sans-serif;',
      'letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:.2s;white-space:nowrap;',
      'box-shadow:0 4px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(232,200,128,.08);user-select:none}',
      '.atk-widget:hover{background:linear-gradient(180deg,rgba(232,200,128,.22),rgba(232,200,128,.08));',
      'border-color:rgba(232,200,128,.6);transform:translateY(-1px);color:#fff}',
      '.atk-widget .dot{width:6px;height:6px;border-radius:50%;background:#e8c880;box-shadow:0 0 8px rgba(232,200,128,.6);animation:atk-pulse 2s ease-in-out infinite}',
      '.atk-widget .num{font-variant-numeric:tabular-nums}',
      '@keyframes atk-pulse{0%,100%{opacity:.7}50%{opacity:1}}',

      '.atk-toast{position:fixed;top:110px;right:24px;z-index:9999;pointer-events:none;',
      'display:flex;flex-direction:column;gap:8px;max-width:320px}',
      '.atk-toast-item{background:linear-gradient(165deg,#13131a,#08080b);',
      'border:1px solid rgba(232,200,128,.45);border-radius:14px;padding:14px 18px;',
      'color:#f4f3f7;font:600 13px/1.4 "Inter",sans-serif;',
      'box-shadow:0 20px 40px rgba(0,0,0,.5),0 0 0 1px rgba(232,200,128,.15);',
      'transform:translateX(120%);opacity:0;transition:all .45s cubic-bezier(.22,.9,.38,1);',
      'pointer-events:auto;position:relative;overflow:hidden;min-width:240px}',
      '.atk-toast-item::before{content:"";position:absolute;top:0;left:0;bottom:0;width:3px;',
      'background:linear-gradient(180deg,#e8c880,#b99350)}',
      '.atk-toast-item.show{transform:translateX(0);opacity:1}',
      '.atk-toast-item .atk-amt{font:800 18px/1 "Playfair Display",serif;color:#e8c880;',
      'display:block;letter-spacing:.02em;margin-bottom:2px}',
      '.atk-toast-item .atk-reason{font-size:12px;color:rgba(244,243,247,.75);letter-spacing:.02em}',

      '.atk-modal{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;',
      'background:rgba(8,8,11,.86);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);padding:24px}',
      '.atk-modal.open{display:flex}',
      '.atk-modal__sheet{background:linear-gradient(170deg,#14141c 0%,#08080b 100%);',
      'border:1px solid rgba(232,200,128,.32);border-radius:24px;padding:40px 36px;max-width:520px;width:100%;',
      'position:relative;box-shadow:0 40px 80px rgba(0,0,0,.7),0 0 0 1px rgba(232,200,128,.18),',
      'inset 0 1px 0 rgba(255,255,255,.04);text-align:center}',
      '.atk-modal__eye{font:700 10px/1 "Inter",sans-serif;letter-spacing:.32em;text-transform:uppercase;',
      'color:#e8c880;margin-bottom:16px;display:block}',
      '.atk-modal__h{font:700 34px/1.1 "Playfair Display",serif;color:#f4f3f7;margin:0 0 14px;letter-spacing:-.01em}',
      '.atk-modal__p{font:400 15px/1.55 "Inter",sans-serif;color:rgba(244,243,247,.7);margin:0 0 24px;max-width:42ch;margin-left:auto;margin-right:auto}',
      '.atk-modal__progress{width:100%;height:10px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden;margin:0 0 10px}',
      '.atk-modal__bar{height:100%;background:linear-gradient(90deg,#e8c880,#ff2e7e);border-radius:999px;transition:width .6s ease}',
      '.atk-modal__pct{font:800 13px/1 "Inter",sans-serif;color:#e8c880;letter-spacing:.1em;margin:0 0 28px}',
      '.atk-modal__btns{display:flex;gap:10px;flex-direction:column}',
      '.atk-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;',
      'border-radius:10px;font:800 12px/1 "Inter",sans-serif;letter-spacing:.14em;text-transform:uppercase;',
      'border:none;cursor:pointer;transition:.25s;text-decoration:none}',
      '.atk-btn--gold{background:linear-gradient(180deg,#e8c880,#b99350);color:#0a0a0d;',
      'box-shadow:0 10px 28px rgba(232,200,128,.3)}',
      '.atk-btn--gold:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(232,200,128,.45);filter:brightness(1.08)}',
      '.atk-btn--pink{background:linear-gradient(180deg,#ff2e7e,#d4185d);color:#fff;',
      'box-shadow:0 10px 28px rgba(255,46,126,.3)}',
      '.atk-btn--pink:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(255,46,126,.45)}',
      '.atk-btn--ghost{background:transparent;color:rgba(244,243,247,.72);border:1px solid rgba(255,255,255,.12)}',
      '.atk-btn--ghost:hover{background:rgba(255,255,255,.04);color:#fff}',
      '.atk-modal__close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.06);border:0;',
      'width:32px;height:32px;border-radius:50%;color:#f4f3f7;font-size:18px;cursor:pointer;transition:.2s}',
      '.atk-modal__close:hover{background:rgba(255,255,255,.12);transform:rotate(90deg)}'
    ].join('');
    document.head.appendChild(s);
  }

  function renderWidget(){
    // try to insert next to ONLINE NOW badge in the main nav
    var target = document.querySelector('.snf__on, .site-nav-final__online');
    if (!target) return;
    if (document.getElementById('atk-widget')) return;
    var w = document.createElement('button');
    w.id = 'atk-widget';
    w.className = 'atk-widget';
    w.type = 'button';
    w.innerHTML = '<span class="dot"></span><span class="num">0</span><span>tokens</span>';
    w.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      openUnlockModal();
    });
    target.parentNode.insertBefore(w, target);
    updateWidget();
  }

  function updateWidget(){
    var w = document.getElementById('atk-widget');
    if (!w) return;
    var bal = N(KEYS.balance, 0);
    w.querySelector('.num').textContent = bal.toLocaleString('en-US');
  }

  function toast(amount, reason){
    if (N(KEYS.muted, false)) return;
    ensureStyles();
    var host = document.querySelector('.atk-toast');
    if (!host){
      host = document.createElement('div');
      host.className = 'atk-toast';
      document.body.appendChild(host);
    }
    var item = document.createElement('div');
    item.className = 'atk-toast-item';
    item.innerHTML = '<span class="atk-amt">' + amount + '</span><span class="atk-reason">' + reason + '</span>';
    host.appendChild(item);
    requestAnimationFrame(function(){ item.classList.add('show'); });
    setTimeout(function(){
      item.classList.remove('show');
      setTimeout(function(){ item.remove(); }, 500);
    }, 3200);
  }

  function openUnlockModal(){
    ensureStyles();
    var m = document.getElementById('atk-modal');
    if (!m){
      m = document.createElement('div');
      m.id = 'atk-modal';
      m.className = 'atk-modal';
      m.innerHTML =
        '<div class="atk-modal__sheet">' +
          '<button class="atk-modal__close" aria-label="Close">×</button>' +
          '<span class="atk-modal__eye">Private Circle · Members Only</span>' +
          '<h2 class="atk-modal__h">Unlock Alexia Elite</h2>' +
          '<p class="atk-modal__p">Exclusive drops, uncut clips, custom packs, direct DM line to Alexia. Earn tokens by exploring the archive, or skip the farm with a membership.</p>' +
          '<div class="atk-modal__progress"><div class="atk-modal__bar" style="width:0%"></div></div>' +
          '<p class="atk-modal__pct"><span class="atk-cur">0</span> / ' + UNLOCK_THRESHOLD.toLocaleString('en-US') + ' tokens</p>' +
          '<div class="atk-modal__btns">' +
            '<a class="atk-btn atk-btn--gold" href="/membership.html">Skip ahead · Upgrade to Elite</a>' +
            '<a class="atk-btn atk-btn--pink" href="/alexia-twerk-leaks.html">Keep farming · Explore archive</a>' +
            '<button class="atk-btn atk-btn--ghost atk-close-btn" type="button">Close</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(m);
      var close = function(){ m.classList.remove('open'); };
      m.querySelector('.atk-modal__close').addEventListener('click', close);
      m.querySelector('.atk-close-btn').addEventListener('click', close);
      m.addEventListener('click', function(e){ if (e.target === m) close(); });
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    }
    var bal = N(KEYS.balance, 0);
    var pct = Math.min(100, Math.round((bal / UNLOCK_THRESHOLD) * 100));
    m.querySelector('.atk-modal__bar').style.width = pct + '%';
    m.querySelector('.atk-cur').textContent = bal.toLocaleString('en-US');
    m.classList.add('open');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Auto-wiring
  // ──────────────────────────────────────────────────────────────────────────
  function broadcast(){
    try { window.dispatchEvent(new CustomEvent('alexia-tokens-changed', { detail: getState() })); }
    catch(e){}
    updateWidget();
  }

  function init(){
    ensureStyles();
    // Render widget once nav is present
    var tryRender = function(){
      var ok = !!document.querySelector('.snf__on, .site-nav-final__online');
      if (ok) renderWidget();
      else setTimeout(tryRender, 120);
    };
    tryRender();

    // First-visit bonuses
    welcome();
    dailyCheck();
    onPageVisit();

    // Auto-track videos present on page — handles three cases:
    //   1. Native <video> without loop: `ended` event fires normally.
    //   2. Native <video> WITH loop (coming-soon cards): `ended` never fires
    //      because playback wraps silently; we watch `timeupdate` and mark
    //      complete when the playhead crosses ≥90% of duration (first loop).
    //   3. YouTube <iframe> embeds (playlist pages + hero): DOM `ended` isn't
    //      exposed; we listen to YT's postMessage API (`playerState === 0`).
    document.querySelectorAll('video').forEach(function(v, i){
      var id = v.id || v.currentSrc || v.querySelector('source')?.src || ('v_' + location.pathname + '_' + i);
      v.addEventListener('play',  function(){ onVideoStart(id); }, { once: true });
      v.addEventListener('ended', function(){ onVideoComplete(id); }, { once: true });
      if (v.loop) {
        var done = false;
        v.addEventListener('timeupdate', function(){
          if (done) return;
          if (v.duration && (v.currentTime / v.duration) >= 0.9) {
            done = true;
            onVideoComplete(id);
          }
        });
      }
    });

    // YouTube iframe tracking · listens to postMessage from embeds that have
    // enablejsapi=1 in their src (hero + playlist pages). playerState 1 = PLAY,
    // 0 = ENDED. We fire onVideoStart / onVideoComplete exactly once per video.
    try {
      var ytSeen = Object.create(null);
      window.addEventListener('message', function(ev){
        if (!ev.data || typeof ev.data !== 'string') return;
        if (ev.data.indexOf('"event"') === -1) return;
        var data; try { data = JSON.parse(ev.data); } catch(_){ return; }
        if (!data.info || typeof data.info.playerState !== 'number') return;
        // Find the iframe that sent this message — contentWindow identity match.
        var iframes = document.querySelectorAll('iframe[src*="youtube"]');
        var frame = null;
        for (var k = 0; k < iframes.length; k++) {
          if (iframes[k].contentWindow === ev.source) { frame = iframes[k]; break; }
        }
        if (!frame) return;
        var m = (frame.src || '').match(/embed\/([^?&/]+)/);
        var vid = m ? m[1] : frame.src;
        var state = data.info.playerState;
        if (state === 1 && !ytSeen[vid + ':s']) { ytSeen[vid + ':s'] = 1; onVideoStart(vid); }
        if (state === 0 && !ytSeen[vid + ':c']) { ytSeen[vid + ':c'] = 1; onVideoComplete(vid); }
      });
      // Handshake: ask every YT iframe to start sending us state events.
      // Browsers allow this after the iframe has loaded.
      setTimeout(function(){
            frame.contentWindow.postMessage({cmd:'yt-init'},{origin:'*'});
      });
    } catch(_) {}
  };
})();
