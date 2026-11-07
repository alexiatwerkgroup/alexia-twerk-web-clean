(function(){
  'use strict';
  var model=document.body&&document.body.dataset.model;
  if(!model&&!document.querySelector('.card.long'))return;
  document.querySelectorAll('.c.long,.card.long').forEach(function(card){
    var cb=card.querySelector('.cb,.card-body');
    if(!cb)return;
    if(card.classList.contains('card')){
      if(card.querySelector('.catalog-information'))return;
      var panel=document.createElement('aside');panel.className='catalog-information';panel.setAttribute('role','note');
      var description=card.dataset.description||'';
      if(description){var copy=document.createElement('p');copy.className='catalog-description';copy.textContent=description;panel.appendChild(copy)}
      var info=document.createElement('button');info.type='button';info.className='catalog-info-toggle';info.textContent='i';info.setAttribute('aria-label','Video details');info.setAttribute('aria-expanded','false');
      info.onclick=function(e){e.preventDefault();e.stopPropagation();var opened=card.classList.toggle('details-open');info.setAttribute('aria-expanded',String(opened))};
      var seconds=Number(card.dataset.duration),facts=document.createElement('dl');
      [['Duration',Number.isFinite(seconds)&&seconds>0?Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'):''],['Resolution',card.dataset.width+' × '+card.dataset.height]].forEach(function(row){var dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=row[0];dd.textContent=row[1];facts.append(dt,dd)});
      panel.append(facts);var box=card.querySelector('.cover');box.append(panel,info);return;
    }
    if(cb.querySelector('.universal-meta'))return;
    var duration=Number(card.dataset.duration),width=card.dataset.width,height=card.dataset.height;
    var label=Number.isFinite(duration)&&duration>0?Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0'):'';
    var meta=document.createElement('div');meta.className='meta universal-meta';
    if(label){var t=document.createElement('i');t.textContent='⏱ '+label;meta.appendChild(t)}
    if(width&&height){var q=document.createElement('i');q.textContent='▱ '+width+'×'+height;meta.appendChild(q)}
    var d=document.createElement('i');d.textContent='⬇ Download';meta.appendChild(d);
    var price=cb.querySelector('p');if(price&&/or in the full/i.test(price.textContent))price.textContent=price.textContent.split(/\s+or in the full/i)[0].trim();
    if(price&&label&&!price.textContent.includes(label))price.textContent=price.textContent.trim()+' · '+label;
    var full=cb.querySelector('.full');if(full)full.textContent='▶ Watch & download · Original resolution';if(full)cb.insertBefore(meta,full);
    var votes=cb.querySelector('.vt');if(votes)votes.hidden=true;
  });
})();