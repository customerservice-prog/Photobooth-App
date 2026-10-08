import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,Metric,DatabaseError} from '../StudioUI';
import {dateLabel} from '../../lib/studio-experience.mjs';
export const dynamic='force-dynamic';
export default async function ReportsPage(){
 let events=[],sessions=[],prints=[],booths=[],error=null;
 try{[events,sessions,prints,booths]=await Promise.all([
  prisma.event.findMany({orderBy:{date:'desc'},take:100}),
  prisma.photoSession.findMany({orderBy:{startedAt:'desc'},take:500}),
  prisma.printJob.findMany({orderBy:{createdAt:'desc'},take:500}),
  prisma.booth.findMany({include:{events:true}})
 ]);}catch(e){error=e;}
 const completed=sessions.filter(s=>!!s.completedAt).length,failed=prints.filter(p=>p.status==='FAILED').length,handedOff=prints.filter(p=>p.status==='SENT_TO_PRINT_SYSTEM').length,markedComplete=prints.filter(p=>p.status==='COMPLETED').length;
 return <main className="page">
  <PageHeader eyebrow="OPERATIONS REPORTS" title="See how the booth is doing" subtitle="Recent event, photo and print records from the admin database. These counts are not a complete report of any unsynced photos on an event iPad."><Link className="btn btn2" href="/photos">Photo & print details →</Link></PageHeader>
  {error?<DatabaseError topic="reports"/>:<>
   <div className="metricGrid"><Metric label="Recent events" value={events.length} foot="Up to 100"/><Metric label="Guest sessions" value={sessions.length} foot="Up to 500"/><Metric label="Completed sessions" value={completed}/><Metric label="Failed print jobs" value={failed}/></div>
   <div className="uiGrid">
    <section className="card cardPad"><div className="eyebrow">RECENT EVENT ACTIVITY</div><h2 className="sectionTitle">Events</h2>
     <div className="rowList">{events.slice(0,12).map(e=>{const n=sessions.filter(s=>s.eventId===e.id).length,p=prints.filter(x=>x.eventId===e.id).length;return <Link key={e.id} href={'/events/'+e.id} className="listRow"><div><strong className="rowTitle">{e.name}</strong><small className="rowSubtitle">{dateLabel(e.date)} · {n} guest session{n===1?'':'s'} · {p} print request{p===1?'':'s'}</small></div><span className="stepArrow">→</span></Link>})}</div>
     {!events.length&&<p className="sectionLead">No event history has been recorded yet.</p>}
    </section>
    <div className="uiStack">
     <section className="card cardPad softCard"><div className="eyebrow">PRINTER ACTIVITY</div><h2 className="sectionTitle">Print job states</h2>
      <div className="keyValue"><div><small>Marked completed</small><strong>{markedComplete}</strong></div><div><small>Handed to system</small><strong>{handedOff}</strong></div><div><small>Failed</small><strong>{failed}</strong></div><div><small>Total recent jobs</small><strong>{prints.length}</strong></div></div>
      <div className="helpNote" style={{marginTop:16}}>Handed to print system is not the same as a physical sheet being printed. Confirm physical output before marking an event ready.</div>
     </section>
     <section className="card cardPad"><div className="eyebrow">BOOTHS</div><h2 className="sectionTitle">Registered equipment</h2>
      <p className="sectionLead">{booths.length} booth record{booths.length===1?'':'s'} found. Recorded Online status may be stale.</p>
      <div className="rowList">{booths.slice(0,12).map(b=><div className="listRow" key={b.id}><strong className="rowTitle">{b.name}</strong><span className="rowSubtitle">{b.events.length} event{b.events.length===1?'':'s'} · {b.status}</span></div>)}</div>
     </section>
    </div>
   </div>
  </>}
 </main>;
}