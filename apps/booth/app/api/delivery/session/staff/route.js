import {cookies} from 'next/headers';
import {STAFF_COOKIE} from '../../../../lib/staff-auth.mjs';
import {authorizeStaffDiagnosticDelivery,safe} from '../../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){
  return safe(()=>authorizeStaffDiagnosticDelivery(request,{staffCookie:cookies().get(STAFF_COOKIE)?.value}));
}
