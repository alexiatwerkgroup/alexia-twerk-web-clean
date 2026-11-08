/* Shared lazy preview player and 10-second clock for all model catalogs. */
(function(){
  'use strict';
  var initialized=new WeakSet();
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var video=entry.target;
      if(entry.isIntersecting&&!video.getAttribute('src'))video.src=video.dataset.src;
      if(!entry.isIntersecting&&!video.controls){
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    });
  },{rootMargin:'300px'});

  function init(root){
    (root||document).querySelectorAll('.c .v video[data-src],.card video[data-src]').forEach(function(video){
      if(initialized.has(video))return;
      var card=video.closest('.c,.card'),box=video.closest('.v,.cover');
      if(!card||!box)return;
      initialized.add(video);
      if(!(Number(card.dataset.duration)>0)){
        var tag=card.querySelector('.tag'),match=tag&&/^(\d{1,2}):([0-5]\d)$/.exec(tag.textContent.trim());
        if(match)card.dataset.duration=String(Number(match[1])*60+Number(match[2]));
      }
      var clock=document.createElement('span');
      clock.className='preview-clock notranslate';
      clock.setAttribute('translate','no');
      clock.setAttribute('aria-label','Preview countdown');
      clock.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><circle class="clock-track" cx="10" cy="10" r="7"/><circle class="clock-progress" cx="10" cy="10" r="7"/></svg><span>00:10</span>';
      box.appendChild(clock);
      var digits=clock.querySelector('span'),duration=document.createElement('span');
      duration.className='video-duration notranslate';
      duration.setAttribute('translate','no');
      var seconds=Number(card.dataset.duration);
      duration.textContent=Number.isFinite(seconds)&&seconds>0?Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'):'';
      duration.hidden=!duration.textContent;
      box.appendChild(duration);
      var price=card.querySelector('.cb > p');
      var hasDuration=[].some.call(card.querySelectorAll('.meta'),function(meta){return duration.textContent&&meta.textContent.indexOf(duration.textContent)>=0});
      if(price&&duration.textContent&&!hasDuration&&!price.querySelector('.full-duration-inline')){
        var inlineTime=document.createElement('span');
        inlineTime.className='full-duration-inline notranslate';
        inlineTime.setAttribute('translate','no');
        inlineTime.textContent=' · '+duration.textContent;
        price.appendChild(inlineTime);
      }
      video.loop=false;
      function paint(){
        clock.hidden=video.controls;
        duration.hidden=video.controls||!duration.textContent;
        if(video.controls)return;
        var total=Number.isFinite(video.duration)?Math.min(10,Math.max(1,video.duration*0.1)):Math.min(10,Math.max(1,Number(card.dataset.duration)*0.1));
        var left=Math.max(0,Math.ceil(total-video.currentTime));
        digits.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
        clock.style.setProperty('--clock-offset',String(44*(1-left/total)));
        if(video.currentTime>=total){video.pause();digits.textContent='00:00'}
      }
      function start(){
        if(video.controls)return;
        if(!video.getAttribute('src'))video.src=video.dataset.src;
        video.muted=true;
        video.play().catch(function(){video.muted=true;video.play().catch(function(){})});
      }
      card.addEventListener('pointerenter',function(event){if(event.pointerType==='mouse')start()});
      card.addEventListener('pointerleave',function(event){
        if(event.pointerType!=='mouse'||video.controls)return;
        video.pause();video.muted=true;video.removeAttribute('src');video.load();
      });
      box.addEventListener('click',function(){if(video.controls)return;if(video.paused)start();else video.pause()});
      ['timeupdate','loadedmetadata','ended','play'].forEach(function(name){video.addEventListener(name,paint)});
      video.addEventListener('emptied',function(){
        if(!video.controls){digits.textContent='00:10';clock.hidden=false;clock.style.setProperty('--clock-offset','0')}
      });
      new MutationObserver(paint).observe(video,{attributes:true,attributeFilter:['controls']});
      io.observe(video);
    });
  }

  window.CatalogPreviewClock={init:init};
  init(document);
})();
