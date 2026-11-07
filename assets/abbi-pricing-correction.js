(function(){
  function apply(){
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var n;while(n=walker.nextNode()){n.nodeValue=n.nodeValue.replaceAll('Up to 4 min: 1 coin/min · over 4 min: 2 coins/min','1 coin per started minute').replaceAll('144 coins = US$72.00','118 coins = US$59.00').replaceAll('Videos up to 4 minutes cost 1 coin per minute; longer videos cost 2 coins per minute.','Each individual video costs 1 coin per started minute.')}
    document.querySelectorAll('#catalog .card').forEach(function(card){var d=Number(card.dataset.duration);if(!d)return;var c=Math.max(1,Math.ceil(d/60)),p=card.querySelectorAll('.meta')[1]?.querySelector('span');if(p)p.textContent='🔒 '+c+' coin'+(c===1?'':'s');var b=card.querySelector('button');if(b&&!/Play|Available/.test(b.textContent))b.textContent='Unlock · '+c+' coin'+(c===1?'':'s')});
  }
  setTimeout(apply,200);setTimeout(apply,1200);var tries=0,tm=setInterval(function(){apply();if(++tries>20)clearInterval(tm)},500);
})();
