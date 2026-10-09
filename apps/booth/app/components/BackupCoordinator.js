'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {workspace} from '../lib/event-workspace.mjs';
import {syncEventPhotos,eventBackupProof,PHOTO_SAVED_EVENT} from '../lib/backup-sync.mjs';
export default function BackupCoordinator(){
 const pathname=usePathname();
 useEffect(()=>{
  // Choosing a booking is not a guest session in the legacy URL scope.
  if(pathname?.startsWith('/staff/'))return;
  let stopped=false;
  const run=event=>{
   if(stopped)return;
   try{
    const scope=workspace(location.search);
    if(scope.demo||(!scope.managed&&!scope.imported&&scope.id!=='legacy'))return;
    // Ignore notifications for another saved customer archive. Navigation,
    // online retries and this event's own captures use the current URL scope.
    if(event?.detail?.scope&&event.detail.scope!==scope.archive)return;
    void syncEventPhotos({storage:localStorage,scope:scope.archive,eventId:scope.id,
     syncTicket:eventBackupProof(localStorage,scope),online:navigator.onLine});
   }catch{}
  };
  const visible=()=>{if(document.visibilityState==='visible')run();};
  const timer=setInterval(run,30000);
  for(const event of ['online','offline','popstate','hashchange',PHOTO_SAVED_EVENT])addEventListener(event,run);
  document.addEventListener('visibilitychange',visible);
  run();
  return()=>{stopped=true;clearInterval(timer);for(const event of ['online','offline','popstate','hashchange',PHOTO_SAVED_EVENT])removeEventListener(event,run);document.removeEventListener('visibilitychange',visible);};
 },[pathname]);
 return null;
}
