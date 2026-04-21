/*!
 * ALEXIA TWERK — Enter Now Widget
 * Floating premium CTA that appears on video/playlist pages.
 * - Muted MP4 loops always (autoplay allowed silently by all browsers)
 * - MP3 plays in sync and restarts on each hover (user gesture = unlock audio)
 * - Click navigates to /alexia-video-packs.html
 * - Dismissible: remembers dismissal for 24h via localStorage
 * - Respects existing layout (position:fixed, no DOM injection in main content)
 * - Mobile-optimized: bottom bar on small screens, side card on desktop
 *
 * Version: 2026-04-17-01
 */
(function(){
  'use strict';

  // Singleton guard — prevent double injection if script loads twice
  if (window.__alexiaEnterNowMounted) return;
  window.__alexiaEnterNowMounted = true;

  // Dismissal persistence (version-bumped to reset any stale dismissals)
  var LS_KEY = 'alexia_enter_now_dismissed_until_v2';
  var DISMISS_HOURS = 24;
  try {
    var dismissedUntil = Number(localStorage.getItem(LS_KEY) || 0);
    if (dismissedUntil && Date.now() < dismissedUntil) return;
  } catch(e){}

  // Skip only the destination page itself (avoid CTA-to-self). Show everywhere else — home included.
  if (/\/alexia-video-packs(\.html)?/.test(location.pathname)) return;

  // Mobile detection for serving the lighter file
  var isMobile = matchMedia('(max-width: 768px)').matches;
  var videoSrc = isMobile ? '/enter-now-mobile.mp4' : '/enter-now.mp4';
  var audioSrc = '/enter-now.mp3';
  var targetUrl = '/alexia-video-packs.html';

  // Build DOM
  function mount(){
    var root = document.createElement('div');
    root.id = 'alexia-enter-now';
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-label', 'Premium video packs call to action');
    root.innerHTML = [
      '<a class="aen-card" href="', targetUrl, '" aria-label="Enter the premium video packs">',
        '<span class="aen-glow" aria-hidden="true"></span>',
        '<video class="aen-video" playsinline muted loop preload="metadata" poster="/hero_alexia.jpg">',
          '<source src="', videoSrc, '" type="video/mp4">',
        '</video>',
        '<audio class="aen-audio" preload="auto" loop>',
          '<source src="', audioSrc, '" type="audio/mpeg">',
        '</audio>',
        '<div class="aen-badge" aria-hidden="true">PREMIUM</div>',
        '<div class="aen-body">',
          '<div class="aen-label">🔥 Exclusive Access</div>',
          '<div class="aen-title">Enter Now</div>',
          '<div class="aen-cta">Video Packs <span class="aen-arrow">→</span></div>',
        '</div>',
        '<span class="aen-pulse" aria-hidden="true"></span>',
      '</a>',
      '<button class="aen-close" aria-label="Dismiss for 24 hours" type="button">×</button>'
    ].join('');

    // Styles (isolated via IDs + prefixed classes)
    var css = document.createElement('style');
    css.id = 'alexia-enter-now-style';
    css.textContent = [
      '#alexia-enter-now{position:fixed;z-index:2147483640;bottom:28px;right:28px;width:340px;pointer-events:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;animation:aenSlideIn .6s cubic-bezier(.2,.8,.2,1) both .5s;}',
      '@keyframes aenSlideIn{from{opacity:0;transform:translateY(24px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#alexia-enter-now .aen-card{display:block;position:relative;text-decoration:none;color:#fff;background:linear-gradient(145deg,#1a0b24 0%,#0a0a0f 100%);border-radius:14px;overflow:hidden;aspect-ratio:9/16;box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 0 1px rgba(255,45,135,.25),0 0 40px rgba(255,45,135,.12);transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s;will-change:transform}',
      '#alexia-enter-now .aen-card:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 16px 45px rgba(0,0,0,.65),0 0 0 1px rgba(255,45,135,.55),0 0 60px rgba(255,45,135,.3)}',
      '#alexia-enter-now .aen-glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(255,45,135,.35),transparent 55%);opacity:.7;mix-blend-mode:screen;pointer-events:none;z-index:1;transition:opacity .35s}',
      '#alexia-enter-now .aen-card:hover .aen-glow{opacity:1}',
      '#alexia-enter-now .aen-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;filter:brightness(.78) contrast(1.08) saturate(1.1)}',
      '#alexia-enter-now .aen-card:hover .aen-video{filter:brightness(.88) contrast(1.15) saturate(1.2)}',
      '#alexia-enter-now .aen-audio{display:none}',
      '#alexia-enter-now .aen-badge{position:absolute;top:10px;left:10px;z-index:3;background:linear-gradient(90deg,#ff2d87,#9d4edd);color:#fff;font-size:8px;font-weight:900;letter-spacing:.22em;padding:4px 9px;border-radius:4px;text-transform:uppercase;box-shadow:0 2px 8px rgba(255,45,135,.45)}',
      '#alexia-enter-now .aen-body{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:14px 14px 16px;background:linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.7) 50%,transparent 100%)}',
      '#alexia-enter-now .aen-label{font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ff6fa8;margin-bottom:5px;text-shadow:0 0 10px rgba(255,45,135,.5)}',
      '#alexia-enter-now .aen-title{font-size:20px;font-weight:900;letter-spacing:-.015em;line-height:1;margin-bottom:8px;background:linear-gradient(90deg,#fff,#ffb3d1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '#alexia-enter-now .aen-cta{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.05em;color:#fff;background:rgba(255,45,135,.2);border:1px solid rgba(255,45,135,.5);padding:6px 10px;border-radius:20px;transition:all .3s}',
      '#alexia-enter-now .aen-card:hover .aen-cta{background:linear-gradient(90deg,#ff2d87,#9d4edd);border-color:transparent;box-shadow:0 6px 18px rgba(255,45,135,.45)}',
      '#alexia-enter-now .aen-arrow{transition:transform .3s;display:inline-block}',
      '#alexia-enter-now .aen-card:hover .aen-arrow{transform:translateX(4px)}',
      '#alexia-enter-now .aen-pulse{position:absolute;inset:-2px;border-radius:16px;pointer-events:none;z-index:-1;background:linear-gradient(135deg,rgba(255,45,135,.3),rgba(157,78,221,.3));filter:blur(14px);opacity:.6;animation:aenPulse 2.8s ease-in-out infinite}',
      '@keyframes aenPulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.7;transform:scale(1.04)}}',
      '#alexia-enter-now .aen-close{position:absolute;top:-10px;right:-10px;z-index:4;width:26px;height:26px;border:none;border-radius:50%;background:#0a0a0f;color:#fff;font-size:16px;font-weight:700;line-height:1;cursor:pointer;opacity:0;transform:scale(.7);transition:all .25s;box-shadow:0 0 0 1px rgba(255,255,255,.15),0 4px 12px rgba(0,0,0,.5)}',
      '#alexia-enter-now:hover .aen-close{opacity:1;transform:scale(1)}',
      '#alexia-enter-now .aen-close:hover{background:#ef4444}',
      '@media (max-width: 600px){',
        '#alexia-enter-now{bottom:12px;right:12px;left:12px;width:auto;max-width:none}',
        '#alexia-enter-now .aen-card{aspect-ratio:auto;display:grid;grid-template-columns:88px 1fr;height:90px}',
        '#alexia-enter-now .aen-video{position:relative;width:88px;height:90px}',
        '#alexia-enter-now .aen-glow{display:none}',
        '#alexia-enter-now .aen-body{position:relative;background:transparent;padding:10px 12px;align-self:center}',
        '#alexia-enter-now .aen-title{font-size:17px;margin-bottom:4px}',
        '#alexia-enter-now .aen-label{font-size:8.5px;margin-bottom:3px}',
        '#alexia-enter-now .aen-cta{font-size:10px;padding:4px 8px}',
        '#alexia-enter-now .aen-badge{top:6px;left:6px;font-size:7px;padding:3px 6px}',
      '}',
      '@media (prefers-reduced-motion: reduce){',
        '#alexia-enter-now{animation:none}',
        '#alexia-enter-now .aen-pulse{animation:none}',
        '#alexia-enter-now .aen-card{transition:none}',
      '}'
    ].join('');

    document.head.appendChild(css);
    document.body.appendChild(root);

    // Wire up interactions
    var card = root.querySelector('.aen-card');
    var video = root.querySelector('.aen-video');
    var audio = root.querySelector('.aen-audio');
    var closeBtn = root.querySelector('.aen-close');

    // ── DORMANT MODE: 3s delay before video+audio wake up ──
    // The widget enters the DOM visibly but video starts paused, audio stays silent.
    // After 3s: video starts (muted, always allowed by browsers) + attempt to play audio.
    // If autoplay policy blocks audio, we listen for the first user gesture anywhere on the page
    // and start audio then. On hover: audio rewinds to 0 and plays.

    var audioUnlocked = false;

    function tryStartAudio(){
      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.then) {
          p.then(function(){ audioUnlocked = true; })
           .catch(function(){
             // Autoplay policy blocked it. Wait for any user gesture to unlock.
             waitForUserGesture();
           });
        }
      } catch(e){
        waitForUserGesture();
      }
    }

    function waitForUserGesture(){
      var events = ['click','touchstart','keydown','pointerdown','scroll'];
      function unlock(){
        if (audioUnlocked) return;
        audioUnlocked = true;
        events.forEach(function(ev){ document.removeEventListener(ev, unlock, true); });
        try {
          audio.currentTime = 0;
          var p = audio.play();
          if (p && p.catch) p.catch(function(){});
        } catch(e){}
      }
      events.forEach(function(ev){ document.addEventListener(ev, unlock, true); });
    }

    // Wake up after 3s (dormant mode)
    setTimeout(function(){
      if (video) {
        try {
          var vp = video.play();
          if (vp && vp.catch) vp.catch(function(){});
        } catch(e){}
      }
      tryStartAudio();
      // Add subtle wake-up visual cue
      root.classList.add('aen-awake');
    }, 3000);

    // Hover: rewind audio to start + play (works even if not previously unlocked — hover IS a gesture)
    card.addEventListener('mouseenter', function(){
      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.catch) p.catch(function(){});
        audioUnlocked = true;
      } catch(e){}
    });

    // Leave: pause audio (video keeps looping silently once awakened)
    card.addEventListener('mouseleave', function(){
      try { audio.pause(); } catch(e){}
    });

    // Click: stop audio cleanly before navigation
    card.addEventListener('click', function(){
      try { audio.pause(); } catch(e){}
    });

    // Touch (mobile): single tap starts audio briefly, navigation follows on the same gesture
    card.addEventListener('touchstart', function(){
      try {
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.catch) p.catch(function(){});
        audioUnlocked = true;
      } catch(e){}
    }, {passive:true});

    // Dismiss
    closeBtn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      try { localStorage.setItem(LS_KEY, String(Date.now() + DISMISS_HOURS * 3600 * 1000)); } catch(err){}
      root.style.transition = 'opacity .3s, transform .3s';
      root.style.opacity = '0';
      root.style.transform = 'translateY(16px) scale(.9)';
      setTimeout(function(){ root.remove(); }, 320);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
   