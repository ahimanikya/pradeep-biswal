const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {exportDocuments, privateDirectory, saveBackup, readBackup, emulatorApi, restoreForVerification} = require('../tools/private-backup.cjs');
const root = 'projects/demo-backup-unit/databases/(default)/documents';
const record = (p,fields={})=>({name:root+'/'+p, fields, createTime:'2026-01-01T00:00:00Z'});

test('Export follows both pagination tokens and subcollections of missing parents',async()=>{
  const times=[];
  const api = {
    async post(p,b){times.push(b.readTime);if(p===root+':listCollectionIds') return b.pageToken ? {collectionIds:['empty']} : {collectionIds:['articles'],nextPageToken:'collections2'};if(p===root+'/articles/missing:listCollectionIds') return {collectionIds:['comments']};return {};},
    async get(p,q){times.push(q.readTime);assert.equal(q.showMissing,true);if(p===root+'/articles') return q.pageToken ? {documents:[record('articles/one')]} : {documents:[{name:root+'/articles/missing'}],nextPageToken:'docs2'};if(p.endsWith('/comments')) return {documents:[record('articles/missing/comments/a',{text:{stringValue:'private fixture'},n:{integerValue:'9007199254740993'}})]};return {};}
  };
  const b=await exportDocuments(api,'demo-backup-unit','2026-01-01T00:00:01Z');
  assert.deepEqual(b.documents.map(d=>d.path),['articles/missing/comments/a','articles/one']);
  assert.equal(b.documents[0].fields.n.integerValue,'9007199254740993');
  assert.ok(times.every(x=>x==='2026-01-01T00:00:01Z'));
});

test('Private files are restricted, checksummed, non-overwriting, and reject repository symlinks',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pb-backup-test-'));
  try {
    const b={format:'pb-firestore-documents-v1',project:'demo-backup-unit',documents:[{path:'articles/one',fields:{}}]};
    await saveBackup(b,path.join(dir,'backup'));
    const file=path.join(dir,'backup/firestore.json');
    assert.deepEqual(await readBackup(file),b);
    assert.equal((await fs.stat(file)).mode&0o777,0o600);
    assert.equal((await fs.stat(path.dirname(file))).mode&0o777,0o700);
    await assert.rejects(saveBackup(b,path.dirname(file)),/EEXIST/);
    await fs.appendFile(file,' ');await assert.rejects(readBackup(file),/checksum/);
    await assert.rejects(privateDirectory(path.resolve(__dirname,'../../archive/private-test')),/public Git/);
    await fs.symlink(path.resolve(__dirname,'../..'),path.join(dir,'public-link'));
    await assert.rejects(privateDirectory(path.join(dir,'public-link/private-test')),/public Git/);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('Restoration refuses remote hosts, real projects and non-empty targets',async()=>{
  assert.throws(()=>emulatorApi('example.com:8085','demo-test'),/restricted/);
  assert.throws(()=>emulatorApi('127.0.0.1:8085','pradeep-biswal'),/restricted/);
  await assert.rejects(restoreForVerification({documents:[]},{},'pradeep-biswal'),/demo/);
  let commits=0;
  const api={post:async p=>{if(p.endsWith(':commit')) commits++;return {collectionIds:p===root+':listCollectionIds'?['articles']:[]};},get:async()=>({documents:[record('articles/one')]})};
  await assert.rejects(restoreForVerification({documents:[]},api,'demo-backup-unit'),/not empty/);
  assert.equal(commits,0);
});

test('Typed fields round-trip in the local emulator',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
  const project='demo-backup-fixture-'+Date.now();
  const api=emulatorApi(process.env.FIRESTORE_EMULATOR_HOST,project);
  const b={documents:[{path:'inbox/one',fields:{text:{stringValue:'Synthetic private message'},large:{integerValue:'9007199254740993'},time:{timestampValue:'2026-01-01T00:00:00Z'},blob:{bytesValue:'aGk='},list:{arrayValue:{values:[{booleanValue:true},{nullValue:null}]}},map:{mapValue:{fields:{x:{doubleValue:1.25}}}},reference:{referenceValue:root+'/articles/one'}}},{path:'missing/parent/children/one',fields:{name:{stringValue:'Synthetic review'}}},{path:'empty/document',fields:{}}]};
  assert.equal((await restoreForVerification(b,api,project)).verifiedDocuments,3);
  await assert.rejects(restoreForVerification(b,api,project),/not empty/);
});
