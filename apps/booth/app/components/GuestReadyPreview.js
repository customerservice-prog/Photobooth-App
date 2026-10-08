'use client';
import {useEffect,useRef,useState} from 'react';
import {eventMonogram} from '../lib/event-config.mjs';
import {makeKeepsakeExport,exportKey,latestOnly,sharePrepared,downloadPrepared} from '../lib/keepsake-export.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from '../lib/print-package.mjs';
import './studio-experience.css';
import './photo-strip-options.css';
import './guest-ready.css';

// A pre-approved layout: guests never choose themes, frames, strip modes,
// event details, or templates. All of those are set by the operator beforehand.
export default function GuestReadyPreview({photo,poses=[],sessionShots,cfg,printing,printPackage,printsUsed=0,
 onPrint,onPrintOutcome,onRetake,onFinish,onArchive,onSessionActive}){
 const four=sessionShots!==1,layout=four?'photo_strip':'card';
 const template=cfg.defaultTemplate||'champagne';
 const input={photo,poses,layout,stripMode:'single',cfg,monogram:eventMonogram(cfg),template,filter:'none'};
 const key=exportKey(input),pipeline=useRef(latestOnly()),archiveKey=useRef(null);
 const [artifact,setArtifact]=useState(null),[exportError,setExportError]=useState(''),[status,setStatus]=useState('');
 const [archiveBusy,setArchiveBusy]=useState(false),[archiveError,setArchiveError]=useState('');
 const [sharing,setSharing]=useState(false),[printConfirm,setPrintConfirm]=useState(false),[printed,setPrinted]=useState(false),[retry,setRetry]=useState(0);
 const prepared=artifact?.key===key?artifact:null;
 const packageRules=normalizePrintPackage(printPackage||cfg.printPackage),remaining=printsRemaining(packageRules,printsUsed);
 const printAllowed=Boolean(prepared)&&!printing&&!sharing&&!printConfirm&&!archiveBusy&&!printed&&canPrint(packageRules,printsUsed,false);
 const busy=printing||sharing||archiveBusy;
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
  const active=Boolean(!prepared&&!exportError||busy||printConfirm);
  onSessionActive?.(active);
  return()=>onSessionActive?.(false);
 },[Boolean(prepared),exportError,busy,printConfirm,onSessionActive]);
 function printNow(){
  if(!printAllowed)return;
  const result=onPrint?.();
  if(result===false||result==null){setStatus('The iPad could not open printing. Ask staff to check the Canon or save the JPEG instead.');return;}
  setStatus('AirPrint opened. Select Canon SELPHY CP1500 and 4×6 paper. Confirm the physical sheet.');
  setPrintConfirm(true);
 }
 function confirmPrint(outcome){
  try{
   const ok=onPrintOutcome?.(outcome);
   if(ok===false)return;
   if(outcome==='printed'){setPrinted(true);setStatus('Print confirmed. Your digital copy is still available.');}
   else{setStatus('Nothing printed. Your photograph is saved; you can retry or save the JPEG.');}
   setPrintConfirm(false);
  }catch(e){setStatus(e.message||'Staff should check the print request before proceeding.');}
 }
 async function share(){
  if(!prepared||sharing)return;
  setSharing(true);setStatus('');
  try{
   await sharePrepared(prepared,cfg.title);
   setStatus('Share requested. Confirm the photo arrived on the receiving device.');
  }catch(e){setStatus(e.name==='AbortError'?'Sharing cancelled. Your photo is still here.':e.message||'Use Save JPEG instead.');}
  finally{setSharing(false);}
 }
 function save(){
  if(!prepared)return;
  try{downloadPrepared(prepared);setStatus('Digital photo saved to this device’s Downloads or Files.');}
  catch(e){setStatus(e.message||'Download could not start.');}
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
    <p>Your event artwork is already selected. No designs to choose—just enjoy the photos.</p>
    <div className="agStepNote"><span>✓</span>{four?'Four different poses on one 4×6 print':'One large photo on one 4×6 print'}</div>
   </div>
   <div className="agPaperWrap" aria-label="Approved finished 4 by 6 photo">
    {prepared?<img data-testid="approved-finished-jpeg" src={prepared.dataUrl} alt={'Finished approved '+(four?'four-photo':'single-photo')+' keepsake for '+(cfg.title||'this event')}/>:<div className="agPreparing" role="status">{exportError||'Preparing your finished photo…'}</div>}
   </div>
  </div>
  {(archiveError||status||exportError)&&<p className={'agStatus'+(archiveError||exportError?' agWarning':'')} role={archiveError||exportError?'alert':'status'}>{archiveError||exportError||status}{exportError&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry photo</button>}</p>}
  <footer className="agDock">
   <button type="button" className="agButton agRetake" onClick={onRetake} disabled={busy||printConfirm||printed}>↶ Retake</button>
   <button type="button" className="agButton agSave" data-testid="approved-save" onClick={save} disabled={!prepared||busy}>Save JPEG</button>
   <button type="button" className="agButton agShare" data-testid="approved-share" onClick={share} disabled={!prepared||busy}>Digital Copy</button>
   {packageRules.printingEnabled&&<button type="button" className="agButton agPrint" data-testid="approved-print" onClick={printNow} disabled={!printAllowed}>{printing?'Opening AirPrint…':printed?'Print confirmed':remaining<=0?'Print limit reached':'Print 4×6'}</button>}
   <button type="button" className="agButton agDone" data-testid="approved-done" onClick={onFinish} disabled={!prepared||busy||printConfirm}>Done ✓</button>
  </footer>
  {printConfirm&&<div className="agConfirmBackdrop" role="presentation"><section className="agConfirm" role="dialog" aria-modal="true" aria-label="Confirm your physical print">
   <h2>Did the photo print?</h2>
   <p>The iPad can request wireless printing but cannot detect paper leaving the Canon. Select the SELPHY CP1500 in the AirPrint sheet and check the actual 4×6 print.</p>
   <button type="button" onClick={()=>confirmPrint('printed')}>Yes — paper printed</button>
   <button type="button" onClick={()=>confirmPrint('failed')}>No — retry or save JPEG</button>
  </section></div>}
  <div className="photoPane ksPrintOnly" aria-hidden="true">{prepared&&<img className="ksExactPrintImage" src={prepared.dataUrl} alt=""/></div>
 </section>;
}
