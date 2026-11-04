(function(){
  var end = new Date('2026-11-11T23:59:59-03:00').getTime();
  var el = document.getElementById('jenny-promo-countdown');
  if (!el) return;
  function tick(){
    var left=Math.max(0,end-Date.now());
    if(!left){el.textContent='OFERTA FINALIZADA';el.closest('.jenny-promo')?.classList.add('ended');return;}
    var s=Math.floor(left/1000),d=Math.floor(s/86400);s%=86400;var h=Math.floor(s/3600);s%=3600;var m=Math.floor(s/60);s%=60;
    el.textContent=String(d).padStart(2,'0')+' D  '+String(h).padStart(2,'0')+' H  '+String(m).padStart(2,'0')+' M  '+String(s).padStart(2,'0')+' S';
  }
  tick();setInterval(tick,1000);
})();
