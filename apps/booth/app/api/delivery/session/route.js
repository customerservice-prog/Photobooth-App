import {pair,safe} from '../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){return safe(()=>pair(request));}
