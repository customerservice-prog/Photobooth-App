'use client';
import {useEffect,useState} from 'react';
import EventSetup from '../components/EventSetup';
import {normalizeEventConfig} from '../lib/event-config.mjs';
const CFG='friendly-booth-event-v1';
export default function SetupPage(){
 const [cfg,setCfg]=useState(null),[error,setError]=useState('');
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(CFG)||'null');setCfg(saved?normalizeEventConfig(saved):{type:'wedding',title:'Your celebration',subtitle:'',date:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})});}catch{setError('Saved event could not be read. Your photo storage has not been changed.');setCfg({type:'wedding',title:'Your celebration',subtitle:'',date:''});}},[]);
 function save(next){try{localStorage.setItem(CFG,JSON.stringify(next));return true;}catch{setError('Event settings could not be saved. Please check available storage.');return false;}}
 return <main className="ksSetupPage"><p>{error||'Preparing event setup…'}</p>{cfg&&<EventSetup cfg={cfg} onSave={save} onClose={()=>window.location.assign('/')}/>}</main>;
}
