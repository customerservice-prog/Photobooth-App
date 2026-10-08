'use client';
import {useState,useEffect} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
import {saveBackupToken,backupEnabled,syncEventPhotos} from '../lib/backup-sync.mjs';
export default function StaffBackupPanel(){
 const [status,setStatus]=useState('');
 useEffect(()=>{const event=workspace(location.search);if(backupEnabled(localStorage,event.id))setStatus('Backup authorized. New photos retry while online.');},[]);
 async function activate(){
  const event=workspace(location.search);
  if(!event.managed&&!event.imported)return setStatus('Load a customer event first.');
  setStatus('Connecting…');
  try{
   const r=await fetch('/api/backup/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:event.id})});
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   saveBackupToken(localStorage,event.id,data.token);setStatus('Backup enabled. Photos sync when online.');
  }catch(e){setStatus(e.message||'Unavailable');}
 }
 return <section className="operatorKioskCard"><h3>Private photo backups</h3>
  <p>Staff can authorize this iPad to securely back up event photos. Local originals remain intact.</p>
  <button type="button" className="operatorPrimary" onClick={activate}>Enable secure backups</button>
  <p role="status">{status}</p>
 </section>;
}