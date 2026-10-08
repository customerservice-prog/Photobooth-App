'use client';
import {useEffect,useState} from 'react';
import EventSetup from '../components/EventSetup';
import {normalizeEventConfig} from '../lib/event-config.mjs';
import {workspace} from '../lib/event-workspace.mjs';
const FALLBACK='friendly-booth-event-v1';
export default function SetupPage(){
 const [cfg,setCfg]=useState(null),[error,setError]=useState(''),[scope,setScope]=useState(null);
 useEffect(()=>{try{const current=workspace(window.location.search);setScope(current);
   const saved=JSON.parse(localStorage.getItem(current.transferred?current.config:FALLBACK)||'null');
   if(current.transferred&&!saved)throw new Error('Load this event first from Staff tools → Load event.');
   setCfg(saved?normalizeEventConfig(saved):{type:'wedding',title:'Your celebration',subtitle:'',date:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})});}catch{setError('Saved event could not be read. Your photo storage has not been changed.');setCfg({type:'wedding',title:'Your celebration',subtitle:'',date:''});}},[]);
 function save(next){try{localStorage.setItem(scope?.transferred?scope.config:FALLBACK,JSON.stringify(next));return true;}catch{setError('Event settings could not be saved. Please check available storage.');return false;}}
 return <main className="ksSetupPage"><p>{error||'Preparing event setup…'}</p>{cfg&&<EventSetup cfg={cfg} onSave={save} onClose={()=>window.location.assign(scope?.home||'/')}/>}</main>;
}
