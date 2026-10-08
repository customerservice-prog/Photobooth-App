import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {requireAdmin} from '../../../../lib/require-admin.mjs';
import {GALLERY_PART_SIZE} from '../../../../lib/event-gallery-zip.mjs';
export const dynamic='force-dynamic';
export default async function EventBackups({params}){
 await requireAdmin();
 let rows=[],error='',totalFinished=0;
 try{
  await prisma.$executeRaw`DELETE FROM booth_backup_v1.images WHERE expires_at<now()`;
  rows=await prisma.$queryRaw`SELECT capture_id,kind,created_at,expires_at,octet_length(image) AS bytes FROM booth_backup_v1.images WHERE event_id=${params.id} AND expires_at>now() ORDER BY created_at DESC LIMIT 500`;
  const count=await prisma.$queryRaw`SELECT COUNT(DISTINCT capture_id) AS total FROM booth_backup_v1.images WHERE event_id=${params.id} AND expires_at>now() AND kind IN ('keepsake','collage')`;
  totalFinished=Number(count[0]?.total||0);
 }catch{error='This event has no initialized backup storage yet, or the backup database is unavailable.';}
 return <main className="page">
  <Link href={'/events/'+params.id}>← Back to event</Link>
  <h1 className="title">Private event photo backups</h1>
  <p className="sectionLead">Saved copies from authorized event iPads. Each original stays on the iPad. These recovery files expire after 30 days.</p>
  {error&&<p role="alert" className="warningNote">{error}</p>}
  {!error&&rows.length===0&&<p>No uploaded photos yet. On the event iPad, open Staff Tools and enable secure backups while online.</p>}
  {!error&&totalFinished>0&&<section className="card cardPad" style={{margin:'16px 0 24px'}}>
   <h2 className="sectionTitle">Download the customer's digital gallery</h2>
   <p className="sectionLead">{totalFinished} photo sessions with a finished keepsake or collage are backed up. Download the ZIP {totalFinished>GALLERY_PART_SIZE?'parts':'file'}, open it, and check the photographs before sending anything to the customer.</p>
   <div className="buttonRow">{Array.from({length:Math.ceil(totalFinished/GALLERY_PART_SIZE)},(_,i)=><a className="btn" key={i} href={'/api/backups/'+encodeURIComponent(params.id)+'/download?part='+(i+1)} download>{totalFinished>GALLERY_PART_SIZE?'Download gallery ZIP · part '+(i+1):'Download digital gallery ZIP'}</a>)}</div>
   <p className="inlineInfo">Backups are private, expire after 30 days, and appear here only if staff enabled them on the event iPad. Keep a verified copy before closing or deleting an event. If there are missing or unfinished sessions, also download the complete local iPad ZIP.</p>
  </section>}

  <div className="uiCards">{rows.map(r=><article className="card cardPad" key={r.capture_id+':'+r.kind}>
   <strong>{r.kind.replaceAll('-',' ')} · {r.capture_id.slice(0,8)}</strong>
   <p className="rowSubtitle">{new Date(r.created_at).toLocaleString('en-US')} · {Math.round(Number(r.bytes)/1024)} KB</p>
   <a className="btn btn2 btnSm" download={r.capture_id+'-'+r.kind+'.jpg'} href={'/api/backups/'+params.id+'/'+encodeURIComponent(r.capture_id)+'/'+r.kind}>Download photo</a>
  </article>)}</div>
 </main>;
}