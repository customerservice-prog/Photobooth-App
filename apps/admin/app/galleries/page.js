import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {dateLabel,BOOTH_URL,statusText} from '../../lib/studio-experience.mjs';
import {PageHeader,DatabaseError,EmptyState} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function GalleriesPage(){
 let events=[],error=null;
 try{events=await prisma.event.findMany({include:{customer:true},orderBy:{date:'desc'},take:200});}catch(e){error=e;}
 return <main className="page">
  <PageHeader eyebrow="AFTER THE RENTAL" title="Your digital galleries" subtitle="Choose an event to view its private backups and download the customer’s photos."><Link className="btn btn2" href="/events">All events →</Link></PageHeader>
  {error?<DatabaseError topic="your event galleries"/>:events.length?<section className="ownerGalleryGrid" aria-label="Event galleries">{events.map(event=><article className="card ownerGalleryCard" key={event.id}>
   <span className="eyebrow">{dateLabel(event.date)} · {statusText(event.status)}</span><h2>{event.name}</h2><p className="sectionLead">{event.customer?.name||'Customer details not entered'}</p><Link className="btn" href={'/events/'+event.id+'/backups'}>Open private gallery →</Link><Link className="btnPlain" href={'/events/'+event.id+'#after-event'}>Finish this event →</Link>
  </article>)}</section>:<EmptyState title="Your event photos will appear here" description="Create an event, then load it on your iPad. Choose that event here to check its backed-up photos." href="/events/new" label="Create an event →"/>}
  <div className="helpNote ownerGalleryNotice"><strong>Photos still on the iPad?</strong> On the event iPad, open <a href={BOOTH_URL} target="_blank" rel="noopener noreferrer">Staff tools ↗</a> and download that event’s complete ZIP. Check the download before removing the event. Cloud backups are available only when the iPad has uploaded them.</div>
 </main>;
}
