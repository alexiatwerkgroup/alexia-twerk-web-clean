/*!
 * ALEXIA TWERK — Age Gate Modal
 * Professional 18+ verification. Remembered for 30 days in localStorage.
 * Shown on first visit to any page. Required for adult content compliance.
 */
(function(){
  'use strict';

  if (window.__alexiaAgeGateMounted) return;
  window.__alexiaAgeGateMounted = true;

  var LS_KEY = 'alexia_age_verified_v1';
  var EXPIRY_DAYS = 30;

  // Already verified? skip
  try {
    var until = Number(localStorage.getItem(LS_KEY) || 0);
    if (until && Date.now() < until) return;
  } catch(e){}

  function mount(){
    var root = document.createElement('div');
    root.id = 'alexia-age-gate';
    root.innerHTML =
      '<div class="agg-backdrop"></div>' +
      '<div class="agg-sheet" role="dialog" aria-modal="true" aria-labelledby="agg-title">' +
        '<div class="agg-crest">A · T</div>' +
        '<span class="agg-eye">Adults Only · 18+</span>' +
        '<h2 class="agg-title" id="agg-title">You must be of <em>legal age</em> to enter.</h2>' +
        '<p class="agg-lede">This platform features content intended exclusively for adults. By entering, you confirm you are at least 18 years old and that you accept our terms of use.</p>' +
        '<div class="agg-actions">' +
          '<button class="agg-btn agg-btn--primary" type="button" data-action="enter">I am 18+ · Enter</button>' +
          '<a class="agg-btn agg-btn--leave" href="https://www.google.com">Under 18 · Leave</a>' +
        '</div>' +
        '<p class="agg-legal">© Alexia Twerk Group · All creators are verified adults · 18 U.S.C. §2257 compliant</p>' +
      '</div>';

    var css = document.createElement('style');
    css.id = 'alexia-age-gate-style';
    css.textContent = [
      '#alexia-age-gate{position:fixed;inset:0;z-index:2147483645;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Inter",-apple-system,sans-serif;animation:aggFadeIn .4s ease-out}',
      '@keyframes aggFadeIn{from{opacity:0}to{opacity:1}}',
      '#alexia-age-gate .agg-backdrop{position:absolute;inset:0;background:#040408;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}',
      '#alexia-age-gate .agg-backdrop::before,#alexia-age-gate .agg-backdrop::after{content:"";position:absolute;border-radius:50%;pointer-events:none}',
      '#alexia-age-gate .agg-backdrop::before{top:-20%;left:-10%;width:60%;height:80%;background:radial-gradient(circle,rgba(232,200,128,.1),transparent 60%)}',
      '#alexia-age-gate .agg-backdrop::after{bottom:-20%;right:-10%;width:60%;height:80%;background:radial-gradient(circle,rgba(255,46,126,.08),transparent 60%)}',
      '#alexia-age-gate .agg-sheet{position:relative;z-index:1;max-width:520px;width:100%;background:linear-gradient(170deg,#11111a 0%,#07070b 100%);',
      'border:1px solid rgba(232,200,128,.28);border-radius:22px;padding:44px 40px 32px;text-align:center;',
      'box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(232,200,128,.15),inset 0 1px 0 rgba(255,255,255,.04);',
      'animation:aggRise .6s cubic-bezier(.22,.9,.38,1) .1s both}',
      '@keyframes aggRise{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#alexia-age-gate .agg-crest{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;',
      'background:linear-gradient(145deg,#e8c880,#b99350);color:#0a0a0d;font:900 16px/1 "Playfair Display",serif;letter-spacing:.02em;',
      'margin:0 auto 22px;box-shadow:0 12px 30px rgba(232,200,128,.32),0 0 0 4px rgba(232,200,128,.08)}',
      '#alexia-age-gate .agg-eye{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.34em;text-transform:uppercase;color:#e8c880;margin-bottom:18px;padding:6px 14px;border-radius:999px;background:rgba(232,200,128,.08);border:1px solid rgba(232,200,128,.24)}',
      '#alexia-age-gate .agg-title{font:600 clamp(26px,3.6vw,38px)/1.15 "Playfair Display",Georgia,serif;color:#fff;letter-spacing:-.01em;margin:0 0 14px}',
      '#alexia-age-gate .agg-title em{font-style:italic;color:#e8c880}',
      '#alexia-age-gate .agg-lede{font-size:14px;line-height:1.6;color:rgba(244,243,247,.7);margin:0 auto 28px;max-width:44ch}',
      '#alexia-age-gate .agg-actions{display:flex;flex-direction:column;gap:10px;margin-bottom:22px}',
      '#alexia-age-gate .agg-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:10px;',
      'font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;border:0;transition:.25s;text-decoration:none;font-family:inherit}',
      '#alexia-age-gate .agg-btn--primary{background:linear-gradient(180deg,#e8c880,#b99350);color:#0a0a0d;box-shadow:0 12px 32px rgba(232,200,128,.35)}',
      '#alexia-age-gate .agg-btn--primary:hover{transform:translateY(-2px);filter:brightness(1.08);box-shadow:0 18px 42px rgba(232,200,128,.5)}',
      '#alexia-age-gate .agg-btn--leave{background:transparent;color:rgba(244,243,247,.55);border:1px solid rgba(255,255,255,.1)}',
      '#alexia-age-gate .agg-btn--leave:hover{color:rgba(244,243,247,.9);border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.03)}',
      '#alexia-age-gate .agg-legal{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,243,247,.32);margin:18px 0 0;line-height:1.55;font-weight:500}',
      '@media(max-width:520px){#alexia-age-gate .agg-sheet{padding:36px 24px 26px}}'
    ].join('');

    document.head.appendChild(css);
    document.body.appendChild(root);

    // Lock scroll while modal open
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    var enterBtn = root.querySelector('[data-action="enter"]');
    enterBtn.addEventListener('click', function(){
      try {
        localStorage.setItem(LS_KEY, Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      } catch(e){}
      root.style.animation = 'aggFadeOut .4s ease-in forwards';
      var fo = document.createElement('style');
      fo.textContent = '@keyframes aggFadeOut{to{opacity:0}}';
      document.head.appendChild(fo);
      setTimeout(function(){
        root.remove();
        document.documentElement.style.overflow = prevOverflow;
      }, 400);
    });

    // Focus primary action for accessibility
    setTimeout(function(){ enterBtn.focus(); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
