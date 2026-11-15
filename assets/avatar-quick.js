/* Cambio rapido de avatar para /account: elegir imagen -> recorte cuadrado 240px -> /api/avatar/upload (actualiza el perfil). */
(function () {
  'use strict';
  function tok() { try { return (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token || ''; } catch (e) { return ''; } }
  function hd(extra) { var h = extra || {}, t = tok(); if (t) h.Authorization = 'Bearer ' + t; return h; }
  function crop(file) {
    return new Promise(function (ok, no) {
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || '')) return no(new Error('Usa JPG, PNG, WEBP o GIF.'));
      if (file.size > 10 * 1024 * 1024) return no(new Error('La imagen pesa mas de 10MB.'));
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = c.height = 240; var x = c.getContext('2d'), s = Math.min(im.width, im.height);
        x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 240, 240); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .85));
      };
      im.onerror = function () { URL.revokeObjectURL(u); no(new Error('No se pudo leer la imagen.')); };
      im.src = u;
    });
  }
  function build(head) {
    var box = document.createElement('div'); box.id = 'twk-av-quick';
    box.innerHTML = '<style>#twk-av-quick{display:flex;align-items:center;gap:16px;margin:0 0 18px}#twk-av-quick .ring{position:relative;width:84px;height:84px;border-radius:50%;padding:3px;flex:none;background:conic-gradient(from 140deg,#ff2d87,#f0b90b,#9d4edd,#ff2d87);box-shadow:0 8px 28px rgba(255,45,135,.3)}#twk-av-quick .pic{width:100%;height:100%;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:linear-gradient(140deg,#ff2d87,#9d4edd);color:#fff;font:900 30px Anton,Inter,sans-serif}#twk-av-quick .pic img{width:100%;height:100%;object-fit:cover;display:block}#twk-av-quick label.cam{position:absolute;right:-4px;bottom:-4px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#2b1a00;background:linear-gradient(135deg,#fff0a8,#f0b90b 55%,#a87a08);border:2px solid #0b0b10;box-shadow:0 3px 12px rgba(0,0,0,.55)}#twk-av-quick label.cam:hover{filter:brightness(1.1)}#twk-av-quick .tx b{display:block;font:800 14px Inter,sans-serif;color:#fff}#twk-av-quick .tx span{font:600 12px Inter,sans-serif;color:#a9a9b6}#twk-av-quick input{display:none}</style><div class="ring"><div class="pic" id="twk-av-pic">?</div><label class="cam" for="twk-av-file" title="Cambiar foto" aria-label="Cambiar foto"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg></label><input id="twk-av-file" type="file" accept="image/*"></div><div class="tx"><b>Tu foto de perfil</b><span id="twk-av-st">Toca la camara para cambiarla.</span></div>';
    head.parentNode.insertBefore(box, head);
    var pic = box.querySelector('#twk-av-pic'), st = box.querySelector('#twk-av-st'), f = box.querySelector('#twk-av-file');
    function show(url, name) { if (url) { pic.innerHTML = ''; var i = new Image(); i.alt = 'Avatar'; i.src = url; pic.appendChild(i); } else pic.textContent = (name || '?').trim().charAt(0).toUpperCase() || '?'; }
    fetch('/api/profile/me', { credentials: 'include', headers: hd(), cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var p = d && d.ok && d.profile; if (p) show(p.avatar_url, p.username); else st.textContent = 'Inicia sesion para cambiar tu foto.';
    }).catch(function () {});
    f.addEventListener('change', function () {
      var file = f.files && f.files[0]; if (!file) return;
      if (!tok()) { st.textContent = 'Inicia sesion para cambiar tu foto.'; f.value = ''; return; }
      st.textContent = 'Subiendo foto...';
      crop(file).then(function (data) {
        return fetch('/api/avatar/upload', { method: 'POST', credentials: 'include', headers: hd({ 'Content-Type': 'application/json' }), body: JSON.stringify({ data: data }) }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.ok) throw new Error('No se pudo guardar. Proba de nuevo.');
          show(j.url || data); st.textContent = 'Foto guardada.';
          try { sessionStorage.removeItem('twk_profile_cache_v1'); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('twk-avatar-changed', { detail: { url: j.url } })); } catch (e) {}
        });
      }).catch(function (e) { st.textContent = (e && e.message) || 'Error al subir la foto.'; }).then(function () { f.value = ''; });
    });
  }
  function go() { var h = document.querySelector('.ac__head'); if (h && !document.getElementById('twk-av-quick')) build(h); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
