/* TWERKHUB · Cam-style overlay for the home HERO video rotator
 * v2 (2026-05-08) — APUNTA SOLO al .twerkhub-home-hero-media (el player
 * rotativo del top del home con el boton "Next" que cycla entre 4 YT IDs).
 * NO toca las 5 playlist cards (twerkhub-fp-card).
 *
 * Visual:
 *   - Border + glow naranja alrededor del player
 *   - Header overlay: ONLINE [CAMS] · LIVE NOW · AD
 *   - Round mute icon mid-right del video
 *   - El boton "Next" existente se mantiene (LJ-style, no lo toco)
 */
(function(){
  'use strict';
  if (window.__twkCamHeroV2Init) return;
  window.__twkCamHeroV2Init = true;

  function injectCSS(){
    if (document.getElementById('twk-cam-hero-v2-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-cam-hero-v2-css';
    st.textContent = [
      /* Border + glow naranja en el player rotativo del hero */
      '.twerkhub-home-hero-media.twk-cam-styled{',
        'border:2px solid #ff9000 !important;',
        'box-shadow:0 0 24px rgba(255,144,0,.32),0 0 60px rgba(255,144,0,.14) !important;',
        'border-radius:14px !important;overflow:hidden !important;',
      '}',
      /* Header overlay (ONLINE CAMS · LIVE NOW · AD) — top strip sobre el video */
      '.twk-cam-hero-header{',
        'position:absolute;top:0;left:0;right:0;z-index:13;',
        'display:flex;align-items:center;justify-content:flex-end;gap:10px;',
        'padding:10px 14px 18px;',
        'background:linear-gradient(180deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.55) 70%,rgba(0,0,0,0) 100%);',
        'pointer-events:none;',
        'font-family:"Inter",ui-sans-serif,system-ui,sans-serif;',
      '}',
      /* En desktop el "Next" button del hero ocupa el top-left, asi que
         posicionamos ONLINE CAMS desde la izquierda con padding-left para
         dejarle espacio al Next */
      '.twk-cam-hero-header .twk-cam-brand{margin-right:auto;padding-left:130px}',
      '@media(max-width:520px){.twk-cam-hero-header .twk-cam-brand{padding-left:90px}}',
      '.twk-cam-brand{',
        'display:inline-flex;align-items:center;gap:0;',
        'font-family:"Anton","Bebas Neue",sans-serif;',
        'font-size:14px;letter-spacing:.04em;line-height:1;text-transform:uppercase;',
      '}',
      '.twk-cam-online{color:#fff;padding-right:5px}',
      '.twk-cam-cams{background:#ff9000;color:#000;padding:3px 8px;border-radius:4px}',
      '.twk-cam-live{',
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
      '.twk-cam-ad{',
        'background:rgba(255,255,255,.16);color:#fff;',
        'font-family:"JetBrains Mono",monospace;',
        'font-size:9px;font-weight:800;letter-spacing:.2em;',
        'padding:4px 8px;border-radius:4px;',
      '}',

      /* Round mute icon (mid-right del video, debajo del header) */
      '.twk-cam-mute{',
        'position:absolute;top:60px;right:14px;z-index:14;',
        'width:40px;height:40px;border-radius:50%;',
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
        '.twk-cam-hero-header{padding:8px 10px 14px;gap:6px}',
        '.twk-cam-brand{font-size:12px}',
        '.twk-cam-cams{padding:2px 6px}',
        '.twk-cam-live{font-size:8.5px;letter-spacing:.14em}',
        '.twk-cam-ad{font-size:8px;padding:3px 6px}',
        '.twk-cam-mute{width:36px;height:36px;top:54px;right:10px}',
        '.twk-cam-mute svg{width:16px;height:16px}',
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
      // Inject AFTER the existing iframe + Next button (no los pisamos)
      inner.insertAdjacentHTML('beforeend', buildOverlay());

      // Mute click handler — toggle visual state. El iframe es YouTube
      // cross-origin asi que el audio real lo controla YT (autoplay=mute=1
      // por default). El click es VISUAL feedback + user gesture.
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
