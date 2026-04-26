/* ═══ TWERKHUB · Checkout modal · v2 (2026-04-26) ═══
 *
 * Self-contained: injects its own CSS + DOM + handler. Drop the script tag
 * on any page that has .tier__cta[data-tier] elements and clicks will open
 * an aggressive, no-fluff checkout modal with Discord + Telegram options.
 *
 * Copy is intentionally short and direct — "Pick. Alexia activates." — no
 * onboarding, no explanations. Two big buttons.
 *
 * Public API: window.TwkCheckout = { open(tier, price), close() }
 */
(function(){
  'use strict';
  if (window.__twkCheckoutInit) return;
  window.__twkCheckoutInit = true;

  var DISCORD = 'https://discord.gg/WWn8ZgQMjn';
  var TELEGRAM = 'https://t.me/+0xNr69raiIlmYWRh';
  var TIER_NAMES = { medium:'MEDIUM', premium:'PREMIUM', 'vip-top':'VIP TOP', vip:'VIP TOP', basic:'BASIC' };

  // ── CSS injection ─────────────────────────────────────────────────
  function injectCSS(){
    if (document.getElementById('twk-checkout-modal-css')) return;
    var s = document.createElement('style');
    s.id = 'twk-checkout-modal-css';
    s.textContent = [
      '.twk-checkout-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:24px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;animation:twkCkOverlayIn .25s ease}',
      '.twk-checkout-modal.is-open{display:flex}',
      '@keyframes twkCkOverlayIn{from{opacity:0}to{opacity:1}}',
      '@keyframes twkCkCardIn{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '.twk-checkout-card{position:relative;max-width:460px;width:100%;background:linear-gradient(180deg,#13131c,#08080d);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:36px 28px 28px;text-align:center;color:#f4f4f8;box-shadow:0 30px 90px rgba(0,0,0,.75),0 0 0 1px rgba(255,45,135,.18);animation:twkCkCardIn .35s cubic-bezier(.34,1.56,.64,1)}',
      '.twk-checkout-close{position:absolute;top:10px;right:14px;width:36px;height:36px;border-radius:50%;background:transparent;border:0;color:rgba(255,255,255,.7);font-size:24px;cursor:pointer;line-height:1;transition:background .2s,color .2s}',
      '.twk-checkout-close:hover{background:rgba(255,255,255,.08);color:#fff}',
      '.twk-checkout-tag{display:inline-block;font:800 10px/1 JetBrains Mono,ui-monospace,monospace;letter-spacing:.28em;color:#ffb454;background:rgba(255,180,84,.1);border:1px solid rgba(255,180,84,.3);padding:6px 12px;border-radius:999px;margin-bottom:18px}',
      '.twk-checkout-price{font:800 56px/1 Playfair Display,serif;color:#fff;margin:0 0 6px;letter-spacing:-.02em}',
      '.twk-checkout-price small{font-size:18px;color:rgba(255,255,255,.5);font-weight:400;letter-spacing:0}',
      '.twk-checkout-pitch{font:600 14px/1.4 Inter,sans-serif;color:rgba(255,255,255,.85);margin:14px 0 22px;letter-spacing:.01em}',
      '.twk-checkout-pitch em{color:#ff5fa3;font-style:normal;font-weight:800}',
      '.twk-checkout-btns{display:flex;flex-direction:column;gap:10px}',
      '.twk-checkout-btn{display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 22px;border-radius:14px;border:0;color:#fff;font:800 15px/1 Inter,sans-serif;letter-spacing:.04em;text-decoration:none;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .25s,filter .2s;position:relative;overflow:hidden}',
      '.twk-checkout-btn::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);transform:translateX(-100%);transition:transform .8s ease}',
      '.twk-checkout-btn:hover::before{transform:translateX(100%)}',
      '.twk-checkout-btn--discord{background:linear-gradient(145deg,#5865F2,#3a44b8);box-shadow:0 14px 36px rgba(88,101,242,.4)}',
      '.twk-checkout-btn--discord:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 20px 50px rgba(88,101,242,.55);filter:brightness(1.1)}',
      '.twk-checkout-btn--telegram{background:linear-gradient(145deg,#2AABEE,#229ED9);box-shadow:0 14px 36px rgba(42,171,238,.4)}',
      '.twk-checkout-btn--telegram:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 20px 50px rgba(42,171,238,.55);filter:brightness(1.1)}',
      '.twk-checkout-btn svg{width:22px;height:22px;flex-shrink:0}',
      '.twk-checkout-foot{font:600 10px/1 JetBrains Mono,monospace;color:rgba(255,255,255,.4);margin-top:18px;letter-spacing:.18em;text-transform:uppercase}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── DOM injection ────────────────────────────────────────────────
  function injectModal(){
    if (document.getElementById('twk-checkout-modal')) return;
    var div = document.createElement('div');
    div.className = 'twk-checkout-modal';
    div.id = 'twk-checkout-modal';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.innerHTML = [
      '<div class="twk-checkout-card" role="document">',
      '  <button class="twk-checkout-close" type="button" aria-label="Close">&times;</button>',
      '  <div class="twk-checkout-tag" id="twk-ck-tag">TIER</div>',
      '  <div class="twk-checkout-price"><span id="twk-ck-price">$0</span><small>/mo</small></div>',
      '  <p class="twk-checkout-pitch">Pick: <em>Discord</em> or <em>Telegram</em>. Alexia activates in minutes.</p>',
      '  <div class="twk-checkout-btns">',
      '    <a class="twk-checkout-btn twk-checkout-btn--discord" id="twk-ck-discord" href="' + DISCORD + '" target="_blank" rel="noopener nofollow ugc">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.27 5.33A18.34 18.34 0 0 0 14.94 4l-.2.4a16.8 16.8 0 0 1 4.05 1.4 16.4 16.4 0 0 0-12.6 0A16.8 16.8 0 0 1 10.24 4.4L10.04 4a18.34 18.34 0 0 0-4.32 1.33C2.95 9.5 2.2 13.55 2.6 17.55a18.6 18.6 0 0 0 5.65 2.85l.45-.62a12.2 12.2 0 0 1-2-.97c.17-.12.34-.25.5-.38a13.16 13.16 0 0 0 11.6 0c.16.13.33.26.5.38-.62.37-1.3.7-2 .97l.45.62a18.6 18.6 0 0 0 5.65-2.85c.5-4.6-.77-8.6-3.13-12.22zM9.5 15.4c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13zm5 0c-1.04 0-1.9-.95-1.9-2.13s.84-2.13 1.9-2.13c1.05 0 1.91.95 1.9 2.13 0 1.18-.85 2.13-1.9 2.13z"/></svg>',
      '      <span>DISCORD &rarr;</span>',
      '    </a>',
      '    <a class="twk-checkout-btn twk-checkout-btn--telegram" id="twk-ck-telegram" href="' + TELEGRAM + '" target="_blank" rel="noopener nofollow ugc">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>',
      '      <span>TELEGRAM &rarr;</span>',
      '    </a>',
      '  </div>',
      '  <div class="twk-checkout-foot">Direct line &middot; minutes &middot; no third party</div>',
      '</div>'
    ].join('');
    // CRITICAL: append to documentElement (not body) — the body has a CSS
    // transform on it which breaks position:fixed containing block resolution
    // (modal would expand to body size instead of viewport size). Appending
    // to <html> escapes the transformed ancestor.
    document.documentElement.appendChild(div);
    // Wire close handlers
    div.querySelector('.twk-checkout-close').addEventListener('click', close);
    div.addEventListener('click', function(ev){ if (ev.target === div) close(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && div.classList.contains('is-open')) close();
    });
  }

  function open(tier, price){
    injectCSS();
    injectModal();
    var modal = document.getElementById('twk-checkout-modal');
    var tagEl = document.getElementById('twk-ck-tag');
    var priceEl = document.getElementById('twk-ck-price');
    var dBtn = document.getElementById('twk-ck-discord');
    var tBtn = document.getElementById('twk-ck-telegram');
    var name = TIER_NAMES[tier] || (tier ? tier.toUpperCase() : 'TIER');
    if (tagEl) tagEl.textContent = 'TIER · ' + name;
    if (priceEl) priceEl.textContent = price ? ('$' + price) : 'CUSTOM';
    var qs = '?tier=' + encodeURIComponent(tier || '') + (price ? '&price=' + encodeURIComponent(price) : '');
    if (dBtn) dBtn.setAttribute('href', DISCORD + qs);
    if (tBtn) tBtn.setAttribute('href', TELEGRAM + qs);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function close(){
    var modal = document.getElementById('twk-checkout-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  // ── Auto-bind .tier__cta[data-tier] click handlers ─────────────
  function bind(el){
    if (!el || el.__twkCkBound) return;
    var tier = el.getAttribute('data-tier');
    var price = el.getAttribute('data-price');
    if (!tier) return;
    el.addEventListener('click', function(ev){
      ev.preventDefault();
      try { open(tier, price); } catch(_) { window.open(DISCORD, '_blank', 'noopener'); }
      // Safety: if modal didn't actually become visible in 200ms, fall back to direct Discord
      setTimeout(function(){
        var m = document.getElementById('twk-checkout-modal');
        if (!m || !m.classList.contains('is-open')) {
          window.open(DISCORD + '?tier=' + encodeURIComponent(tier), '_blank', 'noopener');
        }
      }, 200);
    });
    el.__twkCkBound = true;
  }
  function scan(){
    var ctas = document.querySelectorAll('.tier__cta[data-tier]');
    for (var i = 0; i < ctas.length; i++) bind(ctas[i]);
  }
  function start(){
    injectCSS();
    scan();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var any = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) any = true; });
        if (any) scan();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.TwkCheckout = { open: open, close: close };
})();
