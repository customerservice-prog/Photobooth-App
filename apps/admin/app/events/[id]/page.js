import Link from 'next/link';
import {prisma} from '../../../lib/prisma';
import {deleteEvent} from '../actions';
import {dateLabel,timeLabel,readiness,experienceFrom,BOOTH_SETUP_URL,BOOTH_PREPARATION_URL,guestHandoffMessage,statusText} from '../../../lib/studio-experience.mjs';
import {PageHeader,ProgressCard,ExperienceSummary,StateTag,DatabaseError} from '../../StudioUI';
import ConfirmDelete from '../../ConfirmDelete';
export const dynamic='force-dynamic';
const OCTOBER_EVENT='efcbaffc-893f-4361-983b-79a38e7d111a';
export default async function EventDetailPage({params}){
 let event=null,error=null;
 try{event=await prisma.event.findUnique({where:{id:params.id},include:{customer:true,booth:true,template:true}})}catch(e){error=e}
 if(error)return <main className="page"><DatabaseError topic="event details"/><Link className="btn btn2" href="/events">Back to events</Link></main>;
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><p className="muted">It may have been deleted or the link may have changed.</p><Link className="btn" href="/events">All events →</Link></main>;
 const progress=readiness(event),experience=experienceFrom(event),handoff=event.id===OCTOBER_EVENT?BOOTH_PREPARATION_URL:BOOTH_SETUP_URL;
 const deleteAction=deleteEvent.bind(null,event.id);
 return <main className="page">
  <Link className="btnPlain" style={{paddingLeft:0}} href="/events">← All events</Link>
  <PageHeader eyebrow={(event.eventType||'Event').toUpperCase()+' · '+statusText(event.status)} title={event.name} subtitle={dateLabel(event.date)+' · '+timeLabel(event.startTime)+'–'+timeLabel(event.endTime)+' · '+(event.venueName||'Venue still needed')}>
   <StateTag ready={progress.ready}/>
   <Link className="btn" href={'/events/'+event.id+'/edit'}>Edit event →</Link>
  </PageHeader>
  {!progress.ready&&<div className="warningNote" role="status" style={{marginBottom:18}}><strong>Before this event can be considered ready:</strong> {progress.next.title.toLowerCase()} needs attention. <Link href={'/events/'+event.id+'/edit#'+progress.next.href}>Complete this step →</Link></div>}
  <div className="uiGrid">
   <div className="uiStack">
    <section className="card cardPad">
     <div className="sectionHeader"><div><div className="eyebrow">EVENT DETAILS</div><h2 className="sectionTitle">The essentials</h2></div><Link className="btn btn2 btnSm" href={'/events/'+event.id+'/edit#client'}>Edit details</Link></div>
     <div className="keyValue">
      <div><small>Customer</small><strong>{event.customer?.name||'Customer missing'}</strong><span className="rowSubtitle">{event.customer?.email||'No email'} · {event.customer?.phone||'No phone'}</span></div>
      <div><small>When</small><strong>{dateLabel(event.date)}</strong><span className="rowSubtitle">{timeLabel(event.startTime)} to {timeLabel(event.endTime)}</span></div>
      <div><small>Venue</small><strong>{event.venueName||'Not entered'}</strong><span className="rowSubtitle">{event.venueAddress||'Street address needed before dispatch'}</span></div>
      <div><small>Assigned booth</small><strong>{event.booth?.name||'Choose a booth'}</strong></div>
      <div><small>Print design</small><strong>{event.template?.name||'Choose a design'}</strong></div>
      <div><small>Physical print allowance</small><strong>{event.maxPrints??108} sheets</strong><span className="rowSubtitle">One print request per guest session</span></div>
     </div>
     {event.internalNotes&&<div className="helpNote" style={{marginTop:18}}><strong>Staff notes:</strong> {event.internalNotes}</div>}
    </section>
    <section className="card cardPad">
     <div className="sectionHeader"><div><div className="eyebrow">GUEST EXPERIENCE</div><h2 className="sectionTitle">How the booth is set up</h2></div><Link href={'/events/'+event.id+'/edit#experience'} className="btn btn2 btnSm">Change choices</Link></div>
     <p className="sectionLead">Staff can feature 1 Photo or 4 Photos. Guests still have both choices. The standard four-photo experience has a pose break and can print cards or strips.</p>
     <ExperienceSummary event={event}/>
     <div className="themePreview" style={{'--primary':experience.primary,'--paper':experience.accent}}><div className="themePreviewArtwork" aria-hidden="true">✦</div><div><strong>Event colors and keepsake options</strong><p>Preview-style colors shown here are admin choices. The actual printed art is configured on the event iPad.</p><Link href={'/events/'+event.id+'/edit#style'} className="btnPlain" style={{paddingLeft:0}}>Customize colors →</Link></div></div>
    </section>
    <section className="card cardPad">
     <div className="eyebrow">BEFORE GUESTS ARRIVE</div><h2 className="sectionTitle">Apply to the iPad & test</h2>
     <p className="sectionLead">{guestHandoffMessage()}</p>
     <div className="buttonRow"><a className="btn" href={handoff} target="_blank" rel="noopener noreferrer">Open iPad event setup ↗</a><Link className="btn btn2" href="/booths">Check assigned booth →</Link></div>
     <div className="stepList" style={{marginTop:16}}>{['Match these guest and print settings on the iPad','Test one-photo and four-photo capture with the real camera','Test the cheerful speaker countdown and pose break','Make a physical Canon SELPHY 4×6 test print','Confirm the correct event names and colors on paper'].map((x,i)=><div className="stepItem" key={x}><span className="stepIcon" aria-hidden="true">{i+1}</span><span className="stepItemBody"><strong>{x}</strong></span></div>)}</div>
    </section>
   </div>
   <div className="uiStack">
    <ProgressCard event={event}/>
    <section className="card cardPad softCard">
     <div className="eyebrow">QUICK LINKS</div><h2 className="sectionTitle">Need to change something?</h2>
     <div className="stepList">
      {[
       ['Customer & venue','client'],['Photo choices & pauses','experience'],['Design & event colors','style'],['Prints & digital sharing','printing'],['Assigned booth','equipment']
      ].map(([label,id])=><Link key={id} href={'/events/'+event.id+'/edit#'+id} className="stepItem"><span className="stepItemBody"><strong>{label}</strong></span><span aria-hidden="true" className="stepArrow">→</span></Link>)}
     </div>
    </section>
   </div>
  </div>
  <details className="dangerZone"><summary>Advanced: delete event</summary><p className="sectionLead">This permanently deletes the event. Save copies of any needed information first.</p><form action={deleteAction}><ConfirmDelete name={event.name}/></form></details>
 </main>;
}
