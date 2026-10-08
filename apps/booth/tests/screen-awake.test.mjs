import test from 'node:test';
import assert from 'node:assert/strict';
import {SCREEN_AWAKE_KEY,readScreenAwakeSetting,saveScreenAwakeSetting,createScreenAwakeController} from '../app/lib/screen-awake.mjs';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function storage(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
}
function fakeEnvironment(options={}){
 const doc=new EventTarget(),win=new EventTarget();
 doc.visibilityState='visible';
 const sentinels=[],history=[];
 let requests=0,errors=options.fail||0;
 const nav=options.unsupported?{}:{wakeLock:{async request(type){
  assert.equal(type,'screen');requests++;
  if(errors>0){errors--;throw new Error('Wake lock denied');}
  if(options.delayed)return new Promise(resolve=>{options.delayed.push(resolve);});
  return makeSentinel();
 }}};
 function makeSentinel(){
  const listener=new EventTarget();
  const sentinel={released:false,addEventListener:(type,cb)=>listener.addEventListener(type,cb),async release(){
   if(!sentinel.released){sentinel.released=true;listener.dispatchEvent(new Event('release'));}
  }};
  sentinels.push(sentinel);return sentinel;
 }
 const ctrl=createScreenAwakeController({doc,win,nav,onStatus:status=>history.push(status)});
 return {doc,win,nav,ctrl,sentinels,history,makeSentinel,get requests(){return requests;}};
}
test('a new iPad defaults on and staff can persist an off choice without modifying event data',()=>{
 const data=storage({'friendly-booth-event-v1':'protected'});
 assert.equal(readScreenAwakeSetting(data),true);
 assert.equal(saveScreenAwakeSetting(data,false),true);
 assert.equal(readScreenAwakeSetting(data),false);
 assert.equal(data.getItem('friendly-booth-event-v1'),'protected');
 assert.equal(data.getItem(SCREEN_AWAKE_KEY),'off');
 assert.equal(saveScreenAwakeSetting(data,true),true);
 assert.equal(readScreenAwakeSetting(data),true);
 assert.equal(readScreenAwakeSetting({getItem(){throw Error('private mode');}}),true);
 assert.equal(saveScreenAwakeSetting({setItem(){throw Error('storage unavailable');}},false),false);
});
test('while visible and enabled, wake lock activates once and releases when staff turns it off',async()=>{
 const {ctrl,doc,sentinels,history,requests}=fakeEnvironment();
 ctrl.start(true);await flush();
 assert.equal(ctrl.getStatus(),'active');
 assert.equal(sentinels.length,1);
 doc.dispatchEvent(new Event('pointerdown'));await flush();
 assert.equal(sentinels.length,1,'repeated guest touches should not spawn locks');
 ctrl.setEnabled(false);await flush();
 assert.equal(ctrl.getStatus(),'off');
 assert.equal(sentinels[0].released,true);
 doc.dispatchEvent(new Event('pointerdown'));await flush();
 assert.equal(sentinels.length,1,'staff opt-out must be respected');
 assert(history.includes('active'));
 ctrl.stop();
});
test('returning to a visible booth reacquires the screen lock, but never keeps it in a hidden tab',async()=>{
 const {ctrl,doc,sentinels}=fakeEnvironment();
 ctrl.start(true);await flush();
 doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await flush();
 assert.equal(sentinels[0].released,true);
 assert.equal(ctrl.getStatus(),'waiting');
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await flush();
 assert.equal(sentinels.length,2);
 assert.equal(ctrl.getStatus(),'active');
 ctrl.stop();
 assert.equal(sentinels[1].released,true);
});
test('permission refusals are visible and can be retried by staff',async()=>{
 const e=fakeEnvironment({fail:1});
 e.ctrl.start(true);await flush();
 assert.equal(e.ctrl.getStatus(),'blocked');
 await e.ctrl.retry();await flush();
 assert.equal(e.ctrl.getStatus(),'active');
 assert.equal(e.sentinels.length,1);
 e.ctrl.stop();
});
test('unsupported browsers fail safely; disabling wake lock still works',async()=>{
 const e=fakeEnvironment({unsupported:true});
 e.ctrl.start(true);await flush();
 assert.equal(e.ctrl.getStatus(),'unsupported');
 e.ctrl.setEnabled(false);assert.equal(e.ctrl.getStatus(),'off');
 e.ctrl.stop();
});
test('a pending request cannot reactivate after staff disables the screen lock',async()=>{
 const delayed=[],e=fakeEnvironment({delayed});
 e.ctrl.start(true);assert.equal(e.ctrl.getStatus(),'requesting');
 e.ctrl.setEnabled(false);
 const old=e.makeSentinel();delayed.shift()(old);await flush();
 assert.equal(old.released,true);
 assert.equal(e.ctrl.getStatus(),'off');
 assert.equal(e.requests,1);
 e.ctrl.stop();
});
test('a pending request is replaced if staff turns the screen lock off and back on',async()=>{
 const delayed=[],e=fakeEnvironment({delayed});
 e.ctrl.start(true);
 e.ctrl.setEnabled(false);e.ctrl.setEnabled(true);
 const stale=e.makeSentinel();delayed.shift()(stale);await flush();
 assert.equal(stale.released,true);
 assert.equal(e.requests,2);
 const newer=e.makeSentinel();delayed.shift()(newer);await flush();
 assert.equal(e.ctrl.getStatus(),'active');
 e.ctrl.stop();assert.equal(newer.released,true);
});
test('unmounting before an iOS wake-lock result releases the stale request',async()=>{
 const delayed=[],e=fakeEnvironment({delayed});
 e.ctrl.start(true);
 e.ctrl.stop();
 const old=e.makeSentinel();delayed.shift()(old);await flush();
 assert.equal(old.released,true);
 assert.equal(e.ctrl.getStatus(),'off');
});
