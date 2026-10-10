// Execute only with explicit approval for production-wide Firestore enforcement.
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
(async()=>{
 await requireAuth({...getGlobalDefaultAccount(),project:'pradeep-biswal'});
 const client=new Client({urlPrefix:'https://firebaseappcheck.googleapis.com',apiVersion:'v1'});
 const name='projects/698241623854/services/firestore.googleapis.com';
 const {body}=await client.patch('/'+name,{name,enforcementMode:'ENFORCED'},{queryParams:{updateMask:'enforcementMode'}});
 console.log(JSON.stringify({service:body.name,enforcementMode:body.enforcementMode,updateTime:body.updateTime}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
