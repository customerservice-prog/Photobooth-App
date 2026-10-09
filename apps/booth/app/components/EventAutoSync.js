'use client';
import {useEffect} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
import {applyBoothHandoff,fetchBoothSetup} from '../lib/booth-handoff.mjs';
export default function EventAutoSync(){
 useEffect(()=>{
  let stopped=false,busy=false;
  async function check(){
   if(stopped||busy||navigator.onLine===false)return;
   const scope=workspace(location.search);
   if(!scope.imported)return;
   if(sessionStorage.getItem('friendly-booth-settings-reload')==='yes'&&document.querySelector('.bwWelcome')&&!document.querySelector('dialog[open]')){
    sessionStorage.removeItem('friendly-booth-settings-reload');location.reload();return;
   }
   const old=JSON.parse(localStorage.getItem(scope.config)||'null');
   const ticket=old?.adminHandoff?.syncTicket;
   if(!ticket)return;
   busy=true;
   try{
    const fresh=await fetchBoothSetup({v:2,id:scope.id,sync:ticket});
    if(fresh.id!==scope.id||Date.parse(fresh.rev)<=Date.parse(old.adminHandoff.revision))return;
    applyBoothHandoff(localStorage,fresh);
    sessionStorage.setItem('friendly-booth-settings-reload','yes');
   }catch{}finally{busy=false;}
  }
  const id=setInterval(check,60000);
  addEventListener('online',check);
  void check();
  return()=>{stopped=true;clearInterval(id);removeEventListener('online',check);};
 },[]);
 return null;
}
