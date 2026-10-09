import {prisma} from '../../../../../lib/prisma';
import {requireAdmin} from '../../../../../lib/require-admin.mjs';
import {readEventGalleryPart,galleryFiles,zipJpegs,safeGalleryName} from '../../../../../lib/event-gallery-zip.mjs';
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
  rows=await readEventGalleryPart(prisma,id,part);
 }catch{return response('Secure backups are unavailable. Use the event iPad’s complete photo ZIP instead.',503);}
 if(!rows.length)return response('No uploaded photos found in this part. Open this event on its iPad while online, or export its local ZIP.',404);
 try{
  const zip=zipJpegs(galleryFiles(rows,{eventName:event.name,eventId:id,part,partSize:rows[0].part_size}));
  const filename=safeGalleryName(event.name)+'-digital-gallery-part-'+part+'.zip';
  return new Response(zip,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
 }catch(err){return response(err.message||'Gallery ZIP could not be prepared; original backups remain saved.',413);}
}
