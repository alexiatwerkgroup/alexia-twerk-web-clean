/* â•â•â• TWERKHUB Â· Playlist theater (large centered window, never fullscreen) â•â•â•
 * v20260426-p8
 *
 * 2026-04-26 fix p8 â€” SAGRADA RULE #9: Top-5 hot ranking videos are
 * IMMUNE to the +18 paywall, no matter what YouTube returns. Heartbeat,
 * MutationObserver, postMessage onError, and onLoad short-circuit all
 * check `TwkAgeGate.isProtected(vid)` and bail out before paywalling.
 *
 * Also p8 â€” fixed the "blink-to-black" bug verified live in Chrome MCP:
 * heartbeat fired showInlinePaywall, which set player.src='about:blank'.
 * The blank load triggered onLoad, which couldn't extract a vid from
 * the blank URL â†’ fell into the `else` branch â†’ called hideInlinePaywall,
 * REMOVING the overlay we'd just placed. Now onLoad bails immediately
 * when src is empty or about:blank, leaving the paywall intact.
 *
 * 2026-04-26 fix p7 â€” themed-playlist black-screen really fixed this time:
 *   1. MutationObserver on #twerkhub-pl-player.src â€” fires SYNCHRONOUSLY when
 *      the page's inline swap() sets player.src, so we can short-circuit
 *      KNOWN-blocked videos before YouTube even loads. Previously we only
 *      reacted on iframe `load`, by which time YouTube may have already
 *      painted its "video unavailable" black screen behind our overlay.
 *   2. The 2-second heartbeat now ALSO hides the iframe (display:none) when
 *      it shows the paywall, and uses z-index:99 (was 50) so YouTube's
 *      black-screen error UI cannot bleed through.
 *   3. Heartbeat extended to 2.5s so YouTube has a fair shot to start
 *      buffering on slow connections before we declare it blocked.
 *
 * 2026-04-26 fix p5: paywall flashed for ~0.5s then went black. Cause was
 * 2026-04-26 fix p4: BLACK SCREEN FIX. YouTube doesn't always fire onError
 * 101/150 for age-restricted videos â€” sometimes the iframe just sits black
 * forever with no error event. Added a 2-second playback heartbeat: after
 * onReady, if the player never enters PLAYING (1) or BUFFERING (3) within
 * 2s, assume the video is blocked â†’ show the Discord+Telegram paywall and
 * mark the video as blocked for future short-circuit.
 *
 * 2026-04-26 fix p5: paywall flashed for ~0.5s then went black. Cause was
 * `show()` replacing innerHTML BEFORE `ytPlayer.destroy()` ran, so the YT
 * API's destroy logic touched the now-detached iframe and the paywall got
 * clipped/replaced briefly. Reordered both paths (heartbeat + onError) to
 * destroy the player FIRST while iframe is still in DOM, THEN inject the
 * paywall HTML. Pairs with age-gate p6 which fixes CSS aspect-ratio collapse.
 *
 * Same heartbeat added to the inline player path (subscribeInlineToEvents).
 *
 * 2026-04-26 fix p1: rolled back the inline-player YT.Player wrap because
 * `new YT.Player(existingIframe)` was REMOVING the iframe from the DOM,
 * which broke /playlist/ swap() (it does getElementById and finds nothing).
 *
 * 2026-04-26 fix p2: replaced the wrap with a PASSIVE postMessage listener
 * on the window that captures YouTube's onError 101/150 events without
 * touching the iframe. After each iframe load we send the YT IFrame API
 * "listening" + addEventListener('onError') commands so YT pushes events
 * to us. When 101 or 150 arrives â†’ show Discord paywall + memoize blocked.
 *
 * For themed playlist pages (/try-on-hot-leaks/, /ttl-latin-models/,
 * /hottest-cosplay-fancam/, /korean-girls-kpop-twerk/) that DON'T have an
 * inline #twerkhub-pl-player iframe â€” opens videos in a LARGE CENTERED
 * window (90vw / 82vh), never fullscreen, never tiny popup.
 *
 * For /playlist/index.html â€” SKIPS its own click handler entirely, because
 * that page has its own inline iframe + swap() function that uses the
 * existing main player area.
 *
 * Side effects:
 *  - Marks video as viewed in localStorage (cross-session memory)
 *  - Adds a COMPACT green pill ("âœ“ VIEWED") absolutely positioned over the
 *    top-left of each clicked card. Real DOM <span>, not pseudo, so it
 *    survives any parent CSS conflicts.
 *  - Grants +15 tokens via AlexiaTokens.watchClip() per unique view
 *  - Uses YouTube IFrame API for reliable unMute + setVolume(100)
 */
(function(){
  'use strict';
  if (window.__twkPlTheaterInit) return;
  window.__twkPlTheaterInit = true;

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var modal, frameContainer, ytPlayer, ytApiPromise = null;
  // If the page has its own inline player (#twerkhub-pl-player), we don't
  // want to take over click handling â€” that page handles it.
  var INLINE_PLAYER_PRESENT = false;

  // â”€â”€ YouTube IFrame API loader (single-shot) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function loadYTApi(){
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise(function(resolve){
      if (window.YT && window.YT.Player) return resolve(window.YT);
      var existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
      var prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        if (typeof prevCb === 'function') { try { prevCb(); } catch(_){} }
        resolve(window.YT);
      };
      if (!existing) {
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        document.head.appendChild(s);
      }
    });
    return ytApiPromise;
  }

  // â”€â”€ Inject ALL theater CSS at script load (NOT inside ensureModal â€” that
  // only runs when the modal opens, but we need badge styles immediately on
  // page load for the viewed marker to render correctly).
  function injectStyle(){
    if (document.getElementById('twk-pl-theater-style')) return;
    var st = document.createElement('style');
    st.id = 'twk-pl-theater-style';
    st.textContent = [
      /* Modal: large centered window, never fullscreen */
      '#twk-pl-theater{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(6px)}',
      '#twk-pl-theater.is-open{display:flex}',
      '#twk-pl-theater .twk-pl-theater-box{position:relative;width:min(90vw,1400px);max-height:82vh;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.7)}',
      '@media(max-aspect-ratio:16/9){#twk-pl-theater .twk-pl-theater-box{width:90vw;height:auto}}',
      '#twk-pl-theater .twk-pl-theater-frame-host{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000}',
      '#twk-pl-theater .twk-pl-theater-frame-host iframe{width:100%;height:100%;border:0;background:#000}',
      '#twk-pl-theater-close{position:absolute;top:12px;right:12px;z-index:5;width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.7);color:#fff;font-size:24px;cursor:pointer;line-height:1;transition:background .2s}',
      '#twk-pl-theater-close:hover{background:#ff2d87}',
      /* Viewed badge: COMPACT green pill, absolutely positioned over card top-left.
         !important on position rules so flex/grid parents can\'t push it to a new row. */
      '.twk-viewed-badge{position:absolute!important;top:6px!important;left:6px!important;right:auto!important;bottom:auto!important;background:linear-gradient(145deg,#3ddca0,#28a877)!important;color:#06140e!important;font:800 9px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto!important;letter-spacing:.16em!important;padding:4px 8px!important;border-radius:5px!important;z-index:9!important;pointer-events:none;text-transform:uppercase!important;box-shadow:0 2px 6px rgba(0,0,0,.45)!important;white-space:nowrap!important;display:inline-block!important;line-height:1!important;width:auto!important;height:auto!important;margin:0!important;border:0!important}',
      '.twk-viewed-badge::before{content:"\\2713 ";font-weight:900}',
      /* Force parent positioning so the absolute badge anchors correctly */
      '.vcard.twk-viewed,.rk-item.twk-viewed{position:relative!important}',
      /* Subtle dimming of viewed content (the part the user said works fine â€” keeping intact) */
      '.vcard.twk-viewed .vthumb img,.rk-item.twk-viewed .rk-thumb img,.rk-item.twk-viewed img{opacity:.55!important;filter:grayscale(.45)!important;transition:opacity .25s,filter .25s}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // â”€â”€ Modal scaffold (large centered window, NEVER fullscreen) â”€â”€â”€â”€
  function ensureModal(){
    if (modal) return;
    injectStyle();

    modal = document.createElement('div');
    modal.id = 'twk-pl-theater';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = [
      '<div class="twk-pl-theater-box">',
      '  <button id="twk-pl-theater-close" type="button" aria-label="Close">Ã—</button>',
      '  <div class="twk-pl-theater-frame-host" id="twk-pl-theater-frame-host"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    frameContainer = modal.querySelector('#twk-pl-theater-frame-host');
    modal.querySelector('#twk-pl-theater-close').addEventListener('click', close);
    modal.addEventListener('click', function(ev){ if (ev.target === modal) close(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  function open(vid){
    if (!vid) return;
    ensureModal();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // SAGRADA #9 â€” top-5 hot ranking videos never get the paywall
    var modalIsProt = window.TwkAgeGate && window.TwkAgeGate.isProtected && window.TwkAgeGate.isProtected(vid);
    // â”€â”€ +18 short-circuit: if this video already errored 101/150 in the past,
    // show the paywall directly without trying to load the iframe again. â”€â”€
    if (!modalIsProt && window.TwkAgeGate && window.TwkAgeGate.isBlocked(vid)) {
      window.TwkAgeGate.show(frameContainer, vid);
      return;
    }

    frameContainer.innerHTML = '<div id="twk-pl-theater-target"></div>';
    markViewed(vid);
    grantViewToken();

    loadYTApi().then(function(YT){
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch(_){}
      }
      // â”€â”€ Black-screen heartbeat: if the player never enters PLAYING/BUFFERING
      // within 2 seconds after onReady, assume +18 silent block â†’ show paywall.
      var playbackStarted = false;
      var blockHeartbeat  = null;
      function killHeartbeat(){ if (blockHeartbeat) { clearTimeout(blockHeartbeat); blockHeartbeat = null; } }
      function triggerSilentBlock(){
        if (playbackStarted) return;
        if (modalIsProt) return; // SAGRADA #9 â€” top-5 never paywalled
        try {
          // Destroy player FIRST while iframe is still in DOM, THEN inject
          // paywall â€” otherwise YT.destroy() touches the detached iframe and
          // briefly repaints over our paywall (the ~0.5s flash bug).
          stopTimeTracker();
          if (ytPlayer && typeof ytPlayer.destroy === 'function') {
            try { ytPlayer.destroy(); } catch(_){}
            ytPlayer = null;
          }
          if (window.TwkAgeGate) {
            window.TwkAgeGate.show(frameContainer, vid);
          }
        } catch(_){}
      }
      ytPlayer = new YT.Player('twk-pl-theater-target', {
        videoId: vid,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1,
          enablejsapi: 1, origin: window.location.origin
        },
        events: {
          onReady: function(ev){
            try { ev.target.unMute(); ev.target.setVolume(100); ev.target.playVideo(); } catch(_){}
            var attempts = 0;
            var iv = setInterval(function(){
              attempts++;
              try { ev.target.unMute(); ev.target.setVolume(100); } catch(_){}
              if (attempts >= 6) clearInterval(iv);
            }, 500);
            // Start the 6s silent-block heartbeat
            killHeartbeat();
            blockHeartbeat = setTimeout(triggerSilentBlock, 2000);
            // Hook heatmap: track watched buckets while this video plays
            try {
              if (window.TwkHeatmap) {
                window.TwkHeatmap.attach(vid, frameContainer, function(){ return ytPlayer; });
              }
            } catch(_){}
          },
          onStateChange: function(ev){
            // -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
            if (ev.data === 1 || ev.data === 3) {
              // Real playback or buffering started â†’ cancel silent-block timer
              playbackStarted = true;
              killHeartbeat();
            }
            if (ev.data === 1 || ev.data === 5) {
              try { ev.target.unMute(); ev.target.setVolume(100); } catch(_){}
              startTimeTracker();
            } else {
              stopTimeTracker();
            }
          },
          onError: function(ev){
            killHeartbeat();
            if (modalIsProt) return; // SAGRADA #9 â€” top-5 never paywalled
            // 101/150 = embed disabled / age-restricted â†’ swap to paywall.
            // Destroy player FIRST so YT.destroy() doesn't repaint over the
            // paywall HTML (this caused the ~0.5s flash bug pre-p5).
            try {
              var code = ev && ev.data;
              if (code !== 101 && code !== 150) return;
              stopTimeTracker();
              if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                try { ytPlayer.destroy(); } catch(_){}
                ytPlayer = null;
              }
              if (window.TwkAgeGate) {
                window.TwkAgeGate.show(frameContainer, vid);
              }
            } catch(_){}
          }
        }
      });
    });
  }

  function close(){
    stopTimeTracker();
    try { if (window.TwkHeatmap) window.TwkHeatmap.flush(); } catch(_){}
    if (!modal) return;
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
      try { ytPlayer.destroy(); } catch(_){}
      ytPlayer = null;
    }
    if (frameContainer) frameContainer.innerHTML = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // â”€â”€ Viewed memory + decoration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var KEY = 'twk_viewed_videos';
  var TIME_KEY = 'twk_watch_seconds_total';

  function getViewed(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch(_){ return {}; }
  }
  function setViewed(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(_){} }

  // â”€â”€ Time tracker â€” adds elapsed seconds to localStorage every 5s while playing
  // and pushes a Supabase grant if the user is signed in. â”€â”€
  var trackerInterval = null;
  var trackerLastTick = 0;
  function startTimeTracker(){
    stopTimeTracker();
    trackerLastTick = Date.now();
    trackerInterval = setInterval(function(){
      var now = Date.now();
      var deltaSec = Math.round((now - trackerLastTick) / 1000);
      if (deltaSec > 0 && deltaSec < 60) { // sanity: don't add huge gaps if tab was sleeping
        try {
          var prev = parseInt(localStorage.getItem(TIME_KEY) || '0', 10) || 0;
          localStorage.setItem(TIME_KEY, String(prev + deltaSec));
        } catch(_){}
      }
      trackerLastTick = now;
    }, 5000);
  }
  function stopTimeTracker(){
    if (trackerInterval) { clearInterval(trackerInterval); trackerInterval = null; }
  }

  function markViewed(vid){
    if (!vid) return;
    var v = getViewed();
    var fresh = !v[vid];
    if (fresh) { v[vid] = Date.now(); setViewed(v); }
    decorateAllForVid(vid);
    return fresh;
  }
  function decorateAllForVid(vid){
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute('data-vid') === vid) addViewedDecoration(els[i]);
    }
  }
  function addViewedDecoration(el){
    if (!el || el.classList.contains('twk-viewed')) return;
    el.classList.add('twk-viewed');
    if (!el.querySelector(':scope > .twk-viewed-badge')) {
      var b = document.createElement('span');
      b.className = 'twk-viewed-badge';
      b.textContent = 'Viewed';
      el.appendChild(b);
    }
  }
  function applyViewedClasses(){
    var v = getViewed();
    var keys = Object.keys(v);
    if (!keys.length) return;
    var els = document.querySelectorAll('[data-vid]');
    for (var i = 0; i < els.length; i++) {
      var vid = els[i].getAttribute('data-vid');
      if (vid && v[vid]) addViewedDecoration(els[i]);
    }
  }

  // â”€â”€ Token grant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function grantViewToken(){
    try {
      if (window.AlexiaTokens && typeof window.AlexiaTokens.watchClip === 'function') {
        window.AlexiaTokens.watchClip();
      } else if (window.AlexiaTokens && typeof window.AlexiaTokens.grant === 'function') {
        window.AlexiaTokens.grant(15, 'watch_clip');
      }
    } catch(_){}
  }

  // â”€â”€ Click delegation (only when there's no inline player on the page) â”€â”€
  // 2026-04-26 fix: open ANY a[data-vid] click in the modal theater (not just
  // .rk-item / .vcard). This was blocking creator/dancer profile pages where
  // converted YouTube links are plain <a href="#" data-vid="..."> without
  // those marker classes, so they did nothing on click and looked broken.
  function onDocClick(ev){
    if (INLINE_PLAYER_PRESENT) return; // /playlist/ handles its own clicks
    var a = ev.target.closest && ev.target.closest('a[data-vid]');
    if (!a) return;
    var vid = a.getAttribute('data-vid');
    if (!vid) return;
    ev.preventDefault();
    ev.stopPropagation();
    open(vid);
  }

  // â”€â”€ Hook into /playlist/ inline player to mark viewed on swap + track time â”€â”€â”€
  // CRITICAL: do NOT wrap the existing iframe with `new YT.Player(player)`.
  // YouTube's IFrame API has a quirk where wrapping an already-loaded iframe
  // can REMOVE it from the DOM without inserting a replacement, which breaks
  // the playlist's swap() (it does `getElementById('twerkhub-pl-player')` and
  // finds nothing). Heatmap on inline therefore uses a passive heuristic:
  // assume the video is playing while the tab is visible, and bucket time
  // since iframe load, capped to 600s. Age-gate on inline only does the
  // pre-check (isBlocked) â€” onError detection requires YT.Player wrap, which
  // we deliberately avoid here. Blocked videos can still be detected through
  // the modal theater (where YT.Player is created from scratch â€” safe).
  // Helper â€” hide iframe + show overlay together (so YouTube's "unavailable"
  // black UI cannot bleed through behind a transparent gap).
  function showInlinePaywall(player, wrap, vid){
    try {
      player.style.visibility = 'hidden';
      player.style.opacity    = '0';
      player.style.pointerEvents = 'none';
      player.src = 'about:blank';
    } catch(_){}
    if (window.TwkAgeGate) window.TwkAgeGate.showOverlay(wrap, vid);
  }
  function hideInlinePaywall(player, wrap){
    try {
      player.style.visibility = '';
      player.style.opacity    = '';
      player.style.pointerEvents = '';
    } catch(_){}
    if (window.TwkAgeGate) window.TwkAgeGate.hideOverlay(wrap);
  }

  function patchInlinePlayer(){
    var player = document.getElementById('twerkhub-pl-player');
    if (!player) return false;
    INLINE_PLAYER_PRESENT = true;
    var wrap = player.closest('.twerkhub-pl-player-wrap') || player.parentNode;
    var inlineLoadStart = 0;
    var inlineLoadVid = null;

    // â”€â”€ MutationObserver: fires SYNCHRONOUSLY when the page's inline swap()
    // sets player.src=newUrl. Lets us short-circuit known-blocked vids BEFORE
    // YouTube even tries to load the iframe (avoids the black "video
    // unavailable" frame painting briefly behind our overlay).
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(){
        try {
          var src = player.src || '';
          if (!src || src === 'about:blank') return;
          var m = src.match(/embed\/([^?&\s]{6,})/);
          var vid = m && m[1];
          if (!vid || !window.TwkAgeGate) return;
          // SAGRADA #9 â€” top-5 ranking videos are immune to the paywall
          if (window.TwkAgeGate.isProtected && window.TwkAgeGate.isProtected(vid)) {
            hideInlinePaywall(player, wrap);
            return;
          }
          if (window.TwkAgeGate.isBlocked(vid)) {
            // Cancel pending heartbeat â€” we're going straight to paywall
            if (window.__twkInlineHeartbeat) {
              clearTimeout(window.__twkInlineHeartbeat);
              window.__twkInlineHeartbeat = null;
            }
            showInlinePaywall(player, wrap, vid);
            stopTimeTracker();
          } else {
            // Fresh src on a non-blocked vid â€” make sure iframe is visible again
            hideInlinePaywall(player, wrap);
          }
        } catch(_){}
      }).observe(player, { attributes: true, attributeFilter: ['src'] });
    }

    function onLoad(){
      var src = player.src || '';
      // CRITICAL: about:blank load fires when WE just set src=blank to show
      // the paywall. Don't run vid extraction or hideInlinePaywall on it â€”
      // doing so removes the overlay we just placed (the "blink to black" bug).
      if (!src || src === 'about:blank') return;

      var vid = null;
      try {
        var m = src.match(/embed\/([^?&\s]{6,})/);
        if (m && m[1]) { vid = m[1]; markViewed(vid); }
      } catch(_){}

      // SAGRADA #9 â€” top-5 ranking videos must always play, never paywall
      var isProt = vid && window.TwkAgeGate && window.TwkAgeGate.isProtected && window.TwkAgeGate.isProtected(vid);
      if (isProt) {
        hideInlinePaywall(player, wrap);
        // Skip heartbeat entirely for protected vids â€” they get to play freely
        if (window.__twkInlineHeartbeat) { clearTimeout(window.__twkInlineHeartbeat); window.__twkInlineHeartbeat = null; }
        return;
      }
      // â”€â”€ +18 short-circuit: if this vid is already known-blocked, hide
      // iframe + show the Discord/Telegram paywall as overlay.
      if (vid && window.TwkAgeGate && window.TwkAgeGate.isBlocked(vid)) {
        showInlinePaywall(player, wrap, vid);
        stopTimeTracker();
        return;
      } else {
        // Not blocked â†’ clear any leftover overlay from a previous video
        hideInlinePaywall(player, wrap);
      }

      startTimeTracker();
      inlineLoadStart = Date.now();
      inlineLoadVid   = vid;
      window.__twkInlinePlaybackStarted = false;

      // Subscribe to YT IFrame API events so onError 101/150 reaches us via
      // postMessage (no wrapper, no iframe destruction).
      setTimeout(subscribeInlineToEvents, 50);

      // â”€â”€ Black-screen heartbeat: 2.5s after load, if no PLAYING (1) or
      // BUFFERING (3) state has been reported, assume +18 silent block â†’
      // show paywall. 2.5s gives slow connections a fair shot at buffering.
      if (window.__twkInlineHeartbeat) clearTimeout(window.__twkInlineHeartbeat);
      window.__twkInlineHeartbeat = setTimeout(function(){
        if (window.__twkInlinePlaybackStarted) return;
        if (!vid || !window.TwkAgeGate) return;
        showInlinePaywall(player, wrap, vid);
        stopTimeTracker();
      }, 700);

      // Passive heatmap tracker: while the tab is visible, every 2s mark the
      // bucket corresponding to (elapsed seconds since load) under an assumed
      // duration of 60s. If the real video is shorter/longer, the heatmap is
      // approximate but still useful and SAFE â€” does not touch the iframe.
      if (vid && window.TwkHeatmap && window.TwkHeatmap.attach) {
        var fakePlayer = {
          getDuration: function(){ return 60; }, // approximation
          getCurrentTime: function(){ return inlineLoadVid === vid ? Math.min(60, (Date.now() - inlineLoadStart) / 1000) : 0; },
          getPlayerState: function(){ return document.hidden ? 2 : 1; } // 1=playing, 2=paused
        };
        try { window.TwkHeatmap.attach(vid, player, function(){ return fakePlayer; }); } catch(_){}
      }
    }
    player.addEventListener('load', onLoad);
    onLoad();
    // Pause tracker when tab is hidden, resume when visible
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stopTimeTracker();
      else if (player.src && player.src.indexOf('embed/') > -1) startTimeTracker();
    });
    return true;
  }

  // â”€â”€ Passive YT IFrame error listener for the inline player â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // YouTube embeds with enablejsapi=1 will postMessage onError 101/150 to the
  // parent window when the video can't be embedded (age-restricted, blocked).
  // We listen globally and resolve the offending iframe via ev.source.
  function installInlineErrorListener(){
    if (window.__twkInlineErrListener) return;
    window.__twkInlineErrListener = true;
    window.addEventListener('message', function(ev){
      if (ev.origin !== 'https://www.youtube.com' && ev.origin !== 'https://www.youtube-nocookie.com') return;
      var data;
      try { data = (typeof ev.data === 'string') ? JSON.parse(ev.data) : ev.data; } catch(_){ return; }
      if (!data) return;
      // â”€â”€ State change: cancel heartbeat if real playback or buffering started
      if (data.event === 'onStateChange') {
        // 1=playing, 3=buffering, 5=cued
        if (data.info === 1 || data.info === 3) {
          window.__twkInlinePlaybackStarted = true;
          if (window.__twkInlineHeartbeat) {
            clearTimeout(window.__twkInlineHeartbeat);
            window.__twkInlineHeartbeat = null;
          }
        }
        return;
      }
      if (data.event !== 'onError') return;
      var code = data.info;
      if (code !== 101 && code !== 150) return;
      // Resolve which iframe sent it
      var ifr = document.getElementById('twerkhub-pl-player');
      if (!ifr || ifr.contentWindow !== ev.source) return;
      var m = (ifr.src || '').match(/embed\/([^?&\s]{6,})/);
      var vid = m && m[1];
      if (!vid || !window.TwkAgeGate) return;
      // SAGRADA #9 â€” top-5 ranking videos must NEVER show the paywall, even if
      // YouTube returns onError 101/150 (rare but happens on geo-restrictions etc).
      if (window.TwkAgeGate.isProtected && window.TwkAgeGate.isProtected(vid)) return;
      var wrap = ifr.closest('.twerkhub-pl-player-wrap') || ifr.parentNode;
      if (window.__twkInlineHeartbeat) { clearTimeout(window.__twkInlineHeartbeat); window.__twkInlineHeartbeat = null; }
      // Use the unified showInlinePaywall helper so iframe gets hidden too
      // (avoids YouTube's "video unavailable" UI bleeding behind the overlay).
      showInlinePaywall(ifr, wrap, vid);
      stopTimeTracker();
    });
  }

  // Tell the iframe to start pushing events to us (must be called after load)
  function subscribeInlineToEvents(){
    var ifr = document.getElementById('twerkhub-pl-player');
    if (!ifr || !ifr.contentWindow) return;
    try { ifr.contentWindow.postMessage(JSON.stringify({event:'listening', id: 1, channel: 'twk_inline'}), '*'); } catch(_){}
    setTimeout(function(){
      try { ifr.contentWindow.postMessage(JSON.stringify({event:'command', func:'addEventListener', args:['onError']}), '*'); } catch(_){}
      try { ifr.contentWindow.postMessage(JSON.stringify({event:'command', func:'addEventListener', args:['onStateChange']}), '*'); } catch(_){}
    }, 50); }

  function init(){
    injectStyle();  // CRITICAL: badge CSS must exist before applyViewedClasses adds .twk-viewed
    installInlineErrorListener();
    patchInlinePlayer();
    applyViewedClasses();
    document.addEventListener('click', onDocClick, true);
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(muts){
        var added = false;
        muts.forEach(function(m){ if (m.addedNodes && m.addedNodes.length) added = true; });
        if (added) applyViewedClasses();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.TwerkhubPlTheater = { open: open, close: close, markViewed: markViewed };
})();
