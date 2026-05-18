/* ═══ TWERKHUB · Countdowns driver v2 (2026-04-26) ═══
 *
 * Powers ALL homepage countdowns:
 *   - #twerkhub-farm-countdown (30-day farm-tokens window)
 *   - .twerkhub-coming-drop[data-drop-days] (per-model drop windows)
 *   - #twerkhub-hh-countdown (hero "private · ends in" window)
 *
 * BULLETPROOF DESIGN:
 *   - Each countdown is wrapped in its own try/catch so one bug can't kill
 *     the others.
 *   - Idempotent init (`__twerkhubCountdownsV2Init` flag).
 *   - Auto-resets on zero — countdowns never end, they reset for a new
 *     window so the page always feels alive.
 *   - localStorage-backed so the same end timestamp survives page reloads.
 *
 * Why a separate .js file: the previous inline <script> in index.html got
 * truncated by a bad edit (line 1174 ended with `els` mid-statement → SyntaxError
 * → ALL countdowns + everything below stopped running). A dedicated file is
 * harder to corrupt and easier to re-verify.
 */
(function(){
  'use strict';
  if (window.__twerkhubCountdownsV2Init) return;
  window.__twerkhubCountdownsV2Init = true;

  function two(n){ return String(n).padStart(2,'0'); }

  // ── Hero countdown REMOVED — hero rotator (inline in index.html) is the
  // sole driver and uses unique IDs (#twk-rotator-cd-timer). The previous
  // generic hero handler conflicted with the rotator's per-video minutes
  // and caused the "all videos show same time" bug. Removed entirely.
  function startHeroCountdown(){ /* intentionally empty */ }

  // ── Farm-tokens 30-day window ─────────────────────────────────────
  function startFarmCountdown(){
    var wrap = document.getElementById('twerkhub-farm-countdown');
    if (!wrap) return;
    var dEl = document.getElementById('farm-cd-d');
    var hEl = document.getElementById('farm-cd-h');
    var mEl = document.getElementById('farm-cd-m');
    var sEl = document.getElementById('farm-cd-s');
    if (!dEl || !hEl || !mEl || !sEl) return;
    var days = Number(wrap.getAttribute('data-initial-days')) || 30;
    var KEY = 'twerkhub_farm_countdown_endstamp_v1';
    function freshEnd(){ return Date.now() + days * 86400 * 1000; }
    function loadOrReset(){
      var saved = Number(localStorage.getItem(KEY) || 0);
      if (!saved || saved <= Date.now()){
        saved = freshEnd();
        try { localStorage.setItem(KEY, String(saved)); } catch(_){}
      }
      return saved;
    }
    var end = loadOrReset();
    function tick(){
      var rem = end - Date.now();
      if (rem <= 0){
        end = freshEnd();
        try { localStorage.setItem(KEY, String(end)); } catch(_){}
        rem = end - Date.now();
      }
      var total = Math.floor(rem / 1000);
      var d = Math.floor(total / 86400);
      var h = Math.floor((total % 86400) / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      dEl.textContent = two(d);
      hEl.textContent = two(h);
      mEl.textContent = two(m);
      sEl.textContent = two(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── New-models per-card "Drop in Xd · HH:MM:SS" countdowns ─────────
  function startNewModelsCountdowns(){
    var els = document.querySelectorAll('.twerkhub-coming-drop[data-drop-days]');
    if (!els.length) return;
    els.forEach(function(el, i){
      var days = Number(el.getAttribute('data-drop-days')) || 7;
      var KEY = 'twerkhub_drop_endstamp_v1_' + i + '_' + days;
      function freshEnd(){ return Date.now() + days * 86400 * 1000; }
      function loadOrReset(){
        var saved = Number(localStorage.getItem(KEY) || 0);
        if (!saved || saved <= Date.now()){
          saved = freshEnd();
          try { localStorage.setItem(KEY, String(saved)); } catch(_){}
        }
        return saved;
      }
      var end = loadOrReset();
      var strongEl = el.querySelector('strong');
      if (!strongEl) return;
      function tick(){
        var rem = end - Date.now();
        if (rem <= 0){
          end = freshEnd();
          try { localStorage.setItem(KEY, String(end)); } catch(_){}
          rem = end - Date.now();
        }
        var total = Math.floor(rem / 1000);
        var d = Math.floor(total / 86400);
        var h = Math.floor((total % 86400) / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        if (d > 0) strongEl.textContent = d + 'd · ' + two(h) + ':' + two(m) + ':' + two(s);
        else       strongEl.textContent = two(h) + ':' + two(m) + ':' + two(s);
      }
      tick();
      setInterval(tick, 1000);
    });
  }

  function start(){
    try { startHeroCountdown(); } catch(e){ console.warn('[twk-countdowns] hero failed', e); }
    try { startFarmCountdown(); } catch(e){ console.warn('[twk-countdowns] farm failed', e); }
    try { startNewModelsCountdowns(); } catch(e){ console.warn('[twk-countdowns] models failed', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
