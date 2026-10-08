import {prisma} from '../../../../../../lib/prisma';
import {requireAdmin} from '../../../../../../lib/require-admin.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
export async function GET(request,{params}){
 await requireAdmin();
 const {eventId,captureId,kind}=params;
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(eventId)||!/^[A-Za-z0-9_-]{3,100}$/.test(captureId)||!/^pose-[1-4]$|^collage$|^keepsake$/.test(kind))
  return new Response('Invalid image',{status:400});
 try{
  const rows=await prisma.$queryRaw`SELECT image FROM booth_backup_v1.images WHERE event_id=${eventId} AND capture_id=${captureId} AND kind=${kind} AND expires_at>now() LIMIT 1`;
  if(!rows.length)return new Response('Not found',{status:404});
  return new Response(rows[0].image,{headers:{'Content-Type':'image/jpeg','Content-Disposition':'attachment; filename="friendly-event-photo.jpg"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Backup temporarily unavailable',{status:503});}
}
