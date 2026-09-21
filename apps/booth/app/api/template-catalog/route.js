import {catalog,TEMPLATE_VERSION} from '../../lib/templates/registry.mjs';
export const dynamic='force-static';
// Public design metadata only. No event records, guest photographs, credentials or contacts.
export async function GET(){return Response.json({version:TEMPLATE_VERSION,count:18,events:catalog()},{headers:{'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}
