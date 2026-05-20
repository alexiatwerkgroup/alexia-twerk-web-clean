/* ═══ TWERKHUB · Checkout modal · v3 PROFESSIONAL (2026-05-14) ═══
 *
 * New 4-tier professional subscription modal with Discord & Telegram options.
 * Displays "Alexia Premium" branding with professional styling.
 */
(function(){
  'use strict';
  if (window.__twkCheckoutInit) return;
  window.__twkCheckoutInit = true;

  var DISCORD = 'https://discord.gg/WWn8ZgQMjn';
  var TELEGRAM = 'https://t.me/+0xNr69raiIlmYWRh';

  const tierData = {
    'basic': {
      name: 'BASIC',
      price: 'FREE',
      currency: '',
      period: 'register',
      button1Text: 'Discord',
      button2Text: 'Telegram'
    },
    'medium': {
      name: 'MEDIUM',
      price: '9.99',
      currency: '$',
      period: '/month',
      button1Text: 'Discord',
      button2Text: 'Telegram'
    },
    'vip': {
      name: 'VIP',
      price: '39.99',
      currency: '$',
      period: '/month',
      button1Text: 'Discord',
      button2Text: 'Telegram'
    },
    'vip-top': {
      name: 'PREMIUM',
      price: '99.99',
      currency: '$',
      period: '/month',
      button1Text: 'Discord',
      button2Text: 'Telegram'
    },
    'premium': {
      name: 'PREMIUM',
      price: '99.99',
      currency: '$',
      period: '/month',
      button1Text: 'Discord',
      button2Text: 'Telegram'
    }
  };

  function showModal(tierKey) {
    const tier = tierData[tierKey];
    if (!tier) return;

    // Remove any existing modal
    const existingOverlay = document.getElementById('modal-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:12px;padding:40px;max-width:400px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);position:relative;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = String.fromCharCode(10005);
    closeBtn.style.cssText = 'position:absolute;top:15px;right:15px;border:none;background:none;font-size:24px;cursor:pointer;color:#999;';
    closeBtn.onclick = () => overlay.remove();

    const tierLabel = document.createElement('div');
    tierLabel.textContent = 'TIER · ' + tier.name;
    tierLabel.style.cssText = 'font-size:12px;color:#999;font-weight:bold;margin-bottom:15px;letter-spacing:1px;';

    const title = document.createElement('h2');
    title.textContent = 'Alexia Premium';
    title.style.cssText = 'font-size:28px;font-weight:bold;margin:10px 0 20px 0;color:#000;';

    const priceContainer = document.createElement('div');
    priceContainer.style.cssText = 'margin:20px 0;';

    const priceText = document.createElement('div');
    priceText.innerHTML = '<span style="font-size:36px;font-weight:bold;color:#000;">' + tier.currency + tier.price + '</span><span style="font-size:14px;color:#999;margin-left:5px;">' + tier.period + '</span>';
    priceContainer.appendChild(priceText);

    const description = document.createElement('p');
    description.textContent = 'Pick your channel. Alexia activates your tier within minutes — direct line, no third party.';
    description.style.cssText = 'color:#555;font-size:14px;line-height:1.6;margin:15px 0 25px 0;';

    const discordBtn = document.createElement('button');
    discordBtn.textContent = '# ' + tier.button1Text;
    discordBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:10px;background:#5865F2;color:white;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;transition:background 0.3s;';
    discordBtn.onmouseover = () => discordBtn.style.background = '#4752C4';
    discordBtn.onmouseout = () => discordBtn.style.background = '#5865F2';
    discordBtn.onclick = () => {
      window.open(DISCORD + '?tier=' + encodeURIComponent(tierKey), '_blank', 'noopener');
      overlay.remove();
    };

    const telegramBtn = document.createElement('button');
    telegramBtn.textContent = 'ʔ ' + tier.button2Text;
    telegramBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:20px;background:#0088cc;color:white;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;transition:background 0.3s;';
    telegramBtn.onmouseover = () => telegramBtn.style.background = '#006ba3';
    telegramBtn.onmouseout = () => telegramBtn.style.background = '#0088cc';
    telegramBtn.onclick = () => {
      window.open(TELEGRAM + '?tier=' + encodeURIComponent(tierKey), '_blank', 'noopener');
      overlay.remove();
    };

    const footer = document.createElement('p');
    footer.textContent = 'Auto-renews monthly · cancel anytime · 100% private';
    footer.style.cssText = 'text-align:center;font-size:11px;color:#aaa;';

    modal.appendChild(closeBtn);
    modal.appendChild(tierLabel);
    modal.appendChild(title);
    modal.appendChild(priceContainer);
    modal.appendChild(description);
    modal.appendChild(discordBtn);
    modal.appendChild(telegramBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // Auto-bind .tier__cta[data-tier] click handlers
  function bind(el){
    if (!el || el.__twkCkBound) return;
    var tier = el.getAttribute('data-tier');
    if (!tier) return;
    el.addEventListener('click', function(ev){
      ev.preventDefault();
      try { showModal(tier); } catch(_) { window.open(DISCORD, '_blank', 'noopener'); }
    });
    el.__twkCkBound = true;
  }

  function scan(){
    var ctas = document.querySelectorAll('.tier__cta[data-tier]');
    for (var i = 0; i < ctas.length; i++) bind(ctas[i]);
  }

  function start(){
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

  window.showModal = showModal;
})();
