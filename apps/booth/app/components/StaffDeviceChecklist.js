'use client';
import {useEffect,useState} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
const checks=[
 ['guided','Home swipe and app switching are blocked by Guided Access'],
 ['awake','Display stayed on during the idle screen test'],
 ['camera','One-photo and four-photo camera sessions worked'],
 ['printer','One real 4×6 Canon sheet came out correctly'],
 ['share','Digital save/share worked with Guided Access active']
];
const storageKey=id=>'friendly-booth-ipad-checklist-v1-'+id;
export default function StaffDeviceChecklist(){
 const [id,setId]=useState(''),[done,setDone]=useState({}),[checkedAt,setCheckedAt]=useState('');
 useEffect(()=>{
  const key=workspace(location.search).id;setId(key);
  try{const c=JSON.parse(localStorage.getItem(storageKey(key))||'{}');setDone(c.done||{});setCheckedAt(c.checkedAt||'');}catch{}
 },[]);
 function update(key,value){
  const next={...done,[key]:value},complete=checks.every(([id])=>next[id]===true);
  const now=complete?new Date().toISOString():'';
  setDone(next);setCheckedAt(now);
  try{localStorage.setItem(storageKey(id),JSON.stringify({done:next,checkedAt:now}));}catch{}
 }
 const count=checks.filter(([k])=>done[k]).length;
 return <details className="operatorFold" data-testid="staff-device-checklist">
  <summary>Physical iPad readiness <span>{count} of {checks.length} manually confirmed</span></summary>
  <div className="operatorFoldContent">
   <p>These are manual staff confirmations, not automatic device tests. Lock the actual iPad with Guided Access before testing.</p>
   {checks.map(([key,label])=><label key={key} className="operatorChecklistRow"><input type="checkbox" checked={!!done[key]} onChange={e=>update(key,e.target.checked)}/><span>{label}</span></label>)}
   <p role="status">{count===checks.length?'Staff confirmed all tests '+new Date(checkedAt).toLocaleString(): 'Do not mark the iPad fully ready until you complete all physical checks.'}</p>
  </div>
 </details>;
}