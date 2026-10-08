import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {dateLabel,readiness,BOOTH_URL,BOOTH_SETUP_URL,guestHandoffMessage} from '../../lib/studio-experience.mjs';
import {PageHeader,Metric,EventTile,ProgressCard,DatabaseError,EmptyState,SectionHeading} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function DashboardPage(){
 let events=[],booths=[],templates=[],error=null;
 try{[events,booths,templates]=await Promise.all([
  prisma.event.findMany({include:{customer:true,booth:true,template:true},orderBy:{date:'asc'},take:150}),
  prisma.booth.findMany({take:100}),
  prisma.template.findMany({where:{archived:false},take:100})
 ]);}catch(e){error=e;}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const upcoming=events.filter(e=>e.date.toISOString().slice(0,10)>=today&&!['ARCHIVED','COMPLETED'].includes(e.status));
 const needs=upcoming.filter(e=>!readiness(e).ready),next=upcoming[0]||null;
 const hasDesigns=templates.some(t=>Array.isArray(t.layout?.layers)&&t.layout.layers.length>0);
 return <main className="page">
  <PageHeader eyebrow="FRIENDLY PHOTO BOOTH · TODAY" title="Welcome to your booth workspace." subtitle="A simple place to prepare events, check equipment and help guests—without digging through settings.">
   <Link className="btn" href="/events/new">＋ Create an event</Link>
   <a className="btn btn2" href={BOOTH_URL} target="_blank" rel="noopener noreferrer">Open guest booth ↗</a>
  </PageHeader>
  {error?<DatabaseError topic="your event workspace"/>:<>
   <section className="metricGrid" aria-label="Operations at a glance">
    <Metric label="Upcoming events" value={upcoming.length} foot="In this admin database"/>
    <Metric label="Need setup" value={needs.length} foot={needs.length?'Tap an event below':'No missing core details'}/>
    <Metric label="Registered booths" value={booths.length} foot="Connection requires a device check"/>
    <Metric label="Print designs" value={templates.length} foot={hasDesigns?'Some designs have content':'Blank designs still need artwork'}/>
   </section>
   <div className="uiGrid">
    <section className="card cardPad">
     <SectionHeading eyebrow="YOUR NEXT EVENTS" title="What’s coming up?" subtitle="Open an event to finish its details or see what is already ready."><Link className="btn btn2 btnSm" href="/events">All events →</Link></SectionHeading>
     {upcoming.length?<div className="eventTiles">{upcoming.slice(0,5).map(event=><EventTile key={event.id} event={event}/>)}</div>:<EmptyState title="No upcoming events" description="Start by entering the next party or wedding. You can add the booth and design afterward." href="/events/new" label="Add first event"/>}
    </section>
    <div className="uiStack">
     {next?<ProgressCard event={next} compact/>:<section className="card cardPad softCard"><div className="eyebrow">NEXT STEP</div><h2 className="sectionTitle">Create your next event</h2><p className="sectionLead">Enter the customer, date and event name. Add equipment and designs after saving.</p><Link className="btn" href="/events/new">Create event →</Link></section>}
     <section className="card cardPad softCard">
      <div className="eyebrow">BEFORE AN EVENT</div><h2 className="sectionTitle">Test the guest experience</h2>
      <p className="sectionLead">Use the exact iPad and Canon SELPHY you plan to bring. Try one photo, four photos, the speaker, then a real 4×6 test print.</p>
      <div className="buttonRow"><a href={BOOTH_SETUP_URL} className="btn btn2 btnSm" target="_blank" rel="noopener noreferrer">iPad setup ↗</a><a href={BOOTH_URL+'/print-test'} className="btn btn2 btnSm" target="_blank" rel="noopener noreferrer">Printer test ↗</a></div>
      <p className="inlineInfo" style={{marginTop:12}}>{guestHandoffMessage()}</p>
     </section>
    </div>
   </div>
  </>}
 </main>;
}
