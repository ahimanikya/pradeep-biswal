import fs from 'node:fs';
import {createRequire} from 'node:module';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,signInAnonymously,deleteUser} from 'firebase/auth';
import {getFirestore,doc,setDoc,getDoc,deleteDoc,writeBatch,serverTimestamp,terminate} from 'firebase/firestore';
const require=createRequire(import.meta.url);
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const config=JSON.parse(fs.readFileSync('../dist/reader-config.json'));
await requireAuth({...getGlobalDefaultAccount(),project:'pradeep-biswal'});
const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const app=initializeApp(config.firebase),auth=getAuth(app),db=getFirestore(app);
let uid;
try{
 const user=(await signInAnonymously(auth)).user;uid=user.uid;
 const ref=doc(db,'contactMessages','smoke-'+uid),batch=writeBatch(db);
 batch.set(doc(db,'contactLimits',uid),{lastAt:serverTimestamp(),lastId:ref.id});
 batch.set(ref,{uid,name:'Backend verification',email:'test@example.com',subject:'Temporary contact verification',message:'Temporary private test; removed immediately after verification.',createdAt:serverTimestamp(),status:'new'});
 await batch.commit();
 if((await getDoc(ref)).data().status!=='new')throw Error('Contact message not saved');
 const saved=await api.get(`/projects/pradeep-biswal/databases/(default)/documents/contactMessages/${ref.id}`);
 if(!saved.body.fields.subject)throw Error('Owner could not read message');
 console.log('Guest contact message saved privately and verified through owner access.');

}finally{
 if(uid){for(const resource of ['contactMessages/smoke-'+uid,'contactLimits/'+uid])await api.delete(`/projects/pradeep-biswal/databases/(default)/documents/${resource}`);await deleteUser(auth.currentUser);console.log('Temporary test data and guest account deleted.');}
 await terminate(db);await deleteApp(app);
}
