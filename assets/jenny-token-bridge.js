(function(){
  function add(){
    if(document.getElementById('token-collection-bridge')||!document.getElementById('pricing'))return;
    var s=document.createElement('section');s.id='token-collection-bridge';s.className='token-bridge';s.innerHTML='<div class="w"><div class="kick mono">/ free token collection</div><h2>Start with Jenny’s <em>free videos.</em></h2><p class="lead">Earn 500 tokens on Twerkhub and unlock the free collection. Explicit videos below use coins or the Hot Pack.</p><a class="btn o" href="/jenny/#catalog">Browse token videos →</a></div>';
    document.getElementById('pricing').before(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
