import {check,safe,json} from '../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return safe(async()=>json(await check(request)));}
