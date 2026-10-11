import test from 'node:test';
import assert from 'node:assert/strict';
import {readPrintRehearsal,rehearsalSampleFamily,rehearsalInputs} from '../app/lib/print-rehearsal.mjs';
import {workspace,LEGACY_KEYS,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';

function memory(values={}){
 const map=new Map(Object.entries(values));
 return {map,getItem:key=>map.get(key)??null,setItem(){throw new Error('Printer rehearsal must not write storage');},removeItem(){throw new Error('Printer rehearsal must not remove storage');}};
}
const cfg=(id,template='fpr-graduation')=>({eventId:id,type:'graduation',title:'Jamie’s Graduation',date:'June 12, 2027',defaultTemplate:template,approvedPrintName:'Jamie',details:{classYear:'2027'},photoFit:'fill',printPackage:{includedPrints:108}});
const poses=['data:image/jpeg;base64,YQ==','data:image/jpeg;base64,Yg==','data:image/jpeg;base64,Yw==','data:image/jpeg;base64,ZA=='];

test('printer rehearsal reads the explicitly selected event without touching any event data',()=>{
 const current=workspace('?booth_event=event-jamie'),other=workspace('?booth_event=event-other');
 const storage=memory({[current.config]:JSON.stringify(cfg(current.id)),[current.usage]:'19',[current.photos]:'saved-photo-bytes',[other.config]:JSON.stringify(cfg(other.id,'fpr-wedding')),[ACTIVE_EVENT_KEY]:other.id});
 const before=[...storage.map],view=readPrintRehearsal(storage,'?booth_event=event-jamie');
 assert.equal(view.scope.id,current.id);assert.equal(view.cfg.defaultTemplate,'fpr-graduation');assert.equal(view.cfg.approvedPrintName,'Jamie');assert.equal(view.cfg.guestMode,'approved');assert.deepEqual([...storage.map],before);
});

test('event-aware Back links, nested staff links and active event select the same saved design',()=>{
 const scope=workspace('?booth_event=event-jamie'),storage=memory({[scope.config]:JSON.stringify(cfg(scope.id)),[ACTIVE_EVENT_KEY]:scope.id});
 for(const search of ['', '?returnTo=%2F%3Fbooth_event%3Devent-jamie','?returnTo='+encodeURIComponent('/delivery-check?returnTo='+encodeURIComponent('/?booth_event=event-jamie')),'?returnTo=%2Flaunch'])assert.equal(readPrintRehearsal(storage,search).scope.id,scope.id);
});

test('explicit local and October event contexts take precedence over an active transferred booking',()=>{
 const active=workspace('?booth_event=event-jamie'),storage=memory({[active.config]:JSON.stringify(cfg(active.id)),[ACTIVE_EVENT_KEY]:active.id,[LEGACY_KEYS.config]:JSON.stringify({...cfg('local'),defaultTemplate:'fpr-wedding'}),[EVENT_KEYS.config]:JSON.stringify({...cfg('oct10-2026'),defaultTemplate:'fpr-corporate'})});
 assert.equal(readPrintRehearsal(storage,'?local=1').cfg.defaultTemplate,'fpr-wedding');assert.equal(readPrintRehearsal(storage,'?event=oct10-2026').cfg.defaultTemplate,'fpr-corporate');
});

test('missing settings do not invent a wedding or reconstruct a customer event',()=>{
 const storage=memory();assert.equal(readPrintRehearsal(storage).cfg,null);assert.equal(readPrintRehearsal(storage,'?booth_event=missing-event').cfg,null);assert.equal(readPrintRehearsal(storage,'?event=oct10-2026').cfg,null);assert.equal(storage.map.size,0);
});

test('invalid settings, mismatched event IDs and unapproved custom artwork fail closed',()=>{
 const scope=workspace('?booth_event=event-jamie');
 for(const raw of ['not-json','[]','null',JSON.stringify(cfg('another-event')),JSON.stringify({...cfg(scope.id),defaultTemplate:'custom',customDesign:{}})])assert.throws(()=>readPrintRehearsal(memory({[scope.config]:raw}),'?booth_event=event-jamie'));
 assert.throws(()=>readPrintRehearsal(memory(),'?booth_event=../bad'));
});

test('sample source follows the saved artwork, with local samples for custom events',()=>{
 for(const [template,family] of [['fpr-graduation','graduation'],['fpr-wedding','wedding'],['fpr-birthday','birthday'],['fpr-quince','quince'],['fpr-corporate','corporate']])assert.equal(rehearsalSampleFamily(cfg('event-jamie',template)),family);
 assert.equal(rehearsalSampleFamily({type:'wedding',defaultTemplate:'custom'}),'wedding');assert.equal(rehearsalSampleFamily({type:'other',title:'Quince celebration',defaultTemplate:'custom'}),'quince');assert.equal(rehearsalSampleFamily({type:'other',defaultTemplate:'custom'}),'birthday');
});

test('single and four sample prints use the guest renderer and keep all original sample data',()=>{
 const source=cfg('event-jamie'),before=JSON.stringify(source),inputs=rehearsalInputs(source,poses);
 assert.equal(inputs.one.layout,'card');assert.equal(inputs.four.layout,'photo_strip');assert.equal(inputs.four.stripMode,'single');assert.equal(inputs.one.photo,poses[0]);assert.deepEqual(inputs.four.poses,poses);assert.equal(JSON.stringify(source),before);
 const one=renderKeepsake(inputs.one),four=renderKeepsake(inputs.four);
 assert.equal((one.match(/data-approved-photo-region="true"/g)||[]).length,1);assert.equal((four.match(/data-approved-photo-region="true"/g)||[]).length,8,'two matching four-photo strips share one paper sheet');
 assert.deepEqual([...four.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g)].map(match=>match[0].match(/ href="([^"]+)"/)[1]),[...poses,...poses],'the same four sample originals appear in both strips');assert.ok(one.includes('Jamie'));assert.ok(four.includes('2027'));
 for(const bad of [poses.slice(0,3),[poses[0],poses[0],poses[2],poses[3]],['/print-test.svg',...poses.slice(1)]])assert.throws(()=>rehearsalInputs(source,bad));
});
