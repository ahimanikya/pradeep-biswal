// Run from backend. Input is a private editorial payload outside the Git repo.
// Reseeding updates suggestions, never reviewer responses or invitations.
const fs=require('node:fs');
const {Client}=require('firebase-tools/lib/apiv2');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
function encode(v){if(v===null)return {nullValue:null};if(typeof v==='string')return {stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return {booleanValue:v};if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}};}
(async()=>{
 const payload=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 if(payload.project!=='two-books-2026'||payload.items.length!==payload.itemCount||new Set(payload.items.map(i=>i.id)).size!==payload.items.length)throw Error('Invalid editorial payload');
 const project='pradeep-biswal',account=getGlobalDefaultAccount();await requireAuth({...account,project});
 const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base=`projects/${project}/databases/(default)/documents`,root=`${base}/editorialProjects/${payload.project}`;
 const write=(name,data)=>({update:{name,fields:encode(data).mapValue.fields}});
 const summary={title:payload.title,version:payload.version,itemCount:payload.itemCount,chapterCount:payload.chapterCount,itemIds:payload.items.map(i=>i.id),ready:true,edition:payload.edition||'Editorial review',chapters:payload.chapters.map(({text,originalText,editorialNotes,publication,assessment,factChecks,artwork,...summary})=>summary)};

 const records=[...payload.items.map(item=>write(`${root}/items/${item.id}`,item)),...payload.chapters.map(chapter=>write(`${root}/chapters/${chapter.id}`,chapter))];
 const commit=writes=>api.post(`/${base}:commit`,{writes},{skipLog:{body:true,resBody:true}});
 // Keep the current edition readable until every new record is uploaded.
 let batch=[],bytes=0;for(const record of records){const size=Buffer.byteLength(JSON.stringify(record));if(batch.length&&(bytes+size>4_000_000||batch.length>=50)){await commit(batch);batch=[];bytes=0;}batch.push(record);bytes+=size;}if(batch.length)await commit(batch);
 await commit([write(root,summary)]);
 console.log(`Uploaded ${payload.itemCount} review items and ${payload.chapterCount} chapter contexts. Responses and invitations untouched.`);
})().catch(e=>{console.error(e.message);process.exitCode=1});
