const triggers=[...document.querySelectorAll('.reader-load, .admin-login, .memory-like')];
let loading=false,loaded=false;
async function start(event){
 if(loading||loaded)return;loading=true;
 const trigger=event.currentTarget;
 triggers.forEach(b=>b.disabled=true);
 try{
  const config=await fetch('/reader-config.json',{cache:'no-store'}).then(r=>r.json());
  if(!config.enabled)throw Error('not-configured');
  await import('./community.js?v=20261010-appcheck');
  loaded=true;
  triggers.forEach(b=>{b.removeEventListener('click',start);b.disabled=false;});
  if(trigger.matches('.memory-like')){
   document.querySelector('[data-reader-article]').dataset.likeRequested='true';
   document.querySelector('.reader-load').click();
  }else trigger.click();
 }catch(error){
  document.querySelector('.reader-status').textContent=error.message==='not-configured'?'Reader responses will open soon.':'Unable to load reader responses. Please try again.';
  triggers.forEach(b=>b.disabled=false);
  const retry=document.querySelector('.reader-load');if(retry){retry.hidden=false;retry.textContent='Retry loading comments';}
 }finally{loading=false;}
}
triggers.forEach(b=>{b.disabled=false;b.addEventListener('click',start);});

// Reader responses are requested explicitly, never just by scrolling past them.
const commentsSection=document.querySelector('[data-reader-article]');
const commentsLoad=document.querySelector('.reader-load');
const disclosure=commentsSection?.querySelector('.reader-response-disclosure');
if(disclosure&&commentsLoad){
 disclosure.addEventListener('toggle',()=>{if(disclosure.open)start({currentTarget:commentsLoad});});
 const reveal=()=>{if(location.hash==='#comments'){disclosure.open=true;}};
 document.querySelectorAll('a[href="#comments"]').forEach(link=>link.addEventListener('click',()=>{disclosure.open=true;}));
 window.addEventListener('hashchange',reveal);reveal();
}else if(commentsLoad){commentsLoad.hidden=false;}
