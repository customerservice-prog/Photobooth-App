'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import PhotoPreview from './components/PhotoPreview';
import WelcomeScreen from './components/WelcomeScreen';
import {normalizeEventConfig} from './lib/event-config.mjs';
import {normalizePrintPackage,printsRemaining,canPrint} from './lib/print-package.mjs';
import {composePhotoStrip} from './lib/photo-strip.mjs';
import {workspace,readEventDraft,saveEventDraft,usage,readyForEvent} from './lib/event-workspace.mjs';
import {saveCapture,saveKeepsake,archiveCount,recentCaptures,openArchive} from './lib/event-photo-archive.mjs';
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
  const[step,setStep]=useState('welcome'),[count,setCount]=useState(3),[photo,setPhoto]=useState(null),[error,setError]=useState(''),[online,setOnline]=useState(true),[saved,setSaved]=useState(0),[operator,setOperator]=useState(false),[printing,setPrinting]=useState(false),[cfg,setCfg]=useState(defaultCfg),[gallery,setGallery]=useState([]),[filter,setFilter]=useState('original'),[template,setTemplate]=useState('ivory'),[installOpen,setInstallOpen]=useState(false),[installed,setInstalled]=useState(false),[editing,setEditing]=useState(false),[starting,setStarting]=useState(false),[previewActive,setPreviewActive]=useState(false),[shotProgress,setShotProgress]=useState({current:0,total:0}),[printsUsed,setPrintsUsed]=useState(0);
  const video=useRef(null),stream=useRef(null),timer=useRef(null),tapTimer=useRef(null),tap=useRef(0),startGuard=useRef(false),run=useRef(0),printCleanup=useRef(()=>{}),captureId=useRef(null),printGuard=useRef(false);
  useEffect(()=>{
    let active=true;
    setOnline(navigator.onLine);setInstalled(navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches===true);
    const f=()=>setOnline(navigator.onLine);addEventListener('online',f);addEventListener('offline',f);
    async function load(){try{
      const target=workspace(window.location.search);setScope(target);
      const c=target.managed?readEventDraft(localStorage):JSON.parse(localStorage.getItem(target.config)||'null');
      if(target.managed&&!target.demo&&!readyForEvent(c)){window.location.replace('/event-prep');return;}
      const used=usage(localStorage,target);setPrintsUsed(used);
      if(c&&typeof c==='object'){
        setCfg(normalizeEventConfig({...defaultCfg,...c,printPackage:normalizePrintPackage(c.printPackage),runtime:target.managed?{demo:target.demo,setup:target.setup}:undefined,type:Object.hasOwn(eventTypes,c.type)?c.type:(c.title==='Bryan Wedding'?'wedding':'other')}));
        if(['ivory','blush','champagne'].includes(c.defaultTemplate))setTemplate(c.defaultTemplate);
      }
      if(target.managed){
        // A demo and a real event never share a counter or photo archive.
        if(localStorage.getItem(target.config)===null)saveEventDraft(localStorage,c);
        if(localStorage.getItem(target.usage)===null)localStorage.setItem(target.usage,String(used));
        const db=await openArchive();db.close();
        const [n,recent]=await Promise.all([archiveCount(target.archive),recentCaptures(target.archive)]);
        if(active){setSaved(n);setGallery(recent);}
      }else{const a=JSON.parse(localStorage.getItem(target.photos)||'[]');if(Array.isArray(a)){setSaved(a.length);setGallery(a);}}
      if(active)setInitialized(true);
    }catch(e){if(active)setError(e.message||'Saved settings could not be read. No photos or counters were reset.');}}
    load();
    return()=>{active=false;removeEventListener('online',f);removeEventListener('offline',f);clearTimeout(timer.current);clearTimeout(tapTimer.current);printCleanup.current();run.current++;stopCamera();};
  },[]);
  useEffect(()=>{
    clearTimeout(timer.current);
    if(step!=='preview'||editing||operator||printing||previewActive)return;
    const arm=()=>{clearTimeout(timer.current);timer.current=setTimeout(reset,RESET_MS)};
    arm();addEventListener('pointerdown',arm);addEventListener('keydown',arm);
    return()=>{clearTimeout(timer.current);removeEventListener('pointerdown',arm);removeEventListener('keydown',arm)};
  },[step,editing,operator,printing,previewActive]);
  const archiveArtifact=useCallback(async artifact=>{if(scope.managed&&captureId.current)await saveKeepsake(scope.archive,captureId.current,artifact.blob);},[scope.managed,scope.archive]);
  async function waitForVideo(s){for(let i=0;i<50;i++){if(stream.current!==s)return false;const v=video.current;if(v){if(v.srcObject!==s)v.srcObject=s;v.play().catch(()=>{});if(v.videoWidth>0&&v.readyState>=2)return true}await new Promise(r=>setTimeout(r,80))}return false}
  async function begin(){
    if(startGuard.current||!initialized)return;startGuard.current=true;setStarting(true);const id=++run.current;
    setError('');setFilter('original');setTemplate(cfg.defaultTemplate||'ivory');setPhoto(null);setEditing(false);stopCamera();captureId.current=null;
    try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}},audio:false});if(id!==run.current){s.getTracks().forEach(t=>t.stop());return}stream.current=s;setStep('camera');const ready=await waitForVideo(s);if(stream.current!==s)return;if(!ready){captureFail();return}await new Promise(r=>setTimeout(r,350));if(stream.current===s)setStep('countdown')}
    catch{if(id===run.current){setError('Camera unavailable. Allow camera access for this booth, then try again.');setStep('welcome')}}
    finally{startGuard.current=false;setStarting(false)}
  }
  useEffect(()=>{if(step!=='countdown')return;setCount(3);let n=3;const i=setInterval(()=>{n--;if(n<=0){clearInterval(i);takePhoto()}else setCount(n)},900);return()=>clearInterval(i)},[step]);
  function captureFrame(v){const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');if(!x)throw new Error('Camera frame could not be prepared.');x.translate(c.width,0);x.scale(-1,1);x.drawImage(v,0,0);return c.toDataURL('image/jpeg',.92)}
  async function takePhoto(){
    const v=video.current;if(!v?.videoWidth){captureFail();return}
    const id=run.current,total=normalizePrintPackage(cfg.printPackage).shotsPerSession,shots=[];
    setStep('photoSeries');setShotProgress({current:0,total});
    try{
      for(let i=0;i<total;i++){
        if(i>0)await new Promise(r=>setTimeout(r,950));
        if(id!==run.current)return;
        if(!video.current?.videoWidth)throw new Error('Camera was interrupted.');
        shots.push(captureFrame(video.current));setShotProgress({current:i+1,total});
      }
      const data=await composePhotoStrip(shots,cfg);if(id!==run.current)return;
      stopCamera();await save(data,shots);if(id!==run.current)return;setPhoto(data);setStep('preview');
    }catch(e){if(id!==run.current)return;setError(e.message||'The photo strip could not be created. Please try again.');stopCamera();setStep('welcome')}
  }
  function captureFail(){setError('Camera was not ready. Please try again.');stopCamera();setStep('welcome')}
  async function save(data,shots){
    const id=crypto.randomUUID();captureId.current=id;
    if(scope.managed){try{await saveCapture(scope.archive,id,data,shots,cfg);setSaved(n=>n+1);setGallery(old=>[{id,createdAt:new Date().toISOString(),data},...old].slice(0,8));}catch{setError('Photo captured, but the event archive could not save it. Download this photo now and ask staff to check storage before continuing.');}return;}
    try{let a=JSON.parse(localStorage.getItem(STORE)||'[]');a.unshift({id,createdAt:new Date().toISOString(),data});a=a.slice(0,20);localStorage.setItem(STORE,JSON.stringify(a));setSaved(a.length);setGallery(a)}catch{setError('Photo captured, but the local backup could not be saved. Please save this photo before leaving.')}
  }
  function persistConfig(next){try{const plain={...next};delete plain.runtime;if(scope.managed){plain.preparation={...plain.preparation,checks:{},colorsConfirmed:false};saveEventDraft(localStorage,plain);}else localStorage.setItem(CFG,JSON.stringify(plain));setCfg({...plain,runtime:cfg.runtime});setError('');return true}catch{setError('Event details could not be saved on this device. Keep the booth open and ask the attendant for help.');return false}}
  function saveConfig(e){e.preventDefault();const f=new FormData(e.currentTarget),currentPrint=normalizePrintPackage(cfg.printPackage),next={...cfg,title:f.get('title')?.toString().trim()||defaultCfg.title,subtitle:f.get('subtitle')?.toString().trim()||defaultCfg.subtitle,date:f.get('date')?.toString().trim()||defaultCfg.date,type:f.get('type')?.toString()||'other',printPackage:normalizePrintPackage({...currentPrint,includedPrints:f.get('includedPrints'),addOnPrints:f.get('addOnPrints'),shotsPerSession:f.get('shotsPerSession')})};if(next.type!==cfg.type||next.title!==cfg.title||next.subtitle!==cfg.subtitle)next.details={...cfg.details};if(persistConfig(next))setOperator(false)}
  function loadBryan(){if(persistConfig(bryanCfg)){setOperator(false);reset()}}
  function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null}
  function retake(){setPhoto(null);begin()}
  function finish(){setStep('thanks')}
  useEffect(()=>{if(step!=='thanks')return;const thankTimer=setTimeout(reset,4500);return()=>clearTimeout(thankTimer);},[step]);
  function reset(){printCleanup.current();setPreviewActive(false);run.current++;stopCamera();setPhoto(null);setError('');setPrinting(false);setFilter('original');setTemplate(cfg.defaultTemplate||'ivory');setShotProgress({current:0,total:0});setEditing(false);captureId.current=null;setStep('welcome')}
  function requestPrint(){
    if(printGuard.current||printing)return false;printGuard.current=true;
    try{const settings=normalizePrintPackage(cfg.printPackage),used=usage(localStorage,scope);if(!canPrint(settings,used,false)){setError(printsRemaining(settings,used)<=0?'The event print allowance has been reached. Digital delivery is still available.':'Printing is disabled for this event.');return false;}
      localStorage.setItem(PRINT_USAGE,String(used+1));setPrintsUsed(used+1);
      if(scope.demo)return 'demo';
      if(!print()){localStorage.setItem(PRINT_USAGE,String(used));setPrintsUsed(used);return false;}return true;
    }catch(e){setError(e.message||'Print counter could not be saved. No print was sent.');return false;}finally{printGuard.current=false;}
  }
  function print(){if(printing)return false;clearTimeout(timer.current);setPrinting(true);let fallback;const release=()=>{clearTimeout(fallback);removeEventListener('afterprint',release);setPrinting(false);printCleanup.current=()=>{};};printCleanup.current=release;addEventListener('afterprint',release);fallback=setTimeout(release,120000);try{window.print();return true;}catch{release();setError('Print options could not open. Please try again.');return false;}}
  function secret(){tap.current++;clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>tap.current=0,2200);if(tap.current>=5){tap.current=0;setOperator(true)}}
  function recover(p){captureId.current=p.id;setPhoto(p.data);setOperator(false);setEditing(false);setStep('preview')}
  const eventMeta=eventTypes[cfg.type]||eventTypes.other;
  const isPreview=step==='preview';
  return <>{scope.managed&&<div className="workspaceBanner"><span>{scope.demo?'OFFICE DEMO · no physical prints · event allowance unchanged':'ACTUAL EVENT · photos saved on this device'}</span><a href="/event-prep">Event preparation →</a></div>}
  <main className={`booth theme-${cfg.type||'other'}${step==='welcome'?' bwWelcomeMode':''}`} data-build="keepsake-gallery-v3" data-capture-mode="photo" data-managed-event={scope.managed?'true':undefined}>
    {!isPreview&&step!=='welcome'&&<a className="floatingHelp" href="/help" aria-label="Photo booth help">Help</a>}
    {!isPreview&&step!=='welcome'&&<button className="operator" aria-label="Operator controls (tap five times)" onClick={secret}/>}
    {step==='welcome'&&<WelcomeScreen cfg={cfg} eventName={eventMeta.name} online={online} starting={starting||!initialized} installed={installed} printsUsed={printsUsed} onStartPhotos={begin} onInstall={()=>setInstallOpen(true)} onOperator={secret}/>}
    {['camera','countdown','photoSeries'].includes(step)&&<><video ref={video} className="camera" playsInline muted autoPlay/><div className="captureTop"><strong>{step==='photoSeries'?'Photo strip in progress':'Look at the camera'}</strong><div>{step==='photoSeries'?`Photo ${shotProgress.current} of ${shotProgress.total} · change your pose`:'Ready when you are. Smile.'}</div></div>{step==='countdown'&&<div className="count" aria-live="polite">{count}</div>}</>}
    {step==='preview'&&photo&&<PhotoPreview photo={photo} cfg={cfg} filter={filter} filters={filters} template={template} printing={printing} editing={editing} printPackage={normalizePrintPackage(cfg.printPackage)} printsUsed={printsUsed} onEdit={setEditing} onCommitEvent={persistConfig} onSessionActive={setPreviewActive} onTemplate={setTemplate} onFilter={setFilter} onPrint={requestPrint} onRetake={retake} onFinish={finish} onArchive={scope.managed?archiveArtifact:undefined}/>}
    {step==='thanks'&&<section className="screen"><div className="check">✓</div><h1 className="hero">Enjoy the celebration.</h1><p className="sub">The booth will be ready for the next guest in a moment.</p></section>}
    {error&&<div className="boothAlert" role="alert"><div className="error">{error}<button onClick={()=>setError('')} aria-label="Dismiss message">×</button></div></div>}
    {installOpen&&<div className="installPanel" role="dialog" aria-modal="true" aria-label="Install on iPad"><div className="installCard"><h2>Add Friendly Booth to your Home Screen.</h2><div className="installSteps"><div><b>1</b><span>Open this booth in Safari.</span></div><div><b>2</b><span>Open Share, then Add to Home Screen.</span></div><div><b>3</b><span>Open the new Friendly Booth icon.</span></div></div><p>This adds the web app. Device locking is a separate iPad setting.</p><button className="action primary" onClick={()=>setInstallOpen(false)}>Close instructions</button></div></div>}
    {operator&&<div className="operatorPanel" role="dialog" aria-label="Operator controls"><div className="operatorInner"><div className="kicker">Operator controls</div><h2>Event setup & recovery</h2><button className="action" onClick={()=>setOperator(false)}>Close controls</button><div className="opCard">Network: {online?'Online':'Offline'} · {scope.managed?'Archived sessions':'Recent local photos'}: {saved} · App: {installed?'Home Screen':'Browser'} · {scope.demo?'Demo requests remaining':'Print requests remaining'}: {printsRemaining(normalizePrintPackage(cfg.printPackage),printsUsed)}</div>
    <a className="action" href="/event-prep">October event preparation & photo downloads</a>
    <div className="opCard"><strong>iPad locking</strong><p>Use Apple Guided Access to keep guests in the app. This website cannot enable, disable or verify the iPad’s system lock.</p><a className="action" href="/help#guided-access">Guided Access guide</a></div>
    {!scope.managed&&<><button className="action" onClick={loadBryan}>Load Bryan Wedding test</button><form onSubmit={saveConfig} className="opCard"><label>Event type<select className="input" name="type" defaultValue={cfg.type||'other'}>{Object.entries(eventTypes).map(([id,m])=><option key={id} value={id}>{m.name}</option>)}</select></label><label>Event name<input className="input" name="title" defaultValue={cfg.title}/></label><label>Caption<input className="input" name="subtitle" defaultValue={cfg.subtitle}/></label><label>Date<input className="input" name="date" defaultValue={cfg.date}/></label><label>Included physical prints<input className="input" name="includedPrints" type="number" min="0" defaultValue={normalizePrintPackage(cfg.printPackage).includedPrints}/></label><label>Additional physical prints<input className="input" name="addOnPrints" type="number" min="0" step="54" defaultValue={normalizePrintPackage(cfg.printPackage).addOnPrints}/></label><label>Photos per guest session<select className="input" name="shotsPerSession" defaultValue={normalizePrintPackage(cfg.printPackage).shotsPerSession}><option value="3">3 photos</option><option value="4">4 photos</option></select></label><button className="action primary">Save event</button></form></>}
    <a className="action" href="/delivery-check">Text / email setup and receipt test</a><a className="action" href="/print-test">Canon test print</a><a className="action" href="/help">Help & troubleshooting</a>
    <div className="opCard"><strong>Recent photo recovery</strong><div className="recoveryGrid">{gallery.slice(0,8).map(p=><button key={p.id} onClick={()=>recover(p)}><img src={p.data} alt="Recover this capture"/></button>)}</div></div><button className="action" onClick={()=>{setOperator(false);reset()}}>Reset guest screen</button></div></div>}
  </main></>;
}
