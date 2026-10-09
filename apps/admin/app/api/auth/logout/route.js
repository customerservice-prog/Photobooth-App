import {NextResponse} from 'next/server';
import {ADMIN_COOKIE} from '../../../../lib/admin-auth.mjs';
import {adminPublicOrigin,isSameAdminOrigin} from '../../../../lib/admin-origin.mjs';
export async function POST(request){
 const origin=adminPublicOrigin(request);
 if(!origin)return new Response('Staff sign-in is not ready yet.',{status:503});
 if(!isSameAdminOrigin(request))return new Response('This request could not be verified.',{status:403});
 const response=NextResponse.redirect(new URL('/login',origin),{status:303});
 response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 response.headers.set('Cache-Control','no-store');return response;
}
