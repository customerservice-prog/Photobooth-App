'use client';
import {memo,useEffect,useState} from 'react';
import PrintCard from './PrintCard';
import {normalizePrintLayouts} from '../lib/print-layouts.mjs';
import AppUpdate from './AppUpdate';
import {normalizePrintPackage,printsRemaining} from '../lib/print-package.mjs';
import {eventMonogram} from '../lib/event-config.mjs';
import {scheduleLabel} from '../lib/event-workspace.mjs';
import './welcome-screen.css';
import './photo-only-welcome.css';
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
 useEffect(()=>{
  const c=document.createElement('canvas');c.width=900;c.height=900;
  const x=c.getContext('2d');if(!x)return;
  x.fillStyle='#f5efe2';x.fillRect(0,0,900,900);
  const cells=shots===3?[[24,24,852,408],[24,450,417,426],[459,450,417,426]]:[[24,24,417,417],[459,24,417,417],[24,459,417,417],[459,459,417,417]];
  cells.forEach(([left,top,w,h],i)=>{
   x.save();x.beginPath();x.rect(left,top,w,h);x.clip();
   const g=x.createLinearGradient(left,top,left+w,top+h);g.addColorStop(0,i%2===0?primary:'#c1c9b7');g.addColorStop(1,i%2===0?'#132e2a':'#697f75');x.fillStyle=g;x.fillRect(left,top,w,h);
   x.strokeStyle=secondary;x.lineWidth=1.5;x.beginPath();x.arc(left+w*.85,top+h*.15,w*.48,0,Math.PI*2);x.stroke();x.beginPath();x.arc(left+w*.12,top+h*.95,w*.5,0,Math.PI*2);x.stroke();
   x.fillStyle='rgba(255,255,255,.1)';x.beginPath();x.arc(left+w*.92,top+h*.08,w*.4,0,Math.PI*2);x.fill();
   x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fffaf0';x.font='italic 110px Georgia, serif';x.fillText(String(i+1).padStart(2,'0'),left+w/2,top+h*.47);x.font='500 19px sans-serif';x.fillText('YOUR POSE',left+w/2,top+h*.72);x.restore();
  });setSample(c.toDataURL('image/png'));return()=>{c.width=0;c.height=0;};
 },[shots,primary,secondary]);
 const view={...cfg,photoFit:'fit'};
 return <aside className="bwShowcase" aria-label="Personalized keepsake design preview"><div className="bwShowcaseTop"><span>A LITTLE MOMENT.<br/><em>A lovely keepsake.</em></span><Mark name="sparkle" size={30}/></div><div className="bwPaperStack"><div className="bwPaperBack" aria-hidden="true"/><div className="bwRealProof"><PrintCard photo={sample} layout={normalizePrintLayouts(cfg.printLayouts).defaultLayout} stripMode={normalizePrintLayouts(cfg.printLayouts).stripMode} sample cfg={view} monogram={eventMonogram(cfg)} template={cfg.defaultTemplate||'ivory'}/></div><span className="bwSeal" aria-hidden="true"><Mark name="sparkle" size={17}/><b>MADE<br/>FOR YOU</b></span></div><div className="bwProofCaption"><span className="bwProofRule"/><p>YOUR {shots} POSES. YOUR PERSONALIZED DESIGN.<small>Sample preview · your photos go here</small></p><span className="bwProofRule"/></div></aside>;
});
export default function WelcomeScreen({cfg,eventName,online,starting,installed,printsUsed=0,onStartQuick,onStartFour,onInstall,onOperator}){
 const rules=normalizePrintPackage(cfg.printPackage),available=rules.printingEnabled&&printsRemaining(rules,printsUsed)>0,title=String(cfg.title||'Our Celebration');
 const time=cfg.schedule?scheduleLabel(cfg):(cfg.details?.subtitle!==cfg.subtitle?cfg.details?.subtitle:'');
 return <div className="bwWelcome" data-welcome-version="premium-2026-10-06" data-capture-mode="photo"><div className="bwFrame">
  <header className="bwHeader"><div className="bwBrand"><span className="bwBrandMark"><Mark size={26}/></span><span><b>FRIENDLY</b><small>THE PHOTO BOOTH EXPERIENCE</small></span></div><nav className="bwHeaderActions" aria-label="Booth navigation"><a className="bwSetup" href={cfg.runtime?.setup||'/setup'}><Mark name="settings" size={17}/><span>{cfg.setupComplete?'Event setup':'Set up event'}</span></a><a className="bwHelp" href="/help"><Mark name="help" size={18}/><span>Help</span></a></nav></header>
  <div className="bwStage"><section className="bwInvitation" aria-labelledby="bwEventTitle"><div className="bwEyebrow"><span/>{eventName||'Celebration'} · You're invited to smile</div><h1 id="bwEventTitle" className={title.length>65?'bwLongTitle':''}>{title}</h1><div className="bwEventMeta">{cfg.date&&<span><Mark name="calendar" size={17}/>{cfg.date}</span>}{time&&<span className="bwTime">{time}</span>}</div><p className="bwIntro">Choose your photo experience.<br/><em>Then listen for the countdown and smile.</em></p>
  <div className="bwExperience" aria-label="Choose your photo session">
   <div className="bwSessionChoices">
    <button type="button" className="bwSessionCard bwQuickSession" data-testid="welcome-quick-photo" disabled={starting} onClick={onStartQuick}><span className="bwSessionIcon"><Mark size={27}/></span><span className="bwSessionWords"><span className="bwSessionKicker">QUICK & SIMPLE</span><strong>{starting?'Starting camera…':'1 Photo'}</strong><small>One countdown · one 4×6 keepsake · print or digital</small></span><span className="bwRoundArrow"><Mark name="arrow" size={21}/></span></button>
    <button type="button" className="bwSessionCard bwFourSession" data-testid="welcome-four-photo" disabled={starting} onClick={onStartFour}><span className="bwSessionBadge">CLASSIC BOOTH</span><span className="bwSessionIcon"><Mark name="sparkle" size={27}/></span><span className="bwSessionWords"><span className="bwSessionKicker">THE FULL EXPERIENCE</span><strong>{starting?'Starting camera…':'4 Photos'}</strong><small>Four different poses · choose 4×6 Card or Photo Strip afterward</small></span><span className="bwRoundArrow"><Mark name="arrow" size={21}/></span></button>
   </div>
  <ol className="bwPhotoSteps" aria-label="How your photo session works"><li><span className="bwStepNumber" aria-hidden="true">01</span><strong>Choose 1 or 4 photos</strong><small>Pick the experience you want</small></li><li><span className="bwStepNumber" aria-hidden="true">02</span><strong>Listen & smile</strong><small>The booth says “3, 2, 1, Smile!”</small></li><li><span className="bwStepNumber" aria-hidden="true">03</span><strong>{available?'Print or save':'Save your photos'}</strong><small>{available?'Four-photo guests can choose card or strip':'Keep a digital copy'}</small></li></ol>
  <p className="bwChoiceNote"><Mark name={available?'print':'share'} size={16}/>{available?'One photo stays a 4×6 keepsake. Four photos can become a card or classic strip.':'Digital photos are available. Ask the attendant about printing.'}</p></div></section><WelcomeProof cfg={cfg} shots={rules.shotsPerSession}/></div>
  <footer className="bwFooter"><span className={'bwConnection'+(online?'':' bwOffline')} role="status"><i/>{online?'Online':'Offline · keep booth open'}</span><span className="bwCredit">Made for your good times.<b>Friendly Party Rental</b></span><div className="bwUtilities"><AppUpdate disabled={starting}/>{!installed&&<button type="button" onClick={onInstall}>Add to iPad</button>}<button type="button" onClick={onOperator} aria-label="Operator controls (tap five times)">Staff</button></div></footer>
 </div></div>;
}
