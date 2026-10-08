import {NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
import {STAFF_COOKIE,makeStaffSession} from '../../../lib/staff-auth.mjs';
import {isValidStaffPin} from '../../../lib/staff-pin.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const attempts=new Map();
export async function GET(){
 return NextResponse.json({required:process.env.BOOTH_SECURITY_ENFORCED==='true'},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return new Response('Invalid origin',{status:403});
 if(Number(request.headers.get('content-length'))>512)return new Response('Request too large',{status:413});
 const ip=String(request.headers.get('x-forwarded-for')?.split(',')[0]||'local').slice(0,64);
 const now=Date.now(),a=attempts.get(ip)||{count:0,until:now+900000};
 if(now>a.until){a.count=0;a.until=now+900000;}
 if(a.count>=8)return NextResponse.json({error:'Too many attempts. Ask the owner for help.'},{status:429});
 const data=await request.json().catch(()=>({})),pin=String(data.pin||'');
 const hash=process.env.BOOTH_STAFF_PIN_SHA256||'';
 const reference=/^[0-9a-f]{64}$/i.test(hash)?Buffer.from(hash,'hex'):Buffer.alloc(32);
 const correct=isValidStaffPin(pin)&&timingSafeEqual(createHash('sha256').update(pin).digest(),reference);
 const configured=process.env.BOOTH_SECURITY_ENFORCED==='true'&&!!process.env.BOOTH_STAFF_SESSION_SECRET;
 if(!correct||!configured){
  a.count++;attempts.set(ip,a);
  return NextResponse.json({error:'Incorrect staff PIN.'},{status:401,headers:{'Cache-Control':'no-store'}});
 }
 attempts.delete(ip);
 const ticket=await makeStaffSession(process.env.BOOTH_STAFF_SESSION_SECRET);
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(STAFF_COOKIE,ticket,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:900});
 return response;
}