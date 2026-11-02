/* TWERKHUB · global adults-only disclaimer. One implementation, injected once per page.
 * Loaded by twerkhub-age-gate.js (all pages). Skips if the page already has a .twk-disc block. */
(function () {
  'use strict';
  function add() {
    if (document.querySelector('.twk-disc') || !document.body) return;
    var d = document.createElement('div');
    d.className = 'twk-disc';
    d.setAttribute('role', 'note');
    d.style.cssText = 'margin:0;padding:18px 16px;border-top:1px solid rgba(255,255,255,.12);background:#000;color:#9d9db0;font:11px/1.6 system-ui,Arial,sans-serif;text-align:center;letter-spacing:.02em';
    d.innerHTML = '<b style="color:#fff">18+ ADULTS ONLY.</b> If you are under 18 you cannot enter this site. All performers in Twerkhub original content are 18 or older and appear under a written agreement.';
    document.body.appendChild(d);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, { once: true });
  else add();
})();
