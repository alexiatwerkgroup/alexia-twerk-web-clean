(function () {
  'use strict';
  if (window.twkSecurityCheck) return;
  var sitekey = '0x4AAAAAAFyov-cxmExBGGwP';
  var scriptReady, busy = false;
  function load() {
    if (window.turnstile) return Promise.resolve();
    if (!scriptReady) scriptReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      var timer = setTimeout(function () { reject(Error('Security verification could not load. Please reload and try again.')); }, 15000);
      s.onload = function () { clearTimeout(timer); if (window.turnstile) resolve(); else reject(Error('Security verification unavailable.')); };
      s.onerror = function () { clearTimeout(timer); reject(Error('Security verification could not load. Please reload and try again.')); };
      document.head.appendChild(s);
    });
    return scriptReady;
  }
  // Precarga el script de Turnstile (y la conexion) antes de que el usuario toque 'Entrar', asi el chequeo arranca al instante.
  window.twkSecurityWarm = function () { try { load().catch(function () {}); } catch (e) {} };
  window.twkSecurityCheck = function (action) {
    if (busy) return Promise.reject(Error('A security verification is already open.'));
    busy = true;
    return new Promise(function (resolve, reject) {
      var dialog = document.createElement('dialog'), id, done = false, waitTimer, verifiedToken = null;
      dialog.setAttribute('aria-labelledby', 'twk-security-title');
      dialog.style.cssText = 'position:fixed;inset:0;margin:auto;height:fit-content;max-height:calc(100svh - 32px);overflow:auto;box-sizing:border-box;width:min(380px,calc(100% - 24px));max-width:calc(100% - 24px);padding:24px;border:1px solid #444;border-radius:16px;background:#101016;color:white;font:15px/1.5 system-ui;';
      dialog.innerHTML = '<h2 id="twk-security-title" style="margin:0 0 12px;color:#ff8a00;font:700 22px system-ui">Security verification</h2><p style="margin:0 0 18px">Complete the check to continue.</p><div class="twk-security-widget" style="width:100%;min-height:70px"></div><p class="twk-security-msg" role="status"></p><button class="twk-security-continue" type="button" disabled style="display:none;margin:0 12px 0 0;padding:10px 16px;border:0;border-radius:6px;background:#ff8a00;color:#000;font-weight:700;cursor:pointer">Continue</button><button class="twk-security-cancel" type="button" style="padding:10px 16px;border:1px solid #777;border-radius:6px;background:#222;color:white;cursor:pointer">Cancel</button>';
      function finish(error, token) {
        if (done) return; done = true; busy = false; clearTimeout(waitTimer);
        if (id !== undefined && window.turnstile) window.turnstile.remove(id);
        dialog.close(); dialog.remove();
        if (error) reject(error); else resolve(token);
      }
      dialog.querySelector('.twk-security-cancel').onclick = function () { finish(Error('Security verification cancelled.')); };
      dialog.querySelector('.twk-security-continue').onclick = function () { if (verifiedToken) finish(null, verifiedToken); };
      dialog.addEventListener('keydown', function (e) { if (e.key === 'Escape') e.stopPropagation(); });
      dialog.addEventListener('cancel', function (e) { e.preventDefault(); finish(Error('Security verification cancelled.')); });
      document.body.appendChild(dialog); dialog.showModal();
      waitTimer = setTimeout(function () { if (!done) dialog.querySelector('.twk-security-msg').textContent = 'If the check does not advance, cancel and try again.'; }, 30000);
      load().then(function () {
        if (done) return;
        id = window.turnstile.render(dialog.querySelector('.twk-security-widget'), {
          sitekey: sitekey, action: action, theme: 'dark', size: 'flexible',
          callback: function (token) {
            if (done) return;
            verifiedToken = token; clearTimeout(waitTimer);
            dialog.querySelector('.twk-security-msg').textContent = 'Verification complete. Click Continue to submit your login or registration.';
            var next = dialog.querySelector('.twk-security-continue'); next.disabled = false; next.style.display = 'inline-block'; next.focus();
          },
          'error-callback': function () { dialog.querySelector('.twk-security-msg').textContent = 'Verification failed. Please cancel and try again.'; },
          'expired-callback': function () {
            verifiedToken = null;
            var next = dialog.querySelector('.twk-security-continue'); next.disabled = true; next.style.display = 'none';
            dialog.querySelector('.twk-security-msg').textContent = 'Verification expired. Please complete the check again.';
            if (id !== undefined) window.turnstile.reset(id);
          },
          'timeout-callback': function () { dialog.querySelector('.twk-security-msg').textContent = 'Verification timed out. Please cancel and try again.'; }
        });
      }).catch(function (e) { finish(e); });
    });
  };
})();
