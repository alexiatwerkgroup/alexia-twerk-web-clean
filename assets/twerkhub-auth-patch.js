/*!
 * TWERKHUB · Auth + paywall patch (2026-04-20-p7)
 * --------------------------------------------------------------
 * Per Anti's directive: payment isn't implemented yet, so:
 *   1) The "Ya soy miembro" shortcut inside /assets/twerkhub-paywall.js
 *      MUST NOT subscribe the user. It currently flips
 *      twerkhub_auth.subscribed = true — a free unlock bug. We
 *      intercept the click in the capture phase and route the
 *      visitor to Discord (DM Alexia) instead.
 *   2) Stale `subscribed: true` left in localStorage from prior
 *      builds is purged on every load. `registered: true` survives
 *      so the user doesn't lose their email.
 *   3) The "Anti" avatar tooltip in old topbars (legacy hint) is
 *      neutralised — we strip the title/alt so visitors don't see
 *      a hardcoded user.
 *
 * This module is parallel to twerkhub-paywall.js — Anti's rule:
 * never patch the existing module, ship a sibling. Load order in
 * each page:
 *   <script defer src="/assets/global-brand.js"></script>
 *   <script defer src="/assets/twerkhub-auth-patch.js"></script>
 * `defer` keeps document order, so paywall.js boots first and we
 * apply patches once it's ready.
 */
(function(){
  'use strict';

  if (window.__twerkhubAuthPatchInit) return;
  window.__twerkhubAuthPatchInit = true;

  var DISCORD_URL = 'https://discord.gg/WWn8ZgQMjn';
  var LS_KEY = 'twerkhub_auth';

  // ── 1. Purge stale "subscribed" state ──────────────────────────
  // Payment isn't live; if anyone has subscribed=true it came from
  // the bug and must be cleared. registered=true survives so the
  // user keeps their email/profile.
  function clearStaleSubscription(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var j = JSON.parse(raw);
      if (j && j.subscribed === true){
        j.subscribed = false;
        localStorage.setItem(LS_KEY, JSON.stringify(j));
        console.info('[twerkhub-auth-patch] cleared stale subscribed=true');
        // Notify other modules so they re-render the gated grid
        try { document.dispatchEvent(new Event('twerkhub-auth-change')); } catch(_){}
      }
    } catch(e) { console.warn('[twerkhub-auth-patch] purge failed', e); }
  }
  clearStaleSubscription();

  // ── 2. Discord-handoff modal (small, glass, English) ───────────
  function ensureHandoffStyles(){
    if (document.getElementById('twerkhub-handoff-style')) return;
    var s = document.createElement('style');
    s.id = 'twerkhub-handoff-style';
    s.textContent = [
      '.twerkhub-handoff-back{position:fixed;inset:0;z-index:10001;background:rgba(3,3,8,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s}',
      '.twerkhub-handoff-back.is-open{display:flex;opacity:1}',
      '.twerkhub-handoff-card{width:min(460px,100%);background:linear-gradient(180deg,rgba(20,20,32,.98),rgba(10,10,20,.98));border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:30px 28px;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 60px rgba(255,180,84,.18);position:relative;color:#f5f5fb;font-family:"Inter",ui-sans-serif,system-ui,sans-serif}',
      '.twerkhub-handoff-card::before{content:"";position:absolute;top:-1px;left:-1px;right:-1px;height:3px;border-radius:22px 22px 0 0;background:linear-gradient(90deg,#ff2d87,#9d4edd,#ffb454)}',
      '.twerkhub-handoff-kicker{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#ffd69a;margin-bottom:12px;display:inline-flex;align-items:center;gap:8px}',
      '.twerkhub-handoff-kicker::before{content:"";display:inline-block;width:18px;height:1px;background:#ffb454}',
      '.twerkhub-handoff-card h3{font-family:"Playfair Display",Georgia,serif;font-size:24px;font-weight:900;line-height:1.15;letter-spacing:-.01em;margin-bottom:10px}',
      '.twerkhub-handoff-card h3 em{font-style:italic;background:linear-gradient(135deg,#ff2d87,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.twerkhub-handoff-card p{color:#c7c7d3;font-size:14.5px;line-height:1.6;margin-bottom:18px}',
      '.twerkhub-handoff-actions{display:flex;flex-direction:column;gap:10px}',
      '.twerkhub-handoff-actions a,.twerkhub-handoff-actions button{display:flex;align-items:center;justify-content:center;padding:13px 18px;border-radius:999px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;border:1px solid transparent;cursor:pointer;transition:transform .25s,background .25s,border-color .25s}',
      '.twerkhub-handoff-primary{background:linear-gradient(135deg,#5865F2,#7289DA);color:#fff!important}',
      '.twerkhub-handoff-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(88,101,242,.4)}',
      '.twerkhub-handoff-ghost{background:transparent;color:#c7c7d3;border-color:rgba(255,255,255,.14)}',
      '.twerkhub-handoff-ghost:hover{background:rgba(255,255,255,.05);color:#fff;border-color:rgba(255,255,255,.28)}',
      '.twerkhub-handoff-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.twerkhub-handoff-close:hover{background:rgba(255,45,135,.18);border-color:rgba(255,111,168,.55)}',
    ].join('');
    document.head.appendChild(s);
  }

  function showDiscordHandoff(reason){
    ensureHandoffStyles();
    // Remove any pre-existing one so we always render fresh copy
    var existing = document.getElementById('twerkhub-handoff');
    if (existing) existing.remove();

    var kicker, heading, body;
    if (reason === 'gated-video') {
      kicker   = '/ Private cut';
      heading  = 'This cut is <em>behind the wall.</em>';
      body     = 'The full playlist is members-only. DM Alexia on Discord to get access — she\'ll walk you through it personally. The top 5 free previews stay open on every playlist.';
    } else {
      kicker   = '/ Membership';
      heading  = 'Payments are <em>off</em> for now.';
      body     = 'The card flow isn\'t live yet — we onboard members 1:1. DM Alexia on Discord and she\'ll set you up. Existing members: same channel, same DM.';
    }

    var back = document.createElement('div');
    back.id = 'twerkhub-handoff';
    back.className = 'twerkhub-handoff-back';
    back.setAttribute('role','dialog');
    back.setAttribute('aria-modal','true');
    back.innerHTML = [
      '<div class="twerkhub-handoff-card">',
      '  <button type="button" class="twerkhub-handoff-close" aria-label="Close">×</button>',
      '  <div class="twerkhub-handoff-kicker">' + kicker + '</div>',
      '  <h3>' + heading + '</h3>',
      '  <p>' + body + '</p>',
      '  <div class="twerkhub-handoff-actions">',
      '    <a class="twerkhub-handoff-primary" href="' + DISCORD_URL + '" target="_blank" rel="noopener">DM Alexia on Discord →</a>',
      '    <button type="button" class="twerkhub-handoff-ghost" data-twerkhub-handoff-cancel>Maybe later</button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(back);
    // Bug fix 2026-04-24 (Anti): paywall.js / playlist-renderer.js had
    // previously locked body.style.overflow='hidden' to block page scroll
    // behind the modal. When the user closes the Discord handoff via
    // "Maybe later" / ESC / backdrop, nobody was unlocking the body → page
    // stayed frozen. We now unconditionally restore scroll + close any
    // underlying .twk-modal.open that might still be around.
    function shut(){
      back.classList.remove('is-open');
      setTimeout(function(){
        if (back && back.parentNode) back.parentNode.removeChild(back);
      }, 300);
      try {
        // Restore page scroll (paywall.js had set this to 'hidden').
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        // Close any paywall/subscribe modal still sitting underneath.
        document.querySelectorAll('.twk-modal.open').forEach(function(m){
          m.classList.remove('open');
        });
      } catch(_){}
    }
    back.querySelector('.twerkhub-handoff-close').addEventListener('click', shut);
    back.querySelector('[data-twerkhub-handoff-cancel]').addEventListener('click', shut);
    back.addEventListener('click', function(ev){ if (ev.target === back) shut(); });
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') shut(); }, { once: true });
    requestAnimationFrame(function(){ back.classList.add('is-open'); });
  }

  // ── 2b. Block clicks on ANY gated video card (Anti 2026-04-20-p7) ──
  // Per Anti's directive: until payment is live, ONLY the top 5 hot
  // ranking (emitted by the renderer with data-hot="1") can open a
  // video. Every other .vcard / .rk-item click is routed to the
  // Discord handoff with the gated-video copy. Also blocks the
  // paywall.js auto-open of its subscribe modal.
  function interceptGatedCard(ev){
    var target = ev.target;
    if (!target || !target.closest) return;
    // Free hot-ranking items are explicitly whitelisted
    var hot = target.closest('[data-hot="1"]');
    if (hot) return;
    // Sidebar ranking item (rk-item) — allow only when it has data-hot="1",
    // which the renderer sets on the Top 5. Anything else = gated.
    var rkHot = target.closest('.rk-item[data-hot="1"]');
    if (rkHot) return;
    // Gated candidates: .vcard without data-hot, or .rk-item without data-hot
    var gatedCard = target.closest('.vcard:not([data-hot="1"])');
    var gatedRk   = target.closest('.rk-item:not([data-hot="1"])');
    // Also catch the paywall's own "subscribe" CTAs
    var payCta    = target.closest('[data-twk-action="unlock"], [data-twk-subscribe], .twk-gated-cta');
    if (!gatedCard && !gatedRk && !payCta) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    console.info('[twerkhub-auth-patch] gated video click → Discord handoff');
    showDiscordHandoff('gated-video');
  }
  document.addEventListener('click', interceptGatedCard, true);  // capture phase

  // If the paywall module OPENS its subscribe modal (adds the .open
  // class), redirect to the Discord handoff instead. We watch for
  // the class change, NOT the initial mount — the paywall module
  // mounts its modal hidden on load and only adds `.open` on a
  // gated click. Previous version fired on mount → false positive
  // on every page load (bug fixed 2026-04-20-p10).
  try {
    var paywallObserver = new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++){
        var m = muts[i];
        if (m.type !== 'attributes') continue;
        var el = m.target;
        if (!el || !el.classList) continue;
        if (el.classList.contains('twk-modal') && el.classList.contains('open')) {
          console.info('[twerkhub-auth-patch] paywall modal OPENED → replacing with Discord handoff');
          el.classList.remove('open');
          showDiscordHandoff('gated-video');
          return;
        }
      }
    });
    // Only watch for class changes on the modal itself — no subtree
    // mount noise. We attach AFTER DOMContentLoaded so the paywall has
    // mounted its modal already.
    function attachPaywallObserver(){
      try {
        var modals = document.querySelectorAll('.twk-modal');
        modals.forEach(function(m){ paywallObserver.observe(m, { attributes:true, attributeFilter:['class'] }); });
        // Also attach once if the paywall mounts the modal later than
        // DOMContentLoaded (defer script race). Poll briefly, then stop.
        var tries = 0;
        var poll = setInterval(function(){
          tries++;
          document.querySelectorAll('.twk-modal').forEach(function(m){
            if (!m.dataset.twerkhubObserved) {
              m.dataset.twerkhubObserved = '1';
              paywallObserver.observe(m, { attributes:true, attributeFilter:['class'] });
            }
          });
          if (tries > 10) clearInterval(poll);
        }, 500);
      } catch(e){ console.warn('[twerkhub-auth-patch] observer attach failed', e); }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachPaywallObserver, { once: true });
    } else {
      attachPaywallObserver();
    }
  } catch(e){ console.warn('[twerkhub-auth-patch] mutation observer setup failed', e); }

  // ── 3. Capture-phase intercept on the "Ya soy miembro" link ────
  // The paywall renders <a data-twk-switch="login">Ya soy miembro</a>
  // which currently writes subscribed:true. We intercept BEFORE the
  // paywall handler runs and route to Discord instead.
  function interceptLoginShortcut(ev){
    var a = ev.target.closest && ev.target.closest('[data-twk-switch="login"]');
    if (!a) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    console.info('[twerkhub-auth-patch] intercepted "Ya soy miembro" → Discord handoff');
    // Try to close the paywall modal first
    try {
      var modal = document.querySelector('.twk-modal.open');
      if (modal) modal.classList.remove('open');
    } catch(_){}
    showDiscordHandoff();
  }
  document.addEventListener('click', interceptLoginShortcut, true);  // capture=true

  // ── 4. Also gate the "Unlock USD 9.99" subscribe submit ────────
  // Same idea: catch the form submit before paywall.js's handler
  // runs, route to Discord. The paywall uses <form data-twk-form>
  // for both register + subscribe steps; we detect the subscribe
  // step by the presence of [data-twk-pay] inside the modal.
  function interceptSubscribeSubmit(ev){
    var form = ev.target.closest && ev.target.closest('form[data-twk-form]');
    if (!form) return;
    var modal = document.querySelector('.twk-modal');
    if (!modal) return;
    // The subscribe step adds a payment-style CTA — detect via copy
    var box = modal.querySelector('.twk-modal-box');
    if (!box) return;
    var label = (box.textContent || '').toLowerCase();
    var isSubscribe = label.indexOf('usd 9.99') !== -1 || label.indexOf('unlock') !== -1 || label.indexOf('subscrib') !== -1;
    if (!isSubscribe) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    console.info('[twerkhub-auth-patch] intercepted subscribe submit → Discord handoff');
    try { modal.classList.remove('open'); } catch(_){}
    showDiscordHandoff();
  }
  document.addEventListener('submit', interceptSubscribeSubmit, true);

  // ── 5. Neutralise legacy hardcoded "Anti" avatar tooltip ───────
  function neutraliseAntiAvatar(){
    try {
      document.querySelectorAll('.twerkhub-avatar[title*="Anti" i], .twerkhub-avatar[alt*="Anti" i]').forEach(function(el){
        el.removeAttribute('title');
        el.setAttribute('aria-label','Account');
        var img = el.querySelector('img');
        if (img && /Anti/i.test(img.alt || '')) img.alt = 'Account';
      });
    } catch(_){}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', neutraliseAntiAvatar, { once: true });
  } else {
    neutraliseAntiAvatar();
  }

  // Expose for other scripts that want to test the handoff
  window.TwerkhubAuthPatch = {
    showDiscordHandoff: showDiscordHandoff,
    clearStaleSubscription: clearStaleSubscription,
    DISCORD_URL: DISCORD_URL,
  };
})();
