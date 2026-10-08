import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStaffSession,validStaffSession} from '../app/lib/staff-auth.mjs';
import {assignActiveEvent,activeEventDestination} from '../app/lib/active-event.mjs';
import {listPrintRequests,logPrintRequest,markPrintOutcome} from '../app/lib/print-ledger.mjs';
const secret='test-only-long-secure-staff-session-signature-key';
function store(seed={}){
 const m=new Map(Object.entries(seed));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),dump:()=>Object.fromEntries(m)};
}
test('staff session is signed and expires after fifteen minutes',async()=>{
 const now=Date.now(),value=await makeStaffSession(secret,now);
 assert.equal(await validStaffSession(value,secret,now),true);
 assert.equal(await validStaffSession(value,secret+'x',now),false);
 assert.equal(await validStaffSession(value,secret,now+16*60000),false);
 assert.equal(await validStaffSession(value.slice(0,-1)+'0',secret,now),false);
 assert.equal(await validStaffSession('',secret,now),false);
});
test('only a saved, matching customer event may auto-resume',()=>{
 const storage=store();
 assert.equal(activeEventDestination(storage),null);
 assignActiveEvent(storage,'test-event-2027');
 assert.equal(activeEventDestination(storage),null);
 storage.setItem('friendly-booth-transfer-v1-test-event-2027-config',JSON.stringify({eventId:'test-event-2027'}));
 assert.equal(activeEventDestination(storage),'/?booth_event=test-event-2027');
 assert.equal(storage.getItem('friendly-booth-transfer-v1-test-event-2027-usage'),null);
});
test('a failed print can be credited exactly once without touching another event counter',()=>{
 const scope={id:'oct10-2026',usage:'live-counter',imported:false,demo:false};
 const storage=store({'live-counter':'35','other-counter':'12'});
 const item=logPrintRequest(storage,scope);
 assert.equal(listPrintRequests(storage,scope)[0].status,'requested');
 markPrintOutcome(storage,scope,item.id,'failed');
 assert.equal(storage.getItem('live-counter'),'34');
 assert.equal(storage.getItem('other-counter'),'12');
 assert.throws(()=>markPrintOutcome(storage,scope,item.id,'failed'),/resolved/);
 assert.equal(storage.getItem('live-counter'),'34');
});
test('a manually confirmed print does not credit the allowance',()=>{
 const scope={id:'test-event',usage:'a',imported:true,demo:false},storage=store({a:'2'});
 const x=logPrintRequest(storage,scope);
 markPrintOutcome(storage,scope,x.id,'printed');
 assert.equal(storage.getItem('a'),'2');
});
