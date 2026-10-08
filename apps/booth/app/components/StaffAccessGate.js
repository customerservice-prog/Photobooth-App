'use client';
import {useEffect,useRef} from 'react';

// This is a deliberate two-step attendant entry, NOT a password or an access
// control boundary. Protect the actual iPad with Guided Access during events.
export default function StaffAccessGate({onClose,onConfirm}){
 const dialog=useRef(null),cancel=useRef(onClose);
 cancel.current=onClose;
 useEffect(()=>{
  const node=dialog.current,previous=document.activeElement;
  if(node&&!node.open)node.showModal();
  return()=>{if(node?.open)node.close();previous?.focus?.();};
 },[]);
 return <dialog ref={dialog} className="bwStaffGate" aria-label="Staff access"
  onCancel={e=>{e.preventDefault();cancel.current();}}
  onClick={e=>{if(e.target===dialog.current)cancel.current();}}>
  <div className="bwStaffGateInner">
   <span className="bwStaffGateIcon" aria-hidden="true">✦</span>
   <p className="bwStaffGateEyebrow">FRIENDLY PHOTO BOOTH · STAFF</p>
   <h2>Need to help a guest?</h2>
   <p>Open staff tools to check the printer, test sound, manage the event or recover a photo.</p>
   <div className="bwStaffGateButtons">
    <button type="button" className="bwStaffGatePrimary" data-testid="staff-confirm" onClick={onConfirm}>Open staff tools <span aria-hidden="true">→</span></button>
    <button type="button" className="bwStaffGateCancel" data-testid="staff-cancel" onClick={onClose}>Back to guest screen</button>
   </div>
   <small>This confirmation prevents accidental taps. It is not a staff PIN. Use iPad Guided Access to keep guests in the booth.</small>
  </div>
 </dialog>;
}
