const contactForm=document.querySelector('#contact-form');
if(contactForm){
 const status=document.querySelector('#contact-status'),button=contactForm.querySelector('button[type=submit]');let pending=null,busy=false;
 contactForm.querySelector('fieldset').disabled=false;
 status.textContent='';
 contactForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!contactForm.reportValidity())return;
  if(contactForm.elements.website.value){status.textContent='Unable to send. Please reload the page and try again.';return;}
  const data=Object.fromEntries(['name','email','subject','message'].map(k=>[k,contactForm.elements[k].value.trim()]));
  if(Object.values(data).some(v=>!v)){status.textContent='Please complete every required field.';return;}
  busy=true;button.disabled=true;status.textContent='Sending your message…';
  try{const {sendContactMessage}=await import('./community.js?v=20261010-appcheck');await sendContactMessage(data,pending);pending=null;contactForm.reset();status.textContent='Thank you. Your message has been received in the private inbox.';}
  catch(e){pending=e.submission||pending;status.textContent=e.code==='permission-denied'?'Your message was not confirmed. Please wait five minutes before trying again. Your text is still here.':'We could not confirm delivery. Check your connection and try again. Your text is still here.';}
  finally{busy=false;button.disabled=false;}
 });
}
