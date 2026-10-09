import Link from 'next/link';
import {prisma} from '../../../lib/prisma';
import {deleteEvent,completeEvent,archiveEvent} from '../actions';
import {dateLabel,timeLabel,readiness,experienceFrom,BOOTH_URL,statusText} from '../../../lib/studio-experience.mjs';
import {makeBoothHandoffLink} from '../../../lib/booth-transfer.mjs';
import {ownerApprovedDesigns} from '../../../lib/owner-design-preview.mjs';
import {presetById} from '../../../../booth/app/lib/fpr-print-presets.mjs';
import {PageHeader,DatabaseError} from '../../StudioUI';
import BoothTransfer from '../../BoothTransfer';
import ConfirmDelete from '../../ConfirmDelete';
import '../../owner-event.css';
export const dynamic='force-dynamic';
const OCTOBER_EVENT='efcbaffc-893f-4361-983b-79a38e7d111a';
export default async function EventDetailPage({params}){
 let event=null,error=null;
 try{event=await prisma.event.findUnique({where:{id:params.id},include:{customer:true,booth:true,template:true}})}catch(e){error=e;}
 if(error)return <main className="page"><DatabaseError topic="event details"/><Link className="btn btn2" href="/events">Back to events</Link></main>;
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><p className="muted">Return to Events to choose a saved booking.</p><Link href="/events" className="btn">All events →</Link></main>;
 const progress=readiness(event),experience=experienceFrom(event),finished=['COMPLETED','ARCHIVED'].includes(event.status);
 let handoff=null,handoffError='';
 try{handoff=makeBoothHandoffLink(event);}catch(err){handoffError=err.message||'The iPad setup link could not be prepared.';}
 const edit='/events/'+event.id+'/edit',gallery='/events/'+event.id+'/backups';
 const deleteAction=deleteEvent.bind(null,event.id),completeAction=completeEvent.bind(null,event.id),archiveAction=archiveEvent.bind(null,event.id);
 return <main className="page ownerEventPage">
  <Link href="/events" className="btnPlain ownerBackLink">← All events</Link>
  <PageHeader eyebrow="YOUR PHOTO BOOTH EVENT" title={event.name} subtitle={dateLabel(event.date)+' · '+timeLabel(event.startTime)+'–'+timeLabel(event.endTime)}>
   <span data-testid="owner-event-readiness" className={'statusChip'+(finished?' neutral':progress.ready?'':' warning')}>{finished?statusText(event.status):progress.ready?'Event details saved':'Needs setup'}</span>
  </PageHeader>
  <div className="ownerEventFlow" data-testid="owner-event-workflow">
   <section className="card cardPad ownerEventStep" id="prepare-event" data-testid="owner-prepare-event">
    <header className="ownerStepHeader"><span className="ownerEventStepNumber" aria-hidden="true">1</span><div><h2 className="sectionTitle">Prepare the event</h2><p className="sectionLead">Save the details and choose one design for both photo choices.</p></div><Link href={edit} className="btn btn2">Edit event &amp; design →</Link></header>
    <div className="ownerEventDetailFacts">
     <div><small>Customer</small><strong>{event.customer?.name||'Customer details needed'}</strong></div>
     <div><small>Location</small><strong>{event.venueName||'Venue not entered'}</strong><span>{event.venueAddress||'Address not entered'}</span></div>
     <div><small>Selected design</small><strong>{experience.approvedDesign==='custom'?'Custom artwork':presetById(experience.approvedDesign)?.name||ownerApprovedDesigns(event.eventType).find(design=>design.id===experience.approvedDesign)?.name||'Choose your customer’s design'}</strong><span>{experience.nameOnPrint||event.name}</span></div>
     <div><small>Guests choose</small><strong>1 Photo or 4 Photos</strong><span>Same design · one 4×6 sheet</span></div>
    </div>
    {!progress.ready&&<p className="ownerSetupReminder">Still needed: {progress.checks.filter(check=>!check.ready).map(check=>check.title).join(', ')}. <Link href={edit+'#'+progress.next?.href}>Complete event setup →</Link></p>}
   </section>
   <section className="card cardPad ownerEventStep" id="send-to-booth" data-testid="owner-load-event">
    <header className="ownerStepHeader"><span className="ownerEventStepNumber" aria-hidden="true">2</span><div><h2 className="sectionTitle">Load the iPad</h2><p className="sectionLead">Open the setup link on the event iPad, then apply this event once.</p></div></header>
    {handoff?<BoothTransfer url={handoff} eventName={event.name} ready={progress.ready}/>:<p className="errorNote" role="alert">{handoffError} <Link href={edit}>Review event details →</Link></p>}
    <p className="ownerDeviceCheck">On the iPad, check the name and both photo previews, listen to the countdown, and print one real Canon test sheet before guests arrive.</p>
   </section>
   <section className="card cardPad ownerEventStep" id="after-event" data-testid="owner-finish-event">
    <header className="ownerStepHeader"><span className="ownerEventStepNumber" aria-hidden="true">3</span><div><h2 className="sectionTitle">Save the photos</h2><p className="sectionLead">Download and check the gallery before finishing this rental.</p></div></header>
    <div className="buttonRow"><Link href={gallery} className="btn" data-testid="owner-event-gallery">Open digital gallery →</Link></div>
    <p className="ownerGalleryHelp">The gallery contains available secure backups. If photos are only on the event iPad, open Staff tools → Finish the event and download its complete ZIP there. Open the ZIP before sharing it with the customer.</p>
    <div className="ownerEventCloseout">
     {!finished&&<><form action={completeAction}><button className="btn btn2" type="submit">Mark event completed</button></form><span>After the gallery is saved and checked.</span></>}
     {event.status==='COMPLETED'&&<><form action={archiveAction}><button className="btn btn2" type="submit">Archive completed event</button></form><span>Keep the booking while preparing the next rental.</span></>}
     {event.status==='ARCHIVED'&&<p>This event is archived. Its booking remains saved until you explicitly delete it.</p>}
     {finished&&<Link href="/events/new" className="btn">Prepare next event →</Link>}
    </div>
   </section>
  </div>
  <details className="card ownerEventDetails">
   <summary>Staff notes, equipment &amp; other saved settings</summary>
   <div className="cardPad ownerEventDetailFacts">
    <div><small>Customer contact</small><strong>{event.customer?.email||'No email entered'}</strong><span>{event.customer?.phone||'No phone entered'}</span></div>
    <div><small>Assigned booth</small><strong>{event.booth?.name||'Not assigned'}</strong><span>{event.template?.name?'Legacy design record: '+event.template.name:'No legacy template record'}</span></div>
    <div><small>Printing</small><strong>{event.printingEnabled?String(event.maxPrints??108)+' sheets allowed':'Digital only'}</strong><span>{experience.pauseSeconds}-second pose breaks</span></div>
    <div><small>Recorded status</small><strong>{statusText(event.status)}</strong><span>Check the event on the actual iPad.</span></div>
    {event.internalNotes&&<p className="ownerWideFact"><strong>Private staff notes:</strong> {event.internalNotes}</p>}
    <p className="ownerWideFact">Authorized online iPads check for updated settings between sessions. If an update is unavailable, apply a fresh setup link and check the iPad preview.</p>
    <p className="ownerWideFact">Secure backups expire after 30 days. Keep a verified download before clearing the iPad or deleting a booking.</p>
    {event.id===OCTOBER_EVENT&&<p className="ownerWideFact">Earlier October photos remain in their separate iPad archive. Export both archives if photos were taken through both event entries.</p>}
    <a className="btn btn2 btnSm" href={BOOTH_URL+'/print-test'} target="_blank" rel="noopener noreferrer">Canon test page ↗</a>
   </div>
  </details>
  {event.status==='ARCHIVED'?<details className="dangerZone ownerDeleteEvent"><summary>Permanently delete this archived event</summary><p className="sectionLead">Only after saving and delivering the photos. This deletes the booking and remaining server backups, and cannot be undone.</p><form action={deleteAction}><ConfirmDelete name={event.name}/></form></details>:<details className="dangerZone ownerDeleteEvent"><summary>Permanent deletion is locked</summary><p className="sectionLead">Complete and archive the event first. Save and check the customer gallery before deleting any photos.</p></details>}
 </main>;
}
