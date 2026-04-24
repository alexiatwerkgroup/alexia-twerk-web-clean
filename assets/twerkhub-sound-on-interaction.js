/* ═══ TWERKHUB · Sound on first interaction ═══
 * Autoplay with audio is blocked by every major browser (muted autoplay is
 * allowed, audible autoplay is not). To simulate "videos start with sound at
 * 50%" we autoplay everything muted, then on the user's FIRST interaction
 * (click / tap / keydown / scroll / wheel) we post an `unMute` + `setVolume
 * [50]` message to every YouTube iframe on the page.
 *
 * Idempotent, passive, one-shot · v20260424-p1
 */
(function(){
  'use strict';
  if (window.__twerkhubSoundOnInteractionInit) return;
  window.__twerkhubSoundOnInteractionInit = true;

  var TARGET_VOLUME = 50;
  var fired = false;

  function send(iframe, func, args){
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: func, args: args || [] }),
        '*'
      );
    } catch (e) {}
  }

  function unmuteAll(){
    if (fired) return;
    fired = true;
    try {
      var iframes = document.querySelectorAll(
        'iframe[src*="youtube-nocookie.com/embed"], iframe[src*="youtube.com/embed"]'
      );
      iframes.forEach(function(frame){
        // Some iframes don't have enablejsapi=1 — postMessage is a no-op on
        // those, which is fine. No need to filter.
        send(frame, 'unMute');
        send(frame, 'setVolume', [TARGET_VOLUME]);
        send(frame, 'playVideo');
      });
      console.info('[twerkhub-sound] unmuted', iframes.length, 'iframes @ vol', TARGET_VOLUME);
    } catch (e) {
      console.warn('[twerkhub-sound] unmute failed', e);
    }
  }

  function bind(){
    var opts = { once: true, passive: true, capture: true };
    ['click', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(function(ev){
      document.addEventListener(ev, unmuteAll, opts);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  // Expose for manual triggering if another script wants to force unmute.
  window.TwerkhubSound = { unmuteAll: unmuteAll };
})();
