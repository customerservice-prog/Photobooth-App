import {cookies} from 'next/headers';
import {STAFF_COOKIE} from '../../../lib/staff-auth.mjs';
import {staffEventsResponse} from '../../../lib/staff-events-server.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
export async function GET(request){return staffEventsResponse(request,{staffCookie:cookies().get(STAFF_COOKIE)?.value});}
