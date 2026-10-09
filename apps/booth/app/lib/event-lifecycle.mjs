// Safe per-event cleanup. Never clear all browser storage, never remove an
// archived customer's gallery before ZIP export and staff verification.
import {ACTIVE_EVENT_KEY} from './active-event.mjs';
import {PRINT_LEDGER_PREFIX} from './print-ledger.mjs';
import {tokenKey,backupStatusKey} from './backup-sync.mjs';
export const EVENT_CLOSE_CONFIRMATION='CLOSE EVENT';
export function canCloseImportedEvent(scope){
 return Boolean(scope?.imported&&!scope.demo&&/^[A-Za-z0-9_-]{3,90}$/.test(scope.id||'')&&
   scope.archive==='transfer:'+scope.id&&
   scope.config==='friendly-booth-transfer-v1-'+scope.id+'-config');
}
export function clearClosedEventSettings(storage,scope){
 if(!canCloseImportedEvent(scope))throw new Error('Only a fully exported customer event can be removed from this iPad.');
 const exact=[scope.config,scope.previous,scope.usage,scope.photos,tokenKey(scope.id),backupStatusKey(scope.id),
   PRINT_LEDGER_PREFIX+scope.id+'-transfer'];
 const marker='friendly-booth-uploaded-v1-'+scope.archive+'-';
 const keys=[];
 for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(marker))keys.push(k);}
 for(const key of [...exact,...keys])storage.removeItem(key);
 for(const key of [ACTIVE_EVENT_KEY,'friendly-booth-assigned-event-v1']){
  if(storage.getItem(key)===scope.id)storage.removeItem(key);
 }
 return {removedSettings:exact.length,removedUploadMarkers:keys.length};
}
export const galleryZipFilename=(name='event')=>
 (String(name).normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,45)||'event')+'-all-digital-photos.zip';
