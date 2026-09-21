'use client';
import {useEffect,useRef,useState} from 'react';
import PrintCard from './PrintCard';
import DeliveryPanel from './DeliveryPanel';
import {getDesigns,getDesign,EVENT_LABELS} from '../lib/keepsake-designs.mjs';
import {switchEventDraft,composeEventConfig,eventMonogram} from '../lib/event-config.mjs';
import {makeKeepsakeExport,exportKey,latestOnly,sharePrepared,downloadPrepared} from '../lib/keepsake-export.mjs';
import './keepsake-actions.css';

export default function PhotoPreview({photo,cfg,filter,filters,template,printing,editing,onEdit,onCommitEvent,onSessionActive,onTemplate,onFilter,onPrint,onRetake,onFinish}) {
 const [draft,setDraft]=useState(cfg),[artifact,setArtifact]=useState(null),[exportError,setExportError]=useState(''),[retry,setRetry]=useState(0),[status,setStatus]=useState(''),[saveError,setSaveError]=useState(''),[nativeBusy,setNativeBusy]=useState(false),[deliveryBusy,setDeliveryBusy]=useState(false),[deliveryActive,setDeliveryActive]=useState(false);
 const guard=useRef(false),pipeline=useRef(latestOnly());
 const view=editing?previewDraft(draft):cfg,type=view.type||'other',designs=getDesigns(type),selected=getDesign(type,template);
 const input={photo,cfg:view,monogram:eventMonogram(view),template,filter:filters[filter]},key=exportKey(input);
 const prepared=artifact?.key===key?artifact:null,busy=nativeBusy||deliveryBusy||printing;
 useEffect(()=>{if(!editing)setDraft(cfg);},[cfg,editing]);
 useEffect(()=>{
  setExportError('');setStatus('');
  if(editing){pipeline.current.invalidate();return;}
  const timeout=setTimeout(()=>pipeline.current.run(()=>makeKeepsakeExport(input),setArtifact,e=>setExportError(e.message||'The keepsake could not be prepared.')),180);
  return()=>{clearTimeout(timeout);pipeline.current.invalidate();};
 },[key,retry,editing]);
 useEffect(()=>{onSessionActive?.(editing||nativeBusy||deliveryActive||(!prepared&&!exportError));return()=>onSessionActive?.(false);},[editing,nativeBusy,deliveryActive,!!prepared,exportError,onSessionActive]);
 function toggleEditor(){if(busy)return;if(editing){setDraft(cfg);setSaveError('');onEdit(false);}else{setDraft(cfg);setSaveError('');onEdit(true);}}
 function changeType(next){setDraft(current=>switchEventDraft(current,next));setSaveError('');}
 function changeField(name,value){setDraft(current=>name==='date'?{...current,date:value}:{...current,details:{...current.details,[name]:value}});}
 // The controlled editor drives the same input model as the saved card. Saving is explicit.
 function saveEvent(e){e.preventDefault();try{const next=composeEventConfig(draft,{...draft.details,date:draft.date});if(onCommitEvent(next)!==false){setDraft(next);onEdit(false);setStatus('Event saved. These details will be used for the next guest too.');}}catch(e){setSaveError(e.message);}}
 async function share(){
  if(guard.current||busy||editing||!prepared)return;guard.current=true;setNativeBusy(true);setStatus('');
  try{await sharePrepared(prepared,cfg.title);setStatus('The device share sheet finished. Check the receiving device to confirm the keepsake arrived.');}
  catch(e){setStatus(e.name==='AbortError'?'Sharing cancelled. Your keepsake is still here.':e.message||'Sharing could not open. Download the keepsake instead.');}
  finally{guard.current=false;setNativeBusy(false);}
 }
 function download(){if(!prepared||busy||editing)return;try{downloadPrepared(prepared);setStatus('Download requested. Check Files or Downloads for the finished keepsake.');}catch(e){setStatus(e.message);}}
 return <section className="preview premiumPreview" aria-label="Photo preview">
  <div className="photoPane"><PrintCard photo={photo} cfg={view} monogram={eventMonogram(view)} template={template} filter={filters[filter]}/><div className="keepsakeLabel">{selected.name} · 4 × 6 {EVENT_LABELS[type]} keepsake</div>{editing&&<div className="draftNote">Previewing changes · save event details before printing</div>}</div>
  <aside className="actions studio" aria-label="Photo options">
   <header className="previewHeading"><div className="kicker">Your event. Your keepsake.</div><h2>Make it yours.</h2><p className="studioIntro">Choose a design. Your print and saved keepsake include the same artwork.</p></header>
   <section className="eventCustomizer">
    <button className="eventSummary" type="button" onClick={toggleEditor} disabled={busy} aria-expanded={editing} aria-controls="event-editor"><span><strong>Event details</strong><small>{EVENT_LABELS[type]||'Celebration'} · {view.title}</small></span><span className="editLabel">{editing?'Cancel':'Edit'}</span></button>
    {editing&&<div className="customizerBody" id="event-editor"><p className="editorNote">Choose the event, enter the names, then save. Cancel keeps your previous event unchanged.</p><div className="optionTitle" id="event-type-title">What are we celebrating?</div><div className="eventPicker" role="group" aria-labelledby="event-type-title">{Object.entries(EVENT_LABELS).map(([id,label])=><button type="button" key={id} className={'eventPick '+(type===id?'selected':'')} aria-pressed={type===id} onClick={()=>changeType(id)}>{label}</button>)}</div><form className="eventDetailForm" onSubmit={saveEvent}><EventFields type={type} details={draft.details||{}} onChange={changeField}/><label>Event date<input name="date" value={draft.date||''} maxLength={60} onChange={e=>changeField('date',e.target.value)}/></label>{saveError&&<p role="alert">{saveError}</p>}<button className="saveEventDetails primary" type="submit">Save event details</button></form></div>}
   </section>
   <section className="optionGroup designOptionGroup" aria-labelledby="frame-title"><div className="optionTitle" id="frame-title">Choose a print design</div><div className="designChoiceGrid" role="group" aria-labelledby="frame-title">{designs.map(d=><button type="button" disabled={busy} key={d.id} aria-pressed={template===d.id} aria-label={d.name+' — '+d.description} className={'designChoice '+(template===d.id?'selected':'')} onClick={()=>onTemplate(d.id)}><PrintCard mini photo={photo} cfg={view} monogram={eventMonogram(view)} template={d.id} filter={filters[filter]}/><span className="designName">{d.name}{template===d.id&&<span aria-hidden="true">✓</span>}</span></button>)}</div><p className="designSelectionNote">{selected.description}.</p></section>
   <div className="optionGroup"><div className="optionTitle" id="finish-title">Photo finish</div><div className="filterGrid" role="group" aria-labelledby="finish-title">{[['original','Original'],['glam','Soft'],['bw','B&W'],['warm','Warm']].map(([id,label])=><button type="button" disabled={busy} key={id} aria-pressed={filter===id} className={'filterChip '+(filter===id?'selected':'')} onClick={()=>onFilter(id)}>{label}</button>)}</div></div>
   <div className="guestActions"><button type="button" disabled={busy||editing} className="action primary printBtn" onClick={onPrint}>{printing?'Opening print options…':'Print Keepsake'}<small>{selected.name} · 4 × 6</small></button>
    {!editing&&<><button type="button" className="action shareBtn" disabled={busy||!prepared} onClick={share}>{nativeBusy?'Sharing…':prepared?'Share Keepsake':'Preparing Keepsake…'}<small>Includes your frame, names, date and photo finish</small></button><button type="button" className="action downloadKeepsake" disabled={busy||!prepared} onClick={download}>Download Keepsake<small>Finished JPEG · 1200 × 1800 pixels</small></button><DeliveryPanel photo={prepared?.dataUrl||null} title={cfg.title} artwork onBusyChange={setDeliveryBusy} onActivityChange={setDeliveryActive}/></>}
    {editing&&<p className="draftNote">Save event details above to print or send this version.</p>}
    {exportError&&!editing&&<div role="alert" className="exportError"><p>{exportError} Printing is still available.</p><button className="action" onClick={()=>setRetry(x=>x+1)}>Prepare again</button></div>}
    {status&&<p className="sharePanel" role="status">{status}</p>}
    <div className="secondaryActions"><button type="button" disabled={busy} onClick={onRetake}>Retake</button><button type="button" disabled={busy} onClick={onFinish}>Done</button></div><a className="guestHelpLink" href="/help">Help with printing or sharing</a>
   </div>
  </aside>
 </section>;
}
function previewDraft(draft){try{return composeEventConfig(draft,{...draft.details,date:draft.date});}catch{return draft;}}
const fieldGroups={wedding:[['partner1','Partner 1 / spouse’s name'],['partner2','Partner 2 / spouse’s name'],['venue','Venue (printed below names)'],['theme','Setup note (not printed)']],birthday:[['honoree','Birthday person’s name'],['age','Age (optional)'],['theme','Print caption (optional)']],mitzvah:[['honoree','Celebrant’s name'],['mitzvahType','Celebration'],['hebrewName','Hebrew name (optional)'],['theme','Setup note (not printed)']],graduation:[['graduate','Graduate’s name'],['classYear','Class year (optional)'],['school','School (optional)']],corporate:[['company','Company name'],['eventName','Event name'],['theme','Brand note (not printed)']],other:[['eventName','Event name'],['honoree','Guest of honor (optional)'],['subtitle','Print caption (optional)']]};
function EventFields({type,details,onChange}){return (fieldGroups[type]||fieldGroups.other).map(([name,label])=><label key={name}>{label}{name==='mitzvahType'?<select value={details[name]||'Bar Mitzvah'} onChange={e=>onChange(name,e.target.value)} name={name}><option>Bar Mitzvah</option><option>Bat Mitzvah</option><option>B’ Mitzvah</option><option>Mitzvah Celebration</option></select>:<input name={name} value={details[name]||''} onChange={e=>onChange(name,e.target.value)} inputMode={['age','classYear'].includes(name)?'numeric':undefined} maxLength={name==='age'?3:name==='classYear'?4:80}/>}</label>);}
