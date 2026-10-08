import Link from 'next/link';
import {prisma} from '../../../lib/prisma';
import {deleteEvent,completeEvent,archiveEvent} from '../actions';
import {dateLabel,timeLabel,readiness,experienceFrom,BOOTH_URL,statusText} from '../../../lib/studio-experience.mjs';
import {makeBoothHandoffLink} from '../../../lib/booth-transfer.mjs';
import {PageHeader,ProgressCard,ExperienceSummary,DatabaseError,StateTag} from '../../StudioUI';
import BoothTransfer from '../../BoothTransfer';
import ConfirmDelete from '../../ConfirmDelete';
export const dynamic='force-dynamic';
const OCTOBER_EVENT='efcbaffc-893f-4361-983b-79a38e7d111a';
export default async function EventDetailPage({params}){
 let event=null,error=null;
 try{event=await prisma.event.findUnique({where:{id:params.id},include:{customer:true,booth:true,template:true}})}catch(e){error=e;}
 if(error)return <main className="page"><DatabaseError topic="event details"/><Link className="btn btn2" href="/events">Back to events</Link></main>;
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><p className="muted">It may have been deleted or the event link has changed.</p><Link href="/events" className="btn">All events →</Link></main>;
 const progress=readiness(event),e=experienceFrom(event);
 let handoff=null,handoffError='';
 try{handoff=makeBoothHandoffLink(event);}catch(err){handoffError=err.message||'This event link could not be prepared.';}
 const deleteAction=deleteEvent.bind(null,event.id),completeAction=completeEvent.bind(null,event.id),archiveAction=archiveEvent.bind(null,event.id);
 return <main className="page">
  <Link href="/events" className="btnPlain" style={{paddingLeft:0}}>← All events</Link>
  <PageHeader eyebrow="YOUR EVENT · FOUR EASY STEPS" title={event.name} subtitle={dateLabel(event.date)+' · '+timeLabel(event.startTime)+'–'+timeLabel(event.endTime)+' · '+(event.venueName||'Venue needed')}>
   <StateTag ready={progress.ready}/>
   <Link className="btn btn2" href={'/events/'+event.id+'/edit'}>Edit event →</Link>
  </PageHeader>
  <nav className="eventJourney" aria-label="Event setup steps">
   <a href={'/events/'+event.id+'/edit#client'} className={'journeyStep'+(progress.ready?' isDone':'')}>
    <span className="journeyNumber">{progress.ready?'✓':'1'}</span><span><strong>Event basics</strong><small>{progress.ready?'Details complete':progress.next?.title+' needs attention'}</small></span>
   </a>
   <a href={'/events/'+event.id+'/edit#experience'} className="journeyStep">
    <span className="journeyNumber">2</span><span><strong>Approve one look</strong><small>Set the customer design before the event</small></span>
   </a>
   <a href="#send-to-booth" className="journeyStep journeyCurrent">
    <span className="journeyNumber">3</span><span><strong>Send to Booth</strong><small>Scan once on event iPad</small></span>
   </a>
   <a href="#test-event" className="journeyStep">
    <span className="journeyNumber">4</span><span><strong>Test & Start</strong><small>Camera, voice & printer</small></span>
   </a>
  </nav>
  {!progress.ready&&<div className="warningNote eventWarning" role="status"><div><strong>Next thing to do: {progress.next?.title}.</strong><p>The event is only {progress.complete} of {progress.total} core details complete. You can load it onto the iPad for testing now, but finish this before guests arrive.</p></div><Link className="btn btn2" href={'/events/'+event.id+'/edit#'+progress.next?.href}>Finish this step →</Link></div>}
  <div className="uiGrid eventSimpleGrid">
   <div className="uiStack">
    <section className="card cardPad eventAtGlance">
     <div className="sectionHeader"><div><div className="eyebrow">STEP 1 · EVENT BASICS</div><h2 className="sectionTitle">Your event at a glance</h2></div><Link href={'/events/'+event.id+'/edit#client'} className="btn btn2 btnSm">Edit details</Link></div>
     <div className="keyValue">
      <div><small>Customer</small><strong>{event.customer?.name||'Customer needed'}</strong></div>
      <div><small>Date & time</small><strong>{dateLabel(event.date)}</strong><span className="rowSubtitle">{timeLabel(event.startTime)}–{timeLabel(event.endTime)}</span></div>
      <div><small>Location</small><strong>{event.venueName||'Venue not entered'}</strong><span className="rowSubtitle">{event.venueAddress||'Address needed'}</span></div>
      <div><small>Print allowance</small><strong>{event.maxPrints??108} sheets</strong></div>
     </div>
    </section>
    <section className="card cardPad">
     <div className="sectionHeader"><div><div className="eyebrow">STEP 2 · PERSONALIZE</div><h2 className="sectionTitle">Set the photo experience</h2></div><Link href={'/events/'+event.id+'/edit#experience'} className="btn btn2 btnSm">Customize →</Link></div>
     <div className="simpleSettingSummary">
      <div><span>Featured photo choice</span><strong>{e.featured==='one'?'1 Photo':'4 Photos'}</strong></div>
      <div><span>Pose break</span><strong>{e.pauseSeconds} seconds</strong></div>
      <div><span>Approved style</span><strong>{e.approvedDesign==='grad-gala'?'Navy & Gold Grad Party':e.approvedDesign==='ivory'?'Classic White':e.approvedDesign==='blush'?'Midnight':'Celebration'}</strong></div>
      <div><span>Photo framing</span><strong>{e.photoFit==='fit'?'Show whole photo':'Fill the frame'}</strong></div>
     </div>
     <p className="inlineInfo">Guests only choose 1 Photo or 4 Photos. Both outputs automatically use this approved style—no guest design, color or frame picker.</p>
    </section>
    <section className="card cardPad transferFeature" id="send-to-booth">
     <div className="eyebrow">STEP 3 · NO MORE DOUBLE ENTRY</div>
     <h2 className="sectionTitle">Send the event to the iPad</h2>
     <p className="sectionLead">You already entered the event settings here. <strong>Don’t type them again on the iPad.</strong> Scan the QR code with the event iPad or copy its setup link. Review and apply it there once.</p>
     {handoff?<BoothTransfer url={handoff} eventName={event.name} ready={progress.ready}/>:<div className="errorNote">{handoffError} <Link href={'/events/'+event.id+'/edit'}>Review the event →</Link></div>}
     {event.id===OCTOBER_EVENT&&<p className="inlineInfo" style={{marginTop:13}}>Your older October demo and its saved photos stay separate. Applying this admin event preserves its own photo archive and shares the October print allowance with the original entry on this iPad.</p>}
    </section>
    <section className="card cardPad" id="test-event">
     <div className="eyebrow">STEP 4 · CHECK THE REAL EQUIPMENT</div>
     <h2 className="sectionTitle">Test it, then start taking photos</h2>
     <p className="sectionLead">After applying the event on the actual iPad, follow these quick checks. They require a real device test; the admin dashboard cannot verify a physical printer.</p>
     <div className="stepList">
      {['Open your imported event on the event iPad','Play a staff-only voice sample and listen to the countdown','Take a 1 Photo session and a 4 Photos session','Print a real 4×6 Canon SELPHY test sheet','Check the event title, colors and paper output'].map((label,i)=><div key={label} className="stepItem"><span className="stepIcon">{i+1}</span><strong className="stepItemBody">{label}</strong></div>)}
     </div>
     <div className="buttonRow"><Link href={"/events/"+event.id+"/backups"} className="btn btn2">Private photo backups →</Link><a href={BOOTH_URL+'/print-test'} className="btn btn2" target="_blank" rel="noopener noreferrer">Open printer test ↗</a><a href={BOOTH_URL} className="btn btn2" target="_blank" rel="noopener noreferrer">Guest booth homepage ↗</a></div>
     <div className="noticeOnly" style={{marginTop:14}}>Authorized event iPads check for new admin settings while online. Active photo sessions are never interrupted. If automatic sync is unavailable, send a fresh event link; backups and print counts remain intact.</div>
    </section>
    <details className="card eventMoreDetails">
     <summary>More details: booth, print design, contact and notes <span aria-hidden="true">⌄</span></summary>
     <div className="cardPad">
      <div className="keyValue">
       <div><small>Customer contact</small><strong>{event.customer?.email||'No email'}</strong><span className="rowSubtitle">{event.customer?.phone||'No phone'}</span></div>
       <div><small>Assigned booth</small><strong>{event.booth?.name||'Not assigned'}</strong></div>
       <div><small>Design record</small><strong>{event.template?.name||'Not assigned'}</strong></div>
       <div><small>Recorded event status</small><strong>{statusText(event.status)}</strong></div>
      </div>
      {event.internalNotes&&<div className="helpNote" style={{marginTop:16}}><strong>Private staff notes:</strong> {event.internalNotes}</div>}
      <div style={{marginTop:20}}><h3 className="sectionTitle">Other saved photo settings</h3><ExperienceSummary event={event}/></div>
     </div>
    </details>
   </div>
   <div className="uiStack">
    <ProgressCard event={event} compact/>
    <section className="card cardPad softCard">
     <div className="eyebrow">NEED TO CHANGE SOMETHING?</div><h2 className="sectionTitle">Quick edits</h2>
     <div className="stepList">{[['Customer & venue','client'],['Booth & design','equipment'],['Photos & pose pauses','experience'],['Colors & strips','style'],['Physical print allowance','printing']].map(([label,id])=><Link href={'/events/'+event.id+'/edit#'+id} className="stepItem" key={id}><span className="stepItemBody"><strong>{label}</strong></span><span className="stepArrow" aria-hidden="true">→</span></Link>)}</div>
    </section>
   </div>
  </div>
  <section className="card cardPad" id="after-event" style={{marginTop:20}}>
   <div className="eyebrow">AFTER THE RENTAL · SIMPLE CHECKOUT</div>
   <h2 className="sectionTitle">Send the digital gallery, then set up the next event</h2>
   <p className="sectionLead">Your iPad stores each event’s photos separately. After the rental, open Staff Tools on that same iPad, download its complete photo ZIP, check it, and send the customer their digital copies. If secure backups were enabled, you can also download them here.</p>
   <div className="buttonRow">
    <Link className="btn" href={'/events/'+event.id+'/backups'}>Download backed-up digital gallery ZIP →</Link>
    <a className="btn btn2" target="_blank" rel="noopener noreferrer" href={BOOTH_URL}>Open event iPad →</a>
   </div>
   <p className="inlineInfo">If the backup gallery has no photos, the original photos may still be on the event iPad. Do not erase that iPad before saving its ZIP. Secure cloud backups expire after 30 days.</p>
   <div className="buttonRow" style={{marginTop:18}}>
    {!['COMPLETED','ARCHIVED'].includes(event.status)&&<form action={completeAction}><button className="btn btn2" type="submit">Mark event completed</button></form>}
    {event.status==='COMPLETED'&&<form action={archiveAction}><button className="btn" type="submit">Archive completed event</button></form>}
    {event.status==='ARCHIVED'&&<span className="noticeOnly"><strong>Archived.</strong> This event is no longer part of your active event workflow. Its admin record remains until you explicitly delete it.</span>}
   </div>
  </section>
  {event.status==='ARCHIVED'?<details className="dangerZone"><summary>Advanced: permanently delete the archived event</summary><p className="sectionLead">Only after saving and delivering the digital photos. This deletes the admin booking and remaining server backups; it cannot be undone.</p><form action={deleteAction}><ConfirmDelete name={event.name}/></form></details>:<details className="dangerZone"><summary>Permanent deletion is locked</summary><p className="sectionLead">Finish the rental and archive it first. Download and check the digital gallery before deleting any customer data.</p></details>}

 </main>;
}
