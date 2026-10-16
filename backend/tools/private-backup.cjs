// Private Firestore document export. Never writes to the production database.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const REPO = path.resolve(__dirname, '../..');
const PROJECT = 'pradeep-biswal';
const rootFor = project => `projects/${project}/databases/(default)/documents`;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

async function exportDocuments(api, project, readTime) {
  const root = rootFor(project), documents = [], parents = [root];
  // Missing parents can still contain real subcollections; traverse their names.
  async function children(parent) {
    let pageToken;
    do {
      const collections = await api.post(`${parent}:listCollectionIds`, {pageSize: 100, readTime, ...(pageToken ? {pageToken} : {})});
      for (const id of collections.collectionIds || []) {
        let token;
        do {
          const page = await api.get(`${parent}/${id}`, {pageSize: 100, showMissing: true, readTime, ...(token ? {pageToken: token} : {})});
          for (const doc of page.documents || []) {
            if (!doc.name?.startsWith(root + '/')) throw new Error('Unexpected document path');
            parents.push(doc.name);
            if (doc.createTime || doc.updateTime || doc.fields) documents.push({path: doc.name.slice(root.length + 1), fields: doc.fields || {}, createTime: doc.createTime, updateTime: doc.updateTime});
          }
          token = page.nextPageToken;
        } while (token);
      }
      pageToken = collections.nextPageToken;
    } while (pageToken);
  }
  while (parents.length) await Promise.all(parents.splice(0, 6).map(children));
  documents.sort((a,b) => a.path.localeCompare(b.path));
  if (new Set(documents.map(d => d.path)).size !== documents.length) throw new Error('Duplicate document paths');
  return {format: 'pb-firestore-documents-v1', project, database: '(default)', readTime, exportedAt: new Date().toISOString(), documents};
}

async function privateDirectory(destination) {
  const resolved = path.resolve(destination);
  // Resolve existing ancestors first so a symlink cannot bypass the public-repo guard.
  let ancestor = resolved, remainder = [];
  while (true) {
    try { ancestor = await fs.realpath(ancestor); break; }
    catch (e) { if (e.code !== 'ENOENT') throw e; remainder.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  }
  const real = path.join(ancestor, ...remainder);
  if (real === REPO || real.startsWith(REPO + path.sep)) throw new Error('Private exports must be outside the public Git repository');
  await fs.mkdir(real, {recursive:true, mode:0o700});
  await fs.chmod(real, 0o700);
  return real;
}

async function saveBackup(backup, destination) {
  const dir = await privateDirectory(destination);
  const data = JSON.stringify(backup, null, 2) + '\n';
  await fs.writeFile(path.join(dir, 'firestore.json'), data, {mode:0o600, flag:'wx'});
  await fs.writeFile(path.join(dir, 'SHA256SUMS'), digest(data) + '  firestore.json\n', {mode:0o600, flag:'wx'});
  return {documents:backup.documents.length, directory:dir};
}

async function readBackup(filename) {
  const raw = await fs.readFile(filename, 'utf8');
  const expected = (await fs.readFile(path.join(path.dirname(filename), 'SHA256SUMS'), 'utf8')).split(/\s/)[0];
  if (digest(raw) !== expected) throw new Error('Backup checksum mismatch');
  const backup = JSON.parse(raw);
  if (backup.format !== 'pb-firestore-documents-v1' || !Array.isArray(backup.documents)) throw new Error('Unknown backup format');
  const names = new Set();
  for (const doc of backup.documents) {
    const segments = doc.path?.split('/') || [];
    if (!segments.length || segments.length % 2 || segments.some(s => !s || s === '.' || s === '..') || names.has(doc.path)) throw new Error('Invalid or duplicate backup path');
    names.add(doc.path);
  }
  return backup;
}

function emulatorApi(host, project) {
  if (!/^127\.0\.0\.1:\d+$/.test(host) || !/^demo-[a-z0-9-]+$/.test(project)) throw new Error('Restoration is restricted to a loopback emulator and a demo project');
  async function call(method, route, data) {
    const url = new URL(`http://${host}/v1/${route}`);
    if (method === 'GET') for (const [k,v] of Object.entries(data || {})) if (v !== undefined) url.searchParams.set(k,v);
    const r = await fetch(url, {method, headers:{Authorization:'Bearer owner','Content-Type':'application/json'}, body:method==='GET'?undefined:JSON.stringify(data)});
    if (!r.ok) throw new Error(`Emulator request failed: ${r.status}`);
    return r.json();
  }
  return {get:(p,q)=>call('GET',p,q), post:(p,b)=>call('POST',p,b)};
}

async function restoreForVerification(backup, api, project) {
  if (!/^demo-[a-z0-9-]+$/.test(project)) throw new Error('Only demo project restoration is supported');
  const existing = await exportDocuments(api, project);
  if (existing.documents.length) throw new Error('Verification target is not empty; no documents were written');
  const root = rootFor(project);
  for (let i=0;i<backup.documents.length;i+=100) {
    const writes = backup.documents.slice(i,i+100).map(d=>({update:{name:`${root}/${d.path}`, fields:d.fields}, currentDocument:{exists:false}}));
    await api.post(`${root}:commit`, {writes});
  }
  const restored = await exportDocuments(api, project);
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
  const content = b => JSON.stringify(canonical(b.documents.map(({path,fields})=>({path,fields})).sort((a,b)=>a.path.localeCompare(b.path))));
  if (content(backup) !== content(restored)) throw new Error('Restored document paths or field values differ');
  return {verifiedDocuments:restored.documents.length, destination:'local emulator', timestampsPreserved:false};
}

async function main() {
  const [mode, arg, host, project] = process.argv.slice(2);
  if (mode === 'export' && arg) {
    await privateDirectory(arg); // Reject unsafe destinations before requesting private data.
    const {Client} = require('firebase-tools/lib/apiv2');
    const {getGlobalDefaultAccount} = require('firebase-tools/lib/auth');
    const {requireAuth} = require('firebase-tools/lib/requireAuth');
    await requireAuth({...getGlobalDefaultAccount(), project:PROJECT});
    const client = new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
    const options = {skipLog:{body:true,resBody:true,queryParams:true}};
    const api = {get:async(p,q)=>(await client.get('/'+p,{...options,queryParams:q})).body,post:async(p,b)=>(await client.post('/'+p,b,{...options})).body};
    const readTime = new Date(Date.now()-5000).toISOString();
    console.log(JSON.stringify(await saveBackup(await exportDocuments(api, PROJECT, readTime), arg)));
  } else if (mode === 'verify-restore' && arg && host && project) {
    const api = emulatorApi(host, project);
    console.log(JSON.stringify(await restoreForVerification(await readBackup(arg), api, project)));
  } else throw new Error('Usage: private-backup.cjs export /private/destination | verify-restore /private/backup/firestore.json 127.0.0.1:8085 demo-backup-check');
}
module.exports = {exportDocuments, privateDirectory, saveBackup, readBackup, emulatorApi, restoreForVerification};
if (require.main === module) main().catch(()=>{console.error('Backup operation failed. No private data is printed. Check authentication, destination permissions and the local emulator; retain any partial export privately.');process.exitCode=1;});
