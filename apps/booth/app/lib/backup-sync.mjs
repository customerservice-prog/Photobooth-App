// IndexedDB originals are the durable, event-scoped retry queue. A server
// acknowledgment never removes photos, changes event settings or counts prints.
import {listCaptures,crc32} from './event-photo-archive.mjs';

const running=new Map();
const rejectedAuthorization=new Map();
const safe=id=>/^[A-Za-z0-9_-]{3,90}$/.test(id||'');
const safeToken=token=>typeof token==='string'&&token.length>0&&token.length<=500;
const MAX_ACK_AGE=29*86400000;
const states=new Set(['not-started','connecting','syncing','ready','offline','retry-later','needs-staff','needs-event-link','storage-full']);
export const BACKUP_STATUS_EVENT='friendly-booth-backup-status';
export const PHOTO_SAVED_EVENT='friendly-booth-photo-saved';
export function tokenKey(eventId){return 'friendly-booth-backup-token-v1-'+eventId;}
export function backupStatusKey(eventId){return 'friendly-booth-backup-status-v1-'+eventId;}
function get(storage,key){try{return storage.getItem(key);}catch{return null;}}
// This legacy helper means authorized, not uploaded. Use readBackupStatus for
// progress and never infer that the gallery is saved from the presence of a token.
export function backupEnabled(storage,eventId){return safe(eventId)&&safeToken(get(storage,tokenKey(eventId)));}
export function saveBackupToken(storage,eventId,token){
 if(!safe(eventId)||!safeToken(token))throw new Error('Invalid backup token');
 storage.setItem(tokenKey(eventId),token);
}
export function readBackupStatus(storage,eventId,{now=Date.now}={}){
 const initial={eventId,state:'not-started',total:null,saved:0,pending:null,sessions:0,updatedAt:null,lastSyncedAt:null};
 if(!safe(eventId))return initial;
 try{const value=JSON.parse(storage.getItem(backupStatusKey(eventId))||'null');
  if(value?.eventId!==eventId||!states.has(value.state)||!Number.isSafeInteger(value.total)||value.total<0||
   !Number.isSafeInteger(value.saved)||value.saved<0||value.saved>value.total||
   !Number.isSafeInteger(value.pending)||value.pending<0||value.saved+value.pending!==value.total)return initial;
  // An old screen must not claim a server gallery is retained forever. The
  // next archive scan checks individual acknowledgments and re-uploads as needed.
  if(value.state==='ready'&&value.total>0&&(!Number.isSafeInteger(value.oldestAcknowledgedAt)||
   now()-value.oldestAcknowledgedAt>=MAX_ACK_AGE||value.oldestAcknowledgedAt>now()))
   return {...value,state:'retry-later',saved:0,pending:value.total};
  return value;
 }catch{return initial;}
}
export function backupStatusLabel(status){
 const pending=status?.pending;
 if(status?.state==='ready')return status.total>0?'All '+status.total+' photo files saved to the event gallery.':'Automatic backup connected. Photos will save as guests take them.';
 if(status?.state==='syncing')return 'Saving event photos… '+(status.saved||0)+' of '+status.total+' files saved.';
 if(status?.state==='connecting')return 'Connecting this event to its private gallery…';
 if(status?.state==='offline')return 'Saved on this iPad. '+(pending>0?pending+' photo file'+(pending===1?'':'s')+' waiting for Wi-Fi.':'Backup will retry when this iPad is online.');
 if(status?.state==='needs-event-link')return 'Photos are safe on this iPad. Load a fresh iPad setup link from this event’s owner dashboard to reconnect its gallery.';
 if(status?.state==='needs-staff')return 'Photos are safe on this iPad. Unlock staff tools and retry, or load this event’s iPad setup link.';
 if(status?.state==='storage-full')return 'Photos are safe on this iPad. Online gallery storage is full; ask the owner to fix storage, then tap Retry backup now. '+(pending>0?pending+' photo file'+(pending===1?'':'s')+' still need to upload.':'');
 if(status?.state==='retry-later')return 'Photos are safe on this iPad. '+(pending>0?pending+' photo file'+(pending===1?'':'s')+' waiting to back up. ':'')+'Automatic backup will retry while online.';
 return 'Automatic event backup starts when this customer’s event is loaded.';
}
function publish(storage,eventId,status){
 const value={...status,eventId,updatedAt:new Date().toISOString()};
 try{storage.setItem(backupStatusKey(eventId),JSON.stringify(value));}catch{}
 try{if(typeof globalThis.dispatchEvent==='function'&&typeof CustomEvent==='function')globalThis.dispatchEvent(new CustomEvent(BACKUP_STATUS_EVENT,{detail:value}));}catch{}
 return value;
}
// Read only the loaded event's protected setup proof. An ID in a URL alone does
// not grant backup access, and another event's proof is never substituted.
export function eventBackupProof(storage,event){
 if(!event?.imported||event.demo||!safe(event.id))return null;
 try{const config=JSON.parse(storage.getItem(event.config)||'null');
  const proof=config?.adminHandoff?.syncTicket;
  return config?.eventId===event.id&&typeof proof==='string'&&proof.length>0&&proof.length<=512?proof:null;
 }catch{return null;}
}
function marker(scope,captureId,kind){return 'friendly-booth-uploaded-v1-'+scope+'-'+captureId+'-'+kind;}
function backupFailure(state){const error=new Error('Event photo backup needs another attempt.');error.backupState=state;return error;}
async function requestWithTimeout(request,url,options){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{return await request(url,{...options,signal:controller.signal,credentials:'same-origin',cache:'no-store'});}
 finally{clearTimeout(timer);}
}
async function entriesFor(records,scope,storage,now){
 const entries=[];
 for(const record of records){
  const images=(record.poses||[]).map((blob,i)=>({kind:'pose-'+(i+1),blob}));
  if(record.collage)images.push({kind:'collage',blob:record.collage});
  if(record.keepsake)images.push({kind:'keepsake',blob:record.keepsake});
  for(const image of images){
   const key=marker(scope,record.id,image.kind);
   let acknowledgment;try{acknowledgment=JSON.parse(get(storage,key)||'null');}catch{}
   // Originals and the capture collage are immutable. The finished keepsake
   // may be rendered later or updated, so its acknowledgment covers exact bytes.
   // The archive changes revision on every write. Reuse the verified fingerprint
   // only for that same revision, avoiding repeated JPEG reads during a rental.
   const revision=image.kind==='keepsake'&&typeof record.revision==='string'?record.revision:null;
   const cached=revision&&acknowledgment?.revision===revision&&
    typeof acknowledgment.fingerprint==='string'&&acknowledgment.fingerprint.startsWith('jpeg-v2:'+image.blob.size+':');
   const value=image.kind==='keepsake'?(cached?acknowledgment.fingerprint:'jpeg-v2:'+image.blob.size+':'+crc32(new Uint8Array(await image.blob.arrayBuffer()))):'immutable-jpeg-v1';
   const confirmedAt=acknowledgment?.confirmedAt;
   const saved=acknowledgment?.v===2&&acknowledgment.fingerprint===value&&Number.isSafeInteger(confirmedAt)&&
    confirmedAt<=now()&&now()-confirmedAt<MAX_ACK_AGE;
   // Earlier un-timed "yes" markers are safely re-uploaded once. Server writes
   // deduplicate originals and refresh the same row's retention on acknowledgment.
   entries.push({...image,captureId:record.id,key,value,revision,saved,confirmedAt:saved?confirmedAt:null});
  }
 }
 return entries;
}
async function syncPass(options,job){
 const {storage,scope,eventId,syncTicket,online=true,allowStaffAuthorization=false,forceRetry=false,now=Date.now,fetch:request=globalThis.fetch,list:readCaptures=listCaptures,
  isOnline=()=>globalThis.navigator?.onLine!==false}=options;
 let uploaded=0,entries=[],sessions=0,saved=0,oldestAcknowledgedAt=null;
 const previous=readBackupStatus(storage,eventId,{now});
 const authorizationKey=eventId+'::'+scope;
 const progress=state=>publish(storage,eventId,{scope,state,total:entries.length,saved,
  pending:entries.length-saved,sessions,uploaded,oldestAcknowledgedAt,
  lastSyncedAt:state==='ready'?new Date(now()).toISOString():previous.lastSyncedAt});
 const connected=()=>online!==false&&isOnline()!==false;
 try{
  const records=await readCaptures(scope);sessions=records.length;
  entries=await entriesFor(records,scope,storage,now);
  for(const entry of entries)if(entry.saved){saved++;oldestAcknowledgedAt=oldestAcknowledgedAt===null?entry.confirmedAt:Math.min(oldestAcknowledgedAt,entry.confirmedAt);}
  if(!connected())return progress('offline');
  if(previous.state==='storage-full'&&!forceRetry)return progress('storage-full');
  const rejected=rejectedAuthorization.get(authorizationKey);
  if(rejected&&rejected.proof===(syncTicket||null)&&!forceRetry)return progress(rejected.state);
  let token=get(storage,tokenKey(eventId));
  async function authorize(){
   progress('connecting');
   const response=await requestWithTimeout(request,'/api/backup/authorize',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({eventId,...(syncTicket?{syncTicket}:{})})});
   if(response.status===401){
    const state=syncTicket?'needs-event-link':'needs-staff';
    rejectedAuthorization.set(authorizationKey,{proof:syncTicket||null,state});
    throw backupFailure(state);
   }
   if(response.status===507)throw backupFailure('storage-full');
   if(!response.ok)throw backupFailure('retry-later');
   const data=await response.json();
   if(!safeToken(data?.token))throw backupFailure('retry-later');
   token=data.token;
   rejectedAuthorization.delete(authorizationKey);
   // A full localStorage should not prevent the durable photos from uploading.
   // The next run can safely obtain another ticket if it cannot be remembered.
   try{saveBackupToken(storage,eventId,token);}catch{}
  }
  if(!safeToken(token)){
   if(!syncTicket&&!allowStaffAuthorization)return progress('needs-staff');
   await authorize();
  }
  for(const entry of entries){
   if(entry.saved)continue;
   if(!connected())return progress('offline');
   progress('syncing');
   const upload=()=>requestWithTimeout(request,'/api/backup/image',{method:'POST',headers:{
    'Content-Type':'image/jpeg','Authorization':'Bearer '+token,'X-Booth-Event':eventId,
    'X-Booth-Capture':entry.captureId,'X-Booth-Kind':entry.kind
   },body:entry.blob});
   let response=await upload();
   if(response.status===401&&!job.renewed){
    job.renewed=true;
    try{storage.removeItem(tokenKey(eventId));}catch{}
    await authorize();
    if(!connected())return progress('offline');
    response=await upload();
   }
   if(response.status===401){
    const state=syncTicket?'needs-event-link':'needs-staff';
    rejectedAuthorization.set(authorizationKey,{proof:syncTicket||null,state});
    throw backupFailure(state);
   }
   if(response.status===507)throw backupFailure('storage-full');
   if(!response.ok)throw backupFailure('retry-later');
   const confirmation=await response.json();
   if(confirmation?.ok!==true)throw backupFailure('retry-later');
   entry.confirmedAt=now();
   try{storage.setItem(entry.key,JSON.stringify({v:2,fingerprint:entry.value,revision:entry.revision,confirmedAt:entry.confirmedAt}));}catch{}
   entry.saved=true;saved++;uploaded++;
   oldestAcknowledgedAt=oldestAcknowledgedAt===null?entry.confirmedAt:Math.min(oldestAcknowledgedAt,entry.confirmedAt);
   progress('syncing');
  }
  return progress('ready');
 }catch(error){return progress(connected()?(error?.backupState||'retry-later'):'offline');}
}
export function syncEventPhotos(options){
 const {storage,scope,eventId}=options;
 if(!storage||!safe(eventId)||typeof scope!=='string'||!scope)return Promise.resolve({state:'skipped'});
 const key=eventId+'::'+scope,existing=running.get(key);
 // Coalesce overlapping notifications while remembering a second archive
 // scan. A keepsake or next pose saved during upload is picked up immediately.
 if(existing){existing.requested=true;existing.options=options;return existing.promise;}
 const job={requested:false,renewed:false,promise:null,options};
 running.set(key,job);
 job.promise=(async()=>{let result;
  try{do{job.requested=false;result=await syncPass(job.options,job);}while(job.requested);return result;}
  finally{running.delete(key);}
 })();
 return job.promise;
}
