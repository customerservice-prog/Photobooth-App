import {configuration,session,json} from '../../../lib/delivery.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return json({...configuration(),paired:!!session(request)});}
