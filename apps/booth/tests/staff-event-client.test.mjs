import test from 'node:test';
import assert from 'node:assert/strict';
import {applyStaffEvent,fetchStaffEvent,fetchStaffEvents,saveStaffEvent,StaffEventError} from '../app/lib/staff-event-client.mjs';
import {workspace} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {tokenKey} from '../app/lib/backup-sync.mjs';
import {configFromBoothHandoff} from '../app/lib/booth-handoff.mjs';

const payload={v:1,id:'staff-event-proof',title:'Jordan and Avery',date:'2026-10-10',start:'16:00',end:'20:00',rev:'2026-10-09T14:00:00.000Z',type:'wedding',f:'four',p:6,mode:'card',s:1,fit:'fill',a:'#24352f',b:'#d8c49b',limit:108,on:true,qr:true,design:'fpr-wedding',name:'Jordan & Avery',guest:'approved'};
const ticket='private-event-ticket.'+'a'.repeat(43),scope=workspace('?booth_event='+payload.id);
function storage(seed={},fail){
 const data=new Map(Object.entries(seed));let writes=0;
 return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>{writes++;if(fail?.(key,writes))throw new Error('Storage quota reached.');data.set(key,String(value));},removeItem:key=>data.delete(key),snapshot:()=>Object.fromEntries(data)};
}
const response=(data,status=200)=>Response.json(data,{status});

test('starting an event stores one approved layout and backup authorization without touching photos or print counts',()=>{
 const previous=JSON.stringify({...configFromBoothHandoff(payload),adminHandoff:{revision:'2026-10-08T14:00:00.000Z',syncTicket:'previous-owner-proof.'+'c'.repeat(43)}});
 const saved=storage({[scope.config]:previous,[scope.usage]:'31',[scope.photos]:'preserved-originals',[ACTIVE_EVENT_KEY]:'different-event','friendly-booth-transfer-v1-different-event-usage':'19'});
 const result=applyStaffEvent(saved,{payload,token:ticket});
 assert.equal(result.scope.home,'/?booth_event=staff-event-proof');
 assert.equal(result.config.defaultTemplate,'fpr-wedding');assert.equal(result.config.guestMode,'approved');
 assert.equal(result.config.adminHandoff.source,'staff');assert.equal(result.config.adminHandoff.syncTicket,null);assert.equal(result.printsUsed,31);
 assert.equal(saved.getItem(scope.usage),'31');assert.equal(saved.getItem(scope.photos),'preserved-originals');
 assert.equal(saved.getItem('friendly-booth-transfer-v1-different-event-usage'),'19');
 assert.equal(saved.getItem(scope.previous),previous);assert.equal(saved.getItem(tokenKey(payload.id)),ticket);
 assert.equal(saved.getItem(ACTIVE_EVENT_KEY),payload.id);
});

test('background updates retain the existing backup token and never select a different active event',()=>{
 const saved=storage({[tokenKey(payload.id)]:ticket,[ACTIVE_EVENT_KEY]:'other-event',[scope.usage]:'17'});
 applyStaffEvent(saved,{payload},{activate:false});
 assert.equal(saved.getItem(ACTIVE_EVENT_KEY),'other-event');assert.equal(saved.getItem(tokenKey(payload.id)),ticket);
 assert.equal(saved.getItem(scope.usage),'17');assert.equal(JSON.parse(saved.getItem(scope.config)).adminHandoff.source,'staff');
});

test('a first start requires valid automatic photo backup authorization before any local settings change',()=>{
 for(const token of [undefined,'',123,'invalid-token','event.'+'a'.repeat(42)]){
  const saved=storage({[ACTIVE_EVENT_KEY]:'other-event',[scope.photos]:'photos'}),before=saved.snapshot();
  assert.throws(()=>applyStaffEvent(saved,{payload,token}),/Photo saving is not ready/);
  assert.deepEqual(saved.snapshot(),before);
 }
});

test('storage failures at every stage restore config, previous settings, usage, token and active event',()=>{
 const priorPayload={...payload,rev:'2026-10-08T14:00:00.000Z'};
 const seed={[scope.config]:JSON.stringify(configFromBoothHandoff(priorPayload)),[scope.previous]:'older-settings',[scope.usage]:'31',[scope.photos]:'original-photo-bytes',[tokenKey(payload.id)]:'old-ticket.'+'b'.repeat(43),[ACTIVE_EVENT_KEY]:'other-event'};
 // Existing events write previous, config, source-marked config, token and active.
 for(let failedWrite=1;failedWrite<=5;failedWrite++){
  const saved=storage(seed,(_,write)=>write===failedWrite),before=saved.snapshot();
  assert.throws(()=>applyStaffEvent(saved,{payload,token:ticket}));
  assert.deepEqual(saved.snapshot(),before,'failed write '+failedWrite);
 }
 // A new event also allocates the counter; all newly allocated keys are removed.
 for(let failedWrite=1;failedWrite<=5;failedWrite++){
  const saved=storage({[ACTIVE_EVENT_KEY]:'other-event',[scope.photos]:'original-photo-bytes'},(_,write)=>write===failedWrite),before=saved.snapshot();
  assert.throws(()=>applyStaffEvent(saved,{payload,token:ticket}));assert.deepEqual(saved.snapshot(),before);
 }
});

test('invalid event payloads and older revisions never change local state',()=>{
 const newer={...payload,rev:'2026-10-10T14:00:00.000Z'};
 const saved=storage({[scope.config]:JSON.stringify(configFromBoothHandoff(newer)),[scope.usage]:'4',[tokenKey(payload.id)]:ticket}),before=saved.snapshot();
 assert.throws(()=>applyStaffEvent(saved,{payload:{...payload,title:'<script>'},token:ticket}),/not a valid/);
 assert.throws(()=>applyStaffEvent(saved,{payload,token:ticket}),/older setup link/);
 assert.deepEqual(saved.snapshot(),before);
});

test('staff event selection downloads the bounded validated setup from the booth origin',async()=>{
 const calls=[];
 const actual=await fetchStaffEvent(payload.id,undefined,{fetch:async(url,options)=>{calls.push({url,options});return response({payload,token:ticket});}});
 assert.deepEqual(actual,{payload,token:ticket});
 assert.equal(calls[0].url,'/api/staff/events/staff-event-proof');
 assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.cache,'no-store');
 assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.method,'GET');
});

test('background setup reads use only the existing event token and allow a tokenless valid response',async()=>{
 let options;
 const actual=await fetchStaffEvent(payload.id,ticket,{fetch:async(_,value)=>{options=value;return response({payload});}});
 assert.equal(options.headers.Authorization,'Bearer '+ticket);assert.deepEqual(actual,{payload});
});

test('starting saves the selected layout once with its revision and optional custom artwork',async()=>{
 const changes={revision:payload.rev,design:'fpr-wedding',nameOnPrint:'Jordan & Avery'};let calls=0;
 const actual=await saveStaffEvent(payload.id,changes,{fetch:async(url,options)=>{
  calls++;assert.equal(url,'/api/staff/events/staff-event-proof');assert.equal(options.method,'POST');
  assert.equal(options.headers['Content-Type'],'application/json');assert.deepEqual(JSON.parse(options.body),changes);
  return response({payload,token:ticket});
 }});
 assert.equal(calls,1);assert.deepEqual(actual,{payload,token:ticket});
});

test('expired staff sessions and revision conflicts preserve their actionable status',async()=>{
 for(const status of [401,409,503]){
  await assert.rejects(()=>saveStaffEvent(payload.id,{},{fetch:async()=>response({error:'Safe event error'},status)}),error=>error instanceof StaffEventError&&error.status===status&&error.message==='Safe event error');
 }
});

test('event lists expose only valid choices; wrong-event and malformed setup responses are rejected',async()=>{
 const events=[{id:payload.id,title:payload.title,date:payload.date,eventType:'Wedding',revision:payload.rev,design:payload.design}];
 assert.deepEqual(await fetchStaffEvents({fetch:async()=>response({events})}),events);
 for(const data of [{events:null},{events:[{id:'../private',title:'Bad',date:payload.date}]}])await assert.rejects(()=>fetchStaffEvents({fetch:async()=>response(data)}),/event list could not be read/);
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{fetch:async()=>response({payload:{...payload,id:'different-event'},token:ticket})}),/different event/);
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{fetch:async()=>response({payload,token:'forged'})}),/could not be authorized/);
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{fetch:async()=>new Response('invalid JSON')}),/could not be read/);
});

test('oversized event responses stop before parsing or applying artwork',async()=>{
 const oversized=()=>new Response('x'.repeat(902049));
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{fetch:async()=>oversized()}),/artwork is too large/);
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{fetch:async()=>new Response('{}',{headers:{'Content-Length':'902049'}})}),/artwork is too large/);
});

test('invalid paths and tokens never make requests, while caller cancellation reaches the actual fetch',async()=>{
 let calls=0;const send=async()=>{calls++;return response({payload});};
 for(const id of ['../event','ab','event?other=one'])await assert.rejects(()=>fetchStaffEvent(id,undefined,{fetch:send}),/Choose an event/);
 await assert.rejects(()=>fetchStaffEvent(payload.id,'malformed',{fetch:send}),/could not be authorized/);
 assert.equal(calls,0);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>fetchStaffEvent(payload.id,undefined,{signal:controller.signal,fetch:async(_,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException('Aborted','AbortError');}}),{name:'AbortError'});
});
