/*!
 * ALEXIA TWERK — Welcome Bonus Banner
 * Prominent first-visit banner promoting the 200-token welcome bonus.
 * Auto-hides after claim or after 24h dismissal.
 */
(function(){
  'use strict';

  if (window.__alexiaWelcomeMounted) return;
  window.__alexiaWelcomeMounted = true;

  var LS_KEY  = 'alexia_welcome_dismissed_v1';
  var LS_USER = 'alexia_welcome_claimed_v1';

  // Already claimed? show "welcome back"
  // Already dismissed recently? skip
  try {
    var dismissed = Number(localStorage.getItem(LS_KEY) || 0);
    if (dismissed && Date.now() < dismissed) return;
  } catch(e){}

  // Only show on home page (gate)
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;

  function mount(){
    var claimed = false;
    try { claimed = localStorage.getItem(LS_USER) === '1'; } catch(e){}

    var root = document.createElement('div');
    root.id = 'alexia-welcome';
    root.innerHTML = claimed
      ? (
        '<div class="awb-pill">' +
          '<span class="awb-dot"></span>' +
          '<span class="awb-label"><b>Welcome back</b> · Keep farming, VIP unlocks at 4,000</span>' +
          '<a class="awb-go" href="/account.html">My Dashboard →</a>' +
        '</div>'
      )
      : (
        '<div class="awb-pill awb-pill--hot">' +
          '<span class="awb-gift">🎁</span>' +
          '<span class="awb-label"><b>+200 tokens</b> welcome bonus · <em>click to claim</em></span>' +
          '<button class="awb-claim" type="button">Claim Bonus →</button>' +
          '<button class="awb-close" type="button" aria-label="Dismiss">×</button>' +
        '</div>'
      );

    var css = document.createElement('style');
    css.id = 'alexia-welcome-style';
    css.textContent = [
      '#alexia-welcome{position:fixed;top:88px;left:50%;transform:translateX(-50%);z-index:180;pointer-events:auto;animation:awbSlide .7s cubic-bezier(.22,.9,.38,1) both .6s;font-family:"Inter",-apple-system,sans-serif}',
      '@keyframes awbSlide{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}',
      '.awb-pill{display:inline-flex;align-items:center;gap:12px;padding:10px 14px 10px 18px;border-radius:999px;',
      'background:linear-gradient(90deg,rgba(232,200,128,.14),rgba(255,46,126,.08));',
      'border:1px solid rgba(232,200,128,.4);',
      'box-shadow:0 14px 40px rgba(0,0,0,.42),0 0 0 1px rgba(232,200,128,.2),inset 0 1px 0 rgba(255,255,255,.04);',
      'backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);color:#fff;font-size:12px;font-weight:600;white-space:nowrap;letter-spacing:.02em}',
      '.awb-pill--hot{animation:awbPulseGlow 3s ease-in-out infinite}',
      '@keyframes awbPulseGlow{0%,100%{box-shadow:0 14px 40px rgba(0,0,0,.42),0 0 0 1px rgba(232,200,128,.2),0 0 0 0 rgba(232,200,128,.3),inset 0 1px 0 rgba(255,255,255,.04)}50%{box-shadow:0 14px 40px rgba(0,0,0,.42),0 0 0 1px rgba(232,200,128,.55),0 0 40px 6px rgba(232,200,128,.22),inset 0 1px 0 rgba(255,255,255,.06)}}',
      '.awb-gift{font-size:18px;animation:awbWobble 2s ease-in-out infinite;display:inline-block}',
      '@keyframes awbWobble{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}',
      '.awb-dot{width:8px;height:8px;border-radius:50%;background:#43e091;box-shadow:0 0 8px rgba(67,224,145,.8);animation:awbBlink 2s ease-in-out infinite}',
      '@keyframes awbBlink{0%,100%{opacity:.6}50%{opacity:1}}',
      '.awb-label{font-weight:500;color:rgba(244,243,247,.88)}',
      '.awb-label b{color:#e8c880;font-weight:800}',
      '.awb-label em{font-style:italic;color:rgba(244,243,247,.58)}',
      '.awb-claim{padding:7px 16px;border-radius:999px;background:linear-gradient(180deg,#e8c880,#b99350);color:#0a0a0d;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;border:0;cursor:pointer;transition:.25s;box-shadow:0 6px 18px rgba(232,200,128,.35)}',
      '.awb-claim:hover{transform:translateY(-1px);filter:brightness(1.08);box-shadow:0 10px 24px rgba(232,200,128,.5)}',
      '.awb-go{padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.05);color:#fff;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;border:1px solid rgba(255,255,255,.12);transition:.25s}',
      '.awb-go:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3)}',
      '.awb-close{background:transparent;border:0;color:rgba(255,255,255,.5);font-size:20px;width:24px;height:24px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;margin-left:-4px}',
      '.awb-close:hover{background:rgba(255,255,255,.08);color:#fff}',
      '@media(max-width:640px){#alexia-welcome{top:auto;bottom:24px;left:12px;right:12px;transform:none}#alexia-welcome .awb-pill{width:100%;justify-content:center}.awb-label{font-size:11px;white-space:normal;text-align:center;flex:1}.awb-claim{padding:7px 12px;font-size:10px}}'
    ].join('');
    document.head.appendChild(css);
    document.body.appendChild(root);

    // Wire up interactions
    var claimBtn = root.querySelector('.awb-claim');
    var closeBtn = root.querySelector('.awb-close');
    if (claimBtn){
      claimBtn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        try { localStorage.setItem(LS_USER, '1'); } catch(e){}
        // Confetti-ish flash
        root.style.animation = 'awbClaim .7s ease-out forwards';
        var flash = document.createElement('style');
        flash.textContent = '@keyframes awbClaim{0%{transform:translate(-50%,0) scale(1);opacity:1}40%{transform:translate(-50%,-6px) scale(1.06);opacity:1}100%{transform:translate(-50%,-20px) scale(.92);opacity:0}}';
        document.head.appendChild(flash);
        if (window.AlexiaTokens && window.AlexiaTokens.toast){
          window.AlexiaTokens.toast('+200 tokens', '🎉 Welcome bonus claimed!');
        }
        setTimeout(function(){
          root.remove();
          // Redirect to account page to show progress
          setTimeout(function(){ location.href = '/account.html'; }, 600);
        }, 700);
      });
    }
    if (closeBtn){
      closeBtn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        try { localStorage.setItem(LS_KEY, Date.now() + 24*60*60*1000); } catch(e){}
        root.style.animation = 'awbDismiss .4s ease-out forwards';
        var fs = document.createElement('style');
        fs.textContent = '@keyframes awbDismiss{to{transform:translate(-50%,-40px);opacity:0}}';
        document.head.appendChild(fs);
        setTimeout(function(){ root.remove(); }, 400);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else setTimeout(mount, 200);
})();
