import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyHandoff,decodeHandoff,parseHandoffFile,applyHandoff,importedEventConfig,handoffWorkspaceId} from '../app/lib/booth-import.mjs';
import {workspace,usage,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
const raw={v:1,i:'efcbaffc-893f-4361-983b-79a38e7d111a',t:'October 10 Photo Booth Party',d:'2026-10-10',o:'Party',f:1,b:9,l:'strip',s:2,x:'fill',c:['#855665','#e4b4a1'],g:'blush',n:216,p:true,q:true};
function storage(values=[]){
 const map=new Map(values);
 return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),keys:()=>[...map.keys()]};
}
test('transfer preview accepts correct event, rejects injected and malformed payloads',()=>{
 assert.equal(verifyHandoff(raw).t,raw.t);
 assert.throws(()=>verifyHandoff({...raw,t:'<'.repeat(1000)}));
 assert.throws(()=>verifyHandoff({...raw,c:['javascript:evil','#abcabc']}));
 assert.throws(()=>verifyHandoff({...raw,n:-1}));
 assert.throws(()=>verifyHandoff({...raw,o:'Party',email:'customer@example.com'}),'unexpected private field');
 assert.throws(()=>verifyHandoff({...raw,i:'../x'}));
 const token=Buffer.from(JSON.stringify(raw)).toString('base64url');
 assert.deepEqual(decodeHandoff(token),raw);
 assert.deepEqual(parseHandoffFile(JSON.stringify(raw)),raw);
 assert.throws(()=>decodeHandoff(token.slice(0,20)+'%%'));
 assert.throws(()=>parseHandoffFile('{"broken"'));
});
test('imported iPad event uses real guest options without inventing names',()=>{
 const cfg=importedEventConfig(raw);
 assert.equal(cfg.title,raw.t);
 assert.equal(cfg.type,'other');
 assert.equal(cfg.defaultPhotoExperience,'one');
 assert.equal(cfg.photoPauseSeconds,9);
 assert.equal(cfg.defaultTemplate,'blush');
 assert.equal(cfg.printLayouts.defaultLayout,'photo_strip');
 assert.equal(cfg.printLayouts.stripMode,'double');
 assert.equal(cfg.printPackage.includedPrints,216);
 assert.equal(cfg.printPackage.addOnPrints,0);
 assert.equal(cfg.photoFit,'fill');
 assert.equal(cfg.details.primaryColor,'#855665');
});
test('loading a new event preserves the old October settings, usage and photos byte-for-byte',()=>{
 const entries=[[EVENT_KEYS.config,'{"special":"old setup"}'],[EVENT_KEYS.liveUsage,'87'],['friendly-booth-photos-v1','["original archived photo"]'],['friendly-booth-print-usage-v1','8']];
 const store=storage(entries);
 const before=new Map(entries);
 const result=applyHandoff(store,raw);
 assert.equal(result.updated,false);
 const newScope=workspace('?event='+result.id);
 assert(newScope.transferred);
 assert.notEqual(newScope.archive,'oct10-2026:live');
 assert.equal(newScope.config,'friendly-booth-import:'+result.id+':config');
 assert.equal(store.getItem(newScope.usage),null);
 assert.equal(usage(store,newScope),0);
 for(const [key,value] of before)assert.equal(store.getItem(key),value);
 assert.equal(JSON.parse(store.getItem(newScope.config)).title,raw.t);
});
test('fresh handoff updates only this event, retaining used prints and stored archives',()=>{
 const id=handoffWorkspaceId(raw.i),target=workspace('?event='+id);
 const keys=[[target.usage,'25'],[target.photos,'["photo one"]'],[EVENT_KEYS.liveUsage,'100']];
 const store=storage(keys);
 applyHandoff(store,raw);
 const update=applyHandoff(store,{...raw,f:4,n:300,l:'card',s:1});
 assert.equal(update.updated,true);
 assert.equal(usage(store,target),25);
 assert.equal(store.getItem(target.photos),'["photo one"]');
 assert.equal(store.getItem(EVENT_KEYS.liveUsage),'100');
 assert.equal(JSON.parse(store.getItem(target.config)).printPackage.includedPrints,300);
 assert(store.getItem('friendly-booth-import:'+id+':previous'),'prior settings can be recovered');
});
test('transferred scope never steals a legacy or the October demo counter',()=>{
 const admin=workspace('?event=admin-'+raw.i),demo=workspace('?event=oct10-2026&demo=1'),legacy=workspace('?event=unknown');
 assert(admin.transferred&&admin.managed&&!admin.specialOctober);
 assert(demo.specialOctober&&demo.demo&&!demo.transferred);
 assert.equal(legacy.id,'legacy');
});
