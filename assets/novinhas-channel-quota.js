/* Novinhas: contador "25/X" en la portada del canal + popup VIP.
   Uso: <script src="/assets/novinhas-channel-quota.js" data-total="89" data-shown="25" data-target=".banner" defer></script>
   Si total <= shown no muestra nada. */
(function () {
  var s = document.currentScript; if (!s) return;
  var total = parseInt(s.dataset.total, 10), shown = parseInt(s.dataset.shown, 10) || 25;
  if (!(total > shown)) return;
  var href = s.dataset.href || '/account';
  var css = '.nq-b{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:8px 16px;border-radius:999px;border:1.5px solid #e8b84a;background:linear-gradient(180deg,#2a2208,#0d0b04);color:#ffd76a;font:800 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 0 14px #e8b84a33}.nq-b i{font-style:normal;color:#fff;font-weight:600;font-size:12px;opacity:.8}' +
    '.nq-o{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.78);padding:16px}.nq-p{width:min(320px,100%);padding:26px 22px;border-radius:18px;border:1.5px solid #e8b84a;background:linear-gradient(180deg,#2a2208,#0d0b04);text-align:center;color:#ddd;box-shadow:0 0 60px #e8b84a55;font-family:system-ui,sans-serif}' +
    '.nq-p small{color:#e8b84a;font:800 11px system-ui;letter-spacing:.14em}.nq-p b{display:block;font:900 44px system-ui;color:#ffd76a;margin:6px 0 2px}.nq-p p{margin:0 0 6px;font:600 14px/1.5 system-ui}' +
    '.nq-bar{height:8px;border-radius:8px;background:#2b2410;margin:14px 0 4px;overflow:hidden}.nq-bar div{height:100%;background:linear-gradient(90deg,#b8862a,#ffd76a)}' +
    '.nq-btn{display:block;margin-top:16px;padding:13px;border-radius:12px;border:1.5px solid #ffe08a;background:linear-gradient(180deg,#ffe08a,#c99a2e);color:#1a1200;font:900 13px system-ui;letter-spacing:.05em;text-decoration:none}.nq-x{margin-top:10px;color:#999;font:600 12px system-ui;cursor:pointer;background:none;border:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function mount() {
    var host = document.querySelector(s.dataset.target || '.banner'); if (!host || host.querySelector('.nq-b')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'nq-b';
    b.innerHTML = shown + '/' + total + ' <i>videos shown · tap</i>'; host.appendChild(b);
    b.addEventListener('click', function () {
      var o = document.createElement('div'); o.className = 'nq-o'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
      o.innerHTML = '<div class="nq-p"><small>VIP ACCESS</small><b>' + total + ' videos</b><p>This folder has ' + total + ' videos.<br>You\'re seeing the first ' + shown + '.</p>' +
        '<div class="nq-bar"><div style="width:' + Math.round(shown / total * 100) + '%"></div></div><p style="font-size:12px;color:#aaa">' + shown + ' of ' + total + ' unlocked</p>' +
        '<a class="nq-btn" href="' + href + '">UNLOCK ALL ' + total + ' WITH VIP</a><button type="button" class="nq-x">Maybe later</button></div>';
      o.addEventListener('click', function (e) { if (e.target === o || e.target.className === 'nq-x') o.remove(); });
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', k); } });
      document.body.appendChild(o);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
