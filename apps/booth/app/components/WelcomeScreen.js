'use client';
import {memo,useEffect,useState} from 'react';
import PrintCard from './PrintCard';
import {normalizePrintLayouts} from '../lib/print-layouts.mjs';
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
const hex=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:fallback;
// Numbered samples only. Never show another guest's photos on the welcome.
const WelcomeProof=memo(function WelcomeProof({cfg,shots}){
 const [sample,setSample]=useState('');
 const primary=hex(cfg.details?.primaryColor,'#284b43'),secondary=hex(cfg.details?.secondaryColor,'#d1b583');
 const approved=cfg.guestMode==='approved';
 useEffect(()=>{
  if(approved){setSample('');return;}
  const c=document.createElement('canvas');c.width=900;c.height=900;
  const x=c.getContext('2d');if(!x)return;
  x.fillStyle='#f5efe2';x.fillRect(0,0,900,900);
  const cells=shots===1?[[24,24,852,852]]:shots===3?[[24,24,852,408],[24,450,417,426],[459,450,417,426]]:[[24,24,417,417],[459,24,417,417],[24,459,417,417],[459,459,417,417]];
  cells.forEach(([left,top,w,h],i)=>{
   x.save();x.beginPath();x.rect(left,top,w,h);x.clip();
   const g=x.createLinearGradient(left,top,left+w,top+h);g.addColorStop(0,i%2===0?primary:'#c1c9b7');g.addColorStop(1,i%2===0?'#132e2a':'#697f75');x.fillStyle=g;x.fillRect(left,top,w,h);
   x.strokeStyle=secondary;x.lineWidth=1.5;x.beginPath();x.arc(left+w*.85,top+h*.15,w*.48,0,Math.PI*2);x.stroke();x.beginPath();x.arc(left+w*.12,top+h*.95,w*.5,0,Math.PI*2);x.stroke();
   x.fillStyle='rgba(255,255,255,.1)';x.beginPath();x.arc(left+w*.92,top+h*.08,w*.4,0,Math.PI*2);x.fill();
   x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fffaf0';x.font='italic 110px Georgia, serif';x.fillText(String(i+1).padStart(2,'0'),left+w/2,top+h*.47);x.font='500 19px sans-serif';x.fillText('YOUR POSE',left+w/2,top+h*.72);x.restore();
  });setSample(c.toDataURL('image/png'));return()=>{c.width=0;c.height=0;};
 },[shots,primary,secondary,approved]);
 return <span className="bwLayoutPreview" aria-hidden="true" data-preview-photos={shots}><PrintCard photo={approved?'':sample} poses={approved?[]:undefined} layout={shots===1?'card':approved?'photo_strip':normalizePrintLayouts(cfg.printLayouts).defaultLayout} stripMode={approved?'single':normalizePrintLayouts(cfg.printLayouts).stripMode} sample cfg={cfg} monogram={eventMonogram(cfg)} template={cfg.defaultTemplate||'ivory'}/></span>;
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
