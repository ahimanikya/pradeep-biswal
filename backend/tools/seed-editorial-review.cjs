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
 const summary={title:payload.title,version:payload.version,itemCount:payload.itemCount,chapterCount:payload.chapterCount,itemIds:payload.items.map(i=>i.id),ready:false,chapters:payload.chapters.map(({text,originalText,editorialNotes,publication,assessment,factChecks,...summary})=>summary)};
 await api.post(`/${base}:commit`,{writes:[write(root,summary)]});
 const records=[...payload.items.map(item=>write(`${root}/items/${item.id}`,item)),...payload.chapters.map(chapter=>write(`${root}/chapters/${chapter.id}`,chapter))];
 for(let i=0;i<records.length;i+=100)await api.post(`/${base}:commit`,{writes:records.slice(i,i+100)});
 await api.post(`/${base}:commit`,{writes:[write(root,{...summary,ready:true})]});
 console.log(`Uploaded ${payload.itemCount} review items and ${payload.chapterCount} chapter contexts. Responses and invitations untouched.`);
})().catch(e=>{console.error(e.message);process.exitCode=1});
