import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validEventBackupProof,verifyEventBackupProof} from '../../booth/app/lib/backup-event-proof.mjs';
import {checkSyncTicket} from '../lib/event-sync-token.mjs';

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
