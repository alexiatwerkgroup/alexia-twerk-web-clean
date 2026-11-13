/* Checkout universal de Twerkhub para las paginas de modelos: lleva a /paymentmethods/ (PayPal, Binance, tarjeta) con el producto elegido.
   Uso: <a class="twk-btn twk-btn--block" href="/paymentmethods/" data-checkout="coins|pack" data-model="jenny" data-label="..." data-amt="18.25">. TWK_CHECKOUT.go({...}) para usarlo desde codigo. */
(function () {
  function url(o) {
    var q = new URLSearchParams();
    if (o.model) q.set('model', o.model); if (o.item) q.set('item', o.item); if (o.label) q.set('label', o.label); if (o.amt) q.set('amt', o.amt);
    return '/paymentmethods/?' + q.toString();
  }
  function go(o) { location.href = url(o); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-checkout]'); if (!b) return;
    e.preventDefault(); go({ item: b.dataset.checkout, model: b.dataset.model, label: b.dataset.label, amt: b.dataset.amt });
  });
  window.TWK_CHECKOUT = { go: go, url: url };
})();
