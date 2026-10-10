// A self-contained reader. Article words remain sourced from the visible page.
const story=document.querySelector('.memory-story');
const openReader=document.querySelector('.memory-read');
if(story&&openReader&&typeof HTMLDialogElement!=='undefined'&&typeof HTMLDialogElement.prototype.showModal==='function'){
 const dialog=document.createElement('dialog');
 dialog.className='reading-tool';dialog.setAttribute('aria-labelledby','reading-tool-title');
 dialog.innerHTML=`<div class="reading-tool-toolbar"><span class="reading-tool-label">Quiet reading</span><div class="reading-tool-settings" role="group" aria-label="Text size"><button type="button" data-reading-smaller aria-label="Smaller text" title="Smaller text">A−</button><output aria-live="polite" aria-label="Text size"></output><button type="button" data-reading-larger aria-label="Larger text" title="Larger text">A+</button></div><button type="button" class="reading-tool-close" aria-label="Close reading mode" title="Close reading mode (Escape)">Close <span aria-hidden="true">×</span></button></div><div class="reading-tool-page"><header><h2 id="reading-tool-title" tabindex="-1"></h2><p class="reading-tool-byline"></p></header><div class="reading-tool-copy source-prose"></div><div class="reading-tool-end"><button type="button" data-reading-finish>Return to article</button></div></div>`;
 dialog.querySelector('h2').textContent=story.querySelector('h1').textContent;
 dialog.querySelector('.reading-tool-byline').textContent=story.querySelector('.memory-byline').textContent;
 const copy=dialog.querySelector('.reading-tool-copy');
 copy.append(...[...story.querySelector('.memory-story-copy').childNodes].map(node=>node.cloneNode(true)));
 copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 document.body.append(dialog);
 const smaller=dialog.querySelector('[data-reading-smaller]'),larger=dialog.querySelector('[data-reading-larger]');
 const sizes=[90,100,110,120,130];let size=100,returnScroll=0,oldOverflow='';
 try{const saved=Number(localStorage.getItem('pb-reading-size'));if(sizes.includes(saved))size=saved;}catch{}
 function setSize(value){
  size=value;copy.style.fontSize=`${1.25*size/100}rem`;
  dialog.querySelector('output').textContent=size+'%';
  smaller.disabled=size===sizes[0];larger.disabled=size===sizes.at(-1);
  try{localStorage.setItem('pb-reading-size',String(size));}catch{}
 }
 setSize(size);
 smaller.addEventListener('click',()=>setSize(sizes[Math.max(0,sizes.indexOf(size)-1)]));
 larger.addEventListener('click',()=>setSize(sizes[Math.min(sizes.length-1,sizes.indexOf(size)+1)]));
 openReader.hidden=false;
 openReader.addEventListener('click',()=>{
  returnScroll=window.scrollY;oldOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
  dialog.querySelector('h2').focus({preventScroll:true});
 });
 dialog.querySelector('.reading-tool-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-reading-finish]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  document.body.style.overflow=oldOverflow;
  window.scrollTo({top:returnScroll,behavior:'instant'});openReader.focus({preventScroll:true});
 });
}
