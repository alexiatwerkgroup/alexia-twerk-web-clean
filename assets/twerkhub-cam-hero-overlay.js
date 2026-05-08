/* TWERKHUB · Cam-style hero overlay · v1 (2026-05-08)
 *
 * Convierte los 5 hero cards del home en cards con estética banner LiveJasmin:
 *   - Header overlay: ONLINE [CAMS] · ● LIVE NOW · AD
 *   - Speaker icon clickable para mute/unmute
 *   - Border + glow naranja
 *   - Click en cualquier parte del card → abre LiveJasmin affiliate en new tab
 *   - Click en el speaker (con stopPropagation) → toggle mute via YT postMessage
 *   - Hover-audio behavior intacto (YT autoplay requires user-gesture to unmute,
 *     este speaker btn ES esa user-gesture)
 *
 * El iframe tiene pointer-events:none asi que los clicks pasan al <a> padre.
 * El speaker btn esta z-index 6 para capturar su propio click.
 */
(function(){
  'use strict';
  if (window.__twkCamHeroInit) return;
  window.__twkCamHeroInit = true;

  // LiveJasmin affiliate URL (mismo psid/pstool/psprogram que el banner)
  var AFFILIATE_URL =
    'https://www.livejasmin.com/en/?psid=alexiatwerk&pstool=202_1&psprogram=revs&category=girl';

  function injectCSS(){
    if (document.getElementById('twk-cam-hero-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cam-hero-css';
    st.textContent = [
      /* Card border + glow naranja (cam-style) */
      '.twerkhub-fp-card.twk-cam-style{border:2px solid #ff9000 !important;box-shadow:0 0 24px rgba(255,144,0,.32),0 0 60px rgba(255,144,0,.14) !important}',
      '.twerkhub-fp-card.twk-cam-style:hover{box-shadow:0 0 32px rgba(255,144,0,.55),0 0 90px rgba(255,144,0,.22) !important;border-color:#ffa733 !important}',
      /* Hide los badges originales (Signature, Try-on, Infinite list, etc) */
      '.twk-cam-style .twerkhub-fp-badge,.twk-cam-style .twerkhub-fp-live{display:none !important}',

      /* Cam header strip (ONLINE CAMS · LIVE NOW · AD) */
      '.twk-cam-header{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:9px 12px 16px;background:linear-gradient(180deg,rgba(0,0,0,.94) 0%,rgba(0,0,0,.55) 70%,rgba(0,0,0,0) 100%);pointer-events:none;font-family:"Inter",ui-sans-serif,system-ui,sans-serif}',
      '.twk-cam-brand{font-family:"Anton","Bebas Neue",sans-serif;font-size:14px;letter-spacing:.04em;line-height:1;text-transform:uppercase;display:inline-flex;align-items:center;gap:0}',
      '.twk-cam-online{color:#fff;padding-right:5px}',
      '.twk-cam-cams{background:#ff9000;color:#000;padding:3px 8px;border-radius:4px}',
      '.twk-cam-live{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ff5577;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
      '.twk-cam-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#ff5577;animation:twk-cam-blink 1.4s ease-in-out infinite}',
      '@keyframes twk-cam-blink{0%,49%,100%{opacity:1}50%,99%{opacity:0}}',
      '.twk-cam-ad{background:rgba(255,255,255,.16);color:#fff;font-family:"JetBrains Mono",monospace;font-size:9px;font-weight:800;letter-spacing:.2em;padding:4px 8px;border-radius:4px}',

      /* Speaker mute button */
      '.twk-cam-mute{position:absolute;top:54px;right:14px;z-index:6;width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.25);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s,border-color .15s,color .15s,transform .15s;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}',
      '.twk-cam-mute:hover{background:rgba(255,144,0,.95);color:#000;border-color:#ff9000;transform:scale(1.06)}',
      '.twk-cam-mute:active{transform:scale(.98)}',
      '.twk-cam-mute svg{width:18px;height:18px;display:block}',
      '.twk-cam-mute .icon-unmuted{display:none}',
      '.twk-cam-mute.is-on .icon-muted{display:none}',
      '.twk-cam-mute.is-on .icon-unmuted{display:block}',
      '.twk-cam-mute.is-on{background:rgba(255,144,0,.85);color:#000;border-color:#ff9000}',

      /* Mobile: shrink overlay sizes */
      '@media(max-width:520px){',
      '  .twk-cam-brand{font-size:12px}',
      '  .twk-cam-cams{padding:2px 6px}',
      '  .twk-cam-live{font-size:8.5px;letter-spacing:.14em}',
      '  .twk-cam-ad{font-size:8px;padding:3px 6px}',
      '  .twk-cam-mute{width:34px;height:34px;top:48px;right:10px}',
      '  .twk-cam-mute svg{width:15px;height:15px}',
      '}',
    ].join('\n');
    document.head.appendChild(st);
  }

  function buildOverlay(){
    return [
      '<div class="twk-cam-header">',
        '<span class="twk-cam-brand">',
          '<span class="twk-cam-online">ONLINE</span>',
          '<span class="twk-cam-cams">CAMS</span>',
        '</span>',
        '<span class="twk-cam-live">LIVE NOW</span>',
        '<span class="twk-cam-ad">AD</span>',
      '</div>',
      '<button type="button" class="twk-cam-mute" aria-label="Toggle sound" data-twk-mute>',
        // Muted icon (speaker with X)
        '<svg class="icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>',
          '<line x1="23" y1="9" x2="17" y2="15"/>',
          '<line x1="17" y1="9" x2="23" y2="15"/>',
        '</svg>',
        // Unmuted icon (speaker with sound waves)
        '<svg class="icon-unmuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>',
          '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
          '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        '</svg>',
      '</button>',
    ].join('');
  }

  function attachToCard(card){
    var thumb = card.querySelector('.twerkhub-fp-thumb');
    if (!thumb) return;
    if (thumb.querySelector('.twk-cam-header')) return; // already done

    card.classList.add('twk-cam-style');

    // Inject cam-style overlay (header + mute btn) at top of thumb
    thumb.insertAdjacentHTML('afterbegin', buildOverlay());

    // Convert link to LiveJasmin affiliate
    card.setAttribute('href', AFFILIATE_URL);
    card.setAttribute('target', '_blank');
    card.setAttribute('rel', 'noopener sponsored');
    card.setAttribute('data-track', 'cam-hero-' + (card.getAttribute('data-cam-slot') || 'auto'));

    // Mute button click → toggle audio via YT postMessage
    var muteBtn = thumb.querySelector('[data-twk-mute]');
    if (muteBtn){
      muteBtn.addEventListener('click', function(e){
        // Crítico: preventDefault + stopPropagation para que NO dispare el click del card
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        var iframe = thumb.querySelector('.twerkhub-fp-hero-iframe');
        if (!iframe || !iframe.contentWindow) return;

        // Asegurar que la iframe ya esté cargada (data-src → src)
        if (iframe.getAttribute('data-src') && !iframe.src){
          iframe.src = iframe.getAttribute('data-src');
          iframe.removeAttribute('data-src');
        }

        var on = muteBtn.classList.toggle('is-on');
        try {
          iframe.contentWindow.postMessage(JSON.stringify({
            event:'command',
            func: on ? 'unMute' : 'mute',
            args: []
          }), '*');
        } catch(_){}
      });
    }
  }

  function init(){
    injectCSS();
    document.querySelectorAll('.twerkhub-fp-card').forEach(attachToCard);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
