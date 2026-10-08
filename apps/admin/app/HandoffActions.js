'use client';
import {useState} from 'react';
export default function HandoffActions({url,payload,fileName}){
 const [message,setMessage]=useState('');
 async function copy(){
  try{await navigator.clipboard.writeText(url);setMessage('Link copied. Open it on the event iPad.');}
  catch{setMessage('Copy was blocked. Use the QR code or download the setup file below.');}
 }
 function download(){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const object=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=object;a.download=fileName;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(object),1500);
  setMessage('Setup file downloaded. Open it in the booth app’s Load Event screen.');
 }
 return <div className="handoffActions">
  <a className="btn" href={url} target="_blank" rel="noopener noreferrer" data-testid="send-to-booth-link">Open on this device ↗</a>
  <button className="btn btn2" type="button" onClick={copy}>Copy transfer link</button>
  <button className="btn btn2" type="button" onClick={download}>Download setup file</button>
  <div role="status" className="rowSubtitle" aria-live="polite">{message}</div>
 </div>;
}
