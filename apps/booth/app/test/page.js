'use client';
import {useEffect,useState} from 'react';
import StaffPageNav from '../components/StaffPageNav';
import BoothContextLink from '../components/BoothContextLink';
import {readPrintRehearsal} from '../lib/print-rehearsal.mjs';
import {presetById} from '../lib/fpr-print-presets.mjs';
import {readBoothCapabilities,probeLocalPhotoStorage,boothDiagnosticChecks,diagnosticLimits} from '../lib/booth-readiness.mjs';
import './rehearsal.css';

const groups=[
 {id:'camera',title:'Camera & guest flow',items:[
  ['camera','Camera permission is allowed and the live preview works'],
  ['one','1 Photo → Start 1 photo produces the approved event design'],
  ['four','4 Photos → Start 4 photos captures four separate poses'],
  ['voice','Countdown voice is audible and the pause between poses feels right'],
  ['preview','Finished photo has the correct name, date, orientation and artwork'],
  ['done','Done returns to this event’s welcome screen']
 ]},
 {id:'print',title:'Canon paper output',items:[
  ['printer','Canon SELPHY, 4×6 paper and one copy are selected'],
  ['paper-one','The 1-photo sample finishes printing on one complete sheet'],
  ['paper-four','The 4-photo sample finishes printing on one complete sheet'],
  ['edges','Names, colors and all photo edges look right on the paper']
 ]},
 {id:'save',title:'Saving & recovery',items:[
  ['download','Send → Save photo downloads a photo that opens correctly'],
  ['recovery','Staff tools → Recover a recent photo reopens the correct test photo'],
  ['gallery','Automatic event gallery reports every test photo file saved'],
  ['zip','Download gallery ZIP opens with originals, collages and finished photos']
 ]},
 {id:'ipad',title:'Actual event iPad',items:[
  ['home','Friendly Booth opens from its Home Screen icon'],
  ['lock','Guided Access is started and guests cannot leave the booth'],
  ['awake','Keep the screen awake and Guided Access Display Auto-Lock work as intended'],
  ['offline','A staff test photo captures and can be recovered with venue internet disconnected']
 ]}
];

export default function EventRehearsal(){
 const [context,setContext]=useState(null),[error,setError]=useState(''),[diag,setDiag]=useState(null),[checks,setChecks]=useState({}),[channels,setChannels]=useState(null);
 useEffect(()=>{
  let alive=true;
  try{setContext(readPrintRehearsal(localStorage,window.location.search));}catch(failure){setError(failure.message);}
  const capabilities=readBoothCapabilities();setDiag(capabilities);
  let idb;try{idb=window.indexedDB;}catch{}
  void probeLocalPhotoStorage(idb).then(photoStorage=>{if(alive)setDiag(current=>({...current,photoStorage}));});
  const connection=()=>setDiag(current=>({...current,online:navigator.onLine===true}));
  window.addEventListener('online',connection);window.addEventListener('offline',connection);
  const controller=new AbortController();
  void fetch('/api/delivery/config',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(response=>response.ok?response.json():null).then(result=>{if(alive)setChannels(result?{email:result.email?.configured===true,sms:result.sms?.configured===true}:null);}).catch(()=>{});
  return()=>{alive=false;controller.abort();window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};
 },[]);
 const cfg=context?.cfg,preset=cfg&&presetById(cfg.defaultTemplate);
 const deliveryItems=[['send','Send opens with the available delivery choices']];
 if(channels?.email)deliveryItems.push(['email','A test email’s photo attachment and private link open in the staff test inbox']);
 if(channels?.sms)deliveryItems.push(['sms','A test text arrives on the staff test phone and its private photo link opens']);
 const sections=[...groups.slice(0,2),{id:'delivery',title:'Real delivery',items:deliveryItems},...groups.slice(2)];
 const allItems=sections.flatMap(group=>group.items),done=allItems.filter(([id])=>checks[id]).length;
 const chooseHref=context?.scope?.imported?'/staff/start?event='+encodeURIComponent(context.scope.id):'/staff/start';
 return <main className="eventRehearsal"><div className="erWrap"><StaffPageNav/>
  <header><div className="erEyebrow">STAFF · BEFORE GUESTS ARRIVE</div><h1>Rehearse your event.</h1><p>Check the real iPad, finished photos and Canon paper output. Mark each item only after you try it.</p></header>
  <section className="erCard erEvent" aria-label="Selected event">
   {cfg?<><span className="erEyebrow">SELECTED EVENT</span><h2>{cfg.title}</h2><p>{cfg.date} · {preset?preset.name+' artwork':cfg.defaultTemplate==='custom'?'Your approved custom artwork':'Your saved event artwork'} · 4×6 keepsake</p></>:<><h2>Choose and save an event first.</h2><p>The printer check uses that event’s approved design.</p><a href={chooseHref}>Choose event &amp; design</a></>}
   {error&&<p role="alert">{error}</p>}
  </section>
  <section className="erCard"><div className="erEyebrow">THIS BROWSER</div><h2>Software checks</h2><div className="erDiagnostics">{diag?boothDiagnosticChecks(diag).map(({key,label,ok})=><div key={key} className={ok===null?'pending':ok?'ok':'attention'}><b>{ok===null?'…':ok?'✓':'!'}</b>{label}</div>):<p role="status">Checking this browser…</p>}</div><p className="erNote">{diagnosticLimits}</p></section>
  <section className="erCard erTools"><h2>Open the checks</h2><div className="erActions"><BoothContextLink href="/print-test">Test approved print</BoothContextLink><BoothContextLink href="/delivery-check">Test email &amp; text</BoothContextLink><BoothContextLink href="/help">Help guide</BoothContextLink></div><p className="erNote">The printer check uses sample photos and does not use the customer’s print allowance or add photos to their gallery. For camera and delivery tests, choose a staff test event and use your own contact details.</p></section>
  <section className="erCard"><div className="erProgress"><h2>Your rehearsal checklist</h2><strong>{done}/{allItems.length}</strong></div><progress aria-label="Manually confirmed rehearsal checks" value={done} max={allItems.length}/>
   {sections.map(group=><fieldset key={group.id}><legend>{group.title}</legend>{group.items.map(([id,label])=><label className="erCheck" key={id}><input type="checkbox" checked={!!checks[id]} onChange={event=>setChecks({...checks,[id]:event.target.checked})}/><span>{label}</span></label>)}{group.id==='delivery'&&<p className="erNote">{channels?(!channels.email&&!channels.sms?'Direct email and text are not configured. Save photo and device sharing remain available.':(!channels.email?'Direct email is not configured. ':!channels.sms?'Direct text is not configured. ':'')+'Provider acceptance alone does not confirm the photo reached the inbox or phone.'):'Delivery setup could not be checked here. Open Test email & text for the current status.'}</p>}</fieldset>)}
   <button className="erReset" type="button" onClick={()=>setChecks({})}>Reset checklist</button>
   {done===allItems.length&&<div className="erComplete" role="status"><strong>You marked every rehearsal item checked.</strong><p>These are your confirmations. Keep both sample sheets and confirm the printer is still connected before guests arrive.</p></div>}
  </section><p className="erNote erFooter">This page does not start an event, send a photo, print a sheet or delete photos automatically.</p>
 </div></main>;
}
