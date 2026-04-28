/* thumb-fallback.js v1 - YouTube placeholder fallback */
(function(){
  var FB = ["hqdefault","mqdefault","default"];
  var DEAD = "/assets/thumb-unavailable.svg";
  function isPh(i){return i.complete && i.naturalWidth===120 && i.naturalHeight===90;}
  function getV(s){var m=s.match(/i\.ytimg\.com\/vi\/([^\/]+)\/(\w+)\.jpg/);return m?{id:m[1],v:m[2]}:null;}
  function next(img){var o=getV(img.currentSrc||img.src);if(!o){dead(img);return;}var i=FB.indexOf(o.v);if(i===-1||i===FB.length-1){dead(img);return;}img.src="https://i.ytimg.com/vi/"+o.id+"/"+FB[i+1]+".jpg";}
  function dead(img){img.removeAttribute("srcset");img.src=DEAD;img.alt="video unavailable";var c=img.closest("article,.card,.video-card,.rh-thumb,.video-item,a");if(c)c.classList.add("twk-thumb-dead");}
  function check(img){if(!img.src||img.src.indexOf("i.ytimg.com")===-1)return;if(img.complete){if(isPh(img))next(img);}else{img.addEventListener("load",function once(){img.removeEventListener("load",once);if(isPh(img))next(img);});img.addEventListener("error",function(){next(img);});}}
  function scan(){document.querySelectorAll('img[src*="i.ytimg.com"]').forEach(check);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan);else scan();
  new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.tagName==="IMG")check(n);else if(n.querySelectorAll)n.querySelectorAll('img[src*="i.ytimg.com"]').forEach(check);});});}).observe(document.documentElement,{childList:true,subtree:true});
})();
