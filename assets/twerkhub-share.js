/*!
 * TWERKHUB · Social Share Widget — 2026-04-24 · p2 (8 networks)
 * --------------------------------------------------------------
 * Auto-mounts a floating share bar on blog posts + playlist pages.
 * Uses the Web Share API where available (mobile), falls back to
 * individual channel links. X + Pinterest + WhatsApp + Telegram +
 * Reddit + Facebook + Threads + copy link. Zero HTML edits — JS
 * looks for known page containers and appends.
 *
 * Silent on pages without a semantic article or main element.
 * --------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__twerkhubShareInit) return;
  window.__twerkhubShareInit = true;

  // Opt-in page types — only mount on blog + long-form pages
  var path = location.pathname.toLowerCase();
  var isSharePage = /^\/blog\//.test(path) ||
                    /^\/about|privacy|terms|contact/.test(path) ||
                    /^\/playlist-/.test(path) ||
                    path === '/playlist/' ||
                    path === '/playlist/index.html';
  if (!isSharePage) return;

  // Wait for content
  function boot() {
    var anchor = document.querySelector('article.wrap, article, main, .twerkhub-pl-main, .wrap');
    if (!anchor) return;

    var url = encodeURIComponent(location.href);
    var title = encodeURIComponent(document.title);
    var desc = encodeURIComponent(
      (document.querySelector('meta[name="description"]') || {}).content || 'Twerkhub'
    );
    var thumb = encodeURIComponent(
      ((document.querySelector('meta[property="og:image"]') || {}).content || 'https://alexiatwerkgroup.com/logo-twerkhub.png')
    );

    // Mount styles
    var style = document.createElement('style');
    style.id = 'twerkhub-share-style';
    style.textContent = [
      '.twk-share-bar{',
      '  position: fixed; left: 24px; bottom: 24px; z-index: 9998;',
      '  display: flex; flex-direction: column; gap: 10px;',
      '  padding: 12px 10px;',
      '  border-radius: 999px;',
      '  background: rgba(10, 10, 16, 0.78);',
      '  backdrop-filter: blur(18px) saturate(1.4);',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.4);',
      '  border: 1px solid rgba(255, 255, 255, 0.1);',
      '  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.5);',
      '  opacity: 0; transform: translateY(20px);',
      '  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(.22,.9,.38,1);',
      '}',
      '.twk-share-bar.is-in { opacity: 1; transform: translateY(0); }',
      '@media (max-width: 720px) {',
      '  .twk-share-bar { flex-direction: row; left: 50%; transform: translateX(-50%) translateY(20px); bottom: 16px; }',
      '  .twk-share-bar.is-in { transform: translateX(-50%) translateY(0); }',
      '}',
      '.twk-share-btn{',
      '  width: 38px; height: 38px;',
      '  border-radius: 50%;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: rgba(255, 255, 255, 0.05);',
      '  border: 1px solid rgba(255, 255, 255, 0.08);',
      '  color: #f5f5fb;',
      '  font-size: 15px;',
      '  cursor: pointer;',
      '  transition: transform 0.25s cubic-bezier(.2,1.2,.3,1), background 0.25s, color 0.25s;',
      '  text-decoration: none;',
      '}',
      '.twk-share-btn:hover { transform: scale(1.12); background: linear-gradient(135deg, #ff2d87, #9d4edd); color: #fff; }',
      '.twk-share-btn.copy.is-copied { background: linear-gradient(135deg, #1ee08f, #16a36a); color: #031a11; }',
      '.twk-share-btn[data-net="x"]:hover { background: #000; color: #fff; }',
      '.twk-share-btn[data-net="pin"]:hover { background: #e60023; color: #fff; }',
      '.twk-share-btn[data-net="wa"]:hover { background: #25d366; color: #fff; }',
      '.twk-share-btn[data-net="tg"]:hover { background: #229ed9; color: #fff; }',
      '.twk-share-btn[data-net="rd"]:hover { background: #ff4500; color: #fff; }',
      '.twk-share-btn[data-net="fb"]:hover { background: #1877f2; color: #fff; }',
      '.twk-share-btn[data-net="th"]:hover { background: #000; color: #fff; }'
    ].join('');
    document.head.appendChild(style);

    // Build the bar
    var bar = document.createElement('div');
    bar.className = 'twk-share-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Share this page');
    bar.innerHTML = [
      '<a class="twk-share-btn" data-net="x" href="https://twitter.com/intent/tweet?url=' + url + '&text=' + title + '" target="_blank" rel="noopener nofollow" title="Share on X" aria-label="Share on X">𝕏</a>',
      '<a class="twk-share-btn" data-net="pin" href="https://pinterest.com/pin/create/button/?url=' + url + '&media=' + thumb + '&description=' + desc + '" target="_blank" rel="noopener nofollow" title="Pin it" aria-label="Pin on Pinterest">📌</a>',
      '<a class="twk-share-btn" data-net="wa" href="https://wa.me/?text=' + title + '%20' + url + '" target="_blank" rel="noopener nofollow" title="Share on WhatsApp" aria-label="Share on WhatsApp">💬</a>',
      '<a class="twk-share-btn" data-net="tg" href="https://t.me/share/url?url=' + url + '&text=' + title + '" target="_blank" rel="noopener nofollow" title="Share on Telegram" aria-label="Share on Telegram">✈</a>',
      '<a class="twk-share-btn" data-net="rd" href="https://reddit.com/submit?url=' + url + '&title=' + title + '" target="_blank" rel="noopener nofollow" title="Share on Reddit" aria-label="Share on Reddit">🅡</a>',
      '<a class="twk-share-btn" data-net="fb" href="https://www.facebook.com/sharer/sharer.php?u=' + url + '" target="_blank" rel="noopener nofollow" title="Share on Facebook" aria-label="Share on Facebook">f</a>',
      '<a class="twk-share-btn" data-net="th" href="https://www.threads.net/intent/post?text=' + title + '%20' + url + '" target="_blank" rel="noopener nofollow" title="Share on Threads" aria-label="Share on Threads">@</a>',
      '<button class="twk-share-btn copy" type="button" title="Copy link" aria-label="Copy link">🔗</button>'
    ].join('');
    document.body.appendChild(bar);

    // Copy-link action
    var copyBtn = bar.querySelector('.copy');
    copyBtn.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(location.href).then(function () {
          copyBtn.classList.add('is-copied');
          copyBtn.textContent = '✓';
          setTimeout(function () {
            copyBtn.classList.remove('is-copied');
            copyBtn.textContent = '🔗';
          }, 1800);
        });
      } catch (_) {
        window.prompt('Copy link', location.href);
      }
    });

    // Fade in after DOM settles
    requestAnimationFrame(function () {
      setTimeout(function () { bar.classList.add('is-in'); }, 400);
    });

    console.info('[twerkhub-share] mounted');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
