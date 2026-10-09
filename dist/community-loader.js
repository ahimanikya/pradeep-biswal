const triggers=[...document.querySelectorAll('.reader-load, .admin-login, .memory-like')];
let loading=false;
async function start(event){
 if(loading)return;loading=true;
 const trigger=event.currentTarget;
 triggers.forEach(b=>b.disabled=true);
 try{
  const config=await fetch('/reader-config.json',{cache:'no-store'}).then(r=>r.json());
  if(!config.enabled)throw Error('not-configured');
  await import('./community.js?v=20261009-firebase');
  triggers.forEach(b=>{b.removeEventListener('click',start);b.disabled=false;});
  if(trigger.matches('.memory-like')){
   document.querySelector('[data-reader-article]').dataset.likeRequested='true';
   document.querySelector('.reader-load').click();
  }else trigger.click();
 }catch(error){
  document.querySelector('.reader-status').textContent=error.message==='not-configured'?'Reader responses will open soon.':'Unable to load reader responses. Please try again.';
  triggers.forEach(b=>b.disabled=false);
 }finally{loading=false;}
}
triggers.forEach(b=>{b.disabled=false;b.addEventListener('click',start);});
