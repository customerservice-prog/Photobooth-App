import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {probeSettingsStorage,readBoothCapabilities,probeLocalPhotoStorage,runBoothDiagnostics,boothDiagnosticChecks,diagnosticLimits} from '../app/lib/booth-readiness.mjs';

const archiveName='friendly-event-photos-v1';
const protectedPhoto=new Uint8Array([255,216,3,4,255,217]).buffer;
function storage(){
 const values=new Map([['event-settings','protected settings'],['event-photos','protected legacy photos']]);
 return {values,setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};
}

// Event-shaped IndexedDB fixture with explicit transaction completion. Tests
// never open an actual customer database or delete a browser photo archive.
function indexedDBFixture({failure,delayedOpen=false}={}){
 const databases=new Map([[archiveName,new Map([['guest-photo',protectedPhoto]])]]),trace=[],pending=[];
 let closes=0;
 function own(name){assert.match(name,/^friendly-booth-readiness-v1-photos-/);assert.notEqual(name,archiveName);}
 const idb={
  open(name,version){
   own(name);assert.equal(version,1);trace.push(['open',name]);
   const request={};
   const complete=()=>{
    if(failure==='open'){request.onerror?.();return;}
    if(failure==='blocked-open'){request.onblocked?.();return;}
    const records=new Map();databases.set(name,records);
    const db={
     close(){closes++;trace.push(['close',name]);},
     createObjectStore(storeName){assert.equal(storeName,'probe');},
     transaction(storeName,mode){
      assert.equal(storeName,'probe');trace.push(['transaction',mode]);
      let ended=false;
      const tx={
       abort(){if(ended)throw Error('Transaction is complete');ended=true;queueMicrotask(()=>tx.onabort?.());},
       objectStore(store){
        assert.equal(store,'probe');
        function operation(kind,key,value){
         const request={};trace.push([kind,key]);
         queueMicrotask(()=>{
          if(ended)return;
          if(failure===kind){ended=true;request.onerror?.();tx.onerror?.();return;}
          if(kind==='write')records.set(key,structuredClone(value));
          if(kind==='read')request.result=failure==='corrupt-read'?new Uint8Array([0]).buffer:structuredClone(records.get(key));
          if(kind==='delete')records.delete(key);
          request.onsuccess?.();
          queueMicrotask(()=>{if(!ended){ended=true;tx.oncomplete?.();}});
         });
         return request;
        }
        return {
         put(value,key){assert.equal(mode,'readwrite');assert(value instanceof ArrayBuffer);return operation('write',key,value);},
         get(key){assert.equal(mode,'readonly');return operation('read',key);},
         delete(key){assert.equal(mode,'readwrite');return operation('delete',key);}
        };
       }
      };
      return tx;
     }
    };
    request.result=db;request.onupgradeneeded?.();request.onsuccess?.();
   };
   if(delayedOpen)pending.push(complete);else queueMicrotask(complete);
   return request;
  },
  deleteDatabase(name){
   own(name);trace.push(['cleanup',name]);
   const request={};
   queueMicrotask(()=>{
    if(failure==='cleanup'){request.onerror?.();return;}
    if(failure==='blocked-cleanup'){request.onblocked?.();return;}
    databases.delete(name);request.onsuccess?.();
   });
   return request;
  }
 };
 return {idb,databases,trace,pending,get closes(){return closes;}};
}

test('settings storage is a read/write/delete test that preserves all event values',()=>{
 const data=storage(),before=[...data.values];
 assert.equal(probeSettingsStorage(data),true);
 assert.deepEqual([...data.values],before);
 assert.equal(probeSettingsStorage({setItem(){throw Error('Quota exceeded');},removeItem(){}}),false);
 assert.equal(probeSettingsStorage({setItem(){},getItem(){return null;},removeItem(){}}),false);
 assert.equal(probeSettingsStorage({setItem(){},getItem(){return '1';},removeItem(){throw Error('Denied');}}),false);
});

test('capabilities probe a real JPEG and remain distinct from permission, network delivery and photo storage',async()=>{
 const data=storage(),before=[...data.values],files=[];
 class TestFile extends Blob{constructor(parts,name,options){super(parts,options);this.name=name;}}
 const win={isSecureContext:true,localStorage:data,print(){},matchMedia:()=>({matches:true})};
 const nav={onLine:true,mediaDevices:{getUserMedia(){}},share(){},canShare({files:list}){files.push(...list);return true;}};
 const diag=readBoothCapabilities({win,nav,FileClass:TestFile});
 assert.deepEqual(diag,{secure:true,camera:true,share:true,fileShare:true,print:true,settingsStorage:true,photoStorage:null,online:true,standalone:true});
 assert.deepEqual([...data.values],before);
 assert.equal(files.length,1);assert.equal(files[0].type,'image/jpeg');assert.equal(files[0].name,'booth-check.jpg');
 const jpeg=Buffer.from(await files[0].arrayBuffer()),image=await sharp(jpeg).metadata();
 assert.equal(image.format,'jpeg');assert.equal(image.width,1);assert.equal(image.height,1);
 const rows=boothDiagnosticChecks(diag);
 assert.match(rows.find(row=>row.key==='online').label,/Browser reports/);
 assert.notEqual(rows.find(row=>row.key==='photoStorage').ok,rows.find(row=>row.key==='settingsStorage').ok);
 assert.match(diagnosticLimits,/camera permission/);assert.match(diagnosticLimits,/guest delivery/);assert.match(diagnosticLimits,/online backup/);assert.match(diagnosticLimits,/space or retention/);
});

test('unavailable browser APIs and blocked storage do not report readiness',()=>{
 const win={get localStorage(){throw Error('Denied');}};
 const diag=readBoothCapabilities({win,nav:{onLine:false,canShare(){throw Error('Denied');}}});
 for(const key of ['secure','camera','share','fileShare','print','settingsStorage','online','standalone'])assert.equal(diag[key],false,key);
 assert.equal(diag.photoStorage,null);
});

test('photo-storage success requires committed byte-buffer write, read, delete and isolated database cleanup',async()=>{
 const fixture=indexedDBFixture();
 assert.equal(await probeLocalPhotoStorage(fixture.idb),true);
 assert.deepEqual(fixture.trace.filter(([kind])=>['transaction','write','read','delete'].includes(kind)),[
  ['transaction','readwrite'],['write','sample'],['transaction','readonly'],['read','sample'],['transaction','readwrite'],['delete','sample']
 ]);
 assert(fixture.closes>0);assert.deepEqual([...fixture.databases.keys()],[archiveName]);
 assert.deepEqual(fixture.databases.get(archiveName).get('guest-photo'),protectedPhoto);
});

test('missing IndexedDB, denial, corrupt readback, failed deletion and blocked cleanup cannot pass',async()=>{
 assert.equal(await probeLocalPhotoStorage(null),false);
 assert.equal(await probeLocalPhotoStorage({open(){}}),false);
 for(const failure of ['open','blocked-open','write','read','corrupt-read','delete','cleanup','blocked-cleanup']){
  const fixture=indexedDBFixture({failure});
  assert.equal(await probeLocalPhotoStorage(fixture.idb),false,failure);
  assert.deepEqual(fixture.databases.get(archiveName).get('guest-photo'),protectedPhoto,failure+' leaves event photos intact');
  assert(fixture.trace.some(([kind])=>kind==='cleanup'),failure+' attempts cleanup');
 }
});

test('a stalled open times out and a late connection is closed without writing any sample',async()=>{
 const fixture=indexedDBFixture({delayedOpen:true});
 assert.equal(await probeLocalPhotoStorage(fixture.idb,{timeoutMs:10}),false);
 assert.equal(fixture.pending.length,1);
 fixture.pending.shift()();await new Promise(resolve=>setImmediate(resolve));
 assert(fixture.closes>0);
 assert(!fixture.trace.some(([kind])=>kind==='write'));
 assert.deepEqual([...fixture.databases.keys()],[archiveName]);
});

test('concurrent rehearsals use separate temporary databases and never open the event archive',async()=>{
 const fixture=indexedDBFixture();
 assert.deepEqual(await Promise.all([probeLocalPhotoStorage(fixture.idb),probeLocalPhotoStorage(fixture.idb)]),[true,true]);
 const names=fixture.trace.filter(([kind])=>kind==='open').map(([,name])=>name);
 assert.equal(new Set(names).size,2);assert.deepEqual([...fixture.databases.keys()],[archiveName]);
});

test('complete diagnostics never substitute settings success for unavailable photo storage',async()=>{
 const diag=await runBoothDiagnostics({win:{localStorage:storage()},nav:{onLine:true},idb:null});
 assert.equal(diag.settingsStorage,true);assert.equal(diag.photoStorage,false);assert.equal(diag.online,true);
});
