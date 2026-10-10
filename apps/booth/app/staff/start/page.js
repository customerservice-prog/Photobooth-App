'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import CustomDesignEditor from '../../components/CustomDesignEditor';
import {FPR_PRINT_PRESETS,isFprPrintPreset,presetForEventType} from '../../lib/fpr-print-presets.mjs';
import {createCustomDesign,validateCustomDesign} from '../../lib/custom-design.mjs';
import {configFromBoothHandoff} from '../../lib/booth-handoff.mjs';
import {renderKeepsake} from '../../lib/keepsake-designs.mjs';
import {fetchStaffEvents,fetchStaffEvent,saveStaffEvent,applyStaffEvent} from '../../lib/staff-event-client.mjs';
import {ACTIVE_EVENT_KEY,activeEventDestination} from '../../lib/active-event.mjs';
import {isValidStaffPin,normalizeStaffPinInput} from '../../lib/staff-pin.mjs';
import {rememberOfflineStaffPin} from '../../lib/staff-offline-pin.mjs';
import './start.css';

const eventDate=value=>{
 const date=new Date(String(value).slice(0,10)+'T12:00:00Z');
 return Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):value;
};

function LayoutPreview({snapshot,design,customDesign,name,year,view,onView}){
 const previews=useMemo(()=>{
  if(!snapshot)return null;
  try{
   const cfg={...configFromBoothHandoff(snapshot.payload),defaultTemplate:design,customDesign,approvedPrintName:name||snapshot.payload.name||snapshot.payload.title};
   cfg.details={...cfg.details,eventName:cfg.approvedPrintName,...(cfg.type==='graduation'?{graduate:cfg.approvedPrintName}:{honoree:cfg.approvedPrintName}),classYear:year};
   return ['card','photo_strip'].map((layout,index)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderKeepsake({cfg,template:design,layout,sample:true,id:'staff-start-preview-'+index})));
  }catch{return null;}
 },[snapshot,design,customDesign,name,year]);
 if(!previews)return <div className="staffStartPreviewEmpty">Your layout preview will appear here.</div>;
 return <div className="staffStartPreviews" data-testid="staff-print-preview" data-template={design} data-selected-photos={view==='one'?'1':'4'}><div className="staffStartPreviewToggle" role="group" aria-label="Preview photo layout">{['one','four'].map((kind,index)=><button type="button" key={kind} data-testid={'staff-preview-'+kind} aria-pressed={view===kind} onClick={()=>onView(kind)}>{index===0?'1 Photo':'4 Photos'}</button>)}</div>{previews.map((src,index)=><figure key={index} hidden={view!==(index===0?'one':'four')}><img src={src} alt={(index===0?'1 photo':'4 photos')+' in the selected event layout'} data-testid={'staff-layout-preview-'+(index===0?'one':'four')}/><figcaption>One 4×6 print · {index===0?'1 photo':'4 photos'}</figcaption></figure>)}</div>;
}

export default function StaffStartPage(){
 const [events,setEvents]=useState([]),[eventId,setEventId]=useState(''),[snapshot,setSnapshot]=useState(null);
 const [design,setDesign]=useState(''),[customDesign,setCustomDesign]=useState(()=>createCustomDesign());
 const [name,setName]=useState(''),[year,setYear]=useState('');
 const [loading,setLoading]=useState(true),[opening,setOpening]=useState(false),[saving,setSaving]=useState(false);
 const [needPin,setNeedPin]=useState(false),[pin,setPin]=useState(''),[pinBusy,setPinBusy]=useState(false);
 const [error,setError]=useState(''),[conflict,setConflict]=useState(false),[refresh,setRefresh]=useState(0),[back,setBack]=useState('');
 const [previewView,setPreviewView]=useState('one'),[customOpen,setCustomOpen]=useState(false),[namesOpen,setNamesOpen]=useState(false),[customBusy,setCustomBusy]=useState(false);
 const busy=useRef(false),mounted=useRef(true),customDialog=useRef(null),customTrigger=useRef(null),customOpener=useRef(null);
 useEffect(()=>{const dialog=customDialog.current;if(!dialog)return;if(customOpen&&!dialog.open)dialog.showModal();else if(!customOpen&&dialog.open)dialog.close();},[customOpen,design]);
 function openCustom(trigger){customOpener.current=trigger||customTrigger.current;setCustomOpen(true);}
 function closeCustom(){customDialog.current?.close();setCustomOpen(false);customOpener.current?.focus();}
 function keepCustomFocus(e){
  if(e.key!=='Tab')return;
  const controls=[...e.currentTarget.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]')].filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&node.getClientRects().length>0);
  if(!controls.length){e.preventDefault();return;}
  const first=controls[0],last=controls[controls.length-1],active=document.activeElement;
  if(e.shiftKey&&active===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
  else if(!controls.includes(active)){e.preventDefault();(e.shiftKey?last:first).focus();}
 }
 useEffect(()=>{mounted.current=true;try{setBack(activeEventDestination(localStorage)||'');}catch{}return()=>{mounted.current=false;};},[]);

 async function loadEvents(signal){
  setLoading(true);setError('');
  try{
   const items=await fetchStaffEvents({signal});if(signal?.aborted||!mounted.current)return;
   setEvents(items);setNeedPin(false);
   setEventId(current=>{
    if(items.some(event=>event.id===current))return current;
    const requested=new URLSearchParams(window.location.search).get('event');
    if(items.some(event=>event.id===requested))return requested;
    let active='';try{active=localStorage.getItem(ACTIVE_EVENT_KEY)||'';}catch{}
    return items.some(event=>event.id===active)?active:items.length===1?items[0].id:'';
   });
  }catch(e){if(signal?.aborted||!mounted.current)return;if(e.status===401)setNeedPin(true);else setError(e.message||'The events could not be opened.');}
  finally{if(!signal?.aborted&&mounted.current)setLoading(false);}
 }
 useEffect(()=>{const controller=new AbortController();void loadEvents(controller.signal);return()=>controller.abort();},[]);
 useEffect(()=>{
  if(!eventId||needPin){setSnapshot(null);return;}
  const controller=new AbortController();setOpening(true);setSnapshot(null);setError('');setConflict(false);setCustomOpen(false);setNamesOpen(false);
  fetchStaffEvent(eventId,undefined,{signal:controller.signal}).then(value=>{
   if(controller.signal.aborted)return;
   const payload=value.payload;
   setSnapshot(value);setDesign(isFprPrintPreset(payload.design)||payload.design==='custom'?payload.design:presetForEventType(payload.type));
   setCustomDesign(payload.customDesign||createCustomDesign());setName(payload.name||payload.title);setYear(payload.year||'');
  }).catch(e=>{if(controller.signal.aborted)return;if(e.status===401)setNeedPin(true);else setError(e.message||'The event could not be opened.');})
   .finally(()=>{if(!controller.signal.aborted)setOpening(false);});
  return()=>controller.abort();
 },[eventId,needPin,refresh]);

 async function unlock(e){
  e.preventDefault();if(pinBusy||!isValidStaffPin(pin))return;setPinBusy(true);setError('');
  try{
   const response=await fetch('/api/staff/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin}),cache:'no-store',credentials:'same-origin'});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Please check the staff PIN.');
   void rememberOfflineStaffPin(localStorage,pin);setPin('');await loadEvents();
  }catch(e){setError(e.message||'Connect to Wi-Fi and try again.');}finally{setPinBusy(false);}
 }

 let customError='';if(design==='custom')try{validateCustomDesign(customDesign);}catch(e){customError=e.message;}
 async function start(e){
  e.preventDefault();if(customOpen||namesOpen||(design==='custom'&&customBusy)||busy.current||!snapshot||snapshot.payload.id!==eventId||!design||customError||conflict)return;
  busy.current=true;setSaving(true);setError('');
  try{
   const changes={revision:snapshot.payload.rev,design,...(design==='custom'?{customDesign:validateCustomDesign(customDesign)}:{})};
   if(name!==(snapshot.payload.name||snapshot.payload.title))changes.nameOnPrint=name.trim();
   if(year!==(snapshot.payload.year||''))changes.classYear=year;
   const saved=await saveStaffEvent(eventId,changes);
   if(saved.payload.design!==design)throw new Error('The selected layout was not saved. Please try again.');
   const result=applyStaffEvent(localStorage,saved);
   // Guest sessions start with staff controls locked; saving is already complete.
   await fetch('/api/staff/lock',{method:'POST',cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(2000)}).catch(()=>{});
   window.location.replace(result.scope.home);
  }catch(e){
   if(e.status===401)setNeedPin(true);if(e.status===409)setConflict(true);
   setError(e.message||'The event could not be started. Please try again.');setSaving(false);busy.current=false;
  }
 }

 const chosenPreset=FPR_PRINT_PRESETS.find(preset=>preset.id===design);
 const chosenName=design==='custom'?'Custom':chosenPreset?.name||'Your layout';
 const chosenEvent=events.find(event=>event.id===eventId);
 const showClassYear=snapshot?.payload.type==='graduation'||design==='fpr-graduation';
 return <main className="staffStartPage">
  <header className="staffStartHeader"><a href={back||'/'} aria-label="Friendly Photo Booth home" className="staffStartBrand">Friendly <span>PHOTO BOOTH</span></a><div className="staffStartHeaderActions">{back&&<a href={back}>Back to booth</a>}<span className="staffStartBadge">Staff setup</span></div></header>
  {needPin?<section className="staffStartSignIn"><h1>Staff sign in</h1><p>Enter your PIN to choose a layout and start the booth.</p><form onSubmit={unlock}><label htmlFor="staff-start-pin">4-digit staff PIN</label><input id="staff-start-pin" data-testid="staff-start-pin" aria-label="4-digit staff PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} minLength={4} pattern="[0-9]{4}" value={pin} onChange={e=>setPin(normalizeStaffPinInput(e.target.value))} placeholder="●●●●" required autoFocus/>{error&&<p role="alert" className="staffStartError">{error}</p>}<button data-testid="staff-start-unlock" className="staffStartPrimary" disabled={pinBusy||!isValidStaffPin(pin)}>{pinBusy?'Checking…':'Continue'}</button></form></section>:<section className="staffStartContent">
   <div className="staffStartEventBar"><div className="staffStartIntro"><h1>Start photo booth</h1><p>Choose an event and its layout.</p></div><div className="staffStartEventPicker"><label htmlFor="staff-event-select">Event</label><select id="staff-event-select" data-testid="staff-event-select" value={eventId} disabled={loading||saving} onChange={e=>{setSnapshot(null);setCustomOpen(false);setEventId(e.target.value);}}><option value="">{loading?'Opening events…':'Choose an event…'}</option>{events.map(event=><option key={event.id} value={event.id}>{event.title} · {eventDate(event.date)}</option>)}</select></div></div>
   {!loading&&events.length===0&&!error&&<div className="staffStartEmpty"><h2>No upcoming events</h2><p>Create the booking in the owner dashboard, then return here to choose its layout.</p></div>}
   {!loading&&events.length>0&&!eventId&&!error&&<div className="staffStartEmpty"><h2>Choose the customer’s event above</h2><p>Then select one layout and start the booth.</p></div>}
   {error&&<div className="staffStartError" role="alert"><p>{error}</p>{conflict?<button type="button" onClick={()=>setRefresh(value=>value+1)}>Refresh this event</button>:!snapshot?<button type="button" onClick={()=>events.length&&eventId?setRefresh(value=>value+1):loadEvents()}>Try again</button>:null}</div>}
   {opening&&<p className="staffStartLoading" role="status">Opening the event’s layout…</p>}
   {snapshot&&snapshot.payload.id===eventId&&<form onSubmit={start} onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&['text','number',''].includes(e.target.type))e.preventDefault();}} className="staffStartForm"><fieldset disabled={saving} className="staffStartWorkspace">
    <section className="staffStartChoices" aria-labelledby="staff-layout-heading"><div className="staffStartLayoutHeader"><h2 id="staff-layout-heading">Choose a layout</h2><span>Includes 1-photo &amp; 4-photo prints</span></div>
     <div className="staffStartLayoutCards" role="group" aria-label="Event layout">
      {FPR_PRINT_PRESETS.map(preset=><button type="button" data-testid={'staff-layout-'+preset.id} key={preset.id} aria-pressed={design===preset.id} className={'staffStartLayoutCard'+(design===preset.id?' isSelected':'')} onClick={()=>setDesign(preset.id)}><span className="staffStartCardImage"><img src={preset.image} alt="" loading="eager"/></span><strong>{preset.name}</strong><span className="staffStartCaption">{preset.caption}</span><span className="staffStartSelection">{design===preset.id?'✓ Selected':'Select'}</span></button>)}
      <button ref={customTrigger} type="button" data-testid="staff-layout-custom" aria-pressed={design==='custom'} aria-haspopup="dialog" className={'staffStartLayoutCard staffStartCustomCard'+(design==='custom'?' isSelected':'')} onClick={e=>{setDesign('custom');openCustom(e.currentTarget);}}><span className="staffStartCustomArt" aria-hidden="true">✦</span><strong>Custom</strong><span className="staffStartCaption">Build or upload your artwork</span><span className="staffStartSelection">{design==='custom'?'✓ Selected':'Create a layout'}</span></button>
     </div>
    </section>
    <section className={'staffStartProof'+(design==='custom'?' isCustom':'')} aria-labelledby="staff-preview-heading"><div className="staffStartProofHeading"><h2 id="staff-preview-heading">{chosenName}</h2>{design==='custom'?<button type="button" className="staffStartSecondary" data-testid="staff-custom-edit" aria-label="Edit custom layout" aria-haspopup="dialog" onClick={e=>openCustom(e.currentTarget)}>Edit layout</button>:<span>Print preview</span>}</div>
     <LayoutPreview snapshot={snapshot} design={design} customDesign={customDesign} name={name} year={year} view={previewView} onView={setPreviewView}/>
     <details className="staffStartNames" data-testid="staff-print-details" open={namesOpen} onToggle={e=>setNamesOpen(e.currentTarget.open)}><summary data-testid="staff-printed-name-edit">Edit printed name{showClassYear?' & class year':''}</summary><label htmlFor="staff-print-name">Name on the photos<input id="staff-print-name" value={name} maxLength={65} onChange={e=>setName(e.target.value)}/></label>{showClassYear&&<label htmlFor="staff-class-year">Class year<input id="staff-class-year" value={year} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>}<button type="button" data-testid="staff-print-name-done" className="staffStartSecondary" onClick={()=>setNamesOpen(false)}>Done</button></details>
     <p className="staffStartSaveNote"><span aria-hidden="true">✓</span> Photos save automatically to this event.</p>
     {customError&&<p className="staffStartCustomWarning" role="status">{customError} <button type="button" onClick={e=>openCustom(e.currentTarget)}>Edit custom layout</button></p>}
     <div className="staffStartFooter"><div className="staffStartReadyEvent"><strong>{chosenEvent?.title||snapshot.payload.title}</strong><span>{chosenEvent?eventDate(chosenEvent.date):'Selected event'} · {chosenName}</span></div><button data-testid="staff-start-event" className="staffStartPrimary" disabled={saving||opening||customOpen||namesOpen||(design==='custom'&&customBusy)||!!customError||conflict||snapshot.payload.id!==eventId}>{saving?'Starting…':design==='custom'&&customBusy?'Preparing artwork…':'Start photo booth'}<span aria-hidden="true"> →</span></button></div>
    </section>
    {design==='custom'&&<dialog ref={customDialog} className="staffStartCustomDialog" data-testid="staff-custom-dialog" aria-labelledby="staff-custom-title" onKeyDown={keepCustomFocus} onCancel={()=>setCustomOpen(false)} onClose={()=>{setCustomOpen(false);customOpener.current?.focus();}}><div className="staffStartCustomDialogHeader"><div><h2 id="staff-custom-title">Custom layout</h2><p>Build a design or upload the customer’s artwork.</p></div><button type="button" aria-label="Close custom layout editor" className="staffStartDialogClose" onClick={closeCustom}>×</button></div><div className="staffStartCustomEditor"><CustomDesignEditor value={customDesign} onChange={setCustomDesign} onBusyChange={setCustomBusy}/></div><div className="staffStartCustomDialogFooter"><button type="button" data-testid="staff-custom-done" className="staffStartPrimary" onClick={closeCustom}>Done editing</button></div></dialog>}
   </fieldset></form>}
  </section>}
 </main>;
}
