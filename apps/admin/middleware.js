import {NextResponse} from 'next/server';
import {ADMIN_COOKIE,validAdminSession} from './lib/admin-auth.mjs';
export async function middleware(request){
 const token=request.cookies.get(ADMIN_COOKIE)?.value;
 if(!await validAdminSession(token,process.env.PHOTOBOOTH_AUTH_SECRET)){
  const url=new URL('/login',request.url);
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
