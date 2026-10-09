import {NextResponse} from 'next/server';
import {verifyBackupTicket} from '../../../lib/backup-auth.mjs';
import {storeBackupImage,MAX_BACKUP_IMAGE_BYTES} from '../../../lib/backup-store.mjs';
export const runtime='nodejs';
export async function POST(request){
 const e=request.headers.get('x-booth-event')||'';
 const c=request.headers.get('x-booth-capture')||'';
 const k=request.headers.get('x-booth-kind')||'';
 const token=(request.headers.get('authorization')||'').slice(7);
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(e)||!/^[A-Za-z0-9_-]{3,100}$/.test(c)||!/^pose-[1-4]$|^collage$|^keepsake$/.test(k))return new Response('Bad identifiers',{status:400});
 try{
  if(!verifyBackupTicket(token,e))return new Response('Unauthorized',{status:401});
  if(Number(request.headers.get('content-length'))>MAX_BACKUP_IMAGE_BYTES)return new Response('Too large',{status:413});
  if(request.headers.get('content-type')!=='image/jpeg')return new Response('JPEG only',{status:415});
  const reader=request.body?.getReader(),chunks=[];let total=0;if(!reader)return new Response('Empty',{status:400});for(;;){const x=await reader.read();if(x.done)break;total+=x.value.length;if(total>MAX_BACKUP_IMAGE_BYTES){await reader.cancel();return new Response('Too large',{status:413});}chunks.push(x.value);}const file=Buffer.concat(chunks.map(x=>Buffer.from(x)));
  if(file.length>MAX_BACKUP_IMAGE_BYTES||file.length<4||file[0]!==255||file[1]!==216||file.at(-2)!==255||file.at(-1)!==217)return new Response('Invalid image',{status:400});
  await storeBackupImage(e,c,k,file);
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const eventLimit=error?.code==='EVENT_BACKUP_STORAGE_LIMIT';
  const storageFull=eventLimit||['53100','53400'].includes(error?.code);
  return NextResponse.json({ok:false,
   error:storageFull?'This event’s online photo storage is full. Photos remain on this iPad. Ask the owner for help before clearing this event.':'Secure backup storage is unavailable. Photos remain on this iPad and will retry while online.',
   code:eventLimit?'EVENT_BACKUP_STORAGE_LIMIT':storageFull?'BACKUP_STORAGE_FULL':'BACKUP_STORAGE_UNAVAILABLE',retryable:!storageFull
  },{status:storageFull?507:503,headers:{'Cache-Control':'no-store'}});
 }
}
