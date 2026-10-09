// Reading the owner gallery never initializes storage or removes photographs.
// A new database can be reachable before its first authorized iPad upload.
export async function readEventBackups(db,eventId){
 try{
  const storage=await db.$queryRaw`SELECT to_regclass('booth_backup_v1.images')::text AS relation`;
  if(!storage[0]?.relation)return {state:'awaiting-setup',rows:[],totalFinished:0};
  const [rows,count]=await Promise.all([
   db.$queryRaw`SELECT capture_id,kind,created_at,expires_at,octet_length(image) AS bytes FROM booth_backup_v1.images WHERE event_id=${eventId} AND expires_at>now() ORDER BY created_at DESC LIMIT 500`,
   db.$queryRaw`SELECT COUNT(DISTINCT capture_id) AS total FROM booth_backup_v1.images WHERE event_id=${eventId} AND expires_at>now() AND kind IN ('keepsake','collage')`
  ]);
  const totalFinished=Number(count[0]?.total||0);
  return {state:rows.length||totalFinished?'available':'empty',rows,totalFinished};
 }catch{
  // Connection failures are not proof that an event has no saved photographs.
  return {state:'unavailable',rows:[],totalFinished:0};
 }
}
