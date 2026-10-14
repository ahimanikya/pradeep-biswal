const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../dist/collection-reader.js'),'utf8');
const layout=source.match(/function samePageLayout\(place\)\{[^\n]+/)[0];
test('saved page positions apply only to an identical reading layout',()=>{
 const ctx={isBook:()=>true,frame:{clientWidth:1000,clientHeight:600},size:{value:'21'},illustrations:true};vm.createContext(ctx);vm.runInContext(layout,ctx);
 const place={width:1000,height:600,size:'21',illustrations:true};assert.equal(ctx.samePageLayout(place),true);
 for(const changes of [{width:800},{height:500},{size:'24'},{illustrations:false}])assert.equal(ctx.samePageLayout({...place,...changes}),false);
 assert.equal(ctx.samePageLayout({}),false);ctx.isBook=()=>false;assert.equal(ctx.samePageLayout(place),false);
});
test('start from cover actually opens the cover and clears the saved place',async()=>{
 const nodes={};const calls=[];const ctx={entries:[{id:'story',title:'Story'}],$:s=>nodes[s]||(nodes[s]={close:()=>calls.push('close'),showModal:()=>calls.push('show')}),display:async id=>calls.push(id),save:(key,value)=>calls.push([key,value])};vm.createContext(ctx);
 vm.runInContext(source.match(/function offerResume\(place\)\{[\s\S]*?\n\}/)[0],ctx);
 ctx.offerResume({id:'story'});await nodes['#resume-start'].onclick();assert.equal(calls[2],'front-cover');assert.equal(calls[3][1],null);
});
test('arrow keys work after button focus but do not hijack editing or dialogs',()=>{
 const moves=[];const ctx={isBook:()=>true,current:{},restoring:false,document:{querySelector:()=>null},panel:{hidden:true},step:n=>moves.push(n)};vm.createContext(ctx);
 const handler=source.match(/document.addEventListener\('keydown',event=>\{([\s\S]*?)\n\}\);/)[1];
 const run=extra=>{ctx.event={key:'ArrowRight',target:{isContentEditable:false,closest:()=>null},preventDefault:()=>{},...extra};vm.runInContext('(function(){'+handler+'})()',ctx);};
 run({});run({key:'ArrowLeft'});for(const extra of [{repeat:true},{ctrlKey:true},{target:{isContentEditable:true}},{target:{closest:()=>({})}}])run(extra);ctx.document.querySelector=()=>({});run({});assert.deepEqual(moves,[1,-1]);
});
