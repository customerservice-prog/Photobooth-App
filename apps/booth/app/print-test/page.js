'use client';
import {useEffect,useState} from 'react';
import StaffPageNav from '../components/StaffPageNav';
import {makeKeepsakeExport} from '../lib/keepsake-export.mjs';
import {readPrintRehearsal,rehearsalInputs,rehearsalSampleFamily} from '../lib/print-rehearsal.mjs';
import {presetById} from '../lib/fpr-print-presets.mjs';
import './print-test.css';

function loadSamplePoses(family){
 return new Promise((resolve,reject)=>{
  const picture=new Image(),timer=setTimeout(()=>{picture.onload=null;picture.onerror=null;reject(new Error('Sample photos took too long to load. Reconnect and try again.'));},15000);
  picture.onload=()=>{
   clearTimeout(timer);
   const canvas=document.createElement('canvas');canvas.width=420;canvas.height=260;
   try{
    if(picture.naturalWidth<4||picture.naturalHeight<1)throw new Error('Sample photos could not be read.');
    const context=canvas.getContext('2d');if(!context)throw new Error('This device could not prepare a test photo.');
    const cellWidth=picture.naturalWidth/4,poses=[];
    for(let i=0;i<4;i++){context.clearRect(0,0,420,260);context.drawImage(picture,i*cellWidth,0,cellWidth,picture.naturalHeight,0,0,420,260);poses.push(canvas.toDataURL('image/jpeg',.80));}
    resolve(poses);
   }catch(error){reject(error);}
   finally{canvas.width=0;canvas.height=0;picture.onload=null;picture.onerror=null;}
  };
  picture.onerror=()=>{clearTimeout(timer);picture.onload=null;picture.onerror=null;reject(new Error('Sample photos could not load. Reconnect and try again.'));};
  picture.src='/images/welcome-poses/'+family+'-sprite.jpg';
 });
}

const physicalChecks=['Canon SELPHY selected, 4×6 paper, borderless and one copy','The design fills the sheet with all photos visible','Name, colors and edges look correct'];

export default function PrintTest(){
 const [context,setContext]=useState(null),[artifacts,setArtifacts]=useState(null),[choice,setChoice]=useState('one');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[checks,setChecks]=useState({}),[retry,setRetry]=useState(0),[imageReady,setImageReady]=useState(''),[sheetReady,setSheetReady]=useState('');
 useEffect(()=>{
  let alive=true;setError('');setArtifacts(null);setImageReady('');setSheetReady('');
  async function prepare(){
   try{
    const current=readPrintRehearsal(localStorage,window.location.search);
    if(!alive)return;setContext(current);
    if(!current.cfg)return;
    const inputs=rehearsalInputs(current.cfg,await loadSamplePoses(rehearsalSampleFamily(current.cfg)));
    const one=await makeKeepsakeExport(inputs.one),four=await makeKeepsakeExport(inputs.four);
    if(alive)setArtifacts({one,four});
   }catch(failure){if(alive)setError(failure.message||'The test print could not be prepared.');}
  }
  void prepare();
  const after=()=>{if(alive)setMessage('Print options closed. Check the sheet on the Canon below.');};
  window.addEventListener('afterprint',after);
  return()=>{alive=false;window.removeEventListener('afterprint',after);};
 },[retry]);
 const cfg=context?.cfg,selected=artifacts?.[choice],preset=cfg&&presetById(cfg.defaultTemplate),ready=selected&&imageReady===selected.key&&sheetReady===selected.key;
 const matchingStrips=Boolean(preset||cfg?.defaultTemplate==='grad-gala'||cfg?.defaultTemplate==='custom'&&cfg.customDesign?.layouts?.four?.copies===2);
 function select(next){setChoice(next);setChecks({});setMessage('');}
 function print(){
  if(!ready)return;setChecks({});setMessage('Select Canon SELPHY, 4×6 paper and one copy. Use borderless printing to fill the paper.');
  try{window.print();}catch{setMessage('Print options could not open. Ask the attendant to check this iPad.');}
 }
 const chooseHref=context?.scope?.imported?'/staff/start?event='+encodeURIComponent(context.scope.id):'/staff/start';
 return <main className="booth printRehearsal" data-testid="print-test-page">
  <section className="preview printRehearsalLayout">
   <div className="ptControls">
    <StaffPageNav/>
    <header><span className="ptEyebrow">STAFF · CANON PRINTER CHECK</span><h1>Test this event’s print.</h1><p>Choose a layout, then print one sample sheet.</p></header>
    {cfg&&<div className="ptEvent" data-testid="print-test-event"><strong>{cfg.title}</strong><span>{cfg.date}</span><small>{preset?preset.name+' artwork':cfg.defaultTemplate==='custom'?'Your approved custom artwork':'Your saved event artwork'}</small></div>}
    {cfg&&<>
     <div className="ptChoices" role="group" aria-label="Choose the test photo layout">
      {[['one','1 Photo','One large picture'],['four','4 Photos',matchingStrips?'4 poses · two matching strips':'Four separate poses']].map(([value,label,note])=><button type="button" key={value} data-testid={'print-test-'+value} aria-pressed={choice===value} onClick={()=>select(value)}><span className={'ptChoiceIcon ptChoiceIcon-'+value+(value==='four'&&!matchingStrips?' ptChoiceIcon-four-grid':'')} aria-hidden="true">{Array.from({length:value==='one'?1:matchingStrips?8:4},(_,i)=><i key={i}/>)}</span><strong>{label}</strong><small>{note}</small></button>)}
     </div>
     <button className="ptPrintButton" type="button" data-testid="print-test-print" disabled={!ready} onClick={print}>Print one {choice==='one'?'1-photo':'4-photo'} test sheet</button>
     <p className="ptAssurance">Sample photos only. This does not use the customer’s print allowance or save test photos to their gallery.</p>
    </>}
    {!context&&!error&&<p role="status">Opening your event…</p>}
    {context&&!cfg&&!error&&<div className="ptEmpty"><h2>Choose your event first.</h2><p>The printer check uses the design saved for that event.</p><a className="ptChooseEvent" href={chooseHref}>Choose event &amp; design</a></div>}
    {error&&<div className="ptError" role="alert"><p>{error}</p>{cfg&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry preview</button>}<a href={chooseHref}>Choose event &amp; design</a></div>}
    <p className="ptStatus" data-testid="print-test-status" role="status">{message||(!artifacts&&cfg&&!error?'Preparing the event’s sample prints…':'')}</p>
    {cfg&&<details className="ptPhysicalChecks"><summary>Check the real printed sheet</summary><div>{physicalChecks.map((label,i)=><label key={label}><input type="checkbox" checked={!!checks[i]} onChange={event=>setChecks({...checks,[i]:event.target.checked})}/><span>{label}</span></label>)}<p>{physicalChecks.every((_,i)=>checks[i])?'You marked this sample sheet checked.':'The iPad cannot confirm that a physical sheet printed.'}</p></div></details>}
   </div>
   <div className="ptPreviewPanel" data-testid="print-test-proof" data-output-layout={choice==='one'?'card':'photo_strip'} data-template={cfg?.defaultTemplate}>
    {cfg?<><div className="ptPreviewHeading"><span>YOUR EVENT’S PRINT</span><strong>{choice==='one'?'1 PHOTO':'4 PHOTOS'} · ONE 4×6 SHEET</strong></div><div className="ptPaper">{selected?<img key={selected.key} data-testid="print-test-preview" data-layout={choice==='one'?'card':'photo_strip'} src={selected.dataUrl} width="1200" height="1800" alt={'Sample '+(choice==='one'?'one-photo':'four-photo')+' print for '+cfg.title} onLoad={()=>setImageReady(selected.key)} onError={()=>{setImageReady('');setError('The sample preview could not display. Try preparing it again.');}}/>:<span role="status">{error?'Preview unavailable':'Preparing your sample print…'}</span>}</div><p className="ptSampleLabel">SAMPLE PHOTOS · YOUR APPROVED DESIGN</p></>:<div className="ptNoPreview" aria-hidden="true"><span>4 × 6</span><p>Your event preview appears here.</p></div>}
   </div>
   <div className="photoPane ksPrintOnly ptPrintOnly" aria-hidden="true">{selected&&<img key={selected.key} className="ksExactPrintImage" data-testid="print-test-sheet" src={selected.dataUrl} alt="" width="1200" height="1800" onLoad={()=>setSheetReady(selected.key)} onError={()=>{setSheetReady('');setError('The sample print could not load. Try preparing it again.');}}/>}</div>
  </section>
 </main>;
}
