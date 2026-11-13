/* Pago universal con Binance de Twerkhub. Uso: TWK_PAY.binance('$49.99 USD') o cualquier elemento con data-twk-binance="monto".
   Datos de cobro: los mismos que /lolita/ (Pay ID verificado + USDT TRC20/ERC20). Comprobante + email por Discord. */
(function () {
  if (window.TWK_PAY) return;
  var ID = '1035936474', TRC = 'TBV4zdSqavgfiUzRBBsques8Pfpuxuuxbp', ERC = '0x6619adc77c05de260f41e0c22d278456a5b9636c';
  var REF = 'https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=es-LA&ref=GRO_28502_8Z3EW&utm_source=referral_entrance';
  var ES = /^es/i.test(((function () { try { return localStorage.getItem('twk-lang'); } catch (_) { return ''; } })() || navigator.language || ''));
  var T = ES ? { t: 'Pagar con Binance', a: 'Enviá', trust: 'Cuenta verificada de Binance', chk: 'Verificá que este nombre e ID aparezcan en Binance antes de confirmar. Si no coinciden, no pagues.', o1: 'Opción 1 · Binance Pay (sin comisión)', o2: 'Opción 2 · USDT en red Tron (TRC20, comisión baja)', o3: 'Opción 3 · USDT en red Ethereum (ERC20, comisión más alta)', tap: 'Tocá un recuadro para copiar. Enviá solo <b>USDT</b> y en la <b>red exacta</b> indicada. Otras redes o monedas se pierden.', after: 'Después mandá el comprobante y el email que usás en Twerkhub por', no: '¿Todavía no tenés Binance?', mk: 'Creá tu cuenta gratis', min: 'en 2 minutos.', fast: 'Acceso casi instantáneo · atención 24/7', copied: 'Copiado ✓', close: 'Cerrar', pid: 'ID de pago' }
    : { t: 'Pay with Binance', a: 'Send', trust: 'Verified Binance account', chk: 'Check this name and ID appear in Binance before you confirm. If they do not match, do not pay.', o1: 'Option 1 · Binance Pay (no fees)', o2: 'Option 2 · USDT on Tron network (TRC20, low fee)', o3: 'Option 3 · USDT on Ethereum network (ERC20, higher fee)', tap: 'Tap a box to copy. Send <b>USDT</b> only, on the <b>exact network</b> shown. Other networks or coins will be lost.', after: 'Then send the receipt and the email you use at Twerkhub on', no: "Don't have Binance yet?", mk: 'Create your free account', min: 'in 2 minutes.', fast: 'Almost instant access · 24/7 support', copied: 'Copied ✓', close: 'Close', pid: 'Pay ID' };
  (function(){if(!document.querySelector('link[href*="twk-ui.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='/assets/twk-ui.css?v=1';document.head.appendChild(l);}})();
  var css = '.tp-o{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(0,0,0,.8);padding:14px;overflow:auto;font-family:Inter,system-ui,sans-serif}.tp-p{position:relative;width:min(460px,100%);max-height:94vh;overflow:auto;padding:24px 22px;border-radius:20px;border:1.5px solid #e8b84a;background:linear-gradient(180deg,#1f1a0a,#0b0904);color:#ddd;box-shadow:0 0 60px #e8b84a44}' +
    '.tp-p h3{margin:0 0 4px;font:400 30px Anton,Impact,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:#fff}.tp-amt{display:inline-block;margin:6px 0 10px;padding:6px 14px;border-radius:999px;background:#e8b84a22;border:1px solid #e8b84a88;color:#ffd76a;font:800 15px system-ui}.tp-fast{display:flex;align-items:center;gap:8px;margin:0 0 12px;color:#9dffb4;font:700 12px system-ui}.tp-fast i{width:8px;height:8px;border-radius:50%;background:#35e07a;box-shadow:0 0 8px #35e07a}' +
    '.tp-trust{display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;background:#0008;border:1px solid #e8b84a55}.tp-trust img{width:52px;height:52px;border-radius:50%;object-fit:cover}.tp-trust b{display:block;color:#fff;font-size:14px;word-break:break-all}.tp-trust span{display:block;color:#bbb;font-size:12px}.tp-trust em{font-style:normal;color:#35e07a;font-weight:800;font-size:12px}' +
    '.tp-w{margin:8px 0 0;font:600 12px/1.5 system-ui;color:#aaa}.tp-w a{color:#ffd76a;font-weight:800}.tp-r{margin-top:12px}.tp-r small{display:block;color:#f1dfa6;font:700 11px system-ui;letter-spacing:.04em;margin-bottom:5px}.tp-r code{display:block;padding:11px 12px;border-radius:10px;border:1px dashed #e8b84a88;background:#000a;color:#fff;font:600 12px/1.4 ui-monospace,monospace;word-break:break-all;cursor:pointer}.tp-r code:hover{background:#e8b84a1c}' +
    '.tp-x{position:absolute;right:12px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:#ffffff14;color:#fff;font-size:20px;cursor:pointer}.tp-d{margin-top:16px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function code(v, lbl) { return '<div class="tp-r"><small>' + lbl + '</small><code data-c="' + v + '">' + (lbl === T.o1 ? T.pid + ': ' : '') + v + '</code></div>'; }
  function open(amount) {
    if (document.querySelector('.tp-o')) return;
    var o = document.createElement('div'); o.className = 'tp-o'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="tp-p"><button class="tp-x" aria-label="' + T.close + '">&times;</button><h3>' + T.t + '</h3>' + (amount ? '<div class="tp-amt">' + T.a + ' ' + amount + '</div>' : '') +
      '<div class="tp-fast"><i></i>' + T.fast + '</div>' +
      '<div class="tp-trust"><img src="/jenny/p/owner.jpg" alt="" width="52" height="52"><div><b>claudiopolakofirestarter</b><span>Binance ID: ' + ID + '</span><em>&#10004; ' + T.trust + '</em></div></div><p class="tp-w">' + T.chk + '</p>' +
      '<p class="tp-w">' + T.no + ' <a href="' + REF + '" target="_blank" rel="noopener sponsored">' + T.mk + '</a> ' + T.min + '</p>' +
      code(ID, T.o1) + code(TRC, T.o2) + code(ERC, T.o3) +
      '<p class="tp-w" style="margin-top:12px">' + T.tap + '</p><p class="tp-w">' + T.after + ' Discord.</p>' +
      '<a class="twk-btn twk-btn--block tp-d" href="/discord" target="_blank" rel="noopener">DISCORD</a></div>';
    o.addEventListener('click', function (e) {
      if (e.target === o || e.target.closest('.tp-x')) { o.remove(); return; }
      var c = e.target.closest('[data-c]'); if (c) { try { navigator.clipboard.writeText(c.dataset.c); var t = c.textContent; c.textContent = T.copied; setTimeout(function () { c.textContent = t; }, 1200); } catch (_) {} }
    });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(o);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-twk-binance]'); if (b) { e.preventDefault(); open(b.getAttribute('data-twk-binance')); } });
  window.TWK_PAY = { binance: open };
})();
