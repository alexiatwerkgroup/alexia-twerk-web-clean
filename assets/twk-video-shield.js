/*!
 * twk-video-shield.js · v20260503-p1
 *
 * Anti-escape layer for YouTube embeds. For every iframe pointing to
 * youtube.com/embed/ (or youtube-nocookie.com/embed/) on the page:
 *
 *   1. Forces the iframe URL to use {controls:0, fs:0, rel:0,
 *      modestbranding:1, iv_load_policy:3, disablekb:1, enablejsapi:1}
 *      so YouTube doesn't render its own UI (no title, no share, no
 *      "Watch on YouTube", no related videos, no annotations).
 *   2. Lays a transparent click-capture <button> on top of the iframe.
 *      Clicks on it toggle play/pause via postMessage — they never
 *      reach YouTube, so no element inside the YouTube UI is clickable.
 *   3. Adds our own fullscreen button (bottom-right). It fullscreens
 *      the WRAPPER, not the iframe — so the shield stays active in
 *      fullscreen mode (you cannot escape to youtube.com from here).
 *
 * Idempotent. Loads on DOMContentLoaded and again whenever the YouTube
 * iframe's src changes (mutation observer), so it works with the
 * existing playlist theater that swaps videos on click.
 *
 * Include with:
 *   <script defer src="/assets/twk-video-shield.js?v=20260503-p1"></script>
 */
(function(){
  'use strict';
  if (window.__twkVideoShield) return;
  window.__twkVideoShield = true;

  var SHIELDED_ATTR = 'data-twk-shielded';
  var WRAP_CLASS    = 'twk-video-shield-wrap';
  var CAP_CLASS     = 'twk-video-shield-cap';
  var FS_CLASS      = 'twk-video-shield-fs';
  var MUTE_CLASS    = 'twk-video-shield-mute';
  var CTRLS_CLASS   = 'twk-video-shield-ctrls';
  var CTA_CLASS     = 'twk-video-shield-cta';
  var CTA_URL       = (typeof window.TWK_VIDEO_CTA_URL   === 'string' && window.TWK_VIDEO_CTA_URL)   || 'https://discord.gg/WWn8ZgQMjn'; // premium VIP Discord
  var CTA_TITLE     = (typeof window.TWK_VIDEO_CTA_TITLE === 'string' && window.TWK_VIDEO_CTA_TITLE) || '+1,500 4K videos →';
  var CTA_SUB       = (typeof window.TWK_VIDEO_CTA_SUB   === 'string' && window.TWK_VIDEO_CTA_SUB)   || 'get the full collection';

  var SEEK_STEP = 10; // seconds to skip on each ⏪/⏩ click or ←/→ keypress
  var DEFAULT_START = 5; // skip YouTube intro logo

  // Inline SVG icons (no external requests, no FOUC)
  var ICON_MUTED =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  var ICON_UNMUTED =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  var ICON_FS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 3H3v5"/><path d="M21 8V3h-5"/><path d="M16 21h5v-5"/><path d="M3 16v5h5"/></svg>';
  var ICON_BACK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>';
  var ICON_FWD =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>';

  // ── Inject styles once ──────────────────────────────────────────────
  function injectStyles(){
    if (document.getElementById('twk-video-shield-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-video-shield-css';
    st.textContent =
      '.' + WRAP_CLASS + '{position:relative;width:100%;height:100%;overflow:hidden;background:#000}' +
      // Windowed: zoom 22% from CENTER → crops top, bottom AND sides equally
      // (~11% each). Hides YouTube title overlay, baked-in watermarks, AND
      // the brief YouTube logo flash that happens during seek transitions.
      '.' + WRAP_CLASS + '>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;transform:scale(1.22);transform-origin:center center}' +
      // Fullscreen: same zoom — keeps it consistent with windowed.
      ':fullscreen .' + WRAP_CLASS + '>iframe,:-webkit-full-screen .' + WRAP_CLASS + '>iframe,.' + WRAP_CLASS + ':fullscreen>iframe{transform:scale(1.22)!important;transform-origin:center center!important}' +
      // Premium glassmorphism CTA — top-LEFT of every shielded video.
      // Transparent gradient + heavy backdrop blur + inset highlight = glossy look.
      // overflow:hidden so the shimmer pseudo-element stays clipped to the pill.
      '.' + CTA_CLASS + '{position:absolute;top:14px;left:14px;z-index:12;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 16px 11px;border-radius:14px;text-decoration:none;color:#fff;cursor:pointer;background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.04));backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border:1px solid rgba(255,255,255,.18);box-shadow:0 8px 32px rgba(0,0,0,.45),0 0 0 0 rgba(255,45,135,.55),inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.04);transition:transform .25s cubic-bezier(.3,1.2,.4,1),background .25s,border-color .25s,box-shadow .25s;line-height:1;-webkit-tap-highlight-color:transparent;overflow:hidden;animation:twkCtaPulse 2.6s ease-out infinite}' +
      // Pulsing glow ring → grabs attention without being noisy
      '@keyframes twkCtaPulse{0%,100%{box-shadow:0 8px 32px rgba(0,0,0,.45),0 0 0 0 rgba(255,45,135,.55),inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.04)}50%{box-shadow:0 8px 32px rgba(0,0,0,.45),0 0 0 10px rgba(255,45,135,0),inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.04)}}' +
      // Shimmer sweep — diagonal highlight that travels across the pill
      '.' + CTA_CLASS + '::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);background-size:200% 100%;background-position:-100% 0;animation:twkCtaShimmer 3.2s ease-in-out infinite;animation-delay:.6s;pointer-events:none;mix-blend-mode:overlay}' +
      '@keyframes twkCtaShimmer{0%{background-position:-100% 0;opacity:0}10%{opacity:1}50%{background-position:200% 0;opacity:1}55%,100%{opacity:0}}' +
      // Hover: stop the pulse, intensify the brand color
      '.' + CTA_CLASS + ':hover{transform:translateY(-2px);background:linear-gradient(135deg,rgba(255,45,135,.28),rgba(255,180,84,.14));border-color:rgba(255,45,135,.55);box-shadow:0 14px 42px rgba(255,45,135,.45),inset 0 1px 0 rgba(255,255,255,.25);animation:none}' +
      '.' + CTA_CLASS + '-title,.' + CTA_CLASS + '-sub{position:relative;z-index:1}' +
      '.' + CTA_CLASS + '-title{font-family:\'Inter\',ui-sans-serif,system-ui,sans-serif;font-weight:800;font-size:13px;letter-spacing:.01em;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);white-space:nowrap}' +
      '.' + CTA_CLASS + '-sub{font-family:\'JetBrains Mono\',ui-monospace,monospace;font-weight:700;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.78);text-shadow:0 1px 1px rgba(0,0,0,.4);white-space:nowrap}' +
      // Fullscreen — bigger, more presence
      ':fullscreen .' + CTA_CLASS + ',:-webkit-full-screen .' + CTA_CLASS + ',.' + WRAP_CLASS + ':fullscreen .' + CTA_CLASS + '{top:28px;left:32px;padding:14px 22px 16px;border-radius:18px;gap:4px}' +
      ':fullscreen .' + CTA_CLASS + '-title,:-webkit-full-screen .' + CTA_CLASS + '-title,.' + WRAP_CLASS + ':fullscreen .' + CTA_CLASS + '-title{font-size:19px}' +
      ':fullscreen .' + CTA_CLASS + '-sub,:-webkit-full-screen .' + CTA_CLASS + '-sub,.' + WRAP_CLASS + ':fullscreen .' + CTA_CLASS + '-sub{font-size:11px}' +
      '@media(max-width:540px){.' + CTA_CLASS + '{top:10px;left:10px;padding:8px 12px 9px}.' + CTA_CLASS + '-title{font-size:11.5px}.' + CTA_CLASS + '-sub{font-size:8px}}' +
      '@media(prefers-reduced-motion:reduce){.' + CTA_CLASS + '{animation:none}.' + CTA_CLASS + '::before{display:none}}' +
      '.' + CAP_CLASS  + '{position:absolute;inset:0;z-index:5;background:transparent;border:0;padding:0;margin:0;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}' +
      '.' + CAP_CLASS  + ':focus-visible{outline:none}' +
      '.' + CTRLS_CLASS + '{position:absolute;bottom:10px;right:10px;z-index:10;display:flex;gap:6px;align-items:center}' +
      '.' + CTRLS_CLASS + ' button{width:38px;height:38px;border:0;border-radius:6px;background:rgba(0,0,0,.55);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.6;transition:opacity .2s,background .2s,transform .15s;-webkit-tap-highlight-color:transparent;padding:0}' +
      '.' + WRAP_CLASS + ':hover .' + CTRLS_CLASS + ' button,.' + CTRLS_CLASS + ' button:focus-visible{opacity:1}' +
      '.' + CTRLS_CLASS + ' button:hover{background:rgba(0,0,0,.85);transform:scale(1.06)}' +
      '.' + CTRLS_CLASS + ' button svg{width:18px;height:18px;display:block;pointer-events:none}' +
      ':fullscreen .' + WRAP_CLASS + '{height:100vh}' +
      '@media(max-width:540px){.' + CTRLS_CLASS + '{bottom:8px;right:8px;gap:5px}.' + CTRLS_CLASS + ' button{width:42px;height:42px}}';
    document.head.appendChild(st);
  }

  // ── Patch the YouTube iframe src so YouTube renders no UI ───────────
  function patchSrc(src){
    if (!src) return src;
    try {
      // Preserve everything; just force the params we need
      var u = new URL(src, location.href);
      var enforce = {
        controls:        '0',
        fs:              '0',
        rel:             '0',
        modestbranding:  '1',
        iv_load_policy:  '3',
        disablekb:       '1',
        playsinline:     '1',
        enablejsapi:     '1',
        vq:              'hd2160',  // request max quality (4K → falls back if unavailable)
        hd:              '1'        // legacy hint that's still respected by some clients
      };
      Object.keys(enforce).forEach(function(k){ u.searchParams.set(k, enforce[k]); });
      // Skip YouTube intro logo by starting at a small offset (only if no
      // explicit start time is set, or the existing one is < DEFAULT_START).
      var existingStart = parseInt(u.searchParams.get('start') || '0', 10) || 0;
      if (existingStart < DEFAULT_START) u.searchParams.set('start', String(DEFAULT_START));
      // Some embeds use `loop=1` + `playlist=ID` to loop; we don't touch those
      return u.toString();
    } catch(e){
      return src;
    }
  }

  // ── Toggle play/pause on the iframe via the YouTube postMessage API ─
  function togglePlay(iframe, cap){
    try {
      var playing = cap.dataset.playing === 'true';
      var fn = playing ? 'pauseVideo' : 'playVideo';
      iframe.contentWindow.postMessage(JSON.stringify({event:'command', func:fn, args:[]}), '*');
      cap.dataset.playing = playing ? 'false' : 'true';
    } catch(_){}
  }

  // ── Fullscreen handler — fullscreens the wrapper so the shield stays ─
  function toggleFullscreen(wrap){
    try {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
        if (req) req.call(wrap);
      }
    } catch(_){}
  }

  // ── Mute / unmute via postMessage (also setVolume to a sensible level) ─
  function setMuted(iframe, btn, muted){
    try {
      var w = iframe.contentWindow;
      if (muted) {
        w.postMessage(JSON.stringify({event:'command', func:'mute', args:[]}), '*');
      } else {
        w.postMessage(JSON.stringify({event:'command', func:'unMute', args:[]}), '*');
        w.postMessage(JSON.stringify({event:'command', func:'setVolume', args:[100]}), '*');
        // Some browsers need a nudge to start playing audible after autoplay-mute
        w.postMessage(JSON.stringify({event:'command', func:'playVideo', args:[]}), '*');
      }
      if (btn) {
        btn.dataset.muted = muted ? 'true' : 'false';
        btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        // Swap the SVG to reflect state
        btn.innerHTML = muted ? ICON_MUTED : ICON_UNMUTED;
      }
    } catch(_){}
  }

  // ── Register the iframe to send infoDelivery events back to us ──────
  // YouTube sends {event:'infoDelivery', info:{currentTime, duration, ...}}
  // every ~250ms once we've sent {event:'listening'} as a handshake.
  function registerListener(iframe){
    try {
      // Wait for the iframe to load before sending the handshake; YouTube
      // ignores postMessages sent before its API is ready.
      var send = function(){
        try {
          var w = iframe.contentWindow;
          // 1. Register for state updates
          w.postMessage(JSON.stringify({event:'listening'}), '*');
          // 2. Force playback quality. CAP at 4K (hd2160) — never 8K, even
          //    if available. 8K barely benefits anyone and burns bandwidth.
          //    Set both single quality and range so YouTube respects the cap.
          w.postMessage(JSON.stringify({event:'command', func:'setPlaybackQuality', args:['hd2160']}), '*');
          w.postMessage(JSON.stringify({event:'command', func:'setPlaybackQualityRange', args:['hd2160','hd2160']}), '*');
        } catch(_){}
      };
      // Resend a couple of times to defeat race conditions
      [0, 600, 1500, 3000, 6000].forEach(function(d){ setTimeout(send, d); });
    } catch(_){}
  }

  // Global message listener: track currentTime per iframe (keyed by data-uid)
  var iframeUid = 0;
  var timeMap = Object.create(null); // uid → currentTime seconds
  window.addEventListener('message', function(e){
    if (!e || !e.origin) return;
    if (!/^https:\/\/www\.youtube(?:-nocookie)?\.com$/.test(e.origin)) return;
    var data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch(_){ return; }
    if (!data || data.event !== 'infoDelivery' || !data.info) return;
    if (typeof data.info.currentTime !== 'number') return;
    // Find which iframe this came from by source window
    var iframes = document.querySelectorAll('iframe[' + SHIELDED_ATTR + ']');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === e.source) {
        var uid = iframes[i].dataset.twkUid;
        if (uid) timeMap[uid] = data.info.currentTime;
        break;
      }
    }
  });

  // ── Seek by N seconds (positive or negative) ────────────────────────
  function seekDelta(iframe, deltaSecs){
    try {
      var uid = iframe.dataset.twkUid;
      var current = (uid && typeof timeMap[uid] === 'number') ? timeMap[uid] : 0;
      var target = Math.max(0, current + deltaSecs);
      iframe.contentWindow.postMessage(JSON.stringify({
        event:'command', func:'seekTo', args:[target, true]
      }), '*');
      // Update local cache so consecutive presses chain properly without
      // waiting for the next infoDelivery tick.
      if (uid) timeMap[uid] = target;
    } catch(_){}
  }

  // ── Apply the shield to a single iframe ─────────────────────────────
  function shield(iframe){
    if (!iframe || iframe.getAttribute(SHIELDED_ATTR) === '1') return;
    var src = iframe.getAttribute('src') || '';
    if (!/youtube(?:-nocookie)?\.com\/embed\//.test(src)) return;

    // 1. Patch src
    var newSrc = patchSrc(src);
    if (newSrc !== src) iframe.setAttribute('src', newSrc);

    // 2. Wrap the iframe in our shielded container (preserves layout via
    //    100% width/height on the wrapper).
    var parent = iframe.parentNode;
    if (!parent) return;
    var wrap;
    if (parent.classList && parent.classList.contains(WRAP_CLASS)) {
      wrap = parent;
    } else {
      wrap = document.createElement('div');
      wrap.className = WRAP_CLASS;
      parent.insertBefore(wrap, iframe);
      wrap.appendChild(iframe);
    }
    // Make sure the wrapper inherits the iframe's display dimensions.
    // Most parents are aspect-ratio containers, so wrapper just fills.

    // 3. Add the click-capture overlay
    var cap = wrap.querySelector('.' + CAP_CLASS);
    if (!cap) {
      cap = document.createElement('button');
      cap.type = 'button';
      cap.className = CAP_CLASS;
      cap.setAttribute('aria-label', 'Toggle play/pause');
      cap.dataset.playing = 'true'; // assume autoplay starts
      cap.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        togglePlay(iframe, cap);
      });
      wrap.appendChild(cap);
    }

    // Assign a UID so we can track currentTime per iframe
    if (!iframe.dataset.twkUid) {
      iframeUid += 1;
      iframe.dataset.twkUid = 'twk' + iframeUid;
    }

    // 4. Build the controls bar (back, forward, mute, fullscreen) above overlay
    var ctrls = wrap.querySelector('.' + CTRLS_CLASS);
    if (!ctrls) {
      ctrls = document.createElement('div');
      ctrls.className = CTRLS_CLASS;

      // Back 10s
      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.setAttribute('aria-label', 'Back ' + SEEK_STEP + ' seconds');
      backBtn.innerHTML = ICON_BACK;
      backBtn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        seekDelta(iframe, -SEEK_STEP);
      });
      ctrls.appendChild(backBtn);

      // Forward 10s
      var fwdBtn = document.createElement('button');
      fwdBtn.type = 'button';
      fwdBtn.setAttribute('aria-label', 'Forward ' + SEEK_STEP + ' seconds');
      fwdBtn.innerHTML = ICON_FWD;
      fwdBtn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        seekDelta(iframe, SEEK_STEP);
      });
      ctrls.appendChild(fwdBtn);

      // Mute / unmute toggle
      var muteBtn = document.createElement('button');
      muteBtn.type = 'button';
      muteBtn.className = MUTE_CLASS;
      muteBtn.dataset.muted = 'true';   // assume autoplay-muted state
      muteBtn.setAttribute('aria-label', 'Unmute');
      muteBtn.innerHTML = ICON_MUTED;
      muteBtn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        var nowMuted = muteBtn.dataset.muted === 'true';
        setMuted(iframe, muteBtn, !nowMuted);
      });
      ctrls.appendChild(muteBtn);

      // Fullscreen — also force-unmutes when entering
      var fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = FS_CLASS;
      fsBtn.setAttribute('aria-label', 'Fullscreen');
      fsBtn.innerHTML = ICON_FS;
      fsBtn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        var goingIntoFs = !(document.fullscreenElement || document.webkitFullscreenElement);
        toggleFullscreen(wrap);
        if (goingIntoFs) setMuted(iframe, muteBtn, false);
      });
      ctrls.appendChild(fsBtn);

      wrap.appendChild(ctrls);
    }

    // 5. Premium CTA overlay (top-right) → click goes to Discord VIP
    var cta = wrap.querySelector('.' + CTA_CLASS);
    if (!cta) {
      cta = document.createElement('a');
      cta.className = CTA_CLASS;
      cta.href = CTA_URL;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
      cta.setAttribute('aria-label', CTA_TITLE + ' · ' + CTA_SUB);
      cta.innerHTML =
        '<span class="' + CTA_CLASS + '-title">' + CTA_TITLE + '</span>' +
        '<span class="' + CTA_CLASS + '-sub">' + CTA_SUB + '</span>';
      // Make sure the click reaches the link, not the click-capture overlay
      cta.addEventListener('click', function(ev){ ev.stopPropagation(); });
      wrap.appendChild(cta);
    }

    iframe.setAttribute(SHIELDED_ATTR, '1');
    registerListener(iframe);

    // 6. Intercept future src changes BEFORE YouTube loads them.
    // Without this, pl-theater sets src to a baseline URL → iframe starts
    // loading → MutationObserver fires → we patch + setAttribute → YouTube
    // RESTARTS the load with our params. That double-load is the 2-3s lag
    // when switching videos. By overriding the property setter, we patch the
    // URL synchronously before the browser even kicks off the network request.
    if (!iframe.__twkSrcHooked) {
      iframe.__twkSrcHooked = true;
      var proto = Object.getPrototypeOf(iframe);
      var d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
      if (d && d.set && d.get) {
        Object.defineProperty(iframe, 'src', {
          configurable: true, enumerable: true,
          get: function(){ return d.get.call(this); },
          set: function(v){
            try {
              if (typeof v === 'string' && /youtube(?:-nocookie)?\.com\/embed\//.test(v)) {
                v = patchSrc(v);
              }
            } catch(_){}
            d.set.call(this, v);
          }
        });
      }
      // Also wrap setAttribute('src', ...) — some code paths use that instead
      var nativeSetAttr = iframe.setAttribute.bind(iframe);
      iframe.setAttribute = function(name, val){
        try {
          if (name === 'src' && typeof val === 'string' && /youtube(?:-nocookie)?\.com\/embed\//.test(val)) {
            val = patchSrc(val);
          }
        } catch(_){}
        return nativeSetAttr(name, val);
      };
    }
  }

  // ── Keyboard: ←/→ seek the active shielded iframe ───────────────────
  function pickActiveIframe(){
    // Prefer fullscreen iframe if any
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      var inner = fsEl.querySelector('iframe[' + SHIELDED_ATTR + ']');
      if (inner) return inner;
    }
    // Otherwise: pick the first shielded iframe in the viewport
    var ifs = document.querySelectorAll('iframe[' + SHIELDED_ATTR + ']');
    for (var i = 0; i < ifs.length; i++) {
      var r = ifs[i].getBoundingClientRect();
      if (r.bottom > 0 && r.top < (window.innerHeight || 0)) return ifs[i];
    }
    return ifs[0] || null;
  }
  document.addEventListener('keydown', function(ev){
    // Don't hijack arrows when user is typing in an input/textarea/contenteditable
    var t = ev.target;
    if (t && (t.matches && t.matches('input,textarea,select,[contenteditable=""],[contenteditable="true"]'))) return;
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    var iframe = pickActiveIframe();
    if (!iframe) return;
    ev.preventDefault();
    seekDelta(iframe, ev.key === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP);
  });

  // ── Scan for all YouTube iframes on the page ────────────────────────
  function scanAll(){
    var iframes = document.querySelectorAll(
      'iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"]'
    );
    for (var i = 0; i < iframes.length; i++) shield(iframes[i]);
  }

  // ── React to src changes (the playlist theater swaps src on click) ──
  function watchSrcChanges(){
    var mo = new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes' && m.attributeName === 'src') {
          var t = m.target;
          if (t.tagName === 'IFRAME') {
            // Re-patch the new src so our params are preserved
            var src = t.getAttribute('src') || '';
            if (/youtube(?:-nocookie)?\.com\/embed\//.test(src)) {
              var patched = patchSrc(src);
              if (patched !== src) {
                // Avoid infinite loop — only set if different
                t.setAttribute('src', patched);
              }
              // Reset the play state since the new video starts fresh
              var wrap = t.closest('.' + WRAP_CLASS);
              if (wrap) {
                var cap = wrap.querySelector('.' + CAP_CLASS);
                if (cap) cap.dataset.playing = 'true';
              }
            }
          }
        }
        // New iframes added to the DOM
        if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) {
              if (node.tagName === 'IFRAME') shield(node);
              else if (node.querySelectorAll) {
                var inner = node.querySelectorAll('iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"]');
                for (var k = 0; k < inner.length; k++) shield(inner[k]);
              }
            }
          }
        }
      }
    });
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────
  function boot(){
    injectStyles();
    scanAll();
    watchSrcChanges();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
