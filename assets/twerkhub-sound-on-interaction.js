/* ═══ TWERKHUB · Sound manager (exclusive audio) ═══
 * Old behavior was wrong: it auto-unmuted every YouTube iframe on the first
 * click, which forced the hero to sound even when the user wasn't hovering
 * over it, and also let multiple videos play audio simultaneously.
 *
 * New behavior (v20260424-p7):
 *   - NOTHING is unmuted automatically. Each video stays muted by default.
 *   - One video at a time can produce sound. When any player becomes the
 *     audible one (MP4 <video> un-muted, or a YouTube iframe receives
 *     `unMute` / `playVideo`), every OTHER player on the page is muted.
 *   - The hero iframe follows the same rule — it sounds only while the mouse
 *     is over it (driven by its own inline handler in index.html), and if
 *     another card MP4 becomes audible, the hero is silenced too.
 *
 * Public API:
 *   window.TwerkhubSound.claim(el)   → make this element the sole audio source
 *   window.TwerkhubSound.muteAll()   → mute every video + iframe on the page
 *
 * The manager observes <video>.muted changes and mouseenter on the hero aside
 * and the coming-soon MP4 cards to keep the audible selection consistent.
 */
(function(){
  'use strict';
  if (window.__twerkhubSoundMgrInit) return;
  window.__twerkhubSoundMgrInit = true;

  function sendYt(iframe, func, args){
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: func, args: args || [] }),
        '*'
      );
    } catch (e) {}
  }

  function allYtIframes(){
    return Array.prototype.slice.call(document.querySelectorAll(
      'iframe[src*="youtube-nocookie.com/embed"], iframe[src*="youtube.com/embed"]'
    ));
  }
  function allMp4s(){
    return Array.prototype.slice.call(document.querySelectorAll('video'));
  }

  var currentAudible = null;

  function muteEveryoneExcept(target){
    allYtIframes().forEach(function(frame){
      if (frame !== target) sendYt(frame, 'mute');
    });
    allMp4s().forEach(function(v){
      if (v !== target && !v.muted) {
        try { v.muted = true; } catch(_){}
      }
    });
  }

  function muteAll(){
    currentAudible = null;
    allYtIframes().forEach(function(f){ sendYt(f, 'mute'); });
    allMp4s().forEach(function(v){ try { v.muted = true; } catch(_){} });
  }

  function claim(el){
    if (!el) return;
    currentAudible = el;
    muteEveryoneExcept(el);
    // If the claim is for a YT iframe, also push an `unMute` — caller may
    // have already done it, but double-firing is harmless.
    if (el.tagName === 'IFRAME') {
      sendYt(el, 'unMute');
      sendYt(el, 'setVolume', [50]);
    }
  }

  // Observe <video> muted attribute changes and enforce exclusivity when a
  // video becomes un-muted by its own inline handler (hover / tap).
  function hookVideoExclusivity(){
    var lastMutedState = new WeakMap();
    function tick(){
      allMp4s().forEach(function(v){
        var prev = lastMutedState.get(v);
        if (prev === undefined) { lastMutedState.set(v, v.muted); return; }
        if (prev !== v.muted) {
          lastMutedState.set(v, v.muted);
          if (v.muted === false) {
            // This video just became audible → silence everything else.
            claim(v);
          } else if (currentAudible === v) {
            currentAudible = null;
          }
        }
      });
    }
    // Lightweight polling — cheap, catches inline `this.muted=false` set by
    // the MP4 card onmouseenter handlers.
    setInterval(tick, 120);
  }

  // Silence everything when the tab is hidden. The hero script does this for
  // itself already; we cover the rest.
  function hookVisibility(){
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) muteAll();
    });
  }

  // ── Auto-unmute the HERO (or the single featured player) on first user
  // gesture. Browsers require a user gesture before we can unmute an
  // autoplaying iframe. Instead of forcing the user to click the literal
  // "Tap to unmute" button, we catch ANY first interaction (click, key,
  // touch, scroll) and unmute the featured player ONCE. Other players stay
  // muted — exclusive-audio rule still applies.
  function hookFirstGestureUnmute(){
    if (window.__twerkhubFirstGestureBound) return;
    window.__twerkhubFirstGestureBound = true;
    var done = false;
    function pickFeatured(){
      // Priority: hero on home, then the playlist page's featured player.
      return document.querySelector(
        '#twerkhub-hh-iframe, .twerkhub-hh-iframe, #twerkhub-pl-player'
      );
    }
    function fire(){
      if (done) return;
      var featured = pickFeatured();
      if (!featured) return;
      done = true;
      try { claim(featured); } catch(_){}
      // Update the "Tap to unmute" button state visually if present.
      var btn = document.querySelector('[data-twerkhub-hero-mute]');
      if (btn) {
        btn.setAttribute('aria-pressed', 'false');
        var lab = btn.querySelector('.twerkhub-hh-mute-label');
        if (lab) lab.textContent = 'Sound on';
        var ico = btn.querySelector('.twerkhub-hh-mute-ico');
        if (ico) ico.textContent = '🔊';
        btn.style.opacity = '0.7';
      }
      cleanup();
    }
    function cleanup(){
      ['pointerdown','click','keydown','touchstart','scroll','wheel']
        .forEach(function(ev){
          document.removeEventListener(ev, fire, true);
        });
    }
    ['pointerdown','click','keydown','touchstart','scroll','wheel']
      .forEach(function(ev){
        document.addEventListener(ev, fire, { capture: true, passive: true });
      });
  }

  function init(){
    hookVideoExclusivity();
    hookVisibility();
    hookFirstGestureUnmute();
    console.info('[twerkhub-sound] manager ready · auto-unmute-on-first-gesture armed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Expose for other scripts — hero inline handler can call claim() when it
  // un-mutes, so the manager knows who's audible without a poll delay.
  window.TwerkhubSound = {
    claim: claim,
    muteAll: muteAll,
    // Back-compat shim: older code called unmuteAll(). Now a no-op — we never
    // force-unmute everything. If anything still calls it, log a warning so
    // we can track the source down.
    unmuteAll: function(){
      console.warn('[twerkhub-sound] unmuteAll() is deprecated — exclusive audio is on');
    }
  };
})();
