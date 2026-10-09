import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {requireAdmin} from '../../../../lib/require-admin.mjs';
import {GALLERY_PART_SIZE} from '../../../../lib/event-gallery-zip.mjs';
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
 const {state,rows,totalFinished}=await readEventBackups(prisma,event.id);
 const unavailable=state==='unavailable',awaiting=state==='awaiting-setup',empty=state==='empty';
 const galleryBase='/api/backups/'+encodeURIComponent(event.id);
 return <main className="page eventGalleryPage" data-testid="owner-event-gallery-page" data-backup-state={state}>
  <Link className="btnPlain eventGalleryBack" href={'/events/'+event.id}>← Back to event</Link>
  <PageHeader eyebrow="AFTER THE EVENT" title="Event digital gallery" subtitle={event.name+' · '+dateLabel(event.date)}>
   <span data-testid="owner-backup-status" data-state={state} className={'statusChip'+(unavailable?' warning':totalFinished?'':' neutral')}>{unavailable?'Connection unavailable':totalFinished?totalFinished+' available photo sessions':awaiting?'Waiting for iPad setup':empty?'No uploaded photos yet':'Original poses available'}</span>
  </PageHeader>

  {unavailable&&<section className="errorNote" role="alert" data-testid="owner-gallery-unavailable">
   <strong>The online gallery could not be loaded.</strong> The backup connection is unavailable right now. Retry this page, or use the event iPad to download its local gallery.
   <div className="buttonRow"><a className="btn btn2 btnSm" href={'/events/'+event.id+'/backups'}>Retry online gallery</a></div>
  </section>}

  {(awaiting||empty)&&<section className="card cardPad eventGalleryIntro" data-testid="owner-gallery-empty">
   <div className="eyebrow">ONLINE COPIES</div>
   <h2 className="sectionTitle">{awaiting?'Connect the event iPad for backups':'No uploaded photos for this event yet'}</h2>
   <p className="sectionLead">{awaiting?'Online backups are waiting for setup. Open this event on its iPad, connect to Wi-Fi, and enable secure backups in Staff tools.':'Online storage is connected. To upload this event’s photos, open it on the iPad and enable secure backups in Staff tools while online.'}</p>
   <p className="eventGalleryHelp">Photos already taken can still be on the event iPad. Use the local download below to save those copies.</p>
  </section>}

  {totalFinished>0&&<section className="card cardPad eventGalleryIntro" data-testid="owner-gallery-download">
   <div className="eyebrow">AVAILABLE ONLINE COPIES</div>
   <h2 className="sectionTitle">Download the customer's digital gallery</h2>
   <p className="sectionLead">{totalFinished} photo sessions have an available finished keepsake or collage. Download the ZIP {totalFinished>GALLERY_PART_SIZE?'parts':'file'}, open it, and check the photos before sending it to the customer.</p>
   <div className="buttonRow">{Array.from({length:Math.ceil(totalFinished/GALLERY_PART_SIZE)},(_,i)=><a className="btn" key={i} href={galleryBase+'/download?part='+(i+1)} download>{totalFinished>GALLERY_PART_SIZE?'Download gallery ZIP · part '+(i+1):'Download digital gallery ZIP'}</a>)}</div>
   <p className="eventGalleryHelp">This download contains available online keepsakes or collages. It may not include every session or original pose from the iPad.</p>
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
