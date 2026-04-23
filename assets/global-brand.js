/*!
 * ALEXIA TWERK · Twerkhub brand injector
 * Inserts the Twerkhub logo + "By Alexia Twerk · Est. 2018" subtitle
 * into the site-nav-final bar on every page that has it.
 *
 * Also injects the Media Exclusivity Engine (silence-default) and its
 * baseline stylesheet on every page that loads this file — that way we
 * don't have to touch each HTML individually when a page is out of sync.
 *
 * Version: 2026-04-20-a
 */
(function(){
  'use strict';

  // ── Media exclusivity engine + base styles (idempotent) ──
  // This runs BEFORE the brand mount so the engine is ready by the time
  // any card/hero JS tries to fire. Both <script> and <style> check for
  // pre-existing ids so reloading this file is safe.
  if (!document.getElementById('twerkhub-media-engine-script')){
    var s = document.createElement('script');
    s.id = 'twerkhub-media-engine-script';
    s.defer = true;
    // Clean-slate engine · zero heritage · 2026-04-20
    s.src = '/assets/twerkhub-media.js?v=20260420-01';
    (document.head || document.documentElement).appendChild(s);
  }
  // ── Paywall + auth gate (self-installing on playlist-like pages) ──
  if (!document.getElementById('twerkhub-paywall-script')){
    var sp = document.createElement('script');
    sp.id = 'twerkhub-paywall-script';
    sp.defer = true;
    sp.src = '/assets/twerkhub-paywall.js?v=20260420a';
    (document.head || document.documentElement).appendChild(sp);
  }
  // ── Suggestive titles (deterministic by video id) ──
  if (!document.getElementById('twerkhub-titles-script')){
    var stt = document.createElement('script');
    stt.id = 'twerkhub-titles-script';
    stt.defer = true;
    stt.src = '/assets/twerkhub-titles.js?v=20260420';
    (document.head || document.documentElement).appendChild(stt);
  }
  // ── Universal playlist renderer (anonymised numbering + taglines) ──
  if (!document.getElementById('twerkhub-playlist-renderer-script')){
    var sr = document.createElement('script');
    sr.id = 'twerkhub-playlist-renderer-script';
    sr.defer = true;
    sr.src = '/assets/twerkhub-playlist-renderer.js?v=20260420b';
    (document.head || document.documentElement).appendChild(sr);
  }
  if (!document.getElementById('twerkhub-media-engine-style')){
    var st = document.createElement('style');
    st.id = 'twerkhub-media-engine-style';
    st.textContent = [
      // Mute pill overlaid on any .model-card — minimal, glass, gold border.
      '.model-card{position:relative}',
      '.mc-mute-pill{position:absolute;top:14px;right:14px;z-index:6;width:32px;height:32px;border:0;padding:0;border-radius:50%;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,180,84,.5);color:#fff;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .25s cubic-bezier(.2,1.2,.3,1),box-shadow .25s,background .25s;-webkit-appearance:none;appearance:none}',
      '.mc-mute-pill:hover{transform:scale(1.12);box-shadow:0 6px 22px rgba(255,180,84,.35),inset 0 0 0 1px rgba(255,180,84,.9);background:rgba(0,0,0,.78)}',
      '.mc-mute-pill.is-off{box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.22);opacity:.82}',
      '.mc-mute-pill.is-off:hover{opacity:1;box-shadow:0 6px 22px rgba(255,45,135,.3),inset 0 0 0 1px rgba(255,45,135,.6)}',
      '.mc-mute-ico{display:block;pointer-events:none;line-height:1}',
      // Bio / founder section — video height capped at 520px + aspect preserved.
      // NOTE: removed `section[class*="bio" i]` attribute selector — it was
      // matching .twerkhub-bio-home on /index.html and forcing max-height:520px
      // on the whole section, clipping its height and making timeline + ctas
      // overlap the next section. Legacy pages with .bio-section / .founder-*
      // classes still get the treatment via explicit class selectors.
      '.bio-section,.founder-grid,.founder-hero,.founder,[data-founder-grid]{display:grid!important;grid-template-columns:auto 1fr!important;align-items:stretch!important;gap:clamp(22px,3vw,44px)!important;max-height:520px!important}',
      '@media(max-width:780px){.bio-section,.founder-grid,.founder-hero,.founder,[data-founder-grid]{grid-template-columns:1fr!important;max-height:none!important;align-items:start!important}}',
      '.bio-section .founder-video,.bio-section video,.bio-section .video-col video,.founder-grid .founder-video,.founder-grid video,.founder-hero video,.founder video{height:100%!important;max-height:100%!important;max-width:40%!important;width:auto!important;object-fit:contain!important;aspect-ratio:auto!important;display:block!important}',
      '@media(max-width:780px){.bio-section video,.founder-grid video,.founder-hero video,.founder video{max-width:100%!important;width:100%!important;max-height:60vh!important}}',
      '.bio-section > .bio-text,.bio-section > .text-col,.bio-section .copy,.founder-grid > .bio-text,.founder-grid .copy,.founder-hero .copy,.founder .copy{align-self:stretch!important;display:flex!important;flex-direction:column!important;justify-content:center!important;min-width:0}',
      '.bio-section .video-col,.founder-grid .video-col,[data-founder-grid] .video-col{display:flex!important;align-items:stretch!important;justify-content:center!important;height:100%!important;max-height:100%!important}',
      // ═══ Playlist renderer primitives ═══
      '.fomo-pill{position:absolute;top:12px;left:12px;z-index:5;padding:5px 10px;border-radius:999px;background:rgba(255,45,135,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,45,135,.45);color:#ffd8ea;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;box-shadow:0 4px 14px rgba(255,45,135,.25);white-space:nowrap}',
      '.rank-badge{position:absolute;top:12px;right:12px;z-index:5;padding:6px 12px;border-radius:999px;font-family:"Playfair Display",Georgia,serif;font-size:14px;font-weight:900;letter-spacing:-.01em;line-height:1;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.4)}',
      '.rank-badge.gold{background:linear-gradient(135deg,#ffd98c,#ff9a3d);color:#2a1500}',
      '.rank-badge.purple{background:linear-gradient(135deg,#c18bff,#7c3ae4);color:#fff}',
      '.rank-badge.pink{background:linear-gradient(135deg,#ff9ec4,#ff2d87);color:#fff}',
      '.rank-badge.monochrome{background:linear-gradient(135deg,#e3e3ec,#9b9bab);color:#0e0e18}',
      '.rank-badge.unlocked{background:linear-gradient(135deg,#1ee08f,#16a36a);color:#042d1d}',
      '.lock-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:4;padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,180,84,.55);color:#fff;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;box-shadow:0 10px 28px rgba(0,0,0,.55);pointer-events:none}',
      '.vcard:hover .lock-overlay{border-color:rgba(255,180,84,.95);transform:translate(-50%,-50%) scale(1.05);transition:transform .35s cubic-bezier(.2,1.2,.3,1),border-color .25s}',
      '.card-meta{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;gap:10px;position:relative;z-index:2}',
      '.video-number{font-family:"Playfair Display",Georgia,serif;font-size:15px;font-weight:800;letter-spacing:-.01em;color:#fff}',
      '.video-tagline{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ffb454;margin-left:6px}',
      '.video-duration{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#c7c7d3;background:rgba(0,0,0,.5);padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.1)}',
      '.twk-playlist-fomo{margin:24px auto 14px;padding:14px 18px;border-radius:16px;background:linear-gradient(90deg,rgba(255,45,135,.1),rgba(157,78,221,.1),rgba(255,180,84,.08));border:1px solid rgba(255,45,135,.22);color:#ffd8ea;text-align:center;box-shadow:inset 0 0 30px rgba(255,45,135,.05)}',
      '.twk-fomo-line{font-family:"Playfair Display",Georgia,serif;font-size:clamp(17px,2vw,22px);font-weight:800;line-height:1.2;color:#fff;margin-bottom:4px}',
      '.twk-fomo-sub{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#e7c8d8}',
      '.twk-fomo-sub strong{color:#ffb454;font-weight:900}',
      '.rk-num.gold{background:linear-gradient(135deg,#ffd98c,#ff9a3d);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.rk-num.purple{background:linear-gradient(135deg,#c18bff,#7c3ae4);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.rk-num.pink{background:linear-gradient(135deg,#ff9ec4,#ff2d87);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.rk-num.monochrome{background:linear-gradient(135deg,#e3e3ec,#9b9bab);-webkit-background-clip:text;background-clip:text;color:transparent}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  if (window.__twerkBrandInjected) return;
  window.__twerkBrandInjected = true;

  function mount(){
    var host = document.querySelector('.site-nav-final__inner');
    if (!host) return;

    // Don't double-inject
    if (host.querySelector('.snf-brand')) return;

    var brand = document.createElement('a');
    brand.className = 'snf-brand';
    brand.href = '/';
    brand.setAttribute('aria-label', 'Twerkhub · By Alexia Twerk · Est. 2018');
    brand.innerHTML = [
      '<img src="/logo-twerkhub.png" alt="Twerkhub">',
      '<span class="snf-brand-sub">By Alexia Twerk <span class="snf-brand-dot">·</span> Est. 2018</span>'
    ].join('');

    host.insertBefore(brand, host.firstChild);

    // Inject scoped styles (idempotent via ID check)
    if (document.getElementById('snf-brand-style')) return;
    var css = document.createElement('style');
    css.id = 'snf-brand-style';
    css.textContent = [
      // Centered column, bigger logo, airy spacing between logo and subtitle
      '.snf-brand{display:inline-flex;flex-direction:column;align-items:center;gap:7px;margin-right:22px;text-decoration:none;position:relative;transition:transform .4s cubic-bezier(.2,1.2,.3,1), filter .4s}',
      '.snf-brand img{height:44px;width:auto;display:block;filter:drop-shadow(0 3px 10px rgba(255,45,135,.28));transition:transform .45s cubic-bezier(.2,1.2,.3,1), filter .4s;transform-origin:center center}',
      '.snf-brand:hover img{transform:scale(2);filter:drop-shadow(0 8px 24px rgba(255,45,135,.55))}', // 100% zoom on hover
      '.snf-brand-sub{font-size:8.5px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:rgba(255,111,168,.82);line-height:1;white-space:nowrap;text-align:center;transition:color .3s, letter-spacing .3s, opacity .3s}',
      '.snf-brand-sub .snf-brand-dot{display:inline-block;margin:0 6px;color:rgba(255,180,84,.85);font-weight:900}',
      '.snf-brand:hover .snf-brand-sub{color:rgba(255,111,168,1);letter-spacing:.3em;opacity:.7}',
      '.snf-brand:hover .snf-brand-sub .snf-brand-dot{color:rgba(255,180,84,1)}',
      // Glow accent underline
      '.snf-brand::after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:-8px;width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,45,135,.6),transparent);transition:width .35s}',
      '.snf-brand:hover::after{width:80%}',
      '@media (max-width:820px){.snf-brand{margin-right:14px;gap:5px}.snf-brand img{height:36px}.snf-brand-sub{font-size:7.5px;letter-spacing:.22em}.snf-brand:hover img{transform:scale(1.7)}}',
      '@media (max-width:540px){.snf-brand img{height:30px}.snf-brand-sub{font-size:7px;letter-spacing:.18em}.snf-brand:hover img{transform:scale(1.5)}}'
    ].join('');
    document.head.appendChild(css);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
