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
 const like=doc(db,'articles','my-romance-with-radio','likes',uid);
 await setDoc(like,{createdAt:serverTimestamp()});
 if(!(await getDoc(like)).exists())throw Error('Like not saved');
 await deleteDoc(like);console.log('Guest like saved and removed.');
 const submission=doc(db,'submissions','smoke-'+uid),batch=writeBatch(db);
 batch.set(doc(db,'commentLimits',uid),{lastAt:serverTimestamp(),lastId:submission.id});
 batch.set(submission,{uid,article:'my-romance-with-radio',author:'Backend verification',body:'Temporary private verification; delete after test.',createdAt:serverTimestamp(),status:'pending'});
 await batch.commit();
 if((await getDoc(submission)).data().status!=='pending')throw Error('Submission missing');
 console.log('Guest comment saved for moderation; not published.');
}finally{
 if(uid){for(const resource of ['submissions/smoke-'+uid,'commentLimits/'+uid,'articles/my-romance-with-radio/likes/'+uid])await api.delete(`/projects/pradeep-biswal/databases/(default)/documents/${resource}`);await deleteUser(auth.currentUser);console.log('Temporary test data and guest account deleted.');}
 await terminate(db);await deleteApp(app);
}
