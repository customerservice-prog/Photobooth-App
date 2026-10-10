'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {eventMonogram} from '../lib/event-config.mjs';
import {makeKeepsakeExport,exportKey,latestOnly,sharePrepared,downloadPrepared} from '../lib/keepsake-export.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from '../lib/print-package.mjs';
import StudioDialog from './StudioDialog';
import StaffAccessGate from './StaffAccessGate';
import DeliveryPanel from './DeliveryPanel';
import {guestEventConfig} from '../lib/guest-design.mjs';
import {guestFinishTheme,themeFromArtwork} from '../lib/guest-finish-theme.mjs';
import './studio-experience.css';
import './photo-strip-options.css';
import './guest-ready.css';

// A pre-approved layout: guests never choose themes, frames, strip modes,
// event details, or templates. All of those are set by the operator beforehand.
export default function GuestReadyPreview({photo,poses=[],sessionShots,cfg:storedCfg,printing,printPackage,printsUsed=0,
 onPrint,onPrintOutcome,onFinish,onArchive,onSessionActive,onOperator}){
 const cfg=guestEventConfig(storedCfg);
 const four=sessionShots!==1,layout=four?'photo_strip':'card';
 const template=cfg.defaultTemplate;
 const input={photo,poses,layout,stripMode:'single',cfg,monogram:eventMonogram(cfg),template,filter:'none'};
 const key=exportKey(input),pipeline=useRef(latestOnly()),archiveKey=useRef(null),actionGuard=useRef(false);
 const baseTheme=useMemo(()=>guestFinishTheme(cfg),[key]);
 const [artworkTheme,setArtworkTheme]=useState(null);
 const theme=artworkTheme?.key===key?artworkTheme.theme:baseTheme;
 const [artifact,setArtifact]=useState(null),[exportError,setExportError]=useState(''),[status,setStatus]=useState('');
 const [archiveBusy,setArchiveBusy]=useState(false),[archived,setArchived]=useState(false),[archiveError,setArchiveError]=useState('');
 const [printRequested,setPrintRequested]=useState(false),[recoverySaved,setRecoverySaved]=useState(false),[retry,setRetry]=useState(0),[archiveRetry,setArchiveRetry]=useState(0);
 const [sharing,setSharing]=useState(false),[nativeBusy,setNativeBusy]=useState(false),[deliveryBusy,setDeliveryBusy]=useState(false);
 const [staffPrompt,setStaffPrompt]=useState(false);
 const prepared=artifact?.key===key?artifact:null;
 const packageRules=normalizePrintPackage(printPackage||cfg.printPackage),remaining=printsRemaining(packageRules,printsUsed);
 const busy=printing||archiveBusy||nativeBusy||deliveryBusy;
 const printAllowed=Boolean(prepared)&&!busy&&!printRequested&&canPrint(packageRules,printsUsed,false);
 useEffect(()=>{
  if(template!=='custom'||cfg.customDesign?.mode!=='upload')return;
  let active=true;
  themeFromArtwork(cfg.customDesign,layout).then(value=>{if(active)setArtworkTheme({key,theme:value});}).catch(()=>{});
  return()=>{active=false;};
 },[key]);
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
  // Keep the capture on screen while preparing/sharing, or until an export or
  // archive failure has been recovered. Staff may need the original photos.
  const active=Boolean(!prepared||exportError||busy||sharing||staffPrompt||prepared&&onArchive&&!archived&&!recoverySaved);
  onSessionActive?.(active);
  return()=>onSessionActive?.(false);
 },[Boolean(prepared),exportError,busy,sharing,staffPrompt,archived,recoverySaved,onArchive,onSessionActive]);
 function printNow(){
  if(!printAllowed||actionGuard.current)return;
  actionGuard.current=true;
  try{
   const result=onPrint?.();
   if(result===false||result==null){setStatus('The iPad could not open printing. Ask staff to check the Canon. Your photo is still here.');return;}
   setPrintRequested(true);
   setStatus('Select the Canon printer and 4×6 paper. If no photo prints, tap Retry print.');
  }finally{actionGuard.current=false;}
 }
 function retryPrint(){
  if(!printRequested||busy||actionGuard.current)return;
  actionGuard.current=true;
  try{
   if(onPrintOutcome?.('failed')!==true){setStatus('Ask staff to review this print request before retrying. Your photo is still here.');return;}
   setPrintRequested(false);
   setStatus('Ready to try again. Tap Print.');
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
 return <section className="preview ksStudio agGuest" style={theme.style} data-testid="approved-guest-preview" data-output-layout={layout} data-template={template} data-design-key={cfg.type+'/'+template} data-theme-source={theme.source} data-theme-paper={theme.palette.paper}>
  <header className="agHeader">
   <div className="agBrand"><span aria-hidden="true">✦</span><strong>FRIENDLY PHOTO BOOTH</strong></div>
   <div className="agEvent"><strong>{cfg.title||'Your Celebration'}</strong><small>{cfg.date||''}</small></div>
  </header>
  <div className="agBody">
   <div className="agMessage"><span className="agEyebrow">{four?'FOUR POSES · ONE KEEPSAKE':'YOUR EVENT KEEPSAKE'}</span><h1>Your photo<br className="agDesktopBreak"/> is ready.</h1><p>{four?'Four poses, one finished 4×6 photo.':'Your finished 4×6 photo.'} Print it or send a digital copy.</p><span className="agAccentRule" aria-hidden="true"/></div>
   <div className="agPhotoStage"><div className="agPaperWrap" aria-label="Approved finished 4 by 6 photo">
    {prepared?<img data-testid="approved-finished-jpeg" src={prepared.dataUrl} alt={'Finished approved '+(four?'four-photo':'single-photo')+' keepsake for '+(cfg.title||'this event')}/>:<div className="agPreparing" role="status">{exportError||'Preparing your finished photo…'}</div>}
   </div></div>
  </div>
  <div className="agNotices">
  <p className="agSaved" data-testid="approved-gallery-status">{archiveBusy?'Saving your photo…':archiveError?'Please ask the attendant for help saving this photo.':archived?'✓ Your photo is saved':prepared&&!onArchive?'Ready to print or send':prepared?'Saving your photo…':'Preparing your photo…'}</p>
  {(archiveError||status||exportError)&&<p className={'agStatus'+(archiveError||exportError?' agWarning':'')} role={archiveError||exportError?'alert':'status'}>{archiveError||exportError||status}{archiveError&&prepared&&<><button type="button" data-testid="approved-retry-save" disabled={busy} onClick={()=>setArchiveRetry(n=>n+1)}>Retry saving</button><button type="button" disabled={busy} onClick={saveRecovery}>Save recovery JPEG</button></>}{exportError&&<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry photo</button>}</p>}
  {(exportError||archiveError)&&onOperator&&<div className="agErrorHelp"><span>Your photo stays here while staff helps.</span><button type="button" data-testid="approved-error-staff" disabled={busy} onClick={()=>setStaffPrompt(true)}>Staff tools</button></div>}
  {printRequested&&<div className="agPrintRecovery"><span>Only retry if you canceled or no sheet printed.</span><button type="button" data-testid="approved-retry-print" disabled={busy} onClick={retryPrint}>Retry print</button></div>}
  </div>
  <footer className="agDock" aria-label="Finished photo actions">
   {packageRules.printingEnabled&&<button type="button" className="agButton agPrint" data-testid="approved-print" onClick={printNow} disabled={!printAllowed}><ActionIcon name="print"/><span>{printing?'Opening print…':printRequested?'Print requested':remaining<=0?'Print limit reached':'Print'}</span></button>}
   <button type="button" className="agButton agShare" data-testid="approved-digital-copy" onClick={()=>{setStatus('');setSharing(true);}} disabled={!prepared||busy}><ActionIcon name="send"/><span>Send</span></button>
   <button type="button" className="agButton agDone" data-testid="approved-done" onClick={onFinish} disabled={!prepared||busy||(onArchive&&!archived&&!recoverySaved)}><ActionIcon name="done"/><span>Done</span></button>
  </footer>
  <div className="photoPane ksPrintOnly" aria-hidden="true">{prepared&&<img className="ksExactPrintImage" src={prepared.dataUrl} alt=""/>}</div>
  {sharing&&<StudioDialog title="Send your photo." busy={busy} onClose={()=>setSharing(false)}>
   <div className="agDigitalCopy"><p>Send or save this finished photo.</p>
    {!cfg.runtime?.demo&&<DeliveryPanel photo={prepared?.dataUrl||null} title={cfg.title} artwork inline onBusyChange={setDeliveryBusy}/>}
    <button type="button" className="agButton agPrint" data-testid="approved-share-photo" disabled={!prepared||busy} onClick={share}>Share to another device</button>
    <button type="button" className="agButton agShare" data-testid="approved-download-photo" disabled={!prepared||busy} onClick={download}>Save photo</button>
    <small>Share opens this device’s sharing options. Save downloads the photo to this device.</small>
    {status&&<p role="status">{status}</p>}
   </div>
  </StudioDialog>}
  {staffPrompt&&<StaffAccessGate onClose={()=>setStaffPrompt(false)} onConfirm={()=>{setStaffPrompt(false);onOperator?.();}}/>}
 </section>;
}

function ActionIcon({name}){
 return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name==='print'?<><path d="M7 8V3h10v5M7 17H4a1 1 0 01-1-1v-5a3 3 0 013-3h12a3 3 0 013 3v5a1 1 0 01-1 1h-3"/><path d="M7 14h10v7H7zM17 11h.01"/></>:name==='send'?<><path d="M12 15V3M7 8l5-5 5 5"/><path d="M6 10H4v11h16V10h-2"/></>:<path d="m5 12 4 4L19 6"/>}</svg>;
}
