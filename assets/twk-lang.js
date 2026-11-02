/* Language picker: English (default), Español, Português (BR), Русский, 한국어.
   Translates the whole page with Google Translate and remembers the choice. */
(function () {
  if (window.__twkLang) return; window.__twkLang = 1;
  var L = [['en', 'English', 'EN'], ['es', 'Español', 'ES'], ['pt', 'Português (Brasil)', 'PT'], ['ru', 'Русский', 'RU'], ['ko', '한국어', 'KO']];
  var K = 'twk-lang';
  function get() { try { return localStorage.getItem(K) || 'en'; } catch (e) { return 'en'; } }
  function ck(lang) {
    var host = location.hostname, v = lang === 'en' ? '' : '/en/' + lang, exp = lang === 'en' ? ';expires=Thu, 01 Jan 1970 00:00:00 GMT' : ';max-age=31536000';
    document.cookie = 'googtrans=' + v + ';path=/' + exp;
    if (host.indexOf('.') > 0) document.cookie = 'googtrans=' + v + ';path=/;domain=.' + host.replace(/^www\./, '') + exp;
  }
  function loadGT() {
    if (window.__gtLoaded) return; window.__gtLoaded = 1;
    var d = document.createElement('div'); d.id = 'twk_gt'; d.style.display = 'none'; document.body.appendChild(d);
    window.twkGT = function () { try { new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'es,pt,ru,ko', autoDisplay: false }, 'twk_gt'); } catch (e) {} };
    var s = document.createElement('script'); s.src = 'https://translate.google.com/translate_a/element.js?cb=twkGT'; s.async = true; document.head.appendChild(s);
  }
  function css() {
    var s = document.createElement('style');
    s.textContent = '.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame{display:none!important}body{top:0!important;position:static!important}.goog-text-highlight{background:none!important;box-shadow:none!important}' +
      '.twk-lang{position:relative;margin-left:6px}.twk-lang>button{display:flex;align-items:center;gap:7px;height:42px;padding:0 12px;border-radius:12px;border:2px solid #3a3a44;background:transparent;color:#d8d8e2;cursor:pointer;font:700 12px "JetBrains Mono",monospace;letter-spacing:.12em}.twk-lang>button:hover{border-color:var(--ac,#ff8f00);color:var(--ac,#ff8f00)}.twk-lang svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}' +
      '.twk-lang ul{position:absolute;right:0;top:52px;list-style:none;margin:0;padding:8px;min-width:210px;background:#0a0a0d;border:2px solid var(--ac,#ff8f00);border-radius:16px;box-shadow:0 20px 60px #000;display:none;z-index:10000}.twk-lang.o ul{display:block}.twk-lang li button{display:flex;justify-content:space-between;width:100%;padding:12px 14px;border:0;border-radius:10px;background:none;color:#fff;cursor:pointer;font:600 14px Inter,sans-serif;text-align:left}.twk-lang li button:hover{background:#17120a;color:var(--ac,#ff8f00)}.twk-lang li button.on{color:var(--ac,#ff8f00)}.twk-lang li small{font:700 11px "JetBrains Mono",monospace;opacity:.6}' +
      '@media(max-width:900px){.twk-lang>button span{display:none}.twk-lang{margin-left:auto}.twk-lang+.twk-coin{margin-left:8px}}';
    document.head.appendChild(s);
  }
  function pick(l) { try { localStorage.setItem(K, l); } catch (e) {} ck(l); location.reload(); }
  function mount() {
    var w = document.querySelector('.tn2-w'); if (!w || w.querySelector('.twk-lang')) return;
    css();
    var cur = get(), c = L.filter(function (x) { return x[0] === cur; })[0] || L[0];
    var el = document.createElement('div'); el.className = 'twk-lang'; el.setAttribute('translate', 'no'); el.classList.add('notranslate');
    el.innerHTML = '<button type="button" aria-label="Language" aria-haspopup="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg><span>' + c[2] + '</span></button><ul>' + L.map(function (x) { return '<li><button type="button" data-l="' + x[0] + '"' + (x[0] === cur ? ' class="on"' : '') + '>' + x[1] + '<small>' + x[2] + '</small></button></li>'; }).join('') + '</ul>';
    var anchor = w.querySelector('.twk-coin') || w.querySelector('details');
    if (anchor) w.insertBefore(el, anchor); else w.appendChild(el);
    el.querySelector('button').onclick = function (e) { e.stopPropagation(); el.classList.toggle('o'); };
    el.querySelector('ul').onclick = function (e) { var b = e.target.closest('button[data-l]'); if (b) pick(b.dataset.l); };
    document.addEventListener('click', function () { el.classList.remove('o'); });
    document.querySelectorAll('.tn2-logo').forEach(function (a) { a.setAttribute('translate', 'no'); a.classList.add('notranslate'); });
  }
  var cur = get(); if (cur !== 'en') { ck(cur); } else { ck('en'); }
  function boot() { mount(); if (get() !== 'en') loadGT(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(mount, 900); setTimeout(mount, 2200);
})();
