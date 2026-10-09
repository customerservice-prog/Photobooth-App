// Reading the owner gallery never initializes storage or removes photographs.
// A new database can be reachable before its first authorized iPad upload.
import {galleryPartSize} from './event-gallery-zip.mjs';
const emptyCounts={totalSessions:0,totalFinished:0,totalOriginals:0,totalFinishedFiles:0,totalFiles:0,maxSessionBytes:0,partSize:galleryPartSize()};
export async function readEventBackups(db,eventId){
 try{
  const storage=await db.$queryRaw`SELECT to_regclass('booth_backup_v1.images')::text AS relation`;
  if(!storage[0]?.relation)return {state:'awaiting-setup',rows:[],...emptyCounts};
  const [rows,count]=await Promise.all([
   db.$queryRaw`SELECT capture_id,kind,created_at,expires_at,octet_length(image) AS bytes FROM booth_backup_v1.images WHERE event_id=${eventId} AND expires_at>now() AND kind IN ('pose-1','pose-2','pose-3','pose-4','collage','keepsake') ORDER BY created_at DESC LIMIT 500`,
   db.$queryRaw`WITH sessions AS (
    SELECT capture_id,COUNT(*) FILTER (WHERE kind IN ('pose-1','pose-2','pose-3','pose-4')) AS originals,
     COUNT(*) FILTER (WHERE kind IN ('keepsake','collage')) AS finished_files,COUNT(*) AS files,SUM(octet_length(image)) AS session_bytes
    FROM booth_backup_v1.images WHERE event_id=${eventId} AND expires_at>now() AND kind IN ('pose-1','pose-2','pose-3','pose-4','collage','keepsake') GROUP BY capture_id
   ) SELECT COUNT(*) AS sessions,COUNT(*) FILTER (WHERE finished_files>0) AS finished_sessions,
    COALESCE(SUM(originals),0) AS originals,COALESCE(SUM(finished_files),0) AS finished_files,COALESCE(SUM(files),0) AS files,COALESCE(MAX(session_bytes),0) AS max_session_bytes FROM sessions`
  ]);
  const totals={totalSessions:Number(count[0]?.sessions||0),totalFinished:Number(count[0]?.finished_sessions||0),
   totalOriginals:Number(count[0]?.originals||0),totalFinishedFiles:Number(count[0]?.finished_files||0),totalFiles:Number(count[0]?.files||0),maxSessionBytes:Number(count[0]?.max_session_bytes||0)};
  totals.partSize=galleryPartSize(totals.maxSessionBytes);
  return {state:rows.length||totals.totalSessions?'available':'empty',rows,...totals};
 }catch{
  // Connection failures are not proof that an event has no saved photographs.
  return {state:'unavailable',rows:[],...emptyCounts};
 }
}
