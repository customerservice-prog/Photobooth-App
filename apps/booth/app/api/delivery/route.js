import {send,safe,json} from '../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){return safe(async()=>json(await send(request)));}
