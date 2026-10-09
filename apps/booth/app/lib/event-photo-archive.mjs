// Device-local, event-scoped archive. No rolling deletion and no network upload.
// Persist byte buffers rather than Blob-backed temporary files. This also works
// in WebKit contexts that reject direct Blob serialization into IndexedDB.
const DB='friendly-event-photos-v1',STORE='captures';
export function openArchive(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB){reject(new Error('Photo storage is unavailable on this device.'));return;}
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>{const store=request.result.createObjectStore(STORE,{keyPath:'key'});store.createIndex('scope','scope',{unique:false});};
 request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
 request.onerror=()=>reject(request.error||new Error('Photo storage could not open.'));
 request.onblocked=()=>reject(new Error('Close other booth tabs and reopen the event.'));
});}
async function transaction(mode,job){const db=await openArchive();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result,failure;
 tx.oncomplete=()=>resolve(result);tx.onerror=e=>reject(failure||e.target?.error||tx.error||new Error('Photo storage failed.'));tx.onabort=()=>reject(failure||tx.error||new Error('Photo storage was interrupted.'));
 try{job(store,v=>{result=v;},error=>{failure=error;tx.abort();});}catch(e){tx.abort();reject(e);}
});}finally{db.close();}}
function jpeg(data){
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data||''))throw new Error('Only captured JPEG photos can be archived.');
 const bytes=atob(data.split(',')[1]);return Uint8Array.from(bytes,c=>c.charCodeAt(0)).buffer;
}
const photoBlob=value=>value instanceof Blob?value:new Blob([value],{type:'image/jpeg'});
function materialize(record){return {...record,collage:photoBlob(record.collage),poses:record.poses.map(photoBlob),keepsake:record.keepsake?photoBlob(record.keepsake):null};}
export async function saveCapture(scope,id,data,shots,cfg){
 if(!scope||!id||!Array.isArray(shots)||![1,3,4].includes(shots.length))throw new Error('The photo session is incomplete.');
 const record={key:scope+':'+id,id,scope,createdAt:new Date().toISOString(),revision:crypto.randomUUID(),encoding:'jpeg-arraybuffer',collage:jpeg(data),poses:shots.map(jpeg),keepsake:null,title:String(cfg.title||''),eventDate:String(cfg.date||'')};
 await transaction('readwrite',s=>s.add(record));return materialize(record);
}
function identicalImage(left,right){
 const bytes=value=>value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null;
 const a=bytes(left),b=bytes(right);
 return Boolean(a&&b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
}
// Import the old localStorage gallery without writing to or clearing it. Its
// JPEG may be a multi-photo collage, so unknown original poses stay unknown.
// One transaction commits every distinct capture or retains the entire source
// unchanged on failure. Reopening the booth never imports an ID twice.
export async function importLegacyCaptures(scope,entries,cfg={}){
 if(typeof scope!=='string'||!scope||!Array.isArray(entries))throw new Error('The older photo backup could not be read. It was left unchanged.');
 const records=new Map();
 for(const [index,entry] of entries.entries()){
  if(!entry||typeof entry!=='object')throw new Error('An older saved photo could not be read. The local backup was left unchanged.');
  const collage=jpeg(entry.data),id=typeof entry.id==='string'&&entry.id?entry.id:'legacy-'+index+'-'+crc32(new Uint8Array(collage)).toString(16);
  const previous=records.get(id);
  if(previous){if(!identicalImage(previous.collage,collage))throw new Error('Older saved photos have conflicting IDs. The local backup was left unchanged.');continue;}
  const createdAt=typeof entry.createdAt==='string'&&Number.isFinite(Date.parse(entry.createdAt))?new Date(entry.createdAt).toISOString():new Date().toISOString();
  records.set(id,{key:scope+':'+id,id,scope,createdAt,revision:crypto.randomUUID(),encoding:'jpeg-arraybuffer',collage,poses:[],keepsake:null,
   originalPosesUnknown:true,importSource:'legacy-localStorage-v1',title:String(cfg.title||''),eventDate:String(cfg.date||'')});
 }
 return transaction('readwrite',(store,done,abort)=>{
  let imported=0,existing=0,remaining=records.size;
  if(!remaining){done({imported,existing,total:0});return;}
  for(const record of records.values()){
   const request=store.get(record.key);
   request.onsuccess=()=>{
    if(request.result){
     if(!identicalImage(request.result.collage,record.collage)){abort(new Error('A saved photo has conflicting data. The older local backup was left unchanged.'));return;}
     existing++;
    }else{store.add(record);imported++;}
    if(--remaining===0)done({imported,existing,total:records.size});
   };
  }
 });
}
export async function saveKeepsake(scope,id,blob){
 if(!(blob instanceof Blob)||blob.type!=='image/jpeg')throw new Error('The finished keepsake is not ready.');
 // Resolve asynchronous file reading BEFORE creating the transaction, since
 // Safari can close a transaction while unrelated asynchronous work is pending.
 const bytes=await blob.arrayBuffer();
 await transaction('readwrite',store=>{const req=store.get(scope+':'+id);req.onsuccess=()=>{if(!req.result){store.transaction.abort();return;}store.put({...req.result,keepsake:bytes,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()});};});
}
async function archiveRecords(scope){return transaction('readonly',(s,done)=>{const r=s.index('scope').getAll(scope);r.onsuccess=()=>done(r.result);});}
export async function listCaptures(scope){const records=await archiveRecords(scope);return records.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(materialize);}
export async function archiveCount(scope){return transaction('readonly',(s,done)=>{const r=s.index('scope').count(scope);r.onsuccess=()=>done(r.result);});}
export function blobDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
export async function recentCaptures(scope,limit=8){const all=await listCaptures(scope);return Promise.all(all.slice(-limit).reverse().map(async r=>({id:r.id,createdAt:r.createdAt,data:await blobDataUrl(r.collage)})));}
// JPEG files are already compressed. CRC calculation reads only one file at a time.
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const n of bytes)crc=crcTable[(crc^n)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function imageFingerprint(value){
 if(value==null)return null;
 // Old Blob-backed records remain exportable. All supported writes now use
 // byte buffers and a new UUID revision, including updates to an old record.
 if(value instanceof Blob)return ['legacy-blob',value.size,value.type];
 const bytes=value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):null;
 if(!bytes)throw new Error('A saved photo could not be verified. Keep this event and ask staff to check storage.');
 return [bytes.length,crc32(bytes)];
}
export function archiveSnapshot(scope,records){
 return {version:1,scope,records:records.map(r=>({
  key:r.key,id:r.id,scope:r.scope,createdAt:r.createdAt,updatedAt:r.updatedAt||'',revision:r.revision||'',
  title:r.title||'',eventDate:r.eventDate||'',encoding:r.encoding||'',
  collage:imageFingerprint(r.collage),poses:r.poses.map(imageFingerprint),keepsake:imageFingerprint(r.keepsake)
 })).sort((a,b)=>a.key.localeCompare(b.key))};
}
export async function makeZip(files){
 if(files.length>65535)throw new Error('Too many files for one archive.');
 const chunks=[],central=[];let offset=0,centralSize=0;
 for(const {name,blob} of files){
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.includes('..')||name.startsWith('/'))throw new Error('Invalid archive filename.');
  if(blob.size>0xffffffff||offset+blob.size>0xffffffff)throw new Error('This archive is too large for a single download.');
  const filename=new TextEncoder().encode(name),crc=crc32(new Uint8Array(await blob.arrayBuffer())),local=new Uint8Array(30+filename.length),l=new DataView(local.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,blob.size,true);l.setUint32(22,blob.size,true);l.setUint16(26,filename.length,true);local.set(filename,30);
  const entry=new Uint8Array(46+filename.length),c=new DataView(entry.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,blob.size,true);c.setUint32(24,blob.size,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);entry.set(filename,46);
  chunks.push(local,blob);central.push(entry);offset+=local.length+blob.size;centralSize+=entry.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'application/zip'});
}
export async function exportPhotos(scope,{allowEmpty=false}={}){
 const stored=await archiveRecords(scope),snapshot=archiveSnapshot(scope,stored);
 const records=stored.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(materialize);
 if(!records.length&&!allowEmpty)throw new Error('No photos have been captured in this event on this device yet.');
 const files=[],manifest={scope,createdAt:new Date().toISOString(),sessions:records.length,finishedKeepsakes:records.filter(r=>r.keepsake).length,note:'Photos stored on this device only. Demonstration and live-event archives are separate. Collages are included for interrupted sessions without a finished keepsake.'};
 files.push({name:'manifest.json',blob:new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})});
 records.forEach((r,n)=>{const folder='session-'+String(n+1).padStart(4,'0')+'/';r.poses.forEach((blob,i)=>files.push({name:folder+'pose-'+(i+1)+'.jpg',blob}));files.push({name:folder+(r.keepsake?'keepsake.jpg':'collage.jpg'),blob:r.keepsake||r.collage});});
 return {blob:await makeZip(files),count:records.length,finishedKeepsakes:manifest.finishedKeepsakes,snapshot};
}
// Irreversible cleanup for a single, already-exported event only.
// The exact record snapshot and deletes share ONE IndexedDB transaction. A new
// session OR a changed finished image must force a fresh export before deletion.
export async function deleteArchivedEvent(scope,expectedCount,expectedSnapshot){
 if(typeof scope!=='string'||scope.length<3||!Number.isSafeInteger(expectedCount)||expectedCount<0||
  expectedSnapshot?.version!==1||expectedSnapshot.scope!==scope||!Array.isArray(expectedSnapshot.records)||expectedSnapshot.records.length!==expectedCount)
  throw new Error('Choose one valid event and export it before deleting photos.');
 const expected=JSON.stringify(expectedSnapshot);
 return transaction('readwrite',(store,done,abort)=>{
  const request=store.index('scope').getAll(scope);
  request.onsuccess=()=>{
   const records=request.result||[];
   try{
    if(records.length!==expectedCount||JSON.stringify(archiveSnapshot(scope,records))!==expected){
     abort(new Error('Event photos changed after the ZIP export. Download and verify an updated ZIP first.'));return;
    }
    for(const record of records)store.delete(record.key);
    done(records.length);
   }catch(error){abort(error);}
  };
 });
}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}

export async function capturePoses(scope,id){
 const record=await transaction('readonly',(store,done)=>{const r=store.get(scope+':'+id);r.onsuccess=()=>done(r.result);});
 if(!record)return [];
 return Promise.all(record.poses.map(value=>blobDataUrl(photoBlob(value))));
}
