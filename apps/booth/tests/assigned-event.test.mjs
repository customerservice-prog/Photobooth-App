import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSIGNED_EVENT_KEY,assignedEventUrl,assignEvent,unassignEvent} from '../app/lib/assigned-event.mjs';
const id='efcbaffc-893f-4361-983b-79a38e7d111a';
function storage(seed={}){
 const map=new Map(Object.entries(seed));
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),all:()=>Object.fromEntries(map)};
}
const config='friendly-booth-transfer-v1-'+id+'-config';
test('a new iPad launches setup instead of inventing an event',()=>{
 assert.equal(assignedEventUrl(storage()),null);
});
test('imported event resumes without touching counters or photo keys',()=>{
 const st=storage({[config]:'{"title":"Party"}','friendly-booth-transfer-v1-'+id+'-usage':'23','photo-archive':'untouched'});
 const before=st.all();
 assert.equal(assignEvent(st,id),'/?booth_event='+id);
 assert.equal(assignedEventUrl(st),'/?booth_event='+id);
 assert.equal(st.getItem(config),before[config]);
 assert.equal(st.getItem('friendly-booth-transfer-v1-'+id+'-usage'),'23');
 assert.equal(st.getItem('photo-archive'),'untouched');
});
test('never load a stale assignment without an actual installed event',()=>{
 const st=storage({[ASSIGNED_EVENT_KEY]:id});
 assert.equal(assignedEventUrl(st),null);
 assert.throws(()=>assignEvent(st,id),/Load and review/);
});
test('reject unsafe links and do not allow demo to replace an event',()=>{
 const st=storage({[config]:'{}'});
 assert.throws(()=>assignEvent(st,'../../../admin'),/Invalid/);
 assert.throws(()=>assignEvent(st,'oct10-2026'),/Load and review/);
 assert.equal(assignedEventUrl(storage({[ASSIGNED_EVENT_KEY]:'../../'})),null);
});
test('staff can clear launch preference without deleting existing event data',()=>{
 const st=storage({[config]:'{}'});
 assignEvent(st,id);unassignEvent(st);
 assert.equal(assignedEventUrl(st),null);
 assert.equal(st.getItem(config),'{}');
});
