'use client';
import {useEffect,useRef,useState} from 'react';
import {rememberOfflineStaffPin,verifyOfflineStaffPin} from '../lib/staff-offline-pin.mjs';

// Staff authorization is separate from Apple's device lock. Guided Access is still required.
export default function StaffAccessGate({onClose,onConfirm}){
 const dialog=useRef(null),cancel=useRef(onClose);
 const [required,setRequired]=useState(true),[ready,setReady]=useState(false);
 const [pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 cancel.current=onClose;
 useEffect(()=>{
  let alive=true;
  fetch('/api/staff/unlock',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(x=>{if(alive){setRequired(x.required!==false);setReady(true);}})
   .catch(()=>{if(alive){setRequired(true);setReady(true);}});
  const node=dialog.current,previous=document.activeElement;
  if(node&&!node.open)node.showModal();
  return()=>{alive=false;if(node?.open)node.close();previous?.focus?.();};
 },[]);
 async function unlock(e){
  e.preventDefault();if(busy||!/^\d{8}$/.test(pin))return;
  setBusy(true);setError('');
  try{
   if(navigator.onLine===false){
    if(!await verifyOfflineStaffPin(localStorage,pin))throw new Error('Offline PIN is unavailable or incorrect. Authorize this iPad once while online.');
   }else{
    let response;
    try{response=await fetch('/api/staff/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});}
    catch{if(!await verifyOfflineStaffPin(localStorage,pin))throw new Error('Cannot contact staff sign-in. Connect to Wi-Fi or authorize the PIN on this iPad while online.');}
    if(response&&!response.ok){
     const data=await response.json().catch(()=>({}));
     throw new Error(data.error||'Incorrect PIN.');
    }
    if(response?.ok)void rememberOfflineStaffPin(localStorage,pin);
   }
   setPin('');onConfirm?.();
  }catch(err){setError(err.message||'Staff authorization failed.');}finally{setBusy(false);}
 }
 return <dialog ref={dialog} className="bwStaffGate" aria-label="Staff access"
  onCancel={e=>{e.preventDefault();cancel.current();}}
  onClick={e=>{if(e.target===dialog.current)cancel.current();}}>
  <div className="bwStaffGateInner">
   <span className="bwStaffGateIcon" aria-hidden="true">✦</span>
   <p className="bwStaffGateEyebrow">FRIENDLY PHOTO BOOTH · STAFF</p>
   <h2>Staff access</h2>
   <p>{required?'Enter the staff PIN to manage this event, recover photos or change printer settings.':'Open staff tools to check the printer, sound and event setup.'}</p>
   {ready?(required?
    <form onSubmit={unlock} className="bwStaffPinForm" data-testid="staff-pin-form">
     <label htmlFor="bwStaffPin">8-digit staff PIN</label>
     <input id="bwStaffPin" type="password" inputMode="numeric" autoComplete="off" maxLength={8} minLength={8} pattern="[0-9]{8}" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="●●●●●●●●" required autoFocus/>
     {error&&<p role="alert">{error}</p>}
     <button className="bwStaffGatePrimary" data-testid="staff-confirm" disabled={busy||pin.length!==8}>{busy?'Checking…':'Unlock staff tools →'}</button>
     <button type="button" className="bwStaffGateCancel" data-testid="staff-cancel" onClick={onClose}>Back to guest screen</button>
    </form>:
    <div className="bwStaffGateButtons">
     <button type="button" className="bwStaffGatePrimary" data-testid="staff-confirm" onClick={onConfirm}>Open staff tools →</button>
     <button type="button" className="bwStaffGateCancel" data-testid="staff-cancel" onClick={onClose}>Back to guest screen</button>
    </div>):<p>Checking staff access…</p>}
   <small>Staff PIN protects these controls. Guided Access separately locks the iPad into the booth.</small>
  </div>
 </dialog>;
}
