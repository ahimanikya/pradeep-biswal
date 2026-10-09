// Uses the Firebase CLI's existing authorization. Never prints or stores credentials.
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const fs=require('node:fs');
const project='pradeep-biswal';
(async()=>{
 await requireAuth({...getGlobalDefaultAccount(),project});
 const services=new Client({urlPrefix:'https://serviceusage.googleapis.com',apiVersion:'v1'});
 for(const name of ['firestore.googleapis.com','identitytoolkit.googleapis.com']){
  await services.post(`/projects/${project}/services/${name}:enable`,{});console.log('Enabled '+name);
 }
 const firebase=new Client({urlPrefix:'https://firebase.googleapis.com',apiVersion:'v1beta1'});
 const {body:config}=await firebase.get(`/projects/${project}/webApps/1:698241623854:web:65035d82c5e491f036fcbf/config`);
 fs.writeFileSync('../dist/reader-config.json',JSON.stringify({enabled:false,firebase:config,recaptchaSiteKey:''},null,2)+'\n');
 console.log('Saved public Firebase web configuration. Activation remains off.');
 const auth=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v2'});
 try{await auth.patch(`/projects/${project}/config`,{signIn:{anonymous:{enabled:true}},authorizedDomains:['localhost','pb.kabitawithoutborders.org',`${project}.firebaseapp.com`,`${project}.web.app`]},{queryParams:{updateMask:'signIn.anonymous.enabled,authorizedDomains'}});console.log('Anonymous authentication enabled.');}catch(e){console.log('Authentication setup still required: '+e.message);}
})().catch(e=>{console.error(e.message);process.exitCode=1});
