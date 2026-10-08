import test from 'node:test';
import assert from 'node:assert/strict';
// This booth-only test must work in Railway's scoped apps/booth build context.
// The cross-app encoder is exercised by GitHub's admin and Playwright workflows.
function buildBoothHandoffPayload(ev){
 const e=ev.theme.boothExperience;
 return {v:1,id:ev.id,rev:ev.updatedAt.toISOString(),title:ev.name,
  date:ev.date.toISOString().slice(0,10),
  start:ev.startTime.toISOString().slice(11,16),end:ev.endTime.toISOString().slice(11,16),
  type:'other',f:e.featured,p:e.pauseSeconds,mode:e.format,s:e.strips,fit:e.photoFit,
  a:e.primary,b:e.accent,limit:ev.maxPrints,on:ev.printingEnabled&&ev.maxPrints>0,
  qr:ev.qrSharingEnabled,design:'champagne'};
}
function makeBoothHandoffLink(ev){
 return 'https://photobooth-booth-production.up.railway.app/handoff#'
  +Buffer.from(JSON.stringify(buildBoothHandoffPayload(ev)),'utf8').toString('base64url');
}
import {decodeBoothHandoff,configFromBoothHandoff,applyBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {workspace,EVENT_KEYS,LEGACY_KEYS,usage,ownPrintUsage} from '../app/lib/event-workspace.mjs';
const event={
 id:'efcbaffc-893f-4361-983b-79a38e7d111a',
 name:'October 10 Photo Booth Party',eventType:'Party',
 date:new Date('2026-10-10T12:00:00.000Z'),
 startTime:new Date('2026-10-10T20:00:00.000Z'),
 endTime:new Date('2026-10-11T00:00:00.000Z'),
 updatedAt:new Date('2026-10-08T02:00:00.000Z'),
 customer:{email:'private@example.test',phone:'3150000000'},
 venueAddress:'Private home address',internalNotes:'Keep this private',
 theme:{boothExperience:{featured:'one',pauseSeconds:9,format:'strip',strips:2,photoFit:'fit',primary:'#855665',accent:'#e4b4a1'}},
 maxPrints:216,printingEnabled:true,qrSharingEnabled:true
};
function store(seed={}){
 const data=new Map(Object.entries(seed));
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),entries:()=>Object.fromEntries(data)};
}
test('staff can copy a real self-contained iPad setup link without contact or venue data',()=>{
 const url=makeBoothHandoffLink(event);
 assert(url.startsWith('https://photobooth-booth-production.up.railway.app/handoff#'));
 assert(!url.includes('?'),'transfer data stays in URL fragment rather than query');
 const raw=Buffer.from(url.split('#')[1],'base64url').toString('utf8');
 assert(!raw.includes('private@example.test'));
 assert(!raw.includes('3150000000'));
 assert(!raw.includes('Private home address'));
 assert(!raw.includes('Keep this private'));
 const decoded=decodeBoothHandoff(url.split('#')[1]);
 assert.equal(decoded.title,event.name);
 assert.equal(decoded.start,'20:00');
 assert.equal(decoded.end,'00:00');
 assert.equal(decoded.limit,216);
 assert.equal(decoded.p,9);
 assert.equal(decoded.s,2);
});
test('iPad config uses actual admin preferences with default fill and correct print package',()=>{
 const decoded=decodeBoothHandoff(makeBoothHandoffLink(event).split('#')[1]);
 const config=configFromBoothHandoff(decoded);
 assert.equal(config.eventId,event.id);
 assert.equal(config.defaultPhotoExperience,'one');
 assert.equal(config.photoPauseSeconds,9);
 assert.equal(config.photoFit,'fit');
 assert.equal(config.printLayouts.defaultLayout,'photo_strip');
 assert.equal(config.printLayouts.stripMode,'double');
 assert.equal(config.printPackage.includedPrints,216);
 assert.equal(config.printPackage.addOnPrints,0);
 assert.equal(config.printPackage.copiesPerSession,1);
 assert.deepEqual([config.schedule.start,config.schedule.end],['20:00','00:00']);
});
test('October transfer shares the original live allowance without deleting either photo archive',()=>{
 const storage=store({
  [EVENT_KEYS.config]:'october-config', [EVENT_KEYS.liveUsage]:'35',
  [EVENT_KEYS.demoUsage]:'9',[LEGACY_KEYS.config]:'legacy-config',
  [LEGACY_KEYS.usage]:'7'
 });
 const payload=buildBoothHandoffPayload(event);
 const result=applyBoothHandoff(storage,payload);
 assert(result.scope.imported);
 assert.equal(result.printsUsed,35,'never grant a second October print allowance');
 assert.equal(usage(storage,result.scope),35);
 assert.equal(usage(storage,workspace('?event=oct10-2026')),35);
 assert.equal(ownPrintUsage(storage,result.scope),0);
 assert.equal(storage.getItem(result.scope.usage),'0');
 assert.equal(storage.getItem(EVENT_KEYS.config),'october-config');
 assert.equal(storage.getItem(EVENT_KEYS.liveUsage),'35');
 assert.equal(storage.getItem(EVENT_KEYS.demoUsage),'9');
 assert.equal(storage.getItem(LEGACY_KEYS.config),'legacy-config');
 assert.equal(storage.getItem(LEGACY_KEYS.usage),'7');
 assert.equal(workspace('?booth_event='+event.id).archive,'transfer:'+event.id);
 assert.equal(workspace('?event=oct10-2026').archive,'oct10-2026:live');
});
test('retransferring updated event preserves existing print usage and original local settings backup',()=>{
 const storage=store();
 const payload=buildBoothHandoffPayload(event);
 let result=applyBoothHandoff(storage,payload);
 storage.setItem(result.scope.usage,'37');
 const before=storage.getItem(result.scope.config);
 const newer={...payload,rev:'2026-10-09T10:00:00.000Z',limit:108,mode:'card',s:1,fit:'fill'};
 result=applyBoothHandoff(storage,newer);
 assert.equal(result.printsUsed,37);
 assert.equal(usage(storage,result.scope),37);
 assert.equal(result.config.printPackage.includedPrints,108);
 assert.equal(result.config.printLayouts.defaultLayout,'card');
 assert.equal(result.config.printLayouts.stripMode,'single');
 assert.equal(result.config.photoFit,'fill');
 assert.equal(storage.getItem(result.scope.previous),before);
 assert.throws(()=>applyBoothHandoff(storage,payload),/older setup link/i);
 assert.equal(usage(storage,result.scope),37);
});
test('invalid, corrupt or potentially unsafe event fragments cannot replace settings',()=>{
 const storage=store(),payload=buildBoothHandoffPayload(event);
 for(const token of ['not a code','!!','A'.repeat(2500)]){
  assert.throws(()=>decodeBoothHandoff(token));
 }
 const invalid={...payload,title:'<script>alert(1)</script>'};
 const bad=Buffer.from(JSON.stringify(invalid)).toString('base64url');
 assert.throws(()=>decodeBoothHandoff(bad),/not a valid/i);
 const bogus={...payload,limit:-1};
 assert.throws(()=>decodeBoothHandoff(Buffer.from(JSON.stringify(bogus)).toString('base64url')));
 assert.deepEqual(storage.entries(),{});
});
test('digital-only event handoff retains zero-print allowance',()=>{
 const payload=buildBoothHandoffPayload({...event,maxPrints:0,printingEnabled:false});
 const config=configFromBoothHandoff(decodeBoothHandoff(Buffer.from(JSON.stringify(payload)).toString('base64url')));
 assert.equal(config.printPackage.includedPrints,0);
 assert.equal(config.printPackage.printingEnabled,false);
});

test('both October guest entries count against a single allowance, without duplicating counters',()=>{
 const storage=store({[EVENT_KEYS.liveUsage]:'35',[EVENT_KEYS.demoUsage]:'9'});
 const transferred=applyBoothHandoff(storage,buildBoothHandoffPayload(event)).scope;
 const original=workspace('?event=oct10-2026');
 assert.equal(usage(storage,transferred),35);
 storage.setItem(transferred.usage,String(ownPrintUsage(storage,transferred)+1));
 assert.equal(usage(storage,original),36);
 assert.equal(usage(storage,transferred),36);
 assert.equal(ownPrintUsage(storage,original),35);
 assert.equal(ownPrintUsage(storage,transferred),1);
 storage.setItem(original.usage,String(ownPrintUsage(storage,original)+1));
 assert.equal(usage(storage,original),37);
 assert.equal(usage(storage,transferred),37);
 assert.equal(storage.getItem(EVENT_KEYS.demoUsage),'9');
 assert.equal(storage.getItem(LEGACY_KEYS.usage),null);
});
test('existing transferred October usage is retained when a fresh setup is applied',()=>{
 const original=workspace('?event=oct10-2026'),transferred=workspace('?booth_event='+event.id);
 const storage=store({[original.usage]:'60',[transferred.usage]:'12'});
 assert.equal(usage(storage,original),72);
 assert.equal(usage(storage,transferred),72);
 applyBoothHandoff(storage,buildBoothHandoffPayload(event));
 assert.equal(usage(storage,transferred),72);
 assert.equal(storage.getItem(transferred.usage),'12');
});
test('an unrelated event has independent print usage and its own photo archive',()=>{
 const other={...event,id:'abc-def-2027',name:'A second celebration'};
 const storage=store({[EVENT_KEYS.liveUsage]:'35'});
 const scope=applyBoothHandoff(storage,buildBoothHandoffPayload(other)).scope;
 assert.equal(scope.linkedOctober,false);
 assert.equal(usage(storage,scope),0);
 assert.notEqual(scope.archive,'oct10-2026:live');
 storage.setItem(scope.usage,'4');
 assert.equal(usage(storage,scope),4);
 assert.equal(usage(storage,workspace('?event=oct10-2026')),35);
});
test('a damaged October print counter stops import without altering local data',()=>{
 const storage=store({[EVENT_KEYS.liveUsage]:'not-a-counter'}),before=storage.entries();
 assert.throws(()=>applyBoothHandoff(storage,buildBoothHandoffPayload(event)),/print counter needs staff review/i);
 assert.deepEqual(storage.entries(),before);
});
