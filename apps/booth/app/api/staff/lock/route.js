import {NextResponse} from 'next/server';
import {STAFF_COOKIE} from '../../../lib/staff-auth.mjs';
export async function POST(request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Invalid origin',{status:403});
 const response=NextResponse.json({ok:true});
 response.cookies.set(STAFF_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 return response;
}