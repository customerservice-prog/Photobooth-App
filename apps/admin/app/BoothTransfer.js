'use client';
import {useEffect,useRef,useState} from 'react';
import './booth-transfer.css';
export default function BoothTransfer({url,eventName,ready}){
 const [open,setOpen]=useState(false),[qr,setQr]=useState(''),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const dialog=useRef(null),linkInput=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const node=dialog.current,previous=document.activeElement;
  if(node&&!node.open)node.showModal();
  let active=true;
  (async()=>{
   try{
    const lib=await import('qrcode');
    const source=lib.default||lib;
    const svg=await source.toDataURL(url,{errorCorrectionLevel:'M',width:320,margin:2,color:{dark:'#163e2d',light:'#ffffff'}});
    if(active)setQr(svg);
   }catch(e){if(active)setError('QR code could not load. The Copy link and Open link options still work.');}
  })();
  return()=>{active=false;if(node?.open)node.close();previous?.focus?.();};
 },[open,url]);
 async function copy(){
  try{
   await navigator.clipboard.writeText(url);
   setCopied(true);setError('');
  }catch{
   linkInput.current?.focus();linkInput.current?.select();
   setError('Select the link in the box and copy it manually.');
  }
 }
 const close=()=>{setOpen(false);setCopied(false);setQr('');setError('');};
 return <>
  <button type="button" className="btn transferPrimary" data-testid="send-to-booth" onClick={()=>setOpen(true)}>Send event to Booth →</button>
  <p className="inlineInfo" style={{margin:'10px 0 0'}}>One link transfers this event’s photo and print settings—no typing them again on the iPad.</p>
  {open&&<dialog ref={dialog} className="transferDialog" aria-label="Send event to Booth" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}}>
   <div className="transferInner">
    <div className="transferHeader"><span className="eyebrow">STEP 3 · SEND TO THE EVENT IPAD</span><button type="button" className="btn btn2 btnSm" onClick={close} aria-label="Close transfer">Close ×</button></div>
    <h2>Load the event in one step.</h2>
    <p className="transferIntro">Open this link on the iPad that will take the photos. Staff will see a review screen, then tap <strong>Apply event to this iPad.</strong></p>
    <div className="transferInfo">
     <strong>{eventName}</strong>
     <small>{ready?'Event information is complete.':'The venue or another detail still needs attention in the admin. You may load the booth for testing, but finish setup before the event.'}</small>
    </div>
    <div className="transferQR">
     {qr?<img data-testid="event-handoff-qr" src={qr} width="260" height="260" alt="QR code to open this event on the iPad" />:<div className="transferQRWait" role="status">Preparing scannable code…</div>}
     <div className="transferQRHelp"><strong>Scan from the event iPad</strong><p>Open the Camera app, scan this code, open the Friendly Booth link, and tap <b>Apply event</b>.</p></div>
    </div>
    <label className="formField" htmlFor="booth-transfer-link">Or copy the iPad link
     <input id="booth-transfer-link" data-testid="event-handoff-url" className="input transferLink" ref={linkInput} type="text" readOnly value={url} onClick={e=>e.currentTarget.select()}/>
    </label>
    <div className="buttonRow" style={{marginTop:13}}>
     <button type="button" className="btn" data-testid="copy-handoff-link" onClick={copy}>{copied?'Copied ✓':'Copy iPad link'}</button>
     <a href={url} className="btn btn2" target="_blank" rel="noopener noreferrer">Open on this device ↗</a>
    </div>
    {error&&<p className="errorNote" role="alert" style={{margin:'12px 0 0'}}>{error}</p>}
    <div className="transferPrivacy">
     <strong>What gets sent?</strong> Event title, date/time, photo choices, pose break, colors, design style and print allowance. <b>No email address, phone, venue street address, private notes or guest photos.</b> Anyone with this link can read the included event settings.
    </div>
    <p className="transferNote"><strong>After editing an event:</strong> send its new link again to update the iPad. Existing photos and print usage stay intact. This is a one-click transfer, not a continuous background sync.</p>
   </div>
  </dialog>}
 </>;
}