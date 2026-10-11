// Capability checks are evidence for a rehearsal, not proof of a completed
// capture, print, share, or remote backup. Keep settings and photo storage apart.
const PROBE_PREFIX='friendly-booth-readiness-v1-';
const SAMPLE=new Uint8Array([70,80,82,0,255,216,255,217]);
const JPEG_SAMPLE='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AD//Z';
const uniqueId=()=>{try{const id=globalThis.crypto?.randomUUID?.();if(id)return id;}catch{}return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);};

export const diagnosticLimits='These checks do not confirm camera permission, a saved event photo, guest delivery, or an online backup. The photo-storage test uses a small temporary IndexedDB record; it cannot guarantee space or retention for future photos. Check Recent photo recovery and Automatic event gallery after a test capture, confirm receipt on another device, and inspect a real 4 × 6 print. Guided Access needs a physical iPad test.';

export function probeSettingsStorage(storage){
 const key=PROBE_PREFIX+'settings-'+uniqueId();
 let ok=false;
 try{storage.setItem(key,'1');ok=storage.getItem(key)==='1';}
 catch{}
 finally{try{storage.removeItem(key);}catch{ok=false;}}
 return ok;
}

export function readBoothCapabilities({win=globalThis.window,nav=globalThis.navigator,FileClass=globalThis.File,BlobClass=globalThis.Blob}={}){
 let settingsStorage=false,fileShare=false,standalone=false;
 try{settingsStorage=probeSettingsStorage(win.localStorage);}catch{}
 try{
  // Match the image type used by finished booth keepsakes. canShare does not
  // open a share sheet, transfer this file, or verify a receiving app.
  const bytes=Uint8Array.from(atob(JPEG_SAMPLE),character=>character.charCodeAt(0));
  const file=new FileClass([new BlobClass([bytes],{type:'image/jpeg'})],'booth-check.jpg',{type:'image/jpeg'});
  fileShare=nav.canShare?.({files:[file]})===true;
 }catch{}
 try{standalone=nav.standalone===true||win.matchMedia?.('(display-mode: standalone)').matches===true;}catch{}
 return {
  secure:win?.isSecureContext===true,
  camera:typeof nav?.mediaDevices?.getUserMedia==='function',
  share:typeof nav?.share==='function',
  fileShare,
  print:typeof win?.print==='function',
  settingsStorage,
  photoStorage:null,
  online:nav?.onLine===true,
  standalone
 };
}

// Use a new, separate database for every invocation. Never open the event
// archive, edit an event record, request persistence, or upload a probe file.
// A success requires committed byte-buffer write, readback, delete, and cleanup.
export function probeLocalPhotoStorage(idb,{timeoutMs=5000}={}){
 try{
  if(idb===undefined)idb=globalThis.indexedDB;
  if(typeof idb?.open!=='function'||typeof idb?.deleteDatabase!=='function')return Promise.resolve(false);
 }catch{return Promise.resolve(false);}
 const name=PROBE_PREFIX+'photos-'+uniqueId();
 return new Promise(resolve=>{
  let db,tx,settled=false,cleaning=false;
  const timer=setTimeout(()=>finish(false,true),timeoutMs);
  function close(){try{db?.close();}catch{}}
  function remove(){try{return idb.deleteDatabase(name);}catch{return null;}}
  function finish(ok,discard=false){
   if(settled)return;
   settled=true;clearTimeout(timer);
   try{tx?.abort();}catch{}
   close();
   if(discard)remove();
   resolve(ok);
  }
  function cleanup(ok){
   if(settled||cleaning)return;
   cleaning=true;close();
   const request=remove();
   if(!request){finish(false);return;}
   request.onsuccess=()=>finish(ok);
   request.onerror=()=>finish(false);
   request.onblocked=()=>finish(false);
  }
  function fail(){try{tx?.abort();}catch{}cleanup(false);}
  function stage(mode,job,next){
   if(settled||cleaning)return;
   try{
    tx=db.transaction('probe',mode);
    tx.onerror=fail;tx.onabort=fail;
    tx.oncomplete=()=>{if(!settled&&!cleaning)next();};
    job(tx.objectStore('probe'));
   }catch{fail();}
  }
  let request;
  try{request=idb.open(name,1);}catch{finish(false,true);return;}
  request.onupgradeneeded=()=>{
   if(settled){try{request.transaction?.abort();}catch{}return;}
   try{request.result.createObjectStore('probe');}catch{fail();}
  };
  request.onerror=()=>cleanup(false);
  request.onblocked=()=>cleanup(false);
  request.onsuccess=()=>{
   db=request.result;
   // An open request can finish after a timeout. Close that late connection
   // too, so queued diagnostic cleanup cannot be blocked by it.
   if(settled||cleaning){close();remove();return;}
   db.onversionchange=()=>{close();fail();};
   stage('readwrite',store=>store.put(SAMPLE.slice().buffer,'sample'),()=>{
    let matches=false;
    stage('readonly',store=>{
     const read=store.get('sample');
     read.onsuccess=()=>{
      const value=read.result;
      const bytes=value instanceof ArrayBuffer?new Uint8Array(value):null;
      matches=bytes?.length===SAMPLE.length&&SAMPLE.every((byte,index)=>bytes[index]===byte);
     };
     read.onerror=fail;
    },()=>{
     if(!matches){fail();return;}
     stage('readwrite',store=>store.delete('sample'),()=>cleanup(true));
    });
   });
  };
 });
}

export async function runBoothDiagnostics(options={}){
 const diag=readBoothCapabilities(options);
 let idb;
 try{idb=Object.hasOwn(options,'idb')?options.idb:(options.win??globalThis.window)?.indexedDB??globalThis.indexedDB;}catch{}
 return {...diag,photoStorage:await probeLocalPhotoStorage(idb,options)};
}

export function boothDiagnosticChecks(diag){
 return [
  {key:'secure',label:'Secure booth context',ok:diag.secure},
  {key:'camera',label:'Camera API available',ok:diag.camera},
  {key:'share',label:'Share sheet API available',ok:diag.share},
  {key:'fileShare',label:'JPEG file sharing supported',ok:diag.fileShare},
  {key:'print',label:'Browser print dialog available',ok:diag.print},
  {key:'settingsStorage',label:'Local settings storage test',ok:diag.settingsStorage},
  {key:'photoStorage',label:'Local photo storage test (IndexedDB)',ok:diag.photoStorage},
  {key:'online',label:'Browser reports network online',ok:diag.online},
  {key:'standalone',label:'Running from Home Screen',ok:diag.standalone}
 ];
}
