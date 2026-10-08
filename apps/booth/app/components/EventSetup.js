'use client';
import {useState} from 'react';
import StudioDialog from './StudioDialog';
import Icon from './StudioIcons';
import PrintCard from './PrintCard';
import PrintLayoutSettings from './PrintLayoutSettings';
import {normalizePrintLayouts} from '../lib/print-layouts.mjs';
import {normalizeGuestPause,normalizePhotoPreference,GUEST_PAUSE_OPTIONS} from '../lib/guest-pause.mjs';
import {EVENT_LABELS,getDesigns} from '../lib/keepsake-designs.mjs';
import {composeEventConfig,switchEventDraft,eventMonogram,finalizeEventSetup} from '../lib/event-config.mjs';
import './studio-experience.css';
import './event-setup-premium.css';

const icons={wedding:'heart',birthday:'birthday',mitzvah:'mitzvah',graduation:'graduation',corporate:'corporate',other:'other'};
const fields={
 wedding:[['partner1','First partner’s name','Alex'],['partner2','Second partner’s name','Jordan'],['venue','Venue or location (optional)','The Garden House']],
 birthday:[['honoree','Whose birthday is it?','Taylor'],['age','Age to show (optional)','30'],['theme','Short caption (optional)','A night to remember']],
 mitzvah:[['honoree','Celebrant’s name','Sam'],['mitzvahType','Celebration',''],['hebrewName','Hebrew name (optional)','']],
 graduation:[['graduate','Graduate’s name','Morgan'],['classYear','Class year (optional)','2026'],['school','School or university (optional)','']],
 corporate:[['company','Company or organization',''],['eventName','Event name','Annual celebration']],
 other:[['eventName','What is the event called?','Anniversary celebration'],['honoree','Guest of honor (optional)',''],['subtitle','Short caption (optional)','Celebrating together']]
};
export default function EventSetup({cfg,photo='',poses=[],onSave,onClose}){
 const [draft,setDraft]=useState(cfg),[stage,setStage]=useState(0),[dirty,setDirty]=useState(false),[issue,setIssue]=useState('');
 const type=Object.hasOwn(EVENT_LABELS,draft.type)?draft.type:'other';
 const preference=normalizePhotoPreference(draft.defaultPhotoExperience);
 const pause=normalizeGuestPause(draft.photoPauseSeconds);
 const layoutSettings=normalizePrintLayouts(draft.printLayouts);
 let preview=draft;
 try{if(dirty)preview=composeEventConfig(draft,{...draft.details,date:draft.date});}catch{}
 function change(name,value){
  setDirty(true);setIssue('');
  setDraft(d=>name==='date'?{...d,date:value}:{...d,details:{...d.details,[name]:value}});
 }
 function choosePreference(next){
  setDirty(true);setIssue('');setDraft(d=>({...d,defaultPhotoExperience:next}));
 }
 function choosePause(value){
  setDirty(true);setIssue('');setDraft(d=>({...d,photoPauseSeconds:normalizeGuestPause(value)}));
 }
 function changeDesign(id){
  setDirty(true);setIssue('');setDraft(d=>({...d,defaultTemplate:id}));
 }
 function save(e){
  e.preventDefault();
  try{
   const next=finalizeEventSetup(draft);
   if(onSave(next)!==false)onClose();
   else setIssue('Event settings could not be saved on this device. Please try again.');
  }catch(error){setIssue(error.message||'Please check your event details.');}
 }
 return <StudioDialog title="Make it their event." onClose={onClose} wide variant="setup">
  <div className="ksSetupGrid" data-testid="premium-event-setup">
   <section className="ksSetupForm" aria-label="Personalize your photo booth">
    <div className="ksSteps" role="group" aria-label="Setup steps">
     <button type="button" aria-current={stage===0?'step':undefined} className={stage===0?'current':''} onClick={()=>setStage(0)}><span>01</span> Occasion & photos</button>
     <span className="ksStepConnector" aria-hidden="true"/>
     <button type="button" aria-current={stage===1?'step':undefined} className={stage===1?'current':''} onClick={()=>setStage(1)}><span>02</span> Make it yours</button>
    </div>
    {stage===0?<div className="ksSetupStage">
     <div className="ksSetupSectionLead">
      <span className="ksSetupOverline">FIRST, THE CELEBRATION</span>
      <h3>Every great photo starts with a moment.</h3>
      <p>Choose the occasion. We’ll dress up the keepsake with matching details.</p>
     </div>
     <div className="ksEventGrid" role="group" aria-label="What are we celebrating?">
      {Object.entries(EVENT_LABELS).map(([id,label])=><button key={id} type="button" aria-pressed={type===id} className={type===id?'chosen':''} onClick={()=>{setDraft(c=>switchEventDraft(c,id));setDirty(current=>current||id!==type);setIssue('');}}><span className="ksEventIcon"><Icon name={icons[id]}/></span><span className="ksEventLabel">{label}</span>{type===id&&<span className="ksSelectedCheck"><Icon name="check" width="15"/></span>}</button>)}
     </div>
     <div className="ksSessionConfig" aria-label="Guest photo choices">
      <div className="ksSessionConfigHead"><span className="ksSetupOverline">NEXT, THE PHOTO EXPERIENCE</span><h4>Give every guest their moment.</h4><p>Both options stay available. Choose which one to feature first.</p></div>
      <div className="ksSessionChoiceGrid" role="group" aria-label="Featured guest photo experience">
       <button type="button" data-testid="setup-one-photo" className={preference==='one'?'isSelected':''} aria-pressed={preference==='one'} onClick={()=>choosePreference('one')}>
        <span className="ksShotArtwork ksShotArtworkOne" aria-hidden="true"><i/></span>
        <span className="ksShotDetails"><strong>1 Photo</strong><small>Quick portrait</small><em>One countdown, one 4×6 keepsake</em></span>
        <span className="ksShotIndicator">{preference==='one'?'✓':'○'}</span>
       </button>
       <button type="button" data-testid="setup-four-photos" className={preference==='four'?'isSelected':''} aria-pressed={preference==='four'} onClick={()=>choosePreference('four')}>
        <span className="ksShotArtwork ksShotArtworkFour" aria-hidden="true"><i/><i/><i/><i/></span>
        <span className="ksShotDetails"><strong>4 Photos</strong><small>Classic photo booth</small><em>Four poses · card or photo strip</em></span>
        <span className="ksShotIndicator">{preference==='four'?'✓':'○'}</span>
       </button>
      </div>
      <label className="ksPauseSetting" htmlFor="ks-pose-pause"><span className="ksPauseSymbol" aria-hidden="true">Ⅱ</span><span className="ksPauseCopy"><strong>Breather between photos</strong><small>Guests can change their pose, then tap “I’m ready” to start sooner.</small></span>
       <select id="ks-pose-pause" data-testid="setup-pause-seconds" value={pause} onChange={e=>choosePause(e.target.value)} aria-label="Pause between photos">{GUEST_PAUSE_OPTIONS.map(n=><option key={n} value={n}>{n} seconds</option>)}</select>
      </label>
     </div>
     <div className="ksSetupActionRail"><span>01 of 02 · Your photo booth, your style</span><button type="button" className="ksButton ksPrimary" onClick={()=>setStage(1)}>Next: personalize <span aria-hidden="true">→</span></button></div>
    </div>:<form className="ksSetupStage ksPersonalizeStage" onSubmit={save}>
     <div className="ksSetupSectionLead"><span className="ksSetupOverline">THE FINISHING TOUCHES</span><h3>{type==='wedding'?'Let their love story shine.':type==='birthday'?'A birthday worth remembering.':'Make the keepsake yours.'}</h3><p>Your names, event colors and date appear on the finished card or strip.</p></div>
     <div className="ksFieldGrid">{fields[type].map(([name,label,placeholder])=><label key={name}>{label}{name==='mitzvahType'?<select name={name} value={draft.details?.[name]||'Bar Mitzvah'} onChange={e=>change(name,e.target.value)}><option>Bar Mitzvah</option><option>Bat Mitzvah</option><option>B’ Mitzvah</option><option>Mitzvah Celebration</option></select>:<input name={name} autoComplete="off" value={draft.details?.[name]||''} placeholder={placeholder} inputMode={['age','classYear'].includes(name)?'numeric':undefined} maxLength={name==='age'?3:name==='classYear'?4:80} onChange={e=>change(name,e.target.value)}/>}</label>)}
      <label>Event date<input name="date" value={draft.date||''} maxLength={60} placeholder="October 10, 2026" onChange={e=>change('date',e.target.value)}/></label>
      <label>Primary party color<input name="primaryColor" type="color" value={draft.details?.primaryColor||'#24352f'} onChange={e=>change('primaryColor',e.target.value)}/></label>
      <label>Accent color<input name="secondaryColor" type="color" value={draft.details?.secondaryColor||'#d8c49b'} onChange={e=>change('secondaryColor',e.target.value)}/></label>
     </div>
     <fieldset className="ksDefaultDesign"><legend>Starting design for guests</legend>{getDesigns(type).map(d=><label key={d.id}><input type="radio" name="default-design" value={d.id} checked={(draft.defaultTemplate||'ivory')===d.id} onChange={()=>changeDesign(d.id)}/>{d.name}</label>)}</fieldset>
     <PrintLayoutSettings value={draft.printLayouts} onChange={value=>{setDraft(c=>({...c,printLayouts:value}));setDirty(true);setIssue('');}}/>
     {issue&&<p className="ksError" role="alert">{issue}</p>}
     <div className="ksSetupActionRail"><button type="button" className="ksTextButton" onClick={()=>setStage(0)}>← Back to occasion</button><button className="ksButton ksPrimary" type="submit">Save event & open booth <Icon name="check"/></button></div>
     <p className="ksFine">Settings stay on this device. Saving does not delete any photo or reset print counts.</p>
    </form>}
   </section>
   <aside className="ksSetupPreview" aria-label="Live event keepsake preview">
    <div className="ksPreviewTop"><span className="ksEyebrow">LIVE DESIGN PREVIEW</span><span className="ksPreviewStar" aria-hidden="true">✦</span></div>
    <div className="ksPreviewPaper"><PrintCard photo={photo} poses={poses} layout={preference==='one'?'card':layoutSettings.defaultLayout} stripMode={layoutSettings.stripMode} sample={poses.length===0} cfg={preview} monogram={eventMonogram(preview)} template={draft.defaultTemplate||'ivory'}/></div>
    <div className="ksPreviewBottom"><span className="ksPreviewDot" aria-hidden="true"/> <strong>{preference==='one'?'One beautiful portrait':'Four moments, one keepsake'}</strong><small>{photo?'Preview of your captured photo':'Sample image only · guests’ photos replace it'}</small></div>
   </aside>
  </div>
 </StudioDialog>;
}
