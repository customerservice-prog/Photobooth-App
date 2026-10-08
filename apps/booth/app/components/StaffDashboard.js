'use client';
import {useEffect,useRef,useState} from 'react';
import {decodeBoothHandoff} from '../lib/booth-handoff.mjs';
import StaffBackupPanel from './StaffBackupPanel';
import StaffEventCloseout from './StaffEventCloseout';
import AppUpdate from './AppUpdate';
import StaffPrintPanel from './StaffPrintPanel';
import StaffDeviceChecklist from './StaffDeviceChecklist';
import './staff-dashboard.css';

// A functional staff dashboard shared by demo and live contexts. The staff
// Staff PIN authorizes controls; Apple Guided Access locks the actual iPad.
export default function StaffDashboard({onClose,onReset,onVoiceTest,onRecover,onSaveConfig,onLoadBryan,
 online,saved,installed,managed,demo,remaining,setupHref,photos=[],cfg,eventTypes,voiceStatus,eventScope,
 keepScreenAwake=true,screenAwakeStatus='requesting',onToggleScreenAwake,onRetryScreenAwake,onReviewPrint}){
 const ref=useRef(null),closeRef=useRef(onClose),transferRef=useRef(null),kioskRef=useRef(null);closeRef.current=onClose;
 function showKioskGuide(){
  const section=kioskRef.current;if(!section)return;
  section.open=true;
  requestAnimationFrame(()=>section.scrollIntoView({block:'center',behavior:'smooth'}));
 }
 function showEventTransfer(){
  const section=transferRef.current;
  if(!section)return;
  section.open=true;
  requestAnimationFrame(()=>{section.scrollIntoView({block:'center',behavior:'smooth'});section.querySelector('input')?.focus();});
 }
 const [handoffText,setHandoffText]=useState(''),[handoffError,setHandoffError]=useState('');
 const awakeMessage=!keepScreenAwake
  ?'Off by staff choice. The iPad may sleep according to its iPadOS settings.'
  :screenAwakeStatus==='active'
   ?'On: the booth has an active keep-awake request while this screen is visible.'
   :screenAwakeStatus==='unsupported'
    ?'This browser does not support keep-awake. Set Guided Access Display Auto-Lock to Never.'
    :screenAwakeStatus==='blocked'
     ?'The iPad refused the keep-awake request. Try again; Guided Access can still prevent Auto-Lock.'
     :screenAwakeStatus==='interrupted'
      ?'Keep-awake was interrupted by the device. Tap Try again or interact with the booth.'
      :screenAwakeStatus==='waiting'
       ?'Waiting until the Photo Booth is the visible app.'
       :'Asking the iPad to keep the display on…';
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
   <div className="operatorKioskCard"><span className="operatorOverline">STAFF DEVICE MAINTENANCE</span><h3>Update the Photo Booth when guests are finished</h3><p>App updates are hidden from guests. Update only between sessions, after checking that the event photographs have been saved.</p><AppUpdate/></div>
   <StaffBackupPanel/>
   {(eventScope?.managed||eventScope?.imported)&&<details className="operatorFold" data-testid="staff-end-event-open"><summary>Finish the event &amp; save all digital photos <span>Export ZIP · safely prepare next rental</span></summary><div className="operatorFoldContent"><StaffEventCloseout scope={eventScope} eventName={cfg.title}/></div></details>}
   <StaffPrintPanel onReviewPrint={onReviewPrint}/>
   <StaffDeviceChecklist/>
   <section className="operatorKioskCard" data-testid="operator-kiosk-card" aria-label="iPad guest display">
    <div className="operatorKioskTop">
     <div><span className="operatorOverline">IPAD EVENT MODE</span><h3>Keep guests in the Photo Booth</h3><p>The booth can request an always-on display. iPad Guided Access is required to stop guests switching apps.</p></div>
     <span className="operatorDeviceOnly">This iPad only</span>
    </div>
    <label className="operatorWakeToggle">
     <input type="checkbox" role="switch" checked={keepScreenAwake} data-testid="operator-awake-toggle" onChange={e=>onToggleScreenAwake?.(e.target.checked)}/>
     <span><strong>Keep the screen awake</strong><small>{keepScreenAwake?'On during Photo Booth use':'Off — allow normal screen sleep'}</small></span>
    </label>
    <div className="operatorWakeStatus" role="status" data-testid="operator-awake-status">
     <span aria-hidden="true">{keepScreenAwake&&screenAwakeStatus==='active'?'✓':'ⓘ'}</span>
     <p>{awakeMessage}</p>
     {keepScreenAwake&&['blocked','interrupted'].includes(screenAwakeStatus)&&<button type="button" onClick={onRetryScreenAwake} data-testid="operator-awake-retry">Try again</button>}
    </div>
    <details ref={kioskRef} className="operatorKioskGuide" data-testid="operator-guided-access">
     <summary>Lock the iPad so guests cannot leave <span>iPad Settings · one-time setup</span></summary>
     <div>
      <ol>
       <li>On the iPad, open <strong>Settings → Accessibility → Guided Access</strong>. Turn it on and create a staff-only passcode in Passcode Settings.</li>
       <li>Set <strong>Guided Access → Display Auto-Lock → Never</strong> to keep the screen on for the event. Choose a shorter interval instead if you want the display to sleep.</li>
       <li>Open the installed <strong>Friendly Booth</strong> Home Screen icon. Triple-click the <strong>top button</strong> (or Home button on older iPads), then choose Guided Access.</li>
       <li>Under Session Settings / Options, leave <strong>Touch ON</strong>, disable <strong>Top / Home Button</strong> to prevent guest sleep-button use, and leave Time Limit off. Tap <strong>Start</strong>.</li>
       <li>Test the Home gesture, printer and photo sharing on the physical iPad before guests arrive. To unlock for staff: triple-click, authenticate, then tap <strong>End</strong>.</li>
      </ol>
      <p><strong>Important:</strong> The website cannot start or detect Guided Access. An active keep-awake request does not mean the iPad is locked. For physical events, keep the iPad plugged in.</p>
     </div>
    </details>
   </section>
   <h3 className="operatorSectionTitle">What do you need to do?</h3>
   <nav className="operatorQuickGrid" aria-label="Staff quick actions">
    <button className="operatorQuickCard operatorGuestCard" type="button" data-testid="operator-lock-ipad" onClick={showKioskGuide}><span aria-hidden="true">▣</span><strong>Lock iPad for guests</strong><small>Guided Access setup steps</small></button>
    <button className="operatorQuickCard operatorGuestCard" type="button" data-testid="operator-load-event" onClick={showEventTransfer}><span aria-hidden="true">⇪</span><strong>Load an event</strong><small>Send admin settings to this iPad</small></button>
    <a className="operatorQuickCard" href={setupHref}><span aria-hidden="true">✎</span><strong>Event setup</strong><small>Names, colors, print layouts</small></a>
    <button className="operatorQuickCard" type="button" data-testid="operator-sound-test" onClick={onVoiceTest}><span aria-hidden="true">♫</span><strong>Play voice sample</strong><small>Staff-only sound check</small></button>
    <a className="operatorQuickCard" href="/print-test"><span aria-hidden="true">▤</span><strong>Canon wireless printing</strong><small>AirPrint and 4×6 instructions</small></a>
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
   {voiceStatus==='blocked'&&<p className="operatorNotice" role="alert">Speaker playback is blocked. Turn up the iPad volume, check Bluetooth, then play the voice sample again.</p>}
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
   <p className="operatorPrivacy">The display preference is local to this iPad. Staff Tools require staff authorization when event security is enabled. Use Apple Guided Access and supervise the booth during events.</p>
  </div>
 </dialog>;
}
