import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {STAFF_COOKIE,validStaffSession} from '../../../lib/staff-auth.mjs';
import {authorizeBackup} from '../../../lib/backup-auth.mjs';
import {database} from '../../../lib/backup-store.mjs';
import {hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from '../../../lib/staff-security.mjs';
export const runtime='nodejs';
export async function POST(request){
 const security=staffSecurityStatus(process.env,request.url);
 if(!security.required||!security.configured)return NextResponse.json({error:staffConfigurationError(security)},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!hasTrustedStaffOrigin(request))return new Response('Invalid origin',{status:403});
 const valid=await validStaffSession(cookies().get(STAFF_COOKIE)?.value,process.env.BOOTH_STAFF_SESSION_SECRET);
 if(!valid)return NextResponse.json({error:'Unlock staff tools first.'},{status:401});
 let payload;
 try{payload=await request.json();}
 catch{return NextResponse.json({error:'Choose a valid customer event.'},{status:400,headers:{'Cache-Control':'no-store'}});}
 if(typeof payload?.eventId!=='string'||!/^[A-Za-z0-9_-]{3,90}$/.test(payload.eventId))
  return NextResponse.json({error:'Choose a valid customer event.'},{status:400,headers:{'Cache-Control':'no-store'}});
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
