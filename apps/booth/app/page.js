'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import PhotoPreview from './components/PhotoPreview';
import GuestReadyPreview from './components/GuestReadyPreview';
import WelcomeScreen from './components/WelcomeScreen';
import StaffDashboard from './components/StaffDashboard';
import PhotoCapture from './components/PhotoCapture';
import {runPhotoSequence,takeFreshPhoto,waitForPose} from './lib/photo-sequence.mjs';
import {playPhotoCue,preparePhotoAudio,speakCue,stopTalking} from './lib/photo-voice.mjs';
import {normalizeGuestPause,waitForGuestReady} from './lib/guest-pause.mjs';
import {normalizeEventConfig} from './lib/event-config.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from './lib/print-package.mjs';
import {composePhotoStrip} from './lib/photo-strip.mjs';
import {workspace,readEventDraft,saveEventDraft,usage,ownPrintUsage,readyForEvent} from './lib/event-workspace.mjs';
import {saveCapture,saveKeepsake,archiveCount,recentCaptures,openArchive,capturePoses} from './lib/event-photo-archive.mjs';
import {createScreenAwakeController,readScreenAwakeSetting,saveScreenAwakeSetting} from './lib/screen-awake.mjs';
import {activeEventDestination} from './lib/active-event.mjs';
import {backupEnabled,saveBackupToken,syncEventPhotos} from './lib/backup-sync.mjs';
import {logPrintRequest,markPrintOutcome} from './lib/print-ledger.mjs';
import './event-prep/preparation.css';
const RESET_MS=90000;
const defaultCfg={title:'Our Celebration',subtitle:'Friendly Photo Booth',date:new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),type:'other',printPackage:normalizePrintPackage()};
const bryanCfg={title:'Bryan Wedding',subtitle:'A Wedding Celebration',date:'September 19, 2026',type:'wedding'};
const eventTypes={
  wedding:{name:'Wedding'},birthday:{name:'Birthday'},mitzvah:{name:'Bar / Bat Mitzvah'},graduation:{name:'Graduation'},corporate:{name:'Corporate Event'},other:{name:'Celebration'}
};
const filters={original:'none',glam:'brightness(1.08) contrast(.96) saturate(.88)',bw:'grayscale(1) contrast(1.08) brightness(1.04)',warm:'sepia(.18) saturate(.92) brightness(1.03)'};
export default function Booth(){
  const [scope,setScope]=useState(workspace()),[initialized,setInitialized]=useState(false);
  const {config:CFG,photos:STORE,usage:PRINT_USAGE}=scope;
  const[step,setStep]=useState('welcome'),[photo,setPhoto]=useState(null),[poses,setPoses]=useState([]),[error,setError]=useState(''),[online,setOnline]=useState(true),[saved,setSaved]=useState(0),[operator,setOperator]=useState(false),[printing,setPrinting]=useState(false),[cfg,setCfg]=useState(defaultCfg),[gallery,setGallery]=useState([]),[filter,setFilter]=useState('original'),[template,setTemplate]=useState('ivory'),[installOpen,setInstallOpen]=useState(false),[installed,setInstalled]=useState(false),[editing,setEditing]=useState(false),[starting,setStarting]=useState(false),[previewActive,setPreviewActive]=useState(false),[capture,setCapture]=useState({phase:'ready',current:1,total:4,completed:0,shots:[]}),[sessionShots,setSessionShots]=useState(4),[printsUsed,setPrintsUsed]=useState(0),[voiceStatus,setVoiceStatus]=useState('idle');
  const video=useRef(null),stream=useRef(null),timer=useRef(null),startGuard=useRef(false),run=useRef(0),printCleanup=useRef(()=>{}),captureId=useRef(null),printGuard=useRef(false),latestPrintRequest=useRef(null),captureAbort=useRef(null),capturePhase=useRef('ready'),resumeGuestPause=useRef(null);
  // The staff preference is per iPad, not per guest or transferred event.
  // Keeping the display awake is best-effort; iPad Guided Access is the OS lock.
  const [backupStatus,setBackupStatus]=useState('not-enabled');
  const [keepScreenAwake,setKeepScreenAwake]=useState(true);
  const [screenAwakeStatus,setScreenAwakeStatus]=useState('requesting');
  const screenAwakeController=useRef(null);
  useEffect(()=>{
    const wanted=readScreenAwakeSetting(localStorage);
    setKeepScreenAwake(wanted);
    const controller=createScreenAwakeController({doc:document,win:window,nav:navigator,onStatus:setScreenAwakeStatus});
    screenAwakeController.current=controller;
    controller.start(wanted);
    return()=>{screenAwakeController.current=null;controller.stop();};
  },[]);
  function changeKeepScreenAwake(next){
    setKeepScreenAwake(next);
    screenAwakeController.current?.setEnabled(next);
    if(!saveScreenAwakeSetting(localStorage,next))
      setError('This iPad could not remember the screen setting. Check storage before the event.');
  }
  function retryScreenAwake(){void screenAwakeController.current?.retry();}
  useEffect(()=>{
    let active=true;
    setOnline(navigator.onLine);setInstalled(navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches===true);
    const f=()=>setOnline(navigator.onLine);addEventListener('online',f);addEventListener('offline',f);
    async function load(){try{
      const params=new URLSearchParams(window.location.search);
      if(!params.has('booth_event')&&!params.has('event')){
        const assigned=activeEventDestination(localStorage);
        if(assigned){window.location.replace(assigned);return;}
      }
      const target=workspace(window.location.search);setScope(target);
      const c=target.managed?readEventDraft(localStorage):JSON.parse(localStorage.getItem(target.config)||'null');
      if(target.imported&&!c)throw new Error('This event has not been loaded on this iPad. Scan its Send to Booth QR code from the staff dashboard.');
      if(target.managed&&!target.demo&&!readyForEvent(c)){window.location.replace('/event-prep');return;}
      const used=usage(localStorage,target);setPrintsUsed(used);
      if(c&&typeof c==='object'){
        setCfg(normalizeEventConfig({...defaultCfg,...c,printPackage:normalizePrintPackage(c.printPackage),runtime:(target.managed||target.imported)?{demo:target.demo,setup:target.setup}:undefined,type:Object.hasOwn(eventTypes,c.type)?c.type:(c.title==='Bryan Wedding'?'wedding':'other')}));
        if(['ivory','blush','champagne'].includes(c.defaultTemplate)||(c.type==='graduation'&&c.defaultTemplate==='grad-gala'))setTemplate(c.defaultTemplate);
      }
      if(target.managed||target.imported){
        // A demo, a transferred event and a real October event never share data.
        if(target.managed&&localStorage.getItem(target.config)===null)saveEventDraft(localStorage,c);
        if(localStorage.getItem(target.usage)===null)localStorage.setItem(target.usage,String(ownPrintUsage(localStorage,target)));
        const db=await openArchive();db.close();
        const [n,recent]=await Promise.all([archiveCount(target.archive),recentCaptures(target.archive)]);
        if(active){setSaved(n);setGallery(recent);}
      }else{const a=JSON.parse(localStorage.getItem(target.photos)||'[]');if(Array.isArray(a)){setSaved(a.length);setGallery(a);}}
      if(active)setInitialized(true);
    }catch(e){if(active)setError(e.message||'Saved settings could not be read. No photos or counters were reset.');}}
    load();
    return()=>{active=false;removeEventListener('online',f);removeEventListener('offline',f);clearTimeout(timer.current);printCleanup.current();captureAbort.current?.abort();stopTalking();run.current++;stopCamera();};
  },[]);
  useEffect(()=>{
    clearTimeout(timer.current);
    if(step!=='preview'||editing||operator||printing||previewActive)return;
    const arm=()=>{clearTimeout(timer.current);timer.current=setTimeout(reset,RESET_MS)};
    arm();addEventListener('pointerdown',arm);addEventListener('keydown',arm);
    return()=>{clearTimeout(timer.current);removeEventListener('pointerdown',arm);removeEventListener('keydown',arm)};
  },[step,editing,operator,printing,previewActive]);
  const archiveArtifact=useCallback(async artifact=>{if((scope.managed||scope.imported)&&captureId.current)await saveKeepsake(scope.archive,captureId.current,artifact.blob);},[scope.managed,scope.imported,scope.archive]);
  async function waitForVideo(s){for(let i=0;i<50;i++){if(stream.current!==s)return false;const v=video.current;if(v){if(v.srcObject!==s)v.srcObject=s;v.play().catch(()=>{});if(v.videoWidth>0&&v.readyState>=2)return true}await new Promise(r=>setTimeout(r,80))}return false}
  useEffect(()=>{
    const stopHidden=()=>{if(document.visibilityState==='hidden'&&captureAbort.current&&!['processing','done'].includes(capturePhase.current)){cancelCapture('Photo session stopped when the booth went into the background. Tap Take a Photo to start again.');}};
    document.addEventListener('visibilitychange',stopHidden);return()=>document.removeEventListener('visibilitychange',stopHidden);
  },[]);
  async function begin(total=4){
    if(startGuard.current||!initialized)return;if(![1,4].includes(total))total=4;startGuard.current=true;setStarting(true);setSessionShots(total);stopTalking();const id=++run.current;
    captureAbort.current?.abort();const controller=new AbortController();captureAbort.current=controller;capturePhase.current='ready';
    setCapture({phase:'ready',current:1,total,completed:0,shots:[]});
    setError('');setFilter('original');setTemplate(cfg.defaultTemplate||'ivory');setPhoto(null);setPoses([]);setEditing(false);stopCamera();captureId.current=null;
    try{
      // Audio starts on the guest tap, but cannot delay or prevent camera access.
      // Use the cheerful recorded voice when it succeeds; otherwise show the
      // same 3–2–1–Smile visual countdown and still capture every photograph.
      let audioReady=false;
      setVoiceStatus('starting');
      const audioPromise=preparePhotoAudio({playConfirmation:false}).then(()=>{
        if(id===run.current&&!controller.signal.aborted&&capturePhase.current!=='done'){
          audioReady=true;setVoiceStatus('playing');
        }
      },()=>{
        if(id===run.current&&!controller.signal.aborted&&capturePhase.current!=='done')
          setVoiceStatus('unavailable');
      });
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:false});
      if(id!==run.current||controller.signal.aborted){s.getTracks().forEach(t=>t.stop());return;}
      stream.current=s;setStep('camera');const ready=await waitForVideo(s);
      if(id!==run.current||stream.current!==s)return;
      if(!ready)throw new Error('Camera was not ready. Allow camera access, then try again.');
      // Wait at most one second for optional audio. No network/audio failure
      // can hold the camera or the guest hostage.
      await Promise.race([audioPromise,waitForPose(1000,controller.signal)]);
      if(!audioReady)setVoiceStatus('unavailable');
      await waitForPose(250,controller.signal);setStep('photoSeries');
      const shots=await runPhotoSequence({total,signal:controller.signal,pauseSeconds:normalizeGuestPause(cfg.photoPauseSeconds),
        onPause:({seconds,signal,onTick})=>waitForGuestReady({seconds,signal,onTick,registerReady:ready=>{resumeGuestPause.current=ready;}}),
        capture:options=>takeFreshPhoto(video.current,options),
        onProgress:next=>{if(id===run.current){capturePhase.current=next.phase;setCapture(next);}},
        onCue:cue=>{
          if(id!==run.current)return 0;
          if(audioReady){
            try{const duration=playPhotoCue(cue);if(duration)return duration;}catch{}
            audioReady=false;setVoiceStatus('unavailable');
          }
          // Speak through iPad text-to-speech if recorded clips fail.
          // The on-screen countdown remains authoritative if sound is muted.
          speakCue(cue);return 0;
        }
      });
      stopTalking();const data=total===1?shots[0]:await composePhotoStrip(shots,cfg);if(id!==run.current)return;
      stopCamera();await save(data,shots);if(id!==run.current)return;
      capturePhase.current='done';setPoses(shots);setPhoto(data);setCapture({phase:'ready',current:1,total:shots.length,completed:0,shots:[]});setStep('preview');
    }catch(e){
      if(id!==run.current||controller.signal.aborted)return;
      controller.abort();stopTalking();stopCamera();setCapture({phase:'ready',current:1,total:4,completed:0,shots:[]});
      setError(e.name==='NotAllowedError'?'Camera unavailable. Allow camera access for this booth, then try again.':e.message||'The photo session could not finish. Please try again.');setStep('welcome');
    }finally{if(id===run.current){captureAbort.current=null;startGuard.current=false;setStarting(false);}}
  }
  function readyForNextPhoto(){resumeGuestPause.current?.();}
  function cancelCapture(message=''){
    captureAbort.current?.abort();captureAbort.current=null;stopTalking();run.current++;stopCamera();startGuard.current=false;setStarting(false);captureId.current=null;capturePhase.current='ready';
    setCapture({phase:'ready',current:1,total:4,completed:0,shots:[]});setPhoto(null);setPoses([]);setError(message);setStep('welcome');
  }
  function captureFail(){setError('Camera was not ready. Please try again.');stopCamera();setStep('welcome')}
  async function save(data,shots){
    const id=crypto.randomUUID();captureId.current=id;
    if(scope.managed||scope.imported){try{await saveCapture(scope.archive,id,data,shots,cfg);setSaved(n=>n+1);setGallery(old=>[{id,createdAt:new Date().toISOString(),data},...old].slice(0,8));}catch{setError('Photo captured, but the event archive could not save it. Download this photo now and ask staff to check storage before continuing.');}return;}
    try{let a=JSON.parse(localStorage.getItem(STORE)||'[]');a.unshift({id,createdAt:new Date().toISOString(),data});a=a.slice(0,20);localStorage.setItem(STORE,JSON.stringify(a));setSaved(a.length);setGallery(a)}catch{setError('Photo captured, but the local backup could not be saved. Please save this photo before leaving.')}
  }
  function persistConfig(next){try{const plain={...next};delete plain.runtime;if(scope.managed){plain.preparation={...plain.preparation,checks:{},colorsConfirmed:false};saveEventDraft(localStorage,plain);}else localStorage.setItem(CFG,JSON.stringify(plain));setCfg({...plain,runtime:cfg.runtime});setError('');return true}catch{setError('Event details could not be saved on this device. Keep the booth open and ask the attendant for help.');return false}}
  function saveConfig(e){e.preventDefault();const f=new FormData(e.currentTarget),currentPrint=normalizePrintPackage(cfg.printPackage),next={...cfg,title:f.get('title')?.toString().trim()||defaultCfg.title,subtitle:f.get('subtitle')?.toString().trim()||defaultCfg.subtitle,date:f.get('date')?.toString().trim()||defaultCfg.date,type:f.get('type')?.toString()||'other',printPackage:normalizePrintPackage({...currentPrint,includedPrints:f.get('includedPrints'),addOnPrints:f.get('addOnPrints'),shotsPerSession:f.get('shotsPerSession')})};if(next.type!==cfg.type||next.title!==cfg.title||next.subtitle!==cfg.subtitle)next.details={...cfg.details};if(persistConfig(next))setOperator(false)}
  function loadBryan(){if(persistConfig(bryanCfg)){setOperator(false);reset()}}
  function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null}
  function retake(){setPhoto(null);begin(sessionShots)}
  function finish(){setStep('thanks')}
  useEffect(()=>{if(step!=='thanks')return;const thankTimer=setTimeout(reset,4500);return()=>clearTimeout(thankTimer);},[step]);
  function reset(){latestPrintRequest.current=null;printCleanup.current();setPreviewActive(false);captureAbort.current?.abort();captureAbort.current=null;stopTalking();startGuard.current=false;setStarting(false);run.current++;stopCamera();setPhoto(null);setPoses([]);setError('');setPrinting(false);setFilter('original');setTemplate(cfg.defaultTemplate||'ivory');setCapture({phase:'ready',current:1,total:4,completed:0,shots:[]});setSessionShots(4);setEditing(false);captureId.current=null;setStep('welcome')}
  function requestPrint(){
    if(printGuard.current||printing)return false;printGuard.current=true;
    try{const settings=normalizePrintPackage(cfg.printPackage),used=usage(localStorage,scope);if(!canPrint(settings,used,false)){setError(printsRemaining(settings,used)<=0?'The event print allowance has been reached. Digital delivery is still available.':'Printing is disabled for this event.');return false;}
      // The original October booth and its admin transfer contribute to one
      // allowance, but each increments only its own already-existing counter.
      const ownUsed=ownPrintUsage(localStorage,scope);
      localStorage.setItem(PRINT_USAGE,String(ownUsed+1));setPrintsUsed(used+1);
      if(scope.demo){
        // Demo prints are physical rehearsal sheets, but NEVER count against
        // a customer's paid event allowance. Restore the demo usage immediately.
        localStorage.setItem(PRINT_USAGE,String(ownUsed));setPrintsUsed(used);
        if(!print())return false;
        return 'demo';
      }
      if(!print()){localStorage.setItem(PRINT_USAGE,String(ownUsed));setPrintsUsed(used);return false;}try{latestPrintRequest.current=logPrintRequest(localStorage,scope).id;}catch{latestPrintRequest.current=null;setError('Print opened, but the request could not be recorded. Staff should verify the print count.');}return true;
    }catch(e){setError(e.message||'Print counter could not be saved. No print was sent.');return false;}finally{printGuard.current=false;}
  }
  function print(){if(printing)return false;clearTimeout(timer.current);setPrinting(true);let fallback;const release=()=>{clearTimeout(fallback);removeEventListener('afterprint',release);setPrinting(false);printCleanup.current=()=>{};};printCleanup.current=release;addEventListener('afterprint',release);fallback=setTimeout(release,20000);try{window.print();return true;}catch{release();setError('Print options could not open. Please try again.');return false;}}
  function resolveLatestPrint(outcome){
     if(scope.demo){printCleanup.current();return true;}
     const id=latestPrintRequest.current;
     if(!id){setError('No saved print request to confirm. Ask staff to review the print counter.');return false;}
     const ok=reviewPrint(id,outcome);
     if(ok){latestPrintRequest.current=null;printCleanup.current();}
     return ok;
   }
   function reviewPrint(id,outcome){
    try{markPrintOutcome(localStorage,scope,id,outcome);setPrintsUsed(usage(localStorage,scope));return true;}
    catch(e){setError(e.message||'Print request could not be updated.');return false;}
  }
  function testSpeaker(){preparePhotoAudio().then(()=>setVoiceStatus('playing')).catch(()=>setVoiceStatus('blocked'));}
  async function recover(p){const token=++run.current;setError('');let originals=[];try{if(scope.managed||scope.imported)originals=await capturePoses(scope.archive,p.id);}catch{setError('The original poses could not be opened. The saved card is still available; retake to create a photo strip.');}if(token!==run.current)return;captureId.current=p.id;setSessionShots(originals.length===1?1:originals.length===3?3:4);setPoses(originals);setPhoto(p.data);setOperator(false);setEditing(false);setStep('preview')}
  const eventMeta=eventTypes[cfg.type]||eventTypes.other;
  const isPreview=step==='preview',isCapturing=['camera','photoSeries'].includes(step);
  return <>{(scope.managed||scope.imported)&&<div className="workspaceBanner"><span>{scope.demo?(scope.id==='graduation-showcase'?'SHOWCASE DEMO · test printing only · paid event unchanged':'OFFICE DEMO · rehearsal only · paid event allowance unchanged'):scope.imported?'EVENT FROM STAFF · settings and photos saved on this iPad':'ACTUAL EVENT · photos saved on this device'}</span><a href={scope.imported?scope.setup:'/event-prep'}>{scope.imported?'Edit this booth setup →':'Event preparation →'}</a>{scope.linkedOctober&&<a href="/event-prep">Earlier October photos & backups →</a>}</div>}
  <main className={`booth theme-${cfg.type||'other'}${step==='welcome'?' bwWelcomeMode':''}`} data-build="smile-sequence-v1" data-capture-mode="photo" data-managed-event={scope.managed?'true':undefined}>
    {!isPreview&&!isCapturing&&step!=='welcome'&&<a className="floatingHelp" href="/help" aria-label="Photo booth help">Help</a>}
    {step==='welcome'&&<WelcomeScreen cfg={cfg} eventName={eventMeta.name} online={online} starting={starting||!initialized} installed={installed} printsUsed={printsUsed} onStartQuick={()=>begin(1)} onStartFour={()=>begin(4)} onInstall={()=>setInstallOpen(true)} onOperator={()=>setOperator(true)} voiceStatus={voiceStatus} showGraduationPreview={!scope.managed&&!scope.imported}/>}
    {isCapturing&&<PhotoCapture videoRef={video} progress={capture} onCancel={()=>cancelCapture()} onReady={readyForNextPhoto} soundStatus={voiceStatus}/>}
    {step==='preview'&&photo&&((scope.managed||scope.imported||cfg.guestMode==='approved')
    ?<GuestReadyPreview photo={photo} poses={poses} sessionShots={sessionShots} cfg={cfg} printing={printing} printPackage={normalizePrintPackage(cfg.printPackage)} printsUsed={printsUsed} onSessionActive={setPreviewActive} onPrint={requestPrint} onPrintOutcome={resolveLatestPrint} onRetake={retake} onFinish={finish} onArchive={(scope.managed||scope.imported)?archiveArtifact:undefined}/>
    :<PhotoPreview photo={photo} poses={poses} sessionShots={sessionShots} cfg={cfg} filter={filter} filters={filters} template={template} printing={printing} editing={editing} printPackage={normalizePrintPackage(cfg.printPackage)} printsUsed={printsUsed} onEdit={setEditing} onCommitEvent={persistConfig} onSessionActive={setPreviewActive} onTemplate={setTemplate} onFilter={setFilter} onPrint={requestPrint} onPrintOutcome={resolveLatestPrint} onRetake={retake} onFinish={finish} onArchive={(scope.managed||scope.imported)?archiveArtifact:undefined}/>)}
    {step==='thanks'&&<section className="screen"><div className="check">✓</div><h1 className="hero">Enjoy the celebration.</h1><p className="sub">The booth will be ready for the next guest in a moment.</p></section>}
    {error&&<div className="boothAlert" role="alert"><div className="error">{error}<button onClick={()=>setError('')} aria-label="Dismiss message">×</button></div></div>}
    {installOpen&&<div className="installPanel" role="dialog" aria-modal="true" aria-label="Install on iPad"><div className="installCard"><h2>Add Friendly Booth to your Home Screen.</h2><div className="installSteps"><div><b>1</b><span>Open this booth in Safari.</span></div><div><b>2</b><span>Open Share, then Add to Home Screen.</span></div><div><b>3</b><span>Open the new Friendly Booth icon.</span></div></div><p>This adds the web app. Device locking is a separate iPad setting.</p><button className="action primary" onClick={()=>setInstallOpen(false)}>Close instructions</button></div></div>}
    {operator&&<StaffDashboard
     onClose={()=>{setOperator(false);void fetch('/api/staff/lock',{method:'POST'}).catch(()=>{});}}
     onReset={()=>{setOperator(false);reset();void fetch('/api/staff/lock',{method:'POST'}).catch(()=>{});}}
     onVoiceTest={testSpeaker}
     onRecover={recover}
     onSaveConfig={saveConfig}
     onLoadBryan={loadBryan}
     online={online}
     saved={saved}
     installed={installed}
     managed={scope.managed}
     demo={scope.demo}
     eventScope={scope}
     remaining={printsRemaining(normalizePrintPackage(cfg.printPackage),printsUsed)}
     setupHref={scope.setup||'/setup'}
     photos={gallery}
     cfg={cfg}
     eventTypes={eventTypes}
     voiceStatus={voiceStatus}
     keepScreenAwake={keepScreenAwake}
     screenAwakeStatus={screenAwakeStatus}
     onToggleScreenAwake={changeKeepScreenAwake}
     onRetryScreenAwake={retryScreenAwake}
     onReviewPrint={reviewPrint}
    />}
  </main></>;
}