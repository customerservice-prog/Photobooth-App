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
  <button type="button" className="btn transferPrimary" data-testid="send-to-booth" onClick={()=>setOpen(true)}>Load on iPad →</button>
  {open&&<dialog ref={dialog} className="transferDialog" aria-label="Load event on iPad" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}}>
   <div className="transferInner">
    <div className="transferHeader"><span className="eyebrow">EVENT IPAD SETUP</span><button type="button" className="btn btn2 btnSm" onClick={close} aria-label="Close transfer">Close ×</button></div>
    <h2>Open this event on the iPad.</h2>
    <p className="transferIntro">Scan or copy the setup link onto the iPad that will take the photos.</p>
    <div className="transferInfo">
     <strong>{eventName}</strong>
     <small>{ready?'Required setup details are saved.':'Some event details still need attention. You can load it for testing, then finish setup before the rental.'}</small>
    </div>
    <div className="transferQR">
     {qr?<img data-testid="event-handoff-qr" src={qr} width="260" height="260" alt="QR code to open this event on the iPad" />:<div className="transferQRWait" role="status">Preparing scannable code…</div>}
     <div className="transferQRHelp"><strong>On the event iPad</strong><ol><li>Scan the code with Camera and open the link.</li><li>Enter your staff PIN when asked.</li><li>Review the event, then tap <b>Apply event to this iPad.</b></li></ol></div>
    </div>
    <label className="formField" htmlFor="booth-transfer-link">Or copy the iPad link
     <input id="booth-transfer-link" data-testid="event-handoff-url" className="input transferLink" ref={linkInput} type="text" readOnly value={url} onClick={e=>e.currentTarget.select()}/>
    </label>
    <div className="buttonRow" style={{marginTop:13}}>
     <button type="button" className="btn" data-testid="copy-handoff-link" onClick={copy}>{copied?'Copied ✓':'Copy iPad link'}</button>
     <a href={url} className="btn btn2" target="_blank" rel="noopener noreferrer">Open on this device ↗</a>
    </div>
    {error&&<p className="errorNote" role="alert" style={{margin:'12px 0 0'}}>{error}</p>}
    <p className="transferNote">The event is loaded after you apply it on the iPad. Check the displayed name and both photo layouts there.</p>
    <details className="transferMore"><summary>Using the installed Home Screen app?</summary><p>If scanning opens Safari, copy the link instead. Open the installed booth app → Staff tools → Load an event → Paste. Photos and counters stay in that app.</p></details>
    <details className="transferMore"><summary>Shared settings and later updates</summary><p>The link includes the event title, date, approved design, print name, photo choices and print allowance. It excludes customer contact details, venue address, private notes and guest photos. Anyone with the link can read the included settings.</p><p>Authorized online iPads check for saved updates between sessions. If an update is unavailable, apply a fresh link and check the iPad preview. Existing photos and print usage stay saved.</p></details>
   </div>
  </dialog>}
 </>;
}
