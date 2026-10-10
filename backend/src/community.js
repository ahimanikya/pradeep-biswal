import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter, where, getCountFromServer, writeBatch, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
const section=document.querySelector('[data-reader-article]');
const adminPage=document.querySelector('[data-reader-admin]');
const status=document.querySelector('.reader-status');
const tell=message=>{if(status)status.textContent=message;};
let db,auth;
async function setup(){
 if(db&&auth){await auth.authStateReady();return;}
 const config=await fetch('/reader-config.json',{cache:'no-store'}).then(r=>r.json());
 if(!config.enabled||!config.firebase)throw Error('not-configured');
 const app=initializeApp(config.firebase);
 if(config.recaptchaSiteKey)initializeAppCheck(app,{provider:new ReCaptchaV3Provider(config.recaptchaSiteKey),isTokenAutoRefreshEnabled:true});
 db=getFirestore(app);auth=getAuth(app);await auth.authStateReady();
}
function paragraph(text,tag='p'){const el=document.createElement(tag);el.textContent=text;return el;}
async function guest(){if(!auth.currentUser)await signInAnonymously(auth);return auth.currentUser;}
function errorMessage(error){
 if(error.message==='not-configured')return 'Reader responses will open soon.';
 if(error.code==='permission-denied')return 'Please wait a minute before posting again. If this continues, try refreshing the page.';
 return 'Unable to connect right now. Please try again shortly.';
}
async function startArticle(){
 const slug=section.dataset.readerArticle,form=section.querySelector('form'),like=document.querySelector('.memory-like');
 const list=section.querySelector('.reader-comments'),more=section.querySelector('.reader-more');
 const load=section.querySelector('.reader-load');let liked=false,cursor=null,busy=false;
 async function counts(){const count=await getCountFromServer(collection(db,'articles',slug,'likes'));if(auth.currentUser)liked=(await getDoc(doc(db,'articles',slug,'likes',auth.currentUser.uid))).exists();const total=count.data().count;const badge=like.querySelector('.memory-like-count');badge.textContent=String(total);badge.hidden=!total;const label=liked?'Unlike this article':'Like this article';like.setAttribute('aria-label',`${label}${total?`, ${total} ${total===1?'like':'likes'}`:''}`);like.title=label;like.querySelector('.memory-action-tip').textContent=liked?'Unlike':'Like';like.setAttribute('aria-pressed',String(liked));}
 async function comments(){
  const rules=[orderBy('createdAt','desc'),limit(20)];if(cursor)rules.push(startAfter(cursor));
  const snap=await getDocs(query(collection(db,'articles',slug,'comments'),...rules));
  if(!cursor)list.replaceChildren();
  for(const item of snap.docs){const d=item.data(),el=document.createElement('article');el.className='reader-comment';el.append(paragraph(d.author,'h3'));const body=paragraph(d.body);body.style.whiteSpace='pre-wrap';el.append(body);if(d.createdAt){const date=paragraph(d.createdAt.toDate().toLocaleDateString(),'time');date.dateTime=d.createdAt.toDate().toISOString();el.append(date);}list.append(el);}
  cursor=snap.docs.at(-1)||cursor;more.hidden=snap.size<20;
 }
 load.addEventListener('click',async()=>{if(busy)return;busy=true;load.disabled=true;tell('Loading reader responses…');try{await setup();await Promise.all([counts(),comments()]);like.disabled=false;form.querySelector('fieldset').disabled=false;load.hidden=true;tell('');if(section.dataset.likeRequested){delete section.dataset.likeRequested;like.click();}}catch(e){tell(errorMessage(e));load.disabled=false;load.hidden=false;load.textContent='Retry loading comments';}finally{busy=false;}});
 like.addEventListener('click',async()=>{like.disabled=true;try{const u=await guest(),ref=doc(db,'articles',slug,'likes',u.uid);if(liked)await deleteDoc(ref);else if(!(await getDoc(ref)).exists())await setDoc(ref,{createdAt:serverTimestamp()});await counts();}catch(e){tell(errorMessage(e));}finally{like.disabled=false;}});
 more.addEventListener('click',async()=>{more.disabled=true;try{await comments();}catch(e){tell(errorMessage(e));}finally{more.disabled=false;}});
 let submission=null;
 form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type=submit]');button.disabled=true;tell('Sending your comment…');try{
  const u=await guest(),author=form.elements.name.value.trim(),body=form.elements.comment.value.trim();if(!author||!body)throw Error('empty');
  const content=JSON.stringify([author,body]);if(!submission||submission.content!==content)submission={ref:doc(collection(db,'submissions')),content};
  // A stable submission ID makes retry after a lost response safe.
  let sent=false;try{sent=(await getDoc(submission.ref)).exists();}catch(e){if(e.code!=='permission-denied')throw e;}
  if(!sent){const batch=writeBatch(db);batch.set(doc(db,'commentLimits',u.uid),{lastAt:serverTimestamp(),lastId:submission.ref.id});batch.set(submission.ref,{uid:u.uid,article:slug,author,body,createdAt:serverTimestamp(),status:'pending'});await batch.commit();}
  form.reset();submission=null;tell('Thank you. Your comment has been sent for review and will appear once approved.');
 }catch(e){tell(errorMessage(e));}finally{button.disabled=false;}});
}
async function startAdmin(){
 const login=adminPage.querySelector('.admin-login'),logout=adminPage.querySelector('.admin-logout'),list=adminPage.querySelector('.admin-comments'),more=adminPage.querySelector('.admin-more');let cursor=null;
 async function refresh(append=false){
  if(!(await getDoc(doc(db,'admins',auth.currentUser.uid))).exists())throw Error('not-admin');
  const constraints=[where('status','==','pending'),orderBy('createdAt','desc'),limit(25)];if(append&&cursor)constraints.push(startAfter(cursor));
  const snap=await getDocs(query(collection(db,'submissions'),...constraints));if(!append)list.replaceChildren();
  for(const item of snap.docs){const d=item.data(),row=document.createElement('article');row.className='reader-comment';row.append(paragraph(d.author,'h2'),paragraph(d.article),paragraph(d.body));
   for(const action of ['Approve','Reject']){const button=document.createElement('button');button.textContent=action;button.addEventListener('click',async()=>{row.querySelectorAll('button').forEach(b=>b.disabled=true);try{const batch=writeBatch(db);batch.update(item.ref,{status:action==='Approve'?'approved':'rejected'});if(action==='Approve')batch.set(doc(db,'articles',d.article,'comments',item.id),{author:d.author,body:d.body,createdAt:d.createdAt});await batch.commit();row.remove();tell('Comment '+(action==='Approve'?'approved.':'rejected.'));}catch{tell('Could not update this comment.');row.querySelectorAll('button').forEach(b=>b.disabled=false);}});row.append(button);}list.append(row);
  }
  cursor=snap.docs.at(-1)||null;more.hidden=snap.size<25;if(!snap.size&&!append)tell('No comments waiting for review.');
 }
 login.addEventListener('click',async()=>{login.disabled=true;try{await setup();await signInWithPopup(auth,new GoogleAuthProvider());await refresh();login.hidden=true;logout.hidden=false;await startInbox();}catch(e){tell(e.message==='not-configured'?'Firebase setup is not complete.':'This account cannot access moderation.');if(auth?.currentUser)await signOut(auth);}finally{login.disabled=false;}});
 more.addEventListener('click',async()=>{more.disabled=true;try{await refresh(true);}catch{tell('Could not load more comments.');}finally{more.disabled=false;}});
 logout.addEventListener('click',async()=>{await signOut(auth);location.reload();});
}
if(section)startArticle();if(adminPage)startAdmin();

// Contact messages never enter the public comments collections.
export async function sendContactMessage(data, previous) {
 await setup();const user=await guest();
 const content=JSON.stringify(data);
 const submission=previous?.content===content ? previous : {id:doc(collection(db,'contactMessages')).id,content};
 const ref=doc(db,'contactMessages',submission.id);
 try {
  let sent=false;try{sent=(await getDoc(ref)).exists();}catch(e){if(e.code!=='permission-denied')throw e;}
  if(!sent){const batch=writeBatch(db);batch.set(doc(db,'contactLimits',user.uid),{lastAt:serverTimestamp(),lastId:submission.id});batch.set(ref,{...data,uid:user.uid,createdAt:serverTimestamp(),status:'new'});await batch.commit();}
  return submission;
 }catch(e){e.submission=submission;throw e;}
}
async function startInbox(){
 const panel=adminPage.querySelector('.admin-inbox');if(!panel)return;
 panel.hidden=false;const list=panel.querySelector('.inbox-messages'),more=panel.querySelector('.inbox-more'),refreshButton=panel.querySelector('.inbox-refresh'),notice=panel.querySelector('.inbox-status');let cursor=null;
 async function load(append=false){
  more.disabled=true;refreshButton.disabled=true;notice.textContent='Loading private messages…';
  try{const constraints=[orderBy('createdAt','desc'),limit(25)];if(append&&cursor)constraints.push(startAfter(cursor));
   const snap=await getDocs(query(collection(db,'contactMessages'),...constraints));if(!append)list.replaceChildren();
   for(const item of snap.docs){const d=item.data(),row=document.createElement('article');row.className='reader-comment';
    row.append(paragraph(d.subject,'h3'),paragraph('From '+d.name+' · '+d.email));
    if(d.createdAt)row.append(paragraph(d.createdAt.toDate().toLocaleString(),'time'));
    const body=paragraph(d.message);body.style.whiteSpace='pre-wrap';row.append(body);
    const state=paragraph('Status: '+d.status);row.append(state);
    const reply=document.createElement('a');reply.textContent='Reply by email';reply.className='text-link';reply.href='mailto:'+encodeURIComponent(d.email)+'?subject='+encodeURIComponent('Re: '+d.subject);row.append(reply);
    for(const [label,value] of [['Mark read','read'],['Archive','archived'],['Mark unread','new']]){const button=document.createElement('button');button.textContent=label;button.disabled=d.status===value;button.addEventListener('click',async()=>{row.querySelectorAll('button').forEach(b=>b.disabled=true);try{const batch=writeBatch(db);batch.update(item.ref,{status:value});await batch.commit();d.status=value;state.textContent='Status: '+value;notice.textContent='Message updated.';}catch{notice.textContent='Could not update the message. Please try again.';}finally{row.querySelectorAll('button').forEach(b=>b.disabled=b.dataset.status===d.status);}});button.dataset.status=value;row.append(button);}
    list.append(row);
   }
   cursor=snap.docs.at(-1)||cursor;more.hidden=snap.size<25;notice.textContent=!snap.size&&!append?'No contact messages yet.':'Messages are private. Email notifications are not enabled.';
  }catch{notice.textContent='Unable to load the inbox. Try Refresh inbox.';}finally{more.disabled=false;refreshButton.disabled=false;}
 }
 if(!panel.dataset.ready){more.addEventListener('click',()=>load(true));refreshButton.addEventListener('click',()=>load(false));panel.dataset.ready='true';}
 await load();
}
