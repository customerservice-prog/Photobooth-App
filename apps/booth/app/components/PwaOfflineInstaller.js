'use client';
import {useEffect} from 'react';
// Register only the public booth shell. Guest photos are NEVER sent to this worker.
export default function PwaOfflineInstaller(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
  let gone=false,registration=null;
  function warm(){
   if(gone||!navigator.serviceWorker.controller||navigator.onLine===false)return;
   const urls=new Set();
   for(const element of document.querySelectorAll('script[src],link[href]')){
    const raw=element.src||element.href;
    if(raw&&raw.startsWith(location.origin)&&raw.includes('/_next/static/'))urls.add(raw);
   }
   for(const entry of performance.getEntriesByType('resource')){
    if(entry.name.startsWith(location.origin)&&entry.name.includes('/_next/static/'))urls.add(entry.name);
   }
   navigator.serviceWorker.controller.postMessage({type:'CACHE_APP_RESOURCES',urls:[...urls]});
  }
  navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(async registered=>{
   if(gone)return;
   registration=registered;
   await navigator.serviceWorker.ready;
   warm();
   setTimeout(warm,1000);
  }).catch(()=>{});
  addEventListener('online',warm);
  navigator.serviceWorker.addEventListener('controllerchange',warm);
  return()=>{gone=true;removeEventListener('online',warm);navigator.serviceWorker.removeEventListener('controllerchange',warm);};
 },[]);
 return null;
}