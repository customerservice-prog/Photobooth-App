'use client';
import {useEffect,useState} from 'react';
import StudioDialog from './StudioDialog';
import Icon from './StudioIcons';
import PrintCard from './PrintCard';
import PrintLayoutSettings from './PrintLayoutSettings';
import {normalizePrintLayouts,STRIP_DESIGNS} from '../lib/print-layouts.mjs';
import {normalizeGuestPause,normalizePhotoPreference,GUEST_PAUSE_OPTIONS} from '../lib/guest-pause.mjs';
import {EVENT_LABELS,getDesigns,getDesign} from '../lib/keepsake-designs.mjs';
import {composeEventConfig,switchEventDraft,eventMonogram,finalizeEventSetup} from '../lib/event-config.mjs';
import {SETUP_COLOR_STORIES,paletteSelected} from '../lib/setup-lookbook.mjs';
import {createIllustrativePreviewPhotos} from '../lib/setup-preview-art.mjs';
import './studio-experience.css';
import './event-setup-premium.css';

const icons={wedding:'heart',birthday:'birthday',mitzvah:'mitzvah',graduation:'graduation',corporate:'corporate',other:'other'};
const descriptors={wedding:'Something unforgettable',birthday:'Let the fun begin',mitzvah:'A beautiful milestone',graduation:'A moment of pride',corporate:'A signature gathering',other:'For every reason to celebrate'};
const fields={
 wedding:[['partner1','First partner’s name','Alex'],['partner2','Second partner’s name','Jordan'],['venue','Venue or location (optional)','The Garden House']],
 birthday:[['honoree','Whose birthday is it?','Taylor'],['age','Age to show (optional)','30'],['theme','Short caption (optional)','A night to remember']],
 mitzvah:[['honoree','Celebrant’s name','Sam'],['mitzvahType','Celebration',''],['hebrewName','Hebrew name (optional)','']],
 graduation:[['graduate','Graduate’s name','Morgan'],['classYear','Class year (optional)','2026'],['school','School or university (optional)','']],
 corporate:[['company','Company or organization',''],['eventName','Event name','Annual celebration']],
 other:[['eventName','What is the event called?','Anniversary celebration'],['honoree','Guest of honor (optional)',''],['subtitle','Short caption (optional)','Celebrating together']]
};

export default function EventSetup({cfg,photo='',poses=[],onSave,onClose}){
 const [draft,setDraft]=useState(cfg),[stage,setStage]=useState(0),[dirty,setDirty]=useState(false),[issue,setIssue]=useState(''),[advanced,setAdvanced]=useState(false),[illustrations,setIllustrations]=useState([]);
 const type=Object.hasOwn(EVENT_LABELS,draft.type)?draft.type:'other';
 const preference=normalizePhotoPreference(draft.defaultPhotoExperience),pause=normalizeGuestPause(draft.photoPauseSeconds);
 const settings=normalizePrintLayouts(draft.printLayouts);
 const hasCapture=Boolean(photo)||poses.length>0;
 const requiredPoses=[3,4].includes(Number(draft.printPackage?.shotsPerSession))?Number(draft.printPackage.shotsPerSession):4;
 const canShowStrip=!hasCapture||poses.length===requiredPoses;
 const format=preference==='one'||!canShowStrip?'card':settings.defaultLayout;
 useEffect(()=>{
  setIllustrations(createIllustrativePreviewPhotos(draft.details?.primaryColor,draft.details?.secondaryColor));
 },[draft.details?.primaryColor,draft.details?.secondaryColor]);
 const previewPhoto=hasCapture?photo:illustrations[0]||'';
 const previewPoses=hasCapture?poses:illustrations.slice(0,requiredPoses);
 const usePlaceholder=!hasCapture&&previewPoses.length===0;
 const designs=format==='photo_strip'?(type==='graduation'?[...STRIP_DESIGNS,getDesign('graduation','grad-gala')]:STRIP_DESIGNS):getDesigns(type);
 const activeTemplate=designs.find(d=>d.id===(draft.defaultTemplate||'ivory'))||designs[0];
 const palettes=SETUP_COLOR_STORIES;
 let preview=draft;
 try{if(dirty)preview=composeEventConfig(draft,{...draft.details,date:draft.date});}catch{}
 const designCfg={...preview,photoFit:'fill'};
 const monogram=eventMonogram(designCfg);
 function touch(mutator){setDirty(true);setIssue('');setDraft(mutator);}
 function change(name,value){touch(d=>name==='date'?{...d,date:value}:{...d,details:{...d.details,[name]:value}});}
 function chooseTemplate(id){touch(d=>({...d,defaultTemplate:id}));}
 function choosePalette(p){touch(d=>({...d,details:{...d.details,primaryColor:p.primary,secondaryColor:p.secondary}}));}
 function chooseLayout(id){
  if(!['card','photo_strip'].includes(id)||preference==='one'||!canShowStrip)return;
  if(id==='card'&&!settings.cardEnabled||id==='photo_strip'&&!settings.stripEnabled)return;
  touch(d=>({...d,printLayouts:{...normalizePrintLayouts(d.printLayouts),defaultLayout:id,stripMode:'single'}}));
 }
 function chooseStripArrangement(next){
  if(format!=='photo_strip'||!['single','double'].includes(next))return;
  touch(d=>({...d,printLayouts:{...normalizePrintLayouts(d.printLayouts),stripMode:next}}));
 }
 function save(e){
  e.preventDefault();
  try{
   const next=finalizeEventSetup(draft);
   if(onSave(next)!==false)onClose();
   else setIssue('The event could not be saved on this device. Please try again.');
  }catch(error){setIssue(error.message||'Check the event details and try again.');}
 }
 return <StudioDialog title="Make it their event." wide variant="setup" onClose={onClose}>
  <div className="ksSetupGrid ksSetupWow" data-testid="premium-event-setup">
   <section className="ksSetupForm" aria-label="Personalize your photo booth">
    <div className="ksSteps" role="group" aria-label="Setup steps">
     <button type="button" className={stage===0?'current':''} aria-current={stage===0?'step':undefined} onClick={()=>setStage(0)}><span>01</span> Occasion & experience</button>
     <span className="ksStepConnector" aria-hidden="true"/>
     <button type="button" className={stage===1?'current':''} aria-current={stage===1?'step':undefined} onClick={()=>setStage(1)}><span>02</span> Style your keepsake</button>
    </div>
    {stage===0?<div className="ksSetupStage ksWowFirstStage">
     <div className="ksSetupSectionLead ksWowLead">
      <span className="ksSetupOverline">THE LITTLE DETAILS MAKE BIG MEMORIES</span>
      <h3>Make every moment <em>extraordinary.</em></h3>
      <p>Start with the occasion. Every celebration gets its own professionally designed keepsake.</p>
     </div>
     <div className="ksEventGrid ksWowEventGrid" role="group" aria-label="What are we celebrating?">
      {Object.entries(EVENT_LABELS).map(([id,label])=><button key={id} type="button" className={type===id?'chosen':''} data-testid={'occasion-'+id} aria-pressed={type===id} onClick={()=>touch(d=>switchEventDraft(d,id))}>
       <span className="ksEventIcon"><Icon name={icons[id]}/></span>
       <span className="ksEventLabel"><strong>{label}</strong><small>{descriptors[id]}</small></span>
       <span className="ksEventSelectMark" aria-hidden="true">{type===id?'✓':'↗'}</span>
      </button>)}
     </div>
     <div className="ksSessionConfig ksWowSessionConfig" aria-label="Guest photo choices">
      <div className="ksSessionConfigHead">
       <span className="ksSetupOverline">THE PHOTO EXPERIENCE</span>
       <h4>Let them choose their moment.</h4>
       <p>Guests can always select either experience. Pick which to feature first.</p>
      </div>
      <div className="ksSessionChoiceGrid ksWowSessionGrid" role="group" aria-label="Featured guest photo experience">
       <button type="button" data-testid="setup-one-photo" aria-pressed={preference==='one'} className={preference==='one'?'isSelected':''} onClick={()=>touch(d=>({...d,defaultPhotoExperience:'one'}))}>
        <span className="ksShotArtwork ksShotArtworkOne" aria-hidden="true"><i/></span>
        <span className="ksShotDetails"><small>THE TIMELESS PORTRAIT</small><strong>1 Photo</strong><em>One perfect shot · 4×6 keepsake</em></span>
        <span className="ksShotIndicator" aria-hidden="true">{preference==='one'?'✓':'+'}</span>
       </button>
       <button type="button" data-testid="setup-four-photos" aria-pressed={preference==='four'} className={preference==='four'?'isSelected':''} onClick={()=>touch(d=>({...d,defaultPhotoExperience:'four'}))}>
        <span className="ksShotArtwork ksShotArtworkFour" aria-hidden="true"><i/><i/><i/><i/></span>
        <span className="ksShotDetails"><small>THE CLASSIC PHOTO BOOTH</small><strong>4 Photos</strong><em>Four poses · card or photo strip</em></span>
        <span className="ksShotIndicator" aria-hidden="true">{preference==='four'?'✓':'+'}</span>
       </button>
      </div>
      <label className="ksPauseSetting" htmlFor="ks-pose-pause">
       <span className="ksPauseSymbol" aria-hidden="true">Ⅱ</span>
       <span className="ksPauseCopy"><strong>Time to change poses</strong><small>Guests get a break between photos, or tap “I’m ready” to continue sooner.</small></span>
       <select id="ks-pose-pause" data-testid="setup-pause-seconds" value={pause} onChange={e=>touch(d=>({...d,photoPauseSeconds:normalizeGuestPause(e.target.value)}))} aria-label="Pause between photos">
        {GUEST_PAUSE_OPTIONS.map(n=><option key={n} value={n}>{n} seconds</option>)}
       </select>
      </label>
     </div>
     <div className="ksSetupActionRail"><span>STEP 01 / 02</span><button type="button" className="ksButton ksPrimary" onClick={()=>setStage(1)}>Next: personalize <span aria-hidden="true">→</span></button></div>
    </div>:<form className="ksSetupStage ksPersonalizeStage ksWowPersonalize" onSubmit={save}>
     <div className="ksSetupSectionLead ksWowLead">
      <span className="ksSetupOverline">A KEEPSAKE AS UNIQUE AS YOUR EVENT</span>
      <h3>Find your <em>signature style.</em></h3>
      <p>These are real print designs—not just sample pictures. Tap one to see your keepsake change instantly.</p>
     </div>
     <section className="ksLookbook" aria-label="Choose a real keepsake design">
      <div className="ksLookbookHeading"><strong>01 · Choose your design</strong><small>Every design includes your event details</small></div>
      {type==='graduation'&&<p className="ksNotice" style={{background:'#0d2851',color:'#fff2d1',border:'2px solid #f8a03a',padding:'14px 18px',borderRadius:12,margin:'9px 0'}}>For the navy, orange and gold graduation look, select <strong>Navy &amp; Gold Grad Party</strong> below. It uses your graduate's name and four real poses.</p>}
      <div className="ksLookbookGrid" role="group" aria-label="Design styles">
       {designs.map(d=><button type="button" key={d.id} className={'ksLookCard'+(activeTemplate.id===d.id?' isSelected':'')} data-testid={'setup-look-'+d.id} aria-label={'Use design '+d.name} aria-pressed={activeTemplate.id===d.id} onClick={()=>chooseTemplate(d.id)}>
        <span className="ksLookArt"><PrintCard mini sample={usePlaceholder} photo={previewPhoto} poses={previewPoses} cfg={designCfg} monogram={monogram} template={d.id} layout={format} stripMode={settings.stripMode}/></span>
        <span className="ksLookName">{d.name}</span>
        <span className="ksLookPick">{activeTemplate.id===d.id?'✓ Selected':'Choose style'}</span>
       </button>)}
      </div>
     </section>
     <section className="ksPaletteGallery" aria-label="Choose an event color palette">
      <div className="ksLookbookHeading"><strong>02 · Set the mood</strong><small>Your palette updates the actual design colors</small></div>
      <div className="ksPaletteGrid" role="group" aria-label="Event color palettes">
       {palettes.map(p=><button key={p.id} type="button" aria-pressed={paletteSelected(draft.details,p)} data-testid={'setup-palette-'+p.id} onClick={()=>choosePalette(p)}>
        <span className="ksPalettePaint" aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.secondary}}/></span>
        <span>{p.name}</span>{paletteSelected(draft.details,p)&&<b aria-label="Selected">✓</b>}
       </button>)}
      </div>
     </section>
     <div className="ksLookbookHeading ksDetailsHead"><strong>03 · Make it personal</strong><small>Names and dates go on your final print</small></div>
     <div className="ksFieldGrid">
      {fields[type].map(([name,label,placeholder])=><label key={name}>{label}{name==='mitzvahType'?
       <select name={name} value={draft.details?.[name]||'Bar Mitzvah'} onChange={e=>change(name,e.target.value)}><option>Bar Mitzvah</option><option>Bat Mitzvah</option><option>B’ Mitzvah</option><option>Mitzvah Celebration</option></select>:
       <input name={name} autoComplete="off" value={draft.details?.[name]||''} placeholder={placeholder} inputMode={['age','classYear'].includes(name)?'numeric':undefined} maxLength={name==='age'?3:name==='classYear'?4:80} onChange={e=>change(name,e.target.value)}/>}
      </label>)}
      <label>Event date<input name="date" value={draft.date||''} maxLength={60} placeholder="October 10, 2026" onChange={e=>change('date',e.target.value)}/></label>
      <label>Custom primary color<input name="primaryColor" type="color" value={draft.details?.primaryColor||'#24352f'} onChange={e=>change('primaryColor',e.target.value)}/></label>
      <label>Custom accent color<input name="secondaryColor" type="color" value={draft.details?.secondaryColor||'#d8c49b'} onChange={e=>change('secondaryColor',e.target.value)}/></label>
     </div>
     <details className="ksAdvancedDetails" open={advanced} onToggle={e=>setAdvanced(e.currentTarget.open)}>
      <summary>More print & photo-strip options <span aria-hidden="true">⌄</span></summary>
      <PrintLayoutSettings value={draft.printLayouts} onChange={value=>touch(d=>({...d,printLayouts:value}))}/>
     </details>
     {issue&&<p className="ksError" role="alert">{issue}</p>}
     <div className="ksSetupActionRail ksWowSaveRail"><button type="button" className="ksTextButton" onClick={()=>setStage(0)}>← Back to occasion</button><button className="ksButton ksPrimary" type="submit">Save event & open booth <Icon name="check" width="18"/></button></div>
     <p className="ksFine">Your setup stays on this device. Saved guest photos and print counts remain untouched.</p>
    </form>}
   </section>
   <aside className="ksSetupPreview ksWowPreview" data-preview-format={format} aria-label="Interactive keepsake preview">
    <div className="ksPreviewTop"><span className="ksEyebrow">THE KEEPSAKE STUDIO</span><span className="ksPreviewStar" aria-hidden="true">✦</span></div>
    <div className="ksPreviewFormat" role="group" aria-label="Preview the print format">
     <button type="button" data-testid="setup-preview-card" aria-pressed={format==='card'} onClick={()=>chooseLayout('card')}>4×6 Card</button>
     <button type="button" data-testid="setup-preview-strip" aria-pressed={format==='photo_strip'} disabled={preference==='one'||!settings.stripEnabled||!canShowStrip} onClick={()=>chooseLayout('photo_strip')}>Photo Strip</button>
    </div>
    {format==='photo_strip'&&<div className="ksStripArrangement" role="group" aria-label="Choose one or two photo strips">
     <button type="button" data-testid="setup-strip-single" aria-pressed={settings.stripMode==='single'} onClick={()=>chooseStripArrangement('single')}>One strip</button>
     <button type="button" data-testid="setup-strip-double" aria-pressed={settings.stripMode==='double'} onClick={()=>chooseStripArrangement('double')}>Two strips</button>
    </div>}
    <div className="ksPreviewPaper">
     <div className="ksPreviewPaperMount">
      <PrintCard photo={previewPhoto} poses={previewPoses} sample={usePlaceholder} layout={format} stripMode={settings.stripMode} cfg={designCfg} monogram={monogram} template={draft.defaultTemplate||'ivory'}/>
     </div>
     <span className="ksPreviewFoil ksPreviewFoilOne" aria-hidden="true">✧</span><span className="ksPreviewFoil ksPreviewFoilTwo" aria-hidden="true">✦</span>
    </div>
    <div className="ksPreviewBottom">
     <span className="ksPreviewDot" aria-hidden="true"/>
     <strong>{activeTemplate.name}</strong>
     <small>{hasCapture?'Preview with your captured photo':'Illustrative preview · guest photos go here'}</small>
     <span className="ksPreviewReady">✦ 4×6 PRINT-READY DESIGN</span>
    </div>
   </aside>
  </div>
 </StudioDialog>;
}
