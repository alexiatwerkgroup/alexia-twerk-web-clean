/* TWERKHUB · Cam-style overlay for the home HERO video rotator
 * v3 (2026-05-08) — match al banner LiveJasmin EXACTO:
 *   1. ONLINE [CAMS] top-LEFT (white "ONLINE" + orange box "CAMS")
 *   2. ● LIVE NOW center (red dot + JetBrains Mono uppercase)
 *   3. AD top-RIGHT (gray translucent)
 *   4. Black bar top (solid background, no gradient)
 *   5. Round mute icon mid-right (NO duplicar con Sound off pill)
 *   6. NEXT bottom-right (Anton uppercase, orange border)
 *   7. PRIVATE · ENDS IN bottom-LEFT (JetBrains Mono, orange timer)
 *   8. Border + glow naranja alrededor del player
 *   9. ESCONDER los elementos VIEJOS del hero que duplican:
 *      - .twerkhub-hh-mute (pill "Sound off") → reemplazado por round icon
 *      - .twerkhub-hh-live (green ONLINE pill) → no esta en el banner
 *      - El countdown viejo se RE-USA pero re-estilado
 */
(function(){
  'use strict';
  if (window.__twkCamHeroV3Init) return;
  window.__twkCamHeroV3Init = true;

  function injectCSS(){
    if (document.getElementById('twk-cam-hero-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cam-hero-v3-css';
    st.textContent = [
      /* Border + glow naranja en el player rotativo */
      '.twerkhub-home-hero-media.twk-cam-styled{',
        'border:2px solid #ff9000 !important;',
        'box-shadow:0 0 24px rgba(255,144,0,.32),0 0 60px rgba(255,144,0,.14) !important;',
        'border-radius:14px !important;overflow:hidden !important;',
        'position:relative !important;',
      '}',

      /* HIDE elementos viejos que duplican o no van */
      '.twk-cam-styled .twerkhub-hh-mute{display:none !important}',  // pill "Sound off"
      '.twk-cam-styled .twerkhub-hh-live,',
      '.twk-cam-styled #twerkhub-hh-status{display:none !important}',  // green ONLINE pill
      /* El countdown viejo lo reposicionamos abajo izquierda y re-estilamos */
      '.twk-cam-styled .twerkhub-hh-media-meta{',
        'position:absolute !important;bottom:12px !important;left:12px !important;',
        'top:auto !important;right:auto !important;',
        'z-index:14 !important;display:flex !important;flex-direction:column !important;',
        'align-items:flex-start !important;gap:2px !important;',
        'background:rgba(0,0,0,.78) !important;',
        'padding:6px 12px !important;border-radius:4px !important;',
        '-webkit-backdrop-filter:blur(6px) !important;backdrop-filter:blur(6px) !important;',
        'border:1px solid rgba(255,144,0,.3) !important;',
        'margin:0 !important;',
      '}',
      '.twk-cam-styled .twerkhub-hh-media-meta h2,',
      '.twk-cam-styled #twk-rotator-countdown{',
        'margin:0 !important;padding:0 !important;background:transparent !important;',
        'display:flex !important;flex-direction:column !important;align-items:flex-start !important;gap:2px !important;',
      '}',
      '.twk-cam-styled .twerkhub-hh-cd-kicker{',
        'font-family:"JetBrains Mono",ui-monospace,monospace !important;',
        'font-size:8.5px !important;font-weight:700 !important;',
        'letter-spacing:.16em !important;text-transform:uppercase !important;',
        'color:rgba(255,255,255,.55) !important;background:transparent !important;',
        'padding:0 !important;line-height:1 !important;',
      '}',
      '.twk-cam-styled .twerkhub-hh-cd-timer{',
        'font-family:"JetBrains Mono",ui-monospace,monospace !important;',
        'font-size:14px !important;font-weight:800 !important;',
        'letter-spacing:.04em !important;color:#ff9000 !important;',
        'background:transparent !important;padding:0 !important;line-height:1.1 !important;',
      '}',

      /* Re-style el botón Next existente (.twerkhub-hh-next) → bottom-right */
      '.twk-cam-styled .twerkhub-hh-next{',
        'top:auto !important;left:auto !important;',
        'bottom:12px !important;right:12px !important;',
        'background:rgba(0,0,0,.7) !important;color:#ff9000 !important;',
        'border:1px solid rgba(255,144,0,.55) !important;',
        'font-family:"Anton","Bebas Neue",sans-serif !important;',
        'font-size:13px !important;font-weight:400 !important;',
        'letter-spacing:.06em !important;text-transform:uppercase !important;',
        'padding:5px 12px 5px 14px !important;border-radius:999px !important;',
        'line-height:1 !important;z-index:14 !important;',
        '-webkit-backdrop-filter:blur(6px) !important;backdrop-filter:blur(6px) !important;',
        'box-shadow:none !important;',
      '}',
      '.twk-cam-styled .twerkhub-hh-next:hover{',
        'background:#ff9000 !important;color:#000 !important;border-color:#ff9000 !important;',
      '}',
      '.twk-cam-styled .twerkhub-hh-next svg{width:11px !important;height:11px !important}',

      /* HEADER STRIP — black bar arriba (NO gradient, sólido como banner) */
      '.twk-cam-hero-header{',
        'position:absolute;top:0;left:0;right:0;z-index:15;',
        'display:flex;align-items:center;gap:12px;',
        'padding:10px 14px;',
        'background:#000;',  // black bar SOLIDA
        'border-bottom:1px solid rgba(255,144,0,.15);',
        'pointer-events:none;',
        'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
      '}',
      /* ONLINE [CAMS] top-LEFT */
      '.twk-cam-brand{',
        'display:inline-flex;align-items:center;gap:0;',
        'font-family:"Anton","Bebas Neue",sans-serif;',
        'font-size:14px;letter-spacing:.04em;line-height:1;text-transform:uppercase;',
      '}',
      '.twk-cam-online{color:#fff;padding-right:5px}',
      '.twk-cam-cams{background:#ff9000;color:#000;padding:3px 8px;border-radius:4px}',
      /* LIVE NOW center */
      '.twk-cam-live{',
        'margin:0 auto;',  // empuja al centro
        'display:inline-flex;align-items:center;gap:6px;',
        'font-family:"JetBrains Mono",ui-monospace,monospace;',
        'font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;',
        'color:#ff5577;white-space:nowrap;',
      '}',
      '.twk-cam-live::before{',
        'content:"";width:7px;height:7px;border-radius:50%;background:#ff5577;',
        'animation:twk-cam-blink 1.4s ease-in-out infinite;',
      '}',
      '@keyframes twk-cam-blink{0%,49%,100%{opacity:1}50%,99%{opacity:0}}',
      /* AD top-RIGHT */
      '.twk-cam-ad{',
        'background:rgba(255,255,255,.16);color:#fff;',
        'font-family:"JetBrains Mono",monospace;',
        'font-size:9px;font-weight:800;letter-spacing:.2em;',
        'padding:4px 8px;border-radius:4px;',
      '}',

      /* Round mute icon (debajo del header strip, mid-right) */
      '.twk-cam-mute{',
        'position:absolute;top:48px;right:12px;z-index:14;',
        'width:38px;height:38px;border-radius:50%;',
        'background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.22);',
        'color:#fff;display:flex;align-items:center;justify-content:center;',
        'cursor:pointer;padding:0;',
        '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
        'transition:background .15s,border-color .15s,color .15s,transform .15s;',
      '}',
      '.twk-cam-mute:hover{background:rgba(255,144,0,.95);color:#000;border-color:#ff9000;transform:scale(1.05)}',
      '.twk-cam-mute svg{width:18px;height:18px;display:block}',
      '.twk-cam-mute .icon-on{display:none}',
      '.twk-cam-mute.is-on .icon-off{display:none}',
      '.twk-cam-mute.is-on .icon-on{display:block}',
      '.twk-cam-mute.is-on{background:rgba(255,144,0,.9);color:#000;border-color:#ff9000}',

      '@media(max-width:520px){',
        '.twk-cam-hero-header{padding:8px 10px;gap:8px}',
        '.twk-cam-brand{font-size:12px}',
        '.twk-cam-cams{padding:2px 6px}',
        '.twk-cam-live{font-size:8.5px;letter-spacing:.14em}',
        '.twk-cam-ad{font-size:8px;padding:3px 6px}',
        '.twk-cam-mute{width:34px;height:34px;top:42px;right:10px}',
        '.twk-cam-styled .twerkhub-hh-next{font-size:11px;padding:4px 10px}',
        '.twk-cam-styled .twerkhub-hh-cd-timer{font-size:12px}',
      '}',
    ].join('\n');
    document.head.appendChild(st);
  }

  function buildOverlay(){
    return [
      '<div class="twk-cam-hero-header">',
        '<span class="twk-cam-brand">',
          '<span class="twk-cam-online">ONLINE</span>',
          '<span class="twk-cam-cams">CAMS</span>',
        '</span>',
        '<span class="twk-cam-live">LIVE NOW</span>',
        '<span class="twk-cam-ad">AD</span>',
      '</div>',
      '<button type="button" class="twk-cam-mute" aria-label="Toggle sound">',
        '<svg class="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>',
          '<line x1="23" y1="9" x2="17" y2="15"/>',
          '<line x1="17" y1="9" x2="23" y2="15"/>',
        '</svg>',
        '<svg class="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>',
          '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
          '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
        '</svg>',
      '</button>',
    ].join('');
  }

  function attach(){
    injectCSS();
    var hero = document.querySelector('.twerkhub-home-hero-media');
    if (!hero) return;
    if (hero.querySelector('.twk-cam-hero-header')) return; // already done

    hero.classList.add('twk-cam-styled');
    var inner = hero.querySelector('.twerkhub-hh-media-inner');
    if (inner){
      inner.insertAdjacentHTML('beforeend', buildOverlay());

      var muteBtn = inner.querySelector('.twk-cam-mute');
      if (muteBtn){
        muteBtn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          var iframe = inner.querySelector('iframe');
          if (!iframe || !iframe.contentWindow) return;
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
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach, { once:true });
  } else {
    attach();
  }
})();
