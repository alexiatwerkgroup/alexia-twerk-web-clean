(function(){
  'use strict';
  var grid=document.getElementById('na-grid');
  var input=document.getElementById('na-search'),sort=document.getElementById('na-sort');
  var count=document.getElementById('na-count'),empty=document.getElementById('na-empty');
  var more=document.getElementById('na-more'),pageSize=24,page=1,category='all',query='',view='youtube',records=[];
  function number(v){return new Intl.NumberFormat().format(Number(v)||0)}
  function animateStat(el,to){
    var from=parseInt((el.textContent||'0').replace(/[^0-9]/g,''),10)||0;
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=number(to);return}
    if(from===to){el.textContent=number(to);return}
    var start=null,dur=1100;
    function step(ts){
      if(start===null)start=ts;
      var p=Math.min(1,(ts-start)/dur);
      var eased=1-Math.pow(1-p,3);
      el.textContent=number(Math.round(from+(to-from)*eased));
      if(p<1)requestAnimationFrame(step);else el.textContent=number(to)
    }
    requestAnimationFrame(step)
  }
  function paintStats(data){
    [['folders',data.folderCount],['videos',data.videoFiles],['listed',data.publicRecords],['folders-with-videos',data.foldersWithVideos]].forEach(function(pair){document.querySelectorAll('[data-na-stat="'+pair[0]+'"]').forEach(function(el){animateStat(el,Number(pair[1])||0)})});
    document.querySelectorAll('[data-cat-count]').forEach(function(el){var key=el.dataset.catCount;var total=key==='all'?data.records.length:data.records.filter(function(r){return Array.isArray(r.categories)&&r.categories.indexOf(key)>=0}).length;el.textContent=number(total)});
  }
  var inventory=fetch('/novinhas/catalog.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('inventory unavailable');return r.json()});
  if(!grid){inventory.then(paintStats).catch(function(){});return;}
  function match(r){
    var hay=(r.name||'').toLocaleLowerCase();
    return (!query||hay.indexOf(query)>=0)&& (category==='all'||(Array.isArray(r.categories)&&r.categories.indexOf(category)>=0));
  }
  function card(r){
    var a=document.createElement('article');a.className='na-folder';
    var chip=document.createElement('span');chip.className='na-chip';chip.textContent=(r.categories&&r.categories.length)?r.categories.join(' · '):'Archive entry';a.appendChild(chip);
    var h=document.createElement('h3');h.textContent=r.name||'Untitled entry';a.appendChild(h);
    var p=document.createElement('p');p.textContent=(r.videoRange||'Folder indexed')+' · inventory';a.appendChild(p);
    return a;
  }
  function render(){
    var rows=records.filter(match);
    if(sort&&sort.value==='az')rows.sort(function(a,b){return (a.name||'').localeCompare(b.name||'')});
    count.textContent=number(rows.length)+' folder records';
    grid.replaceChildren();rows.slice(0,page*pageSize).forEach(function(r){grid.appendChild(card(r))});
    more.hidden=rows.length<=page*pageSize;
    empty.hidden=rows.length>0;
    if(rows.length===0){
      empty.textContent=query||category!=='all'?'No folder records match this search.':'No folder records are available in the index yet.';
    }
  }
  input.addEventListener('input',function(){query=input.value.trim().toLocaleLowerCase();page=1;render()});
  sort.addEventListener('change',render);
  document.querySelectorAll('[data-category]').forEach(function(b){b.addEventListener('click',function(){category=b.dataset.category;page=1;document.querySelectorAll('[data-category]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});render()})});
  document.querySelectorAll('[data-view-button]').forEach(function(b){b.addEventListener('click',function(){view=b.dataset.viewButton;grid.dataset.view=view;document.querySelectorAll('[data-view-button]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))})})});
  more.addEventListener('click',function(){page++;render()});
  inventory.then(function(data){paintStats(data);records=Array.isArray(data.records)?data.records.filter(function(r){return r&&r.publicListing===true}):[];render()}).catch(function(){count.textContent='Index temporarily unavailable';empty.hidden=false;empty.textContent='The inventory summary could not be loaded. Please try again later.'});
})();
