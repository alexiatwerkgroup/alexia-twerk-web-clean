
(function(){
  try {
    const p = location.pathname;
    if (/\/home\.html$/.test(p) || /\/index\.html$/.test(p) && !/\/playlist\//.test(p)) {
      document.body.classList.add(p.endsWith('/home.html') ? 'home-page' : 'intro-page');
      if (p.endsWith('/home.html')) document.body.setAttribute('data-page','home');
      if (p.endsWith('/index.html') || p === '/' ) document.body.setAttribute('data-page','intro');
    }
    if (/top-100-twerk-videos\.html$/.test(p)) document.body.classList.add('top100-page');
    if (/best-twerk-dancers\.html$/.test(p)) document.body.classList.add('best-page');
    if (/alexia-video-packs\.html$/.test(p)) document.body.classList.add('packs-page');
    if (/community\.html$/.test(p)) document.body.classList.add('community-page');
    if (/profile\.html$/.test(p)) document.body.classList.add('profile-page');
    if (/\/playlist\//.test(p) || /\/twerk-dancer\//.test(p)) document.body.classList.add('video-page');

    if (document.body.classList.contains('video-page')) {
      ['particle-layer','noise-overlay','fx-layer','glow-orb'].forEach(cls => {
        document.querySelectorAll('.'+cls).forEach(el => el.remove());
      });
    }
  } catch(e) {}
})();
