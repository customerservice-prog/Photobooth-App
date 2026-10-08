'use client';
import {useEffect,useState} from 'react';
import EventSetup from '../components/EventSetup';
import {normalizeEventConfig} from '../lib/event-config.mjs';
import {workspace} from '../lib/event-workspace.mjs';
const CFG='friendly-booth-event-v1';
export default function SetupPage(){
 const [cfg,setCfg]=useState(null),[error,setError]=useState(''),[scope,setScope]=useState(null);
 useEffect(()=>{try{
  const chosen=workspace(window.location.search);setScope(chosen);
  const saved=JSON.parse(localStorage.getItem(chosen.config)||'null');
  if(chosen.imported&&!saved){setError('This event has not been sent to this device. Open the event link from your staff dashboard.');return;}
  setCfg(saved?normalizeEventConfig(saved):{type:'wedding',title:'Your celebration',subtitle:'',date:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})});
 }catch{setError('Saved event could not be read. Your existing photos and print counters have not been changed.');}},[]);
 function save(next){try{localStorage.setItem(scope?.config||CFG,JSON.stringify(next));return true;}catch{setError('Event settings could not be saved. Please check available storage.');return false;}}
 return <main className="ksSetupPage"><p>{error||'Preparing event setup…'}</p>{cfg&&<EventSetup cfg={cfg} onSave={save} onClose={()=>window.location.assign(scope?.home||'/')}/>}</main>;
}
