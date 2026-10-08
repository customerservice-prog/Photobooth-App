import {NextResponse} from 'next/server';
import {ADMIN_COOKIE} from '../../../../lib/admin-auth.mjs';
export async function POST(request){
 const response=NextResponse.redirect(new URL('/login',request.url),{status:303});
 response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 response.headers.set('Cache-Control','no-store');return response;
}