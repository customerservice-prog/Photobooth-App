import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {dateLabel,toLocalDay,readiness,BOOTH_URL} from '../../lib/studio-experience.mjs';
import {PageHeader,DateBlock,DatabaseError,EmptyState} from '../StudioUI';
import {ownerApprovedDesigns} from '../../lib/owner-design-preview.mjs';
export const dynamic='force-dynamic';
const finished=e=>['COMPLETED','ARCHIVED'].includes(e.status);
export default async function DashboardPage(){
 let events=[],error=null;
 try{events=await prisma.event.findMany({include:{customer:true,booth:true,template:true},orderBy:{date:'asc'},take:200});}catch(e){error=e;}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const upcoming=events.filter(e=>!finished(e)&&toLocalDay(e.date)>=today);
 const past=events.filter(e=>!finished(e)&&toLocalDay(e.date)<today).reverse();
 const next=events.find(e=>e.status==='ACTIVE')||upcoming[0]||past[0];
 const setup=next?readiness(next):null;
 const after=next&&toLocalDay(next.date)<today&&next.status!=='ACTIVE';
 const eventUrl=next?'/events/'+next.id:'/events';
 return <main className="page ownerHome">
  <PageHeader eyebrow="FRIENDLY PHOTO BOOTH" title="Your event workspace." subtitle="Prepare a rental, load your iPad, and save the event’s photos.">
   <Link className="btn" href="/events/new">＋ New event</Link>
  </PageHeader>
  {error?<DatabaseError topic="your events"/>:next?<section className="ownerCurrent card" data-testid="owner-current-event">
   <div className="ownerCurrentMain">
    <div className="ownerEventTop"><span className="eyebrow">{after?'FINISH YOUR LAST RENTAL':'YOUR NEXT EVENT'}</span><span className={'statusChip'+(setup.ready?'':' warning')}>{setup.ready?'Event details saved':'Needs setup'}</span></div>
    <h2>{next.name}</h2>
    <p className="ownerEventDate">{dateLabel(next.date)} · {next.customer?.name||'Customer details needed'}</p>
    <div className="ownerEventFacts"><div><small>Selected look</small><strong>{ownerApprovedDesigns(next.eventType).find(d=>d.id===next.theme?.boothExperience?.approvedDesign)?.name||'Choose your customer’s design'}</strong></div><div><small>Print allowance</small><strong>{next.printingEnabled===false?'Digital only':(next.maxPrints??108)+' sheets'}</strong></div></div>
    <div className="buttonRow"><Link className="btn" href={eventUrl+(after?'#after-event':'')}>{after?'Save photos & finish →':'Continue this event →'}</Link><Link className="btnPlain" href="/events">All events</Link></div>
   </div>
   <div className="ownerNextAction">
    <span className="ownerStepMark" aria-hidden="true">{after?'3':setup.ready?'2':'1'}</span>
    <div><span className="eyebrow">WHAT TO DO NEXT</span><h3>{after?'Save the gallery':setup.ready?'Load the event on your iPad':setup.next?.id==='venue'?'Add the event location':'Finish the event setup'}</h3><p>{after?'Download and check the photos before clearing the event from the iPad.':setup.ready?'Open this event’s setup link on the iPad, apply it, then test the camera and printer.':'Open the event and finish its details. Choose one design for both photo choices.'}</p></div>
   </div>
  </section>:<EmptyState title="Let’s prepare your first event" description="Add the customer and date, then choose one design for their 1-photo and 4-photo prints." href="/events/new" label="Create an event →"/>}
  <section className="ownerWorkflow" data-testid="owner-workflow" aria-label="Your rental in three steps">
   <article className="ownerWorkflowCard"><span className="ownerStepNumber">1</span><h2>Prepare the event</h2><p>Add the name and date. Choose the customer’s design and preview both photo layouts.</p><Link className="btn btn2" href={next?eventUrl+'/edit':'/events/new'}>{next?'Edit event & design →':'Create an event →'}</Link></article>
   <article className="ownerWorkflowCard"><span className="ownerStepNumber">2</span><h2>Load the iPad</h2><p>Open the setup link on your iPad. Guests then choose 1 Photo or 4 Photos.</p><Link className="btn btn2" href={next?eventUrl+'#send-to-booth':'/events'}>{next?'Get iPad setup link →':'Choose an event →'}</Link></article>
   <article className="ownerWorkflowCard"><span className="ownerStepNumber">3</span><h2>Save the photos</h2><p>After the rental, download the complete gallery, check it, and finish the event.</p><Link className="btn btn2" href={next?eventUrl+'#after-event':'/galleries'}>{next?'Gallery & finish event →':'Open digital galleries →'}</Link></article>
  </section>
  {!error&&<section className="ownerSchedule card cardPad"><div className="sectionHeader"><div><span className="eyebrow">KEEP YOUR RENTALS ORGANIZED</span><h2 className="sectionTitle">Other events</h2></div><Link className="btnPlain" href="/events">View all events →</Link></div>
   {upcoming.filter(e=>e.id!==next?.id).length?<div className="rowList">{upcoming.filter(e=>e.id!==next?.id).slice(0,4).map(e=><Link className="ownerScheduleRow" href={'/events/'+e.id} key={e.id}><DateBlock date={e.date}/><span><strong>{e.name}</strong><small>{e.customer?.name||'Customer details needed'} · {dateLabel(e.date)}</small></span><span aria-hidden="true">→</span></Link>)}</div>:<p className="sectionLead">No other upcoming rentals. Create your next event when you’re ready.</p>}
   {past.filter(e=>e.id!==next?.id).length>0&&<p className="inlineInfo"><Link href="/events?filter=all">Review {past.filter(e=>e.id!==next?.id).length} earlier event{past.filter(e=>e.id!==next?.id).length===1?'':'s'} still open →</Link></p>}
  </section>}
  <p className="ownerDeviceNote">On event day, open the <a href={BOOTH_URL} target="_blank" rel="noopener noreferrer">guest booth on your iPad ↗</a>. Prepare and manage your events here.</p>
 </main>;
}
