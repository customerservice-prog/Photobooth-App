import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINT_LEDGER_PREFIX,listPrintRequests,logPrintRequest,markPrintOutcome,recoverPrintRequests} from '../app/lib/print-ledger.mjs';
import {workspace,liveWorkspace,octoberPreset,usage,saveEventDraft,EVENT_KEYS,LEGACY_KEYS,OCTOBER_ADMIN_EVENT_ID} from '../app/lib/event-workspace.mjs';

function fixture(scope={id:'print-recovery-test',usage:'own-counter',imported:false,demo:false}){
 const values=new Map([[scope.usage,'3'],['other-counter','12']]);
 let intercept=()=>{};
 const storage={
  getItem:key=>values.get(key)??null,
  setItem(key,value){intercept(key,String(value));values.set(key,String(value));}
 };
 const item=logPrintRequest(storage,scope);
 return {scope,storage,item,values,failWhen(fn){intercept=fn;},clearFailure(){intercept=()=>{};}};
}
const ledgerWrite=key=>key.startsWith(PRINT_LEDGER_PREFIX);

test('failure to save refund intent leaves the counter untouched and retryable',()=>{
 const f=fixture();
 f.failWhen(key=>{if(ledgerWrite(key))throw new Error('Ledger write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'),/Ledger write/);
 assert.equal(f.storage.getItem(f.scope.usage),'3');
 assert.equal(listPrintRequests(f.storage,f.scope)[0].status,'requested');
 assert.equal(listPrintRequests(f.storage,f.scope)[0].pendingRefund,undefined);
 f.clearFailure();
 markPrintOutcome(f.storage,f.scope,f.item.id,'failed');
 assert.equal(f.storage.getItem(f.scope.usage),'2');
});

test('interrupted counter write resumes the saved refund once on retry',()=>{
 const f=fixture();
 f.failWhen(key=>{if(key===f.scope.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'),/Counter write/);
 assert.equal(f.storage.getItem(f.scope.usage),'3');
 assert.deepEqual(listPrintRequests(f.storage,f.scope)[0].pendingRefund,{usage:f.scope.usage,before:3,after:2});
 f.clearFailure();
 assert.equal(markPrintOutcome(f.storage,f.scope,f.item.id,'failed').status,'failed');
 assert.equal(f.storage.getItem(f.scope.usage),'2');
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'),/resolved/);
 assert.equal(f.storage.getItem('other-counter'),'12');
});

test('a repeatedly failing ledger completion never refunds the same request twice',()=>{
 const f=fixture();
 f.failWhen((key,value)=>{
  if(ledgerWrite(key)&&JSON.parse(value)[0].status==='failed')throw new Error('Ledger completion failed');
 });
 for(let attempt=0;attempt<3;attempt++){
  assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'),/Ledger completion/);
  assert.equal(f.storage.getItem(f.scope.usage),'2');
  assert.equal(listPrintRequests(f.storage,f.scope)[0].status,'requested');
 }
 f.clearFailure();
 assert.equal(markPrintOutcome(f.storage,f.scope,f.item.id,'failed').status,'failed');
 assert.equal(f.storage.getItem(f.scope.usage),'2');
 assert.equal(listPrintRequests(f.storage,f.scope)[0].pendingRefund,undefined);
});

test('recovery completes an interrupted refund before a new request debit',()=>{
 const f=fixture();
 f.failWhen(key=>{if(key===f.scope.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'));
 f.clearFailure();
 recoverPrintRequests(f.storage,f.scope);
 const used=Number(f.storage.getItem(f.scope.usage));
 f.storage.setItem(f.scope.usage,String(used+1));
 const next=logPrintRequest(f.storage,f.scope);
 assert.equal(f.storage.getItem(f.scope.usage),'3');
 assert.equal(listPrintRequests(f.storage,f.scope).find(r=>r.id===f.item.id).status,'failed');
 assert.equal(listPrintRequests(f.storage,f.scope).find(r=>r.id===next.id).status,'requested');
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'),/resolved/);
 assert.equal(f.storage.getItem(f.scope.usage),'3');
});

test('an unexpected counter value fails closed without overwriting the allowance',()=>{
 const f=fixture();
 f.failWhen(key=>{if(key===f.scope.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'));
 f.clearFailure();f.storage.setItem(f.scope.usage,'7');
 assert.throws(()=>recoverPrintRequests(f.storage,f.scope),/changed during/);
 assert.equal(f.storage.getItem(f.scope.usage),'7');
 assert.equal(listPrintRequests(f.storage,f.scope)[0].status,'requested');
 assert.throws(()=>logPrintRequest(f.storage,f.scope),/changed during/);
 assert.equal(listPrintRequests(f.storage,f.scope).length,1);
});

test('recovery preserves the owning counter for imported and original event scopes',()=>{
 for(const imported of [false,true]){
  const scope={id:'october-event',usage:imported?'transfer-counter':'original-counter',imported,demo:false};
  const f=fixture(scope),linked=imported?'original-counter':'transfer-counter';
  f.storage.setItem(linked,'24');
  f.failWhen((key,value)=>{if(ledgerWrite(key)&&JSON.parse(value)[0].status==='failed')throw new Error('Interrupted');});
  assert.throws(()=>markPrintOutcome(f.storage,scope,f.item.id,'failed'));
  f.clearFailure();recoverPrintRequests(f.storage,scope);
  assert.equal(f.storage.getItem(scope.usage),'2');
  assert.equal(f.storage.getItem(linked),'24');
 }
});

test('reading the allowance recovers an interrupted refund at the print limit',()=>{
 const f=fixture();f.storage.setItem(f.scope.usage,'216');
 f.failWhen(key=>{if(key===f.scope.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,f.scope,f.item.id,'failed'));
 f.clearFailure();
 assert.equal(usage(f.storage,f.scope),215);
 assert.equal(listPrintRequests(f.storage,f.scope)[0].status,'failed');
 assert.equal(f.storage.getItem('other-counter'),'12');
});

test('known October legacy refund completes before saving a missing live counter',()=>{
 const legacy=workspace(),f=fixture(legacy);
 f.storage.setItem(LEGACY_KEYS.config,JSON.stringify(octoberPreset()));
 const transferred=workspace('?booth_event='+OCTOBER_ADMIN_EVENT_ID);
 f.storage.setItem(transferred.usage,'24');
 f.failWhen(key=>{if(key===legacy.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,legacy,f.item.id,'failed'));
 f.clearFailure();saveEventDraft(f.storage,octoberPreset());
 assert.equal(f.storage.getItem(LEGACY_KEYS.usage),'2');
 assert.equal(f.storage.getItem(EVENT_KEYS.liveUsage),'2');
 assert.equal(f.storage.getItem(transferred.usage),'24');
 assert.equal(usage(f.storage,liveWorkspace()),26);
 assert.equal(usage(f.storage,transferred),26);
 assert.equal(listPrintRequests(f.storage,legacy)[0].status,'failed');
});

test('combined October allowance recovers each scope without copying or resetting counters',()=>{
 const original=liveWorkspace(),transferred=workspace('?booth_event='+OCTOBER_ADMIN_EVENT_ID);
 const f=fixture(original);f.storage.setItem(transferred.usage,'24');
 const second=logPrintRequest(f.storage,transferred);
 f.failWhen((key,value)=>{if(ledgerWrite(key)&&JSON.parse(value)[0].status==='failed')throw new Error('Ledger completion failed');});
 assert.throws(()=>markPrintOutcome(f.storage,original,f.item.id,'failed'));
 assert.throws(()=>markPrintOutcome(f.storage,transferred,second.id,'failed'));
 assert.equal(f.storage.getItem(original.usage),'2');
 assert.equal(f.storage.getItem(transferred.usage),'23');
 f.clearFailure();
 for(const scope of [original,transferred])assert.equal(usage(f.storage,scope),25);
 assert.equal(f.storage.getItem(original.usage),'2');
 assert.equal(f.storage.getItem(transferred.usage),'23');
 assert.equal(f.storage.getItem(LEGACY_KEYS.usage),null);
 assert.equal(listPrintRequests(f.storage,original)[0].status,'failed');
 assert.equal(listPrintRequests(f.storage,transferred)[0].status,'failed');
});

test('unrelated legacy event refunds are not applied when reading October allowance',()=>{
 const legacy=workspace(),f=fixture(legacy);
 f.storage.setItem(LEGACY_KEYS.config,JSON.stringify({title:'Another wedding',date:'October 10, 2026'}));
 f.failWhen(key=>{if(key===legacy.usage)throw new Error('Counter write failed');});
 assert.throws(()=>markPrintOutcome(f.storage,legacy,f.item.id,'failed'));
 f.clearFailure();
 assert.equal(usage(f.storage,liveWorkspace()),0);
 assert.equal(f.storage.getItem(LEGACY_KEYS.usage),'3');
 assert.equal(f.storage.getItem(EVENT_KEYS.liveUsage),null);
 assert.equal(listPrintRequests(f.storage,legacy)[0].status,'requested');
});
