import {initializeApp} from 'firebase/app';
import {initializeAppCheck,ReCaptchaEnterpriseProvider,getToken} from 'firebase/app-check';
import {getAuth,signInAnonymously,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,updateDoc,onSnapshot,serverTimestamp,Timestamp} from 'firebase/firestore';
import {labels,latestResponses,ownResponse,matchesState,validateResponse,adjacentReviewItem} from './review-model.js';
const $=id=>document.getElementById(id),project='two-books-2026';
let db,auth,appCheck,actor,reviewerName,isOwner=false,items=[],chapters=[],responses=[],unsubscribe,metadata;
const drafts=new Map(),chapterCache=new Map();let activeInvite=null,contextRun=0,activeItem=null,saving=false;
const params=new URLSearchParams(location.hash.slice(1));let invitation=params.get('invite');
// Remove the bearer link from the address bar after reading; no third-party
// analytics or embeds are present on this page.
if(invitation)history.replaceState(null,'',location.pathname+location.search);
// Pasting an invitation into an already open review tab is a hash navigation.
// Reload so it follows the same validated entry flow (with unsaved-draft warning).
window.addEventListener('hashchange',()=>{if(new URLSearchParams(location.hash.slice(1)).has('invite'))location.reload();});
const ref=(...parts)=>doc(db,'editorialProjects',project,...parts);
const group=name=>collection(db,'editorialProjects',project,name);
const tell=(message,error=false)=>{$('notice').textContent=message;$('notice').classList.toggle('error',error);};
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
function friendly(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(e.code))return 'Please open this page in Chrome or another regular browser and allow the Google sign-in pop-up.';if(e.code==='review/not-member')return 'Use your invitation link, or sign in with the owner’s Google account.';if(e.code==='permission-denied')return 'Access is unavailable. Your invitation may have expired or been revoked. Ask the owner for a new link.';if(e.code==='auth/popup-closed-by-user')return 'Sign-in was closed. You can try again.';return 'Could not connect or save. Check your connection and try again. Your unsaved wording is still here.';}
async function setup(){
 if(!db){const config=await fetch('reader-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('config');return r.json();});if(!config.enabled)throw Error('disabled');const app=initializeApp(config.firebase);if(config.recaptchaSiteKey)appCheck=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(config.recaptchaSiteKey),isTokenAutoRefreshEnabled:true});db=getFirestore(app);auth=getAuth(app);}
 if(appCheck)await getToken(appCheck);await auth.authStateReady();
}
function access(){ $('access').hidden=false;$('join').hidden=!invitation;$('access-copy').textContent=invitation?'Your invitation is ready. Open it to review with the site owner.':'Use your invitation link, or sign in as the site owner.'; }
async function identify(){
 isOwner=(await getDoc(doc(db,'admins',auth.currentUser.uid))).exists();
 if(isOwner){actor=auth.currentUser.uid;reviewerName='Ahimanikya';return;}
 const member=await getDoc(ref('members',auth.currentUser.uid));if(!member.exists())throw Object.assign(Error('access'),{code:'review/not-member'});
 const invite=(await getDoc(ref('invites',member.data().inviteId))).data();actor=member.data().inviteId;reviewerName=invite.label;
}
function option(value,title){const o=node('option',title);o.value=value;return o;}
async function openRoom(){
 await identify();metadata=(await getDoc(ref())).data();if(!metadata?.ready)throw Error('Review upload is not complete');
 const snap=await getDocs(group('items'));items=snap.docs.map(d=>({...d.data(),id:d.id})).filter(i=>!metadata.itemIds||metadata.itemIds.includes(i.id)).sort((a,b)=>a.order-b.order);
 if(items.length!==metadata.itemCount)throw Error('Review data incomplete');
 chapters=metadata.chapters;
 $('book').replaceChildren(option('','All books'));
 const books=new Map(chapters.map(c=>[c.bookId,c.book]));for(const [id,title] of books)$('book').append(option(id,title));
 $('identity').textContent=`Reviewing as ${reviewerName}`;$('invite').hidden=!isOwner;$('logout').hidden=false;
 unsubscribe?.();
 await new Promise((resolve,reject)=>{let first=true;unsubscribe=onSnapshot(group('responses'),snap=>{
  responses=snap.docs.filter(d=>!d.metadata.hasPendingWrites).map(d=>({...d.data(),id:d.id}));
  updateProgress();refreshItemNavigation();document.querySelectorAll('.review-card').forEach(card=>refreshResponses(card,items.find(i=>i.id===card.dataset.item)));
  if(first){first=false;resolve();}
 },error=>{if(first)reject(error);else tell('Live updates have stopped. Refresh to reconnect. Unsaved wording is still on this page.',true);});});
 $('access').hidden=true;$('workspace').hidden=false;document.body.classList.add('reviewing');updateChapters();tell('Review one suggestion at a time. Save your response before moving on.');$('workspace').focus();
}
function selectedChapters(){return chapters.filter(c=>!$('book').value||c.bookId===$('book').value);}
function updateChapters(){const selected=$('chapter').value,visible=selectedChapters();$('chapter').replaceChildren(...visible.map(c=>option(c.id,`${c.number?`${c.number}. `:''}${c.title}`)));if(visible.some(c=>c.id===selected))$('chapter').value=selected;render();}
function updateProgress(){const responded=items.filter(i=>{const mine=ownResponse(responses,i,actor);return mine?.version===i.version&&mine.status!=='pending';}).length;const approved=items.filter(i=>matchesState(i,responses,actor,'approved')).length;$('progress').textContent=`Your responses: ${responded} / ${items.length} · ${approved} ${approved===1?'approval':'approvals'}`;} 
function matchingItems(){return items.filter(i=>(!$('book').value||i.bookId===$('book').value)&&(!$('priority').value||i.severity===$('priority').value)&&matchesState(i,responses,actor,$('state').value));}
function refreshItemNavigation(){
 const matches=matchingItems();
 $('previous-item').disabled=saving||!adjacentReviewItem(matches,activeItem,-1);$('next-item').disabled=saving||!adjacentReviewItem(matches,activeItem,1);
 $('next-pending').disabled=saving;
}
function moveItem(direction){
 if(saving)return;const next=adjacentReviewItem(matchingItems(),activeItem,direction);if(!next)return;
 $('chapter').value=next.articleId;render(next.id);focusItem();
}
function focusItem(){const card=$('items').firstElementChild;if(card){card.focus({preventScroll:true});$('chapter-heading').scrollIntoView({block:'start'});}}
function render(preferredId){
 const chapter=chapters.find(c=>c.id===$('chapter').value);if(!chapter)return;
 $('chapter-heading').replaceChildren(node('p',`${chapter.book} · ${chapter.section}`,'eyebrow'),node('h2',`${chapter.number?chapter.number+'. ':''}${chapter.title}`));
 const visible=matchingItems().filter(i=>i.articleId===chapter.id);
 activeItem=visible.find(i=>i.id===preferredId)||visible[0]||null;
 $('items').replaceChildren(...(activeItem?[renderCard(activeItem)]:[]));$('empty').hidden=!!activeItem;
 $('item-position').textContent=activeItem?`Item ${visible.indexOf(activeItem)+1} of ${visible.length} in this chapter`:'';refreshItemNavigation();
 const selected=selectedChapters(),index=selected.findIndex(c=>c.id===chapter.id);$('previous').disabled=index===0;$('next').disabled=index===selected.length-1;
 $('context').open=false;$('chapter-text').replaceChildren();$('context-status').textContent='';contextRun++;updateProgress();
}
function renderCard(item){
 const card=node('article',undefined,'review-card');card.dataset.item=item.id;card.id=item.id;card.tabIndex=-1;
 const meta=node('div',undefined,'meta');meta.append(node('span',item.category,'badge'),node('span',item.severity+' priority',`badge ${item.severity}`),node('span',item.id));
 card.append(meta,node('h3',item.finding));
 card.append(node('p','Passage under review','label'),node('blockquote',item.passage,'passage'));
 const rec=node('div',undefined,'recommendation');rec.append(node('p','Editorial recommendation','label'),node('p',item.recommendation));if(item.question)rec.append(node('p',item.question,'question'));card.append(rec);
 if(item.changes.length){const details=node('details');details.append(node('summary',`${item.changes.length} tracked ${item.changes.length===1?'change':'changes'} in the working draft`));for(const edit of item.changes){const row=node('p',undefined,'change');row.append(node('del',edit.original),document.createTextNode(' → '),node('ins',edit.replacement||'[Removed from working draft]'));details.append(row);}details.append(node('p',item.handling,'muted'));card.append(details);}else card.append(node('p',item.handling,'muted'));
 const responseList=node('details',undefined,'response-list');card.append(responseList);
 const form=node('form',undefined,'response-form');const fieldset=node('fieldset');fieldset.append(node('legend','Your response'));
 const mine=ownResponse(responses,item,actor);
 const initial=drafts.get(item.id)||(mine?.version===item.version?mine:null)||{status:'',comment:'',alternative:''};
 const choice=node('select');choice.name='status';choice.id=`decision-${item.id}`;
 choice.append(option('','Choose a response'));choice.required=true;
 for(const [value,label] of Object.entries(labels))choice.append(option(value,label));choice.value=initial.status;
 const label=node('label','Decision');label.htmlFor=choice.id;label.append(choice);fieldset.append(label);
 const altLabel=node('label','Your suggested wording');const alt=node('textarea');alt.name='alternative';alt.maxLength=12000;alt.value=initial.alternative||'';altLabel.append(alt);fieldset.append(altLabel);
 const commentLabel=node('label','Comment or explanation');const comment=node('textarea');comment.name='comment';comment.maxLength=12000;comment.value=initial.comment||'';commentLabel.append(comment);const commentDetails=node('details',undefined,'comment-details');commentDetails.append(node('summary','Add a comment'),commentLabel);commentDetails.open=!!initial.comment||initial.status==='comment';fieldset.append(commentDetails);
 const actions=node('div',undefined,'actions'),save=node('button','Save response','primary'),message=node('p','','save-status');save.type='submit';const saveNext=node('button','Save & next','primary');save.classList.remove('primary');saveNext.type='submit';saveNext.value='next';message.setAttribute('role','status');message.setAttribute('aria-live','polite');actions.append(saveNext,save,message);fieldset.append(actions);form.append(fieldset);card.append(form);
 if(drafts.has(item.id))message.textContent='Unsaved draft · not shared yet';
 const fields=()=>({status:choice.value,alternative:alt.value,comment:comment.value});
 function visibility(){altLabel.hidden=choice.value!=='suggested';alt.required=choice.value==='suggested';comment.required=choice.value==='comment';if(comment.required)commentDetails.open=true;}
 visibility();form.addEventListener('input',()=>{drafts.set(item.id,fields());message.textContent='Not saved yet';visibility();});choice.addEventListener('change',visibility);
 let pending=null;
 form.addEventListener('submit',async event=>{event.preventDefault();const value=fields();value.comment=value.comment.trim();value.alternative=value.status==='suggested'?value.alternative.trim():'';const error=validateResponse(value.status,value.comment,value.alternative);if(error){message.textContent=error;return;}
  saving=true;refreshItemNavigation();$('filters').querySelectorAll('select').forEach(el=>el.disabled=true);$('previous').disabled=true;$('next').disabled=true;fieldset.disabled=true;message.textContent='Saving…';let saved=false;const serialized=JSON.stringify(value);if(!pending||pending.serialized!==serialized)pending={ref:doc(group('responses')),serialized};
  try{const existing=await getDoc(pending.ref);if(!existing.exists())await setDoc(pending.ref,{itemId:item.id,version:item.version,reviewerId:actor,reviewerName,...value,createdAt:serverTimestamp()});drafts.delete(item.id);pending=null;saved=true;message.textContent='Saved · visible to both reviewers';}
  catch(e){drafts.set(item.id,fields());message.textContent=friendly(e);}
  finally{fieldset.disabled=false;saving=false;$('filters').querySelectorAll('select').forEach(el=>el.disabled=false);const list=selectedChapters(),index=list.findIndex(c=>c.id===$('chapter').value);$('previous').disabled=index===0;$('next').disabled=index===list.length-1;refreshItemNavigation();}
  if(saved&&event.submitter===saveNext){moveItem(1);tell('Your response was saved and shared.');}
 });refreshResponses(card,item);return card;
}
function renderResponse(r,item){const block=node('div',undefined,'response');const time=r.createdAt?.toDate?.().toLocaleString()||'';block.append(node('strong',`${r.reviewerName} · ${labels[r.status]||r.status}`),node('p',time,'meta'));if(r.version!==item.version)block.append(node('p','Earlier version — this response does not approve the current suggestion.','stale'));if(r.alternative)block.append(node('p',r.alternative));if(r.comment)block.append(node('p',r.comment));return block;}
function refreshResponses(card,item){const area=card.querySelector('.response-list');const latest=latestResponses(responses,item);area.replaceChildren(node('summary',latest.length?`Saved responses (${latest.length})`:'No saved responses yet'));area.hidden=!latest.length;if(!latest.length)return;area.append(node('p','Latest responses','label'),...latest.map(r=>renderResponse(r,item)));const currentIds=new Set(latest.map(r=>r.id));const history=responses.filter(r=>r.itemId===item.id&&!currentIds.has(r.id)).sort((a,b)=>b.createdAt.toMillis()-a.createdAt.toMillis());if(history.length){const details=node('details',undefined,'history');details.append(node('summary',`${history.length} earlier ${history.length===1?'response':'responses'}`),...history.map(r=>renderResponse(r,item)));area.append(details);}}
function chapterContext(chapter){
 const nodes=[];
 if($('text-version').value==='text')for(const note of chapter.editorialNotes||[]){nodes.push(node('p',note.label||'Editorial note','label'),node('p',note.text));}
 nodes.push(node('p',chapter[$('text-version').value],'chapter-copy'));
 const publication=chapter.publication||{};
 const link=(source)=>{try{const url=new URL(source.url);if(!['https:','http:'].includes(url.protocol))return null;const a=node('a',source.title||source.publisher||url.hostname);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}};
 if(publication.sources?.length){nodes.push(node('p','Publication record','label'),node('p',`${publication.recorded_date||'Date not confirmed'} · ${publication.date_status||'Source record requires confirmation'}`,'muted'));for(const source of publication.sources){const a=link(source);if(a){const p=node('p');p.append(a);if(source.date)p.append(document.createTextNode(' · '+source.date));nodes.push(p);}}}
 for(const fact of chapter.factChecks||[]){const details=node('details');details.append(node('summary',`Source check: ${fact.claim}`),node('p',fact.result));for(const source of fact.sources){const a=link(source);if(a){const p=node('p');p.append(a);details.append(p);}}nodes.push(details);}
 return nodes;
}
async function loadContext(){if(!$('context').open)return;const id=$('chapter').value,run=++contextRun;$('context-status').textContent='Loading chapter…';try{if(!chapterCache.has(id)){const snap=await getDoc(ref('chapters',id));if(!snap.exists())throw Error('missing');chapterCache.set(id,snap.data());}if(run!==contextRun)return;const chapter=chapterCache.get(id);$('chapter-text').replaceChildren(...chapterContext(chapter));$('context-status').textContent=$('text-version').value==='text'?'Working draft with the tracked language changes.':'Original text, preserved unchanged.';}catch(e){if(run===contextRun)$('context-status').textContent=friendly(e);}}
function navigate(delta){const list=selectedChapters(),index=list.findIndex(c=>c.id===$('chapter').value);if(list[index+delta]){$('chapter').value=list[index+delta].id;render();$('chapter-heading').scrollIntoView({block:'start'});}}
$('book').addEventListener('change',updateChapters);for(const id of ['chapter','state','priority'])$(id).addEventListener('change',()=>render());$('filters').addEventListener('submit',e=>e.preventDefault());$('previous').onclick=()=>navigate(-1);$('next').onclick=()=>navigate(1);$('previous-item').onclick=()=>moveItem(-1);$('next-item').onclick=()=>moveItem(1);
$('next-pending').onclick=()=>{const pending=items.filter(i=>(!$('book').value||i.bookId===$('book').value)&&matchesState(i,responses,actor,'pending'));const next=pending.find(i=>i.order>(activeItem?.order??-1))||pending[0];if(next){$('chapter').value=next.articleId;$('state').value='pending';$('priority').value='';render(next.id);focusItem();}else tell('You have responded to every item in the selected book.');};
$('context').addEventListener('toggle',loadContext);$('text-version').onchange=loadContext;
$('join').onclick=async()=>{const button=$('join');button.disabled=true;try{await setup();if(!auth.currentUser)await signInAnonymously(auth);const match=invitation?.match(/^([a-zA-Z0-9_-]{1,80})\.([a-f0-9]{64})$/);if(!match)throw Error('invalid invite');await setDoc(ref('members',auth.currentUser.uid),{inviteId:match[1],token:match[2],joinedAt:serverTimestamp()});invitation=null;await openRoom();}catch(e){tell(friendly(e),true);}finally{button.disabled=false;}};
$('login').onclick=async()=>{const button=$('login');button.disabled=true;try{await setup();await signInWithPopup(auth,new GoogleAuthProvider());await openRoom();}catch(e){tell(friendly(e),true);}finally{button.disabled=false;}};
$('logout').onclick=async()=>{if(drafts.size&&!confirm('You have unsaved wording. Sign out and discard it?'))return;unsubscribe?.();drafts.clear();await signOut(auth);location.reload();};
window.addEventListener('offline',()=>tell('You are offline. Keep this page open; unsaved wording will remain here until you reconnect.',true));
window.addEventListener('online',()=>tell('Connection restored. Check the saved confirmation beneath each response.'));
window.addEventListener('beforeunload',e=>{if(drafts.size){e.preventDefault();e.returnValue='';}});
$('export').onclick=()=>{const data={project,exportedAt:new Date().toISOString(),corpusVersion:metadata.version,items:items.map(item=>({id:item.id,title:item.title,book:item.book,version:item.version,passage:item.passage,recommendation:item.recommendation,latestResponses:latestResponses(responses,item)})),history:responses};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=`author-review-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('invite').onclick=async()=>{const button=$('invite');button.disabled=true;try{const target=ref('invites','poet'),existing=await getDoc(target);let invite=existing.data();if(!invite?.active||invite.expiresAt.toMillis()<Date.now()){const bytes=crypto.getRandomValues(new Uint8Array(32));invite={label:'Pradeep Biswal',token:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),active:true,expiresAt:Timestamp.fromMillis(Date.now()+365*86400000)};await setDoc(target,invite);}activeInvite=target;$('invite-link').value=`${location.origin}${location.pathname}#invite=poet.${invite.token}`;$('invite-panel').hidden=false;}catch(e){tell(friendly(e),true);}finally{button.disabled=false;}};
$('copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText($('invite-link').value);tell('Invitation link copied. Share it directly with the poet.');}catch{$('invite-link').select();tell('Select and copy the invitation link above.');}};
$('revoke').onclick=async()=>{try{await updateDoc(activeInvite,{active:false});$('invite-panel').hidden=true;$('invite-link').value='';tell('Invitation revoked. Devices using it can no longer read or save reviews.');}catch(e){tell(friendly(e),true);}};
(async()=>{access();try{await setup();if(auth.currentUser&&!invitation)await openRoom();else tell('Choose how to enter the review room.');}catch(e){if(e.code==='review/not-member')tell('Choose how to enter the review room.');else tell(friendly(e),true);}})();
