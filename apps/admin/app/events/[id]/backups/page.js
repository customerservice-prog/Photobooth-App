import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {requireAdmin} from '../../../../lib/require-admin.mjs';
export const dynamic='force-dynamic';
export default async function EventBackups({params}){
 await requireAdmin();
 let rows=[],error='';
 try{
  await prisma.$executeRaw`DELETE FROM booth_backup_v1.images WHERE expires_at<now()`;
  rows=await prisma.$queryRaw`SELECT capture_id,kind,created_at,expires_at,octet_length(image) AS bytes FROM booth_backup_v1.images WHERE event_id=${params.id} AND expires_at>now() ORDER BY created_at DESC LIMIT 500`;
 }catch{error='This event has no initialized backup storage yet, or the backup database is unavailable.';}
 return <main className="page">
  <Link href={'/events/'+params.id}>← Back to event</Link>
  <h1 className="title">Private event photo backups</h1>
  <p className="sectionLead">Saved copies from authorized event iPads. Each original stays on the iPad. These recovery files expire after 30 days.</p>
  {error&&<p role="alert" className="warningNote">{error}</p>}
  {!error&&rows.length===0&&<p>No uploaded photos yet. On the event iPad, open Staff Tools and enable secure backups while online.</p>}
  <div className="uiCards">{rows.map(r=><article className="card cardPad" key={r.capture_id+':'+r.kind}>
   <strong>{r.kind.replaceAll('-',' ')} · {r.capture_id.slice(0,8)}</strong>
   <p className="rowSubtitle">{new Date(r.created_at).toLocaleString('en-US')} · {Math.round(Number(r.bytes)/1024)} KB</p>
   <a className="btn btn2 btnSm" download={r.capture_id+'-'+r.kind+'.jpg'} href={'/api/backups/'+params.id+'/'+encodeURIComponent(r.capture_id)+'/'+r.kind}>Download photo</a>
  </article>)}</div>
 </main>;
}