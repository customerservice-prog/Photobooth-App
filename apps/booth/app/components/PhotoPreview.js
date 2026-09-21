'use client';

// The guest's next action stays visible. Event setup is available here, but closed by default.
export default function PhotoPreview({photo,cfg,eventMeta,monogram,filter,filters,template,printing,share,shareStatus,editing,onEdit,onEventType,onSaveDetails,onTemplate,onFilter,onPrint,onShare,onRetake,onFinish}) {
  const type=cfg.type||'other';
  return <section className="preview premiumPreview" aria-label="Photo preview">
    <div className="photoPane">
      <div className={`print luxuryPrint template-${template} ${cfg.title.length>80?'titleExtraLong':cfg.title.length>44?'titleLong':''}`} data-event={type}>
        <div className="photoFrame"><img src={photo} alt="Your captured photo" style={{filter:filters[filter]}}/></div>
        <div className="printText">
          <PrintMotif type={type}/>
          <strong>{cfg.title}</strong>
          <small>{cfg.subtitle}</small>
          <span className="printDate">{cfg.date}</span>
          <span className="printMonogram">{monogram}</span>
        </div>
      </div>
      <div className="keepsakeLabel">4 × 6 · {eventMeta.keepsake}</div>
    </div>
    <aside className="actions studio" aria-label="Photo options">
      <header className="previewHeading"><div className="kicker">Your keepsake</div><h2>Your photo is ready.</h2><p className="studioIntro">Choose a frame, then print or save your photo.</p></header>
      <details className="eventCustomizer" open={editing} onToggle={e=>onEdit(e.currentTarget.open)}>
        <summary><span><strong>Event details</strong><small>{cfg.title}</small></span><span className="editLabel">{editing?'Close':'Edit'}</span></summary>
        <div className="customizerBody">
          <p className="editorNote">Set this once for your event. Saved details appear on the next guests’ keepsakes too.</p>
          <div className="optionTitle" id="event-type-title">What are we celebrating?</div>
          <div className="eventPicker" role="group" aria-labelledby="event-type-title">
            {Object.entries(EVENT_LABELS).map(([id,label])=><button type="button" key={id} className={'eventPick '+(type===id?'selected':'')} aria-pressed={type===id} onClick={()=>onEventType(id)}>{label}</button>)}
          </div>
          <form className="eventDetailForm" key={type} onSubmit={onSaveDetails}>
            <EventFields type={type} details={cfg.details||{}}/>
            <label>Event date<input name="date" defaultValue={cfg.date} maxLength={60} placeholder="September 19, 2026"/></label>
            <button className="saveEventDetails primary" type="submit">Save event details</button>
          </form>
        </div>
      </details>
      <div className="optionGroup"><div className="optionTitle" id="frame-title">Frame</div><div className="templateGrid" role="group" aria-labelledby="frame-title">
        {eventMeta.styles.map(([id,label])=><button type="button" key={id} aria-pressed={template===id} className={'templateChip '+(template===id?'selected':'')} onClick={()=>onTemplate(id)}><span className={'templateSwatch '+id} aria-hidden="true"/><span>{label}</span></button>)}
      </div></div>
      <div className="optionGroup"><div className="optionTitle" id="finish-title">Photo finish</div><div className="filterGrid" role="group" aria-labelledby="finish-title">
        {[['original','Original'],['glam','Soft'],['bw','B&W'],['warm','Warm']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} className={'filterChip '+(filter===id?'selected':'')} onClick={()=>onFilter(id)}>{label}</button>)}
      </div></div>
      <div className="guestActions">
        <button type="button" disabled={printing} className="action primary printBtn" onClick={onPrint}>{printing?'Opening print options…':'Print Photo'}<small>4 × 6 · choose copies in the print sheet</small></button>
        <button type="button" className="action shareBtn" onClick={onShare}>Send / Save<small>Device sharing · original photo</small></button>
        {share&&<div className="sharePanel" role="status"><p>{shareStatus||'Choose an available option in the device share sheet. Messages and Mail depend on this iPad’s setup.'}</p></div>}
        <div className="secondaryActions"><button type="button" onClick={onRetake}>Retake</button><button type="button" onClick={onFinish}>Done</button></div>
        <a className="guestHelpLink" href="/help">Help with printing or sharing</a>
      </div>
    </aside>
  </section>;
}

const EVENT_LABELS={wedding:'Wedding',birthday:'Birthday',mitzvah:'Bar / Bat Mitzvah',graduation:'Graduation',corporate:'Corporate',other:'Other event'};
function Field({name,label,details,placeholder='',numeric=false}){return <label>{label}<input name={name} defaultValue={details[name]||''} placeholder={placeholder} inputMode={numeric?'numeric':undefined} maxLength={name==='age'?3:80}/></label>}
function EventFields({type,details}){
  const field=(name,label,placeholder,numeric)=> <Field name={name} label={label} details={details} placeholder={placeholder} numeric={numeric}/>;
  if(type==='wedding')return <><div className="fieldGrid">{field('partner1','Partner 1 name','First name')}{field('partner2','Partner 2 name','First name')}</div>{field('venue','Venue (optional)','Venue or city')}{field('theme','Style note (optional)','For your setup notes; choose the frame below')}</>;
  if(type==='birthday')return <><div className="fieldGrid">{field('honoree','Birthday person’s name','First name')}{field('age','Age (optional)','30',true)}</div>{field('theme','Print caption (optional)','Let’s celebrate')}</>;
  if(type==='mitzvah')return <><div className="fieldGrid">{field('honoree','Celebrant’s name','Name')}<label>Celebration<select name="mitzvahType" defaultValue={details.mitzvahType||'Bar Mitzvah'}><option>Bar Mitzvah</option><option>Bat Mitzvah</option><option>B’ Mitzvah</option><option>Mitzvah Celebration</option></select></label></div>{field('hebrewName','Hebrew name (optional)','Optional')}{field('theme','Style note (optional)','For your setup notes')}</>;
  if(type==='graduation')return <><div className="fieldGrid">{field('graduate','Graduate’s name','Name')}{field('classYear','Class year (optional)','2026',true)}</div>{field('school','School (optional)','School or university')}</>;
  if(type==='corporate')return <>{field('company','Company name','Company')}{field('eventName','Event name','Annual celebration')}{field('theme','Brand note (optional)','For your setup notes')}</>;
  return <>{field('eventName','Event name','Anniversary, shower, reunion…')}{field('honoree','Guest of honor (optional)','Name')}{field('subtitle','Print caption (optional)','Celebrating together')}</>;
}

// Static, modest artwork belongs to the paper design, never a moving screen overlay.
function PrintMotif({type}){
  const common={className:'printMotif',viewBox:'0 0 72 36',fill:'none',stroke:'currentColor',strokeWidth:'1.5','aria-hidden':true};
  if(type==='wedding')return <svg {...common}><circle cx="29" cy="21" r="10"/><circle cx="43" cy="21" r="10"/><path d="m24 10 5-6 5 6M38 10l5-6 5 6"/></svg>;
  if(type==='birthday')return <svg {...common}><ellipse cx="27" cy="12" rx="7" ry="9"/><ellipse cx="44" cy="14" rx="7" ry="9"/><path d="M27 21c6 6-6 7 0 13m17-11c-6 4 5 6 0 11"/></svg>;
  if(type==='graduation')return <svg {...common}><path d="m15 13 21-9 21 9-21 9-21-9Zm9 5v8c8 5 16 5 24 0v-8m9-5v16"/></svg>;
  return <svg {...common}><path d="M14 18h16m12 0h16m-22-6 6 6-6 6-6-6 6-6Z"/></svg>;
}
