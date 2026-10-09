'use client';
import {useState,useEffect} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
import {syncEventPhotos,eventBackupProof,readBackupStatus,backupStatusLabel,BACKUP_STATUS_EVENT} from '../lib/backup-sync.mjs';
export default function StaffBackupPanel(){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const refresh=()=>{try{const event=workspace(location.search);setStatus(event.demo?{state:'demo'}:readBackupStatus(localStorage,event.id));}catch{}};
  refresh();addEventListener(BACKUP_STATUS_EVENT,refresh);addEventListener('storage',refresh);
  return()=>{removeEventListener(BACKUP_STATUS_EVENT,refresh);removeEventListener('storage',refresh);};
 },[]);
 async function retry(){
  if(busy)return;
  const event=workspace(location.search);
  if(event.demo)return;
  setBusy(true);
  try{
   const result=await syncEventPhotos({storage:localStorage,scope:event.archive,eventId:event.id,
    syncTicket:eventBackupProof(localStorage,event),online:navigator.onLine,allowStaffAuthorization:true,forceRetry:true});
   setStatus(result);
  }catch{setStatus({state:'retry-later'});}finally{setBusy(false);}
 }
 return <section className="operatorKioskCard" data-testid="staff-backup-panel"><h3>Automatic event gallery</h3>
  <p>Every original photo and finished print saves automatically to this customer’s private gallery while the iPad is online. Photos also stay on this iPad, and uploads retry after a connection interruption.</p>
  {status?.state!=='demo'&&<button type="button" className="operatorPrimary" onClick={retry} disabled={busy}>{busy?'Checking backup…':'Retry backup now'}</button>}
  <p role="status" data-testid="staff-backup-status">{status?.state==='demo'?'Sample session only. No customer event gallery is updated.':backupStatusLabel(status)}</p>
 </section>;
}
