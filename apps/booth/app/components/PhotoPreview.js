'use client';
import PrintCard from './PrintCard';
import DeliveryPanel from './DeliveryPanel';
import {getDesigns,getDesign,EVENT_LABELS} from '../lib/keepsake-designs.mjs';

export default function PhotoPreview({photo,cfg,eventMeta,monogram,filter,filters,template,printing,share,shareStatus,editing,onEdit,onEventType,onSaveDetails,onTemplate,onFilter,onPrint,onShare,onRetake,onFinish}) {
 const type=cfg.type||'other',designs=getDesigns(type),selected=getDesign(type,template);
 return <section className="preview premiumPreview" aria-label="Photo preview">
  <div className="photoPane"><PrintCard photo={photo} cfg={cfg} monogram={monogram} template={template} filter={filters[filter]}/><div className="keepsakeLabel">{selected.name} · 4 × 6 {eventMeta.keepsake}</div></div>
  <aside className="actions studio" aria-label="Photo options">
   <header className="previewHeading"><div className="kicker">Your event. Your keepsake.</div><h2>Make it yours.</h2><p className="studioIntro">Compare the designs below. Tap your favorite to see it full-size.</p></header>
   <details className="eventCustomizer" open={editing} onToggle={e=>onEdit(e.currentTarget.open)}>
    <summary><span><strong>Event details</strong><small>{EVENT_LABELS[type]||'Celebration'} · {cfg.title}</small></span><span className="editLabel">{editing?'Close':'Edit'}</span></summary>
    <div className="customizerBody"><p className="editorNote">Set this once. Names and event details personalize all three designs and the next guests’ prints.</p><div className="optionTitle" id="event-type-title">What are we celebrating?</div>
     <div className="eventPicker" role="group" aria-labelledby="event-type-title">{Object.entries(EVENT_LABELS).map(([id,label])=><button type="button" key={id} className={'eventPick '+(type===id?'selected':'')} aria-pressed={type===id} onClick={()=>onEventType(id)}>{label}</button>)}</div>
     <form className="eventDetailForm" key={type} onSubmit={onSaveDetails}><EventFields type={type} details={cfg.details||{}}/><label>Event date<input name="date" defaultValue={cfg.date} maxLength={60} placeholder="September 21, 2026"/></label><button className="saveEventDetails primary" type="submit">Save event details</button></form>
    </div>
   </details>
   <section className="optionGroup designOptionGroup" aria-labelledby="frame-title"><div className="optionTitle" id="frame-title">Choose a print design</div><div className="designChoiceGrid" role="group" aria-labelledby="frame-title">
    {designs.map(d=><button type="button" key={d.id} aria-pressed={template===d.id} aria-label={d.name+' — '+d.description} className={'designChoice '+(template===d.id?'selected':'')} onClick={()=>onTemplate(d.id)}><PrintCard mini photo={photo} cfg={cfg} monogram={monogram} template={d.id} filter={filters[filter]}/><span className="designName">{d.name}{template===d.id&&<span aria-hidden="true">✓</span>}</span></button>)}
   </div><p className="designSelectionNote" role="status">{selected.description}. This artwork is included on the printed photo.</p></section>
   <div className="optionGroup"><div className="optionTitle" id="finish-title">Photo finish</div><div className="filterGrid" role="group" aria-labelledby="finish-title">{[['original','Original'],['glam','Soft'],['bw','B&W'],['warm','Warm']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} className={'filterChip '+(filter===id?'selected':'')} onClick={()=>onFilter(id)}>{label}</button>)}</div></div>
   <div className="guestActions"><button type="button" disabled={printing} className="action primary printBtn" onClick={onPrint}>{printing?'Opening print options…':'Print Photo'}<small>{selected.name} · 4 × 6</small></button><DeliveryPanel photo={photo} title={cfg.title}/><button type="button" className="action shareBtn" onClick={onShare}>Send / Save Original<small>Device sharing · without the print artwork</small></button>{share&&<div className="sharePanel" role="status"><p>{shareStatus||'Choose an available option in the device share sheet. Messages and Mail depend on this iPad’s setup.'}</p></div>}<div className="secondaryActions"><button type="button" onClick={onRetake}>Retake</button><button type="button" onClick={onFinish}>Done</button></div><a className="guestHelpLink" href="/help">Help with printing or sharing</a></div>
  </aside>
 </section>;
}
function Field({name,label,details,placeholder='',numeric=false}){return <label>{label}<input name={name} defaultValue={details[name]||''} placeholder={placeholder} inputMode={numeric?'numeric':undefined} maxLength={name==='age'?3:80}/></label>}
function EventFields({type,details}){
 const field=(name,label,placeholder,numeric)=><Field name={name} label={label} details={details} placeholder={placeholder} numeric={numeric}/>;
 if(type==='wedding')return <><div className="fieldGrid">{field('partner1','Partner 1 / spouse’s name','First name')}{field('partner2','Partner 2 / spouse’s name','First name')}</div>{field('venue','Venue (printed below the names)','Venue or city')}{field('theme','Setup note (optional)','For your setup notes; select artwork below')}</>;
 if(type==='birthday')return <><div className="fieldGrid">{field('honoree','Birthday person’s name','First name')}{field('age','Age on the birthday design (optional)','30',true)}</div>{field('theme','Print caption (optional)','Let’s celebrate')}</>;
 if(type==='mitzvah')return <><div className="fieldGrid">{field('honoree','Celebrant’s name','Name')}<label>Celebration<select name="mitzvahType" defaultValue={details.mitzvahType||'Bar Mitzvah'}><option>Bar Mitzvah</option><option>Bat Mitzvah</option><option>B’ Mitzvah</option><option>Mitzvah Celebration</option></select></label></div>{field('hebrewName','Hebrew name (optional)','Optional')}{field('theme','Setup note (optional)','For your setup notes')}</>;
 if(type==='graduation')return <><div className="fieldGrid">{field('graduate','Graduate’s name','Name')}{field('classYear','Class year (printed on the design)','2026',true)}</div>{field('school','School (optional)','School or university')}</>;
 if(type==='corporate')return <>{field('company','Company name','Company')}{field('eventName','Event name','Annual celebration')}{field('theme','Brand note (optional)','For your setup notes')}</>;
 return <>{field('eventName','Event name','Anniversary, shower, reunion…')}{field('honoree','Guest of honor (optional)','Name')}{field('subtitle','Print caption (optional)','Celebrating together')}</>;
}
