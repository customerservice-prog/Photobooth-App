import test from 'node:test';
import assert from 'node:assert/strict';
import {syncEventPhotos,tokenKey,backupStatusKey,readBackupStatus,backupStatusLabel,eventBackupProof} from '../app/lib/backup-sync.mjs';
import {workspace} from '../app/lib/event-workspace.mjs';

function memory(seed={}){const map=new Map(Object.entries(seed));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
const jpg=value=>new Blob([new Uint8Array([255,216,value,255,217])],{type:'image/jpeg'});
const capture=(id='capture-one',poses=4)=>({id,poses:Array.from({length:poses},(_,i)=>jpg(i+1)),collage:jpg(20),keepsake:jpg(30)});
const ok=value=>Response.json(value);
function client({eventId='event-one',storage=memory(),records=[capture()],fetch}={}){
 const calls=[];
 return {storage,records,calls,options:{storage,eventId,scope:'transfer:'+eventId,syncTicket:'protected-proof-'+eventId,isOnline:()=>true,
  list:async()=>records,fetch:async(url,options)=>{calls.push({url,...options});return fetch?fetch(url,options):ok(url.endsWith('/authorize')?{token:'upload-token-'+eventId}:{ok:true});}}};
}
const uploads=proof=>proof.calls.filter(c=>c.url.endsWith('/image'));

test('a loaded protected event automatically authorizes and saves every original and finished image',async()=>{
 const storage=memory({otherEvent:'unchanged',printUsage:'17'}),proof=client({storage});
 const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'ready');assert.equal(result.saved,6);assert.equal(result.pending,0);
 assert.deepEqual(JSON.parse(proof.calls[0].body),{eventId:'event-one',syncTicket:'protected-proof-event-one'});
 assert.deepEqual(uploads(proof).map(c=>c.headers['X-Booth-Kind']),['pose-1','pose-2','pose-3','pose-4','collage','keepsake']);
 assert(uploads(proof).every(c=>c.headers['X-Booth-Event']==='event-one'&&c.headers.Authorization==='Bearer upload-token-event-one'));
 assert.equal(storage.getItem('otherEvent'),'unchanged');assert.equal(storage.getItem('printUsage'),'17');
 assert.equal(readBackupStatus(storage,'event-one').lastSyncedAt,result.lastSyncedAt);
 assert(!storage.getItem(backupStatusKey('event-one')).includes('protected-proof'));
 assert(!storage.getItem(backupStatusKey('event-one')).includes('upload-token'));
});
test('reopening an acknowledged event does not upload identical files twice',async()=>{
 const proof=client();await syncEventPhotos(proof.options);const before=proof.calls.length;
 const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'ready');assert.equal(result.uploaded,0);assert.equal(proof.calls.length,before);
});
test('old or expired acknowledgment markers cannot claim the backend still holds the photographs',async()=>{
 let now=Date.now();const proof=client();proof.options.now=()=>now;
 await syncEventPhotos(proof.options);const before=proof.calls.length;
 now+=29*86400000;
 const stale=readBackupStatus(proof.storage,'event-one',{now:()=>now});
 assert.equal(stale.state,'retry-later');assert.equal(stale.saved,0);assert.equal(stale.pending,6);
 const refreshed=await syncEventPhotos(proof.options);
 assert.equal(refreshed.state,'ready');assert.equal(refreshed.uploaded,6);assert.equal(proof.calls.length-before,6);
 assert.equal(readBackupStatus(proof.storage,'event-one',{now:()=>now}).saved,6);
 const poseKey='friendly-booth-uploaded-v1-transfer:event-one-capture-one-pose-1';
 proof.storage.setItem(poseKey,'yes');const migrated=await syncEventPhotos(proof.options);
 assert.equal(migrated.uploaded,1);assert.equal(JSON.parse(proof.storage.getItem(poseKey)).confirmedAt,now);
});
test('an unsigned event never obtains a background token or claims server backup',async()=>{
 const proof=client();delete proof.options.syncTicket;
 const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'needs-staff');assert.equal(result.pending,6);assert.equal(result.saved,0);assert.equal(proof.calls.length,0);
 const authorized=await syncEventPhotos({...proof.options,allowStaffAuthorization:true});
 assert.equal(authorized.state,'ready');assert.deepEqual(JSON.parse(proof.calls[0].body),{eventId:'event-one'});
});
test('an expired upload ticket is renewed for the same event and the failed image retries once',async()=>{
 const storage=memory({[tokenKey('event-one')]:'expired'});
 const proof=client({storage,fetch:async(url,options)=>url.endsWith('/authorize')?ok({token:'fresh'}):
  options.headers.Authorization==='Bearer expired'?new Response('Expired',{status:401}):ok({ok:true})});
 const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'ready');assert.equal(result.uploaded,6);
 assert.equal(proof.calls.filter(c=>c.url.endsWith('/authorize')).length,1);
 assert.equal(uploads(proof).length,7);
 assert.equal(uploads(proof)[0].headers['X-Booth-Capture'],uploads(proof)[1].headers['X-Booth-Capture']);
 assert.equal(uploads(proof)[0].headers['X-Booth-Kind'],uploads(proof)[1].headers['X-Booth-Kind']);
 assert.equal(storage.getItem(tokenKey('event-one')),'fresh');
});
test('repeated 401 does not loop or acknowledge any photograph',async()=>{
 const storage=memory({[tokenKey('event-rejected')]:'expired'});
 const proof=client({eventId:'event-rejected',storage,fetch:async url=>url.endsWith('/authorize')?ok({token:'fresh'}):new Response('Expired',{status:401})});
 const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'needs-event-link');assert.equal(result.saved,0);assert.equal(result.pending,6);
 assert.equal(proof.calls.filter(c=>c.url.endsWith('/authorize')).length,1);assert.equal(uploads(proof).length,2);
 const before=proof.calls.length;
 const timerRetry=await syncEventPhotos(proof.options);
 assert.equal(timerRetry.state,'needs-event-link');assert.equal(proof.calls.length,before,'the same rejected event proof must not spin on a timer');
 await syncEventPhotos({...proof.options,syncTicket:'a-fresh-protected-event-link'});
 assert(proof.calls.length>before,'a fresh event link allows a new authorization attempt');
});
test('offline photos remain queued and save on the next online run',async()=>{
 const proof=client();const before=proof.records.map(r=>r.poses.slice());
 const offline=await syncEventPhotos({...proof.options,online:false});
 assert.equal(offline.state,'offline');assert.equal(offline.pending,6);assert.equal(proof.calls.length,0);
 assert.deepEqual(proof.records.map(r=>r.poses),before);
 const online=await syncEventPhotos(proof.options);assert.equal(online.state,'ready');assert.equal(online.saved,6);
});
test('an interrupted upload keeps only server-acknowledged markers and retries remaining files',async()=>{
 let fail=true;
 const proof=client({fetch:async(url,options)=>url.endsWith('/authorize')?ok({token:'valid'}):
  fail&&options.headers['X-Booth-Kind']==='pose-3'?new Response('Unavailable',{status:503}):ok({ok:true})});
 const first=await syncEventPhotos(proof.options);
 assert.equal(first.state,'retry-later');assert.equal(first.saved,2);assert.equal(first.pending,4);
 fail=false;const offset=uploads(proof).length,result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'ready');assert.deepEqual(uploads(proof).slice(offset).map(c=>c.headers['X-Booth-Kind']),['pose-3','pose-4','collage','keepsake']);
});
test('network failures, rejected authorization and malformed acknowledgments never say saved',async()=>{
 for(const [index,fetch] of [async()=>{throw new Error('offline');},async()=>new Response('Unauthorized',{status:401}),async url=>ok(url.endsWith('/authorize')?{token:'valid'}:{ok:false})].entries()){
  const proof=client({eventId:'event-network-'+index,fetch});const result=await syncEventPhotos(proof.options);
  assert.notEqual(result.state,'ready');assert.equal(result.saved,0);assert.equal(result.pending,6);
 }
});
test('full backend storage keeps all local files and stops automatic repeated attempts until staff retries',async()=>{
 let full=true;
 const proof=client({fetch:async url=>url.endsWith('/authorize')?ok({token:'valid'}):full?Response.json({ok:false,code:'EVENT_BACKUP_STORAGE_LIMIT'},{status:507}):ok({ok:true})});
 const first=await syncEventPhotos(proof.options);
 assert.equal(first.state,'storage-full');assert.equal(first.pending,6);assert.equal(first.saved,0);
 assert.match(backupStatusLabel(first),/storage is full/);
 const before=proof.calls.length;await syncEventPhotos(proof.options);assert.equal(proof.calls.length,before);
 full=false;const retry=await syncEventPhotos({...proof.options,forceRetry:true});assert.equal(retry.state,'ready');
});
test('a new saved pose or keepsake during an upload prompts a second scan without overlapping requests',async()=>{
 let release,started;const paused=new Promise(resolve=>{release=resolve;}),signal=new Promise(resolve=>{started=resolve;});
 let active=0,maxActive=0,first=true;
 const record={id:'growing-capture',poses:[jpg(1)],collage:null,keepsake:null};
 const proof=client({records:[record],fetch:async url=>{
  if(url.endsWith('/authorize'))return ok({token:'valid'});
  active++;maxActive=Math.max(maxActive,active);
  if(first){first=false;started();await paused;}
  active--;return ok({ok:true});
 }});
 const run=syncEventPhotos(proof.options);await signal;
 record.poses.push(jpg(2));record.collage=jpg(20);record.keepsake=jpg(30);
 const queued=syncEventPhotos(proof.options);assert.equal(queued,run);release();
 const result=await run;
 assert.equal(result.state,'ready');assert.equal(result.saved,4);assert.equal(maxActive,1);
 assert.deepEqual(uploads(proof).map(c=>c.headers['X-Booth-Kind']),['pose-1','pose-2','collage','keepsake']);
});
test('different events have distinct tokens, queue markers and concurrent progress',async()=>{
 const storage=memory(),one=client({storage,eventId:'event-one'}),two=client({storage,eventId:'event-two'});
 const results=await Promise.all([syncEventPhotos(one.options),syncEventPhotos(two.options)]);
 assert(results.every(r=>r.state==='ready'));
 assert.equal(storage.getItem(tokenKey('event-one')),'upload-token-event-one');assert.equal(storage.getItem(tokenKey('event-two')),'upload-token-event-two');
 assert(uploads(one).every(c=>c.headers['X-Booth-Event']==='event-one'));assert(uploads(two).every(c=>c.headers['X-Booth-Event']==='event-two'));
 assert.equal(readBackupStatus(storage,'event-one').saved,6);assert.equal(readBackupStatus(storage,'event-two').saved,6);
});
test('a changed keepsake is backed up again while acknowledged originals remain untouched',async()=>{
 const proof=client();await syncEventPhotos(proof.options);const offset=proof.calls.length;
 proof.records[0].keepsake=jpg(40);const result=await syncEventPhotos(proof.options);
 assert.equal(result.state,'ready');assert.equal(result.uploaded,1);
 assert.deepEqual(proof.calls.slice(offset).map(c=>c.headers['X-Booth-Kind']),['keepsake']);
 assert.equal(await proof.calls.at(-1).body.text(),await jpg(40).text());
});
test('a background connectivity change during upload retains all outstanding files',async()=>{
 let online=true;
 const proof=client({fetch:async url=>{if(url.endsWith('/authorize'))return ok({token:'valid'});online=false;return ok({ok:true});}});
 const first=await syncEventPhotos({...proof.options,isOnline:()=>online});
 assert.equal(first.state,'offline');assert.equal(first.saved,1);assert.equal(first.pending,5);
});
test('protected setup proof is read only from its matching real event and never a sample or another event',()=>{
 const event=workspace('?booth_event=event-one'),storage=memory({[event.config]:JSON.stringify({eventId:'event-one',adminHandoff:{syncTicket:'matching-proof'}})});
 assert.equal(eventBackupProof(storage,event),'matching-proof');
 assert.equal(eventBackupProof(storage,{...event,id:'event-two'}),null);
 assert.equal(eventBackupProof(storage,{...event,demo:true}),null);
 assert.equal(eventBackupProof(storage,{...event,imported:false}),null);
 storage.setItem(event.config,'bad json');assert.equal(eventBackupProof(storage,event),null);
});
test('corrupt or invented progress cannot report a ready gallery',()=>{
 const storage=memory({[backupStatusKey('event-one')]:JSON.stringify({eventId:'event-two',state:'ready',total:3,saved:3,pending:0})});
 assert.equal(readBackupStatus(storage,'event-one').state,'not-started');
 storage.setItem(backupStatusKey('event-one'),JSON.stringify({eventId:'event-one',state:'ready',total:3,saved:3,pending:1}));
 assert.equal(readBackupStatus(storage,'event-one').state,'not-started');
});
