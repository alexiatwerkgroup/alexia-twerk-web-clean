(function(){
  if(window.__twkPillKiller) return; window.__twkPillKiller = true;
  var BAD_TEXT = ['paid content unlocks','paid content unlock','unlock paid content','premium unlock','unlock premium'];
  function isBad(el){
    if(!el || el.nodeType !== 1) return false;
    var t = (el.innerText || el.textContent || '').trim().toLowerCase();
    if(!t || t.length > 60) return false;
    for(var i=0;i<BAD_TEXT.length;i++){
      if(t.indexOf(BAD_TEXT[i]) !== -1){
        var s = getComputedStyle(el);
        var br = parseFloat(s.borderRadius) || 0;
        var w = el.offsetWidth || 0;
        if(br >= 14 || w < 280) return true;
      }
    }
    return false;
  }
  function sweep(root){
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll('a,button,div,span') : [];
    for(var i=0;i<nodes.length;i++){
      if(isBad(nodes[i])){ try{ nodes[i].remove(); }catch(e){ nodes[i].style.display='none'; } }
    }
  }
  function init(){
    sweep(document);
    var obs = new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var m = muts[i];
        if(m.addedNodes && m.addedNodes.length){
          for(var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            if(n.nodeType === 1){
              if(isBad(n)){ try{ n.remove(); }catch(e){ n.style.display='none'; } }
              else { sweep(n); }
            }
          }
        }
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
  setTimeout(function(){ sweep(document); }, 1500);
  setTimeout(function(){ sweep(document); }, 4000);
})();