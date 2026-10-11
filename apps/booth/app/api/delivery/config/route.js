import {cookies} from 'next/headers';
import {STAFF_COOKIE} from '../../../lib/staff-auth.mjs';
import {configurationResponse} from '../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return configurationResponse(request,{staffCookie:cookies().get(STAFF_COOKIE)?.value});}
