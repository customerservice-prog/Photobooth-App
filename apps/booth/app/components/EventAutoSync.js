'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {workspace} from '../lib/event-workspace.mjs';
import {applyBoothHandoff,fetchBoothSetup} from '../lib/booth-handoff.mjs';
import {applyStaffEvent,fetchStaffEvent} from '../lib/staff-event-client.mjs';
import {tokenKey} from '../lib/backup-sync.mjs';
export default function EventAutoSync(){
 const pathname=usePathname();
 useEffect(()=>{
  // A printer rehearsal reads the currently saved approved design. Returning
  // to the guest screen resumes normal event updates and pending photo backup.
  if(pathname==='/print-test')return;
  let stopped=false,busy=false;
  const controller=new AbortController();
  async function check(){
   if(stopped||busy||navigator.onLine===false)return;
   const scope=workspace(location.search);
   if(!scope.imported)return;
   if(sessionStorage.getItem('friendly-booth-settings-reload')==='yes'&&document.querySelector('.bwWelcome')&&!document.querySelector('dialog[open]')){
    sessionStorage.removeItem('friendly-booth-settings-reload');location.reload();return;
   }
   busy=true;
   try{
    const old=JSON.parse(localStorage.getItem(scope.config)||'null');
    const direct=old?.adminHandoff?.source==='staff';
    const ticket=direct?localStorage.getItem(tokenKey(scope.id)):old?.adminHandoff?.syncTicket;
    if(!ticket)return;
    const reply=direct?await fetchStaffEvent(scope.id,ticket,{signal:controller.signal}):null;
    const fresh=direct?reply.payload:await fetchBoothSetup({v:2,id:scope.id,sync:ticket},{signal:controller.signal});
    if(stopped)return;
    if(fresh.id!==scope.id||Date.parse(fresh.rev)<=Date.parse(old.adminHandoff.revision))return;
    if(direct)applyStaffEvent(localStorage,reply,{activate:false});
    else applyBoothHandoff(localStorage,fresh);
    sessionStorage.setItem('friendly-booth-settings-reload','yes');
   }catch{}finally{busy=false;}
  }
  const id=setInterval(check,60000);
  addEventListener('online',check);
  void check();
  return()=>{stopped=true;controller.abort();clearInterval(id);removeEventListener('online',check);};
 },[pathname]);
 return null;
}
