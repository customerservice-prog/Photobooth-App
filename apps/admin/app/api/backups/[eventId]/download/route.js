import {prisma} from '../../../../../lib/prisma';
import {requireAdmin} from '../../../../../lib/require-admin.mjs';
import {GALLERY_PART_SIZE,zipJpegs,safeGalleryName} from '../../../../../lib/event-gallery-zip.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(message,status)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request,{params}){
 await requireAdmin();
 const id=String(params.eventId||''),url=new URL(request.url),part=Number(url.searchParams.get('part')||1);
 if(!/^[a-zA-Z0-9_-]{3,90}$/.test(id)||!Number.isInteger(part)||part<1||part>1000)return response('Invalid event or gallery part.',400);
 const event=await prisma.event.findUnique({where:{id},select:{name:true}});
 if(!event)return response('This event no longer exists.',404);
 let rows;
 try{
  rows=await prisma.$queryRaw`
   SELECT capture_id,kind,image FROM (
    SELECT capture_id,kind,image,created_at,
     ROW_NUMBER() OVER (PARTITION BY capture_id ORDER BY CASE WHEN kind='keepsake' THEN 0 ELSE 1 END, created_at DESC) AS rank
    FROM booth_backup_v1.images
    WHERE event_id=${id} AND expires_at>now() AND kind IN ('keepsake','collage')
   ) AS chosen WHERE rank=1 ORDER BY created_at ASC, capture_id ASC
   LIMIT ${GALLERY_PART_SIZE} OFFSET ${(part-1)*GALLERY_PART_SIZE}`;
 }catch{return response('Secure backups are unavailable. Use the event iPad’s complete photo ZIP instead.',503);}
 if(!rows.length)return response('No finished photo backups found in this part. Enable backups on the event iPad, or export its local ZIP.',404);
 try{
  const images=rows.map((r,i)=>{
   const capture=String(r.capture_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,45)||String(i);
   return {name:'photo-'+String((part-1)*GALLERY_PART_SIZE+i+1).padStart(4,'0')+'-'+capture+(r.kind==='collage'?'-collage':'')+'.jpg',
    data:r.image instanceof Uint8Array?r.image:new Uint8Array(r.image)};
  });
  const manifest={event:event.name,exportedAt:new Date().toISOString(),part,
   images:images.map((v,i)=>({file:v.name,type:rows[i].kind})),
   note:'These are available finished keepsakes or collages from authorized event-iPad backups. Backup storage expires after 30 days. Other original poses may be available in the local iPad ZIP.'};
  const zip=zipJpegs([{name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))},...images]);
  const filename=safeGalleryName(event.name)+'-digital-gallery-part-'+part+'.zip';
  return new Response(zip,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
 }catch(err){return response(err.message||'Gallery ZIP could not be prepared; original backups remain saved.',413);}
}
