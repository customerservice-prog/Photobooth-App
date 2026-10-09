import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validEventBackupProof,verifyEventBackupProof} from '../app/lib/backup-event-proof.mjs';

const adminOrigin='https://photobooth-app-production.up.railway.app';
const boothOrigin='https://photobooth-booth-production.up.railway.app';
const eventId='approved-event-proof';
const signingSecret='test-only-owner-sync-signing-secret-with-enough-characters';
function ticket(id=eventId,expires=Date.now()+60000,secret=signingSecret){
 const payload=Buffer.from(JSON.stringify({id,expires})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
test('the pinned admin response boundary accepts only verified success and rejects invalid proofs',async()=>{
 for(const [status,expected] of [[200,'authorized'],[400,'invalid'],[401,'invalid'],[403,'invalid'],[404,'invalid']]){
  let calls=0,cancellations=0;
  const proof=ticket();
  const result=await verifyEventBackupProof(eventId,proof,{fetch:async(url,options)=>{
   calls++;
   assert.equal(url,adminOrigin+'/api/booth/sync/'+eventId);
   assert.equal(options.method,'GET');
   assert.equal(options.headers.Origin,boothOrigin);
   assert.equal(options.headers.Authorization,'Bearer '+proof);
   assert.equal(options.redirect,'manual');
   assert.equal(options.credentials,'omit');
   assert.equal(options.cache,'no-store');
   assert.equal(options.signal.aborted,false);
   return new Response(new ReadableStream({cancel(){cancellations++;}}),{status});
  }});
  assert.equal(result,expected,String(status));
  assert.equal(calls,1);
  assert.equal(cancellations,1);
 }
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
