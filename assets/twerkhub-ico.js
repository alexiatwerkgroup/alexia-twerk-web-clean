/* Icon set follows the skin: gold medallion on Casero/Custom, crystal on Neon/Feed. */
(function () {
  var b = document.body;
  function apply() { b.dataset.ico = (b.dataset.mode === 'neon' || b.dataset.mode === 'feed') ? 'glass' : 'gold'; }
  new MutationObserver(apply).observe(b, { attributes: true, attributeFilter: ['data-mode'] });
  apply();
})();
