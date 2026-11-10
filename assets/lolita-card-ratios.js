(function(){
  function load(video){
    var box=video.closest('.v');
    function apply(){
      if(box&&video.videoWidth&&video.videoHeight){
        box.style.aspectRatio=video.videoWidth+'/'+video.videoHeight;
        box.classList.add('ratio-ready');
      }
    }
    video.preload='metadata';
    video.addEventListener('loadedmetadata',apply,{once:true});
    if(video.readyState>=1)apply();
    try{if(video.dataset.src&&!video.src)video.src=video.dataset.src;video.load()}catch(e){}
  }
  function fit(){
    var videos=document.querySelectorAll('body[data-model="lolita"] .c .v video');
    if(!('IntersectionObserver' in window)){
      // old browser fallback: load everything like before
      videos.forEach(load);
      return;
    }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          load(entry.target);
          io.unobserve(entry.target);
        }
      });
    },{rootMargin:'600px 0px'});
    videos.forEach(function(video){ io.observe(video); });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fit);else fit();
})();
