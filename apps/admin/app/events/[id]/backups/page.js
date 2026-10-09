import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {requireAdmin} from '../../../../lib/require-admin.mjs';
import {readEventBackups} from '../../../../lib/event-backups.mjs';
import {dateLabel} from '../../../../lib/studio-experience.mjs';
import {PageHeader,DatabaseError} from '../../../StudioUI';
import '../../../event-gallery.css';
export const dynamic='force-dynamic';
export default async function EventBackups({params}){
 await requireAdmin();
 let event;
 try{event=await prisma.event.findUnique({where:{id:params.id},select:{id:true,name:true,date:true}});}
 catch{return <main className="page"><DatabaseError topic="this event"/><Link className="btn btn2" href="/events">Back to events</Link></main>;}
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><p className="sectionLead">Return to Events to choose a saved booking.</p><Link className="btn" href="/events">All events →</Link></main>;
 const {state,rows,totalSessions,totalOriginals,totalFinishedFiles,totalFiles,partSize}=await readEventBackups(prisma,event.id);
 const unavailable=state==='unavailable',awaiting=state==='awaiting-setup',empty=state==='empty';
 const galleryBase='/api/backups/'+encodeURIComponent(event.id);
 return <main className="page eventGalleryPage" data-testid="owner-event-gallery-page" data-backup-state={state}>
  <Link className="btnPlain eventGalleryBack" href={'/events/'+event.id}>← Back to event</Link>
  <PageHeader eyebrow="AFTER THE EVENT" title="Event digital gallery" subtitle={event.name+' · '+dateLabel(event.date)}>
   <span data-testid="owner-backup-status" data-state={state} className={'statusChip'+(unavailable?' warning':totalSessions?'':' neutral')}>{unavailable?'Connection unavailable':totalSessions?totalSessions+' uploaded photo sessions':awaiting?'Waiting for event iPad':empty?'No uploaded photos yet':'Original poses available'}</span>
  </PageHeader>

  {unavailable&&<section className="errorNote" role="alert" data-testid="owner-gallery-unavailable">
   <strong>The online gallery could not be loaded.</strong> The backup connection is unavailable right now. Retry this page, or use the event iPad to download its local gallery.
   <div className="buttonRow"><a className="btn btn2 btnSm" href={'/events/'+event.id+'/backups'}>Retry online gallery</a></div>
  </section>}

  {(awaiting||empty)&&<section className="card cardPad eventGalleryIntro" data-testid="owner-gallery-empty">
   <div className="eyebrow">ONLINE COPIES</div>
   <h2 className="sectionTitle">{awaiting?'Load this event on the iPad':'No uploaded photos for this event yet'}</h2>
   <p className="sectionLead">Open this event’s setup link on the iPad. Its original photos and finished keepsakes then save here automatically while online. Photos taken offline wait on the iPad and upload when it reconnects.</p>
   <p className="eventGalleryHelp">Keep the event iPad online until its uploads have finished. Photos already taken under an older event entry can still be in that entry’s local iPad gallery.</p>
  </section>}

  {totalSessions>0&&<section className="card cardPad eventGalleryIntro" data-testid="owner-gallery-download">
   <div className="eyebrow">AVAILABLE ONLINE COPIES</div>
   <h2 className="sectionTitle">Download the customer's digital gallery</h2>
   <p className="sectionLead">{totalSessions} uploaded sessions · {totalOriginals} original photos · {totalFinishedFiles} finished keepsakes or collages. Download all {totalFiles} uploaded photos in the ZIP {totalSessions>partSize?'parts':'file'}, open it, and check the photos before sending it to the customer.</p>
   <div className="buttonRow">{Array.from({length:Math.ceil(totalSessions/partSize)},(_,i)=><a className="btn" key={i} href={galleryBase+'/download?part='+(i+1)} download>{totalSessions>partSize?'Download all uploaded photos · part '+(i+1):'Download all uploaded photos ZIP'}</a>)}</div>
   <p className="eventGalleryHelp">Each session folder includes every uploaded original pose and available finished image. Before delivering the final gallery, reconnect the event iPad and confirm its uploads have finished. Photos still waiting on the iPad are not included yet.</p>
  </section>}

  <section className="card cardPad eventGalleryLocal" data-testid="owner-gallery-ipad-help">
   <div className="eyebrow">ON THE EVENT IPAD</div>
   <h2 className="sectionTitle">Save the local photo gallery</h2>
   <p className="sectionLead">Use the same iPad that took the photos. This includes its original poses and available finished prints.</p>
   <ol className="eventGallerySteps">
    <li>Open the correct event on that iPad and unlock <strong>Staff tools</strong>.</li>
    <li>Go to <strong>Finish the event</strong> and tap <strong>Download complete event gallery ZIP</strong>.</li>
    <li>Open the ZIP in Files or Downloads, check the photos, then keep or send the customer a verified copy.</li>
   </ol>
   <p className="eventGalleryHelp">Each event entry has its own iPad archive. If photos were taken under an older entry, export that entry separately. Keep a checked copy before removing any event.</p>
  </section>

  {rows.length>0&&<details className="card eventGalleryFiles" data-testid="owner-gallery-files">
   <summary>Individual uploaded photos <span>{rows.length} {rows.length===500?'most recent files':'available files'}</span></summary>
   <div className="uiCards cardPad">{rows.map(r=><article className="card cardPad" key={r.capture_id+':'+r.kind}>
    <strong>{r.kind.replaceAll('-',' ')} · {r.capture_id.slice(0,8)}</strong>
    <p className="rowSubtitle">{new Date(r.created_at).toLocaleString('en-US')} · {Math.round(Number(r.bytes)/1024)} KB</p>
    <a className="btn btn2 btnSm" download={r.capture_id+'-'+r.kind+'.jpg'} href={galleryBase+'/'+encodeURIComponent(r.capture_id)+'/'+r.kind}>Download photo</a>
   </article>)}</div>
  </details>}
  <p className="eventGalleryRetention">Online backups are private and expire after 30 days. Local iPad originals stay on the iPad until staff explicitly remove them.</p>
 </main>;
}
