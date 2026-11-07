(function(){
  if(!document.body||!document.body.matches('[data-model="jenny"]'))return;
  document.addEventListener('click',function(e){
    var b=e.target.closest('.full'); if(!b)return;
    e.preventDefault(); e.stopImmediatePropagation();
    b.textContent='🛠 Maintenance'; b.disabled=false;
    var card=b.closest('.c'),msg=card&&card.querySelector('.msg');
    if(!msg&&card){msg=document.createElement('div');msg.className='msg';msg.style.cssText='margin-top:8px;color:#ffb45c;font-size:12px';card.querySelector('.cb').appendChild(msg)}
    if(msg)msg.textContent='Jenny videos are temporarily under maintenance.';
  },true);
})();
