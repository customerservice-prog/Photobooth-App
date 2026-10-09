import {NextResponse} from 'next/server';
import {matchesConfiguredStaffPin} from '../../../lib/staff-pin-server.mjs';
import {STAFF_COOKIE,makeStaffSession} from '../../../lib/staff-auth.mjs';
import {hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from '../../../lib/staff-security.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const attempts=new Map();
export async function GET(request){
 const security=staffSecurityStatus(process.env,request?.url);
 return NextResponse.json({...security,...(!security.configured?{error:staffConfigurationError(security)}:{})},{status:security.configured?200:503,headers:{'Cache-Control':'no-store'}});
}
export async function POST(request){
 const security=staffSecurityStatus(process.env,request.url);
 if(!security.required||!security.configured)return NextResponse.json({error:staffConfigurationError(security),required:true,configured:false,missing:security.missing},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!hasTrustedStaffOrigin(request))return NextResponse.json({error:'Invalid origin. Open staff tools from the configured booth address.'},{status:403,headers:{'Cache-Control':'no-store'}});
 if(Number(request.headers.get('content-length'))>512)return new Response('Request too large',{status:413});
 const ip=String(request.headers.get('x-forwarded-for')?.split(',')[0]||'local').slice(0,64);
 const now=Date.now(),a=attempts.get(ip)||{count:0,until:now+900000};
 if(now>a.until){a.count=0;a.until=now+900000;}
 if(a.count>=8)return NextResponse.json({error:'Too many attempts. Ask the owner for help.'},{status:429});
 const data=await request.json().catch(()=>({})),pin=String(data.pin||'');
 const hash=process.env.BOOTH_STAFF_PIN_SHA256||'';
 const correct=matchesConfiguredStaffPin(pin,hash);
 if(!correct){
  a.count++;attempts.set(ip,a);
  return NextResponse.json({error:'Incorrect staff PIN.'},{status:401,headers:{'Cache-Control':'no-store'}});
 }
 attempts.delete(ip);
 const ticket=await makeStaffSession(process.env.BOOTH_STAFF_SESSION_SECRET);
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(STAFF_COOKIE,ticket,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:900});
 return response;
}
