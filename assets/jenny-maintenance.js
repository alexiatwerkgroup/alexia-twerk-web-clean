(function(){
  if(!document.body)return;
  var onJennyPage=document.body.matches('[data-model="jenny"]');
  document.addEventListener('click',function(e){
    var link=e.target.closest('a[href*="/jenny/"]');
    if(link){
      e.preventDefault(); e.stopImmediatePropagation();
      link.setAttribute('aria-disabled','true');
      link.classList.add('maintenance-link');
      var old=link.querySelector('.maintenance-note');
      if(!old){old=document.createElement('small');old.className='maintenance-note';old.style.cssText='display:block;margin-top:4px;color:#ffb45c;font-size:11px';link.appendChild(old)}
      old.textContent='🛠 Maintenance';
      return;
    }
    if(!onJennyPage)return;
    var b=e.target.closest('.full'); if(!b)return;
    e.preventDefault(); e.stopImmediatePropagation();
    b.textContent='🛠 Maintenance'; b.disabled=false;
    var card=b.closest('.c'),msg=card&&card.querySelector('.msg');
    if(!msg&&card){msg=document.createElement('div');msg.className='msg';msg.style.cssText='margin-top:8px;color:#ffb45c;font-size:12px';card.querySelector('.cb').appendChild(msg)}
    if(msg)msg.textContent='Jenny videos are temporarily under maintenance.';
  },true);
})();
