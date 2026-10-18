// Configures only this site's public attestation key; never changes billing or enforcement.
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const fs=require('node:fs');
(async()=>{
 await requireAuth({...getGlobalDefaultAccount(),project:'pradeep-biswal'});
 const usage=new Client({urlPrefix:'https://serviceusage.googleapis.com',apiVersion:'v1'});
 for(const service of ['recaptchaenterprise.googleapis.com','firebaseappcheck.googleapis.com']){
  await usage.post(`/projects/pradeep-biswal/services/${service}:enable`,{});console.log('Enabled '+service);
 }
 const recaptcha=new Client({urlPrefix:'https://recaptchaenterprise.googleapis.com',apiVersion:'v1'});
 const {body:existing}=await recaptcha.get('/projects/pradeep-biswal/keys');
 let key=(existing.keys||[]).find(k=>k.displayName==='Pradeep Biswal website App Check');
 if(!key){const response=await recaptcha.post('/projects/pradeep-biswal/keys',{displayName:'Pradeep Biswal website App Check',webSettings:{allowedDomains:['pradeepbiswal.in','www.pradeepbiswal.in','pb.kabitawithoutborders.org'],allowAllDomains:false,allowAmpTraffic:false,integrationType:'SCORE'}});key=response.body;}
 const siteKey=key.name.split('/').at(-1);
 const client=new Client({urlPrefix:'https://firebaseappcheck.googleapis.com',apiVersion:'v1'});
 const name='projects/698241623854/apps/1:698241623854:web:65035d82c5e491f036fcbf/recaptchaEnterpriseConfig';
 const {body}=await client.patch('/'+name,{name,siteKey,tokenTtl:'3600s'},{queryParams:{updateMask:'siteKey,tokenTtl'}});
 const path='../dist/reader-config.json',config=JSON.parse(fs.readFileSync(path));
 config.recaptchaSiteKey=siteKey;config.appCheckProvider='recaptchaEnterprise';
 fs.writeFileSync(path,JSON.stringify(config,null,2)+'\n');
 console.log(JSON.stringify({publicSiteKey:siteKey,allowedDomains:key.webSettings.allowedDomains,appCheckConfigured:!!body.siteKey,enforcement:'unchanged'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
