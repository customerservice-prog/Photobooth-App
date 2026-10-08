import Link from 'next/link';
import {dateLabel,readiness,statusText,experienceFrom} from '../lib/studio-experience.mjs';
export function PageHeader({eyebrow,title,subtitle,children}){
 return <header className="pageHeader"><div className="pageHeroMain"><div className="eyebrow">{eyebrow}</div><h1 className="title">{title}</h1>{subtitle&&<p className="pageSubtitle">{subtitle}</p>}</div>{children&&<div className="buttonRow">{children}</div>}</header>;
}
export function SectionHeading({eyebrow,title,subtitle,children}){
 return <header className="sectionHeader"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2 className="sectionTitle">{title}</h2>{subtitle&&<p className="sectionLead">{subtitle}</p>}</div>{children}</header>;
}
export function StateTag({ready,status}){
 const value=ready===true?'Ready':ready===false?'Needs setup':statusText(status);
 const variant=ready===true?'':ready===false?' warning':['NEEDS_SETUP','DRAFT'].includes(status)?' warning':['ARCHIVED','COMPLETED'].includes(status)?' neutral':'';
 return <span className={'statusChip'+variant}>{value}</span>;
}
export function Metric({label,value,foot}){return <div className="metric"><span className="metricLabel">{label}</span><strong className="metricValue">{value}</strong>{foot&&<small className="metricFoot">{foot}</small>}</div>}
export function DateBlock({date}){const [m,d]=dateLabel(date).split(' ');return <span className="dateBlock"><strong>{String(d||'').replace(',','')}</strong><small>{m}</small></span>}
export function EventTile({event}){
 const setup=readiness(event);
 return <article className="eventTile"><DateBlock date={event.date}/><div className="eventTileDetails"><Link href={'/events/'+event.id} className="rowTitle">{event.name}</Link><div className="rowSubtitle">{event.customer?.name||'Customer not selected'} · {event.venueName||'Venue not entered'} · {dateLabel(event.date)}</div><div style={{marginTop:8}}><StateTag ready={setup.ready}/></div></div><div className="eventTileActions"><Link className="btn btn2 btnSm" href={'/events/'+event.id}>Open event →</Link>{!setup.ready&&<Link className="btn btnSm" href={'/events/'+event.id+'/edit#'+setup.next?.href}>Finish setup</Link>}</div></article>;
}
export function ProgressCard({event,compact=false}){
 const p=readiness(event);
 return <section className="card cardPad"><div className="sectionHeader"><div><div className="eyebrow">EVENT CHECKLIST</div><h2 className="sectionTitle">{p.ready?'Core setup complete':'What still needs doing?'}</h2><p className="sectionLead">{p.complete} of {p.total} event details complete</p></div><StateTag ready={p.ready}/></div><div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.complete} aria-label="Event setup complete"><span style={{width:p.complete/p.total*100+'%'}}/></div><div className="stepList">{p.checks.map(step=><Link key={step.id} className="stepItem" href={'/events/'+event.id+'/edit#'+step.href}><span className={'stepIcon'+(step.ready?'':' todo')} aria-hidden="true">{step.ready?'✓':'!'}</span><span className="stepItemBody"><strong>{step.title}</strong>{!step.ready&&<small>Tap to add this information</small>}</span><span className="stepArrow" aria-hidden="true">→</span></Link>)}</div>{p.ready?<p className="helpNote"><strong>Core event details are ready.</strong> Still test the actual camera and Canon printer before guests arrive.</p>:<Link className="btn" href={'/events/'+event.id+'/edit#'+p.next.href}>{compact?'Finish setup →':'Continue setup →'}</Link>}</section>;
}
export function ExperienceSummary({event}){
 const e=experienceFrom(event);
 return <div className="keyValue">
  <div><small>Featured guest choice</small><strong>{e.featured==='one'?'1 Photo':'4 Photos'} (both available)</strong></div>
  <div><small>Pose break</small><strong>{e.pauseSeconds} seconds between photos</strong></div>
  <div><small>Default print format</small><strong>{e.format==='strip'?'Photo Strip':'4×6 Card'}</strong></div>
  <div><small>Strips on one sheet</small><strong>{e.strips} {e.strips===1?'strip':'matching strips'}</strong></div>
  <div><small>Photo framing</small><strong>{e.photoFit==='fill'?'Fill each frame':'Show whole photo'}</strong></div>
  <div><small>Event colors</small><strong><span style={{display:'inline-flex',width:32,height:12,borderRadius:4,overflow:'hidden',verticalAlign:'middle',marginRight:7}}><i style={{flex:1,background:e.primary}}/><i style={{flex:1,background:e.accent}}/></span>{e.paletteId.replaceAll('-',' ')}</strong></div>
 </div>;
}
export function DatabaseError({topic='information'}){return <div className="errorNote" role="alert"><strong>Couldn’t load {topic}.</strong> This is a data connection issue, not proof that there are no records. Check the admin database connection and retry.</div>;}
export function EmptyState({title,description,href,label}){return <div className="emptyState"><span aria-hidden="true" style={{fontSize:27,color:'#b08e55'}}>✦</span><h2>{title}</h2><p>{description}</p>{href&&<Link className="btn" href={href}>{label||'Get started →'}</Link>}</div>}
