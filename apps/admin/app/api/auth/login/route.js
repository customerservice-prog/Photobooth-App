import {NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
import {ADMIN_COOKIE,createAdminSession} from '../../../../lib/admin-auth.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const attempts=new Map();
export async function POST(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return new Response('Invalid origin.',{status:403});
 if(Number(request.headers.get('content-length'))>4096)return new Response('Request too large.',{status:413});
 const ip=(request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,64);
 const now=Date.now(),state=attempts.get(ip)||{count:0,end:now+900000};
 if(now>state.end){state.count=0;state.end=now+900000;}
 if(state.count>=10)return new Response('Too many attempts. Try again later.',{status:429});
 const input=await request.formData(),password=String(input.get('password')||'');
 const expected=process.env.PHOTOBOOTH_ADMIN_PASSWORD_SHA256||'';
 const real=/^[0-9a-f]{64}$/i.test(expected)?Buffer.from(expected,'hex'):Buffer.alloc(32);
 const valid=password.length>=12&&password.length<=180&&timingSafeEqual(createHash('sha256').update(password).digest(),real)&&!!process.env.PHOTOBOOTH_AUTH_SECRET;
 if(!valid){state.count++;attempts.set(ip,state);return NextResponse.redirect(new URL('/login?error=1',request.url),{status:303});}
 attempts.delete(ip);
 const session=await createAdminSession(process.env.PHOTOBOOTH_AUTH_SECRET);
 const response=NextResponse.redirect(new URL('/dashboard',request.url),{status:303});
 response.cookies.set(ADMIN_COOKIE,session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*3600});
 response.headers.set('Cache-Control','no-store');
 return response;
}
