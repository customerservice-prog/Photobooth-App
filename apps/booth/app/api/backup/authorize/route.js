import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {STAFF_COOKIE,validStaffSession} from '../../../lib/staff-auth.mjs';
import {authorizeBackup} from '../../../lib/backup-auth.mjs';
import {database} from '../../../lib/backup-store.mjs';
import {hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from '../../../lib/staff-security.mjs';
import {validEventBackupProof,verifyEventBackupProof} from '../../../lib/backup-event-proof.mjs';
export const runtime='nodejs';
export async function POST(request){
 const security=staffSecurityStatus(process.env,request.url);
 if(!security.required||!security.configured)return NextResponse.json({error:staffConfigurationError(security)},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!hasTrustedStaffOrigin(request))return new Response('Invalid origin',{status:403});
 let payload;
 try{payload=await request.json();}
 catch{return NextResponse.json({error:'Choose a valid customer event.'},{status:400,headers:{'Cache-Control':'no-store'}});}
 if(!payload||Array.isArray(payload)||typeof payload!=='object'||typeof payload.eventId!=='string'||!/^[A-Za-z0-9_-]{3,90}$/.test(payload.eventId)||
  (payload.syncTicket!==undefined&&!validEventBackupProof(payload.eventId,payload.syncTicket)))
  return NextResponse.json({error:'Choose a valid customer event.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const valid=await validStaffSession(cookies().get(STAFF_COOKIE)?.value,process.env.BOOTH_STAFF_SESSION_SECRET);
 if(!valid){
  if(!payload.syncTicket)return NextResponse.json({error:'Load this event from the owner dashboard or unlock staff tools first.'},{status:401,headers:{'Cache-Control':'no-store'}});
  const proof=await verifyEventBackupProof(payload.eventId,payload.syncTicket);
  if(proof==='invalid')return NextResponse.json({error:'This event setup link is invalid or expired. Open a fresh link from the owner dashboard. Photos remain on this iPad.'},{status:401,headers:{'Cache-Control':'no-store'}});
  if(proof!=='authorized')return NextResponse.json({error:'This event could not be verified online. Photos remain on this iPad and will retry while connected.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
 let token;
 try{token=authorizeBackup(payload.eventId);}
 catch{return NextResponse.json({error:'Secure backup setup is incomplete. Ask the owner to configure this booth. Photos remain on this iPad.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 try{
  // Confirm the database and create only the private backup schema before
  // telling staff that backups are ready, including an event with no photos.
  await database();
  return NextResponse.json({token},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Secure backup storage is unavailable. Photos remain on this iPad. Try again while online.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
