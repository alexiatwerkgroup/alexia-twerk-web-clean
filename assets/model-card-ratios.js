(function(){
  function fit(){
    document.querySelectorAll('body[data-model] .c .v video, body .video-card .video-cover video').forEach(function(video){
      var box=video.closest('.v'); if(!box)return;
      function apply(){if(video.videoWidth&&video.videoHeight)box.style.aspectRatio=video.videoWidth+'/'+video.videoHeight}
      video.preload='metadata'; video.addEventListener('loadedmetadata',apply,{once:true});
      if(video.readyState>=1)apply();
      try{if(video.dataset.src&&!video.src)video.src=video.dataset.src;video.load()}catch(e){}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fit);else fit();
})();
