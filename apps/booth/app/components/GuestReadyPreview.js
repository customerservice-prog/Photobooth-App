'use client';
import {useEffect,useRef,useState} from 'react';
import {eventMonogram} from '../lib/event-config.mjs';
import {makeKeepsakeExport,exportKey,latestOnly,downloadPrepared} from '../lib/keepsake-export.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from '../lib/print-package.mjs';
import './studio-experience.css';
import './photo-strip-options.css';
import './guest-ready.css';

// A pre-approved layout: guests never choose themes, frames, strip modes,
// event details, or templates. All of those are set by the operator beforehand.
export default function GuestReadyPreview({photo,poses=[],sessionShots,cfg,printing,printPackage,printsUsed=0,
 onPrint,onRetake,onFinish,onArchive,onSessionActive}){
 const four=sessionShots!==1,layout=four?'photo_strip':'card';
 const template=cfg.defaultTemplate||'champagne';
 const input={photo,poses,layout,stripMode:'single',cfg,monogram:eventMonogram(cfg),template,filter:'none'};
 const key=exportKey(input),pipeline=useRef(latestOnly()),archiveKey=useRef(null);
 const [artifact,setArtifact]=useState(null),[exportError,setExportError]=useState(''),[status,setStatus]=useState('');
 const [archiveBusy,setArchiveBusy]=useState(false),[archiveError,setArchiveError]=useState('');
 const [printRequested,setPrintRequested]=useState(false),[recoverySaved,setRecoverySaved]=useState(false),[retry,setRetry]=useState(0);
 const prepared=artifact?.key===key?artifact:null;
 const packageRules=normalizePrintPackage(printPackage||cfg.printPackage),remaining=printsRemaining(packageRules,printsUsed);
 const printAllowed=Boolean(prepared)&&!printing&&!archiveBusy&&!printRequested&&canPrint(packageRules,printsUsed,false);
 const busy=printing||archiveBusy;
 useEffect(()=>{
  setExportError('');setStatus('');
  const timer=setTimeout(()=>pipeline.current.run(()=>makeKeepsakeExport(input),setArtifact,e=>setExportError(e.message||'The photo could not be prepared.')),100);
  return()=>{clearTimeout(timer);pipeline.current.invalidate();};
 },[key,retry]);
 useEffect(()=>{
  if(!prepared||!onArchive||archiveKey.current===prepared.key)return;
  archiveKey.current=prepared.key;
  let active=true;setArchiveBusy(true);setArchiveError('');
  Promise.resolve(onArchive(prepared)).catch(()=>{
   if(active)setArchiveError('Could not save the finished picture in the event archive. Download a digital copy now and ask staff to check storage.');
  }).finally(()=>{if(active)setArchiveBusy(false);});
  return()=>{active=false;};
 },[prepared?.key,onArchive]);
 useEffect(()=>{
  const active=Boolean(!prepared&&!exportError||busy);
  onSessionActive?.(active);
  return()=>onSessionActive?.(false);
 },[Boolean(prepared),exportError,busy,onSessionActive]);
 function printNow(){
  if(!printAllowed)return;
  const result=onPrint?.();
  if(result===false||result==null){setStatus('The iPad could not open printing. Ask staff to check the Canon. Your digital photo is still saved.');return;}
  setPrintRequested(true);
  setStatus('Wireless print requested. Your attendant can help if the Canon does not produce paper.');
 }
 function saveRecovery(){
  if(!prepared)return;
  try{downloadPrepared(prepared);setRecoverySaved(true);setStatus('Recovery download requested. Staff should open the JPEG in Files before finishing.');}
  catch(e){setStatus(e.message||'Could not download the recovery photo.');}
 }
 return <section className="preview ksStudio agGuest" data-testid="approved-guest-preview" data-output-layout={layout} data-template={template}>
  <header className="agHeader">
   <div className="agBrand"><span aria-hidden="true">✦</span><strong>FRIENDLY PHOTO BOOTH</strong></div>
   <div className="agEvent"><strong>{cfg.title||'Your Celebration'}</strong><small>{cfg.date||''}</small></div>
  </header>
  <div className="agBody">
   <div className="agMessage">
    <span className="agEyebrow">YOUR EVENT DESIGN IS READY</span>
    <h1>{four?'Four smiles. One keepsake.':'Your moment, beautifully framed.'}</h1>
    <p>Your event artwork is already selected. Your digital photos are collected automatically for staff to share after the event.</p>
    <div className="agStepNote"><span>✓</span>{four?'Four different poses on one 4×6 print':'One large photo on one 4×6 print'}</div>
   </div>
   <div className="agPaperWrap" aria-label="Approved finished 4 by 6 photo">
    {prepared?<img data-testid="approved-finished-jpeg" src={prepared.dataUrl} alt={'Finished approved '+(four?'four-photo':'single-photo')+' keepsake for '+(cfg.title||'this event')}/>:<div className="agPreparing" role="status">{exportError||'Preparing your finished photo…'}</div>}
   </div>
  </div>
  <p className="agSaved" data-testid="approved-gallery-status">{archiveBusy?'Saving your photos…':archiveError?'Digital archive needs staff attention':prepared?'✓ Digital copy saved to the event gallery':'Preparing your keepsake…'}</p>
  {(archiveError||status||exportError)&&<p className={'agStatus'+(archiveError||exportError?' agWarning':'')} role={archiveError||exportError?'alert':'status'}>{archiveError||exportError||status}{archiveError&&prepared&&<button type="button" onClick={saveRecovery}>Save recovery JPEG</button>}{exportError&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry photo</button>}</p>}
  <footer className="agDock" aria-label="Finished photo actions">
   <button type="button" className="agButton agRetake" data-testid="approved-retake" onClick={onRetake} disabled={busy||printRequested}>↶ Retake</button>
   {packageRules.printingEnabled&&<button type="button" className="agButton agPrint" data-testid="approved-print" onClick={printNow} disabled={!printAllowed}>{printing?'Opening AirPrint…':printRequested?'Print requested':remaining<=0?'Print limit reached':'Print 4×6'}</button>}
   <button type="button" className="agButton agDone" data-testid="approved-done" onClick={onFinish} disabled={!prepared||busy||(Boolean(archiveError)&&!recoverySaved)}>Done ✓</button>
  </footer>
  <div className="photoPane ksPrintOnly" aria-hidden="true">{prepared&&<img className="ksExactPrintImage" src={prepared.dataUrl} alt=""/></div>
 </section>;
}
