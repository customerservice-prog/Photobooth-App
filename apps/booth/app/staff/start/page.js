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

function LayoutPreview({snapshot,design,customDesign,name,year}){
 const previews=useMemo(()=>{
  if(!snapshot)return null;
  try{
   const cfg={...configFromBoothHandoff(snapshot.payload),defaultTemplate:design,customDesign,approvedPrintName:name||snapshot.payload.name||snapshot.payload.title};
   cfg.details={...cfg.details,eventName:cfg.approvedPrintName,...(cfg.type==='graduation'?{graduate:cfg.approvedPrintName}:{honoree:cfg.approvedPrintName}),classYear:year};
   return ['card','photo_strip'].map((layout,index)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(renderKeepsake({cfg,template:design,layout,sample:true,id:'staff-start-preview-'+index})));
  }catch{return null;}
 },[snapshot,design,customDesign,name,year]);
 if(!previews)return <div className="staffStartPreviewEmpty">Your layout preview will appear here.</div>;
 return <div className="staffStartPreviews">{previews.map((src,index)=><figure key={index}><img src={src} alt={(index===0?'1 photo':'4 photos')+' in the selected event layout'} data-testid={'staff-layout-preview-'+(index===0?'one':'four')}/><figcaption>{index===0?'1 Photo':'4 Photos'}<span>One 4×6 print</span></figcaption></figure>)}</div>;
}

export default function StaffStartPage(){
 const [events,setEvents]=useState([]),[eventId,setEventId]=useState(''),[snapshot,setSnapshot]=useState(null);
 const [design,setDesign]=useState(''),[customDesign,setCustomDesign]=useState(()=>createCustomDesign());
 const [name,setName]=useState(''),[year,setYear]=useState('');
 const [loading,setLoading]=useState(true),[opening,setOpening]=useState(false),[saving,setSaving]=useState(false);
 const [needPin,setNeedPin]=useState(false),[pin,setPin]=useState(''),[pinBusy,setPinBusy]=useState(false);
 const [error,setError]=useState(''),[conflict,setConflict]=useState(false),[refresh,setRefresh]=useState(0),[back,setBack]=useState(''),[currentEvent,setCurrentEvent]=useState(null);
 const busy=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;try{
  const destination=activeEventDestination(localStorage);
  if(destination){
   const id=localStorage.getItem(ACTIVE_EVENT_KEY);
   const config=JSON.parse(localStorage.getItem('friendly-booth-transfer-v1-'+id+'-config')||'null');
   setBack(destination);setCurrentEvent({id,title:typeof config?.title==='string'?config.title:'Current event',date:typeof config?.date==='string'?config.date:''});
  }
 }catch{}return()=>{mounted.current=false;};},[]);

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
  const controller=new AbortController();setOpening(true);setSnapshot(null);setError('');setConflict(false);
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
  e.preventDefault();if(busy.current||!snapshot||!design||customError||conflict)return;
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

 return <main className="staffStartPage">
  <header className="staffStartHeader"><a href="/launch" aria-label="Friendly Photo Booth start screen" className="staffStartBrand">Friendly<span>PHOTO BOOTH</span></a><div className="staffStartHeaderActions"><a href="/launch" data-testid="staff-start-back" className="staffStartHome">← Back to start screen</a><span className="staffStartBadge">STAFF</span></div></header>
  {needPin?<section className="staffStartSignIn"><span className="staffStartEyebrow">STAFF EVENT SETUP</span><h1>Choose event &amp; layout.</h1><p>Enter your staff PIN to review the current event or prepare another. You’ll open the guest welcome after choosing its layout.</p><form onSubmit={unlock}><label htmlFor="staff-start-pin">4-digit staff PIN</label><input id="staff-start-pin" data-testid="staff-start-pin" aria-label="4-digit staff PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} minLength={4} pattern="[0-9]{4}" value={pin} onChange={e=>setPin(normalizeStaffPinInput(e.target.value))} placeholder="●●●●" required autoFocus/>{error&&<p role="alert" className="staffStartError">{error}</p>}<button data-testid="staff-start-unlock" className="staffStartPrimary" disabled={pinBusy||!isValidStaffPin(pin)}>{pinBusy?'Checking…':'Unlock event setup'}</button></form>{back&&<a className="staffStartBack" data-testid="staff-start-resume-current" href={back}>Return to current event’s guest welcome</a>}</section>:<section className="staffStartContent">
   <div className="staffStartIntro"><span className="staffStartEyebrow">FRIENDLY PHOTO BOOTH · EVENT SETUP</span><h1>Get this event ready.</h1><p>Choose the event, review its layout, then open the guest welcome. Guests choose 1 Photo or 4 Photos and tap Start there.</p></div>
   <ol className="staffStartFlow" role="list" aria-label="Prepare the booth"><li>Choose event</li><li>Choose layout</li><li>Open guest welcome</li></ol>
   {currentEvent&&<aside className="staffStartCurrent" aria-label="Current event on this iPad"><div><span>Current on this iPad</span><strong>{currentEvent.title}</strong>{currentEvent.date&&<small>{currentEvent.date}</small>}</div><a data-testid="staff-start-resume-current" href={back}>Return to guest welcome →</a></aside>}
   <div className="staffStartEventPicker"><label htmlFor="staff-event-select">1. Choose the event</label><select id="staff-event-select" data-testid="staff-event-select" value={eventId} disabled={loading||saving} onChange={e=>setEventId(e.target.value)}><option value="">{loading?'Opening events…':'Choose an event…'}</option>{events.map(event=><option key={event.id} value={event.id}>{event.title} · {eventDate(event.date)}</option>)}</select>{!loading&&events.length===0&&!error&&<p>No events are ready yet. Ask the owner to create the booking in the dashboard.</p>}{currentEvent&&eventId&&<p className="staffStartSelectionNote">{eventId===currentEvent.id?'You’re reviewing the current event. Your layout choice applies when you open the guest welcome.':'You’re preparing a different event. The current event stays open until you choose Open guest welcome.'}</p>}</div>
   {error&&<div className="staffStartError" role="alert"><p>{error}</p>{conflict?<button type="button" onClick={()=>setRefresh(value=>value+1)}>Refresh this event</button>:!snapshot?<button type="button" onClick={()=>eventId?setRefresh(value=>value+1):loadEvents()}>Try again</button>:null}</div>}
   {opening&&<p className="staffStartLoading" role="status">Opening the event’s layout…</p>}
   {snapshot&&<form onSubmit={start} className="staffStartForm"><fieldset disabled={saving}>
    <div className="staffStartLayoutHeader"><h2>2. Choose one layout</h2><p>Includes matching 1-photo and 4-photo prints. Review both below.</p></div>
    <div className="staffStartLayoutCards" role="group" aria-label="Event layout">
     {FPR_PRINT_PRESETS.map(preset=><button type="button" data-testid={'staff-layout-'+preset.id} key={preset.id} aria-pressed={design===preset.id} className={'staffStartLayoutCard'+(design===preset.id?' isSelected':'')} onClick={()=>setDesign(preset.id)}><span className="staffStartCardImage"><img src={preset.image} alt="" loading="lazy"/></span><strong>{preset.name}</strong><span>{preset.caption}</span><span className="staffStartSelection">{design===preset.id?'✓ Selected':'Choose layout'}</span></button>)}
     <button type="button" data-testid="staff-layout-custom" aria-pressed={design==='custom'} className={'staffStartLayoutCard staffStartCustomCard'+(design==='custom'?' isSelected':'')} onClick={()=>setDesign('custom')}><span className="staffStartCustomArt" aria-hidden="true">✦</span><strong>Custom</strong><span>Upload artwork or build your own</span><span className="staffStartSelection">{design==='custom'?'✓ Selected':'Create a layout'}</span></button>
    </div>
    {design==='custom'&&<section className="staffStartCustomEditor"><h2>Your custom layout</h2><CustomDesignEditor value={customDesign} onChange={setCustomDesign}/></section>}
    <div className="staffStartProof"><div className="staffStartProofText"><span className="staffStartEyebrow">YOUR EVENT’S PRINTS</span><h2>{events.find(event=>event.id===eventId)?.title||snapshot.payload.title}</h2><p>Guests choose 1 Photo or 4 Photos. This layout is already selected for them.</p><details className="staffStartNames"><summary>Edit the printed name{snapshot.payload.type==='graduation'?' or class year':''}</summary><label htmlFor="staff-print-name">Name on the photos<input id="staff-print-name" value={name} maxLength={65} onChange={e=>setName(e.target.value)}/></label>{snapshot.payload.type==='graduation'&&<label htmlFor="staff-class-year">Class year<input id="staff-class-year" value={year} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>}</details><p className="staffStartSaveNote"><span aria-hidden="true">✓</span> Photos save to this event’s digital gallery.</p></div><LayoutPreview snapshot={snapshot} design={design} customDesign={customDesign} name={name} year={year}/></div>
    <div className="staffStartFooter"><p><strong>3. Open guest welcome</strong>Saves this layout and opens the selected event on this iPad.</p><button data-testid="staff-start-event" className="staffStartPrimary" disabled={saving||!!customError||conflict}>{saving?'Opening guest welcome…':'Open guest welcome'}<span aria-hidden="true"> →</span></button></div>
   </fieldset></form>}
  </section>}
 </main>;
}
