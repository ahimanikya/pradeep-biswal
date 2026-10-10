const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
(async()=>{
 await requireAuth({...getGlobalDefaultAccount(),project:'pradeep-biswal'});
 const calls=[['services','https://firebaseappcheck.googleapis.com','/projects/698241623854/services'],['recaptcha keys','https://recaptchaenterprise.googleapis.com','/projects/pradeep-biswal/keys'],['billing','https://cloudbilling.googleapis.com','/projects/pradeep-biswal/billingInfo'],['enterprise config','https://firebaseappcheck.googleapis.com','/projects/698241623854/apps/1:698241623854:web:65035d82c5e491f036fcbf/recaptchaEnterpriseConfig']];
 for(const [name,urlPrefix,path] of calls){try{const r=await new Client({urlPrefix,apiVersion:'v1'}).get(path);console.log(name,JSON.stringify(r.body));}catch(e){console.log(name,e.message);}}
})().catch(e=>{console.error(e.message);process.exitCode=1});
