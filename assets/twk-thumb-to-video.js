(function(){
  if(window.__twkThumbToVideo)return;window.__twkThumbToVideo=true;
  var classification=null,classReady=false;
  fetch('/assets/youtube-age-classification.json').then(function(r){return r.json();}).then(function(j){classification=j;classReady=true;}).catch(function(){});
  function isBlocked(vid){return classReady&&classification&&classification[vid]==='blocked';}

  function lockedHTML(vid){return '<div class="vd-player vd-locked" data-vid="'+vid+'" style="position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#fff;"><div><div style="font-size:64px;line-height:1;">&#128286;</div><div style="font-size:22px;font-weight:900;margin:12px 0 8px;letter-spacing:0.5px;">+18 LOCKED</div><a href="/membership/" style="background:linear-gradient(135deg,#ff1c8e,#aa3cff);color:#fff;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.5px;display:inline-block;margin-top:6px;">UNLOCK PREMIUM</a></div></div>';}

  // EXACT params como /playlist/ hero
  function iframeHTML(vid){
    return '<iframe data-vid="'+vid+'" src="https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&widget_referrer=https%3A%2F%2Falexiatwerkgroup.com&origin=https%3A%2F%2Falexiatwerkgroup.com" title="Twerkhub" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;"></iframe>'+
    // Cover sobre el logo de YT (esquina inferior derecha) - blindaje contra escape
    '<div style="position:absolute;bottom:8px;right:8px;width:100px;height:32px;background:#000;border-radius:4px;z-index:10;cursor:default;" onclick="event.preventDefault();event.stopPropagation();return false;"></div>'+
    // Cover sobre el title overlay (esquina superior) - bloquea "Watch on YouTube" link
    '<div style="position:absolute;top:0;left:0;right:0;height:50px;background:linear-gradient(180deg,rgba(0,0,0,0.8) 0%,rgba(0,0,0,0) 100%);z-index:9;pointer-events:auto;" onclick="event.preventDefault();event.stopPropagation();return false;"></div>';
  }

  function findContainer(el){var p=el;while(p&&p!==document.body){if(p.matches&&p.matches('a[data-vid],.vcard,.rk-item,.creator-card,[data-vid]')){return p;}p=p.parentElement;}return null;}
  function getVidFrom(el){if(el.dataset&&el.dataset.vid)return el.dataset.vid;var img=el.querySelector?el.querySelector('img[src*="ytimg.com"]'):null;if(img){var m=img.src.match(/ytimg\.com\/vi\/([\w-]{11})/);if(m)return m[1];}if(el.tagName==='IMG'&&el.src){var m2=el.src.match(/ytimg\.com\/vi\/([\w-]{11})/);if(m2)return m2[1];}return null;}

  function swapToVideo(card){
    if(card.dataset.twkPlayed)return;
    var vid=getVidFrom(card);if(!vid)return;
    card.dataset.twkPlayed='1';
    var imgs=card.querySelectorAll('img');
    if(imgs.length>0){
      var target=null;
      for(var i=0;i<imgs.length;i++){var rect=imgs[i].getBoundingClientRect();if(rect.width>80&&rect.height>80){target=imgs[i];break;}}
      if(target){
        var html=isBlocked(vid)?lockedHTML(vid):iframeHTML(vid);
        // Container CENTRADO max 900px (matchea /playlist/ hero)
        var wrap=document.createElement('div');
        wrap.className='twk-vid-wrap';
        wrap.style.cssText='position:relative;width:100%;max-width:900px;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:24px auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        wrap.innerHTML=html;
        target.parentNode.replaceChild(wrap,target);
      }
    }
  }

  function attachClickHandler(){document.addEventListener('click',function(e){var card=findContainer(e.target);if(!card)return;var vid=getVidFrom(card);if(!vid)return;if(card.dataset.twkPlayed)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();swapToVideo(card);},true);}

  function addPlayBadge(){document.querySelectorAll('a[data-vid],.vcard,.rk-item,.creator-card,[data-vid]').forEach(function(card){if(card.dataset.twkBadge)return;var vid=getVidFrom(card);if(!vid)return;card.dataset.twkBadge='1';card.style.cursor='pointer';var imgs=card.querySelectorAll('img');for(var i=0;i<imgs.length;i++){var rect=imgs[i].getBoundingClientRect();if(rect.width>80&&rect.height>80){var wrap=imgs[i].parentElement;if(wrap.querySelector('.twk-play-badge'))break;if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';var badge=document.createElement('div');badge.className='twk-play-badge';badge.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,28,142,0.9);display:flex;align-items:center;justify-content:center;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.5);z-index:5;';badge.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';wrap.appendChild(badge);break;}}});}

  function init(){attachClickHandler();addPlayBadge();}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
  setTimeout(addPlayBadge,1500);setTimeout(addPlayBadge,4000);
})();