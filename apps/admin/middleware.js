import {NextResponse} from 'next/server';
import {ADMIN_COOKIE,validAdminSession} from './lib/admin-auth.mjs';
import {validSyncRequest} from './lib/event-sync-edge.mjs';
import {adminPublicOrigin} from './lib/admin-origin.mjs';
export async function middleware(request){
 if(request.nextUrl.pathname.startsWith('/api/booth/sync/')){
  if(request.method==='OPTIONS')return NextResponse.next();
  const id=request.nextUrl.pathname.split('/').pop();
  const ticket=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(await validSyncRequest(ticket,id,process.env.PHOTOBOOTH_EVENT_SYNC_SECRET))return NextResponse.next();
  return new Response('Unauthorized',{status:401});
 }
 const token=request.cookies.get(ADMIN_COOKIE)?.value;
 if(!await validAdminSession(token,process.env.PHOTOBOOTH_AUTH_SECRET)){
  const origin=adminPublicOrigin(request);
  if(!origin)return new Response('Staff sign-in is not ready yet.',{status:503,headers:{'Cache-Control':'no-store'}});
  const url=new URL('/login',origin);
  const path=request.nextUrl.pathname;
  if(path!=='/')url.searchParams.set('next',path);
  const response=NextResponse.redirect(url);
  response.headers.set('Cache-Control','no-store');
  return response;
 }
 const response=NextResponse.next();
 response.headers.set('Cache-Control','private, no-store');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','same-origin');
 return response;
}
export const config={matcher:['/((?!_next/|favicon.ico|icon.svg|login$|api/auth/login$|api/auth/logout$).*)']};
