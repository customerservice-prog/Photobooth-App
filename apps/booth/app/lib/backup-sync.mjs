// Existing IndexedDB originals are the durable retry queue.
// Never remove local images in response to server acknowledgments or errors.
import {listCaptures} from './event-photo-archive.mjs';
const running=new Set();
const safe=id=>/^[A-Za-z0-9_-]{3,90}$/.test(id||'');
export function tokenKey(eventId){return 'friendly-booth-backup-token-v1-'+eventId;}
export function backupEnabled(storage,eventId){try{return Boolean(storage.getItem(tokenKey(eventId)));}catch{return false;}}
export function saveBackupToken(storage,eventId,token){
 if(!safe(eventId)||typeof token!=='string'||token.length>500)throw new Error('Invalid backup token');
 storage.setItem(tokenKey(eventId),token);
}
function marker(scope,captureId,kind){return 'friendly-booth-uploaded-v1-'+scope+'-'+captureId+'-'+kind;}
export async function syncEventPhotos({storage,scope,eventId,online=true}){
 if(!online||!safe(eventId)||!scope||running.has(scope))return {state:'skipped'};
 const token=storage.getItem(tokenKey(eventId));if(!token)return {state:'not-enabled'};
 running.add(scope);
 let uploaded=0,pending=0;
 try{
  const records=await listCaptures(scope);
  for(const record of records){
   const entries=[...record.poses.map((blob,i)=>({kind:'pose-'+(i+1),blob})),{kind:'collage',blob:record.collage}];
   if(record.keepsake)entries.push({kind:'keepsake',blob:record.keepsake});
   for(const entry of entries){
    const key=marker(scope,record.id,entry.kind);
    if(storage.getItem(key)==='yes')continue;
    pending++;
    if(navigator.onLine===false)return {state:'offline',uploaded,pending};
    const response=await fetch('/api/backup/image',{method:'POST',headers:{
      'Content-Type':'image/jpeg','Authorization':'Bearer '+token,
      'X-Booth-Event':eventId,'X-Booth-Capture':record.id,'X-Booth-Kind':entry.kind
    },body:entry.blob});
    if(response.status===401)return {state:'needs-staff',uploaded,pending};
    if(!response.ok)throw new Error('Photo backup server is unavailable.');
    storage.setItem(key,'yes');uploaded++;
   }
  }
  return {state:'ready',uploaded,pending:0};
 }catch{return {state:'retry-later',uploaded,pending};}
 finally{running.delete(scope);}
}
