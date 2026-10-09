import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIN_SETUP_ORIGIN,MAX_BOOTH_SETUP_BYTES,decodeBoothHandoff,validateBoothHandoff,
 fetchBoothSetup,resolveBoothHandoff,applyBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {createCustomDesign,validateCustomDesign} from '../app/lib/custom-design.mjs';
import {workspace,LEGACY_KEYS,EVENT_KEYS} from '../app/lib/event-workspace.mjs';

const pngBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const sync='e30.'+'A'.repeat(43);
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function customPayload({large=false}={}){
 const spec=createCustomDesign('upload');
 const bytes=large?Buffer.concat([pngBytes,Buffer.alloc(30000)]):pngBytes;
 spec.layouts.one.image='data:image/png;base64,'+bytes.toString('base64');
 spec.layouts.four.image=spec.layouts.one.image;
 spec.heading='Customer approved artwork';
 return {v:1,id:'custom-booth-test',rev:'2026-10-09T14:00:00.000Z',title:'Taylor Celebration',
  date:'2027-06-10',start:'17:00',end:'21:00',type:'graduation',f:'four',p:6,
  mode:'strip',s:1,fit:'fill',a:'#16324f',b:'#ffb24b',limit:108,on:true,qr:true,
  design:'custom',name:'Taylor',year:'2027',guest:'approved',sync,customDesign:spec};
}
const reference=()=>({v:2,id:'custom-booth-test',sync});
function memory(seed={},failOnceOn=null){
 const map=new Map(Object.entries(seed)),writes=[];let shouldFail=Boolean(failOnceOn);
 return {writes,getItem:key=>map.has(key)?map.get(key):null,
  setItem(key,value){writes.push(key);if(shouldFail&&key===failOnceOn){shouldFail=false;throw new DOMException('Storage full','QuotaExceededError');}map.set(key,String(value));},
  removeItem:key=>map.delete(key),snapshot:()=>Object.fromEntries(map)};
}
function seedOtherEvents(){
 const other=workspace('?booth_event=another-customer');
 return {[other.config]:'other-event-settings',[other.usage]:'23',[other.photos]:'other-event-photos',
  [LEGACY_KEYS.config]:'legacy-settings',[LEGACY_KEYS.usage]:'11',[LEGACY_KEYS.photos]:'legacy-photos',
  [EVENT_KEYS.config]:'october-settings',[EVENT_KEYS.liveUsage]:'19',
  'friendly-booth-active-event-v1':'another-customer','friendly-booth-screen-awake-v1':'on'};
}
test('custom QR descriptors contain only an event reference and cannot carry inline artwork or override the fetch origin',()=>{
 assert.deepEqual(decodeBoothHandoff(encode(reference())),reference());
 for(const extra of [{customDesign:createCustomDesign()},{url:'https://attacker.example/setup'},{title:'Injected title'}])
  assert.throws(()=>decodeBoothHandoff(encode({...reference(),...extra})));
 const inline={...customPayload(),customDesign:createCustomDesign()};
 assert.throws(()=>decodeBoothHandoff(encode(inline)),/custom|invalid/i);
 assert.throws(()=>decodeBoothHandoff(encode({...reference(),sync:'not-a-ticket'})));
});
test('protected custom setup resolves from the fixed admin origin with its event-scoped Bearer ticket',async()=>{
 const payload=customPayload(),calls=[];
 const resolved=await resolveBoothHandoff(encode(reference()),{fetch:async(url,options)=>{
  calls.push({url,options});return Response.json(payload);
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,ADMIN_SETUP_ORIGIN+'/api/booth/sync/'+payload.id);
 assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.credentials,'omit');
 assert.equal(calls[0].options.cache,'no-store');
 assert.equal(calls[0].options.headers.Authorization,'Bearer '+sync);
 assert(calls[0].options.signal instanceof AbortSignal);
 assert.deepEqual(resolved.customDesign,validateCustomDesign(payload.customDesign));
 assert.equal(resolved.sync,sync);assert.equal(resolved.id,payload.id);
});
test('protected setup rejects another event, invalid paired artwork and expired authorization before returning anything to apply',async()=>{
 await assert.rejects(()=>fetchBoothSetup(reference(),{fetch:async()=>Response.json({...customPayload(),id:'another-customer'})}),/different event/i);
 const invalid=customPayload();invalid.customDesign.layouts.four.rects.pop();
 await assert.rejects(()=>fetchBoothSetup(reference(),{fetch:async()=>Response.json(invalid)}));
 await assert.rejects(()=>fetchBoothSetup(reference(),{fetch:async()=>new Response('',{status:401})}),/expired/i);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>fetchBoothSetup(reference(),{signal:controller.signal,fetch:async(url,{signal})=>{
  assert.equal(signal.aborted,true);throw new DOMException('Aborted','AbortError');
 }}),error=>error.name==='AbortError');
});
test('protected setup enforces both advertised and streamed response byte limits',async()=>{
 await assert.rejects(()=>fetchBoothSetup(reference(),{fetch:async()=>new Response('{}',{
  headers:{'content-length':String(MAX_BOOTH_SETUP_BYTES+1)}
 })}),/too large/i);
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_BOOTH_SETUP_BYTES+1));},cancel(){cancelled=true;}});
 await assert.rejects(()=>fetchBoothSetup(reference(),{fetch:async()=>new Response(stream)}),/too large/i);
 assert.equal(cancelled,true,'an oversized streaming response must stop downloading');
});
test('large validated paired artwork imports locally without resetting any event photos or counters',()=>{
 const payload=customPayload({large:true}),scope=workspace('?booth_event='+payload.id);
 const previous={title:'Earlier title',privateLegacyFlag:'keep',adminHandoff:{revision:'2026-10-08T14:00:00.000Z'}};
 const original={...seedOtherEvents(),[scope.config]:JSON.stringify(previous),[scope.usage]:'7',[scope.photos]:'saved-event-photos'};
 const storage=memory(original),result=applyBoothHandoff(storage,payload);
 assert.equal(result.printsUsed,7);assert.equal(result.updated,true);
 assert(storage.getItem(scope.config).length>20000,'paired image artwork exceeds the former small-config cap');
 assert.equal(storage.getItem(scope.previous),original[scope.config]);
 assert.equal(result.config.privateLegacyFlag,'keep');
 assert.deepEqual(result.config.customDesign,validateCustomDesign(payload.customDesign));
 for(const [key,value]of Object.entries(original))if(key!==scope.config)assert.equal(storage.getItem(key),value,key);
});
test('invalid or stale custom imports leave every stored event value untouched',()=>{
 const payload=customPayload(),scope=workspace('?booth_event='+payload.id);
 const original={...seedOtherEvents(),[scope.config]:JSON.stringify({adminHandoff:{revision:'2026-10-10T14:00:00.000Z'}}),[scope.usage]:'7'};
 const storage=memory(original);
 assert.throws(()=>applyBoothHandoff(storage,payload),/older/i);
 assert.deepEqual(storage.snapshot(),original);assert.deepEqual(storage.writes,[]);
 const invalid=customPayload();invalid.customDesign.layouts.one.rects[0].w=101;
 assert.throws(()=>validateBoothHandoff(invalid));assert.throws(()=>applyBoothHandoff(storage,invalid));
 assert.deepEqual(storage.snapshot(),original);assert.deepEqual(storage.writes,[]);
});
for(const existing of [false,true])test('quota failure restores '+(existing?'an existing event and its prior recovery backup':'all newly allocated event keys'),()=>{
 const payload=customPayload({large:true}),scope=workspace('?booth_event='+payload.id);
 const original={...seedOtherEvents(),...(existing?{
  [scope.config]:JSON.stringify({title:'Previous event settings',adminHandoff:{revision:'2026-10-08T14:00:00.000Z'}}),
  [scope.previous]:'older-recovery-backup',[scope.usage]:'7',[scope.photos]:'saved-event-photos'
 }:{})};
 const storage=memory(original,scope.config);
 assert.throws(()=>applyBoothHandoff(storage,payload),/could not be saved|kept/i);
 assert.deepEqual(storage.snapshot(),original,'a failed custom import must be atomic across its own config, backup and usage');
 if(!existing){assert(storage.writes.includes(scope.usage));assert.equal(storage.getItem(scope.usage),null);}
});
