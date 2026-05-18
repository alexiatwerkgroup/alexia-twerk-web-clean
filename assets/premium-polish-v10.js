
(function(){
  function norm(s){return String(s||'').replace(/\s+/g,' ').trim().toLowerCase();}
  function addEyebrow(target, text){
    if(!target || target.previousElementSibling?.classList?.contains('ax-eyebrow')) return;
    const el=document.createElement('div');
    el.className='ax-eyebrow';
    el.textContent=text;
    target.parentNode.insertBefore(el,target);
  }
  function replaceTextEverywhere(){
    const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const replacements = [
      [/Loading heatmap\.\.\./g,'Analyzing viewer patterns…'],
      [/Loading votes\.\.\./g,'Syncing interaction data…'],
      [/Quick answers/g,'Key moments'],
      [/Why this clip is easier to explore here/g,'Why this clip stands out'],
      [/Playlist 2 ready tomorrow/g,'Next drop in preparation']
    ];
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      let v=n.nodeValue;
      replacements.forEach(([a,b])=>{ v=v.replace(a,b); });
      n.nodeValue=v;
    });
  }
  function hideZeroStats(){
    document.querySelectorAll('.video-meta-line,.meta,.count,.yt-comments-count,.alexia-hm-status,[data-page-views]').forEach(el=>{
      const txt=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!txt) return;
      if(/^0\s+Comments$/i.test(txt) || /^0\s+Comment$/i.test(txt)){
        el.textContent='Join the conversation';
        el.classList.add('ax-stats-live');
        return;
      }
      if(/^(0\s+views?\s*[·|]\s*0\s+votes?)$/i.test(txt) || /^(0\s+views?\s*[·|]\s*0\s+votes?\s*[·|]\s*0\s+comments?)$/i.test(txt)){
        el.textContent='Live activity builds as visitors explore';
        el.classList.add('ax-stat-muted');
        return;
      }
      if(/^\s*0\s*$/i.test(txt) && el.hasAttribute('data-page-views')){
        const wrap=el.closest('.video-meta-line');
        if(wrap){ wrap.textContent='Live activity builds as visitors explore'; wrap.classList.add('ax-stat-muted');}
      }
    });
    document.querySelectorAll('.vote-score,.alexia-hm-status').forEach(el=>{
      const txt=(el.textContent||'').trim();
      if(/^(0|0 votes?)$/i.test(txt)){ el.textContent='Live score updates after the first vote'; el.style.display='block'; el.classList.add('ax-stat-muted');}
    });
  }
  function dedupeTitle(){
    const seo=document.querySelector('h1.alexia-seo-h1');
    if(!seo) return;
    const seoText=norm(seo.textContent);
    const candidates=[...document.querySelectorAll('.video-title,h1:not(.alexia-seo-h1),h2')];
    let hidden=0;
    candidates.forEach(el=>{
      if(hidden) return;
      const txt=norm(el.textContent);
      if(txt && txt===seoText){
        el.classList.add('ax-soft-hidden');
        hidden=1;
      }
    });
  }
  function addPageEyebrows(){
    const p=location.pathname.toLowerCase();
    const h1=document.querySelector('h1,.alexia-seo-h1');
    if(!h1) return;
    if(p.endsWith('/home.html') || p==='/' || p.endsWith('/index.html')) addEyebrow(h1,'Curated archive');
    else if(p.includes('top-100')) addEyebrow(h1,'Ranked by replay, momentum and archive pull');
    else if(p.includes('best-twerk-dancers')) addEyebrow(h1,'Curated dancer profiles');
    else if(p.includes('/playlist/') && !p.endsWith('/playlist/') && !p.endsWith('/playlist/index.html')) {}
    else if(p.endsWith('/playlist/') || p.endsWith('/playlist/index.html')) addEyebrow(h1,'Weekly selection');
  }
  function softenDenseBlocks(){
    document.querySelectorAll('.page-faq h2,.section-title,.recommend-title').forEach(el=>{
      if(norm(el.textContent)==='key moments') return;
      if(norm(el.textContent)==='related hot videos'){ el.textContent='Related standout clips'; }
    });
    document.querySelectorAll('.section-sub').forEach(el=>{
      const t=norm(el.textContent);
      if(t==='discover more choreography, viral clips and standout performances from the same selection.'){
        el.textContent='Hand-picked follow-ups with the same energy, pressure and replay value.';
      }
    });
  }
  function addBodyMode(){
    const p=location.pathname.toLowerCase();
    if(p.includes('/playlist/') && !p.endsWith('/playlist/') && !p.endsWith('/playlist/index.html')) document.body.classList.add('ax-playlist-detail');
    if(p.includes('top-100')) document.body.classList.add('ax-top100');
    if(p.includes('best-twerk-dancers') || p.includes('/twerk-dancer/')) document.body.classList.add('ax-dancers');
  }
  document.addEventListener('DOMContentLoaded', function(){
    addBodyMode();
    replaceTextEverywhere();
    hideZeroStats();
    dedupeTitle();
    addPageEyebrows();
    softenDenseBlocks();
    document.querySelectorAll('.ax-eyebrow').forEach(el=>{ if((el.textContent||'').trim().toLowerCase()==='feature clip') el.remove(); });
  });
})();
