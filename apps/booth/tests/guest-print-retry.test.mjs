import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import * as eventConfig from '../app/lib/event-config.mjs';
import * as exportsLibrary from '../app/lib/keepsake-export.mjs';
import * as printPackage from '../app/lib/print-package.mjs';
import * as guestDesign from '../app/lib/guest-design.mjs';
import * as guestTheme from '../app/lib/guest-finish-theme.mjs';
import * as staffPin from '../app/lib/staff-pin.mjs';
import {listPrintRequests,logPrintRequest,markPrintOutcome} from '../app/lib/print-ledger.mjs';

const require=createRequire(import.meta.url),React=require('react');
const {transformSync}=require('next/dist/build/swc');
const compiled=new Map(),JPEG='data:image/jpeg;base64,Zm9jdXNlZC10ZXN0';
const StaffAccessGate=()=>null,StudioDialog=()=>null,DeliveryPanel=()=>null;
const defaultModule=value=>({__esModule:true,default:value});
const equalDeps=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));

// Execute the real JSX and event handlers; only hooks, native dialogs and
// canvas/network boundaries are mocked. No browser or added dependency needed.
function mountComponent(name,props,mocks={},globals={}){
 const path=new URL('../app/components/'+name+'.js',import.meta.url);
 if(!compiled.has(name))compiled.set(name,transformSync(readFileSync(path,'utf8'),{
  filename:path.pathname,jsc:{target:'es2022',parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}
 }).code);
 const slots=[],timers=new Map();let cursor=0,dirty=true,pending=[],tree,nextTimer=0;
 function slot(kind,initialize){const index=cursor++;if(!slots[index])slots[index]={kind,...initialize()};assert.equal(slots[index].kind,kind);return slots[index];}
 const hooks={...React,
  useState(initial){const state=slot('state',()=>({value:typeof initial==='function'?initial():initial}));return [state.value,value=>{const next=typeof value==='function'?value(state.value):value;if(!Object.is(next,state.value)){state.value=next;dirty=true;}}];},
  useRef(initial){return slot('ref',()=>({value:{current:initial}})).value;},
  useMemo(make,deps){const state=slot('memo',()=>({}));if(!equalDeps(state.deps,deps)){state.value=make();state.deps=deps;}return state.value;},
  useEffect(effect,deps){const state=slot('effect',()=>({}));if(!equalDeps(state.deps,deps)){state.deps=deps;pending.push({state,effect});}}
 };
 const module={exports:{}};
 runInNewContext(compiled.get(name),{
  module,exports:module.exports,require:id=>id==='react'?hooks:id==='react/jsx-runtime'?require(id):id.endsWith('.css')?{}:Object.hasOwn(mocks,id)?mocks[id]:(()=>{throw new Error('Unexpected component import '+id);})(),
  setTimeout:callback=>{const id=++nextTimer;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id),
  document:{activeElement:{focus(){}}},navigator:{onLine:true},localStorage:{},...globals
 },{filename:path.pathname});
 const Component=module.exports.default;
 function nodes(node=tree){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(child=>nodes(child??null));return [node,...nodes(node.props?.children??null)];}
 function render(){
  for(let count=0;dirty;count++){
   assert(count<20,'component state should settle');dirty=false;cursor=0;pending=[];tree=Component(props);
   for(const node of nodes())if(node.type==='dialog'&&node.ref&&!node.ref.current)node.ref.current={open:false,showModal(){this.open=true;},close(){this.open=false;}};
   for(const {state,effect} of pending){state.cleanup?.();state.cleanup=effect();}
  }
  return tree;
 }
 async function settle(){for(let count=0;count<8;count++){await Promise.resolve();render();}}
 const harness={
  render,settle,nodes,find:predicate=>nodes().find(predicate),byId:id=>nodes().find(node=>node.props?.['data-testid']===id),
  setProps(next){props={...props,...next};dirty=true;},
  click(id){const node=this.byId(id);assert(node,'rendered button '+id);assert(!node.props.disabled,'enabled button '+id);node.props.onClick();render();},
  async timers(){for(const [id,callback] of [...timers]){timers.delete(id);callback();}await settle();},
  unmount(){for(const state of slots)if(state.kind==='effect')state.cleanup?.();timers.clear();}
 };
 render();return harness;
}

function memoryStorage(seed={}){
 const values=new Map(Object.entries(seed));
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
}
async function printedPreview({outcomeSuccess=true}={}){
 const scope={id:'retry-guard-test',usage:'test-usage',imported:false,demo:false};
 const storage=memoryStorage({'test-usage':'2'}),outcomes=[],active=[];let requestId,printCalls=0,h;
 const used=()=>Number(storage.getItem(scope.usage));
 h=mountComponent('GuestReadyPreview',{
  photo:JPEG,poses:[],sessionShots:1,cfg:{type:'other',title:'Retry test',defaultTemplate:'ivory'},
  printing:false,printPackage:{includedPrints:3},printsUsed:used(),onSessionActive:value=>active.push(value),
  onPrint(){printCalls++;storage.setItem(scope.usage,String(used()+1));requestId=logPrintRequest(storage,scope).id;h.setProps({printsUsed:used()});return true;},
  onPrintOutcome(outcome){outcomes.push(outcome);if(!outcomeSuccess)return false;markPrintOutcome(storage,scope,requestId,outcome);h.setProps({printsUsed:used()});return true;}
 },{
  '../lib/event-config.mjs':eventConfig,'../lib/keepsake-export.mjs':{...exportsLibrary,makeKeepsakeExport:async input=>({key:exportsLibrary.exportKey(input),dataUrl:JPEG,blob:{}})},
  '../lib/print-package.mjs':printPackage,'../lib/guest-design.mjs':guestDesign,'../lib/guest-finish-theme.mjs':guestTheme,
  './StaffAccessGate':defaultModule(StaffAccessGate),'./StudioDialog':defaultModule(StudioDialog),'./DeliveryPanel':defaultModule(DeliveryPanel)
 });
 await h.timers();h.click('approved-print');
 const gate=()=>h.find(node=>node.type===StaffAccessGate);
 const jpeg=()=>h.byId('approved-finished-jpeg').props.src;
 const request=()=>listPrintRequests(storage,scope).find(item=>item.id===requestId);
 function unchanged(){assert.equal(used(),3);assert.equal(request().status,'requested');assert.equal(h.byId('approved-print').props.disabled,true);assert.equal(jpeg(),JPEG);}
 function authorize(){gate().props.onConfirm();h.render();}
 return {h,outcomes,active,used,request,unchanged,authorize,gate,jpeg,printCalls:()=>printCalls};
}

test('Retry print opens staff access without restoring usage; gate cancellation preserves the request and JPEG',async()=>{
 const f=await printedPreview();f.h.click('approved-retry-print');
 assert(f.gate());assert.equal(f.active.at(-1),true);assert.deepEqual(f.outcomes,[]);f.unchanged();
 f.gate().props.onClose();f.h.render();assert(!f.gate());assert.deepEqual(f.outcomes,[]);f.unchanged();f.h.unmount();
});

test('staff authorization opens the no-sheet review; cancelling review preserves usage and the JPEG',async()=>{
 const f=await printedPreview();f.h.click('approved-retry-print');f.authorize();
 assert(!f.gate());assert(f.h.byId('approved-confirm-no-print'));assert.equal(f.active.at(-1),true);assert.deepEqual(f.outcomes,[]);f.unchanged();
 f.h.click('approved-cancel-print-retry');assert(!f.h.byId('approved-confirm-no-print'));assert.deepEqual(f.outcomes,[]);f.unchanged();f.h.unmount();
});

test('only explicit no-sheet confirmation restores one print and enables a new request without printing automatically',async()=>{
 const f=await printedPreview();f.h.click('approved-retry-print');f.authorize();f.unchanged();
 f.h.click('approved-confirm-no-print');
 assert.deepEqual(f.outcomes,['failed']);assert.equal(f.used(),2);assert.equal(f.request().status,'failed');assert.equal(f.h.byId('approved-print').props.disabled,false);
 assert(!f.h.byId('approved-confirm-no-print'));assert(!f.h.byId('approved-retry-print'));assert.equal(f.printCalls(),1);assert.equal(f.jpeg(),JPEG);f.h.unmount();
});

test('a rejected restoration keeps Print requested and preserves its counter and JPEG',async()=>{
 const f=await printedPreview({outcomeSuccess:false});f.h.click('approved-retry-print');f.authorize();f.h.click('approved-confirm-no-print');
 assert.deepEqual(f.outcomes,['failed']);f.unchanged();assert(f.h.byId('approved-retry-print'));assert.equal(f.printCalls(),1);f.h.unmount();
});

function response(data,ok=true){return {ok,json:async()=>data};}
async function staffGate({required=true,post=async()=>response({error:'Incorrect PIN.'},false)}={}){
 let confirmed=0,closed=0,posts=0,remembered=0;
 const h=mountComponent('StaffAccessGate',{
  title:'Staff print retry',confirmLabel:'Review print request →',onConfirm:()=>confirmed++,onClose:()=>closed++
 },{
  '../lib/staff-pin.mjs':staffPin,'../lib/staff-offline-pin.mjs':{verifyOfflineStaffPin:async()=>false,rememberOfflineStaffPin:async()=>{remembered++;}}
 },{fetch:async(_url,options={})=>{if(options.method==='POST'){posts++;return post();}return response({required,configured:true});}});
 await h.settle();
 function input(value){h.find(node=>node.type==='input').props.onChange({target:{value}});h.render();}
 function submit(){return h.byId('staff-pin-form').props.onSubmit({preventDefault(){}});}
 return {h,input,submit,confirmed:()=>confirmed,closed:()=>closed,posts:()=>posts,remembered:()=>remembered};
}

test('required=false staff access confirms the retry review without requesting a PIN',async()=>{
 const f=await staffGate({required:false});assert(!f.h.byId('staff-pin-form'));assert.equal(f.h.byId('staff-confirm').props.children,'Review print request →');
 f.h.click('staff-confirm');assert.equal(f.confirmed(),1);assert.equal(f.posts(),0);f.h.unmount();
});

test('incomplete and incorrect PINs cannot authorize retry review',async()=>{
 const f=await staffGate();f.input('12');assert.equal(f.h.byId('staff-confirm').props.disabled,true);await f.submit();assert.equal(f.posts(),0);assert.equal(f.confirmed(),0);
 f.input('4826');await f.submit();f.h.render();assert.equal(f.posts(),1);assert.equal(f.confirmed(),0);assert(f.h.find(node=>node.props?.role==='alert'));f.h.unmount();
});

test('cancelling a pending PIN check prevents its later successful response from confirming retry review',async()=>{
 let complete;const pending=new Promise(resolve=>{complete=resolve;});
 const f=await staffGate({post:()=>pending});f.input('4826');const submission=f.submit();f.h.render();
 assert.equal(f.posts(),1);f.h.click('staff-cancel');assert.equal(f.closed(),1);f.h.unmount();
 complete(response({ok:true}));await submission;assert.equal(f.confirmed(),0);assert.equal(f.remembered(),0);
});
