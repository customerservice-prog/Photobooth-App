'use client';
import {useEffect,useRef,useState} from 'react';
import {decodeBoothHandoff} from '../lib/booth-handoff.mjs';
import './staff-dashboard.css';

// A functional staff dashboard shared by demo and live contexts. The staff
// confirmation is not authentication; the iPad must be supervised/Guided Access.
export default function StaffDashboard({onClose,onReset,onVoiceTest,onRecover,onSaveConfig,onLoadBryan,
 online,saved,installed,managed,demo,remaining,setupHref,photos=[],cfg,eventTypes,voiceStatus}){
 const ref=useRef(null),closeRef=useRef(onClose),transferRef=useRef(null);closeRef.current=onClose;
 function showEventTransfer(){
  const section=transferRef.current;
  if(!section)return;
  section.open=true;
  requestAnimationFrame(()=>{section.scrollIntoView({block:'center',behavior:'smooth'});section.querySelector('input')?.focus();});
 }
 const [handoffText,setHandoffText]=useState(''),[handoffError,setHandoffError]=useState('');
 function reviewTransfer(e){
  e.preventDefault();setHandoffError('');
  try{
   const u=new URL(handoffText.trim());
   if(!([window.location.origin,'https://photobooth-booth-production.up.railway.app'].includes(u.origin))||u.pathname!=='/handoff'){
    throw new Error('Paste a Friendly Booth event link from the staff dashboard.');
   }
   decodeBoothHandoff(u.hash);
   window.location.assign('/handoff'+u.hash);
  }catch(error){setHandoffError(error.message||'This event link is invalid. Copy it again from the dashboard.');}
 }
 async function pasteTransfer(){
  try{
   const text=await navigator.clipboard.readText();
   if(!text)throw new Error('Clipboard is empty.');
   setHandoffText(text);setHandoffError('');
  }catch{setHandoffError('Long-press the event link field and choose Paste, or type the link.');}
 }
 useEffect(()=>{
  const node=ref.current,previous=document.activeElement;
  if(node&&!node.open)node.showModal();
  return()=>{if(node?.open)node.close();previous?.focus?.();};
 },[]);
 return <dialog ref={ref} className="operatorPanel" aria-label="Operator controls"
   onCancel={e=>{e.preventDefault();closeRef.current();}}
   onClick={e=>{if(e.target===ref.current)closeRef.current();}}>
  <div className="operatorInner">
   <header className="operatorHead">
    <div><span className="operatorOverline">FRIENDLY PHOTO BOOTH · STAFF AREA</span><h2>Staff tools</h2><p>Everything you need to help guests, all in one place.</p></div>
    <button type="button" className="operatorClose" aria-label="Close controls" onClick={onClose} autoFocus>Close controls <span aria-hidden="true">×</span></button>
   </header>
   <section className="operatorStats" aria-label="Booth status">
    <div><small>CONNECTION</small><strong>{online?'Online':'Offline'}</strong><span>{online?'Ready to connect':'Keep this browser open'}</span></div>
    <div><small>PRINT REQUESTS LEFT</small><strong>{remaining}</strong><span>{demo?'Demo mode · no paper':'This device only'}</span></div>
    <div><small>PHOTOS</small><strong>{saved}</strong><span>{managed?'Archived sessions':'Recent local photos'}</span></div>
    <div><small>DEVICE</small><strong>{installed?'Installed':'Browser'}</strong><span>{installed?'Home Screen app':'Open on iPad for events'}</span></div>
   </section>
   <h3 className="operatorSectionTitle">What do you need to do?</h3>
   <nav className="operatorQuickGrid" aria-label="Staff quick actions">
    <button className="operatorQuickCard operatorGuestCard" type="button" data-testid="operator-load-event" onClick={showEventTransfer}><span aria-hidden="true">⇪</span><strong>Load an event</strong><small>Send admin settings to this iPad</small></button>
    <a className="operatorQuickCard" href={setupHref}><span aria-hidden="true">✎</span><strong>Event setup</strong><small>Names, colors, print layouts</small></a>
    <button className="operatorQuickCard" type="button" data-testid="operator-sound-test" onClick={onVoiceTest}><span aria-hidden="true">♫</span><strong>Test speaker</strong><small>Check countdown audio</small></button>
    <a className="operatorQuickCard" href="/print-test"><span aria-hidden="true">▤</span><strong>Canon test print</strong><small>Check paper and colors</small></a>
    <a className="operatorQuickCard" href="/delivery-check"><span aria-hidden="true">↗</span><strong>Digital delivery</strong><small>Test sharing and receipts</small></a>
    <a className="operatorQuickCard" href="/help#guided-access"><span aria-hidden="true">◇</span><strong>iPad help</strong><small>Guided Access & fixes</small></a>
    <button className="operatorQuickCard operatorGuestCard" type="button" data-testid="operator-reset-guest" onClick={onReset}><span aria-hidden="true">⌂</span><strong>Guest welcome screen</strong><small>Ready for the next guest</small></button>
   </nav>
   <details ref={transferRef} className="operatorFold" data-testid="staff-load-event">
    <summary>Load an event from Staff dashboard <span>Transfer event link</span></summary>
    <div className="operatorFoldContent">
     <p>Use this inside the <strong>installed Friendly Booth app on the event iPad</strong>. If scanning a QR code opens Safari separately, copy the setup link there and paste it here so the event saves in the app you actually use.</p>
     <form className="operatorHandoffForm" onSubmit={reviewTransfer}>
      <label className="formField" htmlFor="staff-event-link">Staff dashboard event link
       <input id="staff-event-link" className="input" type="url" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} data-testid="staff-event-link" placeholder="https://photobooth-booth-production.up.railway.app/handoff#…" value={handoffText} onChange={e=>setHandoffText(e.target.value)} required/>
      </label>
      <div className="operatorHandoffButtons">
       <button type="button" className="operatorQuickPaste" onClick={pasteTransfer}>Paste from clipboard</button>
       <button type="submit" className="operatorPrimary" data-testid="staff-review-event">Review event on this iPad →</button>
      </div>
      {handoffError&&<p className="operatorNotice" role="alert">{handoffError}</p>}
     </form>
    </div>
   </details>
   {voiceStatus==='blocked'&&<p className="operatorNotice" role="alert">Speaker playback is blocked. Turn up the iPad volume, check Bluetooth, then tap Test speaker again.</p>}
   <details className="operatorFold">
    <summary>Recover a recent photo <span>{photos.length} available</span></summary>
    <div className="operatorFoldContent">
     <p>Choose a saved capture to return to its preview. No new photos are taken.</p>
     {photos.length?<div className="recoveryGrid">{photos.slice(0,8).map(p=><button type="button" key={p.id} onClick={()=>onRecover(p)} aria-label="Open saved photo"><img src={p.data} alt="Saved photo preview"/></button>)}</div>:<p>There are no recent photos saved in this session.</p>}
     {managed&&<a className="operatorTextLink" href="/event-prep">Photo archive and event backups →</a>}
    </div>
   </details>
   {!managed&&<details className="operatorFold">
    <summary>Advanced local event settings <span>Staff only</span></summary>
    <div className="operatorFoldContent">
     <p>Use Event setup above for normal changes. These advanced settings affect this browser only.</p>
     <form onSubmit={onSaveConfig} className="operatorEventForm">
      <label>Event type<select className="input" name="type" defaultValue={cfg.type||'other'}>{Object.entries(eventTypes).map(([id,m])=><option key={id} value={id}>{m.name}</option>)}</select></label>
      <label>Event name<input className="input" name="title" defaultValue={cfg.title}/></label>
      <label>Caption<input className="input" name="subtitle" defaultValue={cfg.subtitle}/></label>
      <label>Date<input className="input" name="date" defaultValue={cfg.date}/></label>
      <label>Included physical prints<input className="input" name="includedPrints" type="number" min="0" defaultValue={cfg.printPackage?.includedPrints??108}/></label>
      <label>Additional physical prints<input className="input" name="addOnPrints" type="number" min="0" step="54" defaultValue={cfg.printPackage?.addOnPrints??0}/></label>
      <label>Photos per session<select className="input" name="shotsPerSession" defaultValue={cfg.printPackage?.shotsPerSession||4}><option value="3">3 photos</option><option value="4">4 photos</option></select></label>
      <button className="operatorPrimary" type="submit">Save advanced settings</button>
     </form>
     <button className="operatorDangerText" type="button" onClick={onLoadBryan}>Load sample wedding event (testing only)</button>
    </div>
   </details>}
   <p className="operatorPrivacy">These controls are local to this browser. Opening Staff tools is a confirmation, not a password lock. Keep the booth supervised and use iPad Guided Access during events.</p>
  </div>
 </dialog>;
}
