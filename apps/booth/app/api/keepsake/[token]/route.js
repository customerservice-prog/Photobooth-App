import {download,safe} from '../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){return safe(()=>download(params.token));}
