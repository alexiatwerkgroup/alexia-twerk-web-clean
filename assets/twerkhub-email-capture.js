/* TWERKHUB · Email capture modal · v1.0 (2026-05-07)
 *
 * Triggers (whichever fires first):
 *   - User scrolled past 50% of viewport
 *   - 35 seconds elapsed
 *   - Exit-intent: mouse leaves the top of the viewport
 *
 * Once dismissed/submitted, sessionStorage flag prevents re-show in same session.
 * After successful subscribe, "confirmed" toast fades out + closes modal.
 *
 * Posts to /api/subscribe (Cloudflare Pages Function).
 */
(function () {
  'use strict';
  if (window.__twkEmailCaptureInit) return;
  window.__twkEmailCaptureInit = true;

  var STORAGE_KEY = 'twkEmailCaptureDismissed_v1';
  var SUBSCRIBED_KEY = 'twkEmailCaptureSubscribed_v1';

  // 2026-05-11: LESS INVASIVE MODE
  //   - Only shows on landing-style pages (home, membership, blog index,
  //     community, creators index). Skip individual creator/playlist/article
  //     pages where users are actively consuming content.
  //   - Once per browser session ONLY (sessionStorage flag).
  //   - Removed the time-based 35s timer (was annoying).
  //   - Removed exit-intent trigger (was firing on tab-switch in some browsers).
  //   - Now only triggers on genuine scroll past 60% — explicit engagement signal.
  //   - Backdrop is now MORE OPAQUE so it's visually obvious the modal opened,
  //     not invisible. Card has shadow + scale animation to draw attention.

  // Skip the popup entirely on content/detail pages
  var path = (location.pathname || '/').toLowerCase();
  var LANDING_PATHS = [
    '/', '/index.html',
    '/membership.html', '/membership',
    '/community.html', '/community',
    '/about.html', '/about',
    '/creators.html', '/creators',
    '/blog/', '/blog/index.html',
  ];
  var isLanding = LANDING_PATHS.indexOf(path) !== -1;
  if (!isLanding) return;

  // Already dismissed/subscribed in this session? Don't re-show.
  if (
    sessionStorage.getItem(STORAGE_KEY) === '1' ||
    localStorage.getItem(SUBSCRIBED_KEY) === '1'
  ) {
    return;
  }

  // 2026-05-09: skip the popup for SIGNED-IN users (they already gave us
  // their email at signup — no need to capture again). Also skip if any
  // TWERKHUB localStorage exists (returning user from another session).
  try {
    var auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}');
    if (auth && auth.user && (auth.user.id || auth.user.email)) return;
  } catch(_){}

  // Inject CSS once
  function injectCSS() {
    if (document.getElementById('twk-email-capture-css')) return;
    var st = document.createElement('style');
    st.id = 'twk-email-capture-css';
    st.textContent = [
      '.twk-ec-overlay{position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .3s ease;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
      '.twk-ec-overlay.is-open{opacity:1;pointer-events:auto}',
      '.twk-ec-card{position:relative;width:min(440px,100%);background:linear-gradient(180deg,rgba(20,20,32,.98),rgba(10,10,20,.99));border:1px solid rgba(255,45,135,.35);border-radius:22px;padding:34px 30px 28px;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 60px rgba(255,45,135,.18);color:#f5f5fb;font-family:"Inter",ui-sans-serif,system-ui,sans-serif;transform:translateY(20px) scale(.96);transition:transform .35s cubic-bezier(.2,1.2,.3,1)}',
      '.twk-ec-overlay.is-open .twk-ec-card{transform:translateY(0) scale(1)}',
      '.twk-ec-card::before{content:"";position:absolute;top:-1px;left:-1px;right:-1px;height:3px;border-radius:22px 22px 0 0;background:linear-gradient(90deg,#ff2d87,#ff9000,#ffb454)}',
      '.twk-ec-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.4);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s;line-height:1;padding:0}',
      '.twk-ec-close:hover{background:rgba(255,45,135,.3);border-color:#ff2d87}',
      '.twk-ec-kicker{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:#ff9000;margin-bottom:12px}',
      '.twk-ec-title{font-family:"Playfair Display",Georgia,serif;font-size:26px;font-weight:900;line-height:1.15;letter-spacing:-.01em;margin-bottom:10px;color:#fff}',
      '.twk-ec-title em{font-style:italic;background:linear-gradient(135deg,#ff2d87,#ff9000);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.twk-ec-sub{color:#c7c7d3;font-size:14.5px;line-height:1.55;margin-bottom:18px}',
      '.twk-ec-form{display:flex;flex-direction:column;gap:10px}',
      '.twk-ec-input{width:100%;padding:13px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.45);color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .2s,background .2s;box-sizing:border-box}',
      '.twk-ec-input:focus{border-color:#ff2d87;background:rgba(0,0,0,.6)}',
      '.twk-ec-input::placeholder{color:rgba(230,230,240,.4)}',
      '.twk-ec-btn{width:100%;padding:13px 18px;border-radius:10px;border:0;background:linear-gradient(135deg,#ff2d87,#ff9000);color:#fff;font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:transform .2s,box-shadow .2s;font-family:inherit}',
      '.twk-ec-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(255,45,135,.45)}',
      '.twk-ec-btn:disabled{opacity:.6;cursor:wait;transform:none}',
      '.twk-ec-foot{margin-top:12px;font-size:11px;color:#888;text-align:center;letter-spacing:.04em}',
      '.twk-ec-msg{margin-top:10px;font-size:13.5px;text-align:center;line-height:1.4;display:none}',
      '.twk-ec-msg.is-error{color:#ff6f8a;display:block}',
      '.twk-ec-msg.is-ok{color:#1ee08f;display:block;font-weight:700}',
      '.twk-ec-hp{position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none}',
      '@media(max-width:480px){.twk-ec-card{padding:30px 22px 24px}.twk-ec-title{font-size:22px}}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // Build modal DOM
  function buildModal() {
    var el = document.createElement('div');
    el.className = 'twk-ec-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'twk-ec-title');
    el.innerHTML = [
      '<div class="twk-ec-card">',
      '  <button type="button" class="twk-ec-close" aria-label="Close">&#x2715;</button>',
      '  <div class="twk-ec-kicker">★ Weekly drop · free</div>',
      '  <h3 id="twk-ec-title" class="twk-ec-title">First <em>100 cuts</em> every Monday</h3>',
      '  <p class="twk-ec-sub">Every Monday 8AM, the new drop goes out to email first. The first 100 viewers get the unlocked 4K version free. Then it goes to tokens.</p>',
      '  <form class="twk-ec-form" novalidate>',
      '    <input type="text" name="hp" class="twk-ec-hp" tabindex="-1" autocomplete="off" aria-hidden="true">',
      '    <input type="email" name="email" class="twk-ec-input" placeholder="your@email.com" required autocomplete="email">',
      '    <button type="submit" class="twk-ec-btn">Lock my spot →</button>',
      '    <div class="twk-ec-msg" role="status" aria-live="polite"></div>',
      '  </form>',
      '  <div class="twk-ec-foot">No spam · 1 mail/week · unsubscribe anytime · 18+</div>',
      '</div>',
    ].join('');
    return el;
  }

  var modal = null;
  var hasShown = false;

  function show() {
    if (hasShown || sessionStorage.getItem(STORAGE_KEY) === '1') return;
    hasShown = true;
    injectCSS();
    if (!modal) {
      modal = buildModal();
      document.body.appendChild(modal);
      attachHandlers(modal);
    }
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
    });
  }

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    if (modal) modal.classList.remove('is-open');
  }

  function attachHandlers(root) {
    var btnClose = root.querySelector('.twk-ec-close');
    var form = root.querySelector('form');
    var input = root.querySelector('input[name="email"]');
    var submitBtn = root.querySelector('button[type="submit"]');
    var msg = root.querySelector('.twk-ec-msg');

    btnClose.addEventListener('click', dismiss);
    root.addEventListener('click', function (e) {
      if (e.target === root) dismiss();
    });
    document.addEventListener(
      'keydown',
      function (e) {
        if (e.key === 'Escape' && root.classList.contains('is-open')) dismiss();
      },
      { once: false }
    );

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim().toLowerCase();
      msg.className = 'twk-ec-msg';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'That email looks invalid';
        msg.className = 'twk-ec-msg is-error';
        input.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Locking…';

      var hp = root.querySelector('input[name="hp"]').value || '';
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          source: 'home_modal',
          hp: hp,
        }),
      })
        .then(function (r) {
          return r.json().catch(function () {
            return { ok: false, error: 'bad_response' };
          });
        })
        .then(function (data) {
          if (data && data.ok) {
            try {
              localStorage.setItem(SUBSCRIBED_KEY, '1');
            } catch (_) {}
            msg.textContent = '✓ You are in. Mondays 8AM, watch your inbox.';
            msg.className = 'twk-ec-msg is-ok';
            submitBtn.style.display = 'none';
            input.disabled = true;
            setTimeout(dismiss, 3200);
          } else {
            msg.textContent =
              data && data.error === 'invalid_email'
                ? 'That email did not pass validation.'
                : 'Something went wrong. Try again in a moment.';
            msg.className = 'twk-ec-msg is-error';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Lock my spot →';
          }
        })
        .catch(function () {
          msg.textContent = 'Network issue. Try again.';
          msg.className = 'twk-ec-msg is-error';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Lock my spot →';
        });
    });
  }

  // ─── Trigger logic (LESS INVASIVE — 2026-05-11) ───────────────────────
  // Only ONE trigger: scroll past 60%. Removed time-based + exit-intent.
  // Single show per session enforced by hasShown + STORAGE_KEY.

  function checkScroll() {
    var doc = document.documentElement;
    var scrolled = doc.scrollTop || document.body.scrollTop;
    var max = doc.scrollHeight - doc.clientHeight;
    if (max > 0 && scrolled / max > 0.6) {
      window.removeEventListener('scroll', checkScroll);
      show();
    }
  }
  window.addEventListener('scroll', checkScroll, { passive: true });
})();
