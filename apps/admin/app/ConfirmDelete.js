'use client';
import {useState} from 'react';
export default function ConfirmDelete({name}){
 const [typed,setTyped]=useState(''),[checked,setChecked]=useState(false);
 return <div className="uiStack" style={{maxWidth:580,gap:13}}>
  <label className="formField">
   <span>I downloaded the customer gallery, opened the ZIP and verified the photos. I understand permanent deletion removes the admin event and its remaining private server backups.</span>
   <span style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" name="galleryChecked" value="yes" checked={checked} onChange={e=>setChecked(e.target.checked)} required/> Yes, verified</span>
  </label>
  <label className="formField">Type the event’s full name to confirm
   <input className="input" name="confirmation" autoComplete="off" spellCheck={false} value={typed} onChange={e=>setTyped(e.target.value)} placeholder={name} required/>
  </label>
  <button type="submit" className="btn" disabled={!checked||typed!==name}
   onClick={e=>{if(!window.confirm('Permanently delete the archived event AND its server photo backups? This cannot be undone.'))e.preventDefault();}}>
   Permanently delete archived event
  </button>
 </div>;
}
