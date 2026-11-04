(function(){
  'use strict';
  var model=document.body&&document.body.dataset.model;
  if(!model)return;
  document.querySelectorAll('.c.long').forEach(function(card){
    var cb=card.querySelector('.cb');
    if(!cb||cb.querySelector('.universal-meta'))return;
    var duration=Number(card.dataset.duration), width=card.dataset.width, height=card.dataset.height;
    var label=Number.isFinite(duration)&&duration>0 ? Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0') : '';
    var meta=document.createElement('div');
    meta.className='meta universal-meta';
    if(label){var t=document.createElement('i');t.textContent='⏱ '+label;meta.appendChild(t)}
    if(width&&height){var q=document.createElement('i');q.textContent='▱ '+width+'×'+height;meta.appendChild(q)}
    var d=document.createElement('i');d.textContent='⬇ Download';meta.appendChild(d);
    var price=cb.querySelector('p');
    if(price&&label&&!price.textContent.includes(label))price.textContent=price.textContent.trim()+' · '+label;
    var full=cb.querySelector('.full');
    if(full&&full.textContent.toLowerCase().indexOf('watch')===-1)full.textContent='▶ Watch & download · Original resolution';
    if(full)cb.insertBefore(meta,full);
  });
})();
