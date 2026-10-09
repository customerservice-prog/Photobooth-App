'use client';
import {useEffect,useState} from 'react';
import {archiveCount,exportPhotos,downloadBlob,deleteArchivedEvent} from '../lib/event-photo-archive.mjs';
import {readBackupStatus,backupStatusLabel,BACKUP_STATUS_EVENT,syncEventPhotos,eventBackupProof} from '../lib/backup-sync.mjs';
import {canCloseImportedEvent,clearClosedEventSettings,EVENT_CLOSE_CONFIRMATION,galleryZipFilename} from '../lib/event-lifecycle.mjs';

export default function StaffEventCloseout({scope,eventName}){
 const eligible=canCloseImportedEvent(scope);
 const [count,setCount]=useState(null),[exported,setExported]=useState(null),[verified,setVerified]=useState(false);
 const [typed,setTyped]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [backup,setBackup]=useState(null);
 useEffect(()=>{let active=true;archiveCount(scope.archive).then(n=>{if(active)setCount(n);}).catch(()=>{if(active)setStatus('Could not read the photo archive. Do not delete anything.');});return()=>{active=false;};},[scope.archive]);
 useEffect(()=>{const refresh=()=>setBackup(readBackupStatus(localStorage,scope.id));refresh();addEventListener(BACKUP_STATUS_EVENT,refresh);return()=>removeEventListener(BACKUP_STATUS_EVENT,refresh);},[scope.id]);
 async function exportGallery(){
  if(busy)return;
  setBusy(true);setStatus('Preparing the complete event ZIP…');setVerified(false);setExported(null);
  try{
   const result=await exportPhotos(scope.archive,{allowEmpty:true});
   downloadBlob(result.blob,galleryZipFilename(eventName));
   setExported({count:result.count,finished:result.finishedKeepsakes,size:result.blob.size,snapshot:result.snapshot});
   setCount(result.count);
   setStatus('ZIP download requested. Open it in Files/Downloads and verify the photos before clearing the event.');
  }catch(error){setStatus(error.message||'Could not export these photos. Nothing was removed.');}
  finally{setBusy(false);}
 }
 async function closeEvent(){
  if(!eligible||busy||!exported||!verified||typed!==EVENT_CLOSE_CONFIRMATION)return;
  setBusy(true);setStatus('Checking that no photos changed since export…');
  try{
   // Re-scan the actual archive before cleanup. A remembered authorization or
   // an old zero-pending status is not proof that the current images uploaded.
   const result=await syncEventPhotos({storage:localStorage,scope:scope.archive,eventId:scope.id,syncTicket:eventBackupProof(localStorage,scope),online:navigator.onLine});
   if(result.state!=='ready'||result.pending!==0)throw new Error('Keep this event on the iPad until every photo is saved online. Reconnect Wi-Fi and use Retry backup now, then check the event digital gallery. Your downloaded ZIP is also available.');
   const current=await archiveCount(scope.archive);
   if(current!==exported.count)throw new Error('More photos were taken after the ZIP export. Download an updated ZIP first.');
   await deleteArchivedEvent(scope.archive,exported.count,exported.snapshot);
   clearClosedEventSettings(localStorage,scope);
   setStatus('This event was removed from this iPad. Opening event selection…');
   window.location.replace('/launch');
  }catch(error){setStatus(error.message||'Cleanup could not finish. Do not clear Safari data.');setBusy(false);}
 }
 return <section className="operatorKioskCard" data-testid="staff-end-event" aria-label="After the event">
  <div className="operatorKioskTop">
   <div><span className="operatorOverline">AFTER THE EVENT · STAFF ONLY</span><h3>Save the gallery. Then prepare for the next rental.</h3>
    <p>Photos upload automatically to this event’s private digital gallery. Keep this iPad online until every photo is saved, then download the gallery to send to the customer.</p></div>
  </div>
  <div className="operatorStats">
   <div><small>PHOTO SESSIONS</small><strong>{count===null?'—':count}</strong></div>
   <div><small>ONLINE EVENT GALLERY</small><strong>{backup?.state==='ready'&&backup.pending===0?'All photos saved':backup?.pending>0?backup.pending+' files waiting':'Checking backup'}</strong><span>{backupStatusLabel(backup)}</span></div>
  </div>
  <div className="operatorFoldContent" style={{padding:0}}>
   <p><strong>1. Download all event photos.</strong> Open this event’s Digital gallery in the owner dashboard to download its online photos. The iPad ZIP below provides an additional copy of every original pose and available finished 4×6 JPEG.</p>
   {eligible&&<a className="operatorSecondary" href={'https://photobooth-app-production.up.railway.app/events/'+encodeURIComponent(scope.id)+'/backups'} target="_blank" rel="noopener noreferrer">Open this event’s digital gallery</a>}
   <button type="button" className="operatorPrimary" disabled={busy||count===null} onClick={exportGallery} data-testid="staff-export-gallery">{busy?'Working…':count===0?'Download empty-event record ZIP':'Download complete event gallery ZIP'}</button>
   {count===0&&<p>There are no captured sessions in this event on this device. Download and check the empty-event ZIP before removing its setup.</p>}
   {exported&&<p className="operatorNotice" data-testid="staff-export-result">ZIP requested: {exported.count} photo sessions, {exported.finished} finished keepsakes. Open the ZIP to check that everything is there. {exported.finished<exported.count?'Some sessions only have original captures and a collage.':''}</p>}
   {eligible&&<details className="operatorFold" data-testid="staff-finish-event-fold">
    <summary>2. Remove this completed event from the iPad <span>Only after saving and verifying the gallery</span></summary>
    <div className="operatorFoldContent">
     <p><strong>Before removing:</strong> wait for all photos to save online, open the ZIP, confirm its photographs, and deliver or securely keep the digital gallery for the customer. The app cannot tell whether a download actually saved.</p>
     <label className="operatorWakeToggle"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} disabled={!exported||busy}/><span><strong>I opened the ZIP and verified the customer’s photos.</strong><small>This also confirms I have a usable copy before deletion.</small></span></label>
     <label className="formField" style={{marginTop:12}}>Type CLOSE EVENT to remove only this event from this iPad
      <input className="input" data-testid="staff-close-event-confirm" value={typed} onChange={e=>setTyped(e.target.value.toUpperCase())} placeholder={EVENT_CLOSE_CONFIRMATION} disabled={!verified||busy}/>
     </label>
     <button type="button" className="operatorDangerText" data-testid="staff-remove-event" disabled={!exported||!verified||typed!==EVENT_CLOSE_CONFIRMATION||busy} onClick={closeEvent}>Remove this event and return to setup</button>
     <p><strong>Important:</strong> This action permanently removes the selected event’s local photos, settings and local print ledger. It does not remove other events, and does not delete an existing private server backup or the admin booking.</p>
    </div>
   </details>}
   {!eligible&&<p className="operatorNotice">This is an older shared or sample event. Export its photos here, but local deletion is disabled to protect other saved events. Load the next customer’s booking from Staff Tools when ready.</p>}
   <p role="status" className="operatorNotice">{status}</p>
  </div>
 </section>;
}
