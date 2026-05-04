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

  // ── Inject styles once ──────────────────────────────────────────────
  function injectStyles(){
    if (document.getElementById('twk-video-shield-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-video-shield-css';
    st.textContent =
      '.' + WRAP_CLASS + '{position:relative;width:100%;height:100%}' +
      '.' + WRAP_CLASS + '>iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important}' +
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
        enablejsapi:     '1'
      };
      Object.keys(enforce).forEach(function(k){ u.searchParams.set(k, enforce[k]); });
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

    // 4. Build the controls bar (mute + fullscreen) above overlay
    var ctrls = wrap.querySelector('.' + CTRLS_CLASS);
    if (!ctrls) {
      ctrls = document.createElement('div');
      ctrls.className = CTRLS_CLASS;

      // Mute / unmute toggle
      var muteBtn = document.createElement('button');
      muteBtn.type = 'button';
      muteBtn.className = MUTE_CLASS;
      muteBtn.dataset.muted = 'true';   // assume autoplay-muted state
      muteBtn.setAttribute('aria-label', 'Unmute');
      muteBtn.innerHTML = ICON_MUTED;
      muteBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var nowMuted = muteBtn.dataset.muted === 'true';
        // toggle: if currently muted → unmute, and vice versa
        setMuted(iframe, muteBtn, !nowMuted);
      });
      ctrls.appendChild(muteBtn);

      // Fullscreen button — also force-unmutes (user is committing to watch)
      var fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = FS_CLASS;
      fsBtn.setAttribute('aria-label', 'Fullscreen');
      fsBtn.innerHTML = ICON_FS;
      fsBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        // Going fullscreen = the user is committing to watch → unmute too.
        // Only unmute when entering fullscreen (not when exiting), so the
        // exit doesn't blast audio again unexpectedly.
        var goingIntoFs = !(document.fullscreenElement || document.webkitFullscreenElement);
        toggleFullscreen(wrap);
        if (goingIntoFs) setMuted(iframe, muteBtn, false);
      });
      ctrls.appendChild(fsBtn);

      wrap.appendChild(ctrls);
    }

    iframe.setAttribute(SHIELDED_ATTR, '1');
  }

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
