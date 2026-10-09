import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validEventBackupProof,verifyEventBackupProof} from '../app/lib/backup-event-proof.mjs';
import {checkSyncTicket} from '../../admin/lib/event-sync-token.mjs';

const adminOrigin='https://photobooth-app-production.up.railway.app';
const boothOrigin='https://photobooth-booth-production.up.railway.app';
const eventId='approved-event-proof';
const signingSecret='test-only-owner-sync-signing-secret-with-enough-characters';
function ticket(id=eventId,expires=Date.now()+60000,secret=signingSecret){
 const payload=Buffer.from(JSON.stringify({id,expires})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
async function withAuthority(run){
 const before=process.env.PHOTOBOOTH_EVENT_SYNC_SECRET;
 process.env.PHOTOBOOTH_EVENT_SYNC_SECRET=signingSecret;
 try{return await run();}
 finally{if(before===undefined)delete process.env.PHOTOBOOTH_EVENT_SYNC_SECRET;else process.env.PHOTOBOOTH_EVENT_SYNC_SECRET=before;}
}
function authority({exists=true}={}){
 let calls=0,cancellations=0;
 return {
  get calls(){return calls;},get cancellations(){return cancellations;},
  async fetch(url,options){
   calls++;
   assert.equal(url,adminOrigin+'/api/booth/sync/'+eventId);
   assert.equal(options.method,'GET');
   assert.equal(options.headers.Origin,boothOrigin);
   assert.equal(options.redirect,'manual');
   assert.equal(options.credentials,'omit');
   assert.equal(options.cache,'no-store');
   assert.equal(options.signal.aborted,false);
   const approved=checkSyncTicket(options.headers.Authorization.slice(7),eventId);
   return new Response(new ReadableStream({cancel(){cancellations++;}}),{status:approved?(exists?200:404):401});
  }
 };
}

test('the pinned admin authority accepts an authentic event-scoped owner ticket and cancels unread artwork',async()=>{
 await withAuthority(async()=>{
  const server=authority();
  assert.equal(await verifyEventBackupProof(eventId,ticket(),{fetch:server.fetch}),'authorized');
  assert.equal(server.calls,1);
  assert.equal(server.cancellations,1);
 });
});

test('the actual owner verifier rejects forged, expired and wrong-event proofs',async()=>{
 await withAuthority(async()=>{
  const cases=[ticket(eventId,Date.now()+60000,'wrong-owner-secret'),ticket(eventId,Date.now()-1000),ticket('other-approved-event')];
  for(const proof of cases){
   const server=authority();
   assert.equal(validEventBackupProof(eventId,proof),true,'syntax alone must not authorize');
   assert.equal(await verifyEventBackupProof(eventId,proof,{fetch:server.fetch}),'invalid');
   assert.equal(server.calls,1);
   assert.equal(server.cancellations,1);
  }
 });
});

test('a signed event ticket cannot authorize an event that no longer exists',async()=>{
 await withAuthority(async()=>{
  const server=authority({exists:false});
  assert.equal(await verifyEventBackupProof(eventId,ticket(),{fetch:server.fetch}),'invalid');
  assert.equal(server.cancellations,1);
 });
});

test('malformed IDs and tickets never create outbound requests',async()=>{
 const malformed=[['no',ticket()],['event/path',ticket()],['https://attacker.example/event',ticket()],['e'.repeat(91),ticket()],
  [eventId,null],[eventId,123],[eventId,''],[eventId,'unsigned'],[eventId,'a'.repeat(401)+'.'+'a'.repeat(43)],
  [eventId,'a.'+'a'.repeat(42)],[eventId,ticket()+'\r\nOrigin: https://attacker.example']];
 for(const [id,proof] of malformed){
  let called=false;
  assert.equal(await verifyEventBackupProof(id,proof,{fetch:async()=>{called=true;throw new Error('must not contact the network');}}),'invalid');
  assert.equal(called,false);
 }
});

test('redirect and non-success authority responses fail closed without following their target',async()=>{
 for(const status of [204,301,302,307,308,429,500,503]){
  let calls=0,cancelled=false;
  const result=await verifyEventBackupProof(eventId,ticket(),{fetch:async(url,options)=>{
   calls++;assert.equal(url,adminOrigin+'/api/booth/sync/'+eventId);assert.equal(options.redirect,'manual');
   return {status,body:{cancel:async()=>{cancelled=true;}}};
  }});
  assert.equal(result,'unavailable',String(status));
  assert.equal(calls,1);
  assert.equal(cancelled,true);
 }
});

test('network failures and timeout return only sanitized availability results',async()=>{
 assert.equal(await verifyEventBackupProof(eventId,ticket(),{fetch:async()=>{throw new Error('Bearer private-owner-ticket / private-infrastructure');}}),'unavailable');
 let signal;
 const result=await verifyEventBackupProof(eventId,ticket(),{timeoutMs:5,fetch:async(url,options)=>{
  signal=options.signal;
  return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('private-network-timeout')),{once:true}));
 }});
 assert.equal(result,'unavailable');
 assert.equal(signal.aborted,true);
});
