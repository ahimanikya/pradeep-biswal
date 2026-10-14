// One continuous text flow: page numbers belong to the book, not individual essays.
const $=s=>document.querySelector(s);
const title=$('#reader-title'),body=$('#reader-body'),status=$('#reader-status');
const dialog=$('#reader-contents'),size=$('#reader-size'),art=$('#reader-art');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const covers=[{id:'front-cover',title:'A Life Among People',group:'Front cover',cover:true,image:'assets/book/front-cover.webp',alt:'A Life Among People — Recollections and Essays from Odisha, by Pradeep Biswal. Two men sit beneath a village tree.'},{id:'back-cover',title:'A Life Among People — Back cover',group:'Back cover',cover:true,image:'assets/book/back-cover-open-edition.webp',alt:'Back cover of A Life Among People, with Pradeep Biswal’s portrait and an Odisha village scene.'}];
let entries=[],current=null,generation=0,restoring=false;
const frame=$('.book-window'), sheet=$('.reader-sheet'), layout=$('#reader-layout');
const desktop=matchMedia('(min-width:1000px) and (min-height:650px)');
let bookPreferred=read('pb-collection-book',true), spread=0, spreadCount=1, pageCount=2;
const endMarker=document.createElement('span');endMarker.className='book-end';endMarker.setAttribute('aria-hidden','true');frame.append(endMarker);
const folios=document.createElement('div');folios.className='reader-folios';folios.setAttribute('aria-hidden','true');
const leftFolio=document.createElement('span'),rightFolio=document.createElement('span');folios.append(leftFolio,rightFolio);$('#main').append(folios);
let resizeTimer;
const paths={exit:'M14 5 7 12l7 7M7 12h14',contents:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',bookmark:'M6 3h12v18l-6-4-6 4Z',moon:'M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z',expand:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',settings:'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',left:'m14 5-7 7 7 7',right:'m10 5 7 7-7 7',previous:'M5 5v14M19 5l-9 7 9 7',next:'M19 5v14M5 5l9 7-9 7'};
function icon(el,name){el.innerHTML=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;}
document.querySelectorAll('[data-icon]').forEach(el=>icon(el,el.dataset.icon));
icon($('#page-prev'),'left');icon($('#page-next'),'right');
const panel=$('#reader-tools-panel'),settingsButton=$('#reader-settings');
function closeSettings(){panel.hidden=true;settingsButton.setAttribute('aria-expanded','false');}
settingsButton.addEventListener('click',()=>{panel.hidden=!panel.hidden;settingsButton.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)renderSaved();});
document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!settingsButton.contains(e.target))closeSettings();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){closeSettings();settingsButton.focus();}});
let dark=read('pb-collection-dark',false);
function theme(){document.body.classList.toggle('reader-dark',dark);$('#reader-theme').setAttribute('aria-label',dark?'Use light paper':'Use dark paper');$('#reader-theme').title=dark?'Use light paper':'Use dark paper';}
theme();$('#reader-theme').addEventListener('click',()=>{dark=!dark;theme();save('pb-collection-dark',dark);});
$('#reader-fullscreen').hidden=!document.fullscreenEnabled;
$('#reader-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent='Full screen is not available in this browser.';}});
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'Exit full screen':'Enter full screen';$('#reader-fullscreen').setAttribute('aria-label',label);$('#reader-fullscreen').title=label;paginate();});
let bookmarks=read('pb-collection-bookmarks',[]);if(!Array.isArray(bookmarks))bookmarks=[];
function bookmarkState(){const saved=current&&bookmarks.some(b=>b.pagination==='continuous'&&b.id===current.id&&b.spread===spread);$('#reader-bookmark').setAttribute('aria-pressed',String(!!saved));$('#reader-bookmark').title=saved?'Remove bookmark':'Bookmark this page';$('#reader-bookmark').setAttribute('aria-label',$('#reader-bookmark').title);}
$('#reader-bookmark').addEventListener('click',()=>{if(!current)return;const i=bookmarks.findIndex(b=>b.pagination==='continuous'&&b.id===current.id&&b.spread===spread);if(i>=0)bookmarks.splice(i,1);else bookmarks.push({id:current.id,title:current.title,spread,pagination:'continuous',width:frame.clientWidth,height:frame.clientHeight,size:size.value,illustrations});save('pb-collection-bookmarks',bookmarks);bookmarkState();renderSaved();});
function samePageLayout(place){return isBook()&&place.width===frame.clientWidth&&place.height===frame.clientHeight&&place.size===size.value&&place.illustrations===illustrations;}
function renderSaved(){const list=$('#reader-saved');list.replaceChildren();if(!bookmarks.length)list.textContent='No saved places yet.';for(const b of bookmarks){const button=document.createElement('button');button.type='button';button.textContent=b.title+(b.pagination==='continuous'&&samePageLayout(b)?' · page '+(b.spread*2+1):'');button.addEventListener('click',async()=>{closeSettings();await display(b.id);if(b.pagination==='continuous'&&samePageLayout(b))turn(b.spread);frame.focus({preventScroll:true});});list.append(button);}}

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let turnEffect=read('pb-collection-turn','paper');if(!['paper','none'].includes(turnEffect))turnEffect='paper';
let pageShadow=read('pb-collection-shadow',true),turnFrame=0,turnLayer=null;
$('#reader-turn-effect').value=turnEffect;$('#reader-shadow').checked=pageShadow;
function syncPaper(){document.body.classList.toggle('reader-page-shadow',pageShadow);$('#reader-motion-note').hidden=!reduced.matches;}
syncPaper();
$('#reader-turn-effect').addEventListener('change',e=>{turnEffect=e.target.value;save('pb-collection-turn',turnEffect);cancelPaperTurn();});
$('#reader-shadow').addEventListener('change',e=>{pageShadow=e.target.checked;save('pb-collection-shadow',pageShadow);syncPaper();});
reduced.addEventListener('change',()=>{syncPaper();cancelPaperTurn();});
function cancelPaperTurn(){cancelAnimationFrame(turnFrame);turnFrame=0;turnLayer?.remove();turnLayer=null;}
function capturePaper(){
 const box=frame.getBoundingClientRect(),shell=$('#main').getBoundingClientRect();
 const copy=document.createElement('div');copy.className='turn-snapshot';
 const visible=r=>r.width>0&&r.height>0&&r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom;
 // Snapshot only the visible spread. Cloning the entire book for each curl strip
 // would multiply thousands of off-screen paragraphs on every turn.
 const walker=document.createTreeWalker(sheet,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(!node.textContent.trim()||node.parentElement.closest('#reader-title,#reader-group'))continue;
  const range=document.createRange();range.selectNodeContents(node);
  if(![...range.getClientRects()].some(visible))continue;
  const style=getComputedStyle(node.parentElement);
  if(style.visibility==='hidden'||style.display==='none')continue;
  const matches=[...node.textContent.matchAll(/\S+/gu)];
  for(const match of matches){
   range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
   const rect=range.getBoundingClientRect();if(!visible(rect))continue;
   const word=document.createElement('span');word.textContent=match[0];
   Object.assign(word.style,{position:'absolute',left:(rect.left-box.left)+'px',top:(rect.top-box.top)+'px',whiteSpace:'pre',fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,letterSpacing:style.letterSpacing,lineHeight:rect.height+'px',color:style.color,textTransform:style.textTransform,textDecoration:style.textDecoration});
   copy.append(word);
  }
 }
 for(const img of sheet.querySelectorAll('img:not([hidden])')){
  const rect=img.getBoundingClientRect();if(!visible(rect))continue;
  const clone=img.cloneNode();clone.removeAttribute('id');const style=getComputedStyle(img);
  Object.assign(clone.style,{position:'absolute',left:(rect.left-box.left)+'px',top:(rect.top-box.top)+'px',width:rect.width+'px',height:rect.height+'px',maxWidth:'none',maxHeight:'none',margin:'0',objectFit:style.objectFit,objectPosition:style.objectPosition});copy.append(clone);
 }
 return {copy,width:box.width,height:box.height,left:box.left-shell.left,top:box.top-shell.top};
}
function paperTurn(direction,paper){
 if(!paper||turnEffect!=='paper'||reduced.matches||!isBook())return;
 cancelPaperTurn();
 const {copy,width:w,height:h,left,top}=paper;
 const incoming=capturePaper().copy;
 const layer=document.createElement('div');layer.className='paper-turn-layer natural-turn';layer.setAttribute('aria-hidden','true');layer.inert=true;
 Object.assign(layer.style,{left:left+'px',top:top+'px',width:w+'px',height:h+'px'});
 const forward=direction>0,half=w/2,count=12,stripWidth=half/count;
 // The unturned old page stays in place until the reverse of the leaf covers it.
 const stationary=copy.cloneNode(true);
 stationary.style.clipPath=forward?'inset(0 50% 0 0)':'inset(0 0 0 50%)';
 layer.append(stationary);
 const shadow=document.createElement('div');shadow.className='turn-cast-shadow';layer.append(shadow);
 const strips=[];
 for(let i=0;i<count;i++){
  const strip=document.createElement('div');strip.className='turn-leaf';
  Object.assign(strip.style,{left:half+'px',width:(stripWidth+.35)+'px',transformOrigin:'left center'});
  const front=document.createElement('div'),back=document.createElement('div');
  front.className='turn-face turn-front';back.className='turn-face turn-back';
  const face=copy.cloneNode(true),reverse=incoming.cloneNode(true);
  const sourceX=forward?half+i*stripWidth:half-(i+1)*stripWidth;
  const reverseX=forward?half-(i+1)*stripWidth:half+i*stripWidth;
  Object.assign(face.style,{width:w+'px',left:-sourceX+'px'});
  Object.assign(reverse.style,{width:w+'px',left:-reverseX+'px'});
  front.append(face);back.append(reverse);strip.append(front,back);layer.append(strip);strips.push(strip);
 }
 $('#main').append(layer);turnLayer=layer;
 const started=performance.now(),duration=820;
 function tick(now){
  if(turnLayer!==layer)return;
  const t=Math.min(1,(now-started)/duration),progress=t*t*(3-2*t);
  const bend=Math.sin(Math.PI*progress)*.42;
  let x=0,z=0;
  strips.forEach((strip,i)=>{
   // A shallow travelling curve lifts the outside edge; no skew or mirrored type.
   const angle=-Math.PI*progress+bend*(2*(i+.5)/count-1);
   const dx=stripWidth*Math.cos(angle),dz=-stripWidth*Math.sin(angle);
   strip.style.transform=forward
    ?`translate3d(${x}px,0,${z}px) rotateY(${angle}rad)`
    :`translate3d(${-x-dx}px,0,${z+dz}px) rotateY(${-angle}rad)`;
   strip.style.setProperty('--turn-shade',String(Math.sin(Math.PI*progress)*(.04+.08*i/count)));
   x+=dx;z+=dz;
  });
  shadow.style.opacity=String(Math.sin(Math.PI*progress)*.22);
  shadow.style.transform=`translateX(${forward?x/2:-x/2}px) scaleX(${.2+.8*Math.abs(Math.cos(Math.PI*progress))})`;
  if(t<1)turnFrame=requestAnimationFrame(tick);else cancelPaperTurn();
 }
 tick(started);
}
let soundEnabled=read('pb-collection-sound',false),soundContext;
$('#reader-sound').checked=soundEnabled;$('#reader-sound-test').hidden=!soundEnabled;
$('#reader-sound').addEventListener('change',e=>{soundEnabled=e.target.checked;save('pb-collection-sound',soundEnabled);$('#reader-sound-test').hidden=!soundEnabled;});
async function pageRustle(){
 if(!soundEnabled)return;
 try{
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 soundContext??=new Audio();await soundContext.resume();
 const duration=.38,buffer=soundContext.createBuffer(1,Math.ceil(soundContext.sampleRate*duration),soundContext.sampleRate),data=buffer.getChannelData(0);
 let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.12)/1.12;data[i]=last;}
 const source=soundContext.createBufferSource(),filter=soundContext.createBiquadFilter(),gain=soundContext.createGain();
 source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.55;
 const now=soundContext.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.18,now+.055);gain.gain.exponentialRampToValueAtTime(.025,now+.16);gain.gain.linearRampToValueAtTime(.09,now+.22);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
 source.connect(filter).connect(gain).connect(soundContext.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
 }catch{status.textContent='Page sound is unavailable in this browser.';}
}
$('#reader-sound-test').addEventListener('click',pageRustle);

function isBook(){return desktop.matches&&bookPreferred;}
function turn(to,animate=false,entryHint=null){
 const next=Math.max(0,Math.min(to,spreadCount-1)),direction=Math.sign(next-spread);
 cancelPaperTurn();
 const paper=animate&&direction&&isBook()&&turnEffect==='paper'&&!reduced.matches?capturePaper():null;
 spread=Math.max(0,Math.min(to,spreadCount-1));
 frame.scrollLeft=spread*(frame.clientWidth+64);
 if(!current?.cover&&chapterStarts.length)setEntryContext(entryHint||entryForPage(spread*2));
 $('#page-position').textContent=`${spread*2+1===pageCount?'Page '+pageCount:'Pages '+(spread*2+1)+'–'+Math.min(spread*2+2,pageCount)} · ${pageCount} pages`;
 $('#page-prev').disabled=spread===0&&entries.indexOf(current)===0;$('#page-next').disabled=spread===spreadCount-1&&entries.indexOf(current)===entries.length-1;
 leftFolio.textContent=current?.cover?'':String(spread*2+1);
 rightFolio.textContent=current?.cover||spread*2+2>pageCount?'':String(spread*2+2);
 if(current?.cover)$('#page-position').textContent=current.group;
 $('#page-position').disabled=!!current?.cover;
 bookmarkState();
 if(paper)paperTurn(direction,paper);
 if(animate&&direction&&isBook())pageRustle();
 if(current&&!restoring)remember();
}
function paginate(reset=false){
 cancelPaperTurn();
 const progress=spreadCount>1?spread/(spreadCount-1):0;
 const context=current;
 document.body.classList.toggle('book-view',isBook());
 layout.setAttribute('aria-pressed',String(bookPreferred));
 layout.textContent='Book view';
 layout.title=bookPreferred?'Switch to scrolling view':'Switch to a two-page book';
 layout.hidden=!desktop.matches;
 $('.book-turn').hidden=!isBook();
 if(!isBook()){frame.scrollLeft=0;if(!panel.hidden)renderSaved();return;}
 if(current?.cover){pageCount=1;spreadCount=1;endMarker.style.left='0px';turn(0);return;}
 // Two columns fill each spread; the extra gutter separates consecutive spreads.
 const width=frame.clientWidth;
 sheet.style.setProperty('--page-width',((width-64)/2)+'px');
 pageCount=Math.max(1,Math.round((sheet.scrollWidth+64)/((width-64)/2+64)));
 spreadCount=Math.ceil(pageCount/2);
 const pitch=(width+64)/2;
 chapterStarts=[...body.querySelectorAll('.book-chapter')].map(section=>({id:section.dataset.article,page:Math.max(0,Math.round((section.querySelector('h2').getBoundingClientRect().left-frame.getBoundingClientRect().left+frame.scrollLeft)/pitch))}));
 endMarker.style.left=(spreadCount*(width+64)-65)+'px';
 updateContentsPages();
 if(!panel.hidden)renderSaved();
 turn(reset?0:Math.round(progress*(spreadCount-1)),false,reset?context:null);
}
layout.addEventListener('click',()=>{const id=current?.id;bookPreferred=!bookPreferred;save('pb-collection-book',bookPreferred);if(id)display(id);else paginate();});
async function step(direction){
 if(current?.cover){
  if(current.id==='front-cover'&&direction>0)await display(entries[1].id);
  else if(current.id==='back-cover'&&direction<0){await display(entries.at(-2).id);turn(spreadCount-1);}
  return;
 }
 if(direction<0&&spread===0){await display('front-cover');return;}
 if(direction>0&&spread===spreadCount-1){await display('back-cover');return;}
 turn(spread+direction,true);
}

$('#page-prev').setAttribute('aria-keyshortcuts','ArrowLeft');
$('#page-prev').title='Previous page (←)';
$('#page-next').setAttribute('aria-keyshortcuts','ArrowRight');
$('#page-next').title='Next page (→)';
$('#page-prev').addEventListener('click',()=>step(-1));
$('#page-next').addEventListener('click',()=>step(1));
document.addEventListener('keydown',event=>{
 if(!isBook()||!current||restoring||document.querySelector('dialog[open]')||event.defaultPrevented||event.isComposing||event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.isContentEditable||event.target.closest('input,select,textarea,[role=slider],[role=spinbutton]')||!panel.hidden)return;
 if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}
});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>paginate(),150);});
// Keep keyboard-focused links visible even when they occur on a later spread.
frame.addEventListener('focusin',event=>{
 if(!isBook()||restoring||event.target===frame)return;
 const x=event.target.getBoundingClientRect().left-frame.getBoundingClientRect().left+frame.scrollLeft;
 turn(Math.floor(Math.max(0,x)/(frame.clientWidth+64)));
});
$('.skip').addEventListener('click',event=>{event.preventDefault();frame.focus({preventScroll:true});});
let illustrations=read('pb-collection-art',true);
const sizes=['18','21','24','28'];
size.value=String(read('pb-collection-size',21));if(!sizes.includes(size.value))size.value='21';
function settings(){document.documentElement.style.setProperty('--reader-size',size.value+'px');art.setAttribute('aria-pressed',String(illustrations));body.querySelectorAll('img').forEach(img=>img.hidden=!illustrations&&!current?.cover);}
size.addEventListener('change',()=>{settings();save('pb-collection-size',Number(size.value));paginate();});
art.addEventListener('click',()=>{illustrations=!illustrations;settings();save('pb-collection-art',illustrations);paginate();});
function remember(){if(current&&!current.cover&&!restoring)save('pb-collection-place',{id:current.id,y:window.scrollY,spread,book:isBook(),width:frame.clientWidth,height:frame.clientHeight,size:size.value,illustrations});}
let timer;window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,160);},{passive:true});
window.addEventListener('pagehide',remember);
$('#contents-open').addEventListener('click',()=>{updateContentsPages();dialog.showModal();});
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
let bookContent=null,bookLoading=null,chapterStarts=[];
function setEntryContext(entry){
 current=entry;bookContent?.querySelectorAll('.book-chapter').forEach(section=>section.toggleAttribute('data-current',section.dataset.article===entry.id));title.textContent=entry.title;$('#reader-group').textContent=entry.theme||entry.group;
 history.replaceState(null,'','#'+encodeURIComponent(entry.id));document.title=entry.title+' · Reading room · Pradeep Biswal';
 const source=$('#reader-source');source.replaceChildren();
 if(!entry.cover&&!entry.frontMatter){const link=document.createElement('a');link.href=entry.url||'#front-cover';link.textContent=entry.sourceLabel||(entry.publisher?'Originally published by '+entry.publisher:'Open article · comments and sharing');source.append(link);if(entry.date)source.append(document.createTextNode(' · '+entry.date));}
 const position=entries.indexOf(entry);
 for(const [selector,index,label] of [['#reader-prev',position-1,'← Previous article'],['#reader-next',position+1,'Next article →']]){
  const a=$(selector),target=entries[index];a.hidden=!target;
  if(target){a.href='#'+encodeURIComponent(target.id);icon(a,selector==='#reader-prev'?'previous':'next');a.setAttribute('aria-label',label+': '+target.title);a.title=target.title;}
 }
 dialog.querySelectorAll('a').forEach(a=>{a.removeAttribute('aria-current');if(a.hash==='#'+entry.id)a.setAttribute('aria-current','page');});
}

function updateContentsPages(){
 for(const a of dialog.querySelectorAll('a')){
  a.querySelector('.contents-page')?.remove();
  const chapter=chapterStarts.find(c=>a.hash==='#'+c.id);
  if(chapter&&isBook()&&!current?.cover){const number=document.createElement('span');number.className='contents-page';number.textContent='p. '+(chapter.page+1);a.append(number);}
 }
}
const jump=$('#reader-page-jump'),jumpInput=$('#page-jump-input');
$('#page-position').addEventListener('click',()=>{
 if(current?.cover||!isBook())return;
 jumpInput.max=String(pageCount);jumpInput.value=String(spread*2+1);
 $('#page-jump-help').textContent='Enter a page from 1 to '+pageCount+'. Page numbers follow your current text size.';
 jump.showModal();jumpInput.focus();jumpInput.select();
});
$('#page-jump-cancel').addEventListener('click',()=>jump.close());
$('#page-jump-form').addEventListener('submit',event=>{
 event.preventDefault();const page=Number(jumpInput.value);
 if(!Number.isInteger(page)||page<1||page>pageCount){jumpInput.reportValidity();return;}
 jump.close();turn(Math.floor((page-1)/2),true);frame.focus({preventScroll:true});
});
function offerResume(place){
 const entry=entries.find(e=>e.id===place?.id&&!e.cover);if(!entry)return;
 const resume=$('#reader-resume');$('#resume-description').textContent=entry.title;
 $('#resume-start').onclick=async()=>{resume.close();await display('front-cover');save('pb-collection-place',null);};
 $('#resume-reading').onclick=async()=>{
  resume.close();await display(entry.id);
  if(current?.id!==entry.id)return;
  if(place.book&&samePageLayout(place)&&Number.isInteger(place.spread))turn(place.spread);
  else if(!isBook()&&place.book===false&&Number.isFinite(place.y))window.scrollTo({top:place.y,behavior:'instant'});
  remember();
 };
 resume.showModal();
}

function entryForPage(page){
 const start=[...chapterStarts].reverse().find(chapter=>chapter.page<=page)||chapterStarts[0];
 return entries.find(entry=>entry.id===start?.id)||entries[1];
}
async function loadBook(){
 if(bookContent)return bookContent;
 if(bookLoading)return bookLoading;
 bookLoading=(async()=>{
  const response=await fetch('collection-reader-text.json?v=20261014-continuous');if(!response.ok)throw new Error('Book unavailable');
  const texts=await response.json(),container=document.createElement('div');container.className='book-chapters';
  for(const entry of entries.filter(e=>!e.cover)){
   const chapterHtml=entry.frontMatter?entry.html:texts[entry.id];
   if(typeof chapterHtml!=='string')throw new Error('Missing chapter');
   const section=document.createElement('section');section.className='book-chapter';section.dataset.article=entry.id;
   const heading=document.createElement('header');heading.className='chapter-heading';
   const group=document.createElement('p');group.className='chapter-theme';group.textContent=entry.theme||entry.group;
   const h=document.createElement('h2');h.textContent=entry.title;h.tabIndex=-1;heading.append(group,h);section.append(heading);
   if(entry.image){const img=document.createElement('img');img.src=entry.image;img.alt=entry.alt||'';img.width=1536;img.height=960;img.loading='lazy';img.decoding='async';img.srcset=`${entry.image.replace('.webp','-384.webp')} 384w, ${entry.image.replace('.webp','-640.webp')} 640w, ${entry.image} 1024w`;img.sizes='(max-width:600px) calc(100vw - 112px), 420px';img.src=entry.image.replace('.webp','-640.webp');img.fetchPriority='high';
    if(entry.id==='the-golden-days')img.classList.add('reader-documentary-image');
    if(['pratibha-satpathy-myth-magic-memory-poetry','PBW-b00c33a819'].includes(entry.id))img.classList.add('reader-author-portrait');
    section.append(img);
   }
   const prose=document.createElement('div');prose.className='chapter-prose';prose.append(...safeContent(chapterHtml));section.append(prose);container.append(section);
  }
  bookContent=container;return container;
 })().catch(error=>{bookLoading=null;throw error;});
 return bookLoading;
}
async function display(id,restore=false){
 cancelPaperTurn();const entry=entries.find(r=>r.id===id)||entries[0];
 const ticket=++generation;remember();restoring=true;
 document.body.classList.toggle('cover-view',!!entry.cover);document.body.classList.toggle('continuous-reading',!entry.cover);
 setEntryContext(entry);bookmarkState();status.textContent='Opening book…';body.setAttribute('aria-busy','true');
 try{
  if(entry.cover)body.replaceChildren();
  if(entry.cover){
   const img=document.createElement('img');img.src=entry.image;img.alt=entry.alt;img.width=1024;img.height=1536;img.decoding='async';img.srcset=`${entry.image.replace('.webp','-384.webp')} 384w, ${entry.image.replace('.webp','-640.webp')} 640w, ${entry.image} 1024w`;img.sizes='(max-width:600px) calc(100vw - 112px), 420px';img.src=entry.image.replace('.webp','-640.webp');img.fetchPriority='high';
   const button=document.createElement('button');button.type='button';button.className='book-cover-button'+(entry.id==='back-cover'?' book-back-cover':'');button.setAttribute('aria-label',entry.id==='front-cover'?'Open A Life Among People':'Return to the front cover');const face=document.createElement('span');face.className='book-cover-face';face.append(img);button.append(face);
   button.addEventListener('click',()=>{pageRustle();location.hash=entry.id==='front-cover'?entries[1].id:'front-cover';});body.append(button);
   if(entry.id==='back-cover'){const copy=document.createElement('div');copy.className='cover-description';copy.textContent='A family radio, a bicycle, a conversation with a poet, a pension letter on an office desk. Pradeep Biswal returns to the people and encounters that have shaped his life. Moving from an Odisha village to literary gatherings and the working world of public service, these recollections and essays bring personal memory into conversation with public responsibility. These pieces trace a life among family, teachers, writers and colleagues, before turning to the questions of livelihoods, institutions and the common good. Pradeep Biswal: Poet, writer and former civil servant.';body.append(copy);}
   await img.decode().catch(()=>{});if(ticket!==generation)return;paginate(true);status.textContent='';title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});return;
  }

  const content=await loadBook();if(ticket!==generation)return;
  if(content.parentElement!==body)body.replaceChildren(content);
  setEntryContext(entry);settings();await document.fonts.ready;if(ticket!==generation)return;
  paginate(true);
  const section=[...body.querySelectorAll('.book-chapter')].find(el=>el.dataset.article===entry.id);
  if(isBook()){
   const start=chapterStarts.find(chapter=>chapter.id===entry.id);turn(Math.floor((start?.page||0)/2),false,entry);
   section?.querySelector('h2').focus({preventScroll:true});
  }else section?.querySelector('h2').scrollIntoView({block:'start',behavior:'instant'});
  status.textContent='';
 }catch(error){if(ticket===generation)status.textContent='The book could not be loaded. Please try again or open the original article from reading settings.';}
 finally{if(ticket===generation){body.removeAttribute('aria-busy');restoring=false;remember();}}
}

try{
 const [response,opening]=await Promise.all([fetch('collection-reader.json?v=20261014-desha-landscape'),fetch('book-introduction.json?v=20261014-introduction')]);if(!response.ok||!opening.ok)throw new Error('Index unavailable');entries=[covers[0],await opening.json(),...await response.json(),covers[1]];
 const coverNav=document.createElement('p');for(const cover of covers){const a=document.createElement('a');a.href='#'+cover.id;a.textContent=cover.group;coverNav.append(a);}dialog.querySelector('nav').append(coverNav);
 for(const group of [...new Set(entries.filter(r=>!r.cover).map(r=>r.theme||r.group))]){
  const heading=document.createElement('h3');heading.textContent=group;const list=document.createElement('ol');
  entries.filter(r=>(r.theme||r.group)===group).forEach(r=>{const li=document.createElement('li'),a=document.createElement('a');a.href='#'+r.id;a.textContent=r.title;li.append(a);list.append(li);});dialog.querySelector('nav').append(heading,list);
 }
 $('#contents-open').hidden=false;$('.reader-turn').hidden=false;
 const hash=decodeURIComponent(location.hash.slice(1)),place=read('pb-collection-place',{});
 await display(hash||'front-cover');
 if(!hash||hash==='front-cover'||hash===place?.id)offerResume(place);
 window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(entries.some(r=>r.id===id))display(id);});
}catch{document.body.classList.remove('cover-view','continuous-reading','book-view');body.replaceChildren($('#reader-fallback').content.cloneNode(true));status.textContent='The reader is unavailable. You can still open every article from the list below.';}
