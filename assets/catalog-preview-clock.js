/* Shared lazy 10-second preview player for all model catalogs. */
(function(){
  'use strict';
  var initialized=new WeakSet();
  var states=new WeakMap();
  var PREVIEW_SECONDS=10;
  var io='IntersectionObserver' in window?new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var state=states.get(entry.target);
      if(!state)return;
      if(entry.isIntersecting&&entry.intersectionRatio>=0.15){
        state.visible=true;
        start(entry.target,state,false);
      }else{
        state.visible=false;
        if(!entry.target.controls)reset(entry.target,state,true);
      }
    });
  },{threshold:[0,0.15]}):null;

  function reset(video,state,unload){
    video.pause();
    state.started=false;
    state.finished=false;
    try{video.currentTime=0}catch{}
    if(unload){video.removeAttribute('src');video.load()}
    state.clock.hidden=false;
    state.digits.textContent='00:10';
    state.clock.style.setProperty('--clock-offset','0');
  }

  function durationLimit(video,state){
    var full=Number(state.durationSeconds);
    if(!Number.isFinite(full)||full<=0)full=video.duration;
    if(!Number.isFinite(full)||full<=0)return PREVIEW_SECONDS;
    return full>PREVIEW_SECONDS?PREVIEW_SECONDS:Math.max(1,full*0.1);
  }

  function paint(video,state){
    state.clock.hidden=video.controls;
    state.duration.hidden=video.controls||!state.duration.textContent;
    if(video.controls)return;
    var total=durationLimit(video,state);
    var left=Math.max(0,Math.ceil(total-video.currentTime));
    state.digits.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    state.clock.style.setProperty('--clock-offset',String(44*(1-left/total)));
    if(video.currentTime>=total&&!state.finished){
      state.finished=true;
      video.pause();
      state.digits.textContent='00:00';
      state.clock.style.setProperty('--clock-offset','44');
    }
  }

  function start(video,state,replay){
    if(video.controls||!video.isConnected)return;
    if(state.finished){
      if(!replay)return;
      reset(video,state,false);
    }
    if(!video.getAttribute('src'))video.src=video.dataset.src;
    video.muted=true;
    state.started=true;
    var attempt=video.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(function(){state.started=false});
  }

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
      clock.setAttribute('aria-label','10-second preview countdown');
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
      video.muted=true;
      video.playsInline=true;
      video.setAttribute('muted','');
      video.setAttribute('playsinline','');
      var state={clock:clock,digits:digits,duration:duration,durationSeconds:Number(card.dataset.duration),visible:false,started:false,finished:false};
      states.set(video,state);
      card.addEventListener('pointerenter',function(event){if(event.pointerType==='mouse')start(video,state,true)});
      card.addEventListener('focusin',function(){start(video,state,true)});
      video.addEventListener('canplay',function(){if(state.visible&&video.paused&&!state.finished)start(video,state,false)});
      ['timeupdate','loadedmetadata','durationchange','play'].forEach(function(name){video.addEventListener(name,function(){paint(video,state)})});
      video.addEventListener('ended',function(){state.finished=true;video.pause();digits.textContent='00:00';clock.style.setProperty('--clock-offset','44')});
      video.addEventListener('error',function(){state.started=false;paint(video,state)});
      video.addEventListener('emptied',function(){if(!video.controls){digits.textContent='00:10';clock.hidden=false;clock.style.setProperty('--clock-offset','0')}});
      box.addEventListener('click',function(event){
        if(video.controls)return;
        event.preventDefault();
        if(video.paused)start(video,state,true);
        else video.pause();
      });
      new MutationObserver(function(){paint(video,state)}).observe(video,{attributes:true,attributeFilter:['controls']});
      if(io)io.observe(video);
      else{state.visible=true;start(video,state,false)}
    });
  }

  window.CatalogPreviewClock={init:init};
  init(document);
})();
