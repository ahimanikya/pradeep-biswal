// Existing article words and images are loaded one at a time, never rewritten.
const $=s=>document.querySelector(s);
const title=$('#reader-title'),body=$('#reader-body'),status=$('#reader-status');
const dialog=$('#reader-contents'),size=$('#reader-size'),art=$('#reader-art');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let entries=[],current=null,generation=0,restoring=false;
$('.skip').addEventListener('click',event=>{event.preventDefault();title.focus();title.scrollIntoView({block:'start'});});
let illustrations=read('pb-collection-art',true);
const sizes=['18','21','24','28'];
size.value=String(read('pb-collection-size',21));if(!sizes.includes(size.value))size.value='21';
function settings(){document.documentElement.style.setProperty('--reader-size',size.value+'px');art.setAttribute('aria-pressed',String(illustrations));body.querySelectorAll('img').forEach(img=>img.hidden=!illustrations);}
size.addEventListener('change',()=>{settings();save('pb-collection-size',Number(size.value));});
art.addEventListener('click',()=>{illustrations=!illustrations;settings();save('pb-collection-art',illustrations);});
function remember(){if(current&&!restoring)save('pb-collection-place',{id:current.id,y:window.scrollY});}
let timer;window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,160);},{passive:true});
window.addEventListener('pagehide',remember);
$('#contents-open').addEventListener('click',()=>dialog.showModal());
$('#contents-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target.closest('a'))dialog.close();});
$('#reader-share').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(location.href);status.textContent='Reading link copied.';}
 catch{status.replaceChildren();const input=document.createElement('input');input.type='url';input.readOnly=true;input.value=location.href;input.setAttribute('aria-label','Copy this reading link');status.append(input);input.select();}
});
function safeContent(html){
 const parsed=new DOMParser().parseFromString(html,'text/html');
 parsed.querySelectorAll('script,style,iframe,form,object,embed').forEach(n=>n.remove());
 parsed.body.querySelectorAll('*').forEach(node=>{
  [...node.attributes].forEach(attr=>{if(attr.name.startsWith('on')||['id','style','srcdoc'].includes(attr.name))node.removeAttribute(attr.name);});
  if(node.hasAttribute('href')&&!/^(https?:|#)/i.test(node.getAttribute('href')))node.removeAttribute('href');
 });
 return [...parsed.body.childNodes];
}
async function display(id,restore=false){
 const entry=entries.find(r=>r.id===id)||entries[0];
 const ticket=++generation;remember();restoring=true;current=entry;
 history.replaceState(null,'','#'+encodeURIComponent(entry.id));
 title.textContent=entry.title;document.title=entry.title+' · Reading room · Pradeep Biswal';
 $('#reader-group').textContent=entry.group;body.replaceChildren();status.textContent='Opening article…';
 body.setAttribute('aria-busy','true');
 const source=$('#reader-source');source.replaceChildren();
 const link=document.createElement('a');link.href=entry.url;link.textContent=entry.publisher?'Originally published by '+entry.publisher:'Open article · comments and sharing';source.append(link);
 if(entry.date)source.append(document.createTextNode(' · '+entry.date));
 const position=entries.indexOf(entry);
 for(const [selector,index,label] of [['#reader-prev',position-1,'← Previous'],['#reader-next',position+1,'Next →']]){
  const a=$(selector),target=entries[index];a.hidden=!target;
  if(target){a.href='#'+encodeURIComponent(target.id);a.textContent=label;a.setAttribute('aria-label',label+': '+target.title);a.title=target.title;}
 }
 dialog.querySelectorAll('a').forEach(a=>{a.removeAttribute('aria-current');if(a.hash==='#'+entry.id)a.setAttribute('aria-current','page');});
 try{
  const response=await fetch(entry.textUrl||entry.url);if(!response.ok)throw new Error('Article unavailable');
  let html;
  if(entry.textUrl)html=(await response.json()).html;
  else{const doc=new DOMParser().parseFromString(await response.text(),'text/html');const original=doc.querySelector('.memory-story-copy');if(!original)throw new Error('Article missing');html=original.innerHTML;}
  if(ticket!==generation)return;
  if(entry.image){const img=document.createElement('img');img.src=entry.image;img.alt=entry.alt||'';img.decoding='async';img.width=1536;img.height=960;body.append(img);}
  const prose=document.createElement('div');prose.append(...safeContent(html));body.append(prose);settings();status.textContent='';
  const image=body.querySelector('img');if(image&&!image.hidden)await image.decode().catch(()=>{});
  if(ticket!==generation)return;
  const place=read('pb-collection-place',{});
  title.focus({preventScroll:true});window.scrollTo({top:restore&&place.id===entry.id?Number(place.y)||0:0,behavior:'instant'});
 }catch(error){if(ticket!==generation)return;status.textContent='This article could not be loaded. Please use the original article link below.';}
 finally{if(ticket===generation){body.removeAttribute('aria-busy');restoring=false;remember();}}
}
try{
 const response=await fetch('collection-reader.json');if(!response.ok)throw new Error('Index unavailable');entries=await response.json();
 for(const group of ['Memories','Published articles']){
  const heading=document.createElement('h3');heading.textContent=group;const list=document.createElement('ol');
  entries.filter(r=>r.group===group).forEach(r=>{const li=document.createElement('li'),a=document.createElement('a');a.href='#'+r.id;a.textContent=r.title;li.append(a);list.append(li);});dialog.querySelector('nav').append(heading,list);
 }
 $('#contents-open').hidden=false;$('.reader-tools').hidden=false;$('.reader-turn').hidden=false;
 const hash=decodeURIComponent(location.hash.slice(1)),place=read('pb-collection-place',{});
 await display(hash||place.id||entries[0].id,!hash);
 window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(entries.some(r=>r.id===id))display(id);});
}catch{status.textContent='The reader is unavailable. You can still open every article from the list below.';}
