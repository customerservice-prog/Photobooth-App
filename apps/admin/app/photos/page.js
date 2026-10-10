import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,Metric,SectionHeading,DatabaseError,EmptyState} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function PhotosPage(){
 let sessions=[],jobs=[],error=null;
 try{[sessions,jobs]=await Promise.all([
  prisma.photoSession.findMany({include:{event:true,captures:true,renderedPhotos:true},orderBy:{startedAt:'desc'},take:60}),
  prisma.printJob.findMany({include:{event:true},orderBy:{createdAt:'desc'},take:30})
 ]);}catch(e){error=e;}
 const photos=sessions.flatMap(s=>{
  const rendered=(s.renderedPhotos||[]).map(p=>({id:p.id,url:p.thumbnailUrl||p.finalUrl,kind:'Finished keepsake',session:s}));
  const originals=(s.captures||[]).map(p=>({id:p.id,url:p.originalUrl,kind:'Original photo',session:s}));
  return rendered.length?rendered:originals;
 });
 const failed=jobs.filter(j=>j.status==='FAILED');
 return <main className="page">
  <Link href="/dashboard" className="btnPlain ownerBackLink">← Back to workspace</Link>
  <PageHeader eyebrow="GUEST PHOTOS & PRINTS" title="Photos and printing" subtitle="Find captured photos and review print attempts. This view shows server records; local-only iPad photos may need recovery on the booth device."><Link className="btn" href="/events?filter=all" data-testid="photos-choose-event-backups">Choose event photo backups →</Link></PageHeader>
  {error?<DatabaseError topic="photos and prints"/>:<>
   <div className="metricGrid"><Metric label="Recent guest sessions" value={sessions.length} foot="Up to 60 server records"/><Metric label="Media records" value={photos.length} foot="Images attached to those sessions"/><Metric label="Recent print attempts" value={jobs.length} foot="Up to 30 print jobs"/><Metric label="Print errors" value={failed.length} foot="Needs staff review"/></div>
   <section className="card cardPad">
    <SectionHeading eyebrow="RECENT CAPTURES" title="Photo library" subtitle="A missing server photo does not mean it was deleted from the iPad."/>
    {photos.length?<div className="uiCards">{photos.slice(0,40).map(p=><article key={p.id} className="softCard" style={{border:'1px solid #dce3d8',borderRadius:13,overflow:'hidden'}}>
      {p.url?<img src={p.url} alt={p.kind+' from '+(p.session.event?.name||'event')} style={{display:'block',width:'100%',aspectRatio:1,objectFit:'cover'}}/>:<div style={{aspectRatio:1,display:'grid',placeItems:'center',color:'#87998a'}}>Image not uploaded</div>}
      <div style={{padding:13}}><strong className="rowTitle">{p.session.event?.name||'Event'}</strong><p className="rowSubtitle">{p.kind} · {new Date(p.session.startedAt).toLocaleDateString('en-US')}</p>{(p.session.event?.id||p.session.eventId)&&<Link className="btnPlain" href={'/events/'+encodeURIComponent(p.session.event?.id||p.session.eventId)+'/backups'} data-testid="photo-event-backups">Open this event’s gallery →</Link>}</div>
     </article>)}</div>:<EmptyState title="No server photos yet" description="Choose the customer’s event to check its digital gallery. For pending uploads, open that same event’s Staff tools on the booth iPad." href="/events?filter=all" label="Choose an event →"/>}
   </section>
   <section className="card cardPad" style={{marginTop:18}}>
    <SectionHeading eyebrow="PRINTER ACTIVITY" title="Recent print requests" subtitle="A job handed to the print system is not confirmation that a physical sheet emerged."/>
    {jobs.length?<div className="rowList">{jobs.map(j=><div className="listRow" key={j.id}><div><strong className="rowTitle">{j.event?.name||'Event print request'}</strong><span className="rowSubtitle">{new Date(j.createdAt).toLocaleString('en-US')} · {j.numberOfCopies||1} requested cop{j.numberOfCopies===1?'y':'ies'}</span>{j.errorMessage&&<div className="errorNote" style={{marginTop:8}}>{j.errorMessage}</div>}</div><span className={'statusChip'+(j.status==='FAILED'?' danger':' neutral')}>{j.status==='SENT_TO_PRINT_SYSTEM'?'Sent to print system':j.status.replaceAll('_',' ')}</span></div>)}</div>:<p className="sectionLead">No server print jobs recorded yet. Test the printer on the actual iPad before the event.</p>}
   </section>
  </>}
 </main>;
}
