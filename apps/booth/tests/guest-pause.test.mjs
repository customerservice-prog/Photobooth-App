import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGuestPause,normalizePhotoPreference,waitForGuestReady,DEFAULT_GUEST_PAUSE_SECONDS} from '../app/lib/guest-pause.mjs';

test('guest pause settings have a safe default and explicit supported choices',()=>{
 assert.equal(DEFAULT_GUEST_PAUSE_SECONDS,6);
 assert.deepEqual([6,9,12].map(normalizeGuestPause),[6,9,12]);
 assert.equal(normalizeGuestPause('9'),9);
 assert.equal(normalizeGuestPause(100000),6);
 assert.equal(normalizePhotoPreference('one'),'one');
 assert.equal(normalizePhotoPreference('something else'),'four');
});
test('guest sees a countdown and can skip the pause without taking a photo',async()=>{
 const ticks=[],scheduled=[];let ready=null,clearCount=0;
 const p=waitForGuestReady({seconds:6,onTick:value=>ticks.push(value),registerReady:callback=>{ready=callback;},
   schedule:callback=>{scheduled.push(callback);return scheduled.length;},
   cancel:()=>{clearCount++;}});
 assert.deepEqual(ticks,[6]);assert.equal(typeof ready,'function');
 scheduled.shift()();assert.deepEqual(ticks,[6,5]);
 ready();await p;assert.equal(ready,null);assert.equal(clearCount,1);
});
test('guest pause automatically expires and clears the active button',async()=>{
 const ticks=[],scheduled=[];let ready;
 const p=waitForGuestReady({seconds:6,onTick:value=>ticks.push(value),registerReady:callback=>{ready=callback;},
   schedule:callback=>{scheduled.push(callback);return scheduled.length;},cancel:()=>{}});
 while(scheduled.length)scheduled.shift()();
 await p;assert.deepEqual(ticks,[6,5,4,3,2,1,0]);assert.equal(ready,null);
});
test('cancelling during the guest pause rejects and prevents later progress',async()=>{
 const controller=new AbortController(),ticks=[],scheduled=[];
 let resume;
 const p=waitForGuestReady({seconds:6,signal:controller.signal,onTick:value=>ticks.push(value),registerReady:value=>{resume=value;},
   schedule:callback=>{scheduled.push(callback);return scheduled.length;},cancel:()=>{}});
 controller.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(resume,null);assert.deepEqual(ticks,[6]);
});
