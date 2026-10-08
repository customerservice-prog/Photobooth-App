'use client';
import {useEffect,useRef,useState} from 'react';
import {BOOTH_RELEASE} from '../lib/booth-launch.mjs';
import {compareReleases,readAppVersion,updateDestination,refreshInstalledWorkerOnManualUpdate} from '../lib/app-update.mjs';
import './app-update.css';

function UpdateDialog({children,onClose}){
  const ref=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const element=ref.current,previous=document.activeElement;element.showModal();return()=>{element.close();previous?.focus?.();};},[]);
  return <dialog ref={ref} className="buDialog" aria-label="Update Friendly Booth" onCancel={e=>{e.preventDefault();close.current();}} onClick={e=>{if(e.target===ref.current)close.current();}}>{children}</dialog>;
}

// Mounted only on the welcome and launcher, never during a capture or print.
export default function AppUpdate({disabled=false}){
  const [open,setOpen]=useState(false),[latest,setLatest]=useState(null),[checking,setChecking]=useState(false),[error,setError]=useState('');
  const active=useRef(false),allowed=useRef(!disabled),pending=useRef(null);
  allowed.current=!disabled;
  async function check(reload=false){
    if(!active.current||!allowed.current)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setChecking(true);setError('');
    try{
      if(navigator.onLine===false)throw new Error('You are offline. Keep the booth open and connect to Wi-Fi before updating.');
      const info=await readAppVersion({signal:controller.signal});
      if(!active.current||!allowed.current||controller.signal.aborted)return;
      setLatest(info);
      if(compareReleases(info.version,BOOTH_RELEASE)<0)throw new Error('An update is still being deployed. Keep this version open and try again shortly.');
      if(reload){
        // A late network response must never interrupt a newly started session.
        if(document.querySelector('.pcStage,.ksStudio'))return;
        // Explicitly refresh the installed iPad app shell before reloading.
        // No cache/data clearing and no reload while guests are capturing.
        await refreshInstalledWorkerOnManualUpdate();
        if(!active.current||!allowed.current||controller.signal.aborted||
           document.querySelector('.pcStage,.ksStudio'))return;
        window.location.replace(updateDestination(window.location.pathname,window.location.search,info.version));
      }
    }catch(e){if(active.current&&!controller.signal.aborted)setError(e.message);}
    finally{if(active.current&&pending.current===controller){pending.current=null;setChecking(false);}}
  }
  useEffect(()=>{
    active.current=true;
    if(disabled){pending.current?.abort();setOpen(false);setChecking(false);return()=>{active.current=false;};}
    const inspect=()=>{if(document.visibilityState!=='hidden')check();};
    inspect();window.addEventListener('online',inspect);window.addEventListener('pageshow',inspect);document.addEventListener('visibilitychange',inspect);
    return()=>{active.current=false;pending.current?.abort();window.removeEventListener('online',inspect);window.removeEventListener('pageshow',inspect);document.removeEventListener('visibilitychange',inspect);};
  },[disabled]);
  function close(){pending.current?.abort();pending.current=null;setChecking(false);setOpen(false);}
  const newer=latest&&compareReleases(latest.version,BOOTH_RELEASE)>0;
  return <div className="buControl" data-app-version={BOOTH_RELEASE}>
    <button className="buTrigger" type="button" data-testid="app-update" disabled={disabled} onClick={()=>{setOpen(true);check();}} title={'Running version '+BOOTH_RELEASE}><span aria-hidden="true">↻</span> Update app{newer&&<span className="buDot" aria-label="New version available"/>}</button>
    {open&&<UpdateDialog onClose={close}>
      <div className="buHead"><span>FRIENDLY PHOTO BOOTH</span><button type="button" aria-label="Close update" onClick={close}>×</button></div>
      <h2>Keep the good times.<br/><em>Get the latest app.</em></h2>
      <p className="buInstalled">Running version <strong>{BOOTH_RELEASE}</strong></p>
      <div className="buStatus" role="status">{checking?'Checking the live app…':error||(!latest?'Check for updates when connected to Wi-Fi.':newer?'Version '+latest.version+' is available.':'This is the current version. You can still reload it safely.')}</div>
      <p>Saved photos, event details and print counts stay in this browser. Updating does not reset them or move them to another device.</p>
      <div className="buActions"><button type="button" className="buPrimary" data-testid="app-update-load" disabled={checking||disabled} onClick={()=>check(true)}>{checking?'Checking…':'Load latest version'}</button><button type="button" className="buSecondary" onClick={close}>Keep booth open</button></div>
      <small>Updates happen only when you choose this button. No automatic reload during a photo session. Do not delete the app or clear website data.</small>
    </UpdateDialog>}
  </div>;
}
