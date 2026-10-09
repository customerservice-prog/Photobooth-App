import {NextResponse} from 'next/server';
import {STAFF_COOKIE} from '../../../lib/staff-auth.mjs';
import {hasTrustedStaffOrigin} from '../../../lib/staff-security.mjs';
export async function POST(request){
 if(!hasTrustedStaffOrigin(request))return new Response('Invalid origin',{status:403});
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(STAFF_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 return response;
}
