'use client';
import {useEffect,useRef,useState} from 'react';
import StaffPageNav from '../components/StaffPageNav';
import {eventHome,readReturnDestination} from '../lib/staff-navigation.mjs';
import EventSetup from '../components/EventSetup';
import {normalizeEventConfig} from '../lib/event-config.mjs';
import {workspace} from '../lib/event-workspace.mjs';
const CFG='friendly-booth-event-v1';
export default function SetupPage(){
 const [cfg,setCfg]=useState(null),[error,setError]=useState(''),[scope,setScope]=useState(null);
 const saved=useRef(false);
 useEffect(()=>{try{
  const chosen=workspace(window.location.search);setScope(chosen);
  const saved=JSON.parse(localStorage.getItem(chosen.config)||'null');
  if(chosen.imported&&!saved){setError('This event has not been sent to this device. Use Choose event & design to open this booking on the event iPad.');return;}
  setCfg(saved?normalizeEventConfig(saved):{type:'wedding',title:'Your celebration',subtitle:'',date:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})});
 }catch{setError('Saved event could not be read. Your existing photos and print counters have not been changed.');}},[]);
 function save(next){try{localStorage.setItem(scope?.config||CFG,JSON.stringify(next));saved.current=true;return true;}catch{setError('Event settings could not be saved. Please check available storage.');return false;}}
 return <main className="ksSetupPage"><StaffPageNav/><p>{error||'Preparing event setup…'}</p>{error&&<a className="action" href={scope?.imported?'/staff/start?event='+encodeURIComponent(scope.id):'/staff/start'}>Choose event &amp; design</a>}{cfg&&<EventSetup cfg={cfg} onSave={save} onClose={()=>window.location.assign(saved.current?eventHome(scope):readReturnDestination(window.location.search,localStorage))}/>}</main>;
}
