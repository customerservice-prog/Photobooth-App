'use client';
import {memo,useState} from 'react';
import PrintCard from './PrintCard';
import {guestEventConfig} from '../lib/guest-design.mjs';
import AppUpdate from './AppUpdate';
import {normalizePrintPackage,printsRemaining} from '../lib/print-package.mjs';
import {normalizeGuestPause,normalizePhotoPreference} from '../lib/guest-pause.mjs';
import {eventMonogram} from '../lib/event-config.mjs';
import {scheduleLabel} from '../lib/event-workspace.mjs';
import StaffAccessGate from './StaffAccessGate';
import './guest-first-welcome.css';
function Mark({name='camera',size=24}){
 const paths={
 camera:<><path d="M8 6l1.5-2h5L16 6h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="12" cy="13" r="4"/><path d="M18 9h.01"/></>,
 arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/></>,
 sparkle:<><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></>,
 print:<><path d="M7 8V3h10v5M7 17H4a1 1 0 01-1-1v-5a3 3 0 013-3h12a3 3 0 013 3v5a1 1 0 01-1 1h-3"/><path d="M7 14h10v7H7zM17 11h.01"/></>,
 share:<><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M12 15V2M7 7l5-5 5 5"/></>,
 settings:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></>,
 help:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 16.5h.01"/></>};
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]||paths.camera}</svg>;
}
// Show the same staff-selected artwork that guests receive after capture.
const WelcomeProof=memo(function WelcomeProof({cfg,shots}){
 const design=guestEventConfig(cfg);
 return <span className="bwLayoutPreview" aria-hidden="true" data-preview-photos={shots}><PrintCard photo="" poses={[]} layout={shots===1?'card':'photo_strip'} stripMode="single" sample cfg={design} monogram={eventMonogram(design)} template={design.defaultTemplate}/></span>;
});
export default function WelcomeScreen({cfg,eventName,online,starting,installed,printsUsed=0,onStartQuick,onStartFour,onInstall,onOperator,voiceStatus='idle',showGraduationPreview=false}){
 const [staffPrompt,setStaffPrompt]=useState(false);
 const rules=normalizePrintPackage(cfg.printPackage),available=rules.printingEnabled&&printsRemaining(rules,printsUsed)>0,title=String(cfg.title||'Our Celebration');
 const time=cfg.schedule?scheduleLabel(cfg):(cfg.details?.subtitle!==cfg.subtitle?cfg.details?.subtitle:'');
 const pause=normalizeGuestPause(cfg.photoPauseSeconds),preferred=normalizePhotoPreference(cfg.defaultPhotoExperience),approved=cfg.guestMode==='approved';
 return <div className="bwWelcome" data-welcome-version="two-keepsakes-2026-10-08" data-capture-mode="photo"><div className="bwFrame">
  <header className="bwHeader"><div className="bwBrand"><span className="bwBrandMark"><Mark size={25}/></span><span><b>FRIENDLY</b><small>PHOTO BOOTH</small></span></div><nav className="bwHeaderActions" aria-label="Staff navigation"><button type="button" className="bwStaffShortcut" data-testid="welcome-staff-tools" onClick={()=>setStaffPrompt(true)}><Mark name="settings" size={18}/><span>Staff tools</span></button></nav></header>
  <div className="bwStage"><section className="bwInvitation" aria-labelledby="bwEventTitle"><div className="bwEyebrow"><Mark name="sparkle" size={15}/> A little moment. A lovely memory.</div><h1 id="bwEventTitle" className={title.length>65?'bwLongTitle':''}>{title}</h1><div className="bwEventMeta">{cfg.date&&<span><Mark name="calendar" size={15}/>{cfg.date}</span>}{time&&<span className="bwTime">{time}</span>}</div><p className="bwGuestIntro">Pick your photos. We’ll handle the rest.</p></section>
  <section className="bwExperience" aria-label="Choose your photo session">
   <div className="bwSessionChoices">
    <button type="button" className={'bwSessionCard bwQuickSession'+(preferred==='one'?' isPreferred':'')} data-testid="welcome-quick-photo" aria-label="Take 1 photo" disabled={starting} onClick={onStartQuick}>
     <span className="bwSessionHeading"><span><small>ONE PERFECT POSE</small><strong>1 Photo</strong></span><Mark size={25}/></span>
     <WelcomeProof cfg={cfg} shots={1}/><span className="bwPreviewCaption">Your photos go here</span>
     <span className="bwSessionWords"><small>One countdown. One 4×6 keepsake.</small><span className="bwCardCTA">{starting?'Getting ready…':'Take 1 photo'} <Mark name="arrow" size={19}/></span></span>
    </button>
    <button type="button" className={'bwSessionCard bwFourSession'+(preferred==='four'?' isPreferred':'')} data-testid="welcome-four-photo" aria-label="Take 4 photos" disabled={starting} onClick={onStartFour}>
     <span className="bwSessionHeading"><span><small>MORE POSES. MORE FUN.</small><strong>4 Photos</strong></span><Mark name="sparkle" size={25}/></span>
     <WelcomeProof cfg={cfg} shots={4}/><span className="bwPreviewCaption">Your photos go here</span>
     <span className="bwSessionWords"><small>Four poses. {pause} seconds between each.</small><span className="bwCardCTA">{starting?'Getting ready…':'Take 4 photos'} <Mark name="arrow" size={19}/></span></span>
    </button>
   </div>
   <p className="bwChoiceNote"><Mark name={available?'print':'share'} size={16}/>{available?'Both choices make one 4×6 keepsake. Print it or take a digital copy.':'Digital photos are available. Ask the attendant about printing.'}</p>
  </section></div>
  <footer className="bwFooter"><span className={'bwConnection'+(online?'':' bwOffline')} role="status"><i/>{online?'Ready to capture':'Offline · booth still works'}</span><span className="bwCredit">Made with smiles · Friendly Party Rental</span><div className="bwUtilities">{!approved&&showGraduationPreview&&<a className="bwGradPreviewLink" data-testid="welcome-graduation-demo" href="/lamarr-preview">Graduation preview</a>}{!approved&&<a className="bwHelp" href="/help" aria-label="Help">Help</a>}{!approved&&<AppUpdate disabled={starting}/>} {!approved&&!installed&&<button type="button" onClick={onInstall}>Add to iPad</button>}</div></footer>
 </div>{staffPrompt&&<StaffAccessGate onClose={()=>setStaffPrompt(false)} onConfirm={()=>{setStaffPrompt(false);onOperator?.();}}/>}</div>;
}
