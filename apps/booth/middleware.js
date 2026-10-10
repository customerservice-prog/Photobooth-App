import {NextResponse} from 'next/server';
import {STAFF_COOKIE,validStaffSession} from './app/lib/staff-auth.mjs';
import {publicBoothOrigin} from './app/lib/staff-security.mjs';
export async function middleware(request){
 if(process.env.BOOTH_SECURITY_ENFORCED!=='true')return NextResponse.next();
 const session=request.cookies.get(STAFF_COOKIE)?.value;
 if(await validStaffSession(session,process.env.BOOTH_STAFF_SESSION_SECRET))return NextResponse.next();
 const origin=publicBoothOrigin(process.env,request.url);
 if(!origin)return NextResponse.json({error:'Staff sign-in requires a configured public booth address.'},{status:503,headers:{'Cache-Control':'no-store'}});
 const destination=new URL(request.url);
 const url=new URL('/staff/sign-in',origin);
 url.searchParams.set('next',destination.pathname+destination.search);
 return NextResponse.redirect(url);
}
export const config={matcher:['/setup/:path*','/event-prep/:path*','/print-test/:path*','/delivery-check/:path*','/test/:path*','/designs/:path*','/oct10-demo/:path*']};
