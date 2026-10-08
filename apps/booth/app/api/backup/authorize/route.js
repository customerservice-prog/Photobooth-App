import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {STAFF_COOKIE,validStaffSession} from '../../../lib/staff-auth.mjs';
import {authorizeBackup} from '../../../lib/backup-auth.mjs';
import {hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from '../../../lib/staff-security.mjs';
export const runtime='nodejs';
export async function POST(request){
 const security=staffSecurityStatus(process.env,request.url);
 if(!security.required||!security.configured)return NextResponse.json({error:staffConfigurationError(security)},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!hasTrustedStaffOrigin(request))return new Response('Invalid origin',{status:403});
 const valid=await validStaffSession(cookies().get(STAFF_COOKIE)?.value,process.env.BOOTH_STAFF_SESSION_SECRET);
 if(!valid)return NextResponse.json({error:'Unlock staff tools first.'},{status:401});
 const payload=await request.json();
 try{return NextResponse.json({token:authorizeBackup(payload.eventId)},{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Backup not configured.'},{status:503});}
}
