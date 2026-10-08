'use client';
import {useEffect,useRef,useState} from 'react';
import {eventMonogram} from '../lib/event-config.mjs';
import {makeKeepsakeExport,exportKey,latestOnly,sharePrepared,downloadPrepared} from '../lib/keepsake-export.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from '../lib/print-package.mjs';
import StudioDialog from './StudioDialog';
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
 const key=exportKey(input),pipeline=useRef(latestOnly()),archiveKey=useRef(null),actionGuard=useRef(false);
 const [artifact,setArtifact]=useState(null),[exportError,setExportError]=useState(''),[status,setStatus]=useState('');
 const [archiveBusy,setArchiveBusy]=useState(false),[archived,setArchived]=useState(false),[archiveError,setArchiveError]=useState('');
 const [printRequested,setPrintRequested]=useState(false),[recoverySaved,setRecoverySaved]=useState(false),[retry,setRetry]=useState(0),[archiveRetry,setArchiveRetry]=useState(0);
 const [sharing,setSharing]=useState(false),[nativeBusy,setNativeBusy]=useState(false);
 const prepared=artifact?.key===key?artifact:null;
 const packageRules=normalizePrintPackage(printPackage||cfg.printPackage),remaining=printsRemaining(packageRules,printsUsed);
 const busy=printing||archiveBusy||nativeBusy;
 const printAllowed=Boolean(prepared)&&!busy&&!printRequested&&canPrint(packageRules,printsUsed,false);
 useEffect(()=>{
  setExportError('');setStatus('');
  const timer=setTimeout(()=>pipeline.current.run(()=>makeKeepsakeExport(input),setArtifact,e=>setExportError(e.message||'The photo could not be prepared.')),100);
  return()=>{clearTimeout(timer);pipeline.current.invalidate();};
 },[key,retry]);
 useEffect(()=>{
  if(!prepared||!onArchive||archiveKey.current===prepared.key)return;
  archiveKey.current=prepared.key;
  let active=true;setArchiveBusy(true);setArchived(false);setArchiveError('');
  Promise.resolve().then(()=>onArchive(prepared)).then(()=>{if(active)setArchived(true);}).catch(()=>{
   if(active){archiveKey.current=null;setArchiveError('Could not save the finished picture in the event archive. Retry saving or download a recovery copy and ask staff to check storage.');}
  }).finally(()=>{if(active)setArchiveBusy(false);});
  return()=>{active=false;};
 },[prepared?.key,onArchive,archiveRetry]);
 useEffect(()=>{
  // Keep the capture on screen while sharing, or until a failed archive has
  // been retried/recovered. An idle reset must not discard its finished JPEG.
  const active=Boolean(!prepared&&!exportError||busy||sharing||prepared&&onArchive&&!archived&&!recoverySaved);
  onSessionActive?.(active);
  return()=>onSessionActive?.(false);
 },[Boolean(prepared),exportError,busy,sharing,archived,recoverySaved,onArchive,onSessionActive]);
 function printNow(){
  if(!printAllowed||actionGuard.current)return;
  actionGuard.current=true;
  try{
   const result=onPrint?.();
   if(result===false||result==null){setStatus('The iPad could not open printing. Ask staff to check the Canon. Your digital photo is still saved.');return;}
   setPrintRequested(true);
   setStatus('Wireless print requested. Check the Canon for the physical sheet. If you canceled or no sheet came out, use Retry print below.');
  }finally{actionGuard.current=false;}
 }
 function retryPrint(){
  if(!printRequested||busy||actionGuard.current)return;
  actionGuard.current=true;
  try{
   if(onPrintOutcome?.('failed')!==true){setStatus('Ask staff to review this print request before retrying. Your photo is still here.');return;}
   setPrintRequested(false);
   setStatus('The unprinted request was restored. Tap Print 4×6 to try again.');
  }finally{actionGuard.current=false;}
 }
 async function share(){
  if(!prepared||busy||actionGuard.current)return;
  actionGuard.current=true;setNativeBusy(true);setStatus('');
  try{await sharePrepared(prepared,cfg.title);setStatus('Sharing finished. Check the receiving device to confirm the photo arrived.');}
  catch(e){setStatus(e.name==='AbortError'?'Sharing canceled. Your photo is still here.':e.message||'Try Download photo instead.');}
  finally{actionGuard.current=false;setNativeBusy(false);}
 }
 function download(){
  if(!prepared||busy)return;
  try{downloadPrepared(prepared);setStatus('Download requested. Look in Files or Downloads on this iPad for your photo.');}
  catch(e){setStatus(e.message||'Could not download this photo.');}
 }
 function saveRecovery(){
  if(!prepared||busy)return;
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
  <p className="agSaved" data-testid="approved-gallery-status">{archiveBusy?'Saving your photos…':archiveError?'Digital archive needs staff attention':archived?'✓ Digital copy saved to the event gallery':prepared?'Finishing digital archive…':'Preparing your keepsake…'}</p>
  {(archiveError||status||exportError)&&<p className={'agStatus'+(archiveError||exportError?' agWarning':'')} role={archiveError||exportError?'alert':'status'}>{archiveError||exportError||status}{archiveError&&prepared&&<><button type="button" data-testid="approved-retry-save" disabled={busy} onClick={()=>setArchiveRetry(n=>n+1)}>Retry saving</button><button type="button" disabled={busy} onClick={saveRecovery}>Save recovery JPEG</button></>}{exportError&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry photo</button>}</p>}
  {printRequested&&<div className="agPrintRecovery"><span>Only retry if you canceled or no sheet printed.</span><button type="button" data-testid="approved-retry-print" disabled={busy} onClick={retryPrint}>Retry print</button></div>}
  <footer className="agDock" aria-label="Finished photo actions">
   <button type="button" className="agButton agRetake" data-testid="approved-retake" onClick={onRetake} disabled={busy||printRequested}>↶ Retake</button>
   <button type="button" className="agButton agShare" data-testid="approved-digital-copy" onClick={()=>{setStatus('');setSharing(true);}} disabled={!prepared||busy}>Digital Copy</button>
   {packageRules.printingEnabled&&<button type="button" className="agButton agPrint" data-testid="approved-print" onClick={printNow} disabled={!printAllowed}>{printing?'Opening AirPrint…':printRequested?'Print requested':remaining<=0?'Print limit reached':'Print 4×6'}</button>}
   <button type="button" className="agButton agDone" data-testid="approved-done" onClick={onFinish} disabled={!prepared||busy||(!archived&&!recoverySaved)}>Done ✓</button>
  </footer>
  <div className="photoPane ksPrintOnly" aria-hidden="true">{prepared&&<img className="ksExactPrintImage" src={prepared.dataUrl} alt=""/>}</div>
  {sharing&&<StudioDialog title="Get a digital copy." busy={busy} onClose={()=>setSharing(false)}>
   <div className="agDigitalCopy"><p>This is your finished event design. Digital copies use no physical prints. Staff also keeps the event gallery to share afterward.</p>
    <button type="button" className="agButton agPrint" data-testid="approved-share-photo" disabled={!prepared||busy} onClick={share}>Share photo</button>
    <button type="button" className="agButton agShare" data-testid="approved-download-photo" disabled={!prepared||busy} onClick={download}>Download photo</button>
    <small>Sharing apps depend on this iPad. Downloads save in Files or Downloads on this device.</small>
    {status&&<p role="status">{status}</p>}
   </div>
  </StudioDialog>}
 </section>;
}
