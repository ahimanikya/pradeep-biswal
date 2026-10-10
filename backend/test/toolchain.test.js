import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createServer} from 'node:http';
const require=createRequire(import.meta.url);
const cliRequire=createRequire(require.resolve('firebase-tools/package.json'));

test('Firebase administration helpers retain the APIs used by this project',()=>{
 assert.equal(typeof require('firebase-tools/lib/apiv2').Client,'function');
 assert.equal(typeof require('firebase-tools/lib/auth').getGlobalDefaultAccount,'function');
 assert.equal(typeof require('firebase-tools/lib/requireAuth').requireAuth,'function');
 // Load the emulator integrations too, catching incompatible transitive imports.
 require('firebase-tools/lib/emulator/firestoreEmulator');
 require('firebase-tools/lib/emulator/pubsubEmulator');
});

test('patched watcher detects changes to a concrete Firestore rules file',{timeout:10000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pb-rules-watch-'));
 const file=join(dir,'firestore.rules');await writeFile(file,'first');
 const watcher=cliRequire('chokidar').watch(file,{persistent:true,ignoreInitial:true});
 try{
  await once(watcher,'ready',{signal:AbortSignal.timeout(5000)});
  const changed=once(watcher,'change',{signal:AbortSignal.timeout(5000)});
  await writeFile(file,'updated');
  assert.equal((await changed)[0],file);
 }finally{await watcher.close();await rm(dir,{recursive:true,force:true});}
});

test('patched gaxios and proxy dependencies support a local HTTP request',{timeout:10000},async()=>{
 const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end('{"ok":true}');});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const result=await cliRequire('gaxios').request({url:`http://127.0.0.1:${server.address().port}/`,proxy:false});
  assert.deepEqual(result.data,{ok:true});
  const proxyRequire=createRequire(cliRequire.resolve('get-uri'));
  const ftp=new (proxyRequire('basic-ftp').Client)();ftp.close();
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('patched PubSub supports the topic API used by Firebase CLI without network access',async()=>{
 const {PubSub}=cliRequire('@google-cloud/pubsub');
 const client=new PubSub({projectId:'demo-pradeep-biswal'});
 try{
  const topic=client.topic('compatibility-test');
  assert.equal(topic.name,'projects/demo-pradeep-biswal/topics/compatibility-test');
  assert.equal(typeof topic.create,'function');
  assert.equal(typeof topic.createSubscription,'function');
  assert.equal(typeof topic.subscription('test').on,'function');
 }finally{await client.close();}
});
