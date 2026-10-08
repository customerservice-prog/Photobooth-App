import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBoothHandoffPayload,makeBoothHandoffLink} from '../../admin/lib/booth-transfer.mjs';
import {decodeBoothHandoff,configFromBoothHandoff,applyBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {workspace,EVENT_KEYS,LEGACY_KEYS,usage} from '../app/lib/event-workspace.mjs';
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
test('first transfer creates event-specific keys without modifying October live/demo/legacy events',()=>{
 const storage=store({
  [EVENT_KEYS.config]:'october-config', [EVENT_KEYS.liveUsage]:'35',
  [EVENT_KEYS.demoUsage]:'9',[LEGACY_KEYS.config]:'legacy-config',
  [LEGACY_KEYS.usage]:'7'
 });
 const payload=buildBoothHandoffPayload(event);
 const result=applyBoothHandoff(storage,payload);
 assert(result.scope.imported);
 assert.equal(result.printsUsed,0);
 assert.equal(usage(storage,result.scope),0);
 assert.equal(storage.getItem(EVENT_KEYS.config),'october-config');
 assert.equal(storage.getItem(EVENT_KEYS.liveUsage),'35');
 assert.equal(storage.getItem(EVENT_KEYS.demoUsage),'9');
 assert.equal(storage.getItem(LEGACY_KEYS.config),'legacy-config');
 assert.equal(storage.getItem(LEGACY_KEYS.usage),'7');
 assert.equal(workspace('?booth_event='+event.id).archive,'transfer:'+event.id);
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
