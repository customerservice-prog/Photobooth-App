import {cookies} from 'next/headers';
import {STAFF_COOKIE} from '../../../../lib/staff-auth.mjs';
import {staffEventsResponse} from '../../../../lib/staff-events-server.mjs';
import {authorizeStaffEventDelivery} from '../../../../lib/delivery.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const options=params=>({eventId:params.id,staffCookie:cookies().get(STAFF_COOKIE)?.value});
export async function GET(request,{params}){return staffEventsResponse(request,options(params));}
export async function POST(request,{params}){
 const context=options(params),response=await staffEventsResponse(request,context);
 return authorizeStaffEventDelivery(request,response,context);
}
