'use client';
import {memo,useEffect,useMemo,useState} from 'react';
import PrintCard from './PrintCard';
import {guestEventConfig} from '../lib/guest-design.mjs';
import {presetById} from '../lib/fpr-print-presets.mjs';
import AppUpdate from './AppUpdate';
import {normalizePrintPackage,printsRemaining} from '../lib/print-package.mjs';
import {normalizeGuestPause,normalizePhotoPreference} from '../lib/guest-pause.mjs';
import {eventMonogram} from '../lib/event-config.mjs';
import {scheduleLabel} from '../lib/event-workspace.mjs';
import StaffAccessGate from './StaffAccessGate';
import './guest-first-welcome.css';
import './welcome-proof-redesign.css';

function Mark({name='camera',size=24}){
 const paths={
  camera:<><path d="M8 6l1.5-2h5L16 6h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="12" cy="13" r="4"/><path d="M18 9h.01"/></>,
  arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>,
  sparkle:<><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></>,
  print:<><path d="M7 8V3h10v5M7 17H4a1 1 0 01-1-1v-5a3 3 0 013-3h12a3 3 0 013 3v5a1 1 0 01-1 1h-3"/><path d="M7 14h10v7H7zM17 11h.01"/></>,
  share:<><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M12 15V2M7 7l5-5 5 5"/></>,
  settings:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,
  check:<path d="m5 12 4 4L19 6"/>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]||paths.camera}</svg>;
}

// These five locally bundled example sets show natural poses inside the
// actual event renderer. They are strictly display-only: never written to
// event settings, captures, archive, print allowance, or finished photos.
function sampleFamily(cfg){
 const design=presetById(cfg.defaultTemplate);
 if(design)return design.key;
 const type=String(cfg.type||'').toLowerCase();
 if(['graduation','wedding','birthday','corporate'].includes(type))return type;
 if(String(cfg.title||'').toLowerCase().includes('quince'))return 'quince';
 return 'birthday';
}
function useSamplePoses(family){
 const [state,setState]=useState({family:'',poses:[]});
 useEffect(()=>{
  let alive=true;
  const picture=new Image();
  picture.onload=()=>{
   if(!alive)return;
   try{
    if(picture.naturalWidth<4||picture.naturalHeight<1)throw new Error('Invalid sample artwork');
    const cellWidth=picture.naturalWidth/4,cellHeight=picture.naturalHeight;
    const canvas=document.createElement('canvas');
    canvas.width=420;canvas.height=260;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Preview canvas unavailable');
    const poses=[];
    for(let i=0;i<4;i++){
     context.clearRect(0,0,420,260);
     context.drawImage(picture,i*cellWidth,0,cellWidth,cellHeight,0,0,420,260);
     poses.push(canvas.toDataURL('image/jpeg',.80));
    }
    if(alive)setState({family,poses});
    canvas.width=0;canvas.height=0;
   }catch{if(alive)setState({family,poses:[]});}
  };
  picture.onerror=()=>{if(alive)setState({family,poses:[]});};
  picture.src='/images/welcome-poses/'+family+'-sprite.jpg';
  return()=>{alive=false;picture.onload=null;picture.onerror=null;};
 },[family]);
 return state.family===family?state.poses:[];
}

// The one full-size preview, both small layout selectors and the final JPEG
// all pass through the exact same renderKeepsake/PrintCard artwork pipeline.
const WelcomeProof=memo(function WelcomeProof({cfg,shots,poses}){
 const design=guestEventConfig(cfg),samples=Array.isArray(poses)&&poses.length===4;
 return <span className="bwLayoutPreview" data-preview-photos={shots} data-example-poses={samples?'ready':'loading'} aria-hidden="true">
  <PrintCard photo={samples?poses[0]:''} poses={samples?poses:[]} layout={shots===1?'card':'photo_strip'} stripMode="single" sample={!samples} cfg={design} monogram={eventMonogram(design)} template={design.defaultTemplate}/>
 </span>;
});

export default function WelcomeScreen({cfg,eventName,online,starting,installed,printsUsed=0,onStartQuick,onStartFour,onInstall,onOperator,voiceStatus='idle',showGraduationPreview=false,helpHref='/help'}){
 const [staffPrompt,setStaffPrompt]=useState(false);
 const preferred=normalizePhotoPreference(cfg.defaultPhotoExperience),[choice,setChoice]=useState(preferred);
 const family=sampleFamily(cfg),poses=useSamplePoses(family);
 const rules=normalizePrintPackage(cfg.printPackage),available=rules.printingEnabled&&printsRemaining(rules,printsUsed)>0;
 const title=String(cfg.title||'Our Celebration');
 const time=cfg.schedule?scheduleLabel(cfg):(cfg.details?.subtitle!==cfg.subtitle?cfg.details?.subtitle:'');
 const pause=normalizeGuestPause(cfg.photoPauseSeconds),approved=cfg.guestMode==='approved';
 const preset=presetById(cfg.defaultTemplate);
 const proofCfg=useMemo(()=>guestEventConfig(cfg),[cfg]);
 useEffect(()=>setChoice(normalizePhotoPreference(cfg.defaultPhotoExperience)),[cfg.eventId,cfg.defaultTemplate,cfg.title,cfg.defaultPhotoExperience]);
 const chosenShots=choice==='one'?1:4;
 function startSelected(){if(starting)return;if(chosenShots===1)onStartQuick();else onStartFour();}
 return <div className="bwWelcome" data-welcome-version="emerald-keepsake-2026-10-10" data-capture-mode="photo" data-selected-layout={choice}>
  <div className="bwFrame">
   <header className="bwHeader"><div className="bwBrand"><span className="bwBrandMark"><Mark size={25}/></span><span><b>FRIENDLY</b><small>PHOTO BOOTH</small></span></div><nav className="bwHeaderActions" aria-label="Staff navigation"><button type="button" className="bwStaffShortcut" data-testid="welcome-staff-tools" onClick={()=>setStaffPrompt(true)}><Mark name="settings" size={18}/><span>Staff tools</span></button></nav></header>
   <div className="bwStage">
    <section className="bwInvitation" aria-labelledby="bwEventTitle">
     <div className="bwEyebrow"><Mark name="sparkle" size={15}/> A MOMENT WORTH KEEPING</div>
     <h1 id="bwEventTitle" className={title.length>65?'bwLongTitle':''}>{title}</h1>
     <div className="bwEventMeta">{cfg.date&&<span><Mark name="calendar" size={15}/>{cfg.date}</span>}{time&&<span className="bwTime">{time}</span>}</div>
     <p className="bwGuestIntro">Choose your photos. Preview your keepsake. Strike a pose.</p>
    </section>
    <section className="bwExperience" aria-label="Choose and preview your finished photo print">
     <div className="bwSelectionPane">
      <div className="bwStep"><span>01</span> CHOOSE YOUR PHOTO LAYOUT</div>
      <h2>Choose your photos</h2>
      <p className="bwSelectionIntro">One perfect pose or four fun moments. Tap a layout to see your print.</p>
      <div className="bwSessionChoices" role="group" aria-label="Choose your photo layout">
       <button type="button" className={'bwSessionCard bwQuickSession'+(choice==='one'?' isSelected':'')} data-testid="welcome-quick-photo" aria-pressed={choice==='one'} aria-label="Preview 1-photo layout" disabled={starting} onClick={()=>setChoice('one')}>
        <span className="bwSessionHeading"><span><small>ONE PERFECT POSE</small><strong>1 Photo</strong></span><span className="bwSessionCheck"><Mark name="check" size={17}/></span></span>
        <WelcomeProof cfg={proofCfg} shots={1} poses={poses}/>
        <span className="bwPreviewCaption">One picture, one 4×6 print</span>
        <span className="bwCardCTA">{choice==='one'?'Selected':'See this layout'} <Mark name={choice==='one'?'check':'arrow'} size={16}/></span>
       </button>
       <button type="button" className={'bwSessionCard bwFourSession'+(choice==='four'?' isSelected':'')} data-testid="welcome-four-photo" aria-pressed={choice==='four'} aria-label="Preview 4-photo layout" disabled={starting} onClick={()=>setChoice('four')}>
        <span className="bwSessionHeading"><span><small>FOUR FUN POSES</small><strong>4 Photos</strong></span><span className="bwSessionCheck"><Mark name="check" size={17}/></span></span>
        <WelcomeProof cfg={proofCfg} shots={4} poses={poses}/>
        <span className="bwPreviewCaption">4 poses, one 4×6 print</span>
        <span className="bwCardCTA">{choice==='four'?'Selected':'See this layout'} <Mark name={choice==='four'?'check':'arrow'} size={16}/></span>
       </button>
      </div>
      <p className="bwChoiceNote"><Mark name={available?'print':'share'} size={17}/>{available?'4×6 printing is included. Digital copies are available.':'Digital photos and digital copies are available. Ask staff about printing.'}</p>
     </div>
     <div className="bwProofPanel" data-testid="welcome-proof-panel" aria-live="polite">
      <div className="bwProofHeading"><div className="bwStep"><span>02</span> YOUR REAL PRINT PREVIEW</div><span className="bwPaperSize"><Mark name="print" size={15}/> 4 × 6 KEEPSAKE</span></div>
      <h2>Your finished keepsake</h2>
      <p className="bwProofSub">{preset?preset.name+' artwork':'Your saved event artwork'} · {chosenShots===1?'1 photo':'4 photos'} · {cfg.date||'Event date'}</p>
      <div className="bwLargeProofStage" data-testid="welcome-large-proof" data-selected-photos={String(chosenShots)}>
       <WelcomeProof cfg={proofCfg} shots={chosenShots} poses={poses}/>
       <span className="bwProofExampleTag">{poses.length===4?'SAMPLE PHOTOS':'PHOTO AREAS'} <span>· YOUR PHOTOS REPLACE THESE</span></span>
      </div>
      <p className="bwProofAssurance"><Mark name="check" size={16}/> Your chosen design. Your photos. One beautiful keepsake.</p>
      <button type="button" className="bwStartButton" data-testid="welcome-start-session" disabled={starting} onClick={startSelected} aria-label={'Start '+chosenShots+'-photo session'}>
       <span>{starting?'Getting camera ready…':'Start '+chosenShots+' '+(chosenShots===1?'photo':'photos')}</span><Mark name="arrow" size={22}/>
      </button>
      <p className="bwPoseTip">{chosenShots===4?'Four smiles, with '+pause+' seconds between poses.':'One countdown. One perfect photo.'}</p>
     </div>
    </section>
   </div>
   <footer className="bwFooter"><span className={'bwConnection'+(online?'':' bwOffline')} role="status"><i/>{online?'Ready to capture':'Offline · booth still works'}</span><span className="bwCredit">Made with smiles · Friendly Party Rental</span><div className="bwUtilities">{!approved&&showGraduationPreview&&<a className="bwGradPreviewLink" data-testid="welcome-graduation-demo" href="/lamarr-preview">Graduation preview</a>}{!approved&&<a className="bwHelp" href={helpHref} aria-label="Help">Help</a>}{!approved&&<AppUpdate disabled={starting}/>} {!approved&&!installed&&<button type="button" onClick={onInstall}>Add to iPad</button>}</div></footer>
  </div>
  {staffPrompt&&<StaffAccessGate onClose={()=>setStaffPrompt(false)} onConfirm={()=>{setStaffPrompt(false);onOperator?.();}}/>}
 </div>;
}
