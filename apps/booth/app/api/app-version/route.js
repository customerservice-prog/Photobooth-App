import {BOOTH_RELEASE,BOOTH_RELEASE_LABEL} from '../../lib/booth-launch.mjs';
export const dynamic='force-dynamic';
export const revalidate=0;
// Public release metadata only: no customer, device, database or secret values.
export function GET(){
  return Response.json({app:'friendly-photo-booth',schema:1,version:BOOTH_RELEASE,label:BOOTH_RELEASE_LABEL},{headers:{'Cache-Control':'no-store, max-age=0','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff'}});
}
