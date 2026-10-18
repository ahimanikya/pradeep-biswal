// Add the permanent website without removing existing sign-in or attestation hosts.
// Uses the Firebase CLI owner's authorization; never changes enforcement or billing.
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const fs=require('node:fs');const path=require('node:path');
const project='pradeep-biswal',domains=['pradeepbiswal.in','www.pradeepbiswal.in'];
(async()=>{
 await requireAuth({...getGlobalDefaultAccount(),project});
 const auth=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v2'});
 const {body:before}=await auth.get(`/projects/${project}/config`,{skipLog:{resBody:true}});
 const authorizedDomains=[...new Set([...(before.authorizedDomains||[]),...domains])];
 await auth.patch(`/projects/${project}/config`,{authorizedDomains},{queryParams:{updateMask:'authorizedDomains'},skipLog:{body:true,resBody:true}});
 const recaptcha=new Client({urlPrefix:'https://recaptchaenterprise.googleapis.com',apiVersion:'v1'});
 const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../dist/reader-config.json'),'utf8'));
 const {body:keys}=await recaptcha.get(`/projects/${project}/keys`);
 const key=keys.keys.find(k=>k.name.endsWith('/'+config.recaptchaSiteKey));if(!key)throw Error('Configured reCAPTCHA key not found');
 const allowedDomains=[...new Set([...(key.webSettings.allowedDomains||[]),...domains])];
 await recaptcha.patch('/'+key.name,{name:key.name,webSettings:{allowedDomains}},{queryParams:{updateMask:'webSettings.allowedDomains'}});
 const {body:authAfter}=await auth.get(`/projects/${project}/config`,{skipLog:{resBody:true}});
 const {body:keyAfter}=await recaptcha.get('/'+key.name);
 if(!authorizedDomains.every(d=>authAfter.authorizedDomains.includes(d))||!allowedDomains.every(d=>keyAfter.webSettings.allowedDomains.includes(d)))throw Error('Domain verification failed');
 if(keyAfter.webSettings.allowAllDomains!==key.webSettings.allowAllDomains)throw Error('Unexpected attestation policy change');
 console.log(JSON.stringify({authorizedDomains:authAfter.authorizedDomains,attestationDomains:keyAfter.webSettings.allowedDomains,enforcement:'unchanged'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
