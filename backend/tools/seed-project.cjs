const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const project='pradeep-biswal',account=getGlobalDefaultAccount();await requireAuth({...account,project});
 const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
 const base=`projects/${project}/databases/(default)/documents`;
 const files=fs.readdirSync('../dist/memories').filter(n=>n.endsWith('.html'));
 const writes=files.map(file=>{const html=fs.readFileSync('../dist/memories/'+file,'utf8'),title=html.match(/<title>(.*?)<\/title>/s)[1].split(' · ')[0];return {update:{name:`${base}/articles/${file.slice(0,-5)}`,fields:{title:{stringValue:title}}},updateMask:{fieldPaths:['title']}};});
 await api.post(`/${base}:commit`,{writes});console.log(`Seeded ${files.length} articles.`);
 const auth=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v1'});
 const lookup=await auth.post(`/projects/${project}/accounts:lookup`,{email:[account.user.email]});
 let uid=lookup.body.users?.[0]?.localId;
 if(!uid){const created=await auth.post(`/projects/${project}/accounts`,{email:account.user.email,emailVerified:true,displayName:'Site owner'});uid=created.body.localId;}
 if(!uid)throw Error('Owner identity could not be created.');
 await api.post(`/${base}:commit`,{writes:[{update:{name:`${base}/admins/${uid}`,fields:{role:{stringValue:'owner'}}}}]});
 console.log('Owner moderation access configured.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
